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
  EQUALS: 'EQUALS', // self-explanatory
  NUMBER: 'NUMBER',  // for numbers 13, 26
  BOOLEAN: 'BOOLEAN', //for TRUE or FALSE
  STRING:  'STRING', // for character texts e.g "Hello"
  CELL_REF: 'CELL_REF', // for A1, B12, AA3 cells
  FUNCTION: 'FUNCTION', // to SUM, IF, AVERAGE
  OPERATOR: 'OPERATOR', //to perform calculations +-*/^
  COMMA: 'COMMA', //to separate function argument
  LPAREN: 'LPAREN', //left parentheses (
  RPAREN: 'RPAREN', //right parentheses )
  COLON: 'COLON', //to separate range cells e.g A1:A5
  EOF: 'EOF', //to show the end of input

};


// Helpers 
//Helpers are small reusable functions that do one simple job.

//Returns true if the character is a decimal digit 0-9.
function isDigit(char) {
  return char >= '0' && char <= '9';
}

//Returns true if the character can start an identifier (letter or underscore).
function isAlpha(char) {
  return /[a-zA-Z_]/.test(char);
}

//Return true for characters that are valid inside a cell reference (letters, digits, and underscores) or names (letters, digits, underscores, and periods).
function isCellReferenceChar(char) {
  return /[a-zA-Z0-9_.]/.test(char);
}

//Returns true if the character is a letter or a digit.
function isAlphaNumeric(char) {
  return isAlpha(char) || isDigit(char);
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

    //Strings
    //anything wrapped in double or single q " ", ' '
    if (char === '"') {
      let str = '';
      current++; 
      while (current < input.length && input[current] !== '"') {
        str += input[current++];
      }
      current++;
      tokens.push(createToken(TOKEN_TYPES.STRING, str));
      continue;
    }

    //Words
    //Any sequence that starts with a letter
    //This function reads the whole word first then decide what it is.
    if (isAlpha(char)) {
        let word = '';
        while (current < input.length && isAlphaNumeric(input[current])) {
          word += input[current++];       
      }

      //Boolean TRUE/FALSE
      if (word.toUpperCase() === 'TRUE') { tokens.push(createToken(TOKEN_TYPES.BOOLEAN, true)); continue; }
      if (word.toUpperCase() === 'FALSE') { tokens.push(createToken(TOKEN_TYPES.BOOLEAN, false)); continue; }

      // for cell reference
      if (/^[A-Za-z]+[0-9]+$/.test(word)) {
        tokens.push(createToken(TOKEN_TYPES.CELL_REF, word.toUpperCase()));
        continue;
      }

      //Function name
      if (input[current] === '(') {
        tokens.push(createToken(TOKEN_TYPES.FUNCTION, word.toUpperCase()));
        continue;
      }

      //Anything else goes into unknown identifier
      tokens.push(createToken('IDENTIFIER', word));
      continue;
    }

    // Operators
    if (isOperator(char)) {
      tokens.push(createToken(TOKEN_TYPES.OPERATOR, char));
      current++;
      continue;
    }

    if (char === '(') { tokens.push(createToken(TOKEN_TYPES.LPAREN, '(')); current++; continue; }
    if (char === ')') { tokens.push(createToken(TOKEN_TYPES.RPAREN, ')')); current++; continue; }
    if (char === ',') { tokens.push(createToken(TOKEN_TYPES.COMMA, ',')); current++; continue; }
    if (char === ':') { tokens.push(createToken(TOKEN_TYPES.COLON, ':')); current++; continue; }
    //For Unknown characters
    throw new Error(`Tokenizer: unexpected character '${char}' at position ${current}`);
  }

  //Always Close with EOF
  tokens.push(createToken(TOKEN_TYPES.EOF, null));
  return tokens;
}

//EXPORTS
module.exports = {
  TOKEN_TYPES,
  tokenize
};
