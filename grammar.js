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

// Helper function to create a case-insensitive regex for a keyword
const caseInsensitive = word => new RegExp(
  word.split('').map(c => `[${c.toLowerCase()}${c.toUpperCase()}]`).join('')
);

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
    [$.struct_definition],
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

    // --- Visible Keyword Definitions ---
    KEYWORD_FUNCTION_BLOCK: $ => caseInsensitive("FUNCTION_BLOCK"),
    KEYWORD_END_FUNCTION_BLOCK: $ => caseInsensitive("END_FUNCTION_BLOCK"),
    KEYWORD_FUNCTION: $ => caseInsensitive("FUNCTION"),
    KEYWORD_END_FUNCTION: $ => caseInsensitive("END_FUNCTION"),
    KEYWORD_ORGANIZATION_BLOCK: $ => caseInsensitive("ORGANIZATION_BLOCK"),
    KEYWORD_END_ORGANIZATION_BLOCK: $ => caseInsensitive("END_ORGANIZATION_BLOCK"),
    KEYWORD_DATA_BLOCK: $ => caseInsensitive("DATA_BLOCK"),
    KEYWORD_END_DATA_BLOCK: $ => caseInsensitive("END_DATA_BLOCK"),
    KEYWORD_RETAIN: $ => caseInsensitive('RETAIN'),
    KEYWORD_NON_RETAIN: $ => caseInsensitive('NON_RETAIN'),
    KEYWORD_BEGIN: $ => caseInsensitive("BEGIN"),
    KEYWORD_AUTHOR: $ => caseInsensitive("AUTHOR"),
    KEYWORD_FAMILY: $ => caseInsensitive("FAMILY"),
    KEYWORD_NAME: $ => caseInsensitive("NAME"),
    KEYWORD_TITLE: $ => caseInsensitive("TITLE"),
    KEYWORD_NAMESPACE: $ => caseInsensitive("NAMESPACE"),
    KEYWORD_END_NAMESPACE: $ => caseInsensitive("END_NAMESPACE"),
    KEYWORD_TYPE: $ => caseInsensitive("TYPE"),
    KEYWORD_END_TYPE: $ => caseInsensitive("END_TYPE"),
    KEYWORD_STRUCT: $ => caseInsensitive("STRUCT"),
    KEYWORD_END_STRUCT: $ => caseInsensitive("END_STRUCT"),
    KEYWORD_VAR: $ => caseInsensitive("VAR"),
    KEYWORD_VAR_INPUT: $ => caseInsensitive("VAR_INPUT"),
    KEYWORD_VAR_OUTPUT: $ => caseInsensitive("VAR_OUTPUT"),
    KEYWORD_VAR_IN_OUT: $ => caseInsensitive("VAR_IN_OUT"),
    KEYWORD_VAR_TEMP: $ => caseInsensitive("VAR_TEMP"),
    KEYWORD_VAR_STATIC: $ => caseInsensitive("VAR_STATIC"),
    KEYWORD_CONSTANT: $ => caseInsensitive("CONSTANT"),
    KEYWORD_END_VAR: $ => caseInsensitive("END_VAR"),
    KEYWORD_IF: $ => caseInsensitive("IF"),
    KEYWORD_THEN: $ => caseInsensitive("THEN"),
    KEYWORD_END_IF: $ => caseInsensitive("END_IF"),
    KEYWORD_ELSIF: $ => caseInsensitive("ELSIF"),
    KEYWORD_ELSE: $ => caseInsensitive("ELSE"),
    KEYWORD_CASE: $ => caseInsensitive("CASE"),
    KEYWORD_OF: $ => caseInsensitive("OF"),
    KEYWORD_END_CASE: $ => caseInsensitive("END_CASE"),
    KEYWORD_FOR: $ => caseInsensitive("FOR"),
    KEYWORD_TO: $ => caseInsensitive("TO"),
    KEYWORD_BY: $ => caseInsensitive("BY"),
    KEYWORD_DO: $ => caseInsensitive("DO"),
    KEYWORD_END_FOR: $ => caseInsensitive("END_FOR"),
    KEYWORD_WHILE: $ => caseInsensitive("WHILE"),
    KEYWORD_END_WHILE: $ => caseInsensitive("END_WHILE"),
    KEYWORD_REPEAT: $ => caseInsensitive("REPEAT"),
    KEYWORD_UNTIL: $ => caseInsensitive("UNTIL"),
    KEYWORD_END_REPEAT: $ => caseInsensitive("END_REPEAT"),
    KEYWORD_RETURN: $ => caseInsensitive("RETURN"),
    KEYWORD_EXIT: $ => caseInsensitive("EXIT"),
    KEYWORD_NOT: $ => caseInsensitive("NOT"),
    KEYWORD_MOD: $ => caseInsensitive("MOD"),
    KEYWORD_AND: $ => caseInsensitive("AND"),
    KEYWORD_XOR: $ => caseInsensitive("XOR"),
    KEYWORD_OR: $ => caseInsensitive("OR"),
    KEYWORD_ARRAY: $ => caseInsensitive('Array'),
    KEYWORD_VERSION: $ => caseInsensitive("VERSION"),
    
    function_block: $ => seq(
      $.KEYWORD_FUNCTION_BLOCK,
      field("name", $.identifier),
      repeat(choice($._header_declaration, $.version)),
      repeat($.variable_declaration_section),
      $._block_body,
      $.KEYWORD_END_FUNCTION_BLOCK
    ),

    function: $ => seq(
      $.KEYWORD_FUNCTION,
      field("name", $.identifier),
      ":",
      field("return_type", $.type),
      repeat(choice($._header_declaration, $.version)),
      repeat($.variable_declaration_section),
      $._block_body,
      $.KEYWORD_END_FUNCTION
    ),

    organization_block: $ => seq(
      $.KEYWORD_ORGANIZATION_BLOCK,
      field("name", $.identifier),
      repeat(choice($._header_declaration, $.version)),
      repeat($.variable_declaration_section),
      $._block_body,
      $.KEYWORD_END_ORGANIZATION_BLOCK
    ),

    data_block: $ => seq(
      $.KEYWORD_DATA_BLOCK,
      field("name", $.identifier),
      repeat($._block_header_item),
      choice(
        field("type", $.quoted_identifier),
        repeat($.variable_declaration_section),
        $.struct_definition
      ),
      $._block_body,
      $.KEYWORD_END_DATA_BLOCK
    ),
    
    _block_header_item: $ => choice(
      $._header_declaration,
      $.attributes,
      $.version,
      $.db_attribute
    ),

    db_attribute: $ => choice($.KEYWORD_RETAIN, $.KEYWORD_NON_RETAIN),
    _block_body: $ => seq($.KEYWORD_BEGIN, optional($.statement_list)),
    _header_declaration: $ => choice($.header_attribute, $.legacy_header_attribute),

    header_attribute: $ => seq(
      field("name", choice($.KEYWORD_AUTHOR, $.KEYWORD_FAMILY, $.KEYWORD_NAME)),
      choice(':', ':='),
      field("value", choice($.string_literal, $.simple_identifier))
    ),

    legacy_header_attribute: $ => seq(
      $.KEYWORD_TITLE,
      "=",
      field("value", /.*/)
    ),

    namespace: $ => seq(
      $.KEYWORD_NAMESPACE,
      field("name", $.simple_identifier),
      repeat($._definition),
      $.KEYWORD_END_NAMESPACE
    ),

    type_definition: $ => seq(
      $.KEYWORD_TYPE,
      field("name", $.identifier),
      repeat(choice($.attributes, $._header_declaration, $.version)),
      $.struct_definition,
      $.KEYWORD_END_TYPE
    ),

    struct_definition: $ => seq(
      $.KEYWORD_STRUCT,
      repeat($.fields),
      $.KEYWORD_END_STRUCT,
      optional(";")
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
        $.KEYWORD_VAR, $.KEYWORD_VAR_INPUT, $.KEYWORD_VAR_OUTPUT, $.KEYWORD_VAR_IN_OUT,
        $.KEYWORD_VAR_TEMP, $.KEYWORD_VAR_STATIC, $.KEYWORD_CONSTANT
      )),
      optional(choice($.KEYWORD_RETAIN, $.KEYWORD_NON_RETAIN)),
      repeat($.variable_declaration),
      $.KEYWORD_END_VAR
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
      $.KEYWORD_IF, field("condition", $._expression), $.KEYWORD_THEN, $.statement_list,
      repeat($.elsif_clause), optional($.else_clause), $.KEYWORD_END_IF, ";"
    ),
    elsif_clause: $ => seq($.KEYWORD_ELSIF, field("condition", $._expression), $.KEYWORD_THEN, $.statement_list),
    else_clause: $ => seq($.KEYWORD_ELSE, $.statement_list),

    case_statement: $ => seq(
      $.KEYWORD_CASE, field("value", $._expression), $.KEYWORD_OF,
      repeat1($.case_option), optional($.else_clause), $.KEYWORD_END_CASE, ";"
    ),
    case_option: $ => seq(field("match", $._expression), ":", $.statement_list),

    for_statement: $ => seq(
      $.KEYWORD_FOR, field("iterator", $.identifier), ":=", field("start", $._expression),
      $.KEYWORD_TO, field("end", $._expression), optional(seq($.KEYWORD_BY, field("step", $._expression))),
      $.KEYWORD_DO, $.statement_list, $.KEYWORD_END_FOR, ";"
    ),

    while_statement: $ => seq($.KEYWORD_WHILE, field("condition", $._expression), $.KEYWORD_DO, $.statement_list, $.KEYWORD_END_WHILE, ";"),
    repeat_statement: $ => seq($.KEYWORD_REPEAT, $.statement_list, $.KEYWORD_UNTIL, field("condition", $._expression), $.KEYWORD_END_REPEAT, ";"),
    return_statement: $ => seq($.KEYWORD_RETURN, ";"),
    exit_statement: $ => seq($.KEYWORD_EXIT, ";"),

    _expression: $ => choice(
      $.identifier, $.integer_literal, $.real_literal, $.string_literal, $.bool_literal,
      $.typed_literal, // FINAL FIX
      $.unary_expression, $.binary_expression, $.function_call, $.member_expression,
      $.array_expression, $.parenthesized_expression,
      $.struct_literal,
      $.array_literal
    ),
    
    array_literal: $ => seq(
        '[',
        sepBy(',', $._expression),
        ']'
    ),

    // FINAL FIX: This one rule handles all TYPE#VALUE literals
    typed_literal: $ => prec(1, seq(
      field('type', $.simple_identifier),
      '#',
      field('value', choice(
        $.integer_literal,
        $.real_literal,
        /[a-zA-Z0-9_.:-]+/ // For time literals like 1h, 05:00:0.000, etc.
      ))
    )),

    struct_literal: $ => prec(1, seq('(', sepBy(',', $._expression), ')')),
    parenthesized_expression: $ => seq("(", $._expression, ")"),
    unary_expression: $ => prec.right(PREC.unary, seq(field("operator", choice($.KEYWORD_NOT, "-")), field("operand", $._expression))),

    binary_expression: $ => choice(
      prec.right(PREC.assign, seq(field("left", $._expression), field("operator", ":="), field("right", $._expression))),
      prec.left(PREC.multiply, seq(field("left", $._expression), field("operator", choice("*", "/", $.KEYWORD_MOD)), field("right", $._expression))),
      prec.left(PREC.add, seq(field("left", $._expression), field("operator", choice("+", "-")), field("right", $._expression))),
      prec.left(PREC.compare, seq(field("left", $._expression), field("operator", choice("<", ">", "<=", ">=")), field("right", $._expression))),
      prec.left(PREC.equals, seq(field("left", $._expression), field("operator", choice("=", "<>")), field("right", $._expression))),
      prec.left(PREC.and, seq(field("left", $._expression), field("operator", $.KEYWORD_AND), field("right", $._expression))),
      prec.left(PREC.xor, seq(field("left", $._expression), field("operator", $.KEYWORD_XOR), field("right", $._expression))),
      prec.left(PREC.or, seq(field("left", $._expression), field("operator", $.KEYWORD_OR), field("right", $._expression)))
    ),

    function_call: $ => prec(PREC.call, seq(field("function", $.identifier), "(", optional($.argument_list), ")")),
    argument_list: $ => sepBy1(",", $.argument),
    argument: $ => choice($.named_argument, $._expression),
    named_argument: $ => seq(field("name", $.identifier), choice(":=", "=>"), field("value", $._expression)),
    member_expression: $ => prec.left(PREC.member, seq(field("object", $._expression), ".", field("property", $.identifier))),
    array_expression: $ => prec(PREC.member, seq(field("array", $._expression), "[", sepBy1(",", $._expression), "]")),

    type: $ => choice(
      $.array_type,
      $.sized_string_type,
      $.struct_definition,
      seq(
        choice($.elementary_type, $.simple_identifier, $.quoted_identifier),
        optional($.attributes)
      )
    ),

    array_type: $ => seq(
      $.KEYWORD_ARRAY, '[', sepBy1(',', seq($._expression, '..', $._expression)), ']', $.KEYWORD_OF, $.type
    ),
    
    sized_string_type: $ => seq($.string_type_names, '[', $._expression, ']'),

    elementary_type: $ => seq($.elementary_type_names, optional(seq("(", $._expression, ")"))),
    elementary_type_names: $ => choice(
      $.numeric_type_names, $.date_type_names, $.bit_string_type_names, $.string_type_names
    ),
    numeric_type_names: $ => choice($.integer_type_names, $._real_type_names),
    integer_type_names: $ => choice($.signed_integer_type_names, $.unsigned_integer_type_names),
    signed_integer_type_names: $ => choice(caseInsensitive("SInt"), caseInsensitive("Int"), caseInsensitive("DInt"), caseInsensitive("LInt")),
    unsigned_integer_type_names: $ => choice(caseInsensitive("USInt"), caseInsensitive("UInt"), caseInsensitive("UDInt"), caseInsensitive("ULInt")),
    _real_type_names: $ => choice(caseInsensitive("Real"), caseInsensitive("LReal")),
    date_type_names: $ => choice(caseInsensitive("Date"), caseInsensitive("Time_Of_Day"), caseInsensitive("Tod"), caseInsensitive("Time"), caseInsensitive("Date_And_Time"), caseInsensitive("Dt")),
    bit_string_type_names: $ => choice(caseInsensitive("Bool"), caseInsensitive("Byte"), caseInsensitive("Word"), caseInsensitive("DWord"), caseInsensitive("LWord")),
    string_type_names: $ => choice(caseInsensitive("String"), caseInsensitive("WString")),

    bool_literal: $ => choice(caseInsensitive("TRUE"), caseInsensitive("FALSE")),
    string_literal: $ => /'[^']*'/,
    real_literal: $ => prec(1, seq(optional(seq($._real_type_names, "#")), $._real)),
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
    version: $ => seq($.KEYWORD_VERSION, ":", field("value", $.real_literal)),

    identifier: $ => choice($.simple_identifier, $.quoted_identifier),
    quoted_identifier: $ => /"[^"]+"/,
    simple_identifier: $ => /[\p{L}_][\p{L}\p{N}_]*/u,

    line_comment: $ => token(seq('//', /.*/)),
    block_comment: $ => token(seq('(*', /[^*]*\*+([^*)][^*]*\*+)*/, ')')),
  }
});