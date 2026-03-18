---
name: processing-word-documents
description: 'Read, create, and modify Word (.docx) documents using Node.js. Extracts text and HTML from existing documents, generates new documents with rich formatting, and fills templates with dynamic data. Triggers: Word document, docx, read Word file, create Word document, modify docx, generate report, document template, extract text from Word, write docx.'
argument-hint: 'Provide file path and operation: read, create, or modify'
---

# Processing Word Documents

Read, create, and modify `.docx` files via Node.js scripts executed in the terminal.

**Output directory**: Save generated `.docx` files to `.copilot/docs/` (see `shared-patterns.instructions.md` § Artifact Output Directory). Create the directory with `mkdirSync` before writing.

## Packages

| Package | Purpose | Install |
|---|---|---|
| `mammoth` | Read .docx → plain text or HTML | `npm install mammoth` |
| `docx` | Create new .docx programmatically | `npm install docx` |
| `docxtemplater` + `pizzip` | Fill templates in existing .docx | `npm install docxtemplater pizzip` |

Install only the packages needed for the requested operation. Use `npx` or a temporary script.

## Flow

### 1. Reading a Word Document

Extract text or HTML from an existing `.docx`:

```javascript
import mammoth from 'mammoth';

// Plain text extraction
const { value: text } = await mammoth.extractRawText({ path: inputPath });

// HTML extraction (preserves basic structure)
const { value: html } = await mammoth.convertToHtml({ path: inputPath });
```

- `extractRawText` strips all formatting — best for content analysis
- `convertToHtml` preserves headings, lists, tables, bold/italic
- Access `result.messages` for conversion warnings

### 2. Creating a Word Document

Build a new `.docx` with the `docx` package:

```javascript
import { Document, Packer, Paragraph, TextRun, HeadingLevel,
         Table, TableRow, TableCell, WidthType, ImageRun,
         AlignmentType, BorderStyle } from 'docx';
import { writeFileSync, readFileSync } from 'fs';

const doc = new Document({
  sections: [{
    properties: {},  // page size, margins, orientation
    children: [
      new Paragraph({ text: "Title", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({
        children: [
          new TextRun({ text: "Bold", bold: true }),
          new TextRun(" normal "),
          new TextRun({ text: "italic", italics: true }),
        ],
      }),
      // Tables
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Cell 1")] }),
              new TableCell({ children: [new Paragraph("Cell 2")] }),
            ],
          }),
        ],
      }),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(outputPath, buffer);
```

Key building blocks: `Paragraph`, `TextRun`, `Table`, `TableRow`, `TableCell`, `ImageRun` (for images from buffer), `Header`, `Footer`, `PageBreak`, `NumberedList`, `BulletList`.

### 3. Modifying an Existing Document (Template Fill)

Replace `{placeholder}` tags in an existing `.docx`:

```javascript
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { readFileSync, writeFileSync } from 'fs';

const zip = new PizZip(readFileSync(templatePath));
const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
});

doc.render({
  title: "Quarterly Report",
  date: "2025-03-01",
  items: [                          // loops: {#items}...{/items}
    { name: "Widget A", qty: 50 },
    { name: "Widget B", qty: 30 },
  ],
});

writeFileSync(outputPath, doc.getZip().generate({ type: 'nodebuffer' }));
```

- Simple values: `{tagName}`
- Loops: `{#items}{name} — {qty}{/items}`
- Conditionals: `{#showSection}...{/showSection}`

## Validation

After any operation, verify:
1. Output file exists and size > 0 bytes
2. For reads: extracted text is non-empty
3. Report output file path to user

## Gotchas

- `mammoth` cannot round-trip — it reads only, cannot write back changes
- `docx` creates from scratch only — cannot open and edit existing files
- For editing existing documents, use `docxtemplater` with a pre-tagged template
- All packages require `type: "module"` in package.json or `.mjs` extension for ESM imports
- Large images should be loaded as `Buffer` via `readFileSync` for `ImageRun`
