# MCP Skills Server

An MCP (Model Context Protocol) server that brings filesystem-based Agent Skills to Claude Desktop, VS Code, Cursor, and other MCP-compatible platforms.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.23.0-green.svg)](https://github.com/modelcontextprotocol/sdk)

## Overview

This server implements the Agent Skills specification for MCP, enabling Claude to load specialized knowledge and workflows on-demand. Skills are self-contained packages with instructions, scripts, and resources that transform Claude into a domain expert.

### What Are Skills?

Skills teach Claude how to complete specific tasks in a repeatable way:
- 📄 **Document Processing**: Extract text from PDFs, fill forms, create presentations
- 🎨 **Content Creation**: Format markdown, design with brand guidelines
- 🔧 **Development**: API design patterns, code review checklists
- 📊 **Data Analysis**: Custom workflows and transformations

### How Skills Work

Skills are self-contained packages that provide specialized knowledge and production-ready code:

**📄 Instructions (SKILL.md)**
- Core procedural knowledge and workflows (~5,000 tokens)
- Explains when and how to use the skill
- Lists required dependencies

**📜 Scripts (scripts/)**
- Production-ready, tested implementations
- Claude reads script content via `readSkillFile` tool
- Executes in Claude's sandbox environment (not in MCP container)
- Examples: `merge_pdfs.py`, `extract_text.py`

**📚 References (references/)**
- Detailed documentation loaded only when needed
- API docs, advanced examples, troubleshooting guides

**🎨 Assets (assets/)**
- Templates, examples, and reusable files

**This approach keeps the MCP container lightweight (222MB)** while supporting scripts in any language - Python, Node.js, Ruby, Go, etc.

## Features

- 📁 **Filesystem-based**: Skills stored as simple directory structures with SKILL.md files
- 🔄 **Progressive Loading**: 3-level loading system (metadata → instructions → resources) minimizes context usage
- 🚀 **Docker Ready**: Production-ready container with security best practices
- 🎯 **Simple API**: 3 MCP tools - `listSkills`, `getSkill`, and `readSkillFile`
- 🔧 **Platform Agnostic**: Works with Claude Desktop, VS Code, Cursor, and custom MCP clients
- 📦 **Example Skills**: Includes 3 production-ready example skills to get started

## Quick Start

### Option 1: Using Docker (Recommended)

```bash
# Pull the image (when published)
docker pull ghcr.io/dunialabs/mcp-servers/skills:latest

# Or build locally
npm run docker:build
```

Configure in Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "skills": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "/Users/your-username/skills:/app/skills:ro",
        "-e", "skills_dir=/app/skills",
        "ghcr.io/dunialabs/mcp-servers/skills:latest"
      ]
    }
  }
}
```

### Option 2: Using Node.js

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
skills_dir=/path/to/your/skills npm start
```

Configure in Claude Desktop:

```json
{
  "mcpServers": {
    "skills": {
      "command": "node",
      "args": ["/path/to/mcp-skills/dist/stdio.js"],
      "env": {
        "skills_dir": "/Users/your-username/skills"
      }
    }
  }
}
```

## Skill Structure

Each skill is a directory containing a `SKILL.md` file:

```
my-skill/
├── SKILL.md              # Required: metadata + instructions
├── references/           # Optional: reference docs
│   └── api-docs.md
├── scripts/              # Optional: executable scripts
│   └── process.py
└── assets/               # Optional: templates, data
    └── template.json
```

### SKILL.md Format

```markdown
---
name: my-skill
description: Brief description of what this skill does and when to use it
version: 1.0.0
---

# My Skill

## Quick Start

Step-by-step instructions for using this skill...

## Examples

Concrete examples...
```

**Required frontmatter fields:**
- `name`: Lowercase, alphanumeric, hyphens only, max 64 chars
- `description`: Non-empty, max 1024 chars

## Available Tools

### listSkills

Lists all available skills with their metadata.

