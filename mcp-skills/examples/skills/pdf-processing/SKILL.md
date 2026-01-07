---
name: pdf-processing
description: Extract text and tables from PDF files, merge/split documents, fill forms, add watermarks, create PDFs from scratch. Use when working with PDF files or when user mentions PDFs, forms, document extraction, or PDF manipulation.
version: 1.0.0
---

# PDF Processing

Comprehensive PDF manipulation guide with Python code examples and best practices.

## About This Skill

This skill provides **code references and implementation patterns** for PDF processing tasks. It includes ready-to-use Python code snippets that Claude can adapt and write to your project when needed.

**This is a reference skill, not an executable package.** The example scripts in `scripts/` directory serve as templates. Claude will read these examples and create appropriate code for your specific use case on the host machine.

## Quick Reference

| Task | Script | Example |
|------|--------|---------|
| Extract text | `extract_text.py` | `python scripts/extract_text.py input.pdf output.txt` |
| Extract tables | `extract_tables.py` | `python scripts/extract_tables.py input.pdf output.csv` |
| Merge PDFs | `merge_pdfs.py` | `python scripts/merge_pdfs.py output.pdf file1.pdf file2.pdf` |
| Split PDF | `split_pdf.py` | `python scripts/split_pdf.py input.pdf output_dir/` |
| Add watermark | `add_watermark.py` | `python scripts/add_watermark.py input.pdf output.pdf "CONFIDENTIAL"` |
| Encrypt/decrypt | `protect_pdf.py` | `python scripts/protect_pdf.py encrypt input.pdf output.pdf password` |
| Fill forms | `fill_form.py` | `python scripts/fill_form.py fill input.pdf output.pdf data.json` |

## Pre-built Scripts

All scripts are located in the `scripts/` directory and include comprehensive error handling and help text.

### 1. Extract Text - `extract_text.py`

Extract text from PDF files with layout preservation and OCR support.

```bash
# Basic text extraction
python scripts/extract_text.py document.pdf output.txt

# Preserve layout
python scripts/extract_text.py document.pdf output.txt --layout

# Use OCR for scanned PDFs
python scripts/extract_text.py scanned.pdf output.txt --ocr

# View help
python scripts/extract_text.py --help
```

**Features:**
- Layout preservation mode
- OCR support for scanned documents
- Progress reporting
- UTF-8 encoding

### 2. Extract Tables - `extract_tables.py`

Extract tables from PDFs to CSV format.

```bash
# Extract from first page
python scripts/extract_tables.py document.pdf output.csv

# Extract from specific page
python scripts/extract_tables.py document.pdf output.csv --page 3

# Extract from all pages
python scripts/extract_tables.py document.pdf output.csv --all-pages

# Use text-based detection strategy
python scripts/extract_tables.py document.pdf output.csv --strategy text
```

**Features:**
- Multiple table detection strategies
- Single page or all pages extraction
- Progress reporting

### 3. Merge PDFs - `merge_pdfs.py`

Merge multiple PDF files into one.

```bash
# Merge PDFs
python scripts/merge_pdfs.py merged.pdf file1.pdf file2.pdf file3.pdf

# Merge with wildcard
python scripts/merge_pdfs.py complete.pdf chapter*.pdf
```

**Features:**
- Graceful error handling
- Progress reporting
- Validates output file

### 4. Split PDF - `split_pdf.py`

Split PDF into individual pages or page ranges.

```bash
# Split all pages
python scripts/split_pdf.py document.pdf output_dir/

# Split specific pages
python scripts/split_pdf.py document.pdf output_dir/ --pages 1-3,5,7-9

# Custom filename prefix
python scripts/split_pdf.py document.pdf output_dir/ --prefix chapter_
```

**Features:**
- Page range parsing (e.g., "1-3,5,7-9")
- Custom filename prefixes
- Automatic directory creation

### 5. Add Watermark - `add_watermark.py`

Add watermarks to PDF pages.

```bash
# Basic watermark
python scripts/add_watermark.py input.pdf output.pdf "CONFIDENTIAL"

# Custom opacity
python scripts/add_watermark.py input.pdf output.pdf "DRAFT" --opacity 0.3

# Custom rotation and font size
python scripts/add_watermark.py input.pdf output.pdf "COPY" --rotation 45 --font-size 80
```

**Features:**
- Customizable opacity (0.0-1.0)
- Customizable rotation
- Customizable font size
- Progress reporting

### 6. Protect PDF - `protect_pdf.py`

Add or remove password protection.

```bash
# Encrypt PDF
python scripts/protect_pdf.py encrypt input.pdf output.pdf mypassword

# Decrypt PDF
python scripts/protect_pdf.py decrypt input.pdf output.pdf mypassword
```

**Features:**
- Password encryption
- Password decryption
- Encryption status checking

### 7. Fill Forms - `fill_form.py`

List and fill PDF form fields.

