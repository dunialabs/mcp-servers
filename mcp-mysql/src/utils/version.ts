import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getServerVersion(): string {
  try {
    const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8')) as {
      version?: string;
    };
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}
