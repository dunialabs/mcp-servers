#!/usr/bin/env node
/**
 * Fast build using esbuild (for development)
 * For production, use: npm run build (tsc with full type checking)
 */
import * as esbuild from 'esbuild';
import { glob } from 'glob';

const entryPoints = await glob('src/**/*.ts', { ignore: 'src/**/*.test.ts' });

await esbuild.build({
  entryPoints,
  outdir: 'dist',
  format: 'esm',
  platform: 'node',
  target: 'node18',
  sourcemap: false,
}).catch(() => process.exit(1));

console.log('✅ Build completed with esbuild (fast mode)');
