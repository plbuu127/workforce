import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {readDocuments,inspectReading,comparison} from '../dist/server/intake-ai.js';
const args=process.argv.slice(2);
if(!args.includes('--live'))throw new Error('Use --live to explicitly authorize up to 16 real vision calls. No automatic retries.');
const root=resolve(import.meta.dirname,'..'),datasetName=args.includes('--robustness')?'robustness':'preparation',dir=resolve(root,'test/fixtures',datasetName);
const secrets=process.env.WORKFORCE_ENV_FILE?parseEnv(await readFile(process.env.WORKFORCE_ENV_FILE,'utf8')):{};
const key=process.env.NEBIUS_API_KEY||secrets.NEBIUS_API_KEY;if(!key)throw new Error('Set a server-only key through an ignored env file.');
const dataset=JSON.parse(await readFile(resolve(dir,'cases.json'),'utf8'));
const wanted=args.includes('--case')?args[args.indexOf('--case')+1]:null;
const cases=dataset.cases.filter(c=>!wanted||c.id===wanted);if(cases.length>12||!cases.length)throw new Error('Bounded evaluator expects 1–12 cases.');
const plannedCalls=cases.reduce((n,c)=>n+Math.ceil(c.documents.reduce((m,d)=>m+d.files.length,0)/4),0);if(plannedCalls>16)throw new Error('Live evaluation cap is 16 provider requests.');let requestCount=0;
const results=[];const norm=x=>x.startsWith('quality-')?'quality':x;
await mkdir(resolve(root,'.eval-results'),{recursive:true});
for(const test of cases){
 const images=[];for(const d of test.documents)for(let i=0;i<d.files.length;i++)images.push({id:d.id+':'+(i+1),category:d.category,data:'data:image/jpeg;base64,'+(await readFile(resolve(dir,d.files[i]))).toString('base64')});
 try{
 const reading=await readDocuments(images,key,fetch,async()=>{if(++requestCount>16)throw new Error('Evaluation request cap reached');});const issues=inspectReading(reading,test.documents,dataset.reference_date,test.profile);
 const expected=[...new Set(test.expected.issues)].sort(),actual=[...new Set(issues.map(i=>norm(i.id)))].sort();
 const fields=Object.fromEntries(Object.keys(test.expected.fields).map(k=>[k,{expected:test.expected.fields[k],actual:reading.fields[k]?.value||'',correct:(reading.fields[k]?.value||'')===test.expected.fields[k]}]));
 const missed=expected.filter(i=>!actual.includes(i)),unexpected=actual.filter(i=>!expected.includes(i));
 const r={id:test.id,split:test.split,passed:Object.values(fields).every(f=>f.correct)&&!missed.length&&!unexpected.length,fields,expected_issues:expected,actual_issues:actual,missed,unexpected,proof:reading.proof,observations:reading.document_fields,validated_fields:reading.fields,pages:reading.pages,issues};results.push(r);
 console.log(JSON.stringify({id:r.id,passed:r.passed,missed,unexpected,field_errors:Object.entries(fields).filter(([,v])=>!v.correct).map(([k])=>k),latency_ms:r.proof.latency_ms}));
 }catch(e){results.push({id:test.id,split:test.split,passed:false,error:e.code||e.message});console.log(JSON.stringify({id:test.id,error:e.code||e.message}));if(['provider_auth','provider_billing','provider_limit'].includes(e.code))break;}
 await writeFile(resolve(root,'.eval-results/'+datasetName+'-latest.json'),JSON.stringify({synthetic:true,at:new Date().toISOString(),reference_date:dataset.reference_date,results},null,2)+'\n');
}
const successful=results.filter(r=>r.fields),fieldChecks=successful.flatMap(r=>Object.values(r.fields));
const summary={attempted:results.length,planned:cases.length,provider_calls:requestCount,completed:successful.length,passed:results.filter(r=>r.passed).length,field_correct:fieldChecks.filter(x=>x.correct).length,field_total:fieldChecks.length,expected_findings:successful.reduce((n,r)=>n+r.expected_issues.length,0),missed_findings:successful.reduce((n,r)=>n+r.missed.length,0),unexpected_findings:successful.reduce((n,r)=>n+r.unexpected.length,0),tokens:successful.reduce((n,r)=>n+(r.proof.usage?.total_tokens||0),0),scope:'Synthetic document acceptance evaluation, not a real-user or legal-accuracy study.'};
const a=results.find(r=>r.id==='02-three-problems'),b=results.find(r=>r.id==='03-signature-only-fixed');if(a?.issues&&b?.issues)summary.partial_correction=comparison(a.issues,b.issues);
await writeFile(resolve(root,'.eval-results/'+datasetName+'-latest.json'),JSON.stringify({synthetic:true,at:new Date().toISOString(),reference_date:dataset.reference_date,summary,results},null,2)+'\n');console.log(JSON.stringify(summary));
