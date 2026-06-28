/*
  Simple Dependency Graph + Recalculation Engine

  What this does:
  - Tracks which cells depend on others
  - Recalculates cells when a source cell changes
  - Detects circular references
  - Uses the current evaluator.js formula engine
*/

const { evaluateFormula, ERRORS, expandRange } = require('./evaluator');
const { tokenize, TOKEN_TYPES } = require('./tokenizer');

// Returns a clean spreadsheet cell address like A1
function normalizeCell(address) {
  return String(address).trim().toUpperCase();
}

// Returns true if a raw cell value is a formula
function isFormula(raw) {
  return typeof raw === 'string' && raw.trim().startsWith('=');
}

// Turns plain cell contents into the displayed/calculated value
function valueFromRaw(raw) {
  if (raw === '' || raw === undefined || raw === null) return 0;
  if (typeof raw === 'number') return raw;

  const str = String(raw).trim();
  if (str === '') return 0;
  if (str.startsWith('#')) return str;
  if (/^-?\d+(\.\d+)?$/.test(str)) return parseFloat(str);

  return str;
}

// Finds all cell references used by a formula
function getDependencies(raw) {
  if (!isFormula(raw)) return [];

  try {
    const tokens = tokenize(raw);
    const refs = new Set();

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type !== TOKEN_TYPES.CELL_REF) continue;

      const next = tokens[i + 1];
      const end = tokens[i + 2];

      if (next?.type === TOKEN_TYPES.COLON && end?.type === TOKEN_TYPES.CELL_REF) {
        const range = expandRange(token.value, end.value);
        if (!String(range).startsWith('#')) {
          range.forEach((cell) => refs.add(normalizeCell(cell)));
        }
        i += 2;
        continue;
      }

      refs.add(normalizeCell(token.value));
    }

    return Array.from(refs);
  } catch (err) {
    return [];
  }
}

function createSpreadsheet(initialCells = {}) {
  const rawValues = {};
  const values = {};
  const dependencies = {};
  const dependents = {};

  Object.keys(initialCells).forEach((address) => {
    rawValues[normalizeCell(address)] = initialCells[address];
  });

  function rebuildGraph() {
    Object.keys(dependencies).forEach((key) => delete dependencies[key]);
    Object.keys(dependents).forEach((key) => delete dependents[key]);

    Object.keys(rawValues).forEach((cell) => {
      const deps = getDependencies(rawValues[cell]);
      dependencies[cell] = deps;

      deps.forEach((dep) => {
        if (!dependents[dep]) dependents[dep] = new Set();
        dependents[dep].add(cell);
      });
    });
  }

  function computeCell(address, visiting = new Set(), cache = new Map()) {
    const cell = normalizeCell(address);

    if (cache.has(cell)) return cache.get(cell);

    if (visiting.has(cell)) {
      visiting.forEach((cycleCell) => {
        values[cycleCell] = ERRORS.CIRCULAR;
        cache.set(cycleCell, ERRORS.CIRCULAR);
      });
      values[cell] = ERRORS.CIRCULAR;
      cache.set(cell, ERRORS.CIRCULAR);
      return ERRORS.CIRCULAR;
    }

    visiting.add(cell);

    const raw = rawValues[cell];
    let result;

    if (isFormula(raw)) {
      const computedCells = new Proxy({}, {
        has() {
          return true;
        },
        get(target, prop) {
          return computeCell(normalizeCell(prop), visiting, cache);
        }
      });

      result = evaluateFormula(raw, computedCells);
    } else {
      result = valueFromRaw(raw);
    }

    visiting.delete(cell);
    values[cell] = result;
    cache.set(cell, result);
    return result;
  }

  function recalculateAll() {
    const cache = new Map();
    Object.keys(values).forEach((key) => delete values[key]);
    Object.keys(rawValues).forEach((cell) => computeCell(cell, new Set(), cache));
    return { ...values };
  }

  function setCell(address, raw) {
    const cell = normalizeCell(address);
    rawValues[cell] = raw;
    rebuildGraph();
    recalculateAll();
    return values[cell];
  }

  function getCell(address) {
    const cell = normalizeCell(address);

    if (!(cell in values) && cell in rawValues) {
      computeCell(cell);
    }

    return values[cell] ?? 0;
  }

  function getRawCell(address) {
    return rawValues[normalizeCell(address)] ?? '';
  }

  function getCellDependencies(address) {
    return dependencies[normalizeCell(address)] ?? [];
  }

  function getCellDependents(address) {
    return Array.from(dependents[normalizeCell(address)] ?? []);
  }

  function getRecalculationOrder(address) {
    const start = normalizeCell(address);
    const order = [];
    const visited = new Set();
    const queue = [start];

    while (queue.length > 0) {
      const current = queue.shift();
      const nextCells = dependents[current] ?? new Set();

      nextCells.forEach((cell) => {
        if (visited.has(cell)) return;
        visited.add(cell);
        order.push(cell);
        queue.push(cell);
      });
    }

    return order;
  }

  rebuildGraph();
  recalculateAll();

  return {
    setCell,
    getCell,
    getRawCell,
    getDependencies: getCellDependencies,
    getDependents: getCellDependents,
    getRecalculationOrder,
    recalculateAll
  };
}

module.exports = {
  createSpreadsheet,
  getDependencies
};
