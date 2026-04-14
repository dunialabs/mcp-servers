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

await buildSingle('hubspot-browser-view', 'ui/hubspot-browser-view.html');
await buildSingle('hubspot-deal-view', 'ui/hubspot-deal-view.html');
