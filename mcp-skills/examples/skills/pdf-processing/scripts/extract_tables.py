#!/usr/bin/env python3
"""
Extract tables from PDF files to CSV.

Usage:
    python extract_tables.py input.pdf output.csv
    python extract_tables.py input.pdf output.csv --all-pages
    python extract_tables.py input.pdf output.csv --page 3
"""

import sys
import argparse
import csv
import pdfplumber


def extract_tables_from_page(page, table_settings=None):
    """Extract all tables from a single page."""
    if table_settings:
        return page.extract_tables(table_settings)
    return page.extract_tables()


def extract_tables(pdf_path, page_num=None, all_pages=False, table_settings=None):
    """Extract tables from PDF."""
    all_tables = []

    with pdfplumber.open(pdf_path) as pdf:
        if page_num is not None:
            # Extract from specific page
            if page_num < 1 or page_num > len(pdf.pages):
                raise ValueError(f"Page {page_num} out of range (1-{len(pdf.pages)})")

            print(f"Extracting tables from page {page_num}...", file=sys.stderr)
            tables = extract_tables_from_page(pdf.pages[page_num - 1], table_settings)
            all_tables.extend(tables)

        elif all_pages:
            # Extract from all pages
            for i, page in enumerate(pdf.pages):
                print(f"Processing page {i+1}/{len(pdf.pages)}...", file=sys.stderr)
                tables = extract_tables_from_page(page, table_settings)
                if tables:
                    print(f"  Found {len(tables)} table(s)", file=sys.stderr)
                    all_tables.extend(tables)

        else:
            # Extract from first page only
            print("Extracting tables from first page...", file=sys.stderr)
            tables = extract_tables_from_page(pdf.pages[0], table_settings)
            all_tables.extend(tables)

    return all_tables


def save_tables_to_csv(tables, output_path):
    """Save tables to CSV file."""
    if not tables:
        print("Warning: No tables found", file=sys.stderr)
        return

    # If multiple tables, save the first one
    # (You could enhance this to save all tables to separate files)
    table = tables[0]

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(table)

    print(f"✓ Saved {len(table)} rows to {output_path}", file=sys.stderr)

    if len(tables) > 1:
        print(f"Note: Found {len(tables)} tables, saved first one only", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description='Extract tables from PDF to CSV')
    parser.add_argument('input', help='Input PDF file')
    parser.add_argument('output', help='Output CSV file')
    parser.add_argument('--page', type=int, help='Extract from specific page number')
    parser.add_argument('--all-pages', action='store_true', help='Extract from all pages')
    parser.add_argument('--strategy', choices=['lines', 'text'], default='lines',
                       help='Table detection strategy')

    args = parser.parse_args()

    try:
        # Configure table detection settings
        table_settings = {
            "vertical_strategy": args.strategy,
            "horizontal_strategy": args.strategy,
        }

        tables = extract_tables(
            args.input,
            page_num=args.page,
            all_pages=args.all_pages,
            table_settings=table_settings
        )

        save_tables_to_csv(tables, args.output)

    except FileNotFoundError:
        print(f"Error: File '{args.input}' not found", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
