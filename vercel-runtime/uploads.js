import {json,fail,readJSON,rate} from './auth.js';
import {CASE_SELECT,CASE_ACCESS} from '../dist/server/companies.js';
const partSize=512*1024,maxSize=17*1024*1024;
export async function uploads(req,env,user,dispatch){
 if(!user)throw fail('auth',401);const db=env.DB,path=new URL(req.url).pathname;
 if(path==='/api/uploads/start'&&req.method==='POST'){
  const b=await readJSON(req),id=crypto.randomUUID(),caseId=b.target?.match(/^\/api\/intake\/cases\/([a-f0-9-]{36})\/documents$/)?.[1];
  if(!caseId||!Number.isSafeInteger(b.size)||b.size<1||b.size>maxSize||!/^multipart\/form-data; boundary=[-A-Za-z0-9]+$/.test(b.content_type||''))throw fail('invalid_upload');
  const row=await db.prepare(CASE_SELECT+' WHERE c.id=? AND '+CASE_ACCESS).bind(caseId,user.id,user.id).first();if(!row)throw fail('not_found',404);
  await rate(db,'upload:'+user.id,100);await db.batch([db.prepare('DELETE FROM workforce_upload_chunks WHERE upload_id IN (SELECT id FROM workforce_uploads WHERE expires_at<?)').bind(Date.now()),db.prepare('DELETE FROM workforce_uploads WHERE expires_at<?').bind(Date.now())]);
  const active=await db.prepare('SELECT count(*) AS n FROM workforce_uploads WHERE user_id=?').bind(user.id).first();if(active.n>=3)throw fail('upload_busy',429);
  const made=await db.prepare('INSERT INTO workforce_uploads(id,user_id,target,content_type,size,expires_at) SELECT ?,?,?,?,?,? WHERE (SELECT count(*) FROM workforce_uploads WHERE user_id=?)<3 RETURNING id').bind(id,user.id,b.target,b.content_type,b.size,Date.now()+15*60*1000,user.id).first();if(!made)throw fail('upload_busy',429);return json({id,part_size:partSize});
 }
 const match=path.match(/^\/api\/uploads\/([a-f0-9-]{36})\/(\d+|complete)$/);if(!match||req.method!=='POST')throw fail('not_found',404);
 const row=await db.prepare('SELECT * FROM workforce_uploads WHERE id=? AND user_id=? AND expires_at>? AND claimed=0').bind(match[1],user.id,Date.now()).first();if(!row)throw fail('upload_expired',404);
 if(match[2]!=='complete'){
  const part=Number(match[2]);if(part>=Math.ceil(row.size/partSize))throw fail('invalid_part');const bytes=new Uint8Array(await req.arrayBuffer());if(bytes.length!==Math.min(partSize,row.size-part*partSize))throw fail('invalid_part');
  const saved=await db.prepare('INSERT INTO workforce_upload_chunks SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM workforce_uploads WHERE id=? AND claimed=0 AND expires_at>?) ON CONFLICT(upload_id,part) DO UPDATE SET bytes=excluded.bytes RETURNING part').bind(row.id,part,bytes,row.id,Date.now()).first();if(!saved)throw fail('upload_expired',409);return json({ok:true});
 }
 const claimed=await db.prepare('UPDATE workforce_uploads SET claimed=1 WHERE id=? AND claimed=0 RETURNING id').bind(row.id).first();if(!claimed)throw fail('upload_busy',409);
 try{
  const chunks=(await db.prepare('SELECT part,bytes FROM workforce_upload_chunks WHERE upload_id=? ORDER BY part').bind(row.id).all()).results;
  if(chunks.length!==Math.ceil(row.size/partSize)||chunks.some((c,i)=>c.part!==i))throw fail('upload_incomplete',409);
  const out=new Uint8Array(row.size);let offset=0;for(const c of chunks){const bytes=new Uint8Array(c.bytes);out.set(bytes,offset);offset+=bytes.length;}if(offset!==row.size)throw fail('upload_incomplete',409);
  const headers=new Headers(req.headers);headers.set('content-type',row.content_type);headers.delete('content-length');return await dispatch(new Request(new URL(row.target,req.url),{method:'POST',headers,body:out}));
 }finally{await db.batch([db.prepare('DELETE FROM workforce_upload_chunks WHERE upload_id=?').bind(row.id),db.prepare('DELETE FROM workforce_uploads WHERE id=?').bind(row.id)]);}
}
