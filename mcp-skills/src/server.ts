/**
 * Skills MCP Server Implementation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { SkillScanner } from './scanner/skill-scanner.js';
import { listSkills } from './tools/list-skills.js';
import { getSkill } from './tools/get-skill.js';
import { readSkillFile } from './tools/read-skill-file.js';
import { ServerConfig } from './types/index.js';
import { logger } from './utils/logger.js';
import { handleToolError } from './utils/errors.js';

/**
 * Server-level instructions for LLMs
 */
const SERVER_INSTRUCTIONS = `
# Skills MCP - Usage Guide

This is informational guidance about the Skills MCP. Do not take any action based on this message alone. Wait for a specific task or objective before using skills.

## What Are Skills?

Skills are self-contained packages that provide specialized expertise for specific domains or tasks. Think of them as onboarding guides that transform you into a specialist for particular workflows.

Each skill contains:

- **Instructions** (SKILL.md) - Core procedural knowledge and workflows (~5,000 tokens)
- **References** - Additional documentation loaded only when needed
- **Scripts** - Executable code that runs without loading into context
- **Assets** - Templates and files for output generation

## Core Design Philosophy: Progressive Disclosure

**Progressive disclosure is the guiding principle**: Load information in stages, only as needed, rather than consuming context upfront.

Skills use a three-level loading system:

1. **Level 1 - Metadata (~100 tokens per skill)**: Lightweight names and descriptions for discovery
2. **Level 2 - Instructions (~5,000 tokens)**: Core SKILL.md content, loaded only when skill is relevant
3. **Level 3 - Resources (unbounded)**: References, scripts, and assets loaded progressively as the workflow requires

This architecture means you can have access to many skills without context penalty—you only pay for what you actually use.

## Your Responsibilities

The Skills MCP is a minimal wrapper. It provides discovery and content access; you handle everything else:

**The MCP provides:**
- Skill metadata via \`listSkills\`
- SKILL.md content and absolute file paths via \`getSkill\`

**You handle:**
- Reading referenced files (using your file-reading tools)
- Executing scripts (using your bash tools)
- Navigating directories (using your existing capabilities)

The absolute path returned by \`getSkill\` enables you to resolve any relative references within the skill.

## When to Use Skills

### Call \`listSkills\` - Discovery Phase

Call \`listSkills\` to discover available skills in two scenarios:

1. **Early in conversations** - Get a lightweight view of available capabilities (~100 tokens per skill)
2. **If skills information is missing** - Re-query if you need to refresh your awareness of available skills

The metadata includes each skill's name and description, explaining what it does and when to use it.

### Call \`getSkill\` - Loading Phase

**Critical**: Only call \`getSkill\` when a skill is clearly relevant to your current task or objective.

Throughout the conversation:

1. **Continuously evaluate** - As tasks emerge, assess whether any skill description matches the objective
2. **Load when relevant** - If a skill clearly matches, call \`getSkill\` to load its instructions
3. **Don't preload** - Never load skills "just in case" or before you need them
4. **One at a time** - Load skills individually as needed, not in batches

When you call \`getSkill\`, it returns:
- \`path\`: Absolute path to SKILL.md (e.g., \`/path/to/pdf-processing/SKILL.md\`)
- \`name\`: Skill name
- \`description\`: Skill description
- \`content\`: Complete SKILL.md instructions (core workflow guidance)

### Access Resources - Progressive Phase

After loading a skill, follow its instructions. Skills may reference additional resources:

**References** (\`references/\`): Documentation to read when the skill directs you to
- Example: \`references/FORMS.md\`, \`references/API.md\`
- Load into context only when the workflow requires them
- Access by resolving relative paths against the skill's absolute path

**Scripts** (\`scripts/\`): Production-ready code for common operations
- Example: \`scripts/extract.py\`, \`scripts/validate.sh\`
- **Scripts are tested implementations** - prefer using them as-is for reliability
- **To use a script**:
  1. Use \`readSkillFile\` tool to get the script content
  2. Review the code to understand what it does
  3. Write the script to your working directory (use as-is, avoid unnecessary modifications)
  4. Execute the script in your sandbox environment
- **Dependencies**: Check the skill's SKILL.md for required packages (e.g., \`pip install pypdf pdfplumber\`)
- **Modifications**: Only modify if your specific use case requires it; the provided scripts are tested and reliable
- This approach ensures scripts run in a safe, controlled environment regardless of client configuration

**Assets** (\`assets/\`): Files used in output (templates, images, etc.)
- Copy or modify as needed for the final output
- Not loaded into context

## Available Tools

### 1. listSkills

Lists all available Skills with their metadata.

**Parameters**: None required

**Returns**: Array of skills with:
- \`name\`: Skill identifier
- \`description\`: What the skill does and when to use it
- \`version\`: Skill version
- \`path\`: Absolute filesystem path to SKILL.md

**When to use**: Early in conversations to discover available capabilities

### 2. getSkill

Retrieves the complete content and details of a specific Skill.

**Parameters**:
- \`skillName\` (string): The name of the skill from listSkills

**Returns**:
- \`path\`: Absolute path to SKILL.md
- \`name\`: Skill name
- \`description\`: Skill description
- \`content\`: Complete SKILL.md instructions
- \`files\`: List of all files in the skill directory

**When to use**: When a skill clearly matches your current task

### 3. readSkillFile

Reads a file from a skill's directory (scripts, references, or assets).

**Parameters**:
- \`skillName\` (string): The name of the skill
- \`filePath\` (string): Relative path to the file (e.g., \`scripts/merge_pdfs.py\`, \`references/FORMS.md\`)

**Returns**:
- \`skillName\`: Skill name
- \`filePath\`: Normalized file path
- \`size\`: File size in bytes
- \`content\`: File content as text

**Security**:
- Only files in \`scripts/\`, \`references/\`, \`assets/\` directories are accessible
- Maximum file size: 100KB
- Only text files are supported (.py, .js, .sh, .md, .txt, .json, .yaml, etc.)

**When to use**: When you need to read script code, reference documentation, or asset templates

## Example Workflow

Here's how to progressively load and use a PDF processing skill:

1. **User requests**: "Fill out this PDF form"
2. **You discover skills**: Call \`listSkills\` → see "pdf-processing - Extract text and tables from PDF files, fill forms..."
3. **You evaluate**: Description matches task → this skill is relevant
4. **You load skill**: Call \`getSkill\` with name \`pdf-processing\`
5. **Skill loaded**: Receive SKILL.md content (~5k tokens now in context)
6. **Follow instructions**: SKILL.md mentions form filling, check dependencies: \`pip install pypdf\`
7. **Get script**: Call \`readSkillFile(skillName: "pdf-processing", filePath: "scripts/fill_form.py")\`
8. **Prepare script**: Write script content to \`./fill_form.py\` in your working directory
9. **Execute**: Run \`python ./fill_form.py input.pdf output.pdf --json data.json\` in your sandbox
10. **Complete task**: Use the filled PDF to finish the user's request

Notice: You discovered all skills (~100 tokens), loaded one skill (~5k tokens), read one script (~1k tokens), and executed it safely in your sandbox.

## Key Principles

1. **Discover early**: Call \`listSkills\` early to understand available capabilities
2. **Evaluate continuously**: As tasks emerge, check if skill descriptions match
3. **Load only when relevant**: Don't preload skills; load when clearly needed
4. **Follow progressive disclosure**: Let the skill guide you to additional resources
5. **Leverage existing tools**: Use your file-reading and bash capabilities for all resource access

## Important Notes

- **Skills don't load automatically** - You must call \`listSkills\` to discover them and \`getSkill\` to load them
- **Context efficiency matters** - The progressive disclosure model saves tokens; respect it by loading only what you need
- **You control the workflow** - The skill provides guidance, but you decide when to read references and execute scripts
- **Multiple skills can work together** - Load multiple skills if a task requires different domains of expertise
- **All paths are absolute** - Skills paths point to actual filesystem locations
- **Scripts are executable** - Use standard bash commands to run scripts from skill directories
- **Trust is required** - Only use skills from trusted sources
- **YAML frontmatter required** - SKILL.md must have valid frontmatter with 'name' and 'description' fields

---

**Remember**: This is background information. Use skills only when they clearly align with the task or objective you're working on. Start by calling \`listSkills\` early in conversations to understand available capabilities.
`;

