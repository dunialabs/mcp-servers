import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const builds = [
  {
    input: path.resolve(rootDir, 'ui/stripe-browser-view.html'),
    outDir: path.resolve(rootDir, 'dist/ui'),
  },
  {
    input: path.resolve(rootDir, 'ui/stripe-customer-view.html'),
    outDir: path.resolve(rootDir, 'dist/ui'),
  },
];

for (const config of builds) {
  await build({
    root: rootDir,
    logLevel: 'info',
    plugins: [viteSingleFile()],
    build: {
      outDir: config.outDir,
      emptyOutDir: false,
      cssCodeSplit: false,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      rollupOptions: {
        input: config.input,
      },
    },
  });
}
