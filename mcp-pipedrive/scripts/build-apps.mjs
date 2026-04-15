import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const outDir = path.resolve(root, 'dist', 'ui');

const entries = [
  {
    input: path.resolve(root, 'ui', 'pipedrive-browser-view.html'),
    name: 'pipedrive-browser-view',
  },
  {
    input: path.resolve(root, 'ui', 'pipedrive-pipeline-view.html'),
    name: 'pipedrive-pipeline-view',
  },
];

for (const entry of entries) {
  await build({
    root,
    logLevel: 'info',
    plugins: [viteSingleFile()],
    build: {
      emptyOutDir: false,
      outDir,
      rollupOptions: {
        input: entry.input,
      },
    },
  });
}
