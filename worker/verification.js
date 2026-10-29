import {digest} from './workforce.js';
import {fail} from './companies.js';

export const isOperator=(env,user)=>!!env.WORKFORCE_OPERATOR_USER_ID && user===env.WORKFORCE_OPERATOR_USER_ID;
export const recipientEmail=x=>typeof x==='string' && x.length<=180 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(x.trim()) ? x.trim().toLowerCase() : '';
export function applicationInput(b){
 const email=recipientEmail(b.contact_email),website=String(b.website||'').trim(),authority=String(b.authority||'').trim();
 let url;try{url=new URL(website);}catch{}
 if(!email||!url||url.protocol!=='https:'||url.username||url.password||website.length>300||authority.length<20||authority.length>600||/[<>\u0000-\u001f]/.test(authority))throw fail('application_input');
 return {contact_email:email,website,authority};
}
export async function handleVerification(path,method,b,env,user,cursor=null){
 if(!isOperator(env,user))throw fail('operator_only',403);
 if(path==='/operator/companies'&&method==='GET'){
  if(cursor&&!/^[0-9a-f-]{36}$/.test(cursor))throw fail('invalid_cursor');
  const base='SELECT id,name,owner_id,applicant_email,revision,verification_status,application_json,verification_json,created_at FROM workforce_companies';
  const rows=(await (cursor?env.DB.prepare(base+' WHERE created_at<(SELECT created_at FROM workforce_companies WHERE id=?) OR (created_at=(SELECT created_at FROM workforce_companies WHERE id=?) AND id<?) ORDER BY created_at DESC,id DESC LIMIT 101').bind(cursor,cursor,cursor):env.DB.prepare(base+' ORDER BY created_at DESC,id DESC LIMIT 101')).all()).results;
  const more=rows.length>100;if(more)rows.pop();
  return {next_cursor:more?rows.at(-1).id:null,applications:rows.map(r=>({...r,application:JSON.parse(r.application_json),verification:JSON.parse(r.verification_json),application_json:undefined,verification_json:undefined}))};
 }
 const match=path.match(/^\/operator\/companies\/([0-9a-f-]{36})$/);
 if(!match||method!=='POST')throw fail('not_found',404);
 const decision=b.status,note=typeof b.note==='string'?b.note.trim():'';
 if(!['approved','rejected','suspended'].includes(decision)||note.length<30||note.length>1000||/[<>\u0000-\u001f]/.test(note))throw fail('verification_input');
 if(decision==='approved'&&(b.company_confirmed!==true||b.authority_confirmed!==true))throw fail('verification_required');
 const row=await env.DB.prepare('SELECT * FROM workforce_companies WHERE id=?').bind(match[1]).first();
 if(!row)throw fail('company_not_found',404);
 if(decision==='approved'){applicationInput(JSON.parse(row.application_json));if(!recipientEmail(row.applicant_email))throw fail('applicant_email_required');}
 const at=new Date().toISOString(),actor=(await digest(user)).slice(0,16),op=crypto.randomUUID();
 const detail={status:decision,note,company_confirmed:b.company_confirmed===true,authority_confirmed:b.authority_confirmed===true,at,actor,method:'manual_operator_review'};
 const results=await env.DB.batch([
  env.DB.prepare('UPDATE workforce_companies SET verification_status=?,verification_json=?,revision=revision+1,operation_id=? WHERE id=? AND revision=?').bind(decision,JSON.stringify(detail),op,row.id,b.revision),
  env.DB.prepare("INSERT INTO workforce_company_events(id,company_id,revision,action,actor,detail_json,at) SELECT ?,?,revision,'verification_decision',?,?,? FROM workforce_companies WHERE id=? AND operation_id=?").bind(crypto.randomUUID(),row.id,actor,JSON.stringify(detail),at,row.id,op)
 ]);
 if(!results[0].meta.changes)throw fail('company_changed',409);
 return {status:decision,revision:row.revision+1};
}
