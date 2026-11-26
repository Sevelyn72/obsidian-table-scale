import { access, copyFile, lstat, mkdir, readFile, readdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMetadata } from './release-metadata.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2]) throw new Error('Usage: node scripts/install-local.mjs <existing plugin directory>');
const target = await realpath(path.resolve(process.argv[2]));
if (target === root || path.basename(target) !== 'table-scale' || path.basename(path.dirname(target)) !== 'plugins') {
  throw new Error('Target must be an existing plugins/table-scale directory, separate from this source project.');
}
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const manifest = await json(path.join(root, 'manifest.json'));
const pkg = await json(path.join(root, 'package.json'));
const versions = await json(path.join(root, 'versions.json'));
const errors = validateMetadata(manifest, pkg, versions);
if (errors.length) throw new Error(errors.join('\n'));
if ((await json(path.join(target, 'manifest.json'))).id !== manifest.id) throw new Error('Existing plugin ID does not match.');
await access(path.join(root, 'main.js'));

const items = [
  'src', 'scripts', 'tests', 'docs', 'examples', '.github',
  'main.js', 'styles.css', 'manifest.json', 'versions.json', 'package.json', 'package-lock.json',
  'tsconfig.json', 'eslint.config.mts', 'esbuild.config.mjs', 'version-bump.mjs',
  'README.md', 'README.zh-CN.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE', 'AGENTS.md',
  '.gitignore', '.editorconfig', '.nvmrc',
];
const files = [];
async function collect(relative) {
  const info = await lstat(path.join(root, relative));
  if (info.isSymbolicLink()) throw new Error(`Source links are not copied: ${relative}`);
  if (info.isDirectory()) {
    for (const entry of await readdir(path.join(root, relative))) await collect(path.join(relative, entry));
  } else if (info.isFile()) files.push(relative);
}
for (const item of items) await collect(item);
for (const relative of files) {
  let current = path.join(target, relative);
  while (current !== target) {
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error(`Target links are not overwritten: ${relative}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    current = path.dirname(current);
  }
}
async function dataHash() {
  try { return createHash('sha256').update(await readFile(path.join(target, 'data.json'))).digest('hex'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
const before = await dataHash();
const backup = path.join(root, '.local-backups', new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(backup, { recursive: true });
// Back up all existing files in the allowlist before changing any target file.
for (const relative of files) {
  const source = path.join(target, relative);
  try { await access(source); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  const destination = path.join(backup, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}
for (const relative of files) {
  const destination = path.join(target, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(root, relative), destination);
}
if (before !== await dataHash()) throw new Error('Plugin data changed during installation; inspect the backup before proceeding.');
console.log(JSON.stringify({ version: manifest.version, installed: target, backup, dataPreserved: true, files: files.length }, null, 2));
