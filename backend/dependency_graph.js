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
const dependents = {};

// reverse: B1 -> [A1]
const dependencies = {};

// stored values + ASTs
const values = {};
const asts = {};

// errors
const errors = {};

/*
SET CELL Function
*/

function setCell(cell, ast, sheet) {

    asts[cell] = ast;

    // 1. check for circular reference
    if (hasCycle(cell, ast)) {
        errors[cell] = "#CIRCULAR_REF";
        values[cell] = "#ERROR";
        return "#CIRCULAR_REF";
    }

    // 2. remove old links
    removeOldLinks(cell);

    // 3. find new dependencies
    const deps = getDeps(ast);
    dependencies[cell] = deps;

    // 4. build forward links
    for (const d of deps) {

        if (!dependents[d]) {
            dependents[d] = new Set();
        }

        dependents[d].add(cell);
    }

    // 5. calculate value
    values[cell] = safeEval(ast, sheet);

    // 6. update everything that depends on it
    updateDependents(cell, sheet);

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
REMOVE OLD LINKS
*/

function removeOldLinks(cell) {

    const old = dependencies[cell];
    if (!old) return;

    for (const d of old) {
        dependents[d]?.delete(cell);
    }

    delete dependencies[cell];
}

/*
GET DEPENDENCIES FROM AST
*/

function getDeps(node, list = new Set()) {

    if (!node) return list;

    if (node.type === "CellReference") {
        list.add(node.reference);
    }

    if (node.type === "BinaryExpression") {
        getDeps(node.left, list);
        getDeps(node.right, list);
    }

    if (node.type === "FunctionCall") {
        node.arguments.forEach(arg => getDeps(arg, list));
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

function updateDependents(startCell, sheet) {

    const queue = [startCell];
    const visited = new Set();

    while (queue.length > 0) {

        const current = queue.shift();

        const deps = dependents[current];
        if (!deps) continue;

        for (const cell of deps) {

            if (visited.has(cell)) continue;
            visited.add(cell);

            const ast = asts[cell];
            if (!ast) continue;

            const value = safeEval(ast, sheet);

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

function safeEval(ast, sheet) {

    try {
        return evaluate(ast, sheet);
    } catch (e) {
        return "#ERROR";
    }
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