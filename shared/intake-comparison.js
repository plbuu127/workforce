// The disappearance of a finding is not a resolution if its inputs are now unknown.
export function comparison(previous,current){
 const key=x=>x.id.startsWith('quality-')?'quality':x.id;
 const before=new Set((previous||[]).map(key)),after=new Set(current.map(key));
 const dependencies={'documents-start':['document-offer','document-contract','offer-start','contract-start','field-contract_start'],'documents-employer':['document-offer','document-contract','offer-employer','contract-employer'],'documents-job_title':['document-offer','document-contract','offer-job_title','contract-job_title'],'date-conflict':['field-stay_expiry','field-contract_start'],'expiry-reminder':['field-stay_expiry'],'status-route':['field-status'],'contract-signature':['document-contract'],'quality':['document-stay','document-contract']};
 const gone=[...before].filter(x=>!after.has(x));
 const unconfirmed=gone.filter(id=>(dependencies[id]||[]).some(dep=>after.has(dep)));
 return {resolved:gone.filter(id=>!unconfirmed.includes(id)),unconfirmed,remaining:[...after].filter(x=>before.has(x)),new:[...after].filter(x=>!before.has(x))};
}
