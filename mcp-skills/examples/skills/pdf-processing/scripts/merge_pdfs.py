#!/usr/bin/env python3
"""
Merge multiple PDF files into one.

Usage:
    python merge_pdfs.py output.pdf file1.pdf file2.pdf file3.pdf
    python merge_pdfs.py merged.pdf *.pdf
"""

import sys
import argparse
from pypdf import PdfWriter


def merge_pdfs(pdf_files, output_path):
    """Merge multiple PDF files into one."""
    merger = PdfWriter()

    for i, pdf_file in enumerate(pdf_files):
        print(f"Adding {pdf_file} ({i+1}/{len(pdf_files)})...", file=sys.stderr)
        try:
            merger.append(pdf_file)
        except Exception as e:
            print(f"Warning: Failed to add {pdf_file}: {e}", file=sys.stderr)

    print(f"Writing merged PDF to {output_path}...", file=sys.stderr)
    with open(output_path, 'wb') as output:
        merger.write(output)

    merger.close()
    print(f"✓ Successfully merged {len(pdf_files)} files", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description='Merge multiple PDF files')
    parser.add_argument('output', help='Output PDF file')
    parser.add_argument('inputs', nargs='+', help='Input PDF files to merge')

    args = parser.parse_args()

    # Check if output file is in input files
    if args.output in args.inputs:
        print("Error: Output file cannot be one of the input files", file=sys.stderr)
        sys.exit(1)

    try:
        merge_pdfs(args.inputs, args.output)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
