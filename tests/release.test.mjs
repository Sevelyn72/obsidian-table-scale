import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMetadata } from '../scripts/release-metadata.mjs';

const manifest = { id: 'table-scale', version: '1.1.2', minAppVersion: '1.13.7', description: 'Scale tables.', author: 'Sevelyn', isDesktopOnly: true };
test('valid release metadata matches tag and compatibility mapping', () => {
  assert.deepEqual(validateMetadata(manifest, {version: '1.1.2'}, {'1.1.2': '1.13.7'}, '1.1.2'), []);
});
test('rejects mismatched package versions and v-prefixed tags', () => {
  const errors = validateMetadata(manifest, {version: '1.0.0'}, {}, 'v1.1.2');
  assert.equal(errors.length, 3);
});
test('rejects template author, changed plugin ID and overlong description', () => {
  const errors = validateMetadata({...manifest, id: 'sample', author: 'Local developer', description: 'x'.repeat(251)}, {version: '1.1.2'}, {'1.1.2': '1.13.7'});
  assert.equal(errors.length, 3);
});
