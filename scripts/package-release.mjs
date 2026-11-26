import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const { version } = JSON.parse(await readFile('manifest.json', 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid release version.');
const output = path.resolve('dist', version);
await mkdir(output, { recursive: true });
const checksums = [];
for (const name of ['main.js', 'manifest.json', 'styles.css']) {
  await copyFile(name, path.join(output, name));
  const digest = createHash('sha256').update(await readFile(name)).digest('hex');
  checksums.push(`${digest}  ${name}`);
}
await writeFile(path.join(output, 'SHA256SUMS.txt'), checksums.join('\n') + '\n');
console.log(`Release assets staged at ${output}`);
