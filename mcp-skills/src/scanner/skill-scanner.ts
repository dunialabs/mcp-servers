/**
 * Skills directory scanner
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Skill, SkillSummary } from '../types/index.js';
import { parseFrontmatter } from '../parser/frontmatter.js';
import { logger } from '../utils/logger.js';
import { SkillError } from '../utils/errors.js';

export class SkillScanner {
  private skillsDir: string;
  private skills: Map<string, Skill>;

  constructor(skillsDir: string) {
    this.skillsDir = skillsDir;
    this.skills = new Map();
  }

  /**
   * Scan skills directory and load all skills
   */
  async scan(): Promise<void> {
    logger.info(`[Scanner] Scanning skills directory: ${this.skillsDir}`);

    try {
      // Check if directory exists
      try {
        await fs.access(this.skillsDir);
      } catch {
        throw new SkillError(
          `Skills directory not found: ${this.skillsDir}`,
          'DIRECTORY_NOT_FOUND'
        );
      }

      // Recursively find all SKILL.md files
      const skillFiles = await this.findSkillFiles(this.skillsDir);

      logger.info(`[Scanner] Found ${skillFiles.length} SKILL.md files`);

      // Parse each skill file
      for (const skillFile of skillFiles) {
        try {
          const skill = await this.loadSkill(skillFile);
          this.skills.set(skill.name, skill);
          logger.debug(`[Scanner] Loaded skill: ${skill.name}`);
        } catch (error) {
          logger.warn(
            `[Scanner] Failed to load skill from ${skillFile}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      logger.info(`[Scanner] Successfully loaded ${this.skills.size} skills`);
    } catch (error) {
      if (error instanceof SkillError) {
        throw error;
      }
      throw new SkillError(
        `Failed to scan skills directory: ${error instanceof Error ? error.message : String(error)}`,
        'SCAN_ERROR'
      );
    }
  }

  /**
   * Recursively find all SKILL.md files
   */
  private async findSkillFiles(dir: string): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subResults = await this.findSkillFiles(fullPath);
          results.push(...subResults);
        } else if (entry.name === 'SKILL.md') {
          results.push(fullPath);
        }
      }
    } catch (error) {
      logger.warn(
        `[Scanner] Failed to read directory ${dir}:`,
        error instanceof Error ? error.message : String(error)
      );
    }

    return results;
  }

  /**
   * Load and parse a single skill
   */
  private async loadSkill(skillFilePath: string): Promise<Skill> {
    try {
      // Read SKILL.md content
      const content = await fs.readFile(skillFilePath, 'utf-8');

      // Parse frontmatter
      const { metadata } = parseFrontmatter(content, skillFilePath);

      // Get skill directory path
      const skillDir = path.dirname(skillFilePath);

      // List all files in skill directory
      const files = await this.listSkillFiles(skillDir);

      return {
        name: metadata.name,
        description: metadata.description,
        version: metadata.version || '1.0.0',
        path: skillDir,
        content,
        files,
      };
    } catch (error) {
      if (error instanceof SkillError) {
        throw error;
      }
      throw new SkillError(
        `Failed to load skill from ${skillFilePath}: ${error instanceof Error ? error.message : String(error)}`,
        'LOAD_ERROR'
      );
    }
  }

  /**
   * List all files in skill directory (relative paths)
   */
  private async listSkillFiles(skillDir: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string, basePath: string = ''): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    }

    try {
      await walk(skillDir);
    } catch (error) {
      logger.warn(
        `[Scanner] Failed to list files in ${skillDir}:`,
        error instanceof Error ? error.message : String(error)
      );
    }

    return files.sort();
  }

  /**
   * Get all skills as summaries
   */
  getSkillSummaries(): SkillSummary[] {
    return Array.from(this.skills.values()).map((skill) => ({
      name: skill.name,
      description: skill.description,
      version: skill.version,
      path: skill.path,
    }));
  }

  /**
   * Get a specific skill by name
   */
  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * Get total count of loaded skills
   */
  getSkillCount(): number {
    return this.skills.size;
  }
}