**Input:** None

**Output:**
```json
{
  "skills": [
    {
      "name": "pdf-processing",
      "description": "Extract text from PDFs...",
      "version": "1.0.0",
      "path": "/app/skills/pdf-processing"
    }
  ],
  "totalCount": 1
}
```

### getSkill

Retrieves complete skill content and details.

**Input:**
```json
{
  "skillName": "pdf-processing"
}
```

**Output:**
```json
{
  "name": "pdf-processing",
  "version": "1.0.0",
  "path": "/app/skills/pdf-processing",
  "content": "---\nname: pdf-processing\n...",
  "files": ["SKILL.md", "scripts/extract.py"]
}
```

## Usage Guide

### Using Skills in Claude

Once configured, Claude can discover and use skills:

1. **Discovery**: Claude calls `listSkills` early in conversations to see available capabilities
2. **Evaluation**: As tasks emerge, Claude checks if any skill matches
3. **Loading**: When relevant, Claude calls `getSkill` to load full instructions
4. **Script Access**: Claude uses `readSkillFile` to get script content
5. **Execution**: Claude writes scripts to its working directory and executes them in its sandbox

**Example conversation:**

```
User: "Extract the table data from quarterly-report.pdf"

Claude: [Calls listSkills → sees pdf-processing skill]
Claude: [Calls getSkill("pdf-processing") → loads instructions]
Claude: [Calls readSkillFile("pdf-processing", "scripts/extract_tables.py")]
Claude: [Writes script to ./extract_tables.py]
Claude: [Executes: python ./extract_tables.py quarterly-report.pdf output.csv]

I've extracted the tables to output.csv. The file contains...
```

### Progressive Loading

Skills use a 3-level loading system to minimize context usage:

**Level 1 - Metadata (~100 tokens per skill)**
- Loaded at startup via `listSkills`
- Skill name, description, version
- Zero cost for discovery

**Level 2 - Instructions (~5,000 tokens)**
- Loaded only when relevant via `getSkill`
- Full SKILL.md content
- Core procedural knowledge

**Level 3 - Resources (variable size)**
- Loaded progressively as workflow requires
- Scripts via `readSkillFile` (~400 tokens per script)
- References for detailed documentation
- Assets for templates and examples

### Testing the Server

Test the MCP server manually:

```bash
# Start server
skills_dir=./examples/skills npm start

# In another terminal, send MCP requests
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm start

# List skills
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"listSkills","arguments":{}}}' | npm start
```

Or use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) for visual debugging:

```bash
npx @modelcontextprotocol/inspector node dist/stdio.js
```

### Using with PetaConsole

PetaConsole provides a visual interface for managing Skills:

1. Log in to PetaConsole
2. Navigate to MCP Configuration → Skills Server
3. **Upload Skills:**
   - Drag & drop ZIP file or click to select
   - ZIP should contain directories with SKILL.md files
   - Maximum file size: 10MB
4. Console uploads to Core server, which extracts skills automatically
5. Skills are stored per server: `skills/{serverId}/`
6. Restart Claude Desktop to use new skills

**Supported ZIP structures:**

All of these work - backend automatically finds SKILL.md directories:

```
archive.zip                     archive.zip
└── pdf-processing/             └── projects/skills/
    └── SKILL.md                    └── pdf-processing/
                                        └── SKILL.md
```

