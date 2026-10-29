import {application,approveFixture} from './approved-fixture.mjs';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
import {localDatabase} from './sqlite-adapter.mjs';
import {memoryBucket} from './r2-adapter.mjs';
import {VISION_MODEL} from '../dist/server/intake-ai.js';
let n=0;const check=(v,m)=>{assert.ok(v,m);n++;};
const DB=await localDatabase(),env={DB,BUCKET:memoryBucket(),NEBIUS_API_KEY:'offline-test-only',NEBIUS_AI_ENABLED:'true'};
const origin='https://company.test';
async function call(path,user='owner-a',b){const r=await worker.fetch(new Request(origin+'/api/intake'+path,{method:b===undefined?'GET':'POST',headers:{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@example.test',origin,...(b instanceof FormData?{}:{'content-type':'application/json'})},body:b===undefined?undefined:b instanceof FormData?b:JSON.stringify(b)}),env);return {status:r.status,body:r.headers.get('content-type')?.includes('json')?await r.json():await r.arrayBuffer()};}
const company=async(name,user)=>{const c=(await call('/companies',user,{id:crypto.randomUUID(),name,member_name:user,...application})).body.company;await approveFixture(env,c.id,c.revision);return c;};
const overview=async(c,user)=>(await call('/companies/'+c.id,user)).body;
async function invite(c,owner,who,role='reviewer'){const d=await overview(c,owner);return call('/companies/'+c.id+'/invites',owner,{revision:d.company.revision,email:who+'@example.test',role});}
async function add(c,owner,who,role='reviewer'){const i=await invite(c,owner,who,role);const r=await call('/companies/join',who,{token:i.body.team_invite,member_name:who});check(r.status===200,'team member joins '+who);return r.body.company;}
async function make(c,user,name){return call('/cases',user,{id:crypto.randomUUID(),company_id:c?.id,name,employee_email:'employee@example.test'});}
async function assign(c,owner,id,memberId,revision){const d=await overview(c,owner),x=d.cases?.find(x=>x.id===id);return call('/companies/'+c.id+'/assign',owner,{revision:d.company.revision,case_id:id,case_revision:revision??x.revision,member_id:memberId});}
const jpeg=new Uint8Array([255,216,255,224,1,2,3,4,5,6,7,8,255,217]);
async function upload(c,cat,user='employee'){const f=new FormData();f.set('revision',c.revision);f.set('category',cat);f.set('file',new File([jpeg],cat+'.jpg',{type:'image/jpeg'}));f.append('pages',new File([jpeg],'p.jpg',{type:'image/jpeg'}));return call('/cases/'+c.id+'/documents',user,f);}
let signed=false;const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opt)=>{const q=JSON.parse(opt.body);let value;if(q.model===VISION_MODEL){const pages=q.messages[1].content.filter(x=>x.type==='text').map(x=>{const contract=x.text.includes('category: contract');return {page_id:x.text.match(/Page ID: ([^;]+)/)[1],text:contract?'Start 2026-11-10\nSignature '+(signed?'Test':'____'):'Status E-7\nExpiry 2027-06-30',quality:'readable',signature:contract?(signed?'visible':'blank'):'not_applicable'};});const stay=pages.find(p=>p.text.startsWith('Status')),contract=pages.find(p=>p.text.startsWith('Start')),f=(p,value,quote)=>p?{value,evidence:[{page_id:p.page_id,quote}]}:{value:'',evidence:[]};value={pages,fields:{status:f(stay,'E-7','Status E-7'),stay_expiry:f(stay,'2027-06-30','Expiry 2027-06-30'),contract_start:f(contract,'2026-11-10','Start 2026-11-10')}};}else value={message:'Check the signature area and provide the current signed contract. Your reviewer will compare the original pages.'};return Response.json({id:'company-integration-mock',model:q.model,choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});};
try{
 const a=await company('Fictional Company A','owner-a'),b=await company('Fictional Company B','owner-b');
 check(a.is_owner&&b.id!==a.id,'independent company spaces');
 check((await call('','owner-a')).body.companies.length===1,'company membership list isolated');
 for(const user of ['owner-b','employee','outsider'])check((await call('/companies/'+a.id,user)).status===404,'outsider cannot read company administration');
 check((await make(a,'owner-b','Forged company')).status===404,'cross-company create denied');
 const r1=await add(a,'owner-a','reviewer-one'),r2=await add(a,'owner-a','reviewer-two'),admin=await add(a,'owner-a','admin-a','admin');
 check((await overview(a,'reviewer-one')).members===undefined,'reviewer cannot enumerate staff and invitations');
 check((await invite(a,'reviewer-one','forbidden')).status===403,'reviewer cannot invite colleagues');
 check((await invite(a,'admin-a','forbidden','admin')).status===403,'non-owner cannot grant administrator');
 const inv=await invite(a,'owner-a','late-reviewer');
 check((await call('/companies/invitation','late-reviewer',{token:inv.body.team_invite})).body.team.company_name===a.name,'recipient can preview the company and role before joining');
 check((await call('/companies/invitation','wrong-account',{token:inv.body.team_invite})).status===403,'invitation preview withheld from wrong email');
 check((await call('/companies/join','wrong-account',{token:inv.body.team_invite,member_name:'Wrong Person'})).body.code==='invite_account_mismatch','team invite bound to exact sign-in email');
 check((await call('/companies/join','late-reviewer',{token:inv.body.team_invite,member_name:'Late Reviewer'})).status===200,'correct recipient can join');
 check((await call('/companies/join','late-reviewer',{token:inv.body.team_invite,member_name:'Replay'})).status===404,'single-use invitation');
 const revoked=await invite(a,'owner-a','never-joins');let d=await overview(a,'owner-a');const pending=d.invites.find(x=>x.email==='never-joins@example.test');
 check((await call('/companies/'+a.id+'/revoke-invite','owner-a',{revision:d.company.revision,invite_id:pending.id})).status===200,'administrator revokes invitation');
 check((await call('/companies/join','never-joins',{token:revoked.body.team_invite,member_name:'Never Joins'})).status===404,'revoked link cannot join');
 const expired=await invite(a,'owner-a','expired');await DB.prepare("UPDATE workforce_company_invites SET expires_at='2000-01-01T00:00:00.000Z' WHERE email=?").bind('expired@example.test').run();
 check((await call('/companies/join','expired',{token:expired.body.team_invite,member_name:'Expired User'})).status===404,'expired invitation denied');
 const madeA=await make(a,'reviewer-one','A employee packet'),madeB=await make(b,'owner-b','B employee packet');let ca=(await call('/join','employee',{token:madeA.body.invite})).body.case,cb=(await call('/join','employee',{token:madeB.body.invite})).body.case;
 check(ca.company_name===a.name&&cb.company_name===b.name,'same employee joins separate companies');
 const mine=(await call('','employee')).body;check(mine.cases.length===2&&mine.companies.length===0,'employee sees both own cases without staff membership');
 check((await call('','reviewer-one')).body.cases.length===1,'reviewer sees assigned case only');
 check((await call('','owner-a')).body.cases.length===0,'company owner cannot read unassigned packet');
 d=await overview(a,'owner-a');check(d.cases.length===1&&d.cases[0].name==='A employee packet'&&!JSON.stringify(d).includes('state_json'),'administrator sees status metadata only');
 for(const user of ['owner-a','owner-b','reviewer-two','outsider'])for(const path of ['', '/audit','/export'])check((await call('/cases/'+ca.id+path,user)).status===404,'unassigned cannot read case, audit or export');
 ca=(await upload(ca,'contract')).body.case;ca=(await upload(ca,'stay')).body.case;const originalDoc=ca.state.documents[0].id;
 for(const user of ['owner-a','owner-b','reviewer-two'])check((await call(`/cases/${ca.id}/files/${originalDoc}/original`,user)).status===404,'raw files obey assignment boundary');
 ca=(await call('/cases/'+ca.id+'/submit','employee',{revision:ca.revision,consent:true})).body.case;
 check(ca.state.stage==='needs_changes','AI result stored inside company case (mock transport)');
 ca=(await call('/cases/'+ca.id+'/request-changes','reviewer-one',{revision:ca.revision,message:'Please provide the signed contract and send the updated packet for review.'})).body.case;
 check(ca.state.stage==='reviewer_changes','assigned reviewer requests changes');
 check((await assign(a,'owner-a',ca.id,b.member_id)).status===404,'cannot assign a member of another company');
 check((await assign(a,'reviewer-one',ca.id,r2.member_id,ca.revision)).status===403,'reviewer cannot change own assignment');
 const before=await overview(a,'owner-a');check((await assign(a,'owner-a',ca.id,r2.member_id,1)).status===409,'stale case handoff denied');
 check((await overview(a,'owner-a')).company.revision===before.company.revision,'failed handoff does not record company change');
 check((await assign(a,'owner-a',ca.id,r2.member_id)).status===200,'administrator hands over to second reviewer');
 for(const path of ['', '/audit','/export',`/files/${originalDoc}/original`])check((await call('/cases/'+ca.id+path,'reviewer-one')).status===404,'former reviewer immediately loses access');
 check((await call('/cases/'+ca.id+'/request-changes','reviewer-one',{revision:ca.revision,message:'A former reviewer must not change this packet.'})).status===404,'former reviewer cannot write');
 ca=(await call('/cases/'+ca.id,'reviewer-two')).body.case;check(ca.state.review.message.includes('signed contract')&&ca.reviewer_name==='reviewer-two','new reviewer gets existing history and employee sees new assignment');
 check((await call('/cases/'+ca.id+'/audit','employee')).body.valid,'handoff preserves case hash chain');
 signed=true;ca=(await upload(ca,'contract')).body.case;check(ca.state.history.length===1,'employee resubmits after handoff, prior request retained');
 ca=(await call('/cases/'+ca.id+'/submit','employee',{revision:ca.revision,consent:true})).body.case;
 check(ca.state.stage==='ready_for_review','resubmitted company case passes mocked analysis');
 ca=(await call('/cases/'+ca.id+'/approve','reviewer-two',{revision:ca.revision,message:'Your submitted preparation packet has been reviewed. Contact the company about your next steps.',originals_reviewed:true,flags_reviewed:true,guidance_reviewed:true})).body.case;
 check(ca.state.stage==='approved','new assigned reviewer can complete decision');
 check((await call('/cases/'+ca.id+'/export','employee')).body.audit.valid,'employee export includes valid handoff chain');
 check((await call(`/cases/${ca.id}/files/${originalDoc}/original`,'reviewer-two')).status===200,'new reviewer can see prior version original');
 check((await call('/cases/'+cb.id,'reviewer-two')).status===404,'new assignment does not grant access to employee’s other company');
 d=await overview(a,'owner-a');check((await call('/companies/'+a.id+'/remove-member','owner-a',{revision:d.company.revision,member_id:r2.member_id})).body.code==='reassign_first','removal requires handoff including reviewed cases');
 check((await assign(a,'owner-a',ca.id,a.member_id)).status===200,'owner can explicitly assign case to themselves with audit');
 const oldSelfTest=crypto.randomUUID();await DB.prepare('INSERT INTO workforce_intake_cases(id,reviewer_id,employee_id,company_id,revision,state_json,event_json,previous_hash,event_hash,created_at,updated_at) VALUES(?,?,?,?,1,?,?,?,?,?,?)').bind(oldSelfTest,'reviewer-two','reviewer-two',a.id,JSON.stringify({name:'Quarantined legacy test',stage:'collecting',self_test:true}),'{}','','fixture','2026-01-01','2026-01-01').run();
 check((await call('/cases/'+oldSelfTest,'reviewer-two')).status===404,'legacy self-test stays quarantined');
 d=await overview(a,'owner-a');check((await call('/companies/'+a.id+'/remove-member','owner-a',{revision:d.company.revision,member_id:r2.member_id})).status===200,'unassigned reviewer removed');
 check((await DB.prepare('SELECT employee_id FROM workforce_intake_cases WHERE id=?').bind(oldSelfTest).first()).employee_id==='reviewer-two','removal preserves inaccessible legacy data');
 check((await call('/companies/'+a.id,'reviewer-two')).status===404&&(await make(a,'reviewer-two','Cannot create')).status===404,'removed staff cannot manage or create company cases');
 check((await call('','reviewer-two')).body.cases.length===0,'removed staff cannot enumerate packets');
 d=await overview(a,'owner-a');check((await call('/companies/'+a.id+'/remove-member','owner-a',{revision:d.company.revision,member_id:a.member_id})).body.code==='owner_cannot_be_removed','owner remains administrator');
 check((await make(null,'legacy-reviewer','Companyless bypass')).status===403,'companyless case creation denied');
 await assert.rejects(DB.prepare('UPDATE workforce_intake_cases SET company_id=? WHERE id=?').bind(b.id,ca.id).run(),/case_company_immutable/);n++;
 await assert.rejects(DB.prepare('DELETE FROM workforce_company_events WHERE company_id=?').bind(a.id).run(),/company_audit_append_only/);n++;
 await assert.rejects(DB.prepare("UPDATE workforce_company_events SET actor='forged' WHERE company_id=?").bind(a.id).run(),/company_audit_append_only/);n++;
 const cross=await worker.fetch(new Request(origin+'/api/intake/companies',{method:'POST',headers:{'oai-authenticated-user-id':'attacker',origin:'https://attacker.test','content-type':'application/json'},body:'{}'}),env);check(cross.status===403,'company mutations retain same-origin protection');
 check((await overview(a,'owner-a')).events.some(x=>x.action==='reviewer_reassigned'),'company handoff event recorded');
 console.log(`Companies: ${n} assertions passed. Two companies; separate synthetic identities; uploads, mocked AI, handoff, re-submission, approval and tenant isolation. No real user study.`);
}finally{globalThis.fetch=originalFetch;DB.close();}
