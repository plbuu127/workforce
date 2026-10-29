import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, '.openai/hosting.json'), 'utf8'));
assert.equal(manifest.project_id, 'appgprj_6ae1bb126d8c8191b803e0cb86d6e60d');
assert.equal(manifest.d1, 'DB');
assert.equal(manifest.r2, 'BUCKET');
assert.equal(await readFile(resolve(root, 'dist/.openai/hosting.json'), 'utf8'), await readFile(resolve(root, '.openai/hosting.json'), 'utf8'));
for (const name of await readdir(resolve(root, 'dist/server'))) {
  const source = await readFile(resolve(root, 'dist/server', name), 'utf8');
  assert(!/settlek-navigator|settlek-buildai|appgprj_6ac5ed0362cc81919c021180ae6965c2|appgprj_6adf1442bb3c8191818ba6c8ef647579/.test(source), 'No prior Site reference in production bundle');
  assert(!source.includes('local_workforce_demo'), 'No preview identity in production');
}
const worker = (await import('../dist/server/index.js')).default;
assert.equal(typeof worker.fetch, 'function');
console.log('Artifact validated: separate Site identity and no SettleK service dependency.');