**Skills Management UI:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Skills Directory                    Sort: Newest ↕  Delete All │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Drag & drop your skills ZIP file or click to select   │    │
│  │  (Maximum ZIP file size: 10MB)                         │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  pdf-processing                                          [Delete]│
│  PDF document processing and extraction                          │
│  v1.0.0 - Updated at 14:30 Jan 27, 2026                         │
│─────────────────────────────────────────────────────────────────│
│  data-analysis                                           [Delete]│
│  Data analysis and visualization                                 │
│  v1.2.0 - Updated at 10:15 Jan 26, 2026                         │
└─────────────────────────────────────────────────────────────────┘
```

**What happens behind the scenes:**

1. User uploads ZIP file via Console UI
2. Console sends ZIP (Base64 encoded) to Core server
3. Core extracts ZIP, finds all directories containing SKILL.md
4. Core copies skill directories to `skills/{serverId}/`
5. Skills MCP container mounts this directory (read-only)
6. Claude can access skills via MCP tools

**Architecture:**

```
Console                         Core                        Skills MCP
   │                             │                              │
   │  ── Upload ZIP ──►          │                              │
   │                             │  ── Extract to ──►           │
   │                             │     skills/{serverId}/       │
   │                             │           │                  │
   │                             │           └── Volume Mount ──►│
   │                             │              (read-only)     │
   │                                                            │
   │  ◄────────────── Claude calls listSkills/getSkill ─────────│
```

**Docker Configuration (generated by Core):**

```json
{
  "mcpServers": {
    "skills": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "/path/to/skills/{serverId}:/app/skills:ro",
        "-e",
        "skills_dir=/app/skills",
        "ghcr.io/dunialabs/mcp-servers/skills:latest"
      ]
    }
  }
}
```

**What each parameter means:**
- `docker run -i --rm`: Run container interactively, remove after exit
- `-v /path/to/skills/{serverId}:/app/skills:ro`: Mount server-specific skills directory as read-only
- `-e skills_dir=/app/skills`: Set environment variable for skills location
- `ghcr.io/dunialabs/mcp-servers/skills:latest`: Docker image to use

## Environment Variables

- `skills_dir`: Path to skills directory (required, default: `/app/skills`)
- `LOG_LEVEL`: Logging level (optional, default: `info`)
- `NODE_ENV`: Node environment (optional, default: `production`)

## Development

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Format
npm run format
```

## Versioning

The server version is read from `package.json` at runtime. Update the package version before
publishing so server metadata and release artifacts stay aligned.

## Docker Development

```bash
# Build image
npm run docker:build

# Run with docker-compose
SKILLS_DIR=/path/to/your/skills docker-compose up

# Or run directly
docker run -i --rm \
  -v /path/to/your/skills:/app/skills:ro \
  -e skills_dir=/app/skills \
  mcp-skills:local
```

## Example Skills

This repository includes 3 production-ready example skills in `examples/skills/`:

### 1. pdf-processing (v3.0.0)
Comprehensive PDF manipulation with 7 executable Python scripts:
- Extract text and tables from PDFs
- Merge/split documents
- Fill forms, add watermarks
- Encrypt/decrypt PDFs
- Scripts-based design with references directory

### 2. api-design (v1.0.0)
RESTful API design best practices:
- Resource naming, HTTP methods, status codes
- Filtering, pagination, versioning patterns
- Authentication/authorization
- Security and OpenAPI documentation

### 3. markdown-formatter (v1.0.0)
Markdown formatting and linting guide:
- CommonMark specification
- GitHub Flavored Markdown
- Best practices for documentation

```bash
examples/skills/
├── pdf-processing/          # 363 lines + 7 scripts + 3 references
│   ├── SKILL.md
│   ├── README.md
│   ├── scripts/
│   │   ├── extract_text.py
│   │   ├── extract_tables.py
│   │   ├── merge_pdfs.py
│   │   ├── split_pdf.py
│   │   ├── add_watermark.py
│   │   ├── protect_pdf.py
│   │   └── fill_form.py
│   └── references/
│       ├── library-guide.md
│       ├── advanced-examples.md
│       └── troubleshooting.md
├── api-design/
│   └── SKILL.md
└── markdown-formatter/
    └── SKILL.md
```

## Security Considerations

⚠️ **Only use Skills from trusted sources!**

Skills can execute code and access files. Treat them like installing software:
- Review all skill files before use
- Be cautious with skills that access external URLs
- Use read-only volume mounts (`:ro`) when running in Docker

