import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getCandidatePaths(filename: string): string[] {
  return [
    path.resolve(__dirname, '..', '..', 'dist', 'ui', filename),
    path.resolve(__dirname, '..', '..', 'dist', 'ui', 'ui', filename),
    path.resolve(__dirname, '..', '..', 'ui-dist', filename),
  ];
}

export async function readAppHtml(filename: string): Promise<string> {
  let lastError: unknown;

  for (const candidate of getCandidatePaths(filename)) {
    try {
      return await readFile(candidate, 'utf8');
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Unable to load MCP App resource "${filename}". Run "npm run build:app" or "npm run build" first. ${
      lastError instanceof Error ? lastError.message : ''
    }`.trim()
  );
}
