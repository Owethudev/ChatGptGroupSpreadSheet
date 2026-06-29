/*
Simple Dependency Graph + Recalculation Engine

What this does:
- Tracks which cells depend on others
- Recalculates only affected cells
- Detects circular references
- Propagates errors

*/

const { evaluateFormula, ERRORS } = require("./evaluator");
const { tokenize, TOKEN_TYPES }   = require('./tokenizer');



const dependentsMap = {};
const dependenciesMap = {};
const values = {};
const formulas = {};
const errors = {};

/* HELPERS
Returns true when value is a spreadsheet error string.
*/
function isError(value) {
    return typeof value === 'string' && value.startsWith('#');
}

/*
SET CELL
*/

function setCell(cell, formula) {
    formula = (formula !== undefined && formula !== null)
        ? String(formula).trim()
        : '';

    // ── Empty input → clear this cell ───────────────────────────────────
    if (!formula) {
        removeDependencies(cell);
        delete formulas[cell];
        delete values[cell];
        delete errors[cell];
        propagate(cell);       // notify dependents the value is now 0
        return '';
    }
    formulas[cell] = formula;
    
        // ── 1. Circular-reference check ──────────────────────────────────────
        //    Only formulas can reference other cells, so only check those.
        if (formula.startsWith('=') && detectCycle(cell, formula)) {
            errors[cell] = ERRORS.CIRCULAR;
            values[cell] = ERRORS.CIRCULAR;
            return ERRORS.CIRCULAR;
        }
    // ── 2. Remove stale dependency links from the old formula ────────────
    removeDependencies(cell);

    // ── 3. Extract new dependencies using the tokenizer ──────────────────
    const deps = extractDependencies(formula);
    dependenciesMap[cell] = deps;

    // ── 4. Build forward links so each dependency knows this cell needs it
    for (const d of deps) {
        if (!dependentsMap[d]) dependentsMap[d] = new Set();
        dependentsMap[d].add(cell);
    }

    // ── 5. Compute this cell's value ─────────────────────────────────────
    const result = safeEvaluate(formula);
    values[cell] = result;

    if (isError(result)) {
        errors[cell] = result;
    } else {
        delete errors[cell];
    }

    // ── 6. Propagate the change to every cell that depends on this one ───
    propagate(cell);

    return values[cell];
}

/*
GET CELL VALUE
*/

function getCell(cell) {

    if (errors[cell]) return errors[cell];

    return values[cell] !== undefined ? values[cell] : 0;
}

/*
REMOVE OLD DEPENDENCIES
*/

function removeDependencies(cell) {

    const old = dependenciesMap[cell];
    if (!old) return;

    for (const d of old) {
        if (dependentsMap[d]) dependentsMap[d].delete(cell);
    }

    delete dependenciesMap[cell];
}

/*
GET DEPENDENCIES FROM Formular String
 Uses the tokenizer so we never have to parse the grammar manually.
   Handles both single references (=A1+B2) and ranges (=SUM(A1:A5)).

   Token stream example for "=SUM(A1:A5) + B1":
     EQUALS  FUNCTION(SUM)  LPAREN  CELL_REF(A1)  COLON  CELL_REF(A5)  RPAREN
     OPERATOR(+)  CELL_REF(B1)  EOF

   We iterate the flat token list:
   - CELL_REF followed by COLON + CELL_REF  →  expand the range
   - standalone CELL_REF                    →  add it directly
*/
function extractDependencies(formula) {
    const list = new Set();

    // Plain values (not formulas) have no cell dependencies.
    if (!formula || !formula.startsWith('=')) return list;

    try {
        const tokens = tokenize(formula);

        for (let i = 0; i < tokens.length; i++) {
            const tok = tokens[i];

            if (tok.type === TOKEN_TYPES.CELL_REF) {
                const isRange =
                    tokens[i + 1] && tokens[i + 1].type === TOKEN_TYPES.COLON &&
                    tokens[i + 2] && tokens[i + 2].type === TOKEN_TYPES.CELL_REF;

                if (isRange) {
                    // Expand A1:B5 → every cell address in that rectangle
                    expandRange(tok.value, tokens[i + 2].value)
                        .forEach(c => list.add(c));
                    i += 2;  // skip past the COLON and end CELL_REF
                } else {
                    list.add(tok.value);
                }
            }
        }
    } catch (_) {
        // If the tokenizer throws (bad formula), treat as no dependencies.
    }

    return list;
}

