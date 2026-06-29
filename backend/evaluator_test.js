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

//function for testing negative and unary minus numbers
describe('negative numbers', () => {
  it('evaluates a negative number', () => {
    expect(evaluateFormula('=-8')).toBe(-8);
  });

  it('evaluates a positive sign prefix', () => {
    expect(evaluateFormula('=+8')).toBe(8);
  });

  it('subtracts a negative number', () => {
    expect(evaluateFormula('=5--3')).toBe(8);
  });

  it('multiplies by a negative number', () => {
    expect(evaluateFormula('=A1*-1', { A1: '5' })).toBe(-5);
  });

  it('negates a value in parentheses', () => {
    expect(evaluateFormula('=-(2+3)')).toBe(-5);
  });

  it('negates a cell reference', () => {
    expect(evaluateFormula('=-A1', { A1: '7' })).toBe(-7);
  });
});

//function for testing cell references
describe('cell references', () => {
  it('adds values from two cells', () => {
    expect(evaluateFormula('=A1+B1', { A1: '5', B1: '10' })).toBe(15);
  });

  it('multiplies a cell by a number', () => {
    expect(evaluateFormula('=A1*2', { A1: '5' })).toBe(10);
  });

  it('uses parentheses with cell references', () => {
    expect(evaluateFormula('=(A1+B1)*2', { A1: '5', B1: '10' })).toBe(30);
  });

  it('treats empty or missing cells as 0', () => {
    expect(evaluateFormula('=A1+5', { A1: '' })).toBe(5);
    expect(evaluateFormula('=A1+5', {})).toBe(5);
  });

  it('returns #VALUE! when a cell contains text', () => {
    expect(evaluateFormula('=A1+1', { A1: 'Hello' })).toBe(ERRORS.VALUE);
  });

  it('propagates errors from referenced cells', () => {
    expect(evaluateFormula('=A1+1', { A1: ERRORS.DIV_ZERO })).toBe(ERRORS.DIV_ZERO);
  });
});

//function for testing SUM and AVG ranges
describe('functions and ranges', () => {
  it('sums a vertical range', () => {
    expect(evaluateFormula('=SUM(A1:A3)', { A1: '5', A2: '10', A3: '15' })).toBe(30);
  });

  it('averages a vertical range', () => {
    expect(evaluateFormula('=AVG(A1:A3)', { A1: '5', A2: '10', A3: '15' })).toBe(10);
  });

  it('sums a rectangular range', () => {
    expect(evaluateFormula('=SUM(A1:B2)', { A1: '1', B1: '2', A2: '3', B2: '4' })).toBe(10);
  });

  it('averages a rectangular range', () => {
    expect(evaluateFormula('=AVG(A1:B2)', { A1: '1', B1: '2', A2: '3', B2: '4' })).toBe(2.5);
  });

  it('treats empty cells in a range as 0', () => {
    expect(evaluateFormula('=SUM(A1:A3)', { A1: '5', A3: '15' })).toBe(20);
  });

  it('returns #VALUE! when a range contains text', () => {
    expect(evaluateFormula('=SUM(A1:A2)', { A1: 'Hello', A2: '5' })).toBe(ERRORS.VALUE);
  });

  it('propagates errors from cells inside a range', () => {
    expect(evaluateFormula('=AVG(A1:A2)', { A1: ERRORS.DIV_ZERO, A2: '5' })).toBe(ERRORS.DIV_ZERO);
  });

  it('returns #ERROR! when SUM is given a single cell instead of a range', () => {
    expect(evaluateFormula('=SUM(A1)', { A1: '5' })).toBe(ERRORS.SYNTAX);
  });
});

//function for testing COUNT, MIN and MAX ranges
describe('count, min and max', () => {
  it('counts the cells in a range', () => {
    expect(evaluateFormula('=COUNT(A1:A3)', { A1: '5', A2: '10', A3: '15' })).toBe(3);
  });

  it('counts cells in a rectangular range', () => {
    expect(evaluateFormula('=COUNT(A1:B2)', { A1: '1', B1: '2', A2: '3', B2: '4' })).toBe(4);
  });

  it('finds the smallest value in a range', () => {
    expect(evaluateFormula('=MIN(A1:A3)', { A1: '5', A2: '10', A3: '15' })).toBe(5);
  });

  it('finds the largest value in a range', () => {
    expect(evaluateFormula('=MAX(A1:A3)', { A1: '5', A2: '10', A3: '15' })).toBe(15);
  });

  it('treats empty cells as 0 for MIN', () => {
    expect(evaluateFormula('=MIN(A1:A3)', { A1: '5', A3: '15' })).toBe(0);
  });

  it('propagates errors from cells inside MIN/MAX', () => {
    expect(evaluateFormula('=MAX(A1:A2)', { A1: ERRORS.DIV_ZERO, A2: '5' })).toBe(ERRORS.DIV_ZERO);
  });

  it('returns #VALUE! when a range contains text', () => {
    expect(evaluateFormula('=MAX(A1:A2)', { A1: 'Hello', A2: '5' })).toBe(ERRORS.VALUE);
  });

  it('returns #ERROR! when MIN is given a single cell instead of a range', () => {
    expect(evaluateFormula('=MIN(A1)', { A1: '5' })).toBe(ERRORS.SYNTAX);
  });
});

printSummary();
