import {approvedCompany} from './approved-fixture.mjs';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
import { localDatabase } from './sqlite-adapter.mjs';
import { memoryBucket } from './r2-adapter.mjs';
const origin = 'https://workforce.test';
const response = await worker.fetch(new Request(origin));
assert.equal(response.status, 200);
const html = await response.text();
assert.match(html, /<title>Workforce/);
assert(!/SettleK|settlek-navigator|settlek-buildai|Sample review lab/.test(html));
for (const path of ['/plan', '/planner', '/records', '/hr/samples', '/api/hr', '/api/plan', '/api/memory', '/api/documents']) {
  assert.equal((await worker.fetch(new Request(origin + path))).status, 404, path);
}
assert.equal((await worker.fetch(new Request(origin + '/api/intake'))).status, 401);
const DB = await localDatabase();
try {
  const tables = (await DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.map(t => t.name).sort();
  const expected=['workforce_ai_usage','workforce_companies','workforce_company_events','workforce_company_invites','workforce_company_members','workforce_demo_sessions','workforce_intake_audit','workforce_intake_cases',...(process.env.WORKFORCE_TEST_LIBSQL==='1'?['workforce_accounts','workforce_runtime_migrations','workforce_runtime_rates','workforce_sessions','workforce_upload_chunks','workforce_uploads']:['local_migrations'])].sort();
  assert.deepEqual(tables,expected);
  const BUCKET = memoryBucket();
  const headers = { 'oai-authenticated-user-id': 'standalone-reviewer', origin, 'content-type': 'application/json' };
  const env = { DB, BUCKET };
  const list = await (await worker.fetch(new Request(origin + '/api/intake', { headers }), env)).json();
  assert.deepEqual(list.cases, []);
  assert.equal(list.integration.configured, false, 'Missing key must not appear as connected AI');
  const company=await approvedCompany(env,'standalone-reviewer');
  const created = await worker.fetch(new Request(origin + '/api/intake/cases', { method: 'POST', headers, body: JSON.stringify({ id: crypto.randomUUID(), name: 'Independent workspace verification', company_id:company,employee_email:'employee@example.test' }) }), env);
  assert.equal(created.status, 201);
  const c = (await created.json()).case;
  const audit = await (await worker.fetch(new Request(origin + '/api/intake/cases/' + c.id + '/audit', { headers }), env)).json();
  assert.equal(audit.valid, true);
  assert.equal((await worker.fetch(new Request(origin + '/api/intake', { headers: { ...headers, origin: 'https://elsewhere.test' }, method: 'POST', body: '{}' }), env)).status, 403);
  const pdf = await worker.fetch(new Request(origin + '/vendor/pdf.mjs'));
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get('content-type'), /javascript/);
  console.log('Isolation passed: independent root, schema, empty data, authorization, PDF assets, honest AI setup status.');
} finally { DB.close(); }
