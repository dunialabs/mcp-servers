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
  ['mysql-tables-view', resolve(uiDir, 'mysql-tables-view.html')],
  ['mysql-table-detail-view', resolve(uiDir, 'mysql-table-detail-view.html')],
  ['mysql-query-view', resolve(uiDir, 'mysql-query-view.html')],
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