## Creating Your Own Skills

### Basic Skill Template

```markdown
---
name: my-skill
description: Brief description of what this skill does and when to use it
version: 1.0.0
---

# My Skill

Quick overview of what this skill helps with.

## When to Use

- Use case 1
- Use case 2

## Quick Start

Step-by-step instructions:

1. First step...
2. Second step...

## Examples

### Example 1: Basic Usage

\`\`\`bash
# Command or code example
\`\`\`

### Example 2: Advanced Usage

\`\`\`python
# More complex example
\`\`\`

## Common Issues

**Problem**: Description of issue
**Solution**: How to resolve it
```

### Advanced: Skills with Scripts

For skills that need executable code:

```
my-skill/
├── SKILL.md                 # Instructions reference scripts
├── scripts/
│   ├── process.py          # Executable script
│   └── validate.sh
├── references/
│   └── api-docs.md         # Detailed docs
└── assets/
    └── template.json       # Templates
```

In SKILL.md, reference scripts:

```markdown
## Processing Data

Use the pre-built script:

\`\`\`bash
python scripts/process.py input.csv output.json
python scripts/process.py input.csv output.json --format pretty
\`\`\`
```

### Best Practices

1. **Keep SKILL.md under 500 lines** - Move detailed docs to `references/`
2. **Use scripts for deterministic operations** - Reduces context usage
3. **Write clear descriptions** - Include keywords Claude can match to tasks
4. **Provide examples** - Show concrete usage patterns
5. **Test thoroughly** - Validate skills work as expected

## Troubleshooting

### Skills directory not found

**Symptoms**: `SkillError: Skills directory not found`

**Solutions**:
- Use absolute paths (not relative): `/Users/username/skills` not `~/skills`
- Verify directory exists: `ls -la /path/to/skills`
- Docker: Check file sharing in Docker Desktop Preferences → Resources → File Sharing

### No skills loaded

**Symptoms**: `Loaded 0 skills` in logs

**Check**:
```bash
# Verify directory structure
find /path/to/skills -name "SKILL.md"

# Should output:
# /path/to/skills/my-skill/SKILL.md
# /path/to/skills/another-skill/SKILL.md
```

**Common issues**:
- SKILL.md must be in a subdirectory (not root)
- SKILL.md must have valid YAML frontmatter
- Frontmatter must include `name` and `description`

### Invalid frontmatter

**Symptoms**: Skills fail to load with parse errors

**Validation**:
```yaml
---
name: my-skill              # Required: lowercase, hyphens, max 64 chars
description: What it does   # Required: max 1024 chars
version: 1.0.0             # Optional but recommended
---
```

### Permission denied (Docker)

**Symptoms**: Cannot read skills directory in Docker

**Solutions**:
```bash
# Use read-only mount
-v /path/to/skills:/app/skills:ro

# Check Docker has permission to access directory
# macOS: System Preferences → Security & Privacy → Files and Folders → Docker
# Windows: Docker Desktop → Settings → Resources → File Sharing
```

### Server appears stuck

**This is normal!** MCP servers use STDIO transport and wait for JSON-RPC input.

**To verify it's working**:
```bash
# Check logs show successful startup
[INFO] Successfully loaded X skills
[INFO] Server started successfully

# Test with a simple request
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | skills_dir=./examples/skills npm start
```

### Skills not appearing in Claude Desktop

**Check Claude Desktop logs**:
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp*.log

