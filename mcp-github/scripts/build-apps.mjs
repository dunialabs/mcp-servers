import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const builds = [
  {
    entry: path.resolve(projectRoot, 'ui/github-browser-view.html'),
    outDir: path.resolve(projectRoot, 'dist/ui'),
  },
  {
    entry: path.resolve(projectRoot, 'ui/github-pull-request-view.html'),
    outDir: path.resolve(projectRoot, 'dist/ui'),
  },
];

for (const target of builds) {
  await build({
    configFile: false,
    root: projectRoot,
    plugins: [viteSingleFile()],
    build: {
      emptyOutDir: false,
      outDir: target.outDir,
      rollupOptions: {
        input: target.entry,
      },
    },
  });
}
