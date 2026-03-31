import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getServerVersion(): string {
  try {
    const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { version?: string };
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}
