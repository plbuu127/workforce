import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import {database,migrate} from '../vercel-runtime/database.js';
import {makeHandler} from '../vercel-runtime/handler.js';
import {memoryBucket} from './r2-adapter.mjs';
const client=createClient({url:':memory:'}),DB=database(client);await migrate(DB);await migrate(DB);
const env={DB,BUCKET:memoryBucket()},handle=makeHandler(async()=>env);let checks=0;
const ok=(condition,label)=>{assert.ok(condition,label);checks++;};
async function call(path,{cookie='',role='reviewer',body,method,headers={}}={}){const req=new Request('https://workforce.test'+path,{method:method||(body===undefined?'GET':'POST'),headers:{origin:'https://workforce.test',cookie,'x-workforce-role':role,...(body!==undefined&&!(body instanceof Uint8Array)?{'content-type':'application/json'}:{}),...headers},...(body!==undefined?{body:body instanceof Uint8Array?body:JSON.stringify(body)}:{})});return handle(req);}
async function result(path,opt){const r=await call(path,opt);return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
let a=await result('/api/auth/guest',{body:{}}),b=await result('/api/auth/guest',{body:{}});ok(a.status===200&&b.status===200,'guest creation');ok(a.cookie!==b.cookie,'distinct guest sessions');
let r=await result('/api/intake',{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':a.body.session.email}});ok(r.status===401,'forged Sites identity ignored');
r=await result('/api/intake',{cookie:a.cookie});ok(r.body.session.kind==='guest'&&r.body.cases.length===0,'blank real workflow');
const co=await result('/api/intake/companies',{cookie:a.cookie,body:{id:crypto.randomUUID(),name:'Fictional Vercel QA',member_name:'Test reviewer'}});ok(co.status===200,'create company from scratch: '+JSON.stringify(co.body));
const company=co.body.company;
r=await result('/api/intake/companies/'+company.id,{cookie:b.cookie});ok(r.status===404,'other guest company excluded');
const made=await result('/api/intake/cases',{cookie:a.cookie,body:{id:crypto.randomUUID(),company_id:company.id,name:'Fictional new employee',employee_email:a.body.session.employee_email,planning:false}});ok(made.status===201,'create normal case');let c=made.body.case;
r=await result('/api/judge/join',{cookie:b.cookie,body:{token:made.body.invite}});ok(r.status===404,'another judge cannot claim invitation');
r=await result('/api/judge/join',{cookie:a.cookie,body:{token:made.body.invite}});ok(r.status===200&&r.body.case.is_employee,'own test employee accepts');c=r.body.case;
r=await result('/api/intake',{cookie:a.cookie,role:'employee'});ok(r.body.cases[0].is_employee&&!r.body.cases[0].is_reviewer,'employee real role separated');
const form=new FormData(),bytes=new Uint8Array(5*1024*1024);bytes.set([255,216,255,224]);form.set('revision',c.revision);form.set('category','contract');form.set('file',new File([bytes],'large.jpg',{type:'image/jpeg'}));form.append('pages',new File([new Uint8Array([255,216,255,224,1,2,3,4,5,6,7,8])],'page.jpg',{type:'image/jpeg'}));
const packed=new Request('https://workforce.test',{method:'POST',body:form}),payload=new Uint8Array(await packed.arrayBuffer());
const up=await result('/api/uploads/start',{cookie:a.cookie,role:'employee',body:{target:'/api/intake/cases/'+c.id+'/documents',size:payload.length,content_type:packed.headers.get('content-type')}});ok(up.status===200,'large upload staged');
r=await result('/api/uploads/'+up.body.id+'/0',{cookie:b.cookie,role:'employee',body:payload.slice(0,up.body.part_size)});ok(r.status===404,'staging ownership isolation');
for(let i=0;i<Math.ceil(payload.length/up.body.part_size);i++){r=await result(`/api/uploads/${up.body.id}/${i}`,{cookie:a.cookie,role:'employee',body:payload.slice(i*up.body.part_size,(i+1)*up.body.part_size)});ok(r.status===200,'bounded part accepted');}
r=await result('/api/uploads/'+up.body.id+'/complete',{cookie:a.cookie,role:'employee',body:{}});ok(r.status===201,'over 4.5MB upload completes through original validation');c=r.body.case;
ok(c.state.documents[0].size===bytes.length,'original file size retained');ok((await DB.prepare('SELECT count(*) AS n FROM workforce_upload_chunks').first()).n===0,'temporary parts removed');
const filePath=`/api/intake/cases/${c.id}/files/${c.state.documents[0].id}/original`;
r=await call(filePath,{cookie:a.cookie,role:'employee'});ok(r.ok&&(await r.arrayBuffer()).byteLength===bytes.length,'private file reload');r=await call(filePath,{cookie:b.cookie});ok(r.status===404,'other judge cannot read file');
r=await result('/api/intake/cases/'+c.id+'/audit',{cookie:a.cookie});ok(r.body.audit?.valid||r.body.valid,'hash audit preserved');
r=await result('/api/auth/register',{body:{name:'Test Account',email:'qa@example.test',password:'SyntheticPasswordOnly-2026'}});ok(r.status===200,'account registration');const account=r.cookie;
r=await result('/api/auth/login',{body:{email:'qa@example.test',password:'IncorrectPassword-2026'}});ok(r.status===401,'wrong password denied');
r=await result('/api/auth/login',{body:{email:'qa@example.test',password:'SyntheticPasswordOnly-2026'}});ok(r.status===200,'durable account login');
r=await result('/api/intake/companies/'+company.id,{cookie:account});ok(r.status===404,'account cannot access guest company');
r=await result('/api/auth/logout',{cookie:account,body:{}});ok(r.status===200,'logout');r=await result('/api/intake',{cookie:account});ok(r.status===401,'revoked session denied');
r=await result('/api/auth/guest',{body:{},headers:{origin:'https://evil.example'}});ok(r.status===403,'cross-origin session creation blocked');
client.close();console.log(`${checks} Vercel runtime assertions passed. No live AI calls in this suite.`);
