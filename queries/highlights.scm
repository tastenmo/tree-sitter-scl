; queries/highlights.scm

[
  "NAMESPACE"
  "TYPE"
  "STRUCT"
  "FUNCTION_BLOCK"
  "FUNCTION"
  "ORGANIZATION_BLOCK"
  "BEGIN"
  "END_NAMESPACE"
  "END_TYPE"
  "END_STRUCT"
  "END_FUNCTION_BLOCK"
  "END_FUNCTION"
  "END_ORGANIZATION_BLOCK"
  "VERSION"
  "VAR_INPUT"
  "VAR_OUTPUT"
  "VAR_IN_OUT"
  "VAR"
  "VAR_TEMP"
  "VAR_STATIC"
  "CONSTANT"
  "END_VAR"
  "IF"
  "THEN"
  "ELSIF"
  "ELSE"
  "END_IF"
  "CASE"
  "OF"
  "END_CASE"
  "FOR"
  "TO"
  "BY"
  "DO"
  "END_FOR"
  "WHILE"
  "END_WHILE"
  "REPEAT"
  "UNTIL"
  "END_REPEAT"
  "RETURN"
  "EXIT"
] @keyword

[
  "ARRAY"
] @keyword.type

(elementary_type_names) @type

[
  "="
  "<>"
  "<"
  ">"
  "<="
  ">="
  "+"
  "-"
  "*"
  "/"
  ":="
  "=>"
  "AND"
  "OR"
  "XOR"
  "NOT"
  "MOD"
] @operator

(data_block) @keyword
(member_expression) @variable
(bool_literal) @boolean
(string_literal) @string
(real_literal) @number
(integer_literal) @number

(line_comment) @comment
(block_comment) @comment

(identifier) @variable
(function_call (identifier) @function)
(fields (identifier) @property)
(type_definition (identifier) @type)
(function_block (identifier) @type)

(quoted_identifier) @string.special

[
  "{"
  "}"
  "["
  "]"
  "("
  ")"
  ";"
  ":"
  ","
  "."
] @punctuation