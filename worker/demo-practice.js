import {correctExtraction} from './case-updates.js';
import {inspectReading,comparison} from './intake-ai.js';
import {demoProfile} from './demo-profile.js';
// Deliberate error fixture, isolated from the real model result and its receipt.
export function createCorrectionPractice(documents){
 const empty={value:'',evidence:[]},field=(id,value,quote)=>({value,evidence:[{page_id:id+':1',quote}]});
 const reading={pages:documents.map(d=>({page_id:d.id+':1',quality:'readable',signature:d.id==='contract'?'visible':'not_applicable',text:d.id==='stay'?'Reported stay status: E-7-1\nReported stay expiry: 2027-06-30':'Employer: Harbor Labs\nJob title: Software engineer\nProposed employment start: 2026-11-10'})),fields:{status:field('stay','E-7-1','Reported stay status: E-7-1'),stay_expiry:field('stay','2027-06-30','Reported stay expiry: 2027-06-30'),contract_start:field('contract','2026-11-30','Proposed employment start: 2026-11-10')},document_fields:documents.map(d=>({page_id:d.id+':1',start:d.id==='stay'?empty:field(d.id,d.id==='contract'?'2026-11-30':'2026-11-10','Proposed employment start: 2026-11-10'),employer:d.id==='stay'?empty:field(d.id,'Harbor Labs','Employer: Harbor Labs'),job_title:d.id==='stay'?empty:field(d.id,'Software engineer','Job title: Software engineer')})),proof:{mode:'controlled_test',provider:'Workforce correction exercise',model:'Deliberately injected error; no AI request',http_status:0,response_id:'controlled-correction-example',latency_ms:0,at:new Date().toISOString()}};
 const profile=demoProfile('completed'),issues=inspectReading(reading,documents,'2026-10-28',profile);
 return {version:1,stage:'ready_for_review',documents,profile,history:[],analysis:{reading,issues,comparison:comparison([],issues),guidance:null,corrections:[]}};
}
export function correctPractice(practice,input){
 correctExtraction(practice,{field:'contract_start',page_id:'contract:1',value:input.value,quote:input.quote,reason:input.reason,original_checked:input.original_checked},'demo-reviewer','2026-10-28');
 return practice;
}
