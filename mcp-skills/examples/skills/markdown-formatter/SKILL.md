---
name: markdown-formatter
description: Markdown formatting and linting guide with CommonMark specification and GitHub Flavored Markdown. Format .md files, fix syntax issues, generate tables of contents. Use when working with markdown files, README files, documentation, or when user needs markdown formatting help.
version: 1.0.0
---

# Markdown Formatter

This skill helps format, validate, and improve markdown documents.

## Quick Start

### Basic Formatting Rules

1. **Headers**: Use ATX-style headers (`#`, `##`, etc.)
2. **Lists**: Consistent indentation (2 or 4 spaces)
3. **Code blocks**: Always specify language for syntax highlighting
4. **Links**: Use descriptive text, not "click here"

## Generate Table of Contents

```python
def generate_toc(markdown_content):
    """Generate TOC from markdown headers"""
    lines = markdown_content.split('\n')
    toc = []

    for line in lines:
        if line.startswith('#'):
            level = len(line.split()[0])
            title = line.lstrip('#').strip()
            anchor = title.lower().replace(' ', '-')
            indent = '  ' * (level - 1)
            toc.append(f"{indent}- [{title}](#{anchor})")

    return '\n'.join(toc)
```

## Fix Common Issues

### Fix List Indentation

```python
def fix_list_indentation(content):
    """Ensure consistent 2-space indentation"""
    lines = content.split('\n')
    fixed = []

    for line in lines:
        if line.strip().startswith('-') or line.strip().startswith('*'):
            # Count leading spaces
            spaces = len(line) - len(line.lstrip())
            # Normalize to multiple of 2
            normalized = (spaces // 2) * 2
            fixed.append(' ' * normalized + line.lstrip())
        else:
            fixed.append(line)

    return '\n'.join(fixed)
```

### Add Language to Code Blocks

```python
def add_code_language(content, default_lang='bash'):
    """Add language specifier to code blocks"""
    return content.replace('```\n', f'```{default_lang}\n')
```

## Best Practices

1. **One sentence per line**: Makes diffs cleaner
2. **Empty line before/after headers**: Improves readability
3. **Consistent list markers**: Pick `-` or `*`, stick with it
4. **Code block languages**: Always specify for syntax highlighting
5. **Link references**: Use reference-style for repeated URLs

## Tools

Use these tools for markdown work:
- `markdownlint`: Linting and style checking
- `prettier`: Auto-formatting
- `markdown-toc`: Generate table of contents
- `remark`: Powerful markdown processor

## Example Workflow

```python
def format_markdown_file(input_file, output_file):
    """Complete markdown formatting workflow"""
    with open(input_file, 'r') as f:
        content = f.read()

    # Fix common issues
    content = fix_list_indentation(content)
    content = add_code_language(content)

    # Generate TOC
    toc = generate_toc(content)

    # Insert TOC after first header
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('# '):
            lines.insert(i + 1, '\n## Table of Contents\n\n' + toc + '\n')
            break

    # Write result
    with open(output_file, 'w') as f:
        f.write('\n'.join(lines))
```
