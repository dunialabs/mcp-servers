# PDF Processing Skill

A comprehensive example of a scripts-based Claude skill for PDF manipulation.

## Structure

```
pdf-processing/
├── SKILL.md                    # Main skill documentation (363 lines)
├── README.md                   # This file
├── scripts/                    # Executable Python scripts
│   ├── extract_text.py        # Extract text from PDFs (2.6KB)
│   ├── extract_tables.py      # Extract tables to CSV (3.6KB)
│   ├── merge_pdfs.py          # Merge multiple PDFs (1.5KB)
│   ├── split_pdf.py           # Split PDF by pages/ranges (2.7KB)
│   ├── add_watermark.py       # Add watermarks (3.1KB)
│   ├── protect_pdf.py         # Encrypt/decrypt PDFs (2.4KB)
│   └── fill_form.py           # Fill PDF forms (4.0KB)
└── references/                 # Detailed documentation
    ├── library-guide.md       # Library API reference (9.6KB)
    ├── advanced-examples.md   # Real-world examples (15KB)
    └── troubleshooting.md     # Common issues and solutions (14KB)
```

## Quick Start

### Using Scripts

All scripts are executable and include `--help` options:

```bash
# Extract text
python scripts/extract_text.py input.pdf output.txt

# Extract tables
python scripts/extract_tables.py input.pdf output.csv --all-pages

# Merge PDFs
python scripts/merge_pdfs.py output.pdf file1.pdf file2.pdf

# Split PDF
python scripts/split_pdf.py input.pdf output_dir/ --pages 1-3,5

# Add watermark
python scripts/add_watermark.py input.pdf output.pdf "CONFIDENTIAL" --opacity 0.3

# Encrypt PDF
python scripts/protect_pdf.py encrypt input.pdf output.pdf password

# Fill forms
python scripts/fill_form.py list form.pdf
python scripts/fill_form.py fill form.pdf output.pdf --json data.json
```

### Using Python Libraries

```python
import pdfplumber

# Extract text
with pdfplumber.open("document.pdf") as pdf:
    text = pdf.pages[0].extract_text()
    print(text)
```

## Installation

```bash
# Core dependencies
pip install pdfplumber pypdf reportlab

# OCR support (optional)
pip install pdf2image pytesseract pillow
brew install tesseract poppler  # macOS
```

## Documentation

- **SKILL.md** - Start here for quick reference and basic usage
- **references/library-guide.md** - Detailed library API documentation
- **references/advanced-examples.md** - Real-world batch processing and automation
- **references/troubleshooting.md** - Common issues and solutions

## Design Philosophy

This skill demonstrates the **scripts-based approach**:

### Level 1: SKILL.md (Always Loaded)
- Quick reference table
- Script usage examples
- When to use each tool
- Minimal Python examples

### Level 2: Scripts (On Demand)
- Production-ready executables
- Comprehensive argument parsing
- Error handling and validation
- Progress reporting

### Level 3: References (As Needed)
- Detailed library documentation
- Advanced usage patterns
- Troubleshooting guides
- Performance optimization

## Why Scripts?

**Advantages:**
- Ready to use without modification
- Command-line automation
- Batch processing
- Consistent error handling
- Clear separation of concerns

**When to Use:**
- Quick one-off operations
- Shell scripting and automation
- Learning PDF manipulation
- Testing before integration

**When to Use Libraries Directly:**
- Building applications
- Complex custom workflows
- Integration with existing code
- Custom processing logic

## Version History

- **v3.0.0** - Scripts-based approach with references directory
- **v2.0.0** - Enhanced with comprehensive inline examples
- **v1.0.0** - Initial basic skill

## Contributing

To add a new script:

1. Create executable Python file in `scripts/`
2. Include shebang: `#!/usr/bin/env python3`
3. Add comprehensive argument parsing with `argparse`
4. Include help text and usage examples
5. Add error handling and progress reporting
6. Update SKILL.md with usage example
7. Make executable: `chmod +x scripts/your_script.py`

## License

This is an example skill for demonstration purposes.
