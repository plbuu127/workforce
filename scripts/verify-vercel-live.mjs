import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {e7Requirements} from '../shared/preparation.js';
const base=process.env.WORKFORCE_LIVE_URL||'https://workforce-pied-iota.vercel.app';
const report={at:new Date().toISOString(),url:base,scope:'Synthetic engineering verification; not a real employee study.',checks:[],analyses:[]};
let cookie='',otherCookie='',c;
const check=(value,label)=>{if(!value)throw new Error(label);report.checks.push(label);console.log('PASS',label);};
async function request(path,body,role='reviewer',session=cookie){const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{origin:base,cookie:session,'x-workforce-role':role,...(body instanceof Uint8Array?{'content-type':'application/octet-stream'}:body!==undefined?{'content-type':'application/json'}:{})},...(body!==undefined?{body:body instanceof Uint8Array?body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(290000)});return r;}
async function api(path,body,role='reviewer'){const r=await request('/api/intake'+path,body,role),j=await r.json();if(!r.ok)throw new Error(path+': '+r.status+' '+j.code);if(j.case)c=j.case;return j;}
async function mutate(action,body,role='employee'){return api('/cases/'+c.id+'/'+action,{revision:c.revision,...body},role);}
async function upload(category,name,page,role,large=false){let raw=await readFile('test/fixtures/preparation/'+name);if(large){const text=raw.toString('latin1'),at=text.lastIndexOf('startxref');if(at<0)throw new Error('PDF fixture structure');raw=Buffer.from(text.slice(0,at)+'%'+('X'.repeat(5*1024*1024))+'\n'+text.slice(at),'latin1');}
 const form=new FormData();form.set('revision',c.revision);form.set('category',category);form.set('file',new File([raw],name,{type:name.endsWith('.pdf')?'application/pdf':'image/jpeg'}));form.append('pages',new File([await readFile('test/fixtures/preparation/'+page)],'page.jpg',{type:'image/jpeg'}));const packed=new Request(base,{method:'POST',body:form}),bytes=new Uint8Array(await packed.arrayBuffer());
 let r=await request('/api/uploads/start',{target:'/api/intake/cases/'+c.id+'/documents',size:bytes.length,content_type:packed.headers.get('content-type')},role),j=await r.json();if(!r.ok)throw new Error('upload start: '+j.code);
 for(let i=0;i<Math.ceil(bytes.length/j.part_size);i++){r=await request(`/api/uploads/${j.id}/${i}`,bytes.slice(i*j.part_size,(i+1)*j.part_size),role);if(!r.ok)throw new Error('upload part '+i+': '+r.status);}
 r=await request('/api/uploads/'+j.id+'/complete',{},role);const result=await r.json();if(!r.ok)throw new Error('upload completion: '+result.code);c=result.case;check(c.state.documents.some(d=>d.category===category&&d.size===raw.length),`Saved ${category} ${large?'over 5 MiB':'file'} on Vercel`);
 const doc=c.state.documents.find(d=>d.category===category);r=await request(`/api/intake/cases/${c.id}/files/${doc.id}/original`,undefined,role);const returned=Buffer.from(await r.arrayBuffer());check(r.ok&&createHash('sha256').update(returned).digest('hex')===createHash('sha256').update(raw).digest('hex'),`Private ${category} original downloaded intact`);
}
async function analyze(label){await mutate('submit',{consent:true});const a=c.state.analysis;check(a?.reading?.proof?.mode==='live',label+' uses live vision');report.analyses.push({label,version:c.state.version,stage:c.state.stage,issues:a.issues.map(i=>({id:i.id,owner:i.owner})),vision:a.reading.proof,guidance:a.guidance?.proof||null,guidance_mode:a.guidance?.mode||(a.guidance?.proof?'live':'unavailable'),guidance_error:a.guidance_error||null});console.log(label,JSON.stringify({stage:c.state.stage,issues:a.issues.map(i=>i.id)}));}
try{
 const health=await(await request('/api/health',undefined,'reviewer','')).json();check(health.database&&health.files&&health.ai,'Production dependencies configured');
 let r=await request('/api/auth/guest',{},'reviewer','');cookie=r.headers.get('set-cookie')?.split(';')[0]||'';check(r.ok&&cookie,'Guest session without Vercel or ChatGPT login');
 r=await request('/api/auth/guest',{},'reviewer','');otherCookie=r.headers.get('set-cookie')?.split(';')[0]||'';
 const initial=await api('');check(initial.cases.length===0&&initial.companies.length===0,'Fresh empty workspace');
 const made=await api('/companies',{id:crypto.randomUUID(),name:'Fictional Vercel verification',member_name:'Synthetic reviewer'});const company=made.company;
 const packet=await api('/cases',{id:crypto.randomUUID(),name:'Synthetic migration verification',employee_email:initial.session.employee_email,company_id:company.id,planning:true});
 r=await request('/api/judge/join',{token:packet.invite});const joined=await r.json();check(r.ok,'Employee accepts new case');c=joined.case;
 r=await request('/api/intake/cases/'+c.id,undefined,'reviewer',otherCookie);check(r.status===404,'Another judge cannot read the case');
 await mutate('profile',{profile:{location:'korea',goal:'change_employer',reported_status:'E-7-1',new_job_title:'Software engineer',job_changed:'no',registered:'yes',previous_end:'completed'}});
 await upload('contract','contract-unsigned-realistic.pdf','contract-unsigned-realistic-1.jpg','employee',true);
 await upload('stay','stay-expiring.jpg','stay-expiring.jpg','employee');
 await upload('offer','company-offer-initial.pdf','company-offer-initial-1.jpg','reviewer');
 await analyze('Initial packet');
 check(c.state.analysis.issues.some(i=>i.id==='contract-signature'),'Live AI identifies unsigned contract');
 await mutate('request-changes',{message:'Please provide the signed contract and updated stay record. The company joining details also need correcting.'},'reviewer');check(c.state.stage==='reviewer_changes','Reviewer requests changes');
 await upload('contract','contract-signed-realistic.pdf','contract-signed-realistic-1.jpg','employee');await analyze('Signature updated');check(!c.state.analysis.issues.some(i=>i.id==='contract-signature'),'Signature issue removed after actual replacement');
 await upload('stay','stay-current.jpg','stay-current.jpg','employee');await upload('offer','company-offer-corrected.pdf','company-offer-corrected-1.jpg','reviewer');await analyze('Corrected packet');check(c.state.analysis.issues.length===0,'Corrected fictional packet has no detected issues');
 for(const item of e7Requirements(c.state).filter(x=>x.owner==='employee'))await mutate('checklist',{item_id:item.id,status:'follow_up',note:'Fictional test only. Original evidence must be checked before an actual filing.'});
 const review={message:'The fictional preparation packet has been compared and reviewed. Follow the recorded external checks before any actual filing or employment decision.',originals_reviewed:true,flags_reviewed:true,guidance_reviewed:true,review_packet:{transition_reviewed:true,transition_note:'Fictional transition record compared. External confirmation remains a follow-up.',items:Object.fromEntries(e7Requirements(c.state).filter(t=>t.owner==='reviewer').map(t=>[t.id,{status:'follow_up',note:'Fictional test only. Confirm the current official procedure and original evidence before any actual filing.'}]))}};
 const blocked=await request('/api/intake/cases/'+c.id+'/approve',{revision:c.revision,...review},'reviewer');check(blocked.status===400&&(await blocked.json()).code==='resolution_required','Approval requires an explicit follow-up resolution');
 review.resolution='This synthetic review records unresolved external checks as follow-ups. Confirm the current procedure and inspect original evidence before any real filing or employment decision.';
 await mutate('approve',review,'reviewer');check(c.state.stage==='approved','Reviewer completes preparation review with explicit follow-ups');
 const audit=await api('/cases/'+c.id+'/audit');check(audit.valid,'Production audit hash chain valid');
 await api('');const saved=await api('/cases/'+c.id);check(saved.case.state.stage==='approved'&&saved.case.state.history.length>=2,'Review and prior versions persist after fresh fetch');
 report.case_id=c.id;report.final_stage=c.state.stage;report.audit_events=audit.events.length;report.success=true;
}catch(e){report.success=false;report.error=e.message;console.error('FAILED',e.message);process.exitCode=1;}finally{await mkdir('.eval-results',{recursive:true});await writeFile('.eval-results/vercel-production-verification.json',JSON.stringify(report,null,2));console.log('Evidence saved: .eval-results/vercel-production-verification.json');}
