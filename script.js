/* get the table body element where I will add all the grid rows */
const gridBody = document.getElementById('grid-body');

/* create an array of column letters so I can label each column from A to J */
const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/* loop through each row number from 1 to 20 to create all my rows */
for (let row = 1; row <= 20; row += 1) {
  /* create a new table row element for this row */
  const tr = document.createElement('tr');

  /* create a header cell for the row number on the left side */
  const header = document.createElement('th');
  header.className = 'row-header';
  header.textContent = row;
  tr.appendChild(header);

  /* loop through each column to create cells in this row */
  for (let col = 0; col < columns.length; col += 1) {
    /* create a new table cell element */
    const td = document.createElement('td');

    /* create a div inside the cell that users can type into */
    const cell = document.createElement('div');
    cell.contentEditable = 'true';

    /* set a data attribute so I can track each cell's location like A1, B2, etc */
    cell.dataset.address = `${columns[col]}${row}`;

    /* put the editable div inside the cell */
    td.appendChild(cell);

    /* put the cell into the row */
    tr.appendChild(td);
  }

  /* add the completed row to the table body */
  gridBody.appendChild(tr);
}
