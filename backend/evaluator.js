/*
  This file evaluates spreadsheet formulas.
  Role: Takes a formula string, tokenizes it, then calculates the result.

  pipeline:
  1.raw string -> 2.[tokenizer] -> 3.tokens[] -> 4.[evaluator] -> 5.result
*/

const { tokenize, TOKEN_TYPES } = require('./tokenizer');

// Error messages used by the spreadsheet engine
const ERRORS = {
  DIV_ZERO: '#DIV/0!',
  VALUE: '#VALUE!',
  SYNTAX: '#ERROR!',
  CIRCULAR: '#CIRCULAR!'
};

// Returns true if a value is a spreadsheet error string
function isError(value) {
  return typeof value === 'string' && value.startsWith('#');
}

// Reads a cell value from the sheet data and turns it into a number or error
function resolveCellValue(address, cells) {
  if (!cells || !(address in cells)) {
    return 0;
  }

  const raw = cells[address];

  if (raw === '' || raw === undefined || raw === null) {
    return 0;
  }

  if (isError(raw)) {
    return raw;
  }

  if (typeof raw === 'number') {
    return raw;
  }

  const str = String(raw).trim();
  if (str === '') return 0;
  if (isError(str)) return str;

  if (/^-?\d+(\.\d+)?$/.test(str)) {
    return parseFloat(str);
  }

  return ERRORS.VALUE;
}

// Main entry point: evaluate a full formula string like "=1+2*3"
function evaluateFormula(input, cells = {}) {
  const tokens = tokenize(input);
  const parser = createParser(tokens, cells);
  return parser.parse();
}

// Parser reads tokens and applies operator precedence
function createParser(tokens, cells) {
  let current = 0;

  function peek() {
    return tokens[current];
  }

  function previous() {
    return tokens[current - 1];
  }

  function isAtEnd() {
    return peek().type === TOKEN_TYPES.EOF;
  }

  function advance() {
    if (!isAtEnd()) current++;
    return previous();
  }

  function check(type) {
    if (isAtEnd()) return false;
    return peek().type === type;
  }

  function match(type) {
    if (check(type)) {
      advance();
      return true;
    }
    return false;
  }

  // Handles + and -
  function parseExpression() {
    let left = parseTerm();
    if (isError(left)) return left;

    while (check(TOKEN_TYPES.OPERATOR) && (peek().value === '+' || peek().value === '-')) {
      const op = advance().value;
      const right = parseTerm();
      if (isError(right)) return right;

      if (op === '+') left = left + right;
      else left = left - right;
    }

    return left;
  }

  // Handles * and /
  function parseTerm() {
    let left = parseFactor();
    if (isError(left)) return left;

    while (check(TOKEN_TYPES.OPERATOR) && (peek().value === '*' || peek().value === '/')) {
      const op = advance().value;
      const right = parseFactor();
      if (isError(right)) return right;

      if (op === '*') {
        left = left * right;
      } else {
        if (right === 0) return ERRORS.DIV_ZERO;
        left = left / right;
      }
    }

    return left;
  }

  // Handles numbers, cell references, and parentheses
  function parseFactor() {
    if (match(TOKEN_TYPES.NUMBER)) {
      return previous().value;
    }

    if (match(TOKEN_TYPES.CELL_REF)) {
      return resolveCellValue(previous().value, cells);
    }

    if (match(TOKEN_TYPES.LPAREN)) {
      const value = parseExpression();
      if (isError(value)) return value;
      if (!match(TOKEN_TYPES.RPAREN)) return ERRORS.SYNTAX;
      return value;
    }

    return ERRORS.SYNTAX;
  }

  function parse() {
    if (check(TOKEN_TYPES.EQUALS)) advance();

    const result = parseExpression();
    if (isError(result)) return result;

    if (!isAtEnd()) return ERRORS.SYNTAX;

    return result;
  }

  return { parse };
}

module.exports = {
  ERRORS,
  evaluateFormula,
  resolveCellValue
};
