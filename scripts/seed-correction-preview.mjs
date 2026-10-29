// Loopback QA only: deliberately inject an OCR error into a copy of a fictional case.
import {localDatabase} from './sqlite-adapter.mjs';
import {localBucket} from './r2-adapter.mjs';
import {digest,todayKST} from '../shared/workforce.js';
import {inspectReading} from '../dist/server/intake-ai.js';
const DB=await localDatabase(new URL('../.preview-data/workforce.sqlite',import.meta.url).pathname),BUCKET=localBucket(new URL('../.preview-data/files/',import.meta.url).pathname);
try{
 const rows=(await DB.prepare('SELECT * FROM workforce_intake_cases').all()).results;
 const r=rows.find(r=>{const s=JSON.parse(r.state_json);return s.synthetic_demo&&s.stage==='approved'&&s.analysis?.reading?.fields?.contract_start?.value==='2026-11-10';});if(!r)throw new Error('A fictional approved preview fixture is required.');
 const s=JSON.parse(r.state_json),id=crypto.randomUUID(),at=new Date().toISOString(),user='local_workforce_demo';s.name='Controlled OCR error · Synthetic QA';s.version=1;s.history=[];s.review=null;s.review_draft=null;s.company_checks={};s.checklist={};s.situation_note=null;s.analysis.corrections=[];delete s.analysis.original_reading;
 const contract=s.documents.find(d=>d.category==='contract'),page=s.analysis.reading.document_fields.find(p=>p.page_id.startsWith(contract.id+':'));
 s.analysis.reading.fields.contract_start.value='2026-11-30';page.start.value='2026-11-30';s.analysis.reading.proof={mode:'controlled_test',model:'Injected transcription error; not a new AI call',http_status:0,response_id:'controlled-local-fixture',latency_ms:0,at};
 s.analysis.issues=inspectReading(s.analysis.reading,s.documents,todayKST(),s.profile);s.analysis.guidance=null;s.stage='ready_for_review';
 for(const d of s.documents)for(const part of ['original',...Array.from({length:d.pages},(_,i)=>'page-'+i)]){const f=await BUCKET.get(`intake/${r.id}/${d.id}/${part}`);await BUCKET.put(`intake/${id}/${d.id}/${part}`,new Uint8Array(await f.arrayBuffer()));}
 const ev={case_id:id,revision:1,action:'controlled_test_created',at,actor:(await digest(user)).slice(0,16),state_hash:await digest(s),version:1,stage:s.stage},json=JSON.stringify(ev),hash=await digest('\n'+json);
 await DB.prepare('INSERT INTO workforce_intake_cases(id,reviewer_id,employee_id,invite_hash,invite_expires,revision,state_json,event_json,previous_hash,event_hash,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?,?,?,?,?)').bind(id,user,user,null,null,JSON.stringify(s),json,'',hash,at,at).run();console.log('Created controlled synthetic QA case '+id);
}finally{DB.close();}
