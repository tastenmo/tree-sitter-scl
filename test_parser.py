# test_parser.py
from tree_sitter import Language, Parser
from tree_sitter_scl import language as scl_language

# Print the location of the library being used to be 100% sure
import tree_sitter_scl
print(f"Using tree_sitter_scl from: {tree_sitter_scl.__file__}")

scl_code = b"""
DATA_BLOCK "AHU1_AE1_Data"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1
 "UDT_AHU_AE1_Data"

BEGIN
   UDT_BYP_Act1.BOOL_EnableFaceplate := FALSE;
END_DATA_BLOCK
"""

parser = Parser()
parser.language = scl_language
tree = parser.parse(scl_code)

print("\nParse Tree:")
print(tree.root_node.sexp()) # .sexp() gives the same format as the CLI

if tree.root_node.has_error:
    print("\n*** PARSING FAILED! An error was found. ***")
else:
    print("\n--- PARSING SUCCEEDED! No errors found. ---")