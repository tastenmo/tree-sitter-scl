import tkinter as tk
from tkinter import ttk, filedialog, scrolledtext, messagebox
from pathlib import Path

# --- Tree-sitter imports ---
from tree_sitter import Language, Parser, Query

# --- Language and Query Setup ---
try:
    from tree_sitter_scl import language as scl_language
except ImportError:
    messagebox.showerror(
        "Dependency Error",
        "The 'tree-sitter-scl' package is not installed.\n\n"
        "Please install it from your grammar project directory:\n"
        "pip install ."
    )
    exit()

class SCLAnalyzerApp:
    """An advanced GUI to analyze SCL files with batch folder processing."""

    TARGET_SUFFIXES = {".scl", ".udt", ".db"}

    def __init__(self, root):
        self.root = root
        self.root.title("Tree-sitter SCL Analyzer")
        self.root.geometry("1600x900")

        self.parser = self._setup_parser()
        self.highlight_query = self._load_highlights_query()
        self.tree_node_map = {}
        self.file_path_map = {}

        self.error_node_ids = []
        self.current_error_index = -1

        self._create_top_bar()

        self.root_paned_window = tk.PanedWindow(root, orient=tk.HORIZONTAL)
        self.root_paned_window.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self._create_file_browser_pane()

        self.main_paned_window = tk.PanedWindow(self.root_paned_window, orient=tk.HORIZONTAL)
        self.root_paned_window.add(self.main_paned_window)

        left_frame = ttk.Frame(self.main_paned_window, padding=5)
        ttk.Label(left_frame, text="Source Code", font=("Segoe UI", 10, "bold")).pack(anchor=tk.W)
        self.source_text = scrolledtext.ScrolledText(left_frame, wrap=tk.WORD, font=("Consolas", 11))
        self.source_text.pack(fill=tk.BOTH, expand=True)
        self.main_paned_window.add(left_frame, width=600)

        right_frame = ttk.Frame(self.main_paned_window, padding=5)
        ttk.Label(right_frame, text="Syntax Tree", font=("Segoe UI", 10, "bold")).pack(anchor=tk.W, pady=(0, 5))
        tree_container = ttk.Frame(right_frame)
        tree_container.pack(fill=tk.BOTH, expand=True)
        tree_scrollbar = ttk.Scrollbar(tree_container, orient=tk.VERTICAL)
        self.tree_view = ttk.Treeview(tree_container, yscrollcommand=tree_scrollbar.set)
        tree_scrollbar.config(command=self.tree_view.yview)
        tree_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree_view.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.main_paned_window.add(right_frame, width=600)

        self._create_status_bar()
        self._configure_styles()
        
        self.tree_view.bind('<<TreeviewSelect>>', self.on_tree_select)
        self.file_list_view.bind('<<TreeviewSelect>>', self.on_file_select)

    def _create_file_browser_pane(self):
        """Creates the new pane on the far left for folder scanning results."""
        file_browser_frame = ttk.Frame(self.root_paned_window, padding=5)
        
        ttk.Label(file_browser_frame, text="File Browser", font=("Segoe UI", 10, "bold")).pack(anchor=tk.W, pady=(0, 5))
        
        # --- THIS IS THE MODIFIED SECTION ---
        # Create a container frame for the Treeview and its scrollbars
        tree_container = ttk.Frame(file_browser_frame)
        tree_container.pack(fill=tk.BOTH, expand=True)

        # Create Scrollbars
        tree_scrollbar_y = ttk.Scrollbar(tree_container, orient=tk.VERTICAL)
        tree_scrollbar_x = ttk.Scrollbar(tree_container, orient=tk.HORIZONTAL)
        
        # Create the Treeview and link it to the scrollbars
        self.file_list_view = ttk.Treeview(tree_container, show="tree", 
                                           yscrollcommand=tree_scrollbar_y.set,
                                           xscrollcommand=tree_scrollbar_x.set)

        # Link the scrollbars back to the Treeview
        tree_scrollbar_y.config(command=self.file_list_view.yview)
        tree_scrollbar_x.config(command=self.file_list_view.xview)

        # Use the pack geometry manager for layout
        # The order of packing matters here
        tree_scrollbar_y.pack(side=tk.RIGHT, fill=tk.Y)
        tree_scrollbar_x.pack(side=tk.BOTTOM, fill=tk.X)
        self.file_list_view.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        # --- END OF MODIFIED SECTION ---

        # Add parent nodes for the two lists
        self.files_with_errors_node = self.file_list_view.insert("", "end", text="Files with Errors", open=True)
        self.all_files_node = self.file_list_view.insert("", "end", text="All Parsed Files", open=True)

        self.root_paned_window.add(file_browser_frame, width=400) # Increased default width slightly

    def _create_top_bar(self):
        top_frame = ttk.Frame(self.root, padding=(10, 10, 10, 0))
        top_frame.pack(fill=tk.X, side=tk.TOP)
        ttk.Button(top_frame, text="Open File...", command=self.open_file).pack(side=tk.LEFT)
        ttk.Button(top_frame, text="Open Folder...", command=self.open_folder).pack(side=tk.LEFT, padx=5)
        self.next_error_button = ttk.Button(top_frame, text="Find Next Error", command=self.find_next_error, state=tk.DISABLED)
        self.next_error_button.pack(side=tk.LEFT)
        self.filepath_label = ttk.Label(top_frame, text="No file or folder selected.", style="Muted.TLabel")
        self.filepath_label.pack(side=tk.LEFT, padx=10)

    def open_folder(self):
        folder_path = filedialog.askdirectory(title="Select a folder to scan")
        if not folder_path: return

        self.filepath_label.config(text=folder_path)
        self.status_var.set(f"Scanning {folder_path}...")
        self.root.update_idletasks()

        self._clear_all_views()

        folder = Path(folder_path)
        files_to_scan = [f for f in folder.rglob("*") if f.suffix.lower() in self.TARGET_SUFFIXES]
        
        error_count = 0
        total_count = 0

        for filepath in files_to_scan:
            try:
                has_error = self._process_file_for_list(filepath, folder)
                if has_error:
                    error_count += 1
                total_count += 1
                self.status_var.set(f"Scanning... ({total_count}/{len(files_to_scan)})")
                self.root.update_idletasks()
            except Exception as e:
                print(f"Failed to process {filepath}: {e}")
        
        status = f"Scan complete. Parsed {total_count} files, found {error_count} with errors."
        self.status_var.set(status)

    def _process_file_for_list(self, filepath, base_folder):
        with open(filepath, 'rb') as f:
            source_bytes = f.read()
        
        tree = self.parser.parse(source_bytes)
        relative_path = filepath.relative_to(base_folder)
        has_error = tree.root_node.has_error

        all_files_id = self.file_list_view.insert(self.all_files_node, "end", text=str(relative_path))
        self.file_path_map[all_files_id] = filepath

        if has_error:
            error_id = self.file_list_view.insert(self.files_with_errors_node, "end", text=str(relative_path), tags=("error_file",))
            self.file_path_map[error_id] = filepath
            return True
        return False

    def on_file_select(self, event):
        selection = self.file_list_view.selection()
        if not selection: return
        selected_id = selection[0]
        filepath = self.file_path_map.get(selected_id)
        if not filepath: return
        self.load_file_into_view(filepath)

    def open_file(self):
        filepath = filedialog.askopenfilename(title="Select an SCL source file", filetypes=[("SCL Files", "*.scl *.udt *.db"), ("All files", "*.*")])
        if not filepath: return
        self._clear_all_views()
        self.load_file_into_view(Path(filepath))

    def load_file_into_view(self, filepath):
        self.filepath_label.config(text=str(filepath))
        self.status_var.set(f"Parsing {filepath.name}...")
        self.root.update_idletasks()

        try:
            with open(filepath, 'rb') as f:
                source_bytes = f.read()
            tree = self.parser.parse(source_bytes)
            source_string = source_bytes.decode('utf-8', errors='replace')
            self.populate_source_view(source_string)
            self.populate_tree_view(tree.root_node)
            self.apply_syntax_highlighting(tree)
            status = "Parsing completed successfully."
            if self.error_node_ids:
                status = f"Parsing complete. Found {len(self.error_node_ids)} error(s) in this file."
                self.next_error_button.config(state=tk.NORMAL)
            else:
                self.next_error_button.config(state=tk.DISABLED)
            self.status_var.set(status)
        except Exception as e:
            self.status_var.set(f"Error: {e}")
            messagebox.showerror("File Error", f"Could not read or parse file:\n{e}")

    def _clear_all_views(self):
        self.file_list_view.delete(*self.file_list_view.get_children())
        self.files_with_errors_node = self.file_list_view.insert("", "end", text="Files with Errors", open=True)
        self.all_files_node = self.file_list_view.insert("", "end", text="All Parsed Files", open=True)
        self.file_path_map.clear()
        self.source_text.config(state=tk.NORMAL)
        self.source_text.delete('1.0', tk.END)
        self.source_text.config(state=tk.DISABLED)
        self.tree_view.delete(*self.tree_view.get_children())
        self.tree_node_map.clear()
        self.filepath_label.config(text="No file or folder selected.")
        self.status_var.set("Ready.")

    def _configure_styles(self):
        self.source_text.tag_config("keyword", foreground="#C586C0")
        self.source_text.tag_config("keyword.type", foreground="#569CD6")
        self.source_text.tag_config("type", foreground="#4EC9B0")
        self.source_text.tag_config("operator", foreground="#D4D4D4")
        self.source_text.tag_config("boolean", foreground="#569CD6")
        self.source_text.tag_config("string", foreground="#CE9178")
        self.source_text.tag_config("string.special", foreground="#D7BA7D")
        self.source_text.tag_config("number", foreground="#B5CEA8")
        self.source_text.tag_config("comment", foreground="#6A9955")
        self.source_text.tag_config("variable", foreground="#9CDCFE")
        self.source_text.tag_config("function", foreground="#DCDCAA")
        self.source_text.tag_config("property", foreground="#9CDCFE")
        self.source_text.tag_config("punctuation", foreground="#808080")
        self.source_text.tag_config("highlight", background="khaki", foreground="black")
        
        style = ttk.Style()
        style.configure("Muted.TLabel", foreground="gray")
        self.tree_view.tag_configure("error_node", background="#E57373", foreground="white")
        self.file_list_view.tag_configure("error_file", foreground="red")
    
    def _setup_parser(self):
        parser = Parser()
        parser.language = scl_language
        return parser

    def _load_highlights_query(self):
        query_path = Path(__file__).parent / "queries" / "highlights.scm"
        if query_path.exists():
            try:
                query_source = query_path.read_text()
                return Query(scl_language, query_source)
            except Exception as e:
                print(f"Warning: Could not load or parse highlights.scm: {e}")
        else:
            print("Warning: queries/highlights.scm not found. Syntax highlighting will be disabled.")
        return None

    def _create_status_bar(self):
        self.status_var = tk.StringVar(value="Ready. Please open a file or folder.")
        ttk.Label(self.root, textvariable=self.status_var, relief=tk.SUNKEN, anchor=tk.W, padding=5).pack(fill=tk.X, side=tk.BOTTOM)

    def populate_source_view(self, source_string):
        self.source_text.config(state=tk.NORMAL)
        self.source_text.delete('1.0', tk.END)
        self.source_text.insert('1.0', source_string)
        self.source_text.config(state=tk.DISABLED)

    def populate_tree_view(self, root_node):
        self.tree_view.delete(*self.tree_view.get_children())
        self.tree_node_map.clear()
        self.error_node_ids.clear()
        self.current_error_index = -1
        self._populate_tree_recursive(root_node, "")

    def _populate_tree_recursive(self, node, parent_iid):
        node_text = f"{node.type} [{node.start_point} - {node.end_point}]"
        item_id = node.id
        item_tags = ()
        if "ERROR" in node.type or node.is_missing:
            item_tags = ("error_node",)
            self.error_node_ids.append(item_id)
        self.tree_view.insert(parent_iid, 'end', iid=item_id, text=node_text, open=True, tags=item_tags)
        self.tree_node_map[item_id] = node
        for child in node.children:
            self._populate_tree_recursive(child, item_id)

    def find_next_error(self):
        if not self.error_node_ids:
            messagebox.showinfo("No Errors", "No errors were found in the syntax tree for the current file.")
            return
        self.current_error_index = (self.current_error_index + 1) % len(self.error_node_ids)
        next_error_id = self.error_node_ids[self.current_error_index]
        self.tree_view.selection_set(next_error_id)
        self.tree_view.focus(next_error_id)
        self.tree_view.see(next_error_id)

    def apply_syntax_highlighting(self, tree):
        if not self.highlight_query: return
        self.source_text.config(state=tk.NORMAL)
        if hasattr(self.highlight_query, 'capture_names'):
            for tag in self.highlight_query.capture_names:
                self.source_text.tag_remove(tag, '1.0', tk.END)
            captures = self.highlight_query.captures(tree.root_node)
            for node, capture_name in captures:
                start_row, start_col = node.start_point
                end_row, end_col = node.end_point
                start_index = f"{start_row + 1}.{start_col}"
                end_index = f"{end_row + 1}.{end_col}"
                self.source_text.tag_add(capture_name, start_index, end_index)
        self.source_text.config(state=tk.DISABLED)

    def on_tree_select(self, event):
        selection = self.tree_view.selection()
        if not selection: return
        selected_iid_int = int(selection[0])
        node = self.tree_node_map.get(selected_iid_int)
        if not node: return
        start_row, start_col = node.start_point
        end_row, end_col = node.end_point
        start_index = f"{start_row + 1}.{start_col}"
        end_index = f"{end_row + 1}.{end_col}"
        self.source_text.config(state=tk.NORMAL)
        self.source_text.tag_remove('highlight', '1.0', tk.END)
        self.source_text.tag_add('highlight', start_index, end_index)
        self.source_text.tag_raise('highlight')
        self.source_text.config(state=tk.DISABLED)
        self.source_text.see(start_index)

if __name__ == "__main__":
    app_root = tk.Tk()
    SCLAnalyzerApp(app_root)
    app_root.mainloop()