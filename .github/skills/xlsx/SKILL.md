---
name: xlsx
description: "Read, create, edit, or analyze spreadsheet files (.xlsx, .xlsm, .csv, .tsv). Triggers: any mention of \"Excel\", \"spreadsheet\", \".xlsx\", \".csv\", or requests to open/read/edit/fix/create spreadsheets, add columns, compute formulas, format cells, create charts, clean messy tabular data, or convert between tabular formats. Also triggers for financial models, pricing spreadsheets, and data cleanup into proper spreadsheets. The deliverable must be a spreadsheet file. Do NOT use for Word documents (use docx skill), PDFs (use pdf skill), or PowerPoint files."
argument-hint: 'Provide the path to the spreadsheet file and describe what operation to perform'
---

# XLSX Creation, Editing, and Analysis

## Python Environment — MANDATORY

**All Python scripts in this skill MUST run inside a virtual environment. No exceptions.**

```powershell
# Create venv (once per session, skip if .venv already exists)
python -m venv .venv

# Activate (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Activate (bash/macOS)
source .venv/bin/activate

# Install dependencies INSIDE venv only
pip install openpyxl
```

**Rules:**
- NEVER run `pip install` globally — always activate `.venv` first
- Check if `.venv` exists before creating: `Test-Path .venv`
- All `python scripts/...` commands assume the venv is active
- Clean up `.venv` when the session is done if it was created for this task
- **openpyxl is the default library** — use it for all read/write/edit operations
- **Do NOT default to pandas** — it may not be installed. Try openpyxl first

**Temp file cleanup — MANDATORY:**
- All temp scripts MUST use `.tmp_` prefix (e.g., `.tmp_process_xlsx.py`)
- After the task completes, delete ALL `.tmp_*` files autonomously — never leave them behind, never ask the user
- `Remove-Item` is deny-listed in auto-approval mode. Use Python instead:
  ```
  .venv\Scripts\python.exe -c "import os,glob; [os.remove(f) for f in glob.glob('.tmp_*')]"
  ```
- If no `.venv` exists, use system `python -c "..."`
> **Note:** `scripts/` paths are relative to this skill folder (`.github/skills/xlsx/`).

---

## Output Requirements

**Output directory**: Save generated `.xlsx`/`.csv` files to `.copilot/docs/` (see `shared-patterns.instructions.md` § Artifact Output Directory). Create the directory with `os.makedirs('.copilot/docs', exist_ok=True)` before writing.

### All Excel Files
- Use a consistent, professional font (e.g., Arial) unless the user specifies otherwise
- **Zero formula errors** — every file MUST be delivered with ZERO errors (#REF!, #DIV/0!, #VALUE!, #N/A, #NAME?)
- When updating existing templates: **preserve existing format/style/conventions exactly**. Existing template conventions ALWAYS override these guidelines

### Financial Models

**Color coding (industry standard):**
| Color | Use |
|-------|-----|
| Blue text (0,0,255) | Hardcoded inputs, scenario-variable numbers |
| Black text (0,0,0) | ALL formulas and calculations |
| Green text (0,128,0) | Links from other worksheets |
| Red text (255,0,0) | External links to other files |
| Yellow background (255,255,0) | Key assumptions needing attention |

**Number formatting:**
- Years: text strings ("2024" not "2,024")
- Currency: `$#,##0`; always specify units in headers ("Revenue ($mm)")
- Zeros: format as "-" including percentages
- Percentages: `0.0%` default
- Multiples: `0.0x` for valuation multiples
- Negative numbers: parentheses `(123)` not minus `-123`

**Formula rules:**
- Place ALL assumptions in separate cells — use references, not hardcodes
- Document hardcode sources: `"Source: [System], [Date], [Reference], [URL]"`

---

## CRITICAL: Use Formulas, Not Hardcoded Values

**Always use Excel formulas instead of calculating in Python and hardcoding.**

```python
# ❌ WRONG - hardcoding calculated values
total = df['Sales'].sum()
sheet['B10'] = total  # Hardcodes 5000

# ✅ CORRECT - let Excel calculate
sheet['B10'] = '=SUM(B2:B9)'
sheet['C5'] = '=(C4-C2)/C2'
sheet['D20'] = '=AVERAGE(D2:D19)'
```

This applies to ALL calculations — totals, percentages, ratios, differences.

---

## Quick Reference

| Task | Approach |
|------|----------|
| Read/analyze data | openpyxl (always available) |
| Heavy data analysis | pandas (check availability first) |
| Create new files | openpyxl with formatting |
| Edit existing files | openpyxl preserving formulas |
| Recalculate formulas | `python scripts/recalc.py output.xlsx` |

---

## Reading Data

### openpyxl (preferred — always available)

```python
from openpyxl import load_workbook

wb = load_workbook('file.xlsx')
ws = wb.active

headers = [cell.value for cell in ws[1]]
for row in ws.iter_rows(min_row=2, values_only=True):
    print(row)
```

### pandas (optional — check first)

```python
try:
    import pandas as pd
    df = pd.read_excel('file.xlsx')
    all_sheets = pd.read_excel('file.xlsx', sheet_name=None)  # All sheets
    df.describe()
except ImportError:
    print("pandas not installed — use openpyxl instead")
```

---

## Creating New Files

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

wb = Workbook()
sheet = wb.active

sheet['A1'] = 'Hello'
sheet.append(['Row', 'of', 'data'])

# Formulas
sheet['B2'] = '=SUM(A1:A10)'

# Formatting
sheet['A1'].font = Font(bold=True, color='FF0000')
sheet['A1'].fill = PatternFill('solid', start_color='FFFF00')
sheet['A1'].alignment = Alignment(horizontal='center')
sheet.column_dimensions['A'].width = 20

wb.save('output.xlsx')
```

---

## Editing Existing Files

```python
from openpyxl import load_workbook

wb = load_workbook('existing.xlsx')
sheet = wb.active  # or wb['SheetName']

# Modify cells
sheet['A1'] = 'New Value'
sheet.insert_rows(2)
sheet.delete_cols(3)

# Add new sheet
new_sheet = wb.create_sheet('NewSheet')
new_sheet['A1'] = 'Data'

wb.save('modified.xlsx')
```

---

## Recalculating Formulas — MANDATORY

Excel files created/modified by openpyxl have formula strings but no calculated values. **Always recalculate after writing formulas:**

```bash
python scripts/recalc.py output.xlsx [timeout_seconds]
```

The script:
- Recalculates all formulas in all sheets via LibreOffice
- Scans ALL cells for Excel errors (#REF!, #DIV/0!, etc.)
- Returns JSON with detailed error locations

**Interpreting output:**
```json
{
  "status": "success",           // or "errors_found"
  "total_errors": 0,
  "total_formulas": 42,
  "error_summary": {
    "#REF!": { "count": 2, "locations": ["Sheet1!B5", "Sheet1!C10"] }
  }
}
```

If errors are found: fix them and recalculate again.

---

## Common Workflow

1. **Choose tool**: openpyxl for everything; pandas only if installed and needed
2. **Create/Load**: Create new workbook or load existing
3. **Modify**: Add data, formulas, formatting
4. **Save**: Write to file
5. **Recalculate** (if formulas used): `python scripts/recalc.py output.xlsx`
6. **Verify**: Check for errors, fix, recalculate again

---

## PowerShell Terminal Rules

**Never use inline `python -c "..."` for anything with regex, f-strings containing `$`, CSV parsing, or multi-line logic** — PowerShell mangles special characters. Write a `.tmp_<name>.py` script, run it, then delete it.

---

## Formula Verification Checklist

- [ ] Test 2–3 sample references before building full model
- [ ] Column mapping: confirm Excel columns match (column 64 = BL, not BK)
- [ ] Row offset: Excel rows are 1-indexed (DataFrame row 5 = Excel row 6)
- [ ] NaN handling: check with `pd.notna()` if using pandas
- [ ] Division by zero: check denominators (#DIV/0!)
- [ ] Cross-sheet references: correct format (`Sheet1!A1`)
- [ ] Edge cases: zero, negative, and very large values

---

## Best Practices

### openpyxl
- Cell indices are 1-based (row=1, column=1 = cell A1)
- `data_only=True` reads calculated values: `load_workbook('file.xlsx', data_only=True)`
- **Warning**: Saving after `data_only=True` replaces formulas with values permanently
- Large files: `read_only=True` for reading, `write_only=True` for writing

### pandas
- Specify dtypes: `pd.read_excel('file.xlsx', dtype={'id': str})`
- Limit columns: `pd.read_excel('file.xlsx', usecols=['A', 'C', 'E'])`
- Parse dates: `pd.read_excel('file.xlsx', parse_dates=['date_column'])`

### Code Style
- Write minimal, concise Python — no unnecessary comments or verbose variables
- For Excel files: add cell comments for complex formulas and document data sources
