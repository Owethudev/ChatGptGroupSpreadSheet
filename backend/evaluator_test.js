/*
  This file tests evaluator.js
  Role: Tests formula evaluation with zero dependencies, vanilla JS only.

  How to run:
   node backend/evaluator_test.js
*/

const { evaluateFormula, ERRORS } = require('./evaluator');

//MICRO TEST RUNNER

let passed = 0;
let failed = 0;
let currentSuite = '';

function describe(label, fn) {
  currentSuite = label;
  console.log(`\n ${label}`);
  fn();
}

function it(label, fn) {
  try {
    fn();
    passed++;
    console.log(`    ✓ ${label}`);
  } catch (err) {
    failed++;
    console.log(`    ✗ ${label}`);
    console.log(`        → ${err.message}`);
  }
}

const expect = (actual) => ({
  toBe(expected) {
    if (actual !== expected)
      throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
});

function printSummary() {
  const total = passed + failed;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${total} tests  |  ${passed} passed  |  ${failed} failed`);
  if (failed === 0) console.log('  All tests passed ✓');
  console.log('─'.repeat(50));
  if (failed > 0) process.exit(1);
}

//function for testing basic arithmetic
describe('basic arithmetic', () => {
  it('adds two numbers', () => {
    expect(evaluateFormula('=1+2')).toBe(3);
  });

  it('subtracts two numbers', () => {
    expect(evaluateFormula('=5-2')).toBe(3);
  });

  it('multiplies two numbers', () => {
    expect(evaluateFormula('=3*4')).toBe(12);
  });

  it('divides two numbers', () => {
    expect(evaluateFormula('=10/2')).toBe(5);
  });
});

//function for testing operator precedence
describe('operator precedence', () => {
  it('multiplies before adding', () => {
    expect(evaluateFormula('=1+2*3')).toBe(7);
  });

  it('divides before subtracting', () => {
    expect(evaluateFormula('=10-8/2')).toBe(6);
  });
});

//function for testing parentheses
describe('parentheses', () => {
  it('groups addition before multiplication', () => {
    expect(evaluateFormula('=(1+2)*3')).toBe(9);
  });

  it('handles nested parentheses', () => {
    expect(evaluateFormula('=((2+3)*2)+1')).toBe(11);
  });
});

//function for testing errors
describe('errors', () => {
  it('returns #DIV/0! for division by zero', () => {
    expect(evaluateFormula('=10/0')).toBe(ERRORS.DIV_ZERO);
  });

  it('returns #ERROR! for incomplete formulas', () => {
    expect(evaluateFormula('=1+')).toBe(ERRORS.SYNTAX);
  });

  it('returns #ERROR! for missing closing parenthesis', () => {
    expect(evaluateFormula('=(1+2')).toBe(ERRORS.SYNTAX);
  });
});

printSummary();
