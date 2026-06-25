/* 
  This file does this
  Role: Breaks a raw formula string into a flat list of tokens.
  it does not understand meaning it only recognizes shapes and patterns.

  pipeline:
  1.raw string -> 2.[tokenizer] -> 3.tokens[] 
*/

//TOKEN TYPES
// A fixed vocabulary of everything the tokenizer can produce.
// Still yet to be fully implemented, but the idea is that this will be a single source of truth for all token types and their properties.
const TOKEN_TYPES = {
  EQUALS: 'EQUALS',
  NUMBER: 'NUMBER'
};


// Helpers 
//Helpers are small reusable functions that do one simple job.

//Returns true if the character is a decimal digit 0-9.
function isDigit(char) {
  return char >= '0' && char <= '9';
}

//Returns true if the character can start an identifier (letter or underscore).
function isAlpha(char) {
  return /[a-zA-Z_]/test(char);
}

//Return true for characters that are valid inside a cell reference (letters, digits, and underscores) or names (letters, digits, underscores, and periods).
function isCellReferenceChar(char) {
  return /[a-zA-Z0-9_.]/.test(char);
}

//Returns true for four basic arithmetic operators: +, -, *, /
function isOperator(char) {
  return ['+', '-', '*', '/'].includes(char);
}

//TOKEN_FACTORY_HELPER
// A simple factory function to create a token object with a type and value.
function createToken(type, value) {
  return { type, value };
}

//Main Tokenizer Function
// The main function that takes a raw formula string and returns an array of tokens.
function tokenize(input) {
  const tokens = [];
  let current = 0;

  while (current < input.length) {
    let char = input[current];

    // Skip whitespace
    if (char === ' ' || char === '\t' || char === '\n') {
      current++;
      continue;
    }

// In spreadsheets, '=' marks the start of a formula.
// It only appears once, as the very first character.
// Example: '=A1+1'  →  first token is EQUALS
    if (char === '=' && current === 0) {
      tokens.push(createToken(TOKEN_TYPES.EQUALS, '='));
      current++;
      continue;
    }
//Numbers
//Consume all digits and one optional decimal point to form a number token.
//Example: '3.14' -> {type: 'NUMBER', value:3.14}
    if (isDigit(char) || (char === '.' && isDigit(input[current + 1]))) {
      let numStr = '';
      while (current < input.length && (isDigit(input[current]) || input[current] === '.')) {
        numStr += input[current];
        current++;
      }
      tokens.push(createToken(TOKEN_TYPES.NUMBER, parseFloat(numStr)));
      continue;
    }

    current++;
  }

  return tokens;
}

module.exports = {
  TOKEN_TYPES,
  tokenize
};
