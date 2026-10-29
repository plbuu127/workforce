import {approvedCompany} from './approved-fixture.mjs';
import assert from 'node:assert/strict';
import {readDocuments,VISION_MODEL,inspectReading} from '../dist/server/intake-ai.js';
import worker from '../dist/server/index.js';
import {localDatabase} from './sqlite-adapter.mjs';
import {memoryBucket,localBucket} from './r2-adapter.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
let count=0,calls=0,charged=0,conflict=false;
const check=(v,m)=>{assert.ok(v,m);count++};
const empty=()=>({value:'',evidence:[]});
const fake=async(url,opt)=>{
 calls++;const q=JSON.parse(opt.body),labels=q.messages[1].content.filter(x=>x.type==='text'),images=labels.map(l=>({id:l.text.match(/Page ID: ([^;]+)/)[1],category:l.text.match(/category: ([^.]+)/)[1]}));
 const f=(id,value,quote)=>({value,evidence:[{page_id:id,quote}]});
 const pages=images.map(p=>({page_id:p.id,text:p.category==='stay'?'Status E-7-1\nExpiry 2027-06-30':p.id.endsWith(':8')?'Start 2026-12-01\nEmployee signature: Test':p.id.endsWith(':1')&&conflict?'Start 2026-11-01':'Employment contract · General terms',quality:'readable',signature:p.id.endsWith(':8')?'visible':'not_applicable'}));
 const details=pages.map(p=>({page_id:p.page_id,start:p.text.includes('Start')?f(p.page_id,p.text.includes('12-01')?'2026-12-01':'2026-11-01',p.text.split('\n')[0]):empty(),employer:empty(),job_title:empty()}));
 const stay=images.find(p=>p.category==='stay'),contract=details.find(p=>p.start.value);
 const value={pages,fields:{status:stay?f(stay.id,'E-7-1','Status E-7-1'):empty(),stay_expiry:stay?f(stay.id,'2027-06-30','Expiry 2027-06-30'):empty(),contract_start:contract?.start||empty()},document_fields:details};
 return Response.json({id:'mock-batch-'+calls,model:VISION_MODEL,choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{total_tokens:100}});
};
const images=[...Array.from({length:8},(_,i)=>({id:'contract:'+(i+1),category:'contract',data:'mock'})),{id:'stay:1',category:'stay',data:'mock'}];
let reading=await readDocuments(images,'mock',fake,async()=>{charged++});
check(calls===3&&charged===3,'each real request has its own quota gate');
check(reading.pages.length===9&&reading.proof.batches.length===3&&reading.proof.usage.total_tokens===300,'all pages and per-call receipts retained');
check(reading.fields.contract_start.value==='2026-12-01'&&reading.fields.status.value==='E-7-1','facts on the last contract page and a later stay batch are combined');
check(!inspectReading(reading,[{id:'contract',category:'contract'},{id:'stay',category:'stay'}],'2026-10-29').some(i=>i.id==='contract-signature'),'signature on page eight is considered');
conflict=true;reading=await readDocuments(images,'mock',fake);
check(reading.fields.contract_start.value===''&&reading.fields.contract_start.validation_issue==='conflicting_document_values','cross-batch conflicting dates are withheld');
calls=0;let gates=0;
await assert.rejects(readDocuments(images,'mock',fake,async()=>{if(++gates===2)throw Object.assign(new Error('limit'),{code:'daily_limit'});}),e=>e.code==='daily_limit'&&e.diagnostics.completed_batches===1);count++;
check(calls===1,'quota failure prevents the next paid call and returns no partial success');
await assert.rejects(readDocuments([...images,...images],'mock',fake),e=>e.code==='invalid_pages');count++;
const temp=await mkdtemp(join(tmpdir(),'workforce-long-test-')),disk=localBucket(temp);
try{const path='intake/'+crypto.randomUUID()+'/'+crypto.randomUUID()+'/page-11';await disk.put(path,new Uint8Array([1,2]));check((await disk.get(path)).body.length===2,'preview storage also accepts page twelve');await disk.delete(path);check(await disk.get(path)===null,'preview storage deletes later pages');}finally{await rm(temp,{recursive:true,force:true});}
const DB=await localDatabase(),BUCKET=memoryBucket(),env={DB,BUCKET};
const fixtureCompany=await approvedCompany(env,'reviewer');
async function call(path,body,user='owner'){
 const r=await worker.fetch(new Request('https://long.test/api/intake'+path,{method:body===undefined?'GET':'POST',headers:{'oai-authenticated-user-email':user+'@example.test','oai-authenticated-user-id':user,origin:'https://long.test',...(body instanceof FormData?{}:{'content-type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)}),env);
 return {status:r.status,body:r.headers.get('content-type')?.includes('json')?await r.json():await r.arrayBuffer()};
}
const jpeg=new Uint8Array([255,216,255,224,1,2,3,4,5,6,7,8,255,217]);
function upload(c,category,n){const f=new FormData();f.set('revision',c.revision);f.set('category',category);f.set('file',new File(['%PDF-1.7 synthetic offline envelope'],category+'.pdf',{type:'application/pdf'}));for(let i=0;i<n;i++)f.append('pages',new File([jpeg],'p.jpg',{type:'image/jpeg'}));return call('/cases/'+c.id+'/documents',f);}
try{
 const made=await call('/cases',{id:crypto.randomUUID(),name:'Long packet limit test',company_id:fixtureCompany,employee_email:'owner@example.test'},'reviewer');let c=(await call('/join',{token:made.body.invite})).body.case;
 c=(await upload(c,'contract',12)).body.case;check(c.state.documents[0].pages===12,'12-page PDF accepted');const id=c.state.documents[0].id;
 check((await call('/cases/'+c.id+'/files/'+id+'/page-11')).status===200,'last page available to its owner');
 check((await call('/cases/'+c.id+'/files/'+id+'/page-11',undefined,'stranger')).status===404,'later page enforces membership');
 check((await call('/cases/'+c.id+'/files/'+id+'/page-12')).status===404,'out-of-bounds page unavailable');
 check((await upload(c,'stay',5)).body.code==='page_limit','case total above 16 rejected');
 c=(await upload(c,'stay',4)).body.case;check(c.state.documents.reduce((n,d)=>n+d.pages,0)===16,'16-page case accepted');
 check((await upload(c,'contract',13)).body.code==='page_limit','13-page file rejected');
 check((await call('/cases/'+c.id+'/purge',{revision:c.revision,confirm:true})).body.case.state.stage==='deleted'&&BUCKET.count()===0,'all 16 pages and originals are deleted');
 console.log(`Long packets: ${count} assertions passed. Mock transport; not live evidence.`);
}finally{DB.close();}
