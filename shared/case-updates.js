// Shared presentation helpers; employee statements never replace document evidence.
export const CONTEXT_STATES={unknown:'I need help confirming the agreed start date',agreed_waiting:'A new start date was agreed; I am waiting for the updated contract',current_contract:'I have submitted the updated contract'};
export const CORRECTION_FIELDS={status:'Reported stay status',stay_expiry:'Reported stay expiry',contract_start:'Contract start date',start:'Page start date',employer:'Employer name',job_title:'Job title'};
export function situationActions(s){
 const c=s.situation_note;if(!c)return [];
 const task=(id,owner,title,detail)=>({id,owner,title,detail,pages:[],blocking:false,basis:'Employee-reported situation; company confirmation required'});
 const out=[];
 if(c.start_change==='unknown')out.push(task('context-start-confirm','reviewer','Confirm the agreed start with the employee','The employee is unsure which start date is agreed. Compare the contract and company record together; do not choose a date silently.'));
 if(c.start_change==='agreed_waiting')out.push(task('context-contract-update','reviewer','Confirm the reported change and provide the updated contract','The employee reports an agreed change'+(c.reported_start?' to '+c.reported_start:'')+' and is waiting for a contract. Verify the agreement and provide the current contract. The reported date has not replaced any document value.'));
 if(c.start_change==='current_contract'){
  const start=s.analysis?.reading?.fields?.contract_start?.value,offers=(s.analysis?.reading?.document_fields||[]).filter(p=>s.documents.find(d=>p.page_id.startsWith(d.id+':'))?.category==='offer').map(p=>p.start?.value).filter(Boolean);
  const matches=c.reported_start&&start===c.reported_start;
  if(matches&&offers.length&&offers.some(v=>v!==c.reported_start))out.push(task('context-company-update','reviewer','Check and update the company joining record','The contract matches the employee-reported date, but the company record differs. Confirm the agreement and replace the outdated company record.'));
  else out.push(task('context-current-contract','reviewer','Confirm which contract is current',matches?'The contract matches the reported date. Confirm it is the agreed current version; other document and procedure checks still apply.':'The employee reports an updated contract. Check its source page and agreed date before treating it as current.'));
 }
 if(c.note&&!c.start_change)out.push(task('context-note','reviewer','Review the employee’s situation note','Read the employee-reported explanation alongside the documents. Confirm any change before acting on it.'));
 return out;
}
export function allGuidanceChecks(s){
 const issues=s.analysis?.issues||[];
 // The old contract still has findings, but asking for a replacement the employee
 // is explicitly waiting for would assign the company's next action to them.
 const current=s.situation_note?.start_change==='agreed_waiting'?issues.filter(i=>!['contract-signature','document-contract','field-contract_start'].includes(i.id)):issues;
 return [...current,...situationActions(s)];
}
export function updateRecordHTML(s,escape){
 const e=escape,c=s.situation_note,log=s.analysis?.corrections||[];
 return `${c?`<h2>Employee-reported situation</h2><p>${e(c.note)}<br>${e(CONTEXT_STATES[c.start_change]||'')}<br>Reported date: ${e(c.reported_start||'Not provided')}</p><p>Not a verified document fact. ${e(c.at)}</p>${situationActions(s).map(t=>`<p><strong>${e(t.title)}</strong><br>${e(t.detail)}</p>`).join('')}`:''}${log.length?`<h2>Reviewer extraction corrections</h2><p>Original files and the original AI reading are retained. Human corrections are not model outputs.</p>${log.map(x=>`<p><strong>${e(CORRECTION_FIELDS[x.field])}</strong>: ${e(x.before||'Unknown')} → ${e(x.after||'Unknown')}<br>Source page: ${e(x.page_id)}<br>Quote: ${e(x.quote)}<br>Reason: ${e(x.reason)}<br>${e(x.at)} · reviewer ${e(x.actor)}${x.restore?' · restored original AI value':''}</p>`).join('')}`:''}`;
}
