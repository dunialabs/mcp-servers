# PDF Processing Troubleshooting Guide

Common issues and solutions when working with PDFs.

## Text Extraction Issues

### Problem: No Text Extracted

**Symptoms:**
- `extract_text()` returns empty string or None
- Very short output when PDF clearly has content

**Possible Causes:**

1. **Scanned PDF (no text layer)**
   ```python
   # Check if PDF has text
   import pdfplumber

   with pdfplumber.open("document.pdf") as pdf:
       text = pdf.pages[0].extract_text()
       if not text or len(text.strip()) < 50:
           print("Likely a scanned PDF - use OCR")
   ```

   **Solution:** Use OCR
   ```bash
   python scripts/extract_text.py document.pdf output.txt --ocr
   ```

2. **Encrypted PDF**
   ```python
   from pypdf import PdfReader

   reader = PdfReader("document.pdf")
   if reader.is_encrypted:
       print("PDF is encrypted")
       reader.decrypt("password")
   ```

   **Solution:** Decrypt first
   ```bash
   python scripts/protect_pdf.py decrypt encrypted.pdf decrypted.pdf password
   python scripts/extract_text.py decrypted.pdf output.txt
   ```

3. **Corrupted PDF**
   ```bash
   # Try repairing with qpdf
   qpdf --check document.pdf
   qpdf --replace-input document.pdf
   ```

### Problem: Garbled or Incorrect Text

**Symptoms:**
- Text contains wrong characters
- Special characters not displaying correctly
- Spacing issues

**Solutions:**

1. **Try layout mode**
   ```python
   import pdfplumber

   with pdfplumber.open("document.pdf") as pdf:
       text = pdf.pages[0].extract_text(layout=True)
   ```

   Or with script:
   ```bash
   python scripts/extract_text.py document.pdf output.txt --layout
   ```

2. **Adjust extraction tolerances**
   ```python
   with pdfplumber.open("document.pdf") as pdf:
       text = pdf.pages[0].extract_text(
           x_tolerance=2,  # Try different values: 1, 2, 3, 5
           y_tolerance=2
       )
   ```

3. **Check encoding**
   ```python
   # Save with explicit UTF-8 encoding
   with open("output.txt", 'w', encoding='utf-8') as f:
       f.write(text)
   ```

4. **Font encoding issues - use OCR**
   ```bash
   python scripts/extract_text.py document.pdf output.txt --ocr
   ```

### Problem: Text Order is Wrong

**Symptoms:**
- Text appears in wrong order
- Columns mixed together
- Headers/footers interleaved with body text

**Solutions:**

1. **Use layout mode**
   ```bash
   python scripts/extract_text.py document.pdf output.txt --layout
   ```

2. **Extract by regions**
   ```python
   import pdfplumber

   with pdfplumber.open("document.pdf") as pdf:
       page = pdf.pages[0]

       # Define regions (x0, y0, x1, y1)
       left_column = page.crop((0, 100, 300, 700))
       right_column = page.crop((300, 100, 600, 700))

       text = left_column.extract_text() + "\n\n" + right_column.extract_text()
   ```

## Table Extraction Issues

### Problem: Tables Not Detected

**Symptoms:**
- `extract_tables()` returns empty list
- Tables clearly visible but not extracted

**Solutions:**

1. **Try different detection strategies**
   ```bash
   # Lines-based (default)
   python scripts/extract_tables.py document.pdf output.csv --strategy lines

   # Text-based (for tables without borders)
   python scripts/extract_tables.py document.pdf output.csv --strategy text
   ```

2. **Adjust table settings**
   ```python
   import pdfplumber

   table_settings = {
       "vertical_strategy": "text",  # Try "lines" or "text"
       "horizontal_strategy": "text",
       "snap_tolerance": 5,  # Increase for more tolerance
       "join_tolerance": 5,
       "edge_min_length": 3,
   }

   with pdfplumber.open("document.pdf") as pdf:
       tables = pdf.pages[0].extract_tables(table_settings)
   ```

3. **Extract from specific page**
   ```bash
   python scripts/extract_tables.py document.pdf output.csv --page 2
   ```

### Problem: Table Data is Incomplete or Malformed

**Symptoms:**
- Missing cells
- Merged cells not handled correctly
- Extra None values

**Solutions:**

1. **Clean extracted data**
   ```python
   import pdfplumber

   with pdfplumber.open("document.pdf") as pdf:
       table = pdf.pages[0].extract_table()

       # Clean table
       cleaned = []
       for row in table:
           # Remove None, strip whitespace
           clean_row = [str(cell).strip() if cell else "" for cell in row]
           cleaned.append(clean_row)
   ```

2. **Validate table structure**
   ```python
   # Check for consistent row lengths
   if table:
       col_count = len(table[0])
       for i, row in enumerate(table):
           if len(row) != col_count:
               print(f"Warning: Row {i} has {len(row)} columns, expected {col_count}")
   ```

