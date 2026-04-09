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

await buildSingle('notion-browser-view', 'ui/notion-browser-view.html');
await buildSingle('notion-page-view', 'ui/notion-page-view.html');
await buildSingle('notion-database-view', 'ui/notion-database-view.html');
