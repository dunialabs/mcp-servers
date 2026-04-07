import path from 'node:path';
import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const root = process.cwd();

async function buildSingle(name, htmlFile) {
  await build({
    root,
    plugins: [viteSingleFile()],
    build: {
      outDir: 'dist/ui',
      emptyOutDir: false,
      rollupOptions: {
        input: {
          [name]: path.resolve(root, htmlFile),
        },
        output: {
          entryFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  });
}

await buildSingle('drive-browser-view', 'ui/drive-browser-view.html');
await buildSingle('drive-metadata-view', 'ui/drive-metadata-view.html');
