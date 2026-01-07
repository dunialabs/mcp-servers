# Skills MCP - Usage Guide

## Local Testing

### 1. Quick Test with Example Skills

```bash
# Install dependencies
npm install

# Test with example skills
skills_dir=./examples/skills npm start
```

You should see output like:
```
[INFO] Starting Skills MCP Server...
[INFO] Skills directory: ./examples/skills
[INFO] Loaded 2 skills
[INFO] Server started successfully
```

### 2. Configure in Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "skills": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-servers/mcp-skills/dist/stdio.js"
      ],
      "env": {
        "skills_dir": "/Users/your-username/skills"
      }
    }
  }
}
```

**Important:** Use absolute paths!

### 3. Test with Docker

```bash
# Build the image
npm run docker:build

# Run with example skills
docker run -i --rm \
  -v "$(pwd)/examples/skills:/app/skills:ro" \
  -e "skills_dir=/app/skills" \
  mcp-skills:local
```

Or use docker-compose:

```bash
# Set your skills directory
export SKILLS_DIR=/Users/your-username/skills

# Run
docker-compose up
```

## Creating Your First Skill

### Step 1: Create Skill Directory

```bash
mkdir -p ~/skills/my-first-skill
```

### Step 2: Create SKILL.md

Create `~/skills/my-first-skill/SKILL.md`:

```markdown
---
name: my-first-skill
description: My first custom skill for testing. Use when I ask about my-first-skill.
version: 1.0.0
---

# My First Skill

This is a test skill to verify Skills MCP is working.

## Instructions

When using this skill:
1. Say hello
2. Explain what this skill does
3. Confirm it's working correctly

## Example

User: "Use my first skill"
Response: "Hello! I'm using your first custom skill. It's working correctly!"
```

### Step 3: Configure Skills MCP

Point to your skills directory:

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

### Step 4: Restart Claude Desktop

1. Quit Claude Desktop completely
2. Start Claude Desktop again
3. Wait for MCP servers to initialize

### Step 5: Test It

In Claude Desktop, ask:
> "What skills are available?"

Claude should list `my-first-skill` along with any other skills.

Then ask:
> "Use my first skill"

Claude should load the skill and respond according to the instructions.

## Docker Configuration Examples

### macOS/Linux

```json
{
  "mcpServers": {
    "skills": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "/Users/username/skills:/app/skills:ro",
        "-e", "skills_dir=/app/skills",
        "ghcr.io/dunialabs/mcp-servers/skills:latest"
      ]
    }
  }
}
```

### Windows (WSL)

```json
{
  "mcpServers": {
    "skills": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "/mnt/c/Users/username/skills:/app/skills:ro",
        "-e", "skills_dir=/app/skills",
        "ghcr.io/dunialabs/mcp-servers/skills:latest"
      ]
    }
  }
}
```

### Windows (Native)

```json
{
  "mcpServers": {
    "skills": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "C:/Users/username/skills:/app/skills:ro",
        "-e", "skills_dir=/app/skills",
        "ghcr.io/dunialabs/mcp-servers/skills:latest"
      ]
    }
  }
}
```

## Troubleshooting

### Skills not found

**Problem:** Server starts but finds 0 skills

**Solutions:**
1. Check directory path is correct and absolute
2. Ensure directories contain `SKILL.md` files
3. Check SKILL.md has valid YAML frontmatter
4. Check file permissions

### Docker permission denied

**Problem:** Docker can't access skills directory

**Solutions:**
1. Open Docker Desktop → Settings → Resources → File Sharing
2. Add your skills directory to shared paths
3. Restart Docker Desktop
4. Try again

### Server won't start

**Problem:** Server crashes on startup

**Solutions:**
1. Check logs for error messages
2. Verify skills_dir environment variable is set
3. Test with example skills first: `skills_dir=./examples/skills npm start`
4. Check Node.js version (requires >=18.0.0)

### Invalid skill format

**Problem:** Skill loads but shows warnings

**Common issues:**
- Missing frontmatter (must start with `---`)
- Missing `name` or `description` field
- Invalid `name` (must be lowercase, alphanumeric, hyphens only)
- Description too long (max 1024 chars)

**Example valid frontmatter:**
```yaml
---
name: my-skill
description: Short description of what this skill does
version: 1.0.0
---
```

## MCP Inspector Testing

Use MCP Inspector for detailed testing:

```bash
# Install MCP Inspector globally
npx @modelcontextprotocol/inspector node dist/stdio.js

# With environment variable
skills_dir=./examples/skills npx @modelcontextprotocol/inspector node dist/stdio.js
```

Then in the inspector:
1. Call `listSkills` - should return all skills
2. Call `getSkill` with `skillName` parameter
3. Verify responses match expected format

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `skills_dir` | Path to skills directory | `/app/skills` | Yes |
| `LOG_LEVEL` | Logging verbosity | `info` | No |
| `NODE_ENV` | Node environment | `production` | No |

## Advanced: Multiple Skills Directories

Skills MCP currently supports one directory at a time. To use multiple directories:

**Option 1:** Combine skills into one directory

```bash
# Create main skills directory
mkdir ~/skills

# Link or copy skills from multiple sources
ln -s ~/projects/project-a/skills ~/skills/project-a-skills
ln -s ~/projects/project-b/skills ~/skills/project-b-skills
```

**Option 2:** Run multiple MCP servers

```json
{
  "mcpServers": {
    "skills-project-a": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "/Users/me/project-a/skills:/app/skills:ro",
        "-e", "skills_dir=/app/skills",
        "ghcr.io/dunialabs/mcp-servers/skills:latest"
      ]
    },
    "skills-project-b": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "/Users/me/project-b/skills:/app/skills:ro",
        "-e", "skills_dir=/app/skills",
        "ghcr.io/dunialabs/mcp-servers/skills:latest"
      ]
    }
  }
}
```

## Next Steps

- See [README.md](./README.md) for full documentation
- Check [examples/skills/](./examples/skills/) for sample skills
- Read [docs/skills-mcp-design.md](../docs/skills-mcp-design.md) for architecture details
- Visit [Claude Skills Documentation](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) for official guides
