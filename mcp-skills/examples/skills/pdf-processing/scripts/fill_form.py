#!/usr/bin/env python3
"""
Fill PDF form fields.

Usage:
    python fill_form.py list input.pdf
    python fill_form.py fill input.pdf output.pdf data.json
    python fill_form.py fill input.pdf output.pdf --field name="John Doe" --field email="john@example.com"
"""

import sys
import argparse
import json
from pypdf import PdfReader, PdfWriter


def list_form_fields(pdf_path):
    """List all form fields in PDF."""
    reader = PdfReader(pdf_path)

    try:
        fields = reader.get_form_text_fields()

        if not fields:
            print("No form fields found in PDF", file=sys.stderr)
            return

        print(f"Found {len(fields)} form fields:\n")
        for field_name, field_value in fields.items():
            value = field_value if field_value else "(empty)"
            print(f"  {field_name}: {value}")

    except Exception as e:
        print(f"Error reading form fields: {e}", file=sys.stderr)
        sys.exit(1)


def fill_form_fields(input_pdf, output_pdf, field_data):
    """Fill PDF form fields with provided data."""
    reader = PdfReader(input_pdf)
    writer = PdfWriter()

    # Get existing fields
    existing_fields = reader.get_form_text_fields()

    print(f"Filling form fields...", file=sys.stderr)
    print(f"  Total fields in PDF: {len(existing_fields)}", file=sys.stderr)
    print(f"  Fields to fill: {len(field_data)}", file=sys.stderr)

    # Check for unknown fields
    unknown_fields = set(field_data.keys()) - set(existing_fields.keys())
    if unknown_fields:
        print(f"  Warning: Unknown fields: {', '.join(unknown_fields)}", file=sys.stderr)

    # Copy all pages
    writer.append(reader)

    # Update form fields on first page (you can extend this for multi-page forms)
    writer.update_page_form_field_values(
        writer.pages[0],
        field_data
    )

    # Write output
    with open(output_pdf, 'wb') as output:
        writer.write(output)

    print(f"✓ Form filled and saved to {output_pdf}", file=sys.stderr)


def parse_field_args(field_args):
    """Parse field arguments from command line."""
    field_data = {}

    for field_arg in field_args:
        if '=' not in field_arg:
            print(f"Error: Invalid field format '{field_arg}'. Use: name=value", file=sys.stderr)
            sys.exit(1)

        name, value = field_arg.split('=', 1)
        field_data[name] = value

    return field_data


def main():
    parser = argparse.ArgumentParser(description='Fill PDF form fields')
    subparsers = parser.add_subparsers(dest='command', help='Commands')

    # List command
    list_parser = subparsers.add_parser('list', help='List form fields')
    list_parser.add_argument('input', help='Input PDF file')

    # Fill command
    fill_parser = subparsers.add_parser('fill', help='Fill form fields')
    fill_parser.add_argument('input', help='Input PDF file')
    fill_parser.add_argument('output', help='Output PDF file')
    fill_parser.add_argument('--json', help='JSON file with field data')
    fill_parser.add_argument('--field', action='append',
                           help='Field data (e.g., --field name="John Doe")')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    try:
        if args.command == 'list':
            list_form_fields(args.input)

        elif args.command == 'fill':
            # Get field data from JSON file or command line
            if args.json:
                with open(args.json, 'r') as f:
                    field_data = json.load(f)
            elif args.field:
                field_data = parse_field_args(args.field)
            else:
                print("Error: Provide field data via --json or --field", file=sys.stderr)
                sys.exit(1)

            fill_form_fields(args.input, args.output, field_data)

    except FileNotFoundError as e:
        print(f"Error: File not found - {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
