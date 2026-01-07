# Advanced PDF Processing Examples

Real-world examples and advanced use cases.

## Batch Processing

### Process Multiple PDFs in Directory

```python
import os
import pdfplumber
from pathlib import Path

def batch_extract_text(input_dir, output_dir):
    """Extract text from all PDFs in a directory."""
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    pdf_files = list(input_path.glob("*.pdf"))

    for i, pdf_file in enumerate(pdf_files):
        print(f"Processing {i+1}/{len(pdf_files)}: {pdf_file.name}")

        try:
            with pdfplumber.open(pdf_file) as pdf:
                text = []
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text.append(page_text)

                # Save to text file
                output_file = output_path / f"{pdf_file.stem}.txt"
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write('\n\n'.join(text))

                print(f"  ✓ Saved to {output_file}")

        except Exception as e:
            print(f"  ✗ Error: {e}")

# Usage
batch_extract_text("pdfs/", "extracted_text/")
```

### Merge All PDFs in Directory

```python
from pypdf import PdfWriter
from pathlib import Path

def merge_all_pdfs(input_dir, output_file):
    """Merge all PDFs in directory into one file."""
    input_path = Path(input_dir)
    pdf_files = sorted(input_path.glob("*.pdf"))

    if not pdf_files:
        print("No PDF files found")
        return

    merger = PdfWriter()

    for i, pdf_file in enumerate(pdf_files):
        print(f"Adding {i+1}/{len(pdf_files)}: {pdf_file.name}")
        try:
            merger.append(pdf_file)
        except Exception as e:
            print(f"  Warning: Failed to add {pdf_file.name}: {e}")

    print(f"\nWriting merged PDF to {output_file}")
    with open(output_file, 'wb') as output:
        merger.write(output)

    merger.close()
    print(f"✓ Successfully merged {len(pdf_files)} files")

# Usage
merge_all_pdfs("chapters/", "complete_book.pdf")
```

## Data Extraction

### Extract Tables with Validation

```python
import pdfplumber
import pandas as pd
import csv

def extract_and_validate_tables(pdf_path, output_csv, min_rows=2, min_cols=2):
    """Extract tables with validation."""
    all_tables = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            tables = page.extract_tables()

            for table_num, table in enumerate(tables):
                # Validate table
                if len(table) < min_rows:
                    print(f"Page {page_num+1}, Table {table_num+1}: Too few rows ({len(table)})")
                    continue

                if not table[0] or len(table[0]) < min_cols:
                    print(f"Page {page_num+1}, Table {table_num+1}: Too few columns")
                    continue

                # Clean table data
                cleaned_table = []
                for row in table:
                    # Remove None values and strip whitespace
                    cleaned_row = [str(cell).strip() if cell else "" for cell in row]
                    cleaned_table.append(cleaned_row)

                all_tables.append({
                    'page': page_num + 1,
                    'table_num': table_num + 1,
                    'data': cleaned_table
                })

    if not all_tables:
        print("No valid tables found")
        return

    # Save all tables to CSV (or you could save to separate files)
    with open(output_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)

        for table_info in all_tables:
            # Add header with table info
            writer.writerow([f"Page {table_info['page']}, Table {table_info['table_num']}"])
            writer.writerows(table_info['data'])
            writer.writerow([])  # Empty row between tables

    print(f"✓ Extracted {len(all_tables)} tables to {output_csv}")

# Usage
extract_and_validate_tables("financial_report.pdf", "tables.csv")
```

### Extract Specific Text Patterns

```python
import pdfplumber
import re

def extract_emails(pdf_path):
    """Extract all email addresses from PDF."""
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = set()

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                found_emails = re.findall(email_pattern, text)
                emails.update(found_emails)

    return sorted(emails)

def extract_phone_numbers(pdf_path):
    """Extract phone numbers from PDF."""
    # Match formats: (123) 456-7890, 123-456-7890, +1-123-456-7890
    phone_pattern = r'\+?1?\s*\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'
    phones = set()

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                found_phones = re.findall(phone_pattern, text)
                # Format as (123) 456-7890
                formatted = [f"({p[0]}) {p[1]}-{p[2]}" for p in found_phones]
                phones.update(formatted)

    return sorted(phones)

# Usage
emails = extract_emails("contacts.pdf")
print("Emails found:", emails)

phones = extract_phone_numbers("contacts.pdf")
print("Phone numbers found:", phones)
```

