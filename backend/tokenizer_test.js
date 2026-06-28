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
let_passed = 0;
let_failed = 0;
let_currentSuite = '';

// This function creates a test suite group. 
// It is similar to the describe() function used in testing frameworks like jest or mocha.
function describe(label, fn) {
    let_currentSuite = label;
    console.log('\n $(label)');
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
        _failed++;
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
  const total = _passed + _failed;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${total} tests  |  ${_passed} passed  |  ${_failed} failed`);
  if (_failed === 0) console.log('  All tests passed ✓');
  console.log('─'.repeat(50));
  if (_failed > 0) process.exit(1);
}

//function for testing helpers
//.........

//function for testing whitespace
//.........

//function for testing equals
//..........

//function for testing numbers
//..........

//function for testing errors and edge cases
//..........

//To be continued

printSummary();


