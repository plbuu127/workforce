import {isOperator,handleVerification,recipientEmail} from './verification.js';
import {CASE_ACCESS,CASE_SELECT,handleCompanies,listCompanies,requireCompanyReviewer} from './companies.js';
import {allGuidanceChecks} from './case-update-view.js';
import {correctExtraction,updateSituation,situationActions} from './case-updates.js';
import {UPLOAD_LIMITS} from './upload-limits.js';
import {normalizeProfile,preparationPlan,requiredCompanyChecks,e7Requirements} from './preparation.js';
import {digest,todayKST,safeDraft} from './workforce.js';
import {VISION_MODEL,readDocuments,inspectReading,draftGuidance,comparison} from './intake-ai.js';
const base='/api/intake';
const reply=(v,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const error=(code,status=400)=>Object.assign(new Error(code),{code,status});
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const cleanText=(s,min=1,max=600)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max&&!/[<>\u0000-\u0008]|\b\d{6}[- ]?\d{7}\b/.test(s);
function applyReviewPacket(s,b){
 const packet=b.review_packet;if(!packet||typeof packet!=='object'||!s.profile)throw error('invalid_review_packet');
 const at=new Date().toISOString(),items=e7Requirements(s).filter(t=>t.owner==='reviewer'),checklist={...s.checklist};
 for(const item of items){const v=packet.items?.[item.id];if(!v||!['ready','follow_up','pending'].includes(v.status)||!cleanText(v.note,v.status==='pending'?0:10,400)||v.note.includes('[[VERIFY]]'))throw error('invalid_checklist');checklist[item.id]={status:v.status,note:v.note.trim(),at,owner:'reviewer'};}
 const transition=packet.transition_note||'';if(!cleanText(transition,0,400))throw error('invalid_company_check');
 const procedure=items.length?checklist['occupation-route'].note:packet.procedure_note||'';
 if(procedure&&(!cleanText(procedure,15,600)||procedure.includes('[[VERIFY]]')))throw error('invalid_company_check');
 const facts=s.analysis.reading.fields;
 const company=b.originals_reviewed===true?'Reviewer compared source pages for reported status '+(facts.status.value||'unconfirmed')+', start '+(facts.contract_start.value||'unconfirmed')+' and expiry '+(facts.stay_expiry.value||'unconfirmed')+'. Employer and role comparisons are retained in this version.':'';
 const employeeTransition=e7Requirements(s).find(t=>t.id.startsWith('transition-'));
 s.company_checks={company,procedure,...(s.profile.goal==='change_employer'?{transition:packet.transition_reviewed===true?('Reviewer checked the employee-reported previous-job transition: '+s.profile.previous_end+'. '+(employeeTransition?.note||'')+' '+transition).slice(0,600):''}:{})};
 s.checklist=checklist;
 s.review_draft={message:typeof b.message==='string'?b.message.slice(0,1800):'',resolution:typeof b.resolution==='string'?b.resolution.slice(0,600):'',originals_reviewed:b.originals_reviewed===true,flags_reviewed:b.flags_reviewed===true,guidance_reviewed:b.guidance_reviewed===true,transition_reviewed:packet.transition_reviewed===true,transition_note:transition,at,version:s.version};
}
const state=r=>JSON.parse(r.state_json);
const expose=(r,user)=>({id:r.id,invite_email:r.reviewer_id===user?r.invite_email:undefined,company_id:r.company_id||null,company_name:r.company_name||null,reviewer_name:r.reviewer_name||null,revision:r.revision,created_at:r.created_at,updated_at:r.updated_at,is_reviewer:r.reviewer_id===user,is_employee:r.employee_id===user,employee_joined:!!r.employee_id,state:state(r)});
const key=(id,doc,part)=>`intake/${id}/${doc}/${part}`;
async function readBytes(request,max){const reader=request.body?.getReader();if(!reader)throw error('empty_body');let n=0;const parts=[];for(;;){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>max){await reader.cancel();throw error('too_large',413);}parts.push(value);}const out=new Uint8Array(n);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;}
async function body(request){if(!request.headers.get('content-type')?.startsWith('application/json'))throw error('json_required',415);try{return JSON.parse(new TextDecoder().decode(await readBytes(request,12000)));}catch(e){throw e.code?e:error('invalid_json');}}
async function event(user,id,revision,action,s,previous=''){const e={case_id:id,revision,action,at:new Date().toISOString(),actor:(await digest(user)).slice(0,16),state_hash:await digest(s),version:s.version,stage:s.stage};if(['changes_requested','approved'].includes(action))e.message=s.review?.message||'';const json=JSON.stringify(e);return {json,hash:await digest(previous+'\n'+json),at:e.at};}
async function save(env,user,row,s,action,employee=row.employee_id,invite=row.invite_hash,expires=row.invite_expires,email=row.invite_email,claimEmail=null){const e=await event(user,row.id,row.revision+1,action,s,row.event_hash);const out=await env.DB.prepare(`UPDATE workforce_intake_cases SET revision=revision+1,state_json=?,event_json=?,previous_hash=?,event_hash=?,updated_at=?,employee_id=?,invite_hash=?,invite_expires=?,invite_email=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM workforce_companies co WHERE co.id=workforce_intake_cases.company_id AND co.verification_status='approved') AND (employee_id=? OR (reviewer_id=? AND EXISTS(SELECT 1 FROM workforce_company_members m WHERE m.company_id=workforce_intake_cases.company_id AND m.user_id=? AND m.active=1)) OR (?='employee_joined' AND employee_id IS NULL AND invite_hash=? AND invite_expires>? AND invite_email=?))`).bind(JSON.stringify(s),e.json,row.event_hash,e.hash,e.at,employee,invite,expires,email,row.id,row.revision,user,user,user,action,row.invite_hash,new Date().toISOString(),claimEmail).run();if(!out.meta.changes)throw error('revision_conflict',409);return getCase(env,row.id,user);}
async function getCase(env,id,user){const r=await env.DB.prepare(CASE_SELECT+' WHERE c.id=? AND '+CASE_ACCESS).bind(id,user,user).first();if(!r)throw error('not_found',404);return r;}
async function quota(db,user){for(const [scope,limit] of [[`intake:${user}`,20],['global',100]]){const r=await db.prepare('INSERT INTO workforce_ai_usage(scope,day,calls) VALUES(?,?,1) ON CONFLICT(scope) DO UPDATE SET day=excluded.day,calls=CASE WHEN workforce_ai_usage.day=excluded.day THEN workforce_ai_usage.calls+1 ELSE 1 END WHERE workforce_ai_usage.day!=excluded.day OR workforce_ai_usage.calls<? RETURNING calls').bind(scope,todayKST(),limit).first();if(!r)throw error('daily_limit',429);}}
function beginVersion(s){s.review_draft=null;if(s.stage==='collecting'||s.stage==='failed'){s.company_checks={};return;}if(s.history.length>=9)throw error('version_limit',409);s.history.push({version:s.version,documents:s.documents,analysis:s.analysis,review:s.review||null,stage:s.stage,profile:s.profile||null,company_checks:s.company_checks||{},checklist:s.checklist||{},situation_note:s.situation_note||null});s.version++;s.company_checks={};s.checklist={};s.documents=[...s.documents];s.analysis=null;s.review=null;s.stage='collecting';}
function fileType(b){if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return 'image/jpeg';if([137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x))return 'image/png';if(new TextDecoder().decode(b.slice(0,5))==='%PDF-')return 'application/pdf';return null;}
async function hashBytes(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function audit(env,row){const rows=(await env.DB.prepare('SELECT * FROM workforce_intake_audit WHERE case_id=? ORDER BY revision').bind(row.id).all()).results;let previous='',valid=rows.length===row.revision;for(let i=0;i<rows.length;i++){const e=rows[i];valid=valid&&e.revision===i+1&&e.previous_hash===previous&&e.event_hash===await digest(previous+'\n'+e.event_json);previous=e.event_hash;}valid=valid&&previous===row.event_hash&&rows.length>0&&JSON.parse(rows.at(-1).event_json).state_hash===await digest(state(row));return {valid,events:rows.map(e=>({...JSON.parse(e.event_json),hash:e.event_hash})),scope:'Append-only database audit with per-case hash chain; not externally notarized.'};}
export async function handleIntake(request,env){
 const user=request.headers.get('oai-authenticated-user-id');if(!user)return reply({code:'auth'},401);if(!env.DB)return reply({code:'storage'},503);const url=new URL(request.url),path=url.pathname;
 try{
  if(request.method!=='GET'&&(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site'))throw error('origin',403);
  if(path.startsWith(base+'/operator/'))return reply(await handleVerification(path.slice(base.length),request.method,request.method==='GET'?null:await body(request),env,user,url.searchParams.get('before')));
  if(path===base+'/companies'||path.startsWith(base+'/companies/'))return reply(await handleCompanies(path.slice(base.length),request.method,request.method==='GET'?null:await body(request),request,env,user));
  if(path===base&&request.method==='GET'){const rows=(await env.DB.prepare(CASE_SELECT+' WHERE '+CASE_ACCESS+' ORDER BY c.updated_at DESC LIMIT 200').bind(user,user).all()).results;return reply({account:{is_operator:isOperator(env,user),email:request.headers.get('oai-authenticated-user-email')||null},cases:rows.map(r=>expose(r,user)),companies:await listCompanies(env.DB,user),integration:{configured:!!env.NEBIUS_API_KEY&&env.NEBIUS_AI_ENABLED==='true',storage:!!env.BUCKET,vision_model:VISION_MODEL,reasoning_model:'nvidia/nemotron-3-super-120b-a12b'},limits:{max_file_mb:10,max_pages_per_file:12,max_pages_per_case:16,max_documents:4,max_versions:10,calls_per_user_day:20},local_preview:env.INTAKE_LOCAL_PREVIEW===true});}
  if(path===base+'/cases'&&request.method==='POST'){const b=await body(request);if(!cleanText(b.name,2,80)||!uuid(b.id))throw error('input');const companyId=b.company_id;if(!uuid(companyId))throw error('company_required',403);await requireCompanyReviewer(env.DB,companyId,user);if(b.self_test===true||b.demo===true)throw error('use_separate_demo',403);const employeeEmail=recipientEmail(b.employee_email);if(!employeeEmail)throw error('employee_email_required');const existing=await env.DB.prepare('SELECT * FROM workforce_intake_cases WHERE id=?').bind(b.id).first();if(existing){if(existing.reviewer_id!==user||existing.company_id!==companyId)throw error('id_conflict',409);return reply({case:expose(await getCase(env,b.id,user),user),reused:true});}const n=await env.DB.prepare('SELECT count(*) AS n FROM workforce_intake_cases WHERE reviewer_id=?').bind(user).first();if(n.n>=40)throw error('case_limit',429);const token=crypto.randomUUID()+crypto.randomUUID();const s={name:b.name.trim(),stage:'invited',version:1,documents:[],history:[],analysis:null,review:null,self_test:b.self_test===true,synthetic_demo:b.self_test===true&&b.demo===true,planning_enabled:b.planning===true,profile:null,company_checks:{}};if(s.self_test)s.stage='collecting';const e=await event(user,b.id,1,'created',s);await env.DB.prepare('INSERT INTO workforce_intake_cases(id,reviewer_id,employee_id,invite_hash,invite_expires,revision,state_json,event_json,previous_hash,event_hash,created_at,updated_at,company_id,invite_email) SELECT ?,?,?,?,?,1,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM workforce_companies co JOIN workforce_company_members m ON m.company_id=co.id WHERE co.id=? AND m.user_id=? AND m.active=1 AND co.verification_status=\'approved\')').bind(b.id,user,s.self_test?user:null,s.self_test?null:await digest(token),new Date(Date.now()+48*3600000).toISOString(),JSON.stringify(s),e.json,'',e.hash,e.at,e.at,companyId,employeeEmail,companyId,user).run();const r=await getCase(env,b.id,user);return reply({case:expose(r,user),invite:s.self_test?null:token},201);}
  if(path===base+'/join'&&request.method==='POST'){const b=await body(request);if(typeof b.token!=='string'||b.token.length!==72)throw error('invalid_invite');let r=await env.DB.prepare('SELECT * FROM workforce_intake_cases WHERE invite_hash=?').bind(await digest(b.token)).first();if(!r||r.employee_id||Date.parse(r.invite_expires)<Date.now())throw error('invalid_invite',404);if(r.reviewer_id===user)throw error('use_employee_account',409);const email=recipientEmail(request.headers.get('oai-authenticated-user-email'));if(!email||email!==r.invite_email)throw error('invite_account_mismatch',403);const co=await env.DB.prepare("SELECT id FROM workforce_companies WHERE id=? AND verification_status='approved'").bind(r.company_id).first();if(!co)throw error('company_verification_required',403);const s=state(r);s.stage='collecting';r=await save(env,user,r,s,'employee_joined',user,null,null,r.invite_email,email);return reply({case:expose(r,user)});}
  const m=path.match(/^\/api\/intake\/cases\/([0-9a-f-]{36})(?:\/(.*))?$/);if(!m||!uuid(m[1]))throw error('not_found',404);let row=await getCase(env,m[1],user);let s=state(row);const action=m[2]||'';
  if(request.method==='GET'&&!action)return reply({case:expose(row,user)});
  if(request.method==='GET'&&action==='audit')return reply(await audit(env,row));
  if(request.method==='GET'&&action==='export'){if(s.stage!=='approved')throw error('approval_required',409);const a=await audit(env,row);if(!a.valid)throw error('audit_integrity',409);return reply({case:expose(row,user),audit:a,scope:'Preparation review only; not immigration approval or permission to work.',external_actions_performed:[]});}
  const file=action.match(/^files\/([0-9a-f-]{36})\/(original|page-[0-9]{1,2})$/);
  if(file&&request.method==='GET'){if(['deleted','deleting'].includes(s.stage))throw error('not_found',404);const docs=[...s.documents,...s.history.flatMap(h=>h.documents)];const d=docs.find(d=>d.id===file[1]);if(!d||!env.BUCKET)throw error('not_found',404);if(file[2]!=='original'&&Number(file[2].slice(5))>=d.pages)throw error('not_found',404);const object=await env.BUCKET.get(key(row.id,d.id,file[2]));if(!object)throw error('not_found',404);return new Response(object.body,{headers:{'content-type':file[2]==='original'?d.type:'image/jpeg','cache-control':'private, no-store','x-content-type-options':'nosniff','content-disposition':file[2]==='original'?`attachment; filename="document.${d.type==='application/pdf'?'pdf':d.type==='image/png'?'png':'jpg'}"`:'inline','content-security-policy':"default-src 'none'; sandbox"}});}
  if(s.stage==='deleted')throw error('case_deleted',410);
  if(s.stage==='deleting'&&action!=='purge')throw error('deletion_pending',409);
  if(s.stage==='processing'){
    if(request.method==='POST'&&action==='recover'&&Date.now()-Date.parse(s.started_at)>420000&&row.employee_id===user){s.stage='failed';s.error='analysis_interrupted';row=await save(env,user,row,s,'analysis_interrupted');return reply({case:expose(row,user)});}throw error('processing',409);
  }
  if(action==='documents'&&request.method==='POST'){
    if(!row.employee_id)throw error('employee_not_joined',409);if(!env.BUCKET)throw error('file_storage',503);
    const bytes=await readBytes(request,UPLOAD_LIMITS.multipartBytes);let form;try{form=await new Response(bytes,{headers:{'content-type':request.headers.get('content-type')||''}}).formData();}catch{throw error('invalid_upload');}
    if(Number(form.get('revision'))!==row.revision)throw error('revision_conflict',409);const category=form.get('category'),original=form.get('file');if(!['contract','stay','residence','offer'].includes(category)||!original?.arrayBuffer||original.size<10||original.size>UPLOAD_LIMITS.fileBytes)throw error('invalid_file');if(category==='offer'?row.reviewer_id!==user:row.employee_id!==user)throw error(category==='offer'?'reviewer_only':'employee_only',403);const raw=new Uint8Array(await original.arrayBuffer()),type=fileType(raw);if(!type||type!==original.type)throw error('unsupported_file');const pages=form.getAll('pages');if(pages.length<1||pages.length>UPLOAD_LIMITS.pagesPerFile||type!=='application/pdf'&&pages.length!==1)throw error('page_limit');const rasters=[];for(const p of pages){if(!p?.arrayBuffer||p.size>UPLOAD_LIMITS.pageBytes)throw error('page_limit');const raster=new Uint8Array(await p.arrayBuffer());if(fileType(raster)!=='image/jpeg')throw error('invalid_page');rasters.push(raster);}beginVersion(s);if(s.documents.filter(d=>d.category!==category).reduce((n,d)=>n+d.pages,0)+pages.length>UPLOAD_LIMITS.pagesPerCase)throw error('page_limit');const retained=[...s.documents,...s.history.flatMap(h=>h.documents)];if(retained.reduce((n,d)=>n+d.size,0)+raw.length>50*1024*1024)throw error('case_storage_limit');const id=crypto.randomUUID();const d={id,name:String(original.name).replace(/[^a-zA-Z0-9._ ()-]/g,'_').slice(0,100),category,submitted_by:category==='offer'?'reviewer':'employee',type,size:raw.length,pages:pages.length,sha256:await hashBytes(raw),at:new Date().toISOString()};const keys=[key(row.id,id,'original'),...rasters.map((_,i)=>key(row.id,id,`page-${i}`))];try{await env.BUCKET.put(keys[0],raw,{httpMetadata:{contentType:type}});for(let i=0;i<rasters.length;i++)await env.BUCKET.put(keys[i+1],rasters[i],{httpMetadata:{contentType:'image/jpeg'}});const old=s.documents.find(x=>x.category===category);s.documents=s.documents.filter(x=>x.category!==category).concat(d);s.stage='collecting';s.analysis=null;s.error=null;row=await save(env,user,row,s,'document_uploaded');if(old&&!s.history.some(h=>h.documents.some(x=>x.id===old.id)))await env.BUCKET.delete([key(row.id,old.id,'original'),...Array.from({length:old.pages},(_,i)=>key(row.id,old.id,`page-${i}`))]);return reply({case:expose(row,user)},201);}catch(e){await env.BUCKET.delete(keys);throw e;}
  }
  if(request.method!=='POST')throw error('method',405);const b=await body(request);if(b.revision!==row.revision)throw error('revision_conflict',409);
  if(action==='profile'){
    if(row.employee_id!==user)throw error('employee_only',403);
    let profile;try{profile=normalizeProfile(b.profile);}catch{throw error('invalid_profile');}
    if(JSON.stringify(profile)===JSON.stringify(s.profile))return reply({case:expose(row,user)});
    beginVersion(s);s.profile=profile;s.checklist={};s.planning_enabled=true;s.analysis=null;s.review=null;s.stage='collecting';
    row=await save(env,user,row,s,'situation_updated');return reply({case:expose(row,user)});
  }
  if(action==='correct-extraction'){
    if(row.reviewer_id!==user)throw error('reviewer_only',403);
    correctExtraction(s,b,(await digest(user)).slice(0,16),todayKST());
    row=await save(env,user,row,s,b.restore?'extraction_restored':'extraction_corrected');return reply({case:expose(row,user)});
  }
  if(action==='situation-note'){
    if(row.employee_id!==user)throw error('employee_only',403);
    updateSituation(s,b,todayKST());row=await save(env,user,row,s,'employee_situation_recorded');return reply({case:expose(row,user)});
  }
  if(action==='refresh-guidance'){
    if(!s.analysis||!['needs_changes','ready_for_review'].includes(s.stage))throw error('not_reviewable',409);
    if(b.consent!==true)throw error('consent_required');
    if(!env.NEBIUS_API_KEY||env.NEBIUS_AI_ENABLED!=='true')throw error('ai_not_configured',503);
    try{await quota(env.DB,user);s.analysis.guidance=await draftGuidance(s.analysis.reading,allGuidanceChecks(s),env.NEBIUS_API_KEY,fetch,s.profile,s.situation_note,s.history.at(-1)?.analysis?.issues||[]);s.analysis.guidance_error=null;s.analysis.guidance_error_details=null;}
    catch(e){s.analysis.guidance_error_details=e.diagnostics||null;s.analysis.guidance=null;s.analysis.guidance_error=['daily_limit','provider_invalid_guidance','provider_timeout','provider_limit','provider_auth','provider_billing'].includes(e.code)?e.code:'guidance_failed';}
    row=await save(env,user,row,s,'guidance_updated');return reply({case:expose(row,user)});
  }
  if(action==='company-checks'){
    if(row.reviewer_id!==user)throw error('reviewer_only',403);if(!s.profile||!s.analysis||!['needs_changes','ready_for_review','reviewer_changes'].includes(s.stage))throw error('not_reviewable',409);
    const checks={};for(const k of requiredCompanyChecks(s.profile)){const note=b.checks?.[k]||'';if(note&&(!cleanText(note,15,600)||note.includes('[[VERIFY]]')))throw error('invalid_company_check');checks[k]=note.trim();}
    s.company_checks=checks;row=await save(env,user,row,s,'company_checks_updated');return reply({case:expose(row,user)});
  }
  if(action==='review-packet'){
    if(row.reviewer_id!==user)throw error('reviewer_only',403);
    if(!s.analysis||!['needs_changes','ready_for_review'].includes(s.stage))throw error('not_reviewable',409);
    applyReviewPacket(s,b);row=await save(env,user,row,s,'review_packet_saved');return reply({case:expose(row,user)});
  }
  if(action==='checklist'){
    const item=e7Requirements(s).find(t=>t.id===b.item_id);
    if(!item)throw error('invalid_checklist');
    if(item.owner==='employee'?row.employee_id!==user:row.reviewer_id!==user)throw error('checklist_owner_only',403);
    if(!['collecting','failed','needs_changes','ready_for_review','reviewer_changes'].includes(s.stage))throw error('not_reviewable',409);
    if(!['ready','follow_up','pending'].includes(b.status)||!cleanText(b.note,b.status==='pending'?0:10,400))throw error('invalid_checklist');
    s.checklist={...s.checklist,[item.id]:{status:b.status,note:b.note.trim(),at:new Date().toISOString(),owner:item.owner}};
    if(item.owner==='employee'&&item.id.startsWith('transition-')){s.company_checks={...s.company_checks,transition:''};if(s.review_draft)s.review_draft.transition_reviewed=false;}
    row=await save(env,user,row,s,'preparation_item_updated');return reply({case:expose(row,user)});
  }
  if(action==='invite'){if(row.reviewer_id!==user||row.employee_id)throw error('reviewer_only',403);const email=recipientEmail(b.employee_email);if(!email)throw error('employee_email_required');const token=crypto.randomUUID()+crypto.randomUUID();row=await save(env,user,row,s,'invite_renewed',null,await digest(token),new Date(Date.now()+48*3600000).toISOString(),email);return reply({case:expose(row,user),invite:token});}
  if(action==='remove-document'){const d=s.documents.find(d=>d.id===b.document_id);if(!d)throw error('not_found',404);if(d.category==='offer'?row.reviewer_id!==user:row.employee_id!==user)throw error('document_owner_only',403);beginVersion(s);s.documents=s.documents.filter(x=>x.id!==d.id);s.analysis=null;s.stage='collecting';row=await save(env,user,row,s,'document_removed');if(!s.history.some(h=>h.documents.some(x=>x.id===d.id)))await env.BUCKET?.delete([key(row.id,d.id,'original'),...Array.from({length:d.pages},(_,i)=>key(row.id,d.id,`page-${i}`))]);return reply({case:expose(row,user)});}
  if(action==='submit'){
    if(row.employee_id!==user)throw error('employee_only',403);if(!['collecting','failed'].includes(s.stage)||!s.documents.length)throw error('not_submittable',409);if(s.planning_enabled&&!s.profile)throw error('situation_required',409);if(b.consent!==true)throw error('consent_required');if(!env.BUCKET||!env.NEBIUS_API_KEY||env.NEBIUS_AI_ENABLED!=='true')throw error('ai_not_configured',503);
    s.stage='processing';s.started_at=new Date().toISOString();s.error=null;s.error_details=null;s.analysis=null;row=await save(env,user,row,s,'submitted');
    try{const images=[];for(const d of s.documents){for(let i=0;i<d.pages;i++){const obj=await env.BUCKET.get(key(row.id,d.id,`page-${i}`));if(!obj)throw error('missing_file');const bytes=new Uint8Array(await obj.arrayBuffer());let bin='';for(let j=0;j<bytes.length;j+=8192)bin+=String.fromCharCode(...bytes.subarray(j,j+8192));images.push({id:`${d.id}:${i+1}`,category:d.category,data:'data:image/jpeg;base64,'+btoa(bin)});}}
      const reading=await readDocuments(images,env.NEBIUS_API_KEY,fetch,()=>quota(env.DB,user));const issues=inspectReading(reading,s.documents,todayKST(),s.profile);s.analysis={reading,issues,reference_date:todayKST(),comparison:comparison(s.history.at(-1)?.analysis?.issues,issues),guidance:null};
      try{const guidanceIssues=allGuidanceChecks(s);if(guidanceIssues.length)await quota(env.DB,user);s.analysis.guidance=await draftGuidance(reading,guidanceIssues,env.NEBIUS_API_KEY,fetch,s.profile,s.situation_note,s.history.at(-1)?.analysis?.issues||[]);}catch(e){s.analysis.guidance_error_details=e.diagnostics||null;s.analysis.guidance_error=['daily_limit','provider_invalid_guidance','provider_timeout','provider_limit','provider_auth','provider_billing'].includes(e.code)?e.code:'guidance_failed';}
      s.stage=issues.some(i=>i.blocking)?'needs_changes':'ready_for_review';row=await save(env,user,row,s,'analysis_completed');return reply({case:expose(row,user)});
    }catch(e){s.stage='failed';s.error_details=e.diagnostics||null;s.error=/^(provider_[a-z_]+|daily_limit|missing_file)$/.test(e.code||'')?e.code:'analysis_failed';row=await save(env,user,row,s,'analysis_failed');return reply({case:expose(row,user),code:s.error},502);}
  }
  if(action==='ask-reviewer'){if(row.employee_id!==user||!s.analysis||!['needs_changes','ready_for_review','reviewer_changes'].includes(s.stage)||!cleanText(b.message,5,600))throw error('input');const returned=s.stage==='reviewer_changes';s.employee_note=b.message.trim();s.review=null;s.review_draft=null;s.stage='ready_for_review';row=await save(env,user,row,s,returned?'corrections_returned_for_review':'review_requested');return reply({case:expose(row,user)});}
  if(action==='request-changes'||action==='approve'){
    if(row.reviewer_id!==user)throw error('reviewer_only',403);if(!s.analysis||!['needs_changes','ready_for_review'].includes(s.stage))throw error('not_reviewable',409);if(!cleanText(b.message,10,1800)||!safeDraft({en:b.message}))throw error('invalid_message');
    if(b.review_packet)applyReviewPacket(s,b);
    if(action==='approve'){if(s.profile&&(!preparationPlan(s).profile_complete||requiredCompanyChecks(s.profile).some(k=>!s.company_checks?.[k])||!s.documents.some(d=>d.category==='offer')||e7Requirements(s).some(t=>t.status==='pending')))throw error('preparation_incomplete',409);if(b.originals_reviewed!==true||b.flags_reviewed!==true||b.guidance_reviewed!==true)throw error('review_required');if(!(await audit(env,row)).valid)throw error('audit_integrity',409);if((situationActions(s).length||s.analysis.issues.some(i=>i.blocking||s.profile)||e7Requirements(s).some(t=>t.status==='follow_up'))&&!cleanText(b.resolution,10,600))throw error('resolution_required');}
    s.review={decision:action==='approve'?'approved':'changes_requested',message:b.message.trim(),resolution:b.resolution?.trim()||null,at:new Date().toISOString(),version:s.version,scope:'Preparation review only; not immigration approval or work permission.'};s.stage=action==='approve'?'approved':'reviewer_changes';row=await save(env,user,row,s,action==='approve'?'approved':'changes_requested');return reply({case:expose(row,user)});
  }
  if(action==='purge'){
    if(b.confirm!==true)throw error('confirmation_required');
    const documents=[...s.documents,...s.history.flatMap(h=>h.documents)];
    if(s.stage!=='deleting'){s.stage='deleting';row=await save(env,user,row,s,'file_deletion_started',row.employee_id,null,null);}
    const keys=[...new Set(documents.flatMap(d=>[key(row.id,d.id,'original'),...Array.from({length:d.pages},(_,i)=>key(row.id,d.id,`page-${i}`))]))];
    if(keys.length)await env.BUCKET.delete(keys);
    s.documents=[];s.history=[];s.analysis=null;s.review=null;s.employee_note=null;s.situation_note=null;s.situation_history=[];s.profile=null;s.company_checks={};s.checklist={};s.review_draft=null;s.name='Deleted case';s.stage='deleted';
    row=await save(env,user,row,s,'files_deleted',row.employee_id,null,null);return reply({case:expose(row,user)});
  }
  throw error('not_found',404);
 }catch(e){return reply({code:e.code||'storage'},e.status||503);}
}
