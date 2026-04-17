import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const builds = [
  path.resolve(rootDir, 'ui/canva-browser-view.html'),
  path.resolve(rootDir, 'ui/canva-metadata-view.html'),
  path.resolve(rootDir, 'ui/canva-export-view.html'),
];

for (const input of builds) {
  await build({
    root: rootDir,
    logLevel: 'info',
    plugins: [viteSingleFile()],
    build: {
      outDir: path.resolve(rootDir, 'dist/ui'),
      emptyOutDir: false,
      cssCodeSplit: false,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      rollupOptions: {
        input,
      },
    },
  });
}
