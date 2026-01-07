/**
 * listSkills tool implementation
 */

import { SkillScanner } from '../scanner/skill-scanner.js';
import { logger } from '../utils/logger.js';

export async function listSkills(scanner: SkillScanner): Promise<string> {
  logger.info('[Tools] Executing listSkills');

  const skills = scanner.getSkillSummaries();
  const totalCount = scanner.getSkillCount();

  const result = {
    skills,
    totalCount,
  };

  return JSON.stringify(result, null, 2);
}
