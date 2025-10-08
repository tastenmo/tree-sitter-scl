; queries/highlights.scm

; Keywords
(
  [
    (KEYWORD_NAMESPACE)
    (KEYWORD_TYPE)
    (KEYWORD_STRUCT)
    (KEYWORD_FUNCTION_BLOCK)
    (KEYWORD_FUNCTION)
    (KEYWORD_ORGANIZATION_BLOCK)
    (KEYWORD_DATA_BLOCK)
    (KEYWORD_BEGIN)
    (KEYWORD_END_NAMESPACE)
    (KEYWORD_END_TYPE)
    (KEYWORD_END_STRUCT)
    (KEYWORD_END_FUNCTION_BLOCK)
    (KEYWORD_END_FUNCTION)
    (KEYWORD_END_ORGANIZATION_BLOCK)
    (KEYWORD_END_DATA_BLOCK)
    (KEYWORD_VERSION)
    (KEYWORD_VAR_INPUT)
    (KEYWORD_VAR_OUTPUT)
    (KEYWORD_VAR_IN_OUT)
    (KEYWORD_VAR)
    (KEYWORD_VAR_TEMP)
    (KEYWORD_VAR_STATIC)
    (KEYWORD_CONSTANT)
    (KEYWORD_END_VAR)
    (KEYWORD_IF)
    (KEYWORD_THEN)
    (KEYWORD_ELSIF)
    (KEYWORD_ELSE)
    (KEYWORD_END_IF)
    (KEYWORD_CASE)
    (KEYWORD_OF)
    (KEYWORD_END_CASE)
    (KEYWORD_FOR)
    (KEYWORD_TO)
    (KEYWORD_BY)
    (KEYWORD_DO)
    (KEYWORD_END_FOR)
    (KEYWORD_WHILE)
    (KEYWORD_END_WHILE)
    (KEYWORD_REPEAT)
    (KEYWORD_UNTIL)
    (KEYWORD_END_REPEAT)
    (KEYWORD_RETURN)
    (KEYWORD_EXIT)
    (KEYWORD_RETAIN)
    (KEYWORD_NON_RETAIN)
    (KEYWORD_TITLE)
    (KEYWORD_AUTHOR)
    (KEYWORD_FAMILY)
    (KEYWORD_NAME)
  ] @keyword
)

(KEYWORD_ARRAY) @keyword.type

; Types
(elementary_type_names) @type

; Operators
(
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
    ".."
    (KEYWORD_AND)
    (KEYWORD_OR)
    (KEYWORD_XOR)
    (KEYWORD_NOT)
    (KEYWORD_MOD)
  ] @operator
)

; Literals
(bool_literal) @boolean
(string_literal) @string
(real_literal) @number
(integer_literal) @number

; Comments
(line_comment) @comment
(block_comment) @comment

; Functions, Properties, and Types
(function_call function: (identifier) @function)
(fields name: (identifier) @property)
(member_expression property: (identifier) @property)

(type_definition name: (identifier) @type)
(function_block name: (identifier) @type)
(data_block name: (identifier) @type)
(organization_block name: (identifier) @type)
(function name: (identifier) @type)
(namespace name: (simple_identifier) @type)

; Special strings
(quoted_identifier) @string.special

; Punctuation
(
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
)

; Default to variable
(identifier) @variable