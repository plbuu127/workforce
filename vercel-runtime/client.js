// The server validates the session and binds these role labels only to its own test identities.
const workforceRole=location.pathname==='/employee'?'employee':'reviewer';
async function workforceFetch(url,options={}){
 const headers=new Headers(options.headers);headers.set('x-workforce-role',workforceRole);
 if(options.body instanceof FormData){
  const packed=new Request(location.origin+url,{method:'POST',body:options.body}),bytes=await packed.arrayBuffer();
  const start=await fetch('/api/uploads/start',{method:'POST',headers:{'content-type':'application/json','x-workforce-role':workforceRole},body:JSON.stringify({target:url,size:bytes.byteLength,content_type:packed.headers.get('content-type')})});
  const j=await start.json();if(!start.ok)return new Response(JSON.stringify(j),{status:start.status,headers:{'content-type':'application/json'}});
  for(let i=0;i<Math.ceil(bytes.byteLength/j.part_size);i++){
   notice(`Uploading document · ${Math.round(i*j.part_size/bytes.byteLength*100)}%`,'busy');
   const r=await fetch(`/api/uploads/${j.id}/${i}`,{method:'POST',headers:{'content-type':'application/octet-stream','x-workforce-role':workforceRole},body:bytes.slice(i*j.part_size,(i+1)*j.part_size)});if(!r.ok)return r;
  }
  return fetch(`/api/uploads/${j.id}/complete`,{method:'POST',headers:{'x-workforce-role':workforceRole}});
 }
 return fetch(url,{...options,headers});
}
function vercelSessionUI(){
 let banner=document.querySelector('#judging-workspace');
 if(data.session?.kind!=='guest'){banner?.remove();return;}
 $('#account').innerHTML=`${workforceRole==='employee'?'Test employee':'Test reviewer'}<br><a href="/login">Account & session</a>`;
 if(!banner){banner=document.createElement('section');banner.id='judging-workspace';banner.className='notice';$('#content').before(banner);}
 banner.innerHTML=`<strong>Your judging workspace · ${workforceRole==='employee'?'Employee':'Reviewer'}</strong><p>Same live workflow, two test identities. Your company and files are separate from other visitors.</p><div class="actions"><a class="button ${workforceRole==='reviewer'?'':'secondary'}" href="/companies">Company · Reviewer</a><a class="button ${workforceRole==='employee'?'':'secondary'}" href="/employee">My work · Employee</a>${invite&&current?'<button id="judge-join" type="button">Accept invitation as test employee →</button>':''}</div><details><summary>Sample documents for this trial</summary><p>Download these fictional originals, then select them in the document upload form. The unsigned contract and expiring stay record are intentional issues.</p><p><a href="/samples/contract-unsigned-realistic.pdf" download>Unsigned contract</a> · <a href="/samples/stay-expiring.jpg" download>Expiring stay record</a> · <a href="/samples/company-offer-initial.pdf" download>Initial company joining details</a></p><p><a href="/samples/contract-signed-realistic.pdf" download>Signed contract</a> · <a href="/samples/stay-current.jpg" download>Updated fictional stay record</a> · <a href="/samples/company-offer-corrected.pdf" download>Corrected company details</a></p></details>`;
 const email=$('#employee-email');if(email){email.value=data.session.employee_email;email.readOnly=true;email.hidden=true;const label=document.querySelector('label[for=employee-email]');if(label)label.textContent='Employee: your test identity in this workspace';}
 if(current?.employee_joined&&$('#documents-section')&&!$('#judge-samples')&&!['deleted','deleting','processing'].includes(current.state.stage)){
  const options=workforceRole==='employee'?[['contract','contract-unsigned-realistic.pdf','Unsigned contract'],['stay','stay-expiring.jpg','Expiring stay record'],['contract','contract-signed-realistic.pdf','Signed contract'],['stay','stay-current.jpg','Updated stay record']]:[['offer','company-offer-initial.pdf','Initial company details'],['offer','company-offer-corrected.pdf','Corrected company details']];
  const box=document.createElement('details');box.id='judge-samples';box.innerHTML='<summary>Use a fictional sample (optional)</summary><p class="help">These buttons upload the sample PDF or photo through the same file processing flow. You can also choose your own file above.</p><div class="actions">'+options.map(([category,file,label],i)=>`<button type="button" class="secondary" data-judge-sample="${i}">${label}</button>`).join('')+'</div>';
  $('#documents-section').append(box);box.querySelectorAll('button').forEach(b=>b.onclick=()=>action(()=>uploadSample(...options[Number(b.dataset.judgeSample)].slice(0,2)),'Preparing and uploading the fictional original…'));
 }
 banner.querySelectorAll('a.button').forEach(link=>link.onclick=e=>{if(!canLeave())e.preventDefault();});
 const join=$('#judge-join');if(join)join.onclick=async()=>{let accepted=false;await action(async()=>{const r=await workforceFetch('/api/judge/join',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:invite})});const j=await r.json();if(!r.ok)throw new Error('The invitation could not be accepted. Refresh and try again.');accepted=true;},'Accepting the employee invitation…');if(accepted)location.href='/employee';};
}
