#!/usr/bin/env python3
"""
Extract text from PDF files.

Usage:
    python extract_text.py input.pdf output.txt
    python extract_text.py input.pdf output.txt --layout
    python extract_text.py input.pdf output.txt --ocr
"""

import sys
import argparse
import pdfplumber


def extract_text(pdf_path, layout=False, ocr=False):
    """Extract text from PDF file."""
    text = []

    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            print(f"Processing page {i+1}/{len(pdf.pages)}...", file=sys.stderr)

            if layout:
                page_text = page.extract_text(
                    x_tolerance=3,
                    y_tolerance=3,
                    layout=True
                )
            else:
                page_text = page.extract_text()

            if page_text:
                text.append(f"--- Page {i+1} ---\n{page_text}")

    return "\n\n".join(text)


def extract_text_ocr(pdf_path):
    """Extract text using OCR for scanned PDFs."""
    try:
        from pdf2image import convert_from_path
        import pytesseract
    except ImportError:
        print("Error: OCR requires pdf2image and pytesseract", file=sys.stderr)
        print("Install with: pip install pdf2image pytesseract", file=sys.stderr)
        sys.exit(1)

    print("Converting PDF to images...", file=sys.stderr)
    images = convert_from_path(pdf_path)

    text = []
    for i, image in enumerate(images):
        print(f"OCR processing page {i+1}/{len(images)}...", file=sys.stderr)
        page_text = pytesseract.image_to_string(image)
        text.append(f"--- Page {i+1} ---\n{page_text}")

    return "\n\n".join(text)


def main():
    parser = argparse.ArgumentParser(description='Extract text from PDF files')
    parser.add_argument('input', help='Input PDF file')
    parser.add_argument('output', help='Output text file')
    parser.add_argument('--layout', action='store_true', help='Preserve layout')
    parser.add_argument('--ocr', action='store_true', help='Use OCR for scanned PDFs')

    args = parser.parse_args()

    try:
        if args.ocr:
            text = extract_text_ocr(args.input)
        else:
            text = extract_text(args.input, layout=args.layout)

        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(text)

        print(f"✓ Text extracted to {args.output}", file=sys.stderr)

    except FileNotFoundError:
        print(f"Error: File '{args.input}' not found", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
