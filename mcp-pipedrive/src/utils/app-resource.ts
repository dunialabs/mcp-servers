import { access, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getCandidatePaths(filename: string): string[] {
  return [
    path.resolve(__dirname, '..', '..', 'dist', 'ui', 'ui', filename),
    path.resolve(__dirname, '..', '..', 'dist', 'ui', filename),
    path.resolve(__dirname, '..', '..', 'ui-dist', filename),
  ];
}

export async function readAppHtml(filename: string): Promise<string> {
  const candidates = getCandidatePaths(filename);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return await readFile(candidate, 'utf8');
    } catch {
      // Try next candidate path.
    }
  }

  throw new Error(
    `Unable to load MCP App resource ${filename}. Run "npm run build:app" or "npm run build" first.`
  );
}