## Document Assembly

### Create Multi-section Report

```python
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table
from reportlab.platypus import TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter

def create_report(output_path, title, sections):
    """
    Create a multi-section report.

    sections = [
        {
            'title': 'Section 1',
            'content': 'Text content',
            'table': [[...], [...]]  # optional
        },
        ...
    ]
    """
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title page
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph(title, styles['Title']))
    story.append(PageBreak())

    # Table of contents
    story.append(Paragraph("Table of Contents", styles['Heading1']))
    story.append(Spacer(1, 0.2*inch))

    for i, section in enumerate(sections):
        toc_entry = Paragraph(
            f"{i+1}. {section['title']}",
            styles['Normal']
        )
        story.append(toc_entry)
        story.append(Spacer(1, 0.1*inch))

    story.append(PageBreak())

    # Sections
    for i, section in enumerate(sections):
        # Section title
        story.append(Paragraph(
            f"{i+1}. {section['title']}",
            styles['Heading1']
        ))
        story.append(Spacer(1, 0.2*inch))

        # Section content
        for paragraph in section['content'].split('\n\n'):
            story.append(Paragraph(paragraph, styles['BodyText']))
            story.append(Spacer(1, 0.1*inch))

        # Optional table
        if 'table' in section and section['table']:
            story.append(Spacer(1, 0.2*inch))

            table = Table(section['table'])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))

            story.append(table)

        story.append(PageBreak())

    # Build PDF
    doc.build(story)
    print(f"✓ Report created: {output_path}")

# Usage
sections = [
    {
        'title': 'Executive Summary',
        'content': 'This report provides an overview of Q4 results.\n\nKey findings include...'
    },
    {
        'title': 'Financial Data',
        'content': 'The following table shows quarterly revenue:',
        'table': [
            ['Quarter', 'Revenue', 'Growth'],
            ['Q1', '$1.2M', '5%'],
            ['Q2', '$1.5M', '25%'],
            ['Q3', '$1.8M', '20%'],
            ['Q4', '$2.1M', '17%']
        ]
    }
]

create_report("annual_report.pdf", "2024 Annual Report", sections)
```

### Combine Multiple PDFs with Bookmarks

```python
from pypdf import PdfReader, PdfWriter

def merge_with_bookmarks(files_dict, output_path):
    """
    Merge PDFs and add bookmarks.

    files_dict = {
        'Chapter 1': 'chapter1.pdf',
        'Chapter 2': 'chapter2.pdf',
        ...
    }
    """
    writer = PdfWriter()
    page_count = 0

    for title, pdf_path in files_dict.items():
        reader = PdfReader(pdf_path)
        num_pages = len(reader.pages)

        # Add pages
        for page in reader.pages:
            writer.add_page(page)

        # Add bookmark pointing to first page of this section
        writer.add_outline_item(title, page_count)

        page_count += num_pages
        print(f"Added {title}: {num_pages} pages")

    with open(output_path, 'wb') as output:
        writer.write(output)

    print(f"✓ Created {output_path} with {page_count} total pages")

# Usage
chapters = {
    'Introduction': 'intro.pdf',
    'Chapter 1: Getting Started': 'chapter1.pdf',
    'Chapter 2: Advanced Topics': 'chapter2.pdf',
    'Appendix': 'appendix.pdf'
}

merge_with_bookmarks(chapters, "complete_book.pdf")
```

## Form Processing

### Bulk Fill Forms

