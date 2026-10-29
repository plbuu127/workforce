import {validDate,valueInEvidence,inspectReading,comparison} from './intake-ai.js';
import {situationActions} from './case-update-view.js';
const bad=code=>Object.assign(new Error(code),{code,status:400});
const text=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max&&!/[<>\u0000-\u0008]|\b\d{6}[- ]?\d{7}\b/.test(v);
export function normalizeSituation(b){
 if(!text(b.note,0,600)||!['','unknown','agreed_waiting','current_contract'].includes(b.start_change)||typeof b.reported_start!=='string'||b.reported_start&&!validDate(b.reported_start)||(!b.note.trim()&&!b.start_change))throw bad('invalid_situation_note');
 return {note:b.note.trim(),start_change:b.start_change,reported_start:b.reported_start,at:new Date().toISOString()};
}
export function invalidateReview(s){
 s.review=null;s.review_draft=null;s.company_checks={};
 s.checklist=Object.fromEntries(Object.entries(s.checklist||{}).filter(([,v])=>v.owner==='employee'));
}
export function snapshotApproved(s){
 if(s.stage!=='approved')return;
 if(s.history.length>=9)throw Object.assign(bad('version_limit'),{status:409});
 const h={version:s.version,documents:s.documents,analysis:structuredClone(s.analysis),review:s.review,stage:s.stage,profile:s.profile,company_checks:s.company_checks||{},checklist:s.checklist||{},situation_note:s.situation_note||null};
 s.history.push(h);s.version++;
}
export function recompute(s,reference){
 const old=s.analysis.issues;s.analysis.issues=inspectReading(s.analysis.reading,s.documents,reference,s.profile);
 s.analysis.reference_date=reference;s.analysis.adjustment_comparison=comparison(old,s.analysis.issues);
 s.analysis.comparison=comparison(s.history.at(-1)?.analysis?.issues,s.analysis.issues);
 s.analysis.guidance=null;s.analysis.guidance_error='guidance_outdated';
 invalidateReview(s);s.stage=s.analysis.issues.some(i=>i.blocking)?'needs_changes':'ready_for_review';
}
export function correctExtraction(s,b,actor,reference){
 if(!s.analysis||!['needs_changes','ready_for_review','reviewer_changes','approved'].includes(s.stage))throw Object.assign(bad('not_reviewable'),{status:409});
 if((s.analysis.corrections||[]).length>=30)throw bad('correction_limit');
 if(b.original_checked!==true||!text(b.reason,10,400))throw bad('correction_evidence_required');
 const aggregate=['status','stay_expiry','contract_start'].includes(b.field);
 if(!aggregate&&!['start','employer','job_title'].includes(b.field))throw bad('invalid_correction');
 const page=s.analysis.reading.pages.find(x=>x.page_id===b.page_id),doc=s.documents.find(d=>b.page_id?.startsWith(d.id+':'));
 if(!page||!doc||aggregate&&doc.category!==(b.field==='contract_start'?'contract':'stay')||!aggregate&&!['contract','offer'].includes(doc.category))throw bad('correction_wrong_source');
 const original=s.analysis.original_reading||s.analysis.reading;
 const get=(reading)=>aggregate?reading.fields[b.field]:reading.document_fields?.find(p=>p.page_id===b.page_id)?.[b.field];
 const previous=get(s.analysis.reading);if(!previous)throw bad('invalid_correction');
 const restore=b.restore===true;
 const origin=get(original)||{value:'',evidence:[]};
 const value=restore?origin.value:typeof b.value==='string'?b.value.trim():null;
 if(!restore&&(!text(value,1,b.field==='employer'||b.field==='job_title'?100:40)||!text(b.quote,2,400)))throw bad('invalid_correction');
 if(!restore&&(['start','contract_start','stay_expiry'].includes(b.field)?!validDate(value):b.field==='status'&&!/^[A-Z]-\d{1,2}(?:-\d{1,3})?$/.test(value)))throw bad('invalid_correction');
 if(!restore){
  const supported=['contract_start','start','stay_expiry','status'].includes(b.field)?valueInEvidence(value,[b.quote],b.field==='status'?'status':'date'):b.quote.toLowerCase().replace(/\s+/g,' ').includes(value.toLowerCase().replace(/\s+/g,' '));
  if(!supported)throw bad('correction_quote_mismatch');
 }
 if(value===previous.value)throw bad('correction_unchanged');
 snapshotApproved(s);
 s.analysis.original_reading??=structuredClone(s.analysis.reading);
 const at=new Date().toISOString();const replacement=restore?structuredClone(origin):{value,evidence:[{page_id:b.page_id,quote:b.quote.trim()}],provenance:'reviewer',corrected_at:at};
 if(aggregate)s.analysis.reading.fields[b.field]=replacement;
 else s.analysis.reading.document_fields.find(p=>p.page_id===b.page_id)[b.field]=replacement;
 // Contract summary and page comparisons must use the same corrected observations.
 if(b.field==='contract_start'){
  const item=s.analysis.reading.document_fields?.find(p=>p.page_id===b.page_id);
  if(item)item.start=restore?structuredClone(s.analysis.original_reading.document_fields?.find(p=>p.page_id===b.page_id)?.start||origin):structuredClone(replacement);
 }
 if(b.field==='contract_start'||b.field==='start'&&doc.category==='contract'){
  const starts=(s.analysis.reading.document_fields||[]).filter(p=>s.documents.find(d=>p.page_id.startsWith(d.id+':'))?.category==='contract'&&p.start?.value).map(p=>p.start),values=[...new Set(starts.map(f=>f.value))];
  if(values.length>1)s.analysis.reading.fields.contract_start={value:'',evidence:[],validation_issue:'conflicting_contract_dates'};
  else if(values.length===1)s.analysis.reading.fields.contract_start={value:values[0],evidence:starts.flatMap(x=>x.evidence).slice(0,4),...(starts.some(x=>x.provenance==='reviewer')?{provenance:'reviewer',corrected_at:at}:{})};
  else s.analysis.reading.fields.contract_start={value:'',evidence:[]};
 }
 s.analysis.corrections??=[];s.analysis.corrections.push({id:crypto.randomUUID(),field:b.field,page_id:b.page_id,before:previous.value,after:value,quote:restore?(origin.evidence||[]).map(e=>e.quote).join(' '):b.quote.trim(),reason:b.reason.trim(),actor,at,version:s.version,restore});
 recompute(s,reference);
}
export function updateSituation(s,b,reference){
 const c=b.clear===true?null:normalizeSituation(b);snapshotApproved(s);s.situation_history??=[];if(s.situation_history.length>=30)throw bad('situation_note_limit');if(s.situation_note)s.situation_history.push(s.situation_note);s.situation_note=c;
 if(s.analysis)recompute(s,reference);else invalidateReview(s);
}
export {situationActions};
