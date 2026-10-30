import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
import {loginReturnPath,loginHref} from '../shared/onboarding.js';
import {localDatabase} from './sqlite-adapter.mjs';
import {memoryBucket} from './r2-adapter.mjs';
const DB=await localDatabase(),env={DB,BUCKET:memoryBucket()};let n=0;const check=(v,m)=>{assert.ok(v,m);n++;};
try{
 for(const path of ['/','/companies','/employee']){const r=await worker.fetch(new Request('https://workforce.test'+path),env);check(r.status===200,'anonymous can load safe shell '+path);const html=await r.text();check(html.includes('Sign in &amp; create workspace')||html.includes('Sign in & create workspace'),'shell includes onboarding');}
 const company=crypto.randomUUID(),caseId=crypto.randomUUID();
 for(const path of ['/api/intake','/api/intake/companies/'+company,'/api/intake/cases/'+caseId,'/api/intake/cases/'+caseId+'/audit','/api/intake/cases/'+caseId+'/export','/api/intake/cases/'+caseId+'/files/'+crypto.randomUUID()+'/original'])check((await worker.fetch(new Request('https://workforce.test'+path),env)).status===401,'anonymous cannot read private endpoint');
 for(const path of ['/api/intake/companies','/api/intake/companies/join','/api/intake/cases','/api/intake/join'])check((await worker.fetch(new Request('https://workforce.test'+path,{method:'POST',headers:{origin:'https://workforce.test','content-type':'application/json'},body:'{}'}),env)).status===401,'anonymous cannot create or join');
 const token=crypto.randomUUID()+crypto.randomUUID();
 for(const type of ['team','join']){const link=new URL(loginHref('/employee','#'+type+'='+token),'https://workforce.test');check(link.origin==='https://workforce.test'&&link.searchParams.get('return_to')==='/employee#'+type+'='+token,'same-site sign-in preserves '+type+' invitation');}
 for(const bad of ['https://attacker.test','//attacker.test','/\\attacker.test','javascript:alert(1)'])check(loginReturnPath(bad,'')==='/', 'off-site return path discarded');
 check(loginReturnPath('/companies','#team=<script>')==='/companies','malformed invitation ignored');
 check((await DB.prepare('SELECT count(*) AS n FROM workforce_companies').first()).n===0,'anonymous requests wrote no company rows');
 console.log(`Onboarding: ${n} assertions passed. Public shell, private API boundaries and same-site invitation return links.`);
}finally{DB.close();}