```bash
# List form fields
python scripts/fill_form.py list form.pdf

# Fill from JSON file
python scripts/fill_form.py fill input.pdf output.pdf --json data.json

# Fill from command line
python scripts/fill_form.py fill input.pdf output.pdf \
  --field name="John Doe" \
  --field email="john@example.com" \
  --field phone="+1234567890"
```

**Features:**
- List all form fields
- Fill from JSON file
- Fill from command line arguments
- Field validation

## Python Library Usage

For custom scripts or integration into Python code, use these libraries directly.

### Basic Text Extraction

```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        print(text)
```

### Basic Table Extraction

```python
import pdfplumber

with pdfplumber.open("data.pdf") as pdf:
    tables = pdf.pages[0].extract_tables()
    for table in tables:
        for row in table:
            print(row)
```

### Basic PDF Merging

```python
from pypdf import PdfWriter

merger = PdfWriter()
for pdf_file in ["file1.pdf", "file2.pdf"]:
    merger.append(pdf_file)
merger.write("merged.pdf")
merger.close()
```

### Basic PDF Creation

```python
from reportlab.pdfgen import canvas

c = canvas.Canvas("output.pdf")
c.drawString(100, 750, "Hello PDF!")
c.save()
```

## Installation

### Required Dependencies

```bash
# Core libraries
pip install pdfplumber pypdf reportlab

# OCR support (optional)
pip install pdf2image pytesseract pillow

# System dependencies for OCR (optional)
# macOS:
brew install tesseract poppler

# Ubuntu/Debian:
apt-get install tesseract-ocr poppler-utils

# Windows:
# Download Tesseract from: https://github.com/tesseract-ocr/tesseract
# Download Poppler from: https://github.com/oschwartz10612/poppler-windows
```

## When to Use Each Tool

**Use Scripts When:**
- Quick one-off operations
- Command-line automation
- Batch processing
- Learning PDF manipulation

**Use Python Libraries When:**
- Building applications
- Complex workflows
- Custom processing logic
- Integration with other code

## Common Workflows

### Extract Data from Reports

```bash
# 1. Extract tables to CSV
python scripts/extract_tables.py report.pdf data.csv --all-pages

# 2. Extract text for analysis
python scripts/extract_text.py report.pdf content.txt
```

### Prepare Documents for Distribution

```bash
# 1. Merge documents
python scripts/merge_pdfs.py combined.pdf intro.pdf content.pdf appendix.pdf

# 2. Add watermark
python scripts/add_watermark.py combined.pdf watermarked.pdf "INTERNAL USE ONLY" --opacity 0.3

# 3. Encrypt
python scripts/protect_pdf.py encrypt watermarked.pdf final.pdf secretpass
```

### Process Scanned Documents

```bash
# 1. Extract text with OCR
python scripts/extract_text.py scanned.pdf extracted.txt --ocr

# 2. Split into pages for review
python scripts/split_pdf.py scanned.pdf pages/ --prefix page_
```

## Troubleshooting

### Problem: No text extracted

**Possible causes:**
- Scanned PDF (no text layer)
- Encrypted PDF
- Corrupted PDF

**Solutions:**
```bash
# Try OCR mode
python scripts/extract_text.py document.pdf output.txt --ocr

# Check if encrypted
python scripts/fill_form.py list document.pdf  # Will fail if encrypted

# Decrypt first
python scripts/protect_pdf.py decrypt encrypted.pdf decrypted.pdf password
```

### Problem: Tables not detected

**Solutions:**
```bash
# Try text-based strategy
python scripts/extract_tables.py document.pdf output.csv --strategy text

# Extract from specific page
python scripts/extract_tables.py document.pdf output.csv --page 2
```

### Problem: OCR not working

**Solutions:**
```bash
# Install dependencies
pip install pdf2image pytesseract

# macOS: Install system tools
brew install tesseract poppler

# Verify installation
python -c "import pytesseract; print(pytesseract.get_tesseract_version())"
```

## Best Practices

1. **Test with sample pages first** - Don't process entire documents without testing
2. **Use appropriate scripts** - Choose the right tool for your task
3. **Check file permissions** - Ensure you have write access to output directories
4. **Handle errors gracefully** - All scripts include error handling
5. **Use layout mode for complex documents** - Better text extraction accuracy
6. **Use OCR for scanned PDFs** - Required for image-based PDFs
7. **Validate extracted data** - Tables may have missing cells or formatting issues
8. **Keep backups** - Always keep original files when modifying PDFs

## Additional Resources

See the `references/` directory for:
- Detailed library documentation
- Advanced usage examples
- Troubleshooting guides
- Performance optimization tips

External documentation:
- [pdfplumber documentation](https://github.com/jsvine/pdfplumber)
- [pypdf documentation](https://pypdf.readthedocs.io/)
- [reportlab documentation](https://www.reportlab.com/docs/reportlab-userguide.pdf)
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)
