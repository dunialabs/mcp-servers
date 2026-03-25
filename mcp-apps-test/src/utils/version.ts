import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function getServerVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJson = readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8');
    return (JSON.parse(packageJson) as { version?: string }).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}
