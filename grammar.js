/**
 * @file SCL grammar for tree-sitter
 * @author Martin Heubuch <martin.heubuch@spie-escad.de>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  assign: -1,
  or: 1,
  xor: 2,
  and: 3,
  equals: 4,
  compare: 5,
  add: 6,
  multiply: 7,
  unary: 8,
  call: 9,
  member: 10,
};

// Helper function for comma-separated lists (can be empty)
function sepBy(sep, rule) {
  return optional(seq(rule, repeat(seq(sep, rule))));
}

// Helper function for non-empty comma-separated lists
function sepBy1(sep, rule) {
  return seq(rule, repeat(seq(sep, rule)));
}

module.exports = grammar({
  name: "scl",

  word: $ => $.simple_identifier,

  extras: $ => [
    /\s/,
    /\uFEFF/, // Ignore the Byte Order Mark (BOM)
    $.line_comment,
    $.block_comment,
  ],

  conflicts: $ => [
    [$._expression, $.named_argument],
    [$.statement_list],
  ],

  rules: {
    source_file: $ => repeat($._definition),

    _definition: $ => choice(
      $.namespace,
      $.type_definition,
      $.function_block,
      $.function,
      $.organization_block,
      $.data_block
    ),

    function_block: $ => seq(
      "FUNCTION_BLOCK",
      field("name", $.identifier),
      repeat($._header_declaration),
      optional($.version),
      repeat($.variable_declaration_section),
      $._block_body,
      "END_FUNCTION_BLOCK"
    ),

    function: $ => seq(
      "FUNCTION",
      field("name", $.identifier),
      ":",
      field("return_type", $.type),
      repeat($._header_declaration),
      optional($.version),
      repeat($.variable_declaration_section),
      $._block_body,
      "END_FUNCTION"
    ),

    organization_block: $ => seq(
      "ORGANIZATION_BLOCK",
      field("name", $.identifier),
      repeat($._header_declaration),
      optional($.version),
      repeat($.variable_declaration_section),
      $._block_body,
      "END_ORGANIZATION_BLOCK"
    ),

    data_block: $ => seq(
      "DATA_BLOCK",
      field("name", $.identifier),
      repeat($._header_declaration),
      optional($.attributes),
      $.version,
      optional($.db_attribute),
      field("type", $.quoted_identifier),
      $._block_body,
      "END_DATA_BLOCK"
    ),

    db_attribute: $ => choice(
      'RETAIN',
      'NON_RETAIN'
    ),

    _block_body: $ => seq("BEGIN", optional($.statement_list)),

    _header_declaration: $ => choice(
      $.header_attribute,
      $.legacy_header_attribute
    ),

    // FIX for new header format
    header_attribute: $ => seq(
      field("name", choice("AUTHOR", "FAMILY", "NAME")),
      choice(':', ':='),
      field("value", choice($.string_literal, $.simple_identifier))
    ),

    legacy_header_attribute: $ => seq(
      "TITLE",
      "=",
      field("value", /.*/)
    ),

    namespace: $ => seq(
      "NAMESPACE",
      field("name", $.simple_identifier),
      repeat($._definition),
      "END_NAMESPACE"
    ),

    type_definition: $ => seq(
      "TYPE",
      field("name", $.identifier),
      optional($.attributes),
      repeat($._header_declaration),
      optional($.version),
      $.struct_definition,
      "END_TYPE"
    ),

    struct_definition: $ => seq(
      "STRUCT",
      repeat($.fields),
      "END_STRUCT",
      ";"
    ),

    fields: $ => seq(
      field("name", $.identifier),
      optional($.attributes),
      ":",
      $.type,
      optional(seq(":=", field("initial_value", $._expression))),
      ";"
    ),

    variable_declaration_section: $ => seq(
      field("type", choice(
        "VAR_INPUT", "VAR_OUTPUT", "VAR_IN_OUT", "VAR",
        "VAR_TEMP", "VAR_STATIC", "CONSTANT"
      )),
      repeat($.variable_declaration),
      "END_VAR"
    ),

    variable_declaration: $ => seq(
      field("name", $.identifier),
      optional($.attributes),
      ":",
      field("data_type", $.type),
      optional(seq(":=", field("initial_value", $._expression))),
      ";"
    ),

    statement_list: $ => repeat1($._statement),

    _statement: $ => choice(
      $.expression_statement, $.if_statement, $.case_statement, $.for_statement,
      $.while_statement, $.repeat_statement, $.return_statement, $.exit_statement
    ),

    expression_statement: $ => seq($._expression, ";"),

    if_statement: $ => seq(
      "IF", field("condition", $._expression), "THEN", $.statement_list,
      repeat($.elsif_clause), optional($.else_clause), "END_IF", ";"
    ),
    elsif_clause: $ => seq("ELSIF", field("condition", $._expression), "THEN", $.statement_list),
    else_clause: $ => seq("ELSE", $.statement_list),

    case_statement: $ => seq(
      "CASE", field("value", $._expression), "OF",
      repeat1($.case_option), optional($.else_clause), "END_CASE", ";"
    ),
    case_option: $ => seq(field("match", $._expression), ":", $.statement_list),

    for_statement: $ => seq(
      "FOR", field("iterator", $.identifier), ":=", field("start", $._expression),
      "TO", field("end", $._expression), optional(seq("BY", field("step", $._expression))),
      "DO", $.statement_list, "END_FOR", ";"
    ),

    while_statement: $ => seq("WHILE", field("condition", $._expression), "DO", $.statement_list, "END_WHILE", ";"),
    repeat_statement: $ => seq("REPEAT", $.statement_list, "UNTIL", field("condition", $._expression), "END_REPEAT", ";"),
    return_statement: $ => seq("RETURN", ";"),
    exit_statement: $ => seq("EXIT", ";"),

    _expression: $ => choice(
      $.identifier, $.integer_literal, $.real_literal, $.string_literal, $.bool_literal,
      $.unary_expression, $.binary_expression, $.function_call, $.member_expression,
      $.array_expression, $.parenthesized_expression,
      $.struct_literal
    ),

    struct_literal: $ => prec(1, seq(
      '(',
      sepBy(',', $._expression),
      ')'
    )),

    parenthesized_expression: $ => seq("(", $._expression, ")"),
    unary_expression: $ => prec.right(PREC.unary, seq(field("operator", choice("NOT", "-")), field("operand", $._expression))),

    binary_expression: $ => choice(
      prec.right(PREC.assign, seq(field("left", $._expression), field("operator", ":="), field("right", $._expression))),
      prec.left(PREC.multiply, seq(field("left", $._expression), field("operator", choice("*", "/", "MOD")), field("right", $._expression))),
      prec.left(PREC.add, seq(field("left", $._expression), field("operator", choice("+", "-")), field("right", $._expression))),
      prec.left(PREC.compare, seq(field("left", $._expression), field("operator", choice("<", ">", "<=", ">=")), field("right", $._expression))),
      prec.left(PREC.equals, seq(field("left", $._expression), field("operator", choice("=", "<>")), field("right", $._expression))),
      prec.left(PREC.and, seq(field("left", $._expression), field("operator", "AND"), field("right", $._expression))),
      prec.left(PREC.xor, seq(field("left", $._expression), field("operator", "XOR"), field("right", $._expression))),
      prec.left(PREC.or, seq(field("left", $._expression), field("operator", "OR"), field("right", $._expression)))
    ),

    function_call: $ => prec(PREC.call, seq(field("function", $.identifier), "(", optional($.argument_list), ")")),
    argument_list: $ => sepBy1(",", $.argument),
    argument: $ => choice($.named_argument, $._expression),
    named_argument: $ => seq(field("name", $.identifier), choice(":=", "=>"), field("value", $._expression)),
    member_expression: $ => prec.left(PREC.member, seq(field("object", $._expression), ".", field("property", $.identifier))),
    array_expression: $ => prec(PREC.member, seq(field("array", $._expression), "[", sepBy1(",", $._expression), "]")),

    // --- FINAL, ROBUST TYPE RULES ---
    type: $ => choice(
      $.array_type,
      $.sized_string_type,
      seq(
        choice($.elementary_type, $.simple_identifier, $.quoted_identifier),
        optional($.attributes)
      )
    ),

    array_type: $ => seq(
      'Array',
      '[',
      sepBy1(',', seq($._expression, '..', $._expression)),
      ']',
      'of',
      $.type
    ),
    
    sized_string_type: $ => seq(
      $.string_type_names,
      '[',
      $._expression,
      ']'
    ),
    // --- END FINAL TYPE RULES ---

    elementary_type: $ => seq($.elementary_type_names, optional(seq("(", $._expression, ")"))),
    elementary_type_names: $ => choice(
      $.numeric_type_names, $.date_type_names, $.bit_string_type_names, $.string_type_names
    ),
    numeric_type_names: $ => choice($.integer_type_names, $._real_type_names),
    integer_type_names: $ => choice($.signed_integer_type_names, $.unsigned_integer_type_names),
    signed_integer_type_names: $ => choice("SInt", "Int", "DInt", "LInt"),
    unsigned_integer_type_names: $ => choice("USInt", "UInt", "UDInt", "ULInt"),
    _real_type_names: $ => choice("Real", "LReal"),
    date_type_names: $ => choice("Date", "Time_Of_Day", "Tod", "Time", "Date_And_Time", "Dt"),
    bit_string_type_names: $ => choice("Bool", "Byte", "Word", "DWord", "LWord"),
    string_type_names: $ => choice("String", "WString"),

    bool_literal: $ => choice("TRUE", "FALSE"),
    string_literal: $ => /'[^']*'/,
    real_literal: $ => seq(optional(seq($._real_type_names, "#")), $._real),
    _real: $ => /[+-]?[0-9]+(_[0-9]+)*\.[0-9]+(_[0-9]+)*([eE][+-]?[0-9]+)?/,
    integer_literal: $ => choice($._signed_integer, $._unsigned_integer, $._hex_integer, $._binary_integer, $._octal_integer),
    _signed_integer: $ => /[+-]?[0-9](_?[0-9])*/,
    _unsigned_integer: $ => /[0-9](_?[0-9])*/,
    _hex_integer: $ => /16#[0-9a-fA-F_]+/,
    _binary_integer: $ => /2#[01_]+/,
    _octal_integer: $ => /8#[0-7_]+/,

    attributes: $ => seq("{", $.attribute_list, "}"),
    attribute_list: $ => sepBy1(";", $.attribute),
    attribute: $ => seq(field("name", $.identifier), ":=", field("value", $.string_literal)),
    version: $ => seq("VERSION", ":", field("value", $.real_literal)),

    identifier: $ => choice($.simple_identifier, $.quoted_identifier),
    quoted_identifier: $ => /"[^"]+"/,
    simple_identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    line_comment: $ => token(seq('//', /.*/)),
    block_comment: $ => token(seq('(*', /[^*]*\*+([^*)][^*]*\*+)*/, ')')),
  }
})