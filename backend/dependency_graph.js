/*
Simple Dependency Graph + Recalculation Engine

What this does:
- Tracks which cells depend on others
- Recalculates only affected cells
- Detects circular references
- Propagates errors

*/

const { evaluate } = require("./evaluationEngine");

// forward: A1 -> [B1, C1]
const dependentsMap = {};

// reverse: B1 -> [A1]
const dependenciesMap = {};

// stored values + ASTs
const values = {};
const asts = {};

// errors
const errors = {};

/*
SET CELL
*/

function setCell(cell, ast, sheet) {

    asts[cell] = ast;

    // 1. check for circular reference
    if (detectCycle(cell, ast)) {
        errors[cell] = "#CIRCULAR_REF";
        values[cell] = "#ERROR";
        return "#CIRCULAR_REF";
    }

    // 2. remove old dependencies
    removeDependencies(cell);

    // 3. find new dependencies from AST
    const deps = extractDependencies(ast);
    dependenciesMap[cell] = deps;

    // 4. build forward links
    for (const d of deps) {

        if (!dependentsMap[d]) {
            dependentsMap[d] = new Set();
        }

        dependentsMap[d].add(cell);
    }

    // 5. calculate value
    values[cell] = safeEvaluate(ast, sheet);

    // 6. propagate updates to dependents
    propagate(cell, sheet);

    return values[cell];
}

/*
GET CELL VALUE
*/

function getCell(cell) {

    if (errors[cell]) return errors[cell];

    return values[cell] ?? 0;
}

/*
REMOVE OLD DEPENDENCIES
*/

function removeDependencies(cell) {

    const old = dependenciesMap[cell];
    if (!old) return;

    for (const d of old) {
        dependentsMap[d]?.delete(cell);
    }

    delete dependenciesMap[cell];
}

/*
GET DEPENDENCIES FROM AST
*/

function extractDependencies(node, list = new Set()) {

    if (!node) return list;

    if (node.type === "CellReference") {
        list.add(node.reference);
    }

    if (node.type === "BinaryExpression") {
        extractDependencies(node.left, list);
        extractDependencies(node.right, list);
    }

    if (node.type === "FunctionCall") {
        node.arguments.forEach(arg => extractDependencies(arg, list));
    }

    if (node.type === "Range") {
        expandRange(node.start, node.end)
            .forEach(c => list.add(c));
    }

    return list;
}

/*
RECALCULATION
*/

function propagate(startCell, sheet) {

    const queue = [startCell];
    const visited = new Set();

    while (queue.length > 0) {

        const current = queue.shift();

        const deps = dependentsMap[current];
        if (!deps) continue;

        for (const cell of deps) {

            if (visited.has(cell)) continue;
            visited.add(cell);

            const ast = asts[cell];
            if (!ast) continue;

            const value = safeEvaluate(ast, sheet);

            values[cell] = value;

            if (value === "#ERROR") {
                errors[cell] = "#ERROR";
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

function safeEvaluate(ast, sheet) {

    try {
        return evaluate(ast, sheet);
    } catch (err) {
        return "#ERROR";
    }
}
/*
CYCLE DETECTION
*/
function detectCycle(startCell, ast) {

    const deps = extractDependencies(ast);
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

/*
EXPORTS
*/

module.exports = {
    setCell,
    getCell
};