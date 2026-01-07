#!/usr/bin/env python3
"""
Add or remove password protection from PDF files.

Usage:
    python protect_pdf.py encrypt input.pdf output.pdf mypassword
    python protect_pdf.py decrypt input.pdf output.pdf mypassword
"""

import sys
import argparse
from pypdf import PdfReader, PdfWriter


def encrypt_pdf(input_pdf, output_pdf, password):
    """Add password protection to PDF."""
    reader = PdfReader(input_pdf)
    writer = PdfWriter()

    print(f"Encrypting {len(reader.pages)} pages...", file=sys.stderr)

    for page in reader.pages:
        writer.add_page(page)

    # Encrypt with password
    writer.encrypt(password)

    with open(output_pdf, 'wb') as output:
        writer.write(output)

    print(f"✓ PDF encrypted and saved to {output_pdf}", file=sys.stderr)


def decrypt_pdf(input_pdf, output_pdf, password):
    """Remove password protection from PDF."""
    reader = PdfReader(input_pdf)

    if not reader.is_encrypted:
        print("Warning: PDF is not encrypted", file=sys.stderr)
        # Just copy it
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
    else:
        print("Decrypting PDF...", file=sys.stderr)

        # Try to decrypt
        if not reader.decrypt(password):
            print("Error: Incorrect password", file=sys.stderr)
            sys.exit(1)

        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)

    with open(output_pdf, 'wb') as output:
        writer.write(output)

    print(f"✓ PDF decrypted and saved to {output_pdf}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description='Encrypt or decrypt PDF files')
    parser.add_argument('action', choices=['encrypt', 'decrypt'],
                       help='Action to perform')
    parser.add_argument('input', help='Input PDF file')
    parser.add_argument('output', help='Output PDF file')
    parser.add_argument('password', help='Password for encryption/decryption')

    args = parser.parse_args()

    try:
        if args.action == 'encrypt':
            encrypt_pdf(args.input, args.output, args.password)
        else:
            decrypt_pdf(args.input, args.output, args.password)
    except FileNotFoundError:
        print(f"Error: File '{args.input}' not found", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
