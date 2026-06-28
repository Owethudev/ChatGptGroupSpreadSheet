/* 
  This file test the tokenizer.js 
  Role: Tests for tokenizer.js zero dependencies, vanilla JS only.

  How to run: 
   node tokenizer.test.js

*/

//This connects to the tokenizer.js file
const { tokenize, TOKEN_TYPES } = require('./tokenizer')

//MICRO TEST RUNNER

//initializing the tests
let passed = 0;
let failed = 0;
let currentSuite = '';

// This function creates a test suite group. 
// It is similar to the describe() function used in testing frameworks like jest or mocha.
function describe(label, fn) {
    currentSuite = label;
    console.log(`\n ${label}`);
    fn();
}

/* This function does this 
1.Run a test 
2. Check if it passes
3.Count the result 
4.Print the result
e.g   20 tests  |  19 passed  |  1 failed
*/
function it(label, fn) {
    try {
        fn();
        passed++;
        console.log(`    ✓ ${label}`);
    }catch (err) {
        failed++;
        console.log(`    ✗ ${label}`);
        console.log(`        → ${err.message}`);
    }
}

// Assertion helpers to throw a clear message when tests fail.
const expect = (actual) => ({
 
  toBe(expected) {
    if (actual !== expected)
      throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  },
 
  toEqual(expected) {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b)
      throw new Error(`expected ${b}, got ${a}`);
  },
 
  toBeNull() {
    if (actual !== null)
      throw new Error(`expected null, got ${JSON.stringify(actual)}`);
  },
 
  toBeTruthy() {
    if (!actual)
      throw new Error(`expected truthy value, got ${JSON.stringify(actual)}`);
  },
 
  toBeArray() {
    if (!Array.isArray(actual))
      throw new Error(`expected an Array, got ${typeof actual}`);
  },
 
  toContain(item) {
    if (!actual.includes(item))
      throw new Error(`expected array to contain ${JSON.stringify(item)}`);
  },
 
  toThrow() {
    if (typeof actual !== 'function')
      throw new Error('toThrow() requires expect(fn) where fn is a function');
    try {
      actual();
      throw new Error('expected function to throw but it did not');
    } catch (err) {
      if (err.message === 'expected function to throw but it did not') throw err;
    }
  },
 
  notToThrow() {
    if (typeof actual !== 'function')
      throw new Error('notToThrow() requires expect(fn) where fn is a function');
    try {
      actual();
    } catch (err) {
      throw new Error(`expected function not to throw, but it threw: ${err.message}`);
    }
  },
 
});

//function to print final summary
function printSummary() {
  const total = passed + failed;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${total} tests  |  ${passed} passed  |  ${failed} failed`);
  if (failed === 0) console.log('  All tests passed ✓');
  console.log('─'.repeat(50));
  if (failed > 0) process.exit(1);
}

//function for testing helpers
//checks the token types vocabulary exists
describe('helpers / token types', () => {
  it('has the core token types defined', () => {
    expect(TOKEN_TYPES.EQUALS).toBe('EQUALS');
    expect(TOKEN_TYPES.NUMBER).toBe('NUMBER');
    expect(TOKEN_TYPES.CELL_REF).toBe('CELL_REF');
    expect(TOKEN_TYPES.OPERATOR).toBe('OPERATOR');
    expect(TOKEN_TYPES.COLON).toBe('COLON');
    expect(TOKEN_TYPES.EOF).toBe('EOF');
  });

  it('always returns an array ending with EOF', () => {
    const tokens = tokenize('=1');
    expect(tokens).toBeArray();
    expect(tokens[tokens.length - 1].type).toBe('EOF');
  });
});

//function for testing whitespace
//spaces and tabs are skipped, not turned into tokens
describe('whitespace', () => {
  it('ignores spaces around operators', () => {
    const tokens = tokenize('=A1 + B2');
    expect(tokens[0].type).toBe('EQUALS');
    expect(tokens[1].type).toBe('CELL_REF');
    expect(tokens[2].type).toBe('OPERATOR');
    expect(tokens[3].type).toBe('CELL_REF');
  });
});

//function for testing equals
//the leading = becomes a single EQUALS token
describe('equals', () => {
  it('reads the leading = as EQUALS', () => {
    const tokens = tokenize('=1');
    expect(tokens[0].type).toBe('EQUALS');
    expect(tokens[0].value).toBe('=');
  });
});

//function for testing numbers
//whole numbers and decimals become NUMBER tokens
describe('numbers', () => {
  it('reads a whole number', () => {
    const tokens = tokenize('=42');
    expect(tokens[1].type).toBe('NUMBER');
    expect(tokens[1].value).toBe(42);
  });

  it('reads a decimal number', () => {
    const tokens = tokenize('=3.14');
    expect(tokens[1].type).toBe('NUMBER');
    expect(tokens[1].value).toBe(3.14);
  });
});

//function for testing cell references, operators and parentheses
describe('references, operators and parentheses', () => {
  it('reads a cell reference in upper case', () => {
    const tokens = tokenize('=a1');
    expect(tokens[1].type).toBe('CELL_REF');
    expect(tokens[1].value).toBe('A1');
  });

  it('reads + - * / as operators', () => {
    const tokens = tokenize('=1+2-3*4/5');
    expect(tokens[2].type).toBe('OPERATOR');
    expect(tokens[2].value).toBe('+');
    expect(tokens[4].value).toBe('-');
    expect(tokens[6].value).toBe('*');
    expect(tokens[8].value).toBe('/');
  });

  it('reads parentheses', () => {
    const tokens = tokenize('=(1+2)');
    expect(tokens[1].type).toBe('LPAREN');
    expect(tokens[5].type).toBe('RPAREN');
  });
});

//function for testing functions and ranges
describe('functions and ranges', () => {
  it('reads SUM with a range', () => {
    const tokens = tokenize('=SUM(A1:A5)');
    expect(tokens[1].type).toBe('FUNCTION');
    expect(tokens[1].value).toBe('SUM');
    expect(tokens[2].type).toBe('LPAREN');
    expect(tokens[3].type).toBe('CELL_REF');
    expect(tokens[4].type).toBe('COLON');
    expect(tokens[5].type).toBe('CELL_REF');
    expect(tokens[6].type).toBe('RPAREN');
  });

  it('reads AVG with a range', () => {
    const tokens = tokenize('=AVG(A1:B5)');
    expect(tokens[1].value).toBe('AVG');
    expect(tokens[4].type).toBe('COLON');
  });
});

//function for testing errors and edge cases
//unknown characters must throw instead of being skipped
describe('errors and edge cases', () => {
  it('throws on an unexpected character', () => {
    expect(() => tokenize('=1#2')).toThrow();
  });

  it('does not throw on a valid formula', () => {
    expect(() => tokenize('=A1+B2*(C1-2)')).notToThrow();
  });
});

//To be continued

printSummary();


