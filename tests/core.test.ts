import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTables } from '../src/table-source';
import { ScaleStore } from '../src/scale-store';
import type { ScaleData } from '../src/settings';

const table = '| 符号 | 说明 |\n| --- | --- |\n| $x$ | 参数 |';
const id = parseTables(table)[0]!.id;
const secondId = parseTables(`${table}\n\n${table}`)[1]!.id;

test('saved table IDs remain compatible with 1.1.1', () => {
  assert.equal(id, 't-9df7b157c6961b2a-0');
  assert.equal(parseTables(`段落\n\n${table.replace('参数', '修改内容')}`)[0]!.id, id);
  assert.equal(parseTables(table.replaceAll('\n', '\r\n'))[0]!.id, id);
  assert.notEqual(secondId, id);
});
test('ignores frontmatter, fenced code and indented code', () => {
  assert.equal(parseTables(`---\n${table}\n---\n${table}`).length, 1);
  assert.equal(parseTables('```md\n' + table + '\n```').length, 0);
  assert.equal(parseTables('```md\n```not-a-close\n' + table + '\n```\n\n' + table).length, 1);
  assert.equal(parseTables(table.split('\n').map(line => `    ${line}`).join('\n')).length, 0);
});
test('handles escaped pipes, code spans and quoted tables', () => {
  assert.equal(parseTables('| `a|b` | c\\|d |\n| --- | --- |').length, 1);
  assert.equal(parseTables('> | A | B |\n> | --- | --- |\n> | 1 | 2 |').length, 1);
  assert.equal(parseTables('| a\\\\| b |\n| --- | --- |').length, 1);
});
test('restores independent table scales and removes empty reset entries', async () => {
  let saved: ScaleData | undefined;
  const store = new ScaleStore(async data => { saved = data; }, assert.fail);
  store.set('文件夹/笔记.md', id, 0.7);
  store.set('文件夹/笔记.md', secondId, 0.9);
  await store.flush();
  const restored = new ScaleStore(async () => {}, assert.fail);
  assert.equal(restored.hydrate(saved), 'ok');
  assert.equal(restored.get('文件夹/笔记.md', id), 0.7);
  assert.equal(restored.get('文件夹/笔记.md', secondId), 0.9);
  store.set('文件夹/笔记.md', id, 1);
  store.set('文件夹/笔记.md', secondId, 1);
  await store.flush();
  assert.deepEqual(Object.keys(saved!.files), []);
});
test('serializes immutable snapshots', async () => {
  const values: number[] = [];
  let active = false;
  const store = new ScaleStore(async data => {
    assert.equal(active, false);
    active = true;
    await Promise.resolve();
    values.push(data.files['a.md']![id]!);
    active = false;
  }, assert.fail);
  store.set('a.md', id, 0.7);
  store.set('a.md', id, 0.8);
  store.set('a.md', id, 0.9);
  await store.flush();
  assert.deepEqual(values, [0.7, 0.8, 0.9]);
});
test('validates data and refuses unknown root formats', () => {
  const store = new ScaleStore(async () => {}, assert.fail);
  assert.equal(store.hydrate(null), 'empty');
  assert.equal(store.hydrate({version: 3, files: {}}), 'unsupported');
  assert.equal(store.hydrate([]), 'invalid');
  assert.equal(store.hydrate({version: 1, files: []}), 'invalid');
  assert.equal(store.hydrate({version: 1, files: {'a.md': {[id]: 999, [secondId]: 'bad', broken: 0.7}}}), 'ok');
  assert.equal(store.get('a.md', id), 1.5);
  assert.equal(store.get('a.md', secondId), 1);
  assert.equal(store.count, 1);
});
test('migrates legacy scales on the first layout change, without writing during load', async () => {
  let saved: ScaleData | undefined;
  let writes = 0;
  const store = new ScaleStore(async data => { saved = data; writes++; }, assert.fail);
  assert.equal(store.hydrate({version: 1, files: {'a.md': {[id]: 0.7}}}), 'ok');
  await store.flush();
  assert.equal(writes, 0);
  assert.equal(store.get('a.md', id), 0.7);
  store.setWidth('a.md', id, 950);
  await store.flush();
  assert.equal(saved!.version, 2);
  assert.equal(saved!.files['a.md']![id], 0.7);
  assert.equal(saved!.widths['a.md']![id], 950);
  const restored = new ScaleStore(async () => {}, assert.fail);
  assert.equal(restored.hydrate(saved), 'ok');
  assert.deepEqual(restored.getLayout('a.md', id), {scale: 0.7, width: 950});
});
test('width and proportional scale can be changed and reset independently', async () => {
  let saved: ScaleData | undefined;
  const store = new ScaleStore(async data => { saved = data; }, assert.fail);
  store.setWidth('a.md', id, 800);
  store.set('a.md', id, 0.75);
  assert.deepEqual(store.getLayout('a.md', id), {scale: 0.75, width: 800});
  store.set('a.md', id, 1);
  assert.equal(store.getWidth('a.md', id), 800);
  assert.equal(store.count, 1);
  store.setWidth('a.md', id);
  assert.equal(store.count, 0);
  await store.flush();
  assert.deepEqual(Object.keys(saved!.files), []);
  assert.deepEqual(Object.keys(saved!.widths), []);
});
test('moves and removes width-only layouts as well as scaled layouts', async () => {
  const store = new ScaleStore(async () => {}, assert.fail);
  store.setWidth('folder/a.md', id, 900);
  store.setLayout('folder/b.md', secondId, {scale: 0.7, width: 1200});
  store.rename('folder', 'renamed');
  assert.equal(store.getWidth('renamed/a.md', id), 900);
  assert.equal(store.getWidth('folder/a.md', id), undefined);
  assert.deepEqual(store.getLayout('renamed/b.md', secondId), {scale: 0.7, width: 1200});
  assert.equal(store.count, 2);
  store.remove('renamed');
  assert.equal(store.count, 0);
  await store.flush();
});
test('validates saved widths and preserves current layouts on invalid loads', () => {
  const store = new ScaleStore(async () => {}, assert.fail);
  assert.equal(store.hydrate({version: 2, files: {}, widths: {'a.md': {[id]: 100000, [secondId]: -1, broken: 600}}}), 'ok');
  assert.equal(store.getWidth('a.md', id), 6000);
  assert.equal(store.getWidth('a.md', secondId), undefined);
  assert.equal(store.count, 1);
  assert.equal(store.hydrate({version: 2, files: {}}), 'invalid');
  assert.equal(store.getWidth('a.md', id), 6000);
});
test('renames folders without touching neighbouring paths; same-path rename is harmless', async () => {
  const store = new ScaleStore(async () => {}, assert.fail);
  store.set('folder/a.md', id, 0.7);
  store.set('folder-other/a.md', id, 0.8);
  store.rename('folder', 'renamed');
  store.rename('renamed', 'renamed');
  assert.equal(store.get('renamed/a.md', id), 0.7);
  assert.equal(store.get('folder-other/a.md', id), 0.8);
  store.remove('renamed');
  assert.equal(store.count, 1);
  await store.flush();
});
test('flush retries a failed final save once', async () => {
  let writes = 0;
  const errors: unknown[] = [];
  const store = new ScaleStore(async () => { if (++writes === 1) throw new Error('fixture'); }, error => errors.push(error));
  store.set('a.md', id, 0.7);
  await store.flush();
  assert.equal(writes, 2);
  assert.equal(errors.length, 1);
});
test('a repeated gesture retries unsaved data; failures do not block later writes', async () => {
  let failing = true;
  let saved: ScaleData | undefined;
  const store = new ScaleStore(async data => { if (failing) throw new Error('fixture'); saved = data; }, () => {});
  store.set('a.md', id, 0.7);
  await store.flush();
  failing = false;
  store.set('a.md', id, 0.7);
  await store.flush();
  assert.equal(saved!.files['a.md']![id], 0.7);
});
test('a view listener cannot prevent the data write being queued', async () => {
  let saved: ScaleData | undefined;
  const store = new ScaleStore(async data => { saved = data; }, assert.fail);
  const unsubscribe = store.subscribe(() => { throw new Error('fixture view error'); });
  assert.throws(() => store.set('a.md', id, 0.7));
  unsubscribe();
  await store.flush();
  assert.equal(saved!.files['a.md']![id], 0.7);
});