3. **Try explicit_vertical_lines**
   ```python
   table_settings = {
       "explicit_vertical_lines": [50, 150, 250, 350],  # X coordinates
       "explicit_horizontal_lines": [100, 150, 200],    # Y coordinates
   }
   ```

## PDF Manipulation Issues

### Problem: Merged PDF is Corrupted

**Symptoms:**
- Output PDF won't open
- Some pages missing
- Errors during merge

**Solutions:**

1. **Validate input files first**
   ```python
   from pypdf import PdfReader

   def validate_pdf(pdf_path):
       try:
           reader = PdfReader(pdf_path)
           pages = len(reader.pages)
           print(f"✓ {pdf_path}: {pages} pages")
           return True
       except Exception as e:
           print(f"✗ {pdf_path}: {e}")
           return False

   # Validate all files before merging
   files = ["file1.pdf", "file2.pdf", "file3.pdf"]
   valid_files = [f for f in files if validate_pdf(f)]
   ```

2. **Repair PDFs before merging**
   ```bash
   qpdf --replace-input file1.pdf
   qpdf --replace-input file2.pdf
   ```

3. **Try alternative merge method**
   ```python
   from pypdf import PdfWriter

   # Instead of .append(), add pages individually
   writer = PdfWriter()
   for pdf_file in ["file1.pdf", "file2.pdf"]:
       reader = PdfReader(pdf_file)
       for page in reader.pages:
           writer.add_page(page)

   writer.write("merged.pdf")
   ```

### Problem: Password Protection Not Working

**Symptoms:**
- Encrypted PDF opens without password
- Decryption fails with correct password

**Solutions:**

1. **Check encryption algorithm**
   ```python
   from pypdf import PdfWriter

   writer = PdfWriter()
   # ... add pages ...

   # Try different algorithms
   writer.encrypt("password", algorithm="AES-256")  # or "AES-128", "RC4-128"
   ```

2. **Verify encryption**
   ```python
   from pypdf import PdfReader

   reader = PdfReader("encrypted.pdf")
   print(f"Is encrypted: {reader.is_encrypted}")

   if reader.is_encrypted:
       success = reader.decrypt("password")
       print(f"Decryption success: {success}")
   ```

3. **Check password type (user vs owner)**
   ```python
   # pypdf tries both automatically, but be aware:
   # - User password: allows opening
   # - Owner password: allows editing/printing

   writer.encrypt(
       user_password="user123",
       owner_password="owner456",
       algorithm="AES-256"
   )
   ```

## OCR Issues

### Problem: OCR Not Working

**Symptoms:**
- ImportError for pdf2image or pytesseract
- "tesseract command not found"

**Solutions:**

1. **Install Python packages**
   ```bash
   pip install pdf2image pytesseract pillow
   ```

2. **Install system dependencies**
   ```bash
   # macOS
   brew install tesseract poppler

   # Ubuntu/Debian
   sudo apt-get install tesseract-ocr poppler-utils

   # Verify installation
   which tesseract
   tesseract --version
   ```

3. **Set Tesseract path (Windows)**
   ```python
   import pytesseract
   pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
   ```

### Problem: Poor OCR Accuracy

**Symptoms:**
- Many incorrect characters
- Missing words
- Gibberish output

**Solutions:**

1. **Increase DPI**
   ```python
   from pdf2image import convert_from_path

   # Higher DPI = better quality but slower
   images = convert_from_path("document.pdf", dpi=300)  # Try 300 or 400
   ```

2. **Preprocess images**
   ```python
   from pdf2image import convert_from_path
   from PIL import Image, ImageEnhance
   import pytesseract

   images = convert_from_path("document.pdf", dpi=300)

   for image in images:
       # Convert to grayscale
       image = image.convert('L')

       # Increase contrast
       enhancer = ImageEnhance.Contrast(image)
       image = enhancer.enhance(2.0)

       # Sharpen
       enhancer = ImageEnhance.Sharpness(image)
       image = enhancer.enhance(2.0)

       text = pytesseract.image_to_string(image)
   ```

3. **Specify language**
   ```python
   # Download language data first: https://github.com/tesseract-ocr/tessdata
   text = pytesseract.image_to_string(image, lang='eng')  # or 'fra', 'deu', etc.
   ```

4. **Use page segmentation mode**
   ```python
   # PSM modes: https://github.com/tesseract-ocr/tesseract/blob/main/doc/tesseract.1.asc
   custom_config = r'--oem 3 --psm 6'  # PSM 6 = assume uniform block of text
   text = pytesseract.image_to_string(image, config=custom_config)
   ```

## Performance Issues

### Problem: Processing Large PDFs is Slow

**Symptoms:**
- Taking very long to process
- High memory usage
- Python crashes or hangs

**Solutions:**

