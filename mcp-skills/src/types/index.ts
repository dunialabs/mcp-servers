/**
 * Type definitions for Skills MCP Server
 */

/**
 * Skill metadata from SKILL.md frontmatter
 */
export interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  [key: string]: unknown;
}

/**
 * Complete skill information
 */
export interface Skill {
  name: string;
  description: string;
  version: string;
  path: string;
  content: string;
  files: string[];
}

/**
 * Skill summary for listing
 */
export interface SkillSummary {
  name: string;
  description: string;
  version: string;
  path: string;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  name: string;
  version: string;
  skillsDir: string;
}
