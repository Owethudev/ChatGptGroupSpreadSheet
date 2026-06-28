/*
  This file tests dependency_graph.js
  Role: Tests recalculation order and circular reference detection.

  How to run:
   node backend/dependency_graph_test.js
*/

const { createSpreadsheet, getDependencies } = require('./dependency_graph');
const { ERRORS } = require('./evaluator');

//MICRO TEST RUNNER

let passed = 0;
let failed = 0;

function describe(label, fn) {
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
  },

  toEqual(expected) {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b)
      throw new Error(`expected ${b}, got ${a}`);
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

//function for testing dependency extraction
describe('dependency extraction', () => {
  it('finds cell references in a formula', () => {
    expect(getDependencies('=A1+B1')).toEqual(['A1', 'B1']);
  });

  it('expands range dependencies', () => {
    expect(getDependencies('=SUM(A1:A3)')).toEqual(['A1', 'A2', 'A3']);
  });
});

//function for testing recalculation
describe('recalculation', () => {
  it('updates a direct dependent cell when a source cell changes', () => {
    const sheet = createSpreadsheet();

    sheet.setCell('A1', '5');
    sheet.setCell('B1', '=A1+1');
    expect(sheet.getCell('B1')).toBe(6);

    sheet.setCell('A1', '10');
    expect(sheet.getCell('B1')).toBe(11);
  });

  it('updates a chained dependent cell in the correct order', () => {
    const sheet = createSpreadsheet();

    sheet.setCell('A1', '5');
    sheet.setCell('B1', '=A1+1');
    sheet.setCell('C1', '=B1+1');

    expect(sheet.getCell('C1')).toBe(7);

    sheet.setCell('A1', '20');

    expect(sheet.getCell('B1')).toBe(21);
    expect(sheet.getCell('C1')).toBe(22);
  });

  it('recalculates SUM ranges when a source cell changes', () => {
    const sheet = createSpreadsheet({
      A1: '1',
      A2: '2',
      A3: '3',
      B1: '=SUM(A1:A3)'
    });

    expect(sheet.getCell('B1')).toBe(6);

    sheet.setCell('A2', '10');

    expect(sheet.getCell('B1')).toBe(14);
  });

  it('returns dependent cells in recalculation order', () => {
    const sheet = createSpreadsheet({
      A1: '5',
      B1: '=A1+1',
      C1: '=B1+1'
    });

    expect(sheet.getRecalculationOrder('A1')).toEqual(['B1', 'C1']);
  });
});

//function for testing circular references
describe('circular references', () => {
  it('detects a direct circular reference', () => {
    const sheet = createSpreadsheet();

    sheet.setCell('A1', '=A1');

    expect(sheet.getCell('A1')).toBe(ERRORS.CIRCULAR);
  });

  it('detects an indirect circular reference', () => {
    const sheet = createSpreadsheet();

    sheet.setCell('A1', '=B1+1');
    sheet.setCell('B1', '=A1+1');

    expect(sheet.getCell('A1')).toBe(ERRORS.CIRCULAR);
    expect(sheet.getCell('B1')).toBe(ERRORS.CIRCULAR);
  });
});

printSummary();
