import worker from '../dist/server/index.js';
import {environment} from './database.js';
import {blobBucket} from './storage.js';
import {auth,session,identity,publicSession,json,fail,checkOrigin,rate,hash,requestIP,readJSON} from './auth.js';
import {uploads} from './uploads.js';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const htmlHeaders={'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
export function makeHandler(getEnv){return async function handle(req){
 const url=new URL(req.url),p=url.pathname;
 try{
  if(['/signin-with-chatgpt','/sign-in-with-chatgpt','/signout-with-chatgpt'].includes(p))return Response.redirect(new URL('/login'+url.search,req.url),303);
  if(['/login','/demo','/start'].includes(p)&&req.method==='GET')return new Response(await readFile(resolve(process.cwd(),'vercel-runtime/login.html'),'utf8'),{headers:htmlHeaders});
  if(p==='/api/health')return json({ok:true,hosting:'vercel',database:!!process.env.TURSO_DATABASE_URL,files:!!process.env.BLOB_READ_WRITE_TOKEN,ai:!!process.env.NEBIUS_API_KEY&&process.env.NEBIUS_AI_ENABLED==='true'});
  const env=await getEnv(),s=await session(req,env.DB);
  if(p.startsWith('/api/auth/'))return await auth(req,env.DB,s);
  checkOrigin(req);
  const role=req.headers.get('x-workforce-role')==='employee'?'employee':'reviewer';const user=identity(s,role);
  // Only a server-validated session supplies trusted identity. Ignore all caller-provided gateway headers.
  function trusted(original,who=user){const h=new Headers(original.headers);h.delete('oai-authenticated-user-id');h.delete('oai-authenticated-user-email');h.delete('cf-connecting-ip');h.set('cf-connecting-ip',requestIP(req));if(who){h.set('oai-authenticated-user-id',who.id);h.set('oai-authenticated-user-email',who.email);}return new Request(original,{headers:h});}
  const dispatch=r=>worker.fetch(trusted(r),env);
  if(p.startsWith('/api/uploads/'))return await uploads(req,env,user,dispatch);
  if(p==='/api/judge/join'&&req.method==='POST'){
   if(s?.kind!=='guest')throw fail('guest_required',403);const b=await readJSON(req);if(typeof b.token!=='string'||b.token.length!==72)throw fail('invalid_invite');const row=await env.DB.prepare('SELECT reviewer_id,invite_email FROM workforce_intake_cases WHERE invite_hash=?').bind(hash(b.token)).first();if(!row||row.reviewer_id!==s.user_id||row.invite_email!==s.employee_email)throw fail('not_found',404);
   return worker.fetch(trusted(new Request(new URL('/api/intake/join',req.url),{method:'POST',headers:{origin:url.origin,'content-type':'application/json'},body:JSON.stringify(b)}),identity(s,'employee')),env);
  }
  if(p.startsWith('/api/intake')&&req.method==='POST'&&/\/(submit|refresh-guidance)$/.test(p))await rate(env.DB,'ai-ip:'+hash(requestIP(req)),30,86400000);
  if(s?.kind==='guest'&&p==='/api/intake/cases'&&req.method==='POST'){const b=await req.clone().json();if(b.employee_email!==s.employee_email)throw fail('judge_email_required');}
  let response=await dispatch(req);
  if(s?.kind==='guest'&&req.method==='GET'&&p.includes('/files/')&&response.status===404)response=await worker.fetch(trusted(req,identity(s,'employee')),env);
  if(p==='/api/intake'&&req.method==='GET'&&response.ok){const data=await response.json();data.session=publicSession(s);data.hosting='vercel';return json(data);}
  return response;
 }catch(e){console.error('Workforce request failed:',e.code||'runtime');return json({code:e.code||'runtime_unavailable'},e.status||503);}
};}
export default makeHandler(async()=>({DB:await environment(),BUCKET:blobBucket(),NEBIUS_API_KEY:process.env.NEBIUS_API_KEY,NEBIUS_AI_ENABLED:process.env.NEBIUS_AI_ENABLED,WORKFORCE_OPERATOR_USER_ID:process.env.WORKFORCE_OPERATOR_USER_ID||''}));
