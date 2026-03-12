---
name: processing-spreadsheets
description: 'Read, create, and modify Excel (.xlsx/.csv) spreadsheets using Node.js. Parses existing workbooks, generates new spreadsheets with formatting and formulas, modifies cells and sheets in-place. Triggers: Excel, xlsx, spreadsheet, csv, read Excel, create spreadsheet, modify workbook, export to Excel, parse spreadsheet, pivot table, cell formatting, Excel formula.'
argument-hint: 'Provide file path and operation: read, create, or modify'
---

# Processing Spreadsheets

Read, create, and modify `.xlsx` and `.csv` files via Node.js scripts executed in the terminal.

## Packages

| Package | Purpose | Install |
|---|---|---|
| `exceljs` | Full read/write/modify .xlsx with formatting | `npm install exceljs` |
| `csv-parse` + `csv-stringify` | Stream-based CSV read/write | `npm install csv-parse csv-stringify` |

**Default**: Use `exceljs` — it handles both .xlsx and .csv and supports in-place modification.

## Flow

### 1. Reading a Spreadsheet

```javascript
import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(inputPath);

// Iterate sheets
workbook.eachSheet((sheet, sheetId) => {
  console.log(`Sheet: ${sheet.name} (${sheet.rowCount} rows)`);
  sheet.eachRow((row, rowNum) => {
    console.log(`Row ${rowNum}:`, row.values); // values[0] is undefined (1-indexed)
  });
});

// Access specific cell
const sheet = workbook.getWorksheet('Sheet1'); // by name or index
const val = sheet.getCell('B3').value;

// Read as CSV
await workbook.csv.readFile(inputCsvPath);
```

Cell value types: `string`, `number`, `Date`, `{ formula, result }`, `{ richText }`, `{ hyperlink, text }`.

### 2. Creating a Spreadsheet

```javascript
import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
workbook.creator = 'Author';
workbook.created = new Date();

const sheet = workbook.addWorksheet('Report', {
  properties: { defaultColWidth: 15 },
  pageSetup: { orientation: 'landscape' },
});

// Define columns
sheet.columns = [
  { header: 'Name', key: 'name', width: 25 },
  { header: 'Value', key: 'value', width: 15 },
  { header: 'Date', key: 'date', width: 18 },
];

// Add rows
sheet.addRow({ name: 'Item A', value: 100, date: new Date() });
sheet.addRow({ name: 'Item B', value: 250, date: new Date() });
sheet.addRows([  // bulk
  { name: 'Item C', value: 75, date: new Date() },
  { name: 'Item D', value: 320, date: new Date() },
]);

// Formulas
sheet.getCell('B6').value = { formula: 'SUM(B2:B5)', result: 745 };

// Header styling
sheet.getRow(1).eachCell(cell => {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } };
  cell.alignment = { horizontal: 'center' };
  cell.border = {
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
  };
});

// Conditional formatting
sheet.addConditionalFormatting({
  ref: 'B2:B5',
  rules: [{
    type: 'cellIs', operator: 'greaterThan', formulae: [200],
    style: { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00AA00' } } },
  }],
});

// Auto-filter
sheet.autoFilter = 'A1:C1';

// Freeze header row
sheet.views = [{ state: 'frozen', ySplit: 1 }];

await workbook.xlsx.writeFile(outputPath);
// Or CSV: await workbook.csv.writeFile(outputCsvPath);
```

### 3. Modifying an Existing Spreadsheet

`exceljs` supports true in-place modification:

```javascript
import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(existingPath);

const sheet = workbook.getWorksheet('Sheet1');

// Update cells
sheet.getCell('A1').value = 'Updated Title';
sheet.getCell('B10').value = { formula: 'SUM(B2:B9)' };

// Add new rows at the end
sheet.addRow({ name: 'New Entry', value: 999 });

// Add a new sheet
const newSheet = workbook.addWorksheet('Summary');
newSheet.addRow(['Total', { formula: "'Sheet1'!B10" }]);

// Delete a sheet
workbook.removeWorksheet(workbook.getWorksheet('OldSheet')?.id);

// Save (overwrite or new path)
await workbook.xlsx.writeFile(outputPath);
```

### 4. CSV Operations

For simple CSV without Excel formatting:

```javascript
import ExcelJS from 'exceljs';

// Read CSV
const workbook = new ExcelJS.Workbook();
const sheet = await workbook.csv.readFile(inputCsvPath, {
  parserOptions: { delimiter: ',', quote: '"' },
});

// Write CSV
await workbook.csv.writeFile(outputCsvPath);

// Convert CSV → XLSX
const wb = new ExcelJS.Workbook();
await wb.csv.readFile('data.csv');
await wb.xlsx.writeFile('data.xlsx');
```

## Formatting Reference

```javascript
// Font
cell.font = { name: 'Calibri', size: 12, bold: true, italic: true, color: { argb: 'FFFF0000' } };

// Fill
cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

// Alignment
cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

// Number format
cell.numFmt = '$#,##0.00';     // currency
cell.numFmt = '0.00%';         // percentage
cell.numFmt = 'yyyy-mm-dd';    // date

// Merge cells
sheet.mergeCells('A1:D1');

// Column width / row height
sheet.getColumn('A').width = 30;
sheet.getRow(1).height = 25;
```

Colors use **ARGB** format: `'FF003366'` (FF = full opacity + hex color).

## Validation

1. Output file exists and size > 0 bytes
2. For reads: verify row count matches expectations
3. For formulas: note that `result` is cached — Excel recalculates on open
4. Report output path, sheet count, and row count to user

## Gotchas

- Cell indices are **1-based**: `getCell('A1')` or `getCell(1, 1)`
- `row.values` array is 1-indexed — `values[0]` is always `undefined`
- Formula results are cached values — they update when the file is opened in Excel
- ARGB colors need the alpha prefix: `'FF003366'` not `'003366'`
- Streaming API (`workbook.xlsx.createInputStream()`) exists for very large files (100k+ rows)
- `.xls` (legacy format) is NOT supported — only `.xlsx` and `.csv`
