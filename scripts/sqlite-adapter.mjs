// Preview/test adapter only; never imported by the deployed Worker.
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function localDatabase(filename = ':memory:') {
  if(process.env.WORKFORCE_TEST_LIBSQL==='1'){const {createClient}=await import('@libsql/client');const {database,migrate}=await import('../vercel-runtime/database.js');const client=createClient({url:filename===':memory:'?filename:'file:'+filename}),db=database(client);await migrate(db);return {...db,close(){client.close();}};}
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  for (const name of (await readdir(resolve(import.meta.dirname, '../drizzle'))).filter(name => name.endsWith('.sql')).sort()) {
    if (!sqlite.prepare('SELECT name FROM local_migrations WHERE name = ?').get(name)) {
      sqlite.exec('BEGIN');
      try { sqlite.exec(await readFile(resolve(import.meta.dirname, '../drizzle', name), 'utf8')); sqlite.prepare('INSERT INTO local_migrations (name) VALUES (?)').run(name); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  }
  const statement = (sql, values = []) => ({
    bind(...bindings) { return statement(sql, bindings); },
    async first(column) { const row = sqlite.prepare(sql).get(...values); return row ? column ? row[column] : row : null; },
    async all() { return { results: sqlite.prepare(sql).all(...values), success: true, meta: {} }; },
    async run() { const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; },
  });
  return {
    prepare: statement,
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = []; for (const item of statements) results.push(await item.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    close() { sqlite.close(); },
  };
}