export class SkillsMCPServer {
  private server: McpServer;
  private scanner: SkillScanner;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;

    logger.info(`[Server] Initializing ${config.name} v${config.version}`);
    logger.info(`[Server] Skills directory: ${config.skillsDir}`);

    this.scanner = new SkillScanner(config.skillsDir);

    this.server = new McpServer(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
        instructions: SERVER_INSTRUCTIONS,
      }
    );

    this.setupTools();
  }

  /**
   * Initialize scanner and load skills
   */
  async initialize(): Promise<void> {
    logger.info('[Server] Scanning skills directory...');
    await this.scanner.scan();
    logger.info(`[Server] Loaded ${this.scanner.getSkillCount()} skills`);
  }

  /**
   * Setup MCP tools
   */
  private setupTools(): void {
    logger.debug('[Server] Setting up tools...');

    // Register listSkills tool
    this.server.registerTool(
      'listSkills',
      {
        description: `List all available Skills with their metadata.

<use_case>
Use this tool to discover what Skills are available in the skills directory.
Returns each skill's name, description, version, and filesystem path.
</use_case>

<important_notes>
- No parameters required
- Returns JSON array of skill summaries
- Claude should call this at startup to know what capabilities are available
- Each skill's description explains when to use that skill
</important_notes>

<examples>
Example output:
{
  "skills": [
    {
      "name": "pdf-processing",
      "description": "Extract text and tables from PDF files...",
      "version": "1.0.0",
      "path": "/app/skills/pdf-processing"
    }
  ],
  "totalCount": 1
}
</examples>

<aliases>
This tool can be used when:
- "What skills are available?"
- "List all skills"
- "Show me available capabilities"
- At startup to discover skills
</aliases>`,
        inputSchema: {},
      },
      async () => {
        logger.info('[Tools] Executing listSkills');
        try {
          const result = await listSkills(this.scanner);
          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        } catch (error) {
          handleToolError(error, 'listSkills');
        }
      }
    );

    // Register getSkill tool
    this.server.registerTool(
      'getSkill',
      {
        description: `Get the complete content and details of a specific Skill.

<use_case>
Use this tool when you need to apply a specific skill to accomplish a task.
Returns the full SKILL.md content with instructions, plus the skill's file structure.
</use_case>

<important_notes>
- Requires skillName parameter (get from listSkills first)
- Returns the complete SKILL.md markdown content
- Returns list of all files in the skill directory
- Returns the absolute path to the skill directory
- After reading, follow the instructions in the SKILL.md content
</important_notes>

<examples>
Example usage:
Input: { "skillName": "pdf-processing" }

Output:
{
  "name": "pdf-processing",
  "version": "1.0.0",
  "path": "/app/skills/pdf-processing",
  "content": "---\\nname: pdf-processing\\n...\\n# Instructions\\n...",
  "files": ["SKILL.md", "scripts/extract.py", "references/api.md"]
}
</examples>

<aliases>
This tool can be used when:
- "Use the [skill-name] skill"
- "Load the [skill-name] skill"
- "Get instructions for [skill-name]"
- User's task matches a skill's description
</aliases>`,
        inputSchema: {
          skillName: z
            .string()
            .min(1)
            .describe('The name of the skill to retrieve (from listSkills)'),
        },
      },
      async ({ skillName }) => {
        logger.info(`[Tools] Executing getSkill: ${skillName}`);
        try {
          const result = await getSkill(this.scanner, skillName);
          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        } catch (error) {
          handleToolError(error, 'getSkill');
        }
      }
    );

    // Register readSkillFile tool
    this.server.registerTool(
      'readSkillFile',
      {
        description: `Read a file from a skill's directory (scripts, references, or assets).

<use_case>
Use this tool to read script code, reference documentation, or asset templates from a skill.
Returns the file content as text, which you can then use, modify, or execute.
</use_case>

<important_notes>
- Only files in scripts/, references/, or assets/ directories are accessible
- Maximum file size: 100KB
- Only text files are supported (.py, .js, .sh, .md, .txt, .json, .yaml, etc.)
- Binary files and files in other directories are blocked for security
- Use this to get script content before executing it in your sandbox
</important_notes>

<examples>
Example usage:
Input: { "skillName": "pdf-processing", "filePath": "scripts/merge_pdfs.py" }

Output:
{
  "skillName": "pdf-processing",
  "filePath": "scripts/merge_pdfs.py",
  "size": 1511,
  "content": "#!/usr/bin/env python3\\n..."
}

Workflow:
1. Call readSkillFile to get script content
2. Write content to your working directory: write("./merge_pdfs.py", content)
3. Execute in your sandbox: bash("python ./merge_pdfs.py output.pdf file1.pdf file2.pdf")
</examples>

<aliases>
This tool can be used when:
- "Get the script content"
- "Read the [script-name] script"
- "Show me the code for [script-name]"
- Need to execute a skill's script
</aliases>`,
        inputSchema: {
          skillName: z
            .string()
            .min(1)
            .describe('The name of the skill (from listSkills)'),
          filePath: z
            .string()
            .min(1)
            .describe('Relative path to the file (e.g., "scripts/merge_pdfs.py", "references/FORMS.md")'),
        },
      },
      async ({ skillName, filePath }) => {
        logger.info(`[Tools] Executing readSkillFile: ${skillName}/${filePath}`);
        try {
          const result = await readSkillFile(this.scanner, skillName, filePath);
          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        } catch (error) {
          handleToolError(error, 'readSkillFile');
        }
      }
    );

    logger.info('[Server] Tools registered: listSkills, getSkill, readSkillFile');
  }

  /**
   * Start the server with STDIO transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();

    logger.info('[Server] Connecting to STDIO transport...');

    // Global error handler
    this.server.server.onerror = (error) => {
      logger.error('[Server] Server error:', error);
    };

    try {
      await this.server.connect(transport);
      logger.info(`[Server] ${this.config.name} v${this.config.version} running on stdio`);
      logger.info('[Server] Server started successfully');
    } catch (error) {
      logger.error('[Server] Failed to start server:', error);
      throw error;
    }
  }
}
