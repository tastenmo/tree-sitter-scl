package tree_sitter_scl_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_scl "github.com/tastenmo/tree-sitter-scl.git/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_scl.Language())
	if language == nil {
		t.Errorf("Error loading Scl grammar")
	}
}
