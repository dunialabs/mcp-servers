#!/usr/bin/env python3
"""
Split PDF into individual pages or page ranges.

Usage:
    python split_pdf.py input.pdf output_dir/
    python split_pdf.py input.pdf output_dir/ --pages 1-3,5,7-9
    python split_pdf.py input.pdf output_dir/ --prefix chapter_
"""

import sys
import argparse
import os
from pypdf import PdfReader, PdfWriter


def parse_page_ranges(range_str, total_pages):
    """Parse page ranges like '1-3,5,7-9' into list of page numbers."""
    pages = []

    for part in range_str.split(','):
        if '-' in part:
            start, end = part.split('-')
            start, end = int(start), int(end)
            if start < 1 or end > total_pages:
                raise ValueError(f"Page range {start}-{end} out of bounds (1-{total_pages})")
            pages.extend(range(start, end + 1))
        else:
            page = int(part)
            if page < 1 or page > total_pages:
                raise ValueError(f"Page {page} out of bounds (1-{total_pages})")
            pages.append(page)

    return sorted(set(pages))


def split_pdf(input_pdf, output_dir, pages=None, prefix='page_'):
    """Split PDF into individual pages."""
    reader = PdfReader(input_pdf)
    total_pages = len(reader.pages)

    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Determine which pages to extract
    if pages:
        page_numbers = parse_page_ranges(pages, total_pages)
    else:
        page_numbers = range(1, total_pages + 1)

    print(f"Splitting {len(page_numbers)} pages from {input_pdf}...", file=sys.stderr)

    for page_num in page_numbers:
        writer = PdfWriter()
        writer.add_page(reader.pages[page_num - 1])

        output_path = os.path.join(output_dir, f"{prefix}{page_num}.pdf")
        with open(output_path, 'wb') as output:
            writer.write(output)

        print(f"  Created {output_path}", file=sys.stderr)

    print(f"✓ Successfully split {len(page_numbers)} pages", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description='Split PDF into individual pages')
    parser.add_argument('input', help='Input PDF file')
    parser.add_argument('output_dir', help='Output directory for split pages')
    parser.add_argument('--pages', help='Page ranges to extract (e.g., "1-3,5,7-9")')
    parser.add_argument('--prefix', default='page_', help='Prefix for output files')

    args = parser.parse_args()

    try:
        split_pdf(args.input, args.output_dir, args.pages, args.prefix)
    except FileNotFoundError:
        print(f"Error: File '{args.input}' not found", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
