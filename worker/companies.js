import {applicationInput,recipientEmail} from './verification.js';
import {digest} from './workforce.js';
export const fail=(code,status=400)=>Object.assign(new Error(code),{code,status});
const validId=x=>typeof x==='string'&&/^[0-9a-f-]{36}$/.test(x);
const validName=x=>typeof x==='string'&&x.trim().length>=2&&x.length<=80&&!/[<>\u0000-\u001f]/.test(x);
const now=()=>new Date().toISOString();
export const CASE_ACCESS=`(COALESCE(json_extract(c.state_json,'$.self_test'),0)=0 AND COALESCE(json_extract(c.state_json,'$.synthetic_demo'),0)=0 AND EXISTS(SELECT 1 FROM workforce_companies co WHERE co.id=c.company_id AND co.verification_status IN ('pending','approved')) AND (c.employee_id=? OR (c.reviewer_id=? AND EXISTS (SELECT 1 FROM workforce_company_members m WHERE m.company_id=c.company_id AND m.user_id=c.reviewer_id AND m.active=1))))`;
export const CASE_SELECT=`SELECT c.*, (SELECT name FROM workforce_companies WHERE id=c.company_id) AS company_name, (SELECT name FROM workforce_company_members WHERE company_id=c.company_id AND user_id=c.reviewer_id AND active=1 LIMIT 1) AS reviewer_name FROM workforce_intake_cases c`;
export async function member(db,company,user){return db.prepare('SELECT * FROM workforce_company_members WHERE company_id=? AND user_id=? AND active=1').bind(company,user).first();}
export async function companyFor(db,id,user){const c=await db.prepare('SELECT * FROM workforce_companies WHERE id=?').bind(id).first();const m=c&&await member(db,id,user);if(!c||!m)throw fail('company_not_found',404);return {c,m};}
export async function requireCompanyReviewer(db,id,user){if(!validId(id))throw fail('company_not_found',404);const found=await companyFor(db,id,user);if(!['pending','approved'].includes(found.c.verification_status))throw fail('company_verification_required',403);return found;}
const publicCompany=(c,m,user)=>({id:c.id,name:c.name,revision:c.revision,verification_status:c.verification_status,access_mode:'self_service',application:JSON.parse(c.application_json),verification:JSON.parse(c.verification_json),role:m.role,is_owner:c.owner_id===user,member_id:m.id,member_name:m.name});
export async function listCompanies(db,user){const rows=(await db.prepare('SELECT c.*,m.role,m.id AS member_id,m.name AS member_name FROM workforce_companies c JOIN workforce_company_members m ON m.company_id=c.id WHERE m.user_id=? AND m.active=1 ORDER BY c.created_at,c.id').bind(user).all()).results;return rows.map(r=>({id:r.id,name:r.name,revision:r.revision,verification_status:r.verification_status,role:r.role,is_owner:r.owner_id===user,member_id:r.member_id,member_name:r.member_name}));}
const admin=m=>{if(m.role!=='admin')throw fail('company_admin_only',403);};
const guard='EXISTS (SELECT 1 FROM workforce_companies WHERE id=? AND operation_id=?)';
// A fresh operation id gates every statement in the same D1 transaction. A stale
// revision cannot accidentally execute against a different writer's revision.
async function transaction(db,c,m,user,action,detail,make,condition="1=1",bindings=[]){
 const op=crypto.randomUUID(),at=now();
 const statements=[db.prepare('UPDATE workforce_companies SET revision=revision+1,operation_id=? WHERE id=? AND revision=? AND verification_status IN (\'pending\',\'approved\') AND EXISTS (SELECT 1 FROM workforce_company_members WHERE company_id=? AND user_id=? AND active=1 AND role=?) AND '+condition).bind(op,c.id,c.revision,c.id,user,m.role,...bindings),...make(op,at),db.prepare(`INSERT INTO workforce_company_events(id,company_id,revision,action,actor,detail_json,at) SELECT ?,?,revision,?,?,?,? FROM workforce_companies WHERE id=? AND operation_id=?`).bind(crypto.randomUUID(),c.id,action,m.name,JSON.stringify(detail),at,c.id,op)];
 const results=await db.batch(statements);if(!results[0].meta.changes)throw fail('company_changed',409);return results;
}
export async function companyOverview(db,id,user){
 const {c,m}=await companyFor(db,id,user);const info={company:publicCompany(c,m,user)};
 if(m.role!=='admin'||!['pending','approved'].includes(c.verification_status))return info;
 info.members=(await db.prepare('SELECT id,name,role,active,created_at FROM workforce_company_members WHERE company_id=? ORDER BY created_at,id').bind(id).all()).results.map(r=>({...r,is_self:r.id===m.id}));
 const owner=await db.prepare('SELECT id FROM workforce_company_members WHERE company_id=? AND user_id=?').bind(id,c.owner_id).first();info.owner_member_id=owner.id;
 info.cases=(await db.prepare(`SELECT c.id,c.revision,c.updated_at,c.employee_id IS NOT NULL AS employee_joined,json_extract(c.state_json,'$.name') AS name,json_extract(c.state_json,'$.stage') AS stage,json_extract(c.state_json,'$.self_test') AS self_test,json_extract(c.state_json,'$.version') AS version,m.id AS reviewer_member_id,m.name AS reviewer_name,m.active AS reviewer_active FROM workforce_intake_cases c LEFT JOIN workforce_company_members m ON m.company_id=c.company_id AND m.user_id=c.reviewer_id WHERE c.company_id=? AND COALESCE(json_extract(c.state_json,'$.self_test'),0)=0 AND COALESCE(json_extract(c.state_json,'$.synthetic_demo'),0)=0 ORDER BY c.updated_at DESC`).bind(id).all()).results;
 info.invites=(await db.prepare('SELECT id,email,role,expires_at,used_at,revoked_at FROM workforce_company_invites WHERE company_id=? ORDER BY created_at DESC LIMIT 100').bind(id).all()).results;
 info.events=(await db.prepare('SELECT revision,action,actor,detail_json,at FROM workforce_company_events WHERE company_id=? ORDER BY revision DESC LIMIT 80').bind(id).all()).results.map(r=>({...r,detail:JSON.parse(r.detail_json),detail_json:undefined}));
 return info;
}
export async function handleCompanies(path,method,b,request,env,user){
 const db=env.DB,email=(request.headers.get('oai-authenticated-user-email')||'').trim().toLowerCase();
 if(path==='/companies'&&method==='POST'){
  if(!validName(b.name)||!validName(b.member_name)||!validId(b.id))throw fail('company_input');
  const existing=await db.prepare('SELECT * FROM workforce_companies WHERE id=?').bind(b.id).first();if(existing){if(existing.owner_id!==user)throw fail('id_conflict',409);return companyOverview(db,b.id,user);}
  const count=await db.prepare('SELECT count(*) AS n FROM workforce_companies WHERE owner_id=?').bind(user).first();if(count.n>=10)throw fail('company_limit',429);
  const application=b.contact_email||b.website||b.authority?applicationInput(b):{};if(!recipientEmail(email))throw fail('applicant_email_required');const at=now(),name=b.name.trim(),display=b.member_name.trim();
  await db.batch([db.prepare('INSERT INTO workforce_companies(id,name,owner_id,revision,operation_id,created_at,application_json,applicant_email) VALUES(?,?,?,1,?,?,?,?)').bind(b.id,name,user,crypto.randomUUID(),at,JSON.stringify(application),email),db.prepare("INSERT INTO workforce_company_members(id,company_id,user_id,name,role,active,created_at) VALUES(?,?,?,?,'admin',1,?)").bind(crypto.randomUUID(),b.id,user,display,at),db.prepare("INSERT INTO workforce_company_events(id,company_id,revision,action,actor,detail_json,at) VALUES(?,?,1,'company_created',?,'{}',?)").bind(crypto.randomUUID(),b.id,display,at)]);
  return companyOverview(db,b.id,user);
 }
 if(['/companies/join','/companies/invitation'].includes(path)&&method==='POST'){
  if(typeof b.token!=='string'||b.token.length!==72||(path.endsWith('/join')&&!validName(b.member_name)))throw fail('invalid_invite');
  const i=await db.prepare('SELECT * FROM workforce_company_invites WHERE token_hash=?').bind(await digest(b.token)).first();if(!i||i.used_at||i.revoked_at||Date.parse(i.expires_at)<=Date.now())throw fail('invalid_invite',404);
  if(!email||email!==i.email)throw fail('invite_account_mismatch',403);
  const c=await db.prepare('SELECT * FROM workforce_companies WHERE id=?').bind(i.company_id).first(),existing=await db.prepare('SELECT * FROM workforce_company_members WHERE company_id=? AND user_id=?').bind(i.company_id,user).first();
  if(!['pending','approved'].includes(c.verification_status))throw fail('company_verification_required',403);
  if(path.endsWith('/invitation'))return {team:{company_name:c.name,role:i.role,expires_at:i.expires_at}};
  if(existing?.active)throw fail('already_company_member',409);
  const op=crypto.randomUUID(),at=now(),display=b.member_name.trim();
  const gate=db.prepare('UPDATE workforce_companies SET revision=revision+1,operation_id=? WHERE id=? AND revision=? AND verification_status IN (\'pending\',\'approved\') AND EXISTS(SELECT 1 FROM workforce_company_invites WHERE id=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>? AND email=?)').bind(op,c.id,c.revision,i.id,at,email);
  const mem=existing?db.prepare(`UPDATE workforce_company_members SET name=?,role=?,active=1 WHERE id=? AND ${guard}`).bind(display,i.role,existing.id,c.id,op):db.prepare(`INSERT INTO workforce_company_members(id,company_id,user_id,name,role,active,created_at) SELECT ?,?,?,?,?,1,? WHERE ${guard}`).bind(crypto.randomUUID(),c.id,user,display,i.role,at,c.id,op);
  const res=await db.batch([gate,mem,db.prepare(`UPDATE workforce_company_invites SET used_at=? WHERE id=? AND ${guard}`).bind(at,i.id,c.id,op),db.prepare(`INSERT INTO workforce_company_events(id,company_id,revision,action,actor,detail_json,at) SELECT ?,?,revision,'member_joined',?,?,? FROM workforce_companies WHERE id=? AND operation_id=?`).bind(crypto.randomUUID(),c.id,display,JSON.stringify({role:i.role}),at,c.id,op)]);
  if(!res[0].meta.changes)throw fail('company_changed',409);return companyOverview(db,c.id,user);
 }
 const match=path.match(/^\/companies\/([0-9a-f-]{36})(?:\/(invites|revoke-invite|remove-member|assign|application))?$/);if(!match)throw fail('not_found',404);
 const id=match[1],action=match[2],{c,m}=await companyFor(db,id,user);
 if(method==='GET'&&!action)return companyOverview(db,id,user);
 if(method!=='POST')throw fail('method',405);admin(m);if(b.revision!==c.revision)throw fail('company_changed',409);
 if(action==='application'){
  if(c.owner_id!==user)throw fail('company_owner_only',403);
  if(!['pending','rejected'].includes(c.verification_status))throw fail('application_locked',409);
  if(!recipientEmail(email))throw fail('applicant_email_required');const application=applicationInput(b),op=crypto.randomUUID(),at=now();
  const result=await db.batch([db.prepare("UPDATE workforce_companies SET application_json=?,applicant_email=?,revision=revision+1,operation_id=? WHERE id=? AND owner_id=? AND revision=? AND verification_status IN ('pending','rejected')").bind(JSON.stringify(application),email,op,id,user,c.revision),db.prepare("INSERT INTO workforce_company_events(id,company_id,revision,action,actor,detail_json,at) SELECT ?,?,revision,'application_updated',?,'{}',? FROM workforce_companies WHERE id=? AND operation_id=?").bind(crypto.randomUUID(),id,m.name,at,id,op)]);
  if(!result[0].meta.changes)throw fail('company_changed',409);return companyOverview(db,id,user);
 }
 if(!['pending','approved'].includes(c.verification_status))throw fail('company_verification_required',403);
 if(action==='invites'){
  const recipient=typeof b.email==='string'?b.email.trim().toLowerCase():'';
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient)||recipient.length>180||!['reviewer','admin'].includes(b.role))throw fail('company_invite_input');
  if(b.role==='admin'&&c.owner_id!==user)throw fail('company_owner_only',403);
  const n=await db.prepare('SELECT count(*) AS n FROM workforce_company_invites WHERE company_id=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>?').bind(id,now()).first();if(n.n>=30)throw fail('invite_limit',429);
  const token=crypto.randomUUID()+crypto.randomUUID(),hash=await digest(token),inviteId=crypto.randomUUID();
  await transaction(db,c,m,user,'team_invited',{role:b.role},(op,at)=>[db.prepare(`INSERT INTO workforce_company_invites(id,company_id,token_hash,email,role,expires_at,created_at) SELECT ?,?,?,?,?,?,? WHERE ${guard}`).bind(inviteId,id,hash,recipient,b.role,new Date(Date.now()+48*3600000).toISOString(),at,id,op)]);
  return {...await companyOverview(db,id,user),team_invite:token};
 }
 if(action==='revoke-invite'){
  const i=await db.prepare('SELECT * FROM workforce_company_invites WHERE id=? AND company_id=? AND used_at IS NULL AND revoked_at IS NULL').bind(b.invite_id,id).first();if(!i)throw fail('invalid_invite',404);if(i.role==='admin'&&c.owner_id!==user)throw fail('company_owner_only',403);
  await transaction(db,c,m,user,'team_invite_revoked',{role:i.role},(op,at)=>[db.prepare(`UPDATE workforce_company_invites SET revoked_at=? WHERE id=? AND ${guard}`).bind(at,i.id,id,op)]);return companyOverview(db,id,user);
 }
 if(action==='remove-member'){
  const target=await db.prepare('SELECT * FROM workforce_company_members WHERE id=? AND company_id=? AND active=1').bind(b.member_id,id).first();if(!target)throw fail('company_member_not_found',404);
  if(target.user_id===c.owner_id)throw fail('owner_cannot_be_removed',409);if(target.role==='admin'&&c.owner_id!==user)throw fail('company_owner_only',403);
  // Do not reactivate a removed person's old assignments on a later invitation.
  const assigned=await db.prepare("SELECT count(*) AS n FROM workforce_intake_cases WHERE company_id=? AND reviewer_id=? AND json_extract(state_json,'$.stage')!='deleted' AND COALESCE(json_extract(state_json,'$.self_test'),0)=0 AND COALESCE(json_extract(state_json,'$.synthetic_demo'),0)=0").bind(id,target.user_id).first();if(assigned.n)throw fail('reassign_first',409);
  await transaction(db,c,m,user,'member_removed',{member:target.name},op=>[db.prepare(`UPDATE workforce_company_members SET active=0 WHERE id=? AND ${guard}`).bind(target.id,id,op)],"NOT EXISTS (SELECT 1 FROM workforce_intake_cases WHERE company_id=? AND reviewer_id=? AND json_extract(state_json,'$.stage')!='deleted' AND COALESCE(json_extract(state_json,'$.self_test'),0)=0 AND COALESCE(json_extract(state_json,'$.synthetic_demo'),0)=0)",[id,target.user_id]);return companyOverview(db,id,user);
 }
 if(action==='assign'){
  const target=await db.prepare('SELECT * FROM workforce_company_members WHERE id=? AND company_id=? AND active=1').bind(b.member_id,id).first();if(!target)throw fail('company_member_not_found',404);
  const row=await db.prepare('SELECT * FROM workforce_intake_cases WHERE id=? AND company_id=?').bind(b.case_id,id).first();if(!row)throw fail('not_found',404);
  const s=JSON.parse(row.state_json);if(b.case_revision!==row.revision)throw fail('revision_conflict',409);if(['processing','deleted','deleting'].includes(s.stage))throw fail('handoff_unavailable',409);if(s.self_test||row.employee_id===target.user_id)throw fail('separate_reviewer_required',409);if(row.reviewer_id===target.user_id)throw fail('already_assigned',409);
  const old=await db.prepare('SELECT name FROM workforce_company_members WHERE company_id=? AND user_id=?').bind(id,row.reviewer_id).first();
  const e={case_id:row.id,revision:row.revision+1,action:'reviewer_reassigned',at:now(),actor:(await digest(user)).slice(0,16),state_hash:await digest(s),version:s.version,stage:s.stage,from:old?.name||'Previous reviewer',to:target.name};const json=JSON.stringify(e),hash=await digest(row.event_hash+'\n'+json);
  // The case CAS must fail the entire transaction rather than record a false handoff.
  await transaction(db,c,m,user,'reviewer_reassigned',{case_id:row.id,from:e.from,to:e.to},op=>[
   db.prepare(`UPDATE workforce_intake_cases SET reviewer_id=?,revision=revision+1,event_json=?,previous_hash=?,event_hash=?,updated_at=? WHERE id=? AND revision=? AND ${guard}`).bind(target.user_id,json,row.event_hash,hash,e.at,row.id,row.revision,id,op)
  ],'EXISTS (SELECT 1 FROM workforce_intake_cases WHERE id=? AND revision=?)',[row.id,row.revision]);return companyOverview(db,id,user);
 }
 throw fail('not_found',404);
}