# Windows
# Check: %APPDATA%\Claude\logs\
```

**Verify configuration**:
- Restart Claude Desktop after config changes
- Check `claude_desktop_config.json` syntax (valid JSON)
- Ensure server command is correct and executable

### Docker image fails to build

**Clear Docker cache**:
```bash
docker system prune -a
npm run docker:build
```

**Check Node.js version**:
```bash
node --version  # Should be 18.x or higher
```

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT

## Architecture

### Server Components

```
mcp-skills/
├── src/
│   ├── server.ts              # Main MCP server with instructions
│   ├── stdio.ts               # STDIO transport entry point
│   ├── scanner/
│   │   └── skill-scanner.ts   # Scans and loads skills
│   ├── parser/
│   │   └── frontmatter.ts     # Parses and validates SKILL.md
│   ├── tools/
│   │   ├── list-skills.ts     # listSkills implementation
│   │   └── get-skill.ts       # getSkill implementation
│   ├── types/
│   │   └── index.ts           # TypeScript definitions
│   └── utils/
│       ├── logger.ts          # Logging utilities
│       └── errors.ts          # Error handling
├── examples/skills/           # Example skills
├── Dockerfile                 # Production container
└── docker-compose.yml         # Local development
```

### Skills Loading Flow

```
1. Server startup
   └─> SkillScanner.scan()
       └─> Find all SKILL.md files recursively
       └─> Parse frontmatter from each
       └─> Validate required fields
       └─> Store metadata in memory

2. Client calls listSkills
   └─> Return cached metadata (Level 1)
       └─> ~100 tokens per skill

3. Client calls getSkill(name)
   └─> Read SKILL.md file (Level 2)
   └─> Return full content + file list
       └─> ~5,000 tokens

4. Client reads references/scripts as needed (Level 3)
   └─> Using standard file reading tools
   └─> Unbounded, loaded progressively
```

## Performance

### Context Usage

- **Discovery**: ~100 tokens per skill (all skills loaded)
- **Single skill**: ~5,000 tokens (SKILL.md content)
- **References**: Variable, loaded only when workflow requires

**Example with 10 skills**:
- Discovery: 1,000 tokens (all metadata)
- Using 1 skill: 6,000 tokens total (metadata + one skill)
- Using 3 skills: 16,000 tokens total (metadata + three skills)

### Optimization Tips

1. **Keep SKILL.md focused** - Core instructions only, ~500 lines max
2. **Use references/ for details** - Loaded only when needed
3. **Scripts for deterministic ops** - Execute without loading into context
4. **Clear descriptions** - Help Claude quickly identify relevant skills

## Related Resources

- **Agent Skills**:
  - [Anthropic Skills Repository](https://github.com/anthropics/skills)
  - [Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
  - [Claude Code Skills](https://code.claude.com/docs/en/skills)

- **Model Context Protocol**:
  - [MCP Documentation](https://modelcontextprotocol.io)
  - [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## FAQ

**Q: What's the difference between this and Claude's native skills?**
A: This MCP server brings the Agent Skills format to any MCP-compatible platform. Claude.ai and Claude API have native skills support, but this server enables skills in Claude Desktop, VS Code, Cursor, and other MCP clients.

**Q: Can I use Anthropic's official skills?**
A: Yes! Skills from Anthropic's official repository work with this server. Just clone the repo and point `skills_dir` to the `skills/` directory. Note licensing terms.

**Q: Do skills work offline?**
A: Yes, skills are filesystem-based. Once loaded, they work without network access (unless specific skills require external APIs).

**Q: How many skills can I have?**
A: Unlimited. Discovery loads only metadata (~100 tokens per skill), so 100 skills = ~10k tokens for discovery. Skills are loaded individually only when needed.

**Q: Can skills call other skills?**
A: Claude can load and use multiple skills in a single conversation. Skills don't call each other directly, but Claude can combine guidance from multiple skills.

**Q: How do I update skills?**
A: Edit the SKILL.md file or add/modify scripts and references. Changes take effect after restarting the MCP server (restart Claude Desktop or your MCP client).

## Support

For documentation and questions:
- 📚 **Anthropic Skills Repository**: https://github.com/anthropics/skills
- 🔧 **MCP Documentation**: https://modelcontextprotocol.io
- 📖 **Claude Platform Docs**: https://platform.claude.com/docs
