// Test-only setup through the real application/approval APIs. Never deployed.
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
export const application={contact_email:'contact@fixture.example',website:'https://fixture.example',authority:'Synthetic test owner; authority is explicitly a local test fixture.'};
export async function approveFixture(env,id,revision){env.WORKFORCE_OPERATOR_USER_ID='test-operator';const r=await worker.fetch(new Request('https://fixture.test/api/intake/operator/companies/'+id,{method:'POST',headers:{origin:'https://fixture.test','oai-authenticated-user-id':'test-operator','content-type':'application/json'},body:JSON.stringify({revision,status:'approved',company_confirmed:true,authority_confirmed:true,note:'LOCAL TEST FIXTURE ONLY: synthetic company and authority evidence, not actual verification.'})}),env);assert.equal(r.status,200,JSON.stringify(await r.json()));}
export async function approvedCompany(env,user='reviewer'){
 const r=await worker.fetch(new Request('https://fixture.test/api/intake/companies',{method:'POST',headers:{origin:'https://fixture.test','oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@example.test','content-type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),name:'Synthetic verified fixture',member_name:user,...application})}),env);const j=await r.json();assert.equal(r.status,200,JSON.stringify(j));await approveFixture(env,j.company.id,j.company.revision);return j.company.id;
}