/*
RECALCULATION
Starts at the cell that just changed, then fans out level by level
through dependentsMap until every affected cell is re-evaluated.
*/

function propagate(startCell) {
    const queue = [startCell];
    const visited = new Set();

    while (queue.length > 0) {
        const current = queue.shift();
        const deps = dependentsMap[current];
        if (!deps) continue;

        for (const cell of deps) {
            if (visited.has(cell)) continue;
            visited.add(cell);

            const formula = formulas[cell];
            if (formula === undefined) continue;

            const value = safeEvaluate(formula);
            values[cell] = value;

            if (isError(value)) {
                errors[cell] = value;
            } else {
                delete errors[cell];
            }

            queue.push(cell);
        }
    }
}
/*
SAFE EVALUATION
*/

function safeEvaluate(formula) {
    if (!formula) return '';
    
        if (formula.startsWith('=')) {
            try {
                return evaluateFormula(formula, values);
            } catch (err) {
                return ERRORS.SYNTAX;
            }
        }
    
        // Plain number?
        const num = Number(formula);
        if (!isNaN(num) && formula.trim() !== '') return num;
    
        // Plain text
        return formula;
}
/*
CYCLE DETECTION
*/
function detectCycle(startCell, formula) {
    const deps = extractDependencies(formula);
    const visited = new Set();
    const stack = new Set();

    function dfs(current) {
        if (current === startCell) return true;
        if (visited.has(current)) return false;
        if (stack.has(current)) return false;

        stack.add(current);

        const next = dependenciesMap[current];
        if (next) {
            for (const dep of next) {
                if (dfs(dep)) {
                    return true;
                }
            }
        }

        stack.delete(current);
        visited.add(current);
        return false;
    }

    for (const dep of deps) {
        if (dfs(dep)) {
            return true;
        }
    }

    return false;
}

/*
RANGE HELPERS
*/

function expandRange(start, end) {
    const cells = [];
    const startCol = getCol(start);
    const startRow = getRow(start);
    const endCol = getCol(end);
    const endRow = getRow(end);

    for (let c = colToNum(startCol); c <= colToNum(endCol); c++) {
        for (let r = startRow; r <= endRow; r++) {
            cells.push(numToCol(c) + r);
        }
    }

    return cells;
}

function getCol(cell) {
    return cell.match(/[A-Z]+/)[0];
}

function getRow(cell) {
    return Number(cell.match(/\d+/)[0]);
}

function colToNum(col) {
    let num = 0;

    for (const c of col) {
        num = num * 26 + (c.charCodeAt(0) - 64);
    }
    return num;
}

function numToCol(num) {
    let col = "";
    while (num > 0) {
        const r = (num - 1) % 26;
        col = String.fromCharCode(65 + r) + col;
        num = Math.floor((num - 1) / 26);
    }
 return col;
}
/* RESET
Wipes all module state.  Useful for test isolation.
const { setCell, getCell, reset } = require('./dependency_graph');
    beforeEach(() => reset());
*/
function reset() {
    for (const k of Object.keys(dependentsMap))   delete dependentsMap[k];
    for (const k of Object.keys(dependenciesMap)) delete dependenciesMap[k];
    for (const k of Object.keys(formulas))        delete formulas[k];
    for (const k of Object.keys(values))          delete values[k];
    for (const k of Object.keys(errors))          delete errors[k];
}

/*
EXPORTS
*/

module.exports = {
    setCell,
    getCell,
    reset
};