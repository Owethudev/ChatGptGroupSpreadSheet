/*
  This file connects the grid UI to the formula engine.
  Role: reads cell input, evaluates formulas, shows results, and recalculates.

  It relies on tokenizer.js and evaluator.js being loaded first as browser globals.
*/

// Single place for settings, as required by the brief.
const CONFIG = {
  COLUMNS: 10,
  ROWS: 20,
  ERRORS: {
    CIRCULAR: '#CIRCULAR!',
    DIV_ZERO: '#DIV/0!',
    VALUE: '#VALUE!',
    SYNTAX: '#ERROR!'
  }
};

// rawValues holds exactly what the user typed, keyed by address (A1, B2, ...)
const rawValues = {};

// The address of the currently selected cell, e.g. "A1"
let selectedAddress = null;

// Returns true if a value is a spreadsheet error string
function isErrorValue(value) {
  return typeof value === 'string' && value.startsWith('#');
}

// Returns true if raw cell contents are a formula
function isFormula(raw) {
  return typeof raw === 'string' && raw.trim().startsWith('=');
}

// Turns plain (non-formula) contents into a number, error, or text
function toPlainValue(raw) {
  if (raw === undefined || raw === null || raw === '') return 0;

  const str = String(raw).trim();
  if (str === '') return 0;
  if (isErrorValue(str)) return str;
  if (/^-?\d+(\.\d+)?$/.test(str)) return parseFloat(str);

  return str;
}

// Computes one cell's value, following references and catching cycles
function computeCell(address, visiting, cache) {
  const addr = address.toUpperCase();

  if (cache.has(addr)) return cache.get(addr);

  const raw = rawValues[addr];

  if (!isFormula(raw)) {
    const value = toPlainValue(raw);
    cache.set(addr, value);
    return value;
  }

  if (visiting.has(addr)) {
    return CONFIG.ERRORS.CIRCULAR;
  }

  visiting.add(addr);

  // The evaluator asks this proxy for any cell value it needs.
  const cellLookup = new Proxy({}, {
    has() {
      return true;
    },
    get(target, prop) {
      return computeCell(String(prop), visiting, cache);
    }
  });

  const result = window.evaluateFormula(raw, cellLookup);

  visiting.delete(addr);
  cache.set(addr, result);
  return result;
}

// Recomputes every known cell and returns a map of address -> value
function recalculateAll() {
  const cache = new Map();

  Object.keys(rawValues).forEach((addr) => {
    computeCell(addr, new Set(), cache);
  });

  return cache;
}

// Writes the computed value into a cell, with the right styling
function paintCell(td, value, raw) {
  const editor = td.querySelector('.cell-editor');
  if (!editor) return;

  td.classList.remove('is-number', 'is-text', 'is-error');

  if (raw === undefined || raw === '') {
    editor.textContent = '';
    return;
  }

  if (isErrorValue(value)) {
    editor.textContent = value;
    td.classList.add('is-error');
    return;
  }

  if (typeof value === 'number') {
    editor.textContent = String(value);
    td.classList.add('is-number');
    return;
  }

  editor.textContent = String(value);
  td.classList.add('is-text');
}

// Redraws every cell except the one currently being edited
function renderAll(skipAddress) {
  const cache = recalculateAll();
  const cells = document.querySelectorAll('.cell');

  cells.forEach((td) => {
    const addr = td.dataset.address;
    if (!addr || addr === skipAddress) return;

    const raw = rawValues[addr];
    const value = cache.has(addr) ? cache.get(addr) : toPlainValue(raw);
    paintCell(td, value, raw);
  });
}

// Saves raw input without repainting the cell currently being edited
function saveRawValue(address, text) {
  const addr = address.toUpperCase();
  const value = text.trim();

  if (value === '') {
    delete rawValues[addr];
  } else {
    rawValues[addr] = value;
  }
}

// Saves what the user typed into a cell and refreshes the grid
function commitCell(address, text) {
  saveRawValue(address, text);
  renderAll();
}

// Wires up all the grid cells and the formula bar
function init() {
  const formulaBar = document.getElementById('formula-bar');
  const cells = document.querySelectorAll('.cell');

  cells.forEach((td) => {
    const addr = td.dataset.address;
    const editor = td.querySelector('.cell-editor');
    if (!addr || !editor) return;

    // Select a cell: show its raw contents for editing and in the formula bar
    editor.addEventListener('focus', () => {
      selectedAddress = addr;
      td.classList.add('selected');

      const raw = rawValues[addr] ?? '';
      editor.textContent = raw;
      if (formulaBar) formulaBar.value = raw;
    });

    // Leaving a cell commits its contents
    editor.addEventListener('blur', () => {
      td.classList.remove('selected');
      commitCell(addr, editor.textContent);
    });

    // While typing in a cell, keep the formula bar in sync
    editor.addEventListener('input', () => {
      saveRawValue(addr, editor.textContent);

      if (formulaBar && selectedAddress === addr) {
        formulaBar.value = editor.textContent;
      }

      renderAll(addr);
    });

    // Enter commits the cell instead of adding a newline
    editor.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        editor.blur();
      }
    });
  });

  // Editing in the formula bar updates the selected cell
  if (formulaBar) {
    formulaBar.addEventListener('input', () => {
      if (!selectedAddress) return;

      const td = document.querySelector(`.cell[data-address="${selectedAddress}"]`);
      const editor = td?.querySelector('.cell-editor');
      if (editor) editor.textContent = formulaBar.value;

      saveRawValue(selectedAddress, formulaBar.value);
      renderAll(selectedAddress);
    });

    formulaBar.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || !selectedAddress) return;
      event.preventDefault();
      commitCell(selectedAddress, formulaBar.value);
    });
  }

  renderAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
