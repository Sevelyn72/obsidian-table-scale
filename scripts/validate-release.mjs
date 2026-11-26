import { readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { validateMetadata } from './release-metadata.mjs';

const json = async name => JSON.parse(await readFile(name, 'utf8'));
const [manifest, pkg, versions] = await Promise.all(['manifest.json', 'package.json', 'versions.json'].map(json));
const errors = validateMetadata(manifest, pkg, versions, process.env.RELEASE_TAG);
for (const name of ['README.md', 'README.zh-CN.md', 'LICENSE', 'main.js', 'styles.css']) {
  try { await access(name); } catch { errors.push(`Missing release file: ${name}`); }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  execFileSync(process.execPath, ['--check', 'main.js'], { stdio: 'inherit' });
  console.log(`Release metadata and bundle validated: ${manifest.id} ${manifest.version}`);
}