1. **Process page by page**
   ```python
   import pdfplumber

   def process_large_pdf(pdf_path, page_callback):
       with pdfplumber.open(pdf_path) as pdf:
           total = len(pdf.pages)

           for i, page in enumerate(pdf.pages):
               print(f"Processing {i+1}/{total}...")
               text = page.extract_text()
               page_callback(i, text)

               # Clear cache
               page.flush_cache()

   def save_page(page_num, text):
       with open(f"page_{page_num}.txt", 'w') as f:
           f.write(text)

   process_large_pdf("large.pdf", save_page)
   ```

2. **Use multiprocessing**
   ```python
   import multiprocessing
   from functools import partial
   import pdfplumber

   def process_page(page_num, pdf_path):
       with pdfplumber.open(pdf_path) as pdf:
           return pdf.pages[page_num].extract_text()

   def parallel_process(pdf_path, workers=4):
       with pdfplumber.open(pdf_path) as pdf:
           total_pages = len(pdf.pages)

       with multiprocessing.Pool(workers) as pool:
           func = partial(process_page, pdf_path=pdf_path)
           results = pool.map(func, range(total_pages))

       return results
   ```

3. **Extract only what you need**
   ```python
   # Don't extract everything if you only need specific pages
   with pdfplumber.open("large.pdf") as pdf:
       # Only first 10 pages
       for page in pdf.pages[:10]:
           text = page.extract_text()
   ```

4. **Disable features you don't need**
   ```python
   with pdfplumber.open("document.pdf", laparams={}) as pdf:
       # Faster but less accurate layout analysis
       text = pdf.pages[0].extract_text()
   ```

## Form Filling Issues

### Problem: Form Fields Not Found

**Symptoms:**
- `get_form_text_fields()` returns empty dict
- Form fields not listed

**Solutions:**

1. **Check if PDF has fillable fields**
   ```python
   from pypdf import PdfReader

   reader = PdfReader("form.pdf")
   fields = reader.get_form_text_fields()

   if not fields:
       print("This PDF has no fillable form fields")
       print("It may be a static form (text/images only)")
   else:
       print(f"Found {len(fields)} fields:")
       for name, value in fields.items():
           print(f"  {name}: {value}")
   ```

2. **List all field types**
   ```python
   reader = PdfReader("form.pdf")
   if "/AcroForm" in reader.trailer["/Root"]:
       print("PDF has a form")
       # Get all field annotations
       for page in reader.pages:
           if "/Annots" in page:
               for annot in page["/Annots"]:
                   obj = annot.get_object()
                   if "/T" in obj:  # Field name
                       print(f"Field: {obj['/T']}, Type: {obj.get('/FT', 'Unknown')}")
   ```

### Problem: Form Fields Not Updating

**Symptoms:**
- Filled form shows old values
- Changes not visible in output PDF

**Solutions:**

1. **Verify field names**
   ```bash
   # List all fields first
   python scripts/fill_form.py list form.pdf

   # Then fill with exact names
   python scripts/fill_form.py fill form.pdf output.pdf --field "Full Name"="John Doe"
   ```

2. **Check for read-only fields**
   ```python
   reader = PdfReader("form.pdf")
   for page in reader.pages:
       if "/Annots" in page:
           for annot in page["/Annots"]:
               obj = annot.get_object()
               if "/Ff" in obj:  # Field flags
                   flags = obj["/Ff"]
                   if flags & 1:  # Bit 0 = ReadOnly
                       print(f"Field {obj.get('/T')} is read-only")
   ```

3. **Update on correct page**
   ```python
   # If form spans multiple pages
   writer = PdfWriter()
   reader = PdfReader("form.pdf")

   writer.append(reader)

   # Update page 0
   writer.update_page_form_field_values(writer.pages[0], {"field1": "value1"})

   # Update page 1
   writer.update_page_form_field_values(writer.pages[1], {"field2": "value2"})
   ```

## General Best Practices

1. **Always use context managers (`with` statements)**
   ```python
   # Good
   with pdfplumber.open("file.pdf") as pdf:
       text = pdf.pages[0].extract_text()

   # Bad - may leave file handles open
   pdf = pdfplumber.open("file.pdf")
   text = pdf.pages[0].extract_text()
   # pdf.close() might not be called if exception occurs
   ```

2. **Validate inputs**
   ```python
   import os

   if not os.path.exists("input.pdf"):
       print("Error: File not found")
       exit(1)
   ```

3. **Handle errors gracefully**
   ```python
   try:
       with pdfplumber.open("document.pdf") as pdf:
           text = pdf.pages[0].extract_text()
   except Exception as e:
       print(f"Error processing PDF: {e}")
   ```

4. **Test with sample first**
   ```python
   # Test with first page before processing all pages
   with pdfplumber.open("large.pdf") as pdf:
       sample_text = pdf.pages[0].extract_text()
       print("Sample:", sample_text[:200])

       # If sample looks good, process all
       if input("Process all pages? (y/n): ").lower() == 'y':
           for page in pdf.pages:
               # ... process
               pass
   ```
