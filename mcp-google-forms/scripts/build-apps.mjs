import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const builds = [
  path.resolve(projectRoot, 'ui/gforms-form-view.html'),
  path.resolve(projectRoot, 'ui/gforms-response-list-view.html'),
  path.resolve(projectRoot, 'ui/gforms-response-detail-view.html'),
];

for (const input of builds) {
  await build({
    configFile: false,
    root: projectRoot,
    plugins: [viteSingleFile()],
    build: {
      emptyOutDir: false,
      outDir: path.resolve(projectRoot, 'dist/ui'),
      rollupOptions: { input },
    },
  });
}
