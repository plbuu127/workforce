import {PREPARATION_SOURCES} from './preparation.js';
// Anonymous judging sandbox: fixed synthetic assets only, separate state table.
// Never delegates to the real intake API or creates company memberships.
import {digest,todayKST} from './workforce.js';
import {readDocuments,inspectReading,draftGuidance,comparison,VISION_MODEL} from './intake-ai.js';
const fail=(code,status=400)=>Object.assign(new Error(code),{code,status});
const profile={location:'korea',goal:'change_employer',reported_status:'E-7-1',new_job_title:'Software engineer',job_changed:'no',previous_end:'2026-10-31'};
const names=[['contract','Employment contract'],['stay','Reported stay information'],['offer','Company joining details']];
export function demoDocuments(phase){return names.map(([id,label])=>{const original=id==='contract'?(phase===0?'contract-unsigned-realistic.pdf':'contract-signed-realistic.pdf'):id==='stay'?(phase===2?'stay-current.jpg':'stay-expiring.jpg'):(phase===2?'company-offer-corrected.pdf':'company-offer-initial.pdf');return {id,category:id,label,original:'/samples/'+original,page:'/samples/'+original.replace('.pdf','-1.jpg')};});}
async function limited(db,scope,limit){const row=await db.prepare('INSERT INTO workforce_ai_usage(scope,day,calls) VALUES(?,?,1) ON CONFLICT(scope) DO UPDATE SET day=excluded.day,calls=CASE WHEN workforce_ai_usage.day=excluded.day THEN workforce_ai_usage.calls+1 ELSE 1 END WHERE workforce_ai_usage.day!=excluded.day OR workforce_ai_usage.calls<? RETURNING calls').bind(scope,todayKST(),limit).first();if(!row)throw fail('demo_daily_limit',429);}
async function readBody(request){if(!request.headers.get('content-type')?.startsWith('application/json'))throw fail('json_required',415);const reader=request.body?.getReader();if(!reader)throw fail('input');let n=0,chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>1024){await reader.cancel();throw fail('too_large',413);}chunks.push(value);}let b;try{b=JSON.parse(new TextDecoder().decode(Uint8Array.from(chunks.flatMap(x=>Array.from(x)))));}catch{throw fail('input');}if(!b||Array.isArray(b)||Object.keys(b).some(x=>!['action','revision','consent','reviewed'].includes(x)))throw fail('fixed_samples_only');return b;}
const expose=r=>({revision:r.revision,...JSON.parse(r.state_json),expires_at:r.expires_at});
function record(s,action,role){s.events.push({action,role,phase:s.phase+1,at:new Date().toISOString()});}
async function save(db,row,s){const result=await db.prepare('UPDATE workforce_demo_sessions SET revision=revision+1,state_json=? WHERE token_hash=? AND revision=? AND expires_at>?').bind(JSON.stringify(s),row.token_hash,row.revision,new Date().toISOString()).run();if(!result.meta.changes)throw fail('demo_changed',409);return {...row,revision:row.revision+1,state_json:JSON.stringify(s)};}
export async function handleDemo(request,env,assets){
 const url=new URL(request.url),headers={'cache-control':'no-store','x-content-type-options':'nosniff'};const reply=(body,status=200)=>Response.json(body,{status,headers});
 try{
  if(url.pathname!=='/api/demo')throw fail('not_found',404);
  if(!['GET','POST'].includes(request.method))throw fail('method',405);
  if(!env.DB)throw fail('storage',503);
  const raw=(request.headers.get('cookie')||'').match(/(?:^|;\s*)wf_demo=([a-f0-9]{64})(?:;|$)/)?.[1];
  let row=raw?await env.DB.prepare('SELECT * FROM workforce_demo_sessions WHERE token_hash=? AND expires_at>?').bind(await digest(raw),new Date().toISOString()).first():null;
  const configured=!!env.NEBIUS_API_KEY&&env.NEBIUS_AI_ENABLED==='true';
  if(request.method==='GET')return reply({session:row?expose(row):null,configured,model:VISION_MODEL});
  if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')throw fail('origin',403);
  const b=await readBody(request),ip=await digest(request.headers.get('cf-connecting-ip')||'shared-unavailable-ip');
  const quota=async()=>{await limited(env.DB,'demo-ai-ip:'+ip,12);await limited(env.DB,'demo-ai-global',60);await limited(env.DB,'global',100);};
  if(b.action==='start'){
   if(row)return reply({session:expose(row),configured});
   await limited(env.DB,'demo-start-ip:'+ip,10);await limited(env.DB,'demo-start-global',200);
   const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''),at=new Date().toISOString(),s={phase:0,stage:'collecting',documents:demoDocuments(0),analysis:null,history:[],events:[],attempts:0};record(s,'Sample packet prepared','Employee');
   await env.DB.prepare('DELETE FROM workforce_demo_sessions WHERE expires_at<=?').bind(at).run();
   row={token_hash:await digest(token),revision:1,state_json:JSON.stringify(s),created_at:at,expires_at:new Date(Date.now()+6*3600000).toISOString()};
   await env.DB.prepare('INSERT INTO workforce_demo_sessions(token_hash,revision,state_json,created_at,expires_at) VALUES(?,1,?,?,?)').bind(row.token_hash,row.state_json,row.created_at,row.expires_at).run();
   headers['set-cookie']=`wf_demo=${token}; HttpOnly; SameSite=Strict; Path=/api/demo; Max-Age=21600${url.protocol==='https:'?'; Secure':''}`;
   return reply({session:expose(row),configured},201);
  }
  if(!row)throw fail('demo_session_required',401);
  if(b.revision!==row.revision)throw fail('demo_changed',409);
  let s=JSON.parse(row.state_json);
  if(s.stage==='processing'){
   if(b.action!=='recover'||Date.now()-Date.parse(s.started_at)<420000)throw fail('demo_processing',409);
   s.stage='failed';s.error='analysis_interrupted';record(s,'Interrupted analysis recovered','System');row=await save(env.DB,row,s);return reply({session:expose(row),configured});
  }
  if(b.action==='restart'){
   // Reset only this synthetic packet. Preserve session expiry and all usage counters.
   s={phase:0,stage:'collecting',documents:demoDocuments(0),analysis:null,history:[],events:[],attempts:s.attempts,guidance_attempts:s.guidance_attempts||0};
   record(s,'Sample packet restarted; AI allowance unchanged','System');
  }else if(b.action==='guidance'){
   if(!s.analysis||!['needs_changes','ready_for_review','reviewer_changes'].includes(s.stage)||!s.analysis.issues.length)throw fail('not_reviewable',409);
   if(b.consent!==true)throw fail('consent_required');if(!configured)throw fail('ai_not_configured',503);
   if((s.guidance_attempts||0)>=3)throw fail('demo_session_limit',429);
   const previousStage=s.stage;s.guidance_attempts=(s.guidance_attempts||0)+1;s.stage='processing';s.started_at=new Date().toISOString();record(s,'Guidance retry started','System');row=await save(env.DB,row,s);
   try{await quota();s.analysis.guidance=await draftGuidance(s.analysis.reading,s.analysis.issues,env.NEBIUS_API_KEY,fetch,profile);s.analysis.guidance_error=null;s.analysis.guidance_error_details=null;record(s,'Live guidance generated','NVIDIA on Nebius');}
   catch(e){s.analysis.guidance_error=e.code||'provider_error';s.analysis.guidance_error_details=e.diagnostics||null;record(s,'Guidance retry failed; findings retained','System');}
   s.analysis.sources=PREPARATION_SOURCES;s.stage=previousStage;
  }else if(b.action==='request_changes'){
   if(!s.analysis||s.phase===2||s.stage==='approved'||s.stage==='reviewer_changes')throw fail('not_reviewable',409);
   s.stage='reviewer_changes';record(s,'Reviewer requested the current agreed documents','Reviewer');
  }else if(b.action==='approve'){
   if(s.phase!==2||s.stage!=='ready_for_review'||s.analysis.issues.length||b.reviewed!==true)throw fail('review_required',409);
   s.stage='approved';record(s,'Sample preparation review completed; not work permission','Reviewer');
  }else if(['analyze','signed','corrected'].includes(b.action)){
   if(b.consent!==true)throw fail('consent_required');if(!configured)throw fail('ai_not_configured',503);
   if(s.attempts>=6)throw fail('demo_session_limit',429);
   if(b.action==='analyze'&&!(['collecting','failed'].includes(s.stage)||(s.phase===2&&s.stage==='needs_changes')))throw fail('demo_order',409);
   if(b.action!=='analyze'&&(s.stage!=='reviewer_changes'||s.phase!==(b.action==='signed'?0:1)))throw fail('demo_order',409);
   if(b.action!=='analyze'){s.history.push({phase:s.phase,analysis:s.analysis,documents:s.documents});s.phase++;s.documents=demoDocuments(s.phase);s.analysis=null;record(s,'Updated sample documents submitted','Employee');}
   s.analysis=null;s.stage='processing';s.error=null;s.started_at=new Date().toISOString();s.attempts++;record(s,'Analysis started','System');row=await save(env.DB,row,s);
   try{
    const images=s.documents.map(d=>({id:d.id+':1',category:d.category,data:'data:image/jpeg;base64,'+assets[d.page].body}));
    const reading=await readDocuments(images,env.NEBIUS_API_KEY,fetch,quota);
    // Fixed scenario reference date: not a live immigration deadline calculation.
    const issues=inspectReading(reading,s.documents,'2026-10-28',profile),previous=s.history.at(-1)?.analysis?.issues||[];
    let guidance=null,guidance_error=null,guidance_error_details=null;try{if(issues.length)await quota();guidance=await draftGuidance(reading,issues,env.NEBIUS_API_KEY,fetch,profile);}catch(e){guidance_error=e.code||'provider_error';guidance_error_details=e.diagnostics||null;}
    s.analysis={reading,issues,sources:PREPARATION_SOURCES,guidance_error_details,comparison:comparison(previous,issues),guidance,guidance_error};s.stage=issues.length?'needs_changes':'ready_for_review';record(s,'Live analysis completed','NVIDIA on Nebius');
   }catch(e){s.stage='failed';s.error=e.code||'provider_error';record(s,'Analysis failed; no simulated result substituted','System');}
  }else throw fail('unknown_action');
  row=await save(env.DB,row,s);return reply({session:expose(row),configured});
 }catch(e){return reply({code:e.code||'server'},e.status||500);}
}
