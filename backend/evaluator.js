/*
  This file evaluates spreadsheet formulas.
  Role: Takes a formula string, tokenizes it, then calculates the result.

  pipeline:
  1.raw string -> 2.[tokenizer] -> 3.tokens[] -> 4.[evaluator] -> 5.result
*/

// In Node (tests) we require the tokenizer; in the browser it is a global.
// Use evaluator-specific names so browser script tags do not redeclare tokenizer globals.
let tokenizeFormula, EVALUATOR_TOKEN_TYPES;
if (typeof require !== 'undefined') {
  ({ tokenize: tokenizeFormula, TOKEN_TYPES: EVALUATOR_TOKEN_TYPES } = require('./tokenizer'));
} else {
  tokenizeFormula = window.tokenize;
  EVALUATOR_TOKEN_TYPES = window.TOKEN_TYPES;
}

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

// Turns a cell address like A1 into column and row numbers
function parseCellAddress(address) {
  const match = /^([A-Z]+)(\d+)$/i.exec(address.toUpperCase());
  if (!match) return null;

  const colLetters = match[1];
  const row = parseInt(match[2], 10);
  let col = 0;

  for (let i = 0; i < colLetters.length; i++) {
    col = col * 26 + (colLetters.charCodeAt(i) - 64);
  }

  return { col, row };
}

// Builds a cell address from column and row numbers
function cellAddressFromParts(col, row) {
  let letters = '';
  let c = col;

  while (c > 0) {
    const rem = (c - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    c = Math.floor((c - 1) / 26);
  }

  return letters + row;
}

// Expands A1:B2 into ['A1', 'B1', 'A2', 'B2']
function expandRange(start, end) {
  const startParts = parseCellAddress(start);
  const endParts = parseCellAddress(end);

  if (!startParts || !endParts) {
    return ERRORS.SYNTAX;
  }

  const minCol = Math.min(startParts.col, endParts.col);
  const maxCol = Math.max(startParts.col, endParts.col);
  const minRow = Math.min(startParts.row, endParts.row);
  const maxRow = Math.max(startParts.row, endParts.row);
  const addresses = [];

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      addresses.push(cellAddressFromParts(col, row));
    }
  }

  return addresses;
}

// Reads every cell in a range and returns their numeric values
function evaluateRange(start, end, cells) {
  const addresses = expandRange(start, end);
  if (isError(addresses)) return addresses;

  const values = [];

  for (const address of addresses) {
    const value = resolveCellValue(address, cells);
    if (isError(value)) return value;
    values.push(value);
  }

  return values;
}

// Main entry point: evaluate a full formula string like "=1+2*3"
function evaluateFormula(input, cells = {}) {
  const tokens = tokenizeFormula(input);
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
    return peek().type === EVALUATOR_TOKEN_TYPES.EOF;
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

    while (check(EVALUATOR_TOKEN_TYPES.OPERATOR) && (peek().value === '+' || peek().value === '-')) {
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

    while (check(EVALUATOR_TOKEN_TYPES.OPERATOR) && (peek().value === '*' || peek().value === '/')) {
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

  // Handles SUM, AVG, COUNT, MIN and MAX over a range like A1:A5
  function parseFunctionCall(fnName) {
    const supported = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];
    if (!supported.includes(fnName)) {
      return ERRORS.SYNTAX;
    }

    if (!match(EVALUATOR_TOKEN_TYPES.LPAREN)) return ERRORS.SYNTAX;

    if (!match(EVALUATOR_TOKEN_TYPES.CELL_REF)) return ERRORS.SYNTAX;
    const start = previous().value;

    if (!match(EVALUATOR_TOKEN_TYPES.COLON)) return ERRORS.SYNTAX;

    if (!match(EVALUATOR_TOKEN_TYPES.CELL_REF)) return ERRORS.SYNTAX;
    const end = previous().value;

    if (!match(EVALUATOR_TOKEN_TYPES.RPAREN)) return ERRORS.SYNTAX;

    const values = evaluateRange(start, end, cells);
    if (isError(values)) return values;

    if (values.length === 0) return ERRORS.SYNTAX;

    if (fnName === 'SUM') {
      return values.reduce((total, value) => total + value, 0);
    }

    if (fnName === 'AVG') {
      const total = values.reduce((sum, value) => sum + value, 0);
      return total / values.length;
    }

    if (fnName === 'COUNT') {
      // Every cell in the range resolves to a number here, so this is the range size.
      return values.length;
    }

    if (fnName === 'MIN') {
      return Math.min(...values);
    }

    return Math.max(...values);
  }

  // Handles numbers, cell references, functions, and parentheses
  function parseFactor() {
    // Unary plus or minus, e.g. -8 or -A1
    if (check(EVALUATOR_TOKEN_TYPES.OPERATOR) && (peek().value === '-' || peek().value === '+')) {
      const op = advance().value;
      const operand = parseFactor();
      if (isError(operand)) return operand;
      return op === '-' ? -operand : operand;
    }

    if (match(EVALUATOR_TOKEN_TYPES.NUMBER)) {
      return previous().value;
    }

    if (match(EVALUATOR_TOKEN_TYPES.CELL_REF)) {
      return resolveCellValue(previous().value, cells);
    }

    if (match(EVALUATOR_TOKEN_TYPES.FUNCTION)) {
      return parseFunctionCall(previous().value);
    }

    if (match(EVALUATOR_TOKEN_TYPES.LPAREN)) {
      const value = parseExpression();
      if (isError(value)) return value;
      if (!match(EVALUATOR_TOKEN_TYPES.RPAREN)) return ERRORS.SYNTAX;
      return value;
    }

    return ERRORS.SYNTAX;
  }

  function parse() {
    if (check(EVALUATOR_TOKEN_TYPES.EQUALS)) advance();

    const result = parseExpression();
    if (isError(result)) return result;

    if (!isAtEnd()) return ERRORS.SYNTAX;

    return result;
  }

  return { parse };
}

// Node (tests) use module.exports; the browser uses window globals.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ERRORS,
    evaluateFormula,
    resolveCellValue,
    expandRange
  };
}

if (typeof window !== 'undefined') {
  window.ERRORS = ERRORS;
  window.evaluateFormula = evaluateFormula;
  window.resolveCellValue = resolveCellValue;
  window.expandRange = expandRange;
}
