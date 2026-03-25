import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function readAppHtml(filename: string): Promise<string> {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'dist', 'ui', filename),
    path.resolve(__dirname, '..', '..', 'dist', 'ui', 'ui', filename),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf8');
    } catch {
      continue;
    }
  }

  throw new Error(`Unable to load app resource ${filename}. Run "npm run build" first.`);
}
