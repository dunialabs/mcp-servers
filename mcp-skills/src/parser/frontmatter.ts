/**
 * YAML frontmatter parser for SKILL.md files
 */

import matter from 'gray-matter';
import { SkillMetadata } from '../types/index.js';
import { SkillError } from '../utils/errors.js';

/**
 * Parse SKILL.md content and extract frontmatter
 */
export function parseFrontmatter(content: string, filePath: string): {
  metadata: SkillMetadata;
  content: string;
} {
  try {
    const { data, content: markdownContent } = matter(content);

    // Validate required fields
    if (!data.name || typeof data.name !== 'string') {
      throw new SkillError(
        `Missing or invalid 'name' field in ${filePath}`,
        'INVALID_FRONTMATTER'
      );
    }

    if (!data.description || typeof data.description !== 'string') {
      throw new SkillError(
        `Missing or invalid 'description' field in ${filePath}`,
        'INVALID_FRONTMATTER'
      );
    }

    // Validate name format (lowercase, alphanumeric, hyphens only)
    if (!/^[a-z0-9-]+$/.test(data.name)) {
      throw new SkillError(
        `Invalid skill name '${data.name}' in ${filePath}. Must contain only lowercase letters, numbers, and hyphens.`,
        'INVALID_NAME'
      );
    }

    // Validate name length
    if (data.name.length > 64) {
      throw new SkillError(
        `Skill name '${data.name}' in ${filePath} exceeds 64 characters`,
        'INVALID_NAME'
      );
    }

    // Validate description length
    if (data.description.length > 1024) {
      throw new SkillError(
        `Skill description in ${filePath} exceeds 1024 characters`,
        'INVALID_DESCRIPTION'
      );
    }

    const metadata: SkillMetadata = {
      name: data.name,
      description: data.description,
      version: data.version || '1.0.0',
      ...data,
    };

    return {
      metadata,
      content: markdownContent,
    };
  } catch (error) {
    if (error instanceof SkillError) {
      throw error;
    }
    throw new SkillError(
      `Failed to parse frontmatter in ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      'PARSE_ERROR'
    );
  }
}
