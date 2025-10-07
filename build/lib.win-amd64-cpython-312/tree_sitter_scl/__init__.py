"""SCL grammar for tree-sitter"""

from pathlib import Path
from tree_sitter import Language
import ctypes
import sysconfig

LANGUAGE_NAME = "scl"
LANGUAGE_FUNCTION = f"tree_sitter_{LANGUAGE_NAME}"

suffix = sysconfig.get_config_var("EXT_SUFFIX")
library_path = Path(__file__).parent / f"_binding{suffix}"

lib = ctypes.PyDLL(str(library_path))
language_func = getattr(lib, LANGUAGE_FUNCTION)
language_func.restype = ctypes.c_void_p
language_ptr = language_func()
language = Language(language_ptr)

def _get_query(name, file):
    from importlib.resources import files as _files
    query = _files(f"{__package__}.queries") / file
    globals()[name] = query.read_text()
    return globals()[name]

def __getattr__(name):
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

__all__ = ["language"]

def __dir__():
    return sorted(__all__ + [
        "__all__", "__builtins__", "__cached__", "__doc__", "__file__",
        "__loader__", "__name__", "__package__", "__path__", "__spec__",
    ])