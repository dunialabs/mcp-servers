/**
 * getSkill tool implementation
 */

import { SkillScanner } from '../scanner/skill-scanner.js';
import { SkillError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export async function getSkill(
  scanner: SkillScanner,
  skillName: string
): Promise<string> {
  logger.info(`[Tools] Executing getSkill: ${skillName}`);

  const skill = scanner.getSkill(skillName);

  if (!skill) {
    throw new SkillError(
      `Skill '${skillName}' not found. Use listSkills to see available skills.`,
      'SKILL_NOT_FOUND'
    );
  }

  const result = {
    name: skill.name,
    version: skill.version,
    path: skill.path,
    content: skill.content,
    files: skill.files,
  };

  return JSON.stringify(result, null, 2);
}
