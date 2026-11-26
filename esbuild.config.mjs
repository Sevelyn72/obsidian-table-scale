import * as esbuild from 'esbuild';
import { builtinModules } from 'node:module';

const production = process.argv.includes('production');
const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*', ...builtinModules],
  format: 'cjs',
  target: 'es2021',
  outfile: 'main.js',
  sourcemap: production ? false : 'inline',
  minify: production,
  treeShaking: true,
  logLevel: 'info',
  banner: { js: '/* Table Scale — Sevelyn. License: 0BSD. Source is distributed with this plugin. */' },
};
if (production) await esbuild.build(options);
else {
  const context = await esbuild.context(options);
  await context.watch();
}
