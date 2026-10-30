import {createClient} from '@libsql/client';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export function database(client) {
 const map = r=>({results:r.rows.map(x=>({...x})),success:true,meta:{changes:r.rowsAffected,last_row_id:Number(r.lastInsertRowid||0)}});
 const statement=(sql,args=[])=>({sql,args,bind(...values){return statement(sql,values);},async first(column){const r=await client.execute({sql,args});const row=r.rows[0];return row?(column?row[column]:{...row}):null;},async all(){return map(await client.execute({sql,args}));},async run(){return map(await client.execute({sql,args}));}});
 return {prepare:statement,async batch(items){return (await client.batch(items.map(x=>({sql:x.sql,args:x.args})),'write')).map(map);},client};
}
export async function migrate(db){
 await db.client.execute('CREATE TABLE IF NOT EXISTS workforce_runtime_migrations(name TEXT PRIMARY KEY)');
 for(const dir of ['drizzle','vercel-runtime/migrations']){
  for(const name of (await readdir(resolve(process.cwd(),dir))).filter(n=>n.endsWith('.sql')).sort()){
   const key=dir+'/'+name;if(await db.prepare('SELECT name FROM workforce_runtime_migrations WHERE name=?').bind(key).first())continue;
   const tx=await db.client.transaction('write');
   try{if(!(await tx.execute({sql:'SELECT name FROM workforce_runtime_migrations WHERE name=?',args:[key]})).rows.length){await tx.executeMultiple(await readFile(resolve(process.cwd(),key),'utf8'));await tx.execute({sql:'INSERT INTO workforce_runtime_migrations VALUES(?)',args:[key]});}await tx.commit();}catch(e){await tx.rollback();throw e;}finally{tx.close();}
  }
 }
}
let ready;
export function environment(){
 if(!ready)ready=(async()=>{if(!process.env.TURSO_DATABASE_URL)throw new Error('database_not_configured');const db=database(createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN}));await migrate(db);return db;})().catch(e=>{ready=null;throw e;});return ready;
}
