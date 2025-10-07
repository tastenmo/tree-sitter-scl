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
    """An advanced GUI to analyze SCL files with a linked, interactive tree view."""

    def __init__(self, root):
        self.root = root
        self.root.title("Tree-sitter SCL Analyzer")
        self.root.geometry("1200x800")

        self.parser = self._setup_parser()
        self.highlight_query = self._load_highlights_query()
        self.tree_node_map = {} # Maps treeview item IDs to tree-sitter nodes

        # State for tracking errors
        self.error_node_ids = []
        self.current_error_index = -1

        # --- Top controls ---
        self._create_top_bar()

        # --- Main Layout ---
        self.main_paned_window = tk.PanedWindow(root, orient=tk.HORIZONTAL)
        self.main_paned_window.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        # --- Left Pane: Source Code ---
        left_frame = ttk.Frame(self.main_paned_window, padding=5)
        ttk.Label(left_frame, text="Source Code", font=("Segoe UI", 10, "bold")).pack(anchor=tk.W)
        self.source_text = scrolledtext.ScrolledText(left_frame, wrap=tk.WORD, font=("Consolas", 11))
        self.source_text.pack(fill=tk.BOTH, expand=True)
        self.main_paned_window.add(left_frame, width=600)

        # --- Right Pane: Syntax Tree ---
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

        # --- Bottom Status Bar ---
        self._create_status_bar()
        self._configure_styles()

        # --- Event Bindings ---
        self.tree_view.bind('<<TreeviewSelect>>', self.on_tree_select)

    def _setup_parser(self):
        parser = Parser()
        parser.language = scl_language
        return parser

    def _load_highlights_query(self):
        """Loads the highlighting query file if it exists."""
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

    def _create_top_bar(self):
        top_frame = ttk.Frame(self.root, padding=(10, 10, 10, 0))
        top_frame.pack(fill=tk.X, side=tk.TOP)
        ttk.Button(top_frame, text="Open SCL File...", command=self.open_file).pack(side=tk.LEFT)
        
        self.next_error_button = ttk.Button(top_frame, text="Find Next Error", command=self.find_next_error, state=tk.DISABLED)
        self.next_error_button.pack(side=tk.LEFT, padx=5)

        self.filepath_label = ttk.Label(top_frame, text="No file selected.", style="Muted.TLabel")
        self.filepath_label.pack(side=tk.LEFT, padx=10)

    def _create_status_bar(self):
        self.status_var = tk.StringVar(value="Ready. Please open a file.")
        ttk.Label(self.root, textvariable=self.status_var, relief=tk.SUNKEN, anchor=tk.W, padding=5).pack(fill=tk.X, side=tk.BOTTOM)

    def _configure_styles(self):
        """Define colors for syntax highlighting and tree selection."""
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

    def open_file(self):
        filepath = filedialog.askopenfilename(title="Select an SCL source file", filetypes=[("SCL Files", "*.scl *.udt *.db"), ("All files", "*.*")])
        if not filepath: return

        self.filepath_label.config(text=filepath)
        self.status_var.set(f"Parsing {filepath}...")
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
            if tree.root_node.has_error:
                status = "Parsing complete. Errors were found in the syntax tree."
            self.status_var.set(status)

            if self.error_node_ids:
                self.next_error_button.config(state=tk.NORMAL)
            else:
                self.next_error_button.config(state=tk.DISABLED)

        except Exception as e:
            self.status_var.set(f"Error: {e}")
            messagebox.showerror("File Error", f"Could not read or parse file:\n{e}")

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
        """Selects the next error node in the tree view, wrapping around if necessary."""
        if not self.error_node_ids:
            messagebox.showinfo("No Errors", "No errors were found in the syntax tree.")
            return

        self.current_error_index = (self.current_error_index + 1) % len(self.error_node_ids)
        next_error_id = self.error_node_ids[self.current_error_index]

        self.tree_view.selection_set(next_error_id)
        self.tree_view.focus(next_error_id)
        self.tree_view.see(next_error_id)

    def _apply_tag_to_node(self, node, capture_name):
        """Helper function to apply a tag to a specific node in the text widget."""
        start_row, start_col = node.start_point
        end_row, end_col = node.end_point
        start_index = f"{start_row + 1}.{start_col}"
        end_index = f"{end_row + 1}.{end_col}"
        self.source_text.tag_add(capture_name, start_index, end_index)

    def apply_syntax_highlighting(self, tree):
        """
        Applies syntax highlighting to the source code.
        This version is robust and works with both old and new versions of the
        py-tree-sitter library to prevent crashes.
        """
        if not self.highlight_query: return

        self.source_text.config(state=tk.NORMAL)
        
        # Defensively clear old tags. This only works on newer library versions.
        if hasattr(self.highlight_query, 'capture_names'):
            for tag in self.highlight_query.capture_names:
                self.source_text.tag_remove(tag, '1.0', tk.END)
            
        try:
            # Check for the modern, preferred API
            if hasattr(self.highlight_query, 'captures'):
                captures = self.highlight_query.captures(tree.root_node)
                for node, capture_name in captures:
                    self._apply_tag_to_node(node, capture_name)
            # Fallback for the older API
            elif hasattr(self.highlight_query, 'matches'):
                print("Note: Using a legacy version of the tree-sitter library. Highlighting may be incomplete.")
                matches = self.highlight_query.matches(tree.root_node)
                for match in matches:
                    pattern_index, nodes = match
                    # The old API makes getting the name difficult, so we check again.
                    if hasattr(self.highlight_query, 'capture_names'):
                         capture_name = self.highlight_query.capture_names[pattern_index]
                         for node in nodes:
                             self._apply_tag_to_node(node, capture_name)

        except Exception as e:
            print(f"Error applying highlights: {e}")
                
        self.source_text.config(state=tk.DISABLED)

    def on_tree_select(self, event):
        """Highlights source code corresponding to the selected item in the tree view."""
        selection = self.tree_view.selection()
        if not selection: return
        
        selected_iid_str = selection[0]
        
        try:
            selected_iid_int = int(selected_iid_str)
        except ValueError:
            return 
            
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