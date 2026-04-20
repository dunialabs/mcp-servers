import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, rm } from 'node:fs/promises';
import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..', '..');
const root = resolve(__dirname);
const uiDir = resolve(root, 'ui');
const outDir = resolve(root, 'dist', 'ui');

const entries = [
  ['postgres-tables-view', resolve(uiDir, 'postgres-tables-view.html')],
  ['postgres-table-detail-view', resolve(uiDir, 'postgres-table-detail-view.html')],
  ['postgres-query-view', resolve(uiDir, 'postgres-query-view.html')],
];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const [name, entry] of entries) {
  await build({
    root,
    configFile: false,
    publicDir: false,
    plugins: [viteSingleFile()],
    resolve: {
      alias: {
        '@': root,
      },
    },
    build: {
      emptyOutDir: false,
      outDir,
      rollupOptions: {
        input: entry,
      },
    },
  });
  console.log(`Built ${name}`);
}
