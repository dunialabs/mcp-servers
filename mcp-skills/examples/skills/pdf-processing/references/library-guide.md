# PDF Library Guide

Comprehensive guide to the three main PDF libraries used in this skill.

## Table of Contents

- [pdfplumber - Text & Table Extraction](#pdfplumber)
- [pypdf - PDF Manipulation](#pypdf)
- [reportlab - PDF Creation](#reportlab)

## pdfplumber

**Best for:** Extracting text and tables with layout preservation

### Installation

```bash
pip install pdfplumber
```

### Basic Usage

```python
import pdfplumber

# Extract text from all pages
with pdfplumber.open("document.pdf") as pdf:
    full_text = ""
    for page in pdf.pages:
        full_text += page.extract_text()
    print(full_text)
```

### Advanced Text Extraction

```python
# Extract with custom settings
with pdfplumber.open("document.pdf") as pdf:
    page = pdf.pages[0]

    # Extract specific region
    bbox = (0, 0, 400, 600)  # (x0, y0, x1, y1)
    cropped = page.crop(bbox)
    text = cropped.extract_text()

    # Extract with layout preservation
    text = page.extract_text(
        x_tolerance=3,
        y_tolerance=3,
        layout=True
    )

    # Extract words with coordinates
    words = page.extract_words()
    for word in words:
        print(f"{word['text']}: ({word['x0']}, {word['top']})")
```

### Table Extraction

```python
# Extract all tables
with pdfplumber.open("data.pdf") as pdf:
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            for row in table:
                print(row)

# Convert to pandas DataFrame
import pandas as pd

with pdfplumber.open("report.pdf") as pdf:
    table = pdf.pages[0].extract_table()
    df = pd.DataFrame(table[1:], columns=table[0])
    print(df)

# Fine-tune table detection
table_settings = {
    "vertical_strategy": "lines",    # or "text"
    "horizontal_strategy": "lines",  # or "text"
    "snap_tolerance": 3,
    "join_tolerance": 3,
    "edge_min_length": 3,
}

with pdfplumber.open("document.pdf") as pdf:
    tables = pdf.pages[0].extract_tables(table_settings)
```

### Page Properties

```python
with pdfplumber.open("document.pdf") as pdf:
    page = pdf.pages[0]

    # Page dimensions
    print(f"Width: {page.width}, Height: {page.height}")

    # Page rotation
    print(f"Rotation: {page.rotation}")

    # Page number (0-indexed)
    print(f"Page number: {page.page_number}")

    # Extract images
    for image in page.images:
        print(f"Image at ({image['x0']}, {image['top']})")
```

## pypdf

**Best for:** Merging, splitting, rotating, metadata manipulation

### Installation

```bash
pip install pypdf
```

### Reading PDFs

```python
from pypdf import PdfReader

reader = PdfReader("input.pdf")

# Number of pages
print(f"Number of pages: {len(reader.pages)}")

# Get metadata
metadata = reader.metadata
print(f"Title: {metadata.title}")
print(f"Author: {metadata.author}")
print(f"Subject: {metadata.subject}")
print(f"Creator: {metadata.creator}")

# Check if encrypted
if reader.is_encrypted:
    reader.decrypt("password")

# Extract text (basic - use pdfplumber for better results)
page = reader.pages[0]
text = page.extract_text()
```

### Merging PDFs

```python
from pypdf import PdfWriter

# Method 1: Using PdfWriter.append()
merger = PdfWriter()
for pdf_file in ["doc1.pdf", "doc2.pdf", "doc3.pdf"]:
    merger.append(pdf_file)
merger.write("merged.pdf")
merger.close()

# Method 2: Merge specific pages
merger = PdfWriter()
reader1 = PdfReader("doc1.pdf")
reader2 = PdfReader("doc2.pdf")

# Add pages 0-2 from doc1
for page in reader1.pages[0:3]:
    merger.add_page(page)

# Add all pages from doc2
merger.append(reader2)

merger.write("merged.pdf")
merger.close()
```

### Splitting PDFs

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")

# Split into individual pages
for i, page in enumerate(reader.pages):
    writer = PdfWriter()
    writer.add_page(page)
    with open(f"page_{i+1}.pdf", "wb") as output:
        writer.write(output)

# Extract specific page range
writer = PdfWriter()
for page in reader.pages[3:7]:  # Pages 4-7
    writer.add_page(page)
with open("pages_4_to_7.pdf", "wb") as output:
    writer.write(output)
```

### Rotating Pages

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
writer = PdfWriter()

# Rotate first page
page = reader.pages[0]
page.rotate(90)  # Rotate 90 degrees clockwise
writer.add_page(page)

# Rotate all pages
for page in reader.pages:
    page.rotate(180)
    writer.add_page(page)

with open("rotated.pdf", "wb") as output:
    writer.write(output)
```

### Password Protection

```python
from pypdf import PdfReader, PdfWriter

# Encrypt PDF
reader = PdfReader("input.pdf")
writer = PdfWriter()

for page in reader.pages:
    writer.add_page(page)

# Add password
writer.encrypt("user_password", "owner_password", algorithm="AES-256")

with open("encrypted.pdf", "wb") as output:
    writer.write(output)

# Decrypt PDF
reader = PdfReader("encrypted.pdf")
if reader.is_encrypted:
    reader.decrypt("user_password")

writer = PdfWriter()
for page in reader.pages:
    writer.add_page(page)

with open("decrypted.pdf", "wb") as output:
    writer.write(output)
```

### Metadata Manipulation

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
writer = PdfWriter()

# Copy pages
for page in reader.pages:
    writer.add_page(page)

# Add metadata
writer.add_metadata({
    "/Title": "My Document",
    "/Author": "John Doe",
    "/Subject": "PDF Processing",
    "/Creator": "Python pypdf"
})

with open("output.pdf", "wb") as output:
    writer.write(output)
```

## reportlab

**Best for:** Creating PDFs from scratch

### Installation

```bash
pip install reportlab
```

### Basic PDF Creation

```python
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch

# Create simple PDF
c = canvas.Canvas("simple.pdf", pagesize=letter)
width, height = letter

# Add text
c.setFont("Helvetica", 12)
c.drawString(100, height - 100, "Hello, PDF!")

# Different fonts and sizes
c.setFont("Helvetica-Bold", 16)
c.drawString(100, height - 150, "This is a title")

c.setFont("Times-Roman", 10)
c.drawString(100, height - 200, "This is body text.")

# Save
c.save()
```

### Drawing Shapes

```python
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

c = canvas.Canvas("shapes.pdf", pagesize=letter)
width, height = letter

# Rectangle
c.rect(100, height - 200, 200, 50)

# Filled rectangle
c.setFillColorRGB(0.8, 0.8, 0.8)
c.rect(100, height - 300, 200, 50, fill=1)

# Circle
c.circle(200, height - 400, 30)

# Line
c.line(100, height - 500, 300, height - 500)

# Path (custom shape)
path = c.beginPath()
path.moveTo(100, height - 600)
path.lineTo(150, height - 550)
path.lineTo(200, height - 600)
path.close()
c.drawPath(path)

c.save()
```

### Adding Images

```python
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

c = canvas.Canvas("with_image.pdf", pagesize=letter)
width, height = letter

# Add image
c.drawImage("logo.png", 100, height - 200, width=100, height=100)

# Add image with transparency
c.drawImage("watermark.png", 0, 0, width=width, height=height,
            mask='auto', preserveAspectRatio=True)

c.save()
```

### Multi-page Documents with Platypus

```python
from reportlab.platypus import SimpleDocTemplate, Table, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import letter

# Create document
doc = SimpleDocTemplate("advanced.pdf", pagesize=letter)
styles = getSampleStyleSheet()
story = []

# Add title
title = Paragraph("Report Title", styles['Title'])
story.append(title)
story.append(Spacer(1, 0.2*inch))

# Add heading
heading = Paragraph("Section 1", styles['Heading1'])
story.append(heading)
story.append(Spacer(1, 0.1*inch))

# Add paragraph
text = Paragraph(
    "This is a paragraph with <b>bold</b> and <i>italic</i> text.",
    styles['BodyText']
)
story.append(text)
story.append(Spacer(1, 0.2*inch))

# Add table
data = [
    ['Name', 'Age', 'City'],
    ['John', '30', 'New York'],
    ['Jane', '25', 'London'],
    ['Bob', '35', 'Paris']
]
table = Table(data)
story.append(table)

# Add page break
story.append(PageBreak())

# Add content on second page
story.append(Paragraph("Page 2", styles['Heading1']))

# Build PDF
doc.build(story)
```

### Custom Styles

```python
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

doc = SimpleDocTemplate("styled.pdf")
styles = getSampleStyleSheet()
story = []

# Create custom style
custom_style = ParagraphStyle(
    'CustomStyle',
    parent=styles['BodyText'],
    fontSize=14,
    textColor='blue',
    alignment=TA_JUSTIFY,
    spaceAfter=20,
)

# Use custom style
text = Paragraph("This uses a custom style.", custom_style)
story.append(text)

doc.build(story)
```

## Combining Libraries

```python
from pypdf import PdfReader, PdfWriter
import pdfplumber
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io

# Extract text with pdfplumber, create new PDF with reportlab
with pdfplumber.open("input.pdf") as pdf:
    text = pdf.pages[0].extract_text()

# Create new PDF with extracted text
packet = io.BytesIO()
c = canvas.Canvas(packet, pagesize=letter)
c.setFont("Helvetica", 12)

# Split text into lines and add to PDF
y = 750
for line in text.split('\n')[:40]:  # First 40 lines
    c.drawString(50, y, line[:80])  # First 80 characters
    y -= 15

c.save()
packet.seek(0)

# Save using pypdf
new_pdf = PdfReader(packet)
writer = PdfWriter()
writer.add_page(new_pdf.pages[0])

with open("reformatted.pdf", "wb") as output:
    writer.write(output)
```
