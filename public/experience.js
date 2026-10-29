// Presentation state is kept separate from case data and server authorization.
let casePanel='next',casePanelKey='',companyView='cases',caseFilter='all',companyFormOpen=false;
function uiIcon(name){
 const paths={grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',company:'<path d="M4 21V5l8-2v18M12 8h8v13M2 21h20M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',plus:'<path d="M12 5v14M5 12h14"/>',file:'<path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8M8 16h6"/>',check:'<path d="m5 12 4 4L19 6"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',play:'<path d="m9 5 11 7-11 7Z"/>',people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 4v2"/>'};
 return `<svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.arrow}</svg>`;
}
function syncShell(mode){
 document.body.dataset.screen=mode;
 const companyPage=location.pathname==='/companies';
 $('#home').classList.toggle('active',!companyPage);
 $('#company-nav').classList.toggle('active',companyPage);
 $('#home').setAttribute('aria-current',!companyPage?'page':'false');
 $('#company-nav').setAttribute('aria-current',companyPage?'page':'false');
 $('#page-context').textContent=mode==='case'?'YOUR SHARED CASE':companyPage?'COMPANY WORKSPACE':'YOUR WORKSPACE';
}
function openCasePanel(name,focus=false){
 const panel=$('#case-panel-'+name);if(!panel)return;
 casePanel=name;
 document.querySelectorAll('[data-case-panel]').forEach(p=>p.hidden=p.dataset.casePanel!==name);
 document.querySelectorAll('[data-case-tab]').forEach(b=>{const selected=b.dataset.caseTab===name;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
 if(focus)$('#case-tab-'+name)?.focus();
}
function revealCaseTarget(el){
 const panel=el.closest('[data-case-panel]');if(panel)openCasePanel(panel.dataset.casePanel);
 let parent=el;while(parent&&parent.id!=='content'){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
 el.querySelector(':scope > details')?.setAttribute('open','');
}
function arrangeCase(s,isEmployee){
 syncShell('case');const root=$('#content'),key=current.id+':'+isEmployee;
 if(casePanelKey!==key){casePanel='next';casePanelKey=key;}
 const names=[['next','Next steps'],['documents','Documents'],['review',isEmployee?'Findings':'Review'],['activity','History']];
 const nav=document.createElement('nav');nav.className='case-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Case sections');
 nav.innerHTML=names.map(([id,label],i)=>`<button type="button" role="tab" id="case-tab-${id}" data-case-tab="${id}" aria-controls="case-panel-${id}" aria-selected="false">${label}${id==='review'&&s.analysis?.issues.length?`<span class="tab-count">${s.analysis.issues.length}</span>`:''}</button>`).join('');
 const panels={};for(const [id]of names){const p=document.createElement('div');p.id='case-panel-'+id;p.dataset.casePanel=id;p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby','case-tab-'+id);p.tabIndex=0;p.className='case-panel';panels[id]=p;}
 const move=(selector,p)=>{const el=root.querySelector(selector);if(el)panels[p].append(el);};
 for(const id of ['invite-section','demo-section'])move('#'+id,'next');
 move('.action-center','next');
 for(const id of ['reviewed-section','employee-note-section','situation-section','context-section','guidance-section','ask-section'])move('#'+id,'next');
 for(const id of ['documents-section','submit-section'])move('#'+id,'documents');
 for(const id of ['analysis-section','correction-section','review-section'])move('#'+id,'review');
 move('#history-section','activity');
 root.querySelector(':scope > .grid')?.remove();
 root.append(nav,...Object.values(panels));
 for(const id of ['documents-section','analysis-section','history-section']){const d=$('#'+id)?.querySelector(':scope > details');if(d){d.open=true;d.classList.add('panel-details');}}
 const analysis=$('#analysis-section .card');if(analysis){const fields=document.createElement('details');fields.className='extracted-fields';fields.innerHTML='<summary>Extracted fields & document comparison</summary>';const facts=analysis.querySelector(':scope > .facts'),comparison=analysis.querySelector(':scope > details'),help=analysis.querySelector(':scope > .help');if(help)fields.append(help);if(comparison)fields.append(comparison);if(facts)fields.append(facts);analysis.querySelector('.section-head').after(fields);}
 const review=$('#review-section');if(review){const d=document.createElement('details');d.className='plain-details';const summary=document.createElement('summary');summary.textContent='Company checks & review decision';d.append(summary,...review.childNodes);review.append(d);}
 if(!s.analysis)panels.review.innerHTML=`<div class="panel-empty">${uiIcon('file')}<h2>Your findings will appear here.</h2><p>Add your documents and run the AI check to compare the information.</p><button class="secondary" data-jump="documents-section">Go to documents ${uiIcon('arrow')}</button></div>`;
 const tasks=[...panels.next.querySelectorAll('.action-center > .next-task')];
 if(tasks.length>1){const more=document.createElement('details');more.className='more-tasks';more.innerHTML=`<summary>${tasks.length-1} more task${tasks.length>2?'s':''} for you</summary>`;tasks[0].after(more);tasks.slice(1).forEach(t=>more.append(t));}
 const ready=$('#checklist-section');if(ready){const d=document.createElement('details');d.className='readiness-group';d.innerHTML='<summary>Preparation checklist</summary>';ready.before(d);d.append(ready);const pending=[...ready.querySelectorAll('select')].find(el=>el.value==='pending');if(!tasks.length&&pending){d.open=true;pending.closest('details').open=true;}}
 if(!panels.next.children.length)panels.next.innerHTML='<div class="panel-empty"><h2>This case is closed.</h2><p>You can find the remaining review record in History.</p></div>';
 nav.querySelectorAll('button').forEach(b=>{b.onclick=()=>{if(!busy)openCasePanel(b.dataset.caseTab);};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)||busy)return;e.preventDefault();const idx=names.findIndex(x=>x[0]===b.dataset.caseTab),next=e.key==='Home'?0:e.key==='End'?3:(idx+(e.key==='ArrowRight'?1:3))%4;openCasePanel(names[next][0],true);};});
 openCasePanel(casePanel);
}
function caseNextLabel(c){
 const s=c.state.stage;
 if(s==='approved')return 'Read the reviewed summary';
 if(s==='invited')return 'Share the employee invitation';
 if(s==='processing')return 'AI check in progress';
 if(s==='failed')return 'Check the analysis issue';
 if(c.is_employee&&['needs_changes','reviewer_changes'].includes(s))return 'See what needs updating';
 if(c.is_reviewer&&['ready_for_review','needs_changes'].includes(s))return 'Check findings and review';
 return c.is_employee?'Continue preparing your documents':'See the latest progress';
}