```python
from pypdf import PdfReader, PdfWriter
import json

def bulk_fill_forms(template_pdf, data_file, output_dir):
    """Fill form template for multiple records."""
    from pathlib import Path

    # Load data
    with open(data_file, 'r') as f:
        records = json.load(f)

    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    for i, record in enumerate(records):
        print(f"Processing record {i+1}/{len(records)}")

        reader = PdfReader(template_pdf)
        writer = PdfWriter()

        # Append template
        writer.append(reader)

        # Fill form fields
        writer.update_page_form_field_values(
            writer.pages[0],
            record
        )

        # Generate output filename from record
        name = record.get('name', f'record_{i+1}').replace(' ', '_')
        output_file = output_path / f"{name}.pdf"

        with open(output_file, 'wb') as output:
            writer.write(output)

        print(f"  ✓ Created {output_file}")

# Usage
# data.json contains: [{"name": "John Doe", "email": "..."}, {...}, ...]
bulk_fill_forms("form_template.pdf", "data.json", "filled_forms/")
```

## Watermarking and Protection

### Batch Watermark and Encrypt

```python
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io
from pathlib import Path

def create_watermark(text, opacity=0.3):
    """Create watermark PDF."""
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)

    c.setFont("Helvetica", 60)
    c.setFillGray(opacity)
    c.saveState()
    c.translate(300, 400)
    c.rotate(45)
    c.drawCentredString(0, 0, text)
    c.restoreState()
    c.save()

    packet.seek(0)
    return PdfReader(packet)

def process_confidential_docs(input_dir, output_dir, password):
    """Add watermark and encrypt all PDFs."""
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    watermark = create_watermark("CONFIDENTIAL")
    watermark_page = watermark.pages[0]

    pdf_files = list(input_path.glob("*.pdf"))

    for i, pdf_file in enumerate(pdf_files):
        print(f"Processing {i+1}/{len(pdf_files)}: {pdf_file.name}")

        try:
            reader = PdfReader(pdf_file)
            writer = PdfWriter()

            # Add watermark to each page
            for page in reader.pages:
                page.merge_page(watermark_page)
                writer.add_page(page)

            # Encrypt
            writer.encrypt(password, algorithm="AES-256")

            # Save
            output_file = output_path / pdf_file.name
            with open(output_file, 'wb') as output:
                writer.write(output)

            print(f"  ✓ Processed and saved to {output_file}")

        except Exception as e:
            print(f"  ✗ Error: {e}")

# Usage
process_confidential_docs("documents/", "protected/", "secret123")
```

## OCR and Image Processing

### Process Scanned Documents with OCR

```python
from pdf2image import convert_from_path
import pytesseract
from PIL import Image
import pdfplumber

def smart_extract_text(pdf_path, force_ocr=False):
    """
    Extract text, automatically using OCR if needed.
    """
    if not force_ocr:
        # Try normal extraction first
        with pdfplumber.open(pdf_path) as pdf:
            text = []
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text and len(page_text.strip()) > 50:
                    text.append(page_text)
                else:
                    # Page has little/no text, probably scanned
                    force_ocr = True
                    break

            if not force_ocr:
                return '\n\n'.join(text)

    # Use OCR
    print("Using OCR (this may take a while)...")
    images = convert_from_path(pdf_path, dpi=300)

    text = []
    for i, image in enumerate(images):
        print(f"OCR processing page {i+1}/{len(images)}...")

        # Optionally enhance image
        image = image.convert('L')  # Convert to grayscale

        page_text = pytesseract.image_to_string(image, lang='eng')
        text.append(f"--- Page {i+1} ---\n{page_text}")

    return '\n\n'.join(text)

# Usage
text = smart_extract_text("document.pdf")
print(text)
```

## Performance Optimization

### Process Large PDF Efficiently

```python
import pdfplumber
import multiprocessing
from functools import partial

def process_page(page_num, pdf_path):
    """Process a single page."""
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_num]
        return {
            'page': page_num + 1,
            'text': page.extract_text(),
            'tables': page.extract_tables()
        }

def process_large_pdf_parallel(pdf_path, num_workers=4):
    """Process PDF pages in parallel."""
    # Get total pages
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)

    # Process in parallel
    with multiprocessing.Pool(num_workers) as pool:
        func = partial(process_page, pdf_path=pdf_path)
        results = pool.map(func, range(total_pages))

    return results

# Usage
results = process_large_pdf_parallel("large_document.pdf", num_workers=8)

for result in results:
    print(f"Page {result['page']}: {len(result['text'])} characters")
    print(f"  Tables: {len(result['tables'])}")
```
