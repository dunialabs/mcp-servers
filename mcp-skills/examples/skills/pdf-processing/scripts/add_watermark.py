#!/usr/bin/env python3
"""
Add watermark to PDF pages.

Usage:
    python add_watermark.py input.pdf output.pdf "CONFIDENTIAL"
    python add_watermark.py input.pdf output.pdf "DRAFT" --opacity 0.3
    python add_watermark.py input.pdf output.pdf "COPY" --rotation 45
"""

import sys
import argparse
import io
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


def create_watermark(text, opacity=0.5, rotation=45, font_size=60):
    """Create a watermark PDF."""
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)

    # Set watermark properties
    c.setFont("Helvetica", font_size)
    c.setFillGray(opacity)

    # Position and rotate watermark
    c.saveState()
    c.translate(300, 400)
    c.rotate(rotation)
    c.drawCentredString(0, 0, text)
    c.restoreState()

    c.save()
    packet.seek(0)

    return PdfReader(packet)


def add_watermark(input_pdf, output_pdf, watermark_text, opacity=0.5, rotation=45):
    """Add watermark to all pages of PDF."""
    reader = PdfReader(input_pdf)
    writer = PdfWriter()

    # Create watermark
    print(f"Creating watermark: '{watermark_text}'...", file=sys.stderr)
    watermark = create_watermark(watermark_text, opacity, rotation)
    watermark_page = watermark.pages[0]

    # Add watermark to each page
    total_pages = len(reader.pages)
    print(f"Adding watermark to {total_pages} pages...", file=sys.stderr)

    for i, page in enumerate(reader.pages):
        print(f"  Processing page {i+1}/{total_pages}...", file=sys.stderr)
        page.merge_page(watermark_page)
        writer.add_page(page)

    # Write output
    print(f"Writing watermarked PDF to {output_pdf}...", file=sys.stderr)
    with open(output_pdf, 'wb') as output:
        writer.write(output)

    print(f"✓ Successfully added watermark to {total_pages} pages", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description='Add watermark to PDF')
    parser.add_argument('input', help='Input PDF file')
    parser.add_argument('output', help='Output PDF file')
    parser.add_argument('text', help='Watermark text')
    parser.add_argument('--opacity', type=float, default=0.5,
                       help='Watermark opacity (0.0-1.0, default: 0.5)')
    parser.add_argument('--rotation', type=int, default=45,
                       help='Watermark rotation in degrees (default: 45)')
    parser.add_argument('--font-size', type=int, default=60,
                       help='Font size (default: 60)')

    args = parser.parse_args()

    # Validate opacity
    if not 0 <= args.opacity <= 1:
        print("Error: Opacity must be between 0.0 and 1.0", file=sys.stderr)
        sys.exit(1)

    try:
        add_watermark(
            args.input,
            args.output,
            args.text,
            args.opacity,
            args.rotation
        )
    except FileNotFoundError:
        print(f"Error: File '{args.input}' not found", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
