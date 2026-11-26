import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('.test-build/core.test.cjs');
await mkdir(path.dirname(output), { recursive: true });
await build({ entryPoints: ['tests/core.test.ts'], outfile: output, bundle: true, platform: 'node', format: 'cjs', target: 'node22' });
execFileSync(process.execPath, ['--test', output, 'tests/release.test.mjs'], { stdio: 'inherit' });
