/**
 * readSkillFile tool implementation
 * Reads a file from a skill's directory (scripts, references, or assets)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { SkillScanner } from '../scanner/skill-scanner.js';
import { SkillError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Maximum file size: 100KB
const MAX_FILE_SIZE = 100 * 1024;

// Allowed directories (whitelist)
const ALLOWED_DIRS = ['scripts', 'references', 'assets'];

// Allowed text file extensions
const ALLOWED_EXTENSIONS = [
  '.py',
  '.js',
  '.ts',
  '.sh',
  '.bash',
  '.md',
  '.txt',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.csv',
  '.sql',
];

export async function readSkillFile(
  scanner: SkillScanner,
  skillName: string,
  filePath: string
): Promise<string> {
  logger.info(`[Tools] Executing readSkillFile: ${skillName}/${filePath}`);

  // Get the skill
  const skill = scanner.getSkill(skillName);
  if (!skill) {
    throw new SkillError(
      `Skill '${skillName}' not found. Use listSkills to see available skills.`,
      'SKILL_NOT_FOUND'
    );
  }

  // Normalize the file path (remove leading slashes, resolve ..)
  const normalizedPath = path.normalize(filePath).replace(/^\/+/, '');

  // Check if path tries to escape the skill directory
  if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
    throw new SkillError(
      `Invalid file path: '${filePath}'. Path must be relative and cannot contain '..'`,
      'INVALID_PATH'
    );
  }

  // Check if the path starts with an allowed directory
  const firstDir = normalizedPath.split('/')[0];
  if (!ALLOWED_DIRS.includes(firstDir)) {
    throw new SkillError(
      `Access denied: '${filePath}'. Only files in ${ALLOWED_DIRS.join(', ')} directories can be read.`,
      'ACCESS_DENIED'
    );
  }

  // Check file extension
  const ext = path.extname(normalizedPath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new SkillError(
      `Unsupported file type: '${ext}'. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
      'UNSUPPORTED_FILE_TYPE'
    );
  }

  // Construct absolute path
  const absolutePath = path.join(skill.path, normalizedPath);

  try {
    // Check if file exists and get stats
    const stats = await fs.stat(absolutePath);

    // Check if it's a file (not a directory)
    if (!stats.isFile()) {
      throw new SkillError(
        `Not a file: '${filePath}'`,
        'NOT_A_FILE'
      );
    }

    // Check file size
    if (stats.size > MAX_FILE_SIZE) {
      throw new SkillError(
        `File too large: '${filePath}' (${stats.size} bytes). Maximum allowed: ${MAX_FILE_SIZE} bytes`,
        'FILE_TOO_LARGE'
      );
    }

    // Read file content
    const content = await fs.readFile(absolutePath, 'utf-8');

    logger.info(`[Tools] Successfully read file: ${skillName}/${filePath} (${stats.size} bytes)`);

    const result = {
      skillName,
      filePath: normalizedPath,
      size: stats.size,
      content,
    };

    return JSON.stringify(result, null, 2);
  } catch (error) {
    if (error instanceof SkillError) {
      throw error;
    }

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new SkillError(
        `File not found: '${filePath}' in skill '${skillName}'`,
        'FILE_NOT_FOUND'
      );
    }

    throw new SkillError(
      `Failed to read file '${filePath}': ${error instanceof Error ? error.message : String(error)}`,
      'READ_ERROR'
    );
  }
}
