from setuptools import Extension, find_packages, setup

# This is a minimal setup file that relies on modern standards.
# It uses MANIFEST.in to find non-Python files.

setup(
    packages=find_packages("bindings/python"),
    package_dir={"": "bindings/python"},
    # This tells the build system to use MANIFEST.in
    include_package_data=True,
    ext_modules=[
        Extension(
            name="tree_sitter_scl._binding",
            sources=[
                "bindings/python/tree_sitter_scl/binding.c",
                "src/parser.c",
            ],
            include_dirs=["src"],
        )
    ],
    zip_safe=False
)