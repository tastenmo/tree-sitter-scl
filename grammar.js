/**
 * @file SCL grammar for tree-sitter
 * @author Martin Heubuch <martin.heubuch@spie-escad.de>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "scl",

  word: $ => $.simple_identifier,

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => repeat($._definitions),

    _definitions: $ => choice(
        $.namespace,
        $.type_definition
        ),

    namespace: $ => seq(
      "NAMESPACE",
      field("name", $.simple_identifier),
      $.type_definition,
      "END_NAMESPACE"
    ),

    type_definition: $ => seq(
        "TYPE",
        field("name", $.identifier),
        optional($.attributes),
        $.version,
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
        ";"
    ),

    type: $ => choice(
        $.quoted_identifier,
        $.elementary_type,
    ),

    elementary_type: $ => seq(
        $.elementary_type_names,
        optional(seq(":=", $.real_literal, ")"))
    ),



    elementary_type_names: $ => choice(
        $.numeric_type_names,
        $.date_type_names,
        $.bit_string_type_names,
        $.string_type_names
    ),

    numeric_type_names: $ => choice(
        $.integer_type_names,
        $._real_type_names
    ),

    integer_type_names: $ => choice(
        $.signed_integer_type_names,
        $.unsigned_integer_type_names
    ),

    signed_integer_type_names: $ => choice(
        "SInt",
        "Int",
        "DInt",
        "LInt"
    ),

    unsigned_integer_type_names: $ => choice(
        "USInt",
        "UInt",
        "UDInt",
        "ULInt"
    ),

    _real_type_names: $ => choice(
        "Real",
        "LReal"
    ),

    date_type_names: $ => choice(
        "Date",
        "Time_Of_Day",
        "Tod",
        "Time",
        "Date_And_Time",
        "Dt"
    ),

    bit_string_type_names: $ => choice(
        "Bool",
        "Byte",
        "Word",
        "DWord",
        "LWord"
    ),

    string_type_names: $ => choice(
        "String",
        "WString"
    ),

    attributes: $ => seq(
        "{",
        $.attribute_list,
        "}"
    ),

    attribute_list: $ => seq(
        $.attribute,
        optional(repeat(seq(";", $.attribute)))
    ),

    attribute: $ => seq(
        field("name", $.identifier),
        ":=",
        field("value", $.string_literal)
    ),

    version: $ => seq(
        "VERSION",
        ":",
        field("value", $.real_literal)
    ),

    string_literal: $ => /'[^']*'/,

    real_literal: $ => seq(
        optional(
            seq(
                $._real_type_names,
                "#"
            )
        ),
        $._real
    ),

    _real: $ => seq(
        $._signed_integer,
        ".",
        $._unsigned_integer,
        optional($._exponent)

    ),

    _exponent: $ => /[eE][+-]?[0-9]+/,

    integer_literal: $ => choice(
        $._signed_integer,
        $._unsigned_integer,
        $._hex_integer,
        $._binary_integer,
        $._octal_integer
    ),

    _signed_integer: $ => /[+-]?[0-9]([_]?[0-9])*/,

    _unsigned_integer: $ => /[0-9]([_]?[0-9])*/,

    _hex_integer: $ => /16#[0-9a-fA-F]+/,

    _binary_integer: $ => /2#[01]+/,

    _octal_integer: $ => /8#[0-7]+/,

    identifier: $ => choice(
        $.simple_identifier,
        $.quoted_identifier
    ),

    quoted_identifier: $ => /"[^"]+"/,

    simple_identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,


  }
});
