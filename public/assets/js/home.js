const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];let currentUser=null,currentTab="applications",cache={};const requestedQueue=["review","overdue"].includes(new URLSearchParams(location.search).get("queue"))?new URLSearchParams(location.search).get("queue"):null;const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));const date=s=>s?new Date(s).toLocaleString():"—";const fmt=n=>new Intl.NumberFormat("en-ZA").format(n||0);const label=s=>String(s||"").replaceAll("_"," ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
async function api(url,opts={}){const o={...opts,headers:{...(opts.body instanceof FormData?{}:{"Content-Type":"application/json"}),...(opts.headers||{})}};if(o.body&&!(o.body instanceof FormData)&&typeof o.body!=="string")o.body=JSON.stringify(o.body);let r;try{r=await fetch(url,o)}catch{throw Error("Cannot reach the NTA server. Make sure it is running (npm start) and that you opened http://localhost:3000.")}if(!r.ok){let p={},isJson=false;try{p=await r.json();isJson=true}catch{}const er=Error(p.error||(!isJson&&[404,405].includes(r.status)?"The NTA server did not answer this request. Open the site at http://localhost:3000 (not from a file or Live Server).":`Request failed (${r.status})`));er.fields=p.errors||null;er.status=r.status;throw er}if((r.headers.get("content-type")||"").includes("application/json"))return r.json();return r}
function toast(message,type="success"){const t=$("#toast");t.className=`toast notice ${type==="error"?"error":"success"}`;t.textContent=message;t.classList.remove("hidden");t.scrollIntoView({behavior:"smooth",block:"nearest"});setTimeout(()=>t.classList.add("hidden"),7000)}function formData(form){return Object.fromEntries(new FormData(form).entries())}
async function checkHealth(){try{const h=await api("/api/health");$("#healthPill").textContent="● Database connected";$("#healthMessage").textContent="PostgreSQL connected"}catch{$("#healthPill").textContent="Database unavailable";$("#healthMessage").textContent="Check DATABASE_URL and database setup"}}$("#refreshHealth").addEventListener("click",checkHealth);checkHealth();$("#year").textContent=new Date().getFullYear();
function showAuthTab(t){$$("[data-auth-tab]").forEach(x=>x.classList.toggle("active",x.dataset.authTab===t));$("#loginForm").classList.toggle("hidden",t!=="login");$("#registerForm").classList.toggle("hidden",t!=="register")}
$$("[data-auth-tab]").forEach(b=>b.addEventListener("click",()=>showAuthTab(b.dataset.authTab)));
function setupTeacherPreparation(){
  const actions=$(".hero-actions");
  if(actions)actions.innerHTML='<a class="button" href="#workspace" data-open-auth="register">Register</a><a class="button" href="#workspace" data-open-auth="login">Sign in</a><a class="button" href="#workspace" data-open-auth="continue">Continue application</a>';
  const process=$("#process");
  process?.insertAdjacentHTML("beforebegin",`<section class="section teacher-prep" id="teacher-preparation"><div class="wrap"><div class="section-heading"><div><label>BEFORE YOU APPLY</label><h2>Get ready with a <em>short checklist.</em></h2></div><p>Requirements vary by award category and cycle. Use the current official guide as the final source for eligibility and required documents.</p></div><div class="prep-grid"><article class="panel"><h3>Eligibility checklist</h3><ul><li>Confirm that you and your selected category meet the current official guide.</li><li>Check any service-tenure minimum and what evidence is accepted for your category.</li><li>Confirm the award cycle is open before submitting an application.</li></ul></article><article class="panel"><h3>Documents to prepare</h3><ul><li><strong>SACE certificate:</strong> required when you create a teacher account.</li><li><strong>Identity document:</strong> optional during registration; prepare it if the guide requires it.</li><li><strong>Category evidence and motivational letter:</strong> prepare and upload only as required by the current guide.</li><li><strong>Service records:</strong> keep employment dates and supporting evidence available when tenure applies.</li></ul></article></div><p class="prep-guide"><a id="prepGuideLink" class="btn secondary" href="#cycleCountdown" aria-disabled="true">Current award guide not published</a><span id="prepGuideNote" class="small muted">Check the cycle updates below for the approved guide.</span></p></div></section>`);
  const style=document.createElement("style");
  style.textContent=".hero-actions{flex-wrap:wrap}.hero-actions .button{display:inline-flex;align-items:center;justify-content:center;min-height:44px}.prep-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.prep-grid .panel{margin:0}.prep-grid h3{margin-top:0;color:#123b32}.prep-grid ul{padding-left:20px;margin-bottom:0}.prep-grid li{padding:5px 0;color:#52635a;font-size:.92rem}.prep-guide{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:16px}.prep-guide #prepGuideLink[aria-disabled=true]{opacity:.65;pointer-events:none}.cycle-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px}.cycle-actions a{font-weight:700;color:#164b3c;text-decoration:underline}.readiness-list{list-style:none;padding:0;display:grid;gap:8px}.readiness-list li{padding:10px 12px;border:1px solid #dce4dd;border-radius:8px;background:#fbfcfa}.readiness-list li span{display:block;color:#64736b;font-size:.88rem}.readiness-state{display:inline-block;margin-right:6px;color:#2d714e;font-weight:750}.readiness-state.missing{color:#956018}.requirement-preview{padding:12px;border:1px solid #dce4dd;border-radius:9px;background:#fbfcfa}.requirement-preview h4{margin:12px 0 4px;color:#123b32}.requirement-preview ul{margin:4px 0 12px;padding-left:22px}.requirement-preview li{padding:4px 0}.requirement-preview li span{display:block;color:#64736b;font-size:.88rem}@media(max-width:650px){.hero-actions .button{flex:1 1 100%}.prep-grid{grid-template-columns:1fr}}";
  document.head.append(style);
}
setupTeacherPreparation();
document.addEventListener("click",event=>{
  const link=event.target.closest("[data-open-auth]");
  if(!link)return;
  const target=link.dataset.openAuth;
  if(currentUser){
    event.preventDefault();
    if(target==="continue")loadTab("applications");
    $("#workspace").scrollIntoView({behavior:"smooth",block:"start"});
  }else{
    showAuthTab(target==="register"?"register":"login");
    if(target==="continue")setTimeout(()=>$("#loginEmail").focus(),0);
  }
});
function setFieldErrors(form,errors={}){form.querySelectorAll("[data-error-for]").forEach(el=>{const msg=errors[el.dataset.errorFor]||"";el.textContent=msg;const input=form.elements[el.dataset.errorFor];if(input&&input.classList){input.classList.toggle("input-invalid",!!msg);input.setAttribute("aria-invalid",msg?"true":"false")}})}
function passwordScore(p,email=""){let n=0;if(p.length>=12)n++;if(p.length>=16)n++;if(/[a-z]/.test(p)&&/[A-Z]/.test(p))n++;if(/\d/.test(p))n++;if(/[^A-Za-z0-9]/.test(p))n++;const local=String(email).split("@")[0].toLowerCase();if(p.length<12||!/[A-Za-z]/.test(p)||!/\d/.test(p)||(local.length>=4&&p.toLowerCase().includes(local)))n=Math.min(n,1);return Math.min(n,4)}
function updateStrength(){const p=$("#reg_password"),bar=$("#pwBar"),hint=$("#pwHint");if(!p||!bar||!hint)return;const v=p.value,f=$("#registerForm"),sc=v?passwordScore(v,f.elements.email.value):0;const levels=[["0%","#c0452f","At least 12 characters with letters and numbers."],["25%","#c0452f","Too weak: use 12+ characters with letters and numbers."],["50%","#d98b1f","Fair: add more length or mix upper/lower case."],["75%","#8aa63a","Good."],["100%","#1d7a4a","Strong password."]];const[w,c,t]=levels[sc];bar.style.width=w;bar.style.background=c;hint.textContent=t}
$$("[data-toggle-password]").forEach(b=>b.addEventListener("click",()=>{const i=document.getElementById(b.dataset.togglePassword);if(!i)return;const show=i.type==="password";i.type=show?"text":"password";b.textContent=show?"Hide":"Show"}));
$("#reg_password").addEventListener("input",updateStrength);$("#reg_email").addEventListener("input",updateStrength);
async function withBusy(btn,busyText,fn){const orig=btn.textContent;btn.disabled=true;btn.textContent=busyText;try{return await fn()}finally{btn.disabled=false;btn.textContent=orig}}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget;await withBusy(form.querySelector('button[type="submit"]'),"Signing in…",async()=>{try{const p=await api("/api/auth/login",{method:"POST",body:formData(form)});currentUser=p.user;form.reset();await showWorkspace();toast("Signed in successfully.")}catch(err){toast(err.message,"error")}})});
$("#registerForm").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget;const data=formData(form);data.consent=form.elements.consent.checked;setFieldErrors(form,{});const local={};if(data.password!==data.confirmPassword)local.confirmPassword="The two passwords do not match.";if(!data.consent)local.consent="You must agree to the processing of your information to register.";if(!form.elements.registrationDocument.files.length)local.registrationDocument="A SACE certificate is required.";if(Object.keys(local).length){setFieldErrors(form,local);const first=form.querySelector(".input-invalid");if(first)first.focus();toast("Please correct the highlighted fields.","error");return}await withBusy(form.querySelector('button[type="submit"]'),"Creating account…",async()=>{try{const p=await api("/api/auth/register",{method:"POST",body:new FormData(form)});currentUser=p.user;form.reset();updateStrength();await showWorkspace();toast(p.message||"Account created.")}catch(err){if(err.fields){setFieldErrors(form,err.fields);const first=form.querySelector(".input-invalid");if(first)first.focus()}toast(err.message,"error")}})});
$("#logoutBtn").addEventListener("click",async()=>{try{await api("/api/auth/logout",{method:"POST"})}catch(err){if(err.status!==401){toast(err.message,"error");return}}currentUser=null;$("#appWorkspace").classList.add("hidden");$("#authPanel").classList.remove("hidden");showAuthTab("login");$("#dashboardMetrics").innerHTML="";toast("You have signed out.")});
async function showWorkspace(){if(!currentUser)return;if(requestedQueue)currentTab=requestedQueue==="overdue"?"tasks":"applications";$("#authPanel").classList.add("hidden");$("#appWorkspace").classList.remove("hidden");$("#welcomeTitle").textContent=currentUser.teacher?`Welcome, ${currentUser.teacher.firstName}`:"Management workspace";$("#welcomeSubtitle").textContent="Application workflow, status and authorised actions";$("#rolePill").textContent=label(currentUser.role);const actions=currentUser.role==="TEACHER"?[["applications","My applications"],["new","New application"],["notifications","Notifications"]]:currentUser.role==="DISTRICT_ADMIN"?[["applications","District queue"],["disputes","Disputes"],["tasks","Reassessment tasks"]]:[["applications","Applications"],["cycles","Award cycles"],["disputes","Disputes"],["tasks","Reassessment tasks"],["reports","Export approved records"],["audit","Audit logs"],["schools","Manage schools"]];$("#roleActions").innerHTML=actions.map(([id,t])=>`<button class="btn ${id===currentTab?"":"secondary"}" data-tab="${id}">${t}</button>`).join("");$$('[data-tab]').forEach(b=>b.addEventListener("click",()=>loadTab(b.dataset.tab)));try{const p=await api("/api/stats");const d=p.data;$("#dashboardMetrics").innerHTML=[["Applications",d.applications],["Teachers",d.teachers],["Active categories",d.categories],["Districts",d.districts]].map(([l,v])=>`<div class="metric"><span>${l}</span><strong>${fmt(v)}</strong></div>`).join("")}catch{$("#dashboardMetrics").innerHTML=""}await loadTab(currentTab)}
async function loadTab(tab){currentTab=tab;$$('[data-tab]').forEach(b=>b.classList.toggle("secondary",b.dataset.tab!==tab));try{if(tab==="applications")await renderApplications();else if(tab==="new")await renderNewApplication();else if(tab==="disputes")await renderDisputes();else if(tab==="tasks")await renderTasks();else if(tab==="cycles")await renderCycles();else if(tab==="reports")renderReports();else if(tab==="audit")await renderAudit();else if(tab==="schools")await renderSchools();else if(tab==="notifications")await renderNotifications()}catch(e){$("#workspaceContent").innerHTML=`<div class="panel notice error">${esc(e.message)}</div>`}}
function panel(title,body){return `<section class="panel"><h2>${title}</h2>${body}</section>`}
async function renderApplications(){
  const response=await api("/api/applications"),rows=response.data,isTeacher=currentUser.role==="TEACHER";
  cache.apps=rows;
  const visibleRows=requestedQueue==="review"&&!isTeacher?rows.filter(application=>["SUBMITTED","UNDER_REVIEW"].includes(application.status)):rows;
  const queueHeading=requestedQueue==="review"&&!isTeacher?"Applications awaiting district review":isTeacher?"My applications":"Applications";
  const queueNote=requestedQueue==="review"&&!isTeacher?`<p class="notice">Showing submitted and under-review applications. <a href="/#workspace">Show all applications</a></p>`:"";
  const body=visibleRows.length?`<div class="table-wrap"><table><thead><tr><th>Application</th><th>Teacher</th><th>Category</th><th>District / school</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>${visibleRows.map(application=>`<tr><td><strong>${esc(application.applicationNumber)}</strong><div class="small muted">${esc(application.cycle?.name||"")}</div></td><td>${esc(application.teacher.firstName)} ${esc(application.teacher.surname)}</td><td>${esc(application.category.name)}</td><td>${esc(application.district.name)}<div class="small muted">${esc(application.school.name)}</div></td><td><span class="status">${esc(label(application.status))}</span></td><td>${date(application.updatedAt)}</td><td><button class="btn secondary" data-open-app="${esc(application.id)}">Open</button></td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">${requestedQueue==="review"?"No submitted or under-review applications are waiting.":isTeacher?"You have no applications yet. Create a draft when an award cycle is open.":"No applications match your authorised view."}</p>`;
  $("#workspaceContent").innerHTML=panel(queueHeading,queueNote+body);
  $$("[data-open-app]").forEach(button=>button.addEventListener("click",()=>renderApplicationDetail(button.dataset.openApp)));
}
function renderRequirementPreview(requirements){
  if(!requirements.length)return'<p class="small muted">No cycle/category requirements have been configured yet. Consult the current official guide; you can still create a draft.</p>';
  const eligibility=requirements.filter(requirement=>requirement.kind==="ELIGIBILITY");
  const documents=requirements.filter(requirement=>requirement.kind==="DOCUMENT");
  return`<div class="requirement-preview"><strong>Before you continue</strong><p class="small muted">Review these items from the configured guide. They are reminders, not an eligibility decision, and do not block submission.</p>${eligibility.length?`<h4>Eligibility reminders</h4><ul>${eligibility.map(requirement=>`<li><strong>${esc(requirement.label)}</strong>${requirement.required?" · Required":""}${requirement.description?`<span>${esc(requirement.description)}</span>`:""}</li>`).join("")}</ul>`:""}${documents.length?`<h4>Documents to prepare</h4><ul>${documents.map(requirement=>`<li><strong>${esc(requirement.label)}</strong>${requirement.required?" · Required":" · Optional"}${requirement.description?`<span>${esc(requirement.description)}</span>`:""}</li>`).join("")}</ul>`:""}</div>`;
}
async function renderNewApplication(){
  const [categoriesResponse,schoolsResponse,cyclesResponse]=await Promise.all([
    api("/api/reference/categories"),api("/api/reference/schools"),api("/api/cycles")
  ]);
  const openCycle=cyclesResponse.data.find(cycle=>cycle.status==="OPEN");
  const categories=categoriesResponse.data,schools=schoolsResponse.data;
  $("#workspaceContent").innerHTML=panel("Create an application draft",`
    ${openCycle?`<p class="notice">Open cycle: <strong>${esc(openCycle.name)}</strong>. Closing: ${date(openCycle.closesAt)}</p>`:'<p class="notice">No award cycle is open. A provincial official or system administrator must configure and open a cycle first.</p>'}
    <form id="newAppForm" class="form-grid">
      <div class="field"><label for="newAppCategory">Award category *</label><select id="newAppCategory" name="categoryId" required><option value="">Choose category</option>${categories.map(category=>`<option value="${esc(category.id)}">${esc(category.code)} · ${esc(category.name)}</option>`).join("")}</select></div>
      <div class="field"><label>School *</label><select name="schoolId" required><option value="">Choose school</option>${schools.map(school=>`<option value="${esc(school.id)}">${esc(school.name)} (${esc(school.emisNumber)})</option>`).join("")}</select></div>
      <div id="newAppRequirementPreview" class="field full"><p class="small muted">Choose a category to see its configured eligibility reminders and document list.</p></div>
      <div class="field full"><label>Nomination source (optional)</label><input name="nominationSource" placeholder="If applicable under the official process"></div>
      <div class="field full"><label class="check"><input type="checkbox" name="declarationAccepted" value="true" required><span>I confirm that the information supplied is accurate and understand that officials will verify eligibility and supporting evidence.</span></label></div>
      <div class="field full"><button class="btn" ${openCycle?"":"disabled"}>Create draft</button></div>
    </form>
    <p class="small muted">Only requirements confirmed from the approved official guide should be used. A readiness warning does not mean eligibility is approved.</p>`);
  const preview=$("#newAppRequirementPreview");
  $("#newAppCategory").addEventListener("change",async event=>{
    if(!event.currentTarget.value){
      preview.innerHTML='<p class="small muted">Choose a category to see its configured eligibility reminders and document list.</p>';
      return;
    }
    if(!openCycle){
      preview.innerHTML='<p class="small muted">Requirements are shown when an award cycle is open.</p>';
      return;
    }
    preview.innerHTML='<p class="small muted">Loading cycle requirements…</p>';
    try{
      const requirements=await api(`/api/cycles/${encodeURIComponent(openCycle.id)}/requirements?categoryId=${encodeURIComponent(event.currentTarget.value)}`);
      preview.innerHTML=renderRequirementPreview(requirements);
    }catch(error){preview.innerHTML=`<p class="notice error">${esc(error.message)}</p>`}
  });
  $("#newAppForm").addEventListener("submit",async event=>{
    event.preventDefault();
    const data=formData(event.currentTarget);
    data.declarationAccepted=event.currentTarget.declarationAccepted.checked;
    try{
      const result=await api("/api/applications",{method:"POST",body:data});
      toast(result.message);
      await renderApplicationDetail(result.data.id);
    }catch(error){toast(error.message,"error")}
  });
}
function renderApplicationReadiness(application){
  const requirements=application.cycleRequirements||[];
  if(!requirements.length)return panel("Application readiness",'<p class="muted">No cycle-specific checklist is configured. Check the current official award guide. Missing configured items do not block submission.</p>');
  const documents=(application.documents||[]).filter(document=>!document.registrationDocument);
  const documentTypes=new Set(documents.map(document=>document.type));
  const requiredDocuments=requirements.filter(requirement=>requirement.kind==="DOCUMENT"&&requirement.required);
  const missing=requiredDocuments.filter(requirement=>!documentTypes.has(requirement.id));
  const eligibility=requirements.filter(requirement=>requirement.kind==="ELIGIBILITY");
  const documentList=requirements.filter(requirement=>requirement.kind==="DOCUMENT");
  const list=(items,render)=>items.length?`<ul class="readiness-list">${items.map(render).join("")}</ul>`:"<p class=\"small muted\">No items configured.</p>";
  return panel("Application readiness",`
    <div class="notice ${missing.length?"":"success"}"><strong>${missing.length?`${missing.length} required document${missing.length===1?" is":"s are"} missing`:"Required documents uploaded"}</strong><br>Missing-item warnings do not prevent submission. Officials verify eligibility and evidence during review.</div>
    ${eligibility.length?`<h3>Eligibility reminders</h3>${list(eligibility,requirement=>`<li><strong class="readiness-state">Review</strong><strong>${esc(requirement.label)}</strong>${requirement.required?" · Required":""}${requirement.description?`<span>${esc(requirement.description)}</span>`:""}</li>`)}`:""}
    ${documentList.length?`<h3>Documents</h3>${list(documentList,requirement=>{const uploaded=documentTypes.has(requirement.id);return`<li><strong class="readiness-state ${requirement.required&&!uploaded?"missing":""}">${uploaded?"Uploaded":requirement.required?"Missing": "Optional"}</strong><strong>${esc(requirement.label)}</strong>${requirement.description?`<span>${esc(requirement.description)}</span>`:""}</li>`})}`:""}
  `);
}
async function renderApplicationDetail(id){const p=await api(`/api/applications/${id}`),a=p.data,isTeacher=currentUser.role==="TEACHER",isDistrict=currentUser.role==="DISTRICT_ADMIN",isProvince=["PROVINCIAL_OFFICIAL","SYSTEM_ADMIN"].includes(currentUser.role);const docs=a.documents||[];let html=`<div class="inline"><button class="btn secondary" id="backApps">← Back to applications</button><span class="status">${esc(label(a.status))}</span></div><div class="two-col"><div>${panel("Application details",`<p><strong>Number:</strong> ${esc(a.applicationNumber)}</p><p><strong>Teacher:</strong> ${esc(a.teacher.firstName)} ${esc(a.teacher.surname)}</p><p><strong>SACE:</strong> ${esc(a.teacher.saceNumber)}</p><p><strong>Category:</strong> ${esc(a.category.name)}</p><p><strong>School:</strong> ${esc(a.school.name)}</p><p><strong>District:</strong> ${esc(a.district.name)}</p><p><strong>Submitted:</strong> ${date(a.submittedAt)}</p><p><strong>Cycle:</strong> ${esc(a.cycle?.name||"—")}</p>`)}${panel("Supporting documents",`${docs.map(d=>`<div class="document-row"><div><strong>${esc(d.type)}</strong><div class="small muted">${esc(d.fileName)} · ${fmt(d.fileSize)} bytes · ${esc(label(d.status))}</div></div><button class="btn secondary" data-download="${d.id}">Download</button></div>`).join("")||'<p class="muted">No documents uploaded.</p>'}${isTeacher&&["DRAFT","RETURNED"].includes(a.status)?`<form id="uploadForm" class="form-grid" style="margin-top:14px"><div class="field"><label>Document type</label><select name="type"><option>Identity document</option><option>SACE certificate</option><option>Qualification</option><option>Employment evidence</option><option>Category evidence</option><option>Other supporting document</option></select></div><div class="field"><label>File (PDF/JPG/PNG, max 10 MB)</label><input name="document" type="file" accept=".pdf,.jpg,.jpeg,.png" required></div><div class="field full"><button class="btn">Upload private document</button></div></form><button class="btn" id="submitApp" style="margin-top:10px">Submit application</button>`:""}`)}</div><div>${isDistrict?panel("District vetting checklist",`<form id="vettingForm"><div class="checklist">${[["saceChecked","SACE checked"],["qualificationChecked","Qualification checked"],["idChecked","Identity checked"],["certificationCurrent","Certification currency checked"],["experienceChecked","Experience checked"],["schoolVerified","School verified"],["documentsComplete","Documents complete"],["previousWinnerChecked","Previous winner status checked"],["specialNeedsReviewed","Special arrangements reviewed"]].map(([k,l])=>`<label class="check"><input type="checkbox" name="${k}" ${a.vetting?.[k]?"checked":""}><span>${l}</span></label>`).join("")}</div><div class="field" style="margin-top:12px"><label>Internal review notes (not shown to teacher)</label><textarea name="comments">${esc(a.vetting?.comments||"")}</textarea></div><div class="field" style="margin-top:12px"><label>Decision</label><select name="decision"><option value="PENDING">In progress</option><option value="RETURN">Return for correction</option><option value="APPROVE">Approve for provincial compliance</option><option value="DISQUALIFY">Disqualify (reason required)</option></select></div><button class="btn" style="margin-top:12px">Save vetting decision</button></form>`):isProvince&&a.status==="DISTRICT_APPROVED"?panel("Provincial compliance decision",`<form id="provForm"><div class="field"><label>Decision</label><select name="decision"><option value="APPROVE">Approve for export</option><option value="RETURN">Return for correction</option><option value="DISQUALIFY">Mark not compliant</option></select></div><div class="field" style="margin-top:10px"><label>Reason / compliance notes</label><textarea name="reason" required></textarea></div><button class="btn" style="margin-top:12px">Record provincial decision</button></form>`):""}${isTeacher?panel("Raise a dispute",`<form id="disputeForm"><div class="field"><label>Reason</label><input name="reason" required></div><div class="field" style="margin-top:10px"><label>Details</label><textarea name="details" minlength="10" required></textarea></div><button class="btn secondary" style="margin-top:10px">Submit dispute</button></form>`):""}${panel("Status history",(a.statusHistory||[]).map(h=>`<div class="document-row"><div><strong>${esc(label(h.toStatus))}</strong><div class="small muted">${date(h.createdAt)}</div><div class="small">${esc(h.reason||"")}</div></div></div>`).join("")||'<p class="muted">No status history.</p>')}</div></div>`;$("#workspaceContent").innerHTML=html;$("#backApps").addEventListener("click",renderApplications);$$('[data-download]').forEach(b=>b.addEventListener("click",async()=>{try{const r=await fetch(`/api/documents/${b.dataset.download}/download`);if(!r.ok){const j=await r.json();throw Error(j.error)}const blob=await r.blob(),url=URL.createObjectURL(blob),aTag=document.createElement("a");aTag.href=url;aTag.download="document";aTag.click();URL.revokeObjectURL(url)}catch(e){toast(e.message,"error")}}));if($("#uploadForm"))$("#uploadForm").addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{const r=await api(`/api/applications/${id}/documents`,{method:"POST",body:fd});toast(r.message);await renderApplicationDetail(id)}catch(err){toast(err.message,"error")}});if($("#submitApp"))$("#submitApp").addEventListener("click",async()=>{try{const r=await api(`/api/applications/${id}/submit`,{method:"PATCH",body:{}});toast(r.message);await renderApplicationDetail(id)}catch(e){toast(e.message,"error")}});if($("#vettingForm"))$("#vettingForm").addEventListener("submit",async e=>{e.preventDefault();const d=formData(e.currentTarget);for(const k of ["saceChecked","qualificationChecked","idChecked","certificationCurrent","experienceChecked","schoolVerified","documentsComplete","previousWinnerChecked","specialNeedsReviewed"])d[k]=e.currentTarget.elements[k].checked;try{const r=await api(`/api/applications/${id}/vetting`,{method:"POST",body:d});toast(r.message);await renderApplicationDetail(id)}catch(err){toast(err.message,"error")}});if($("#provForm"))$("#provForm").addEventListener("submit",async e=>{e.preventDefault();try{await api(`/api/applications/${id}/provincial-decision`,{method:"POST",body:formData(e.currentTarget)});toast("Provincial decision recorded.");await renderApplicationDetail(id)}catch(err){toast(err.message,"error")}});if($("#disputeForm"))$("#disputeForm").addEventListener("submit",async e=>{e.preventDefault();try{await api(`/api/applications/${id}/disputes`,{method:"POST",body:formData(e.currentTarget)});toast("Dispute submitted.");e.currentTarget.reset()}catch(err){toast(err.message,"error")}})}

async function renderDisputes() {
  const p = await api("/api/disputes");
  const rows = p.data || [];

  $("#workspaceContent").innerHTML = panel("Disputes", `
    ${rows.length ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Application</th>
              <th>Teacher</th>
              <th>Reason / details</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(d => `
              <tr>
                <td>${esc(d.application?.applicationNumber)}</td>
                <td>
                  ${esc(d.application?.teacher?.firstName)}
                  ${esc(d.application?.teacher?.surname)}
                </td>
                <td>
                  <strong>${esc(d.reason)}</strong>
                  <div class="small">${esc(d.details)}</div>
                </td>
                <td>${esc(label(d.status))}</td>
                <td>
                  <button class="btn secondary"
                          type="button"
                          data-dispute="${esc(d.id)}">
                    Update
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : `<p class="muted">No disputes found.</p>`}

    <div id="disputeEditor"></div>
  `);

  $$("[data-dispute]").forEach(button => {
    button.addEventListener("click", () => {
      const dispute = rows.find(
        d => String(d.id) === button.dataset.dispute
      );

      if (!dispute) return;

      const editor = $("#disputeEditor");

      editor.innerHTML = panel("Update dispute", `
        <form id="updateDisputeForm">

          <div class="field">
            <label>Dispute status</label>
            <select name="status" required>
              ${["UNDER_REVIEW", "RESOLVED", "REJECTED"]
                .map(status => `
                  <option value="${status}"
                    ${dispute.status === status ? "selected" : ""}>
                    ${label(status)}
                  </option>
                `).join("")}
            </select>
          </div>

          <div class="field" style="margin-top:12px">
            <label>Response</label>
            <textarea name="response"
                      placeholder="Enter the official response">${esc(dispute.response || "")}</textarea>
          </div>

          <div class="inline" style="margin-top:12px">
            <button class="btn" type="submit">
              Save dispute
            </button>
            <button class="btn secondary"
                    type="button"
                    id="cancelDispute">
              Cancel
            </button>
          </div>
        </form>
      `);

      editor.scrollIntoView({ behavior: "smooth" });

      $("#cancelDispute").addEventListener("click", () => {
        editor.innerHTML = "";
      });

      $("#updateDisputeForm").addEventListener(
        "submit",
        async e => {
          e.preventDefault();

          const saveButton = e.currentTarget.querySelector(
            'button[type="submit"]'
          );

          saveButton.disabled = true;

          try {
            await api(`/api/disputes/${dispute.id}`, {
              method: "PATCH",
              body: formData(e.currentTarget)
            });

            toast("Dispute updated successfully.");
            await renderDisputes();

          } catch (err) {
            toast(err.message, "error");
            saveButton.disabled = false;
          }
        }
      );
    });
  });
}


async function renderTasks() {
  const [apps, tasks] = await Promise.all([
    api("/api/applications"),
    api("/api/reassessment-tasks")
  ]);

  const applicationRows = apps.data || [];
  const allTaskRows = tasks.data || [];
  const taskRows = requestedQueue === "overdue"
    ? allTaskRows.filter(task => task.dueAt && new Date(task.dueAt) < new Date() &&
      !["COMPLETED", "CANCELLED"].includes(task.status))
    : allTaskRows;
  const taskQueueNote = requestedQueue === "overdue"
    ? '<p class="notice">Showing active reassessment tasks past their due date. <a href="/#workspace">Show all tasks</a></p>'
    : "";

  const taskStatuses = [
    "PENDING",
    "ASSIGNED",
    "IN_PROGRESS",
    "AWAITING_INFORMATION",
    "COMPLETED",
    "CANCELLED"
  ];

  $("#workspaceContent").innerHTML = panel(
    requestedQueue === "overdue" ? "Overdue reassessment tasks" : "Reassessment tasks",
    `${taskQueueNote}
    <form id="taskForm" class="form-grid">

      <div class="field">
        <label>Application *</label>
        <select name="applicationId" required>
          <option value="">Choose application</option>
          ${applicationRows.map(a => `
            <option value="${esc(a.id)}">
              ${esc(a.applicationNumber)} · ${esc(a.status)}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="field">
        <label>Task title *</label>
        <input name="title" required>
      </div>

      <div class="field full">
        <label>Reason *</label>
        <textarea name="reason" required></textarea>
      </div>

      <div class="field">
        <label>Due date</label>
        <input name="dueAt" type="date">
      </div>

      <div class="field">
        <button class="btn" type="submit">
          Create reassessment task
        </button>
      </div>
    </form>

    <h3>Existing tasks</h3>

    ${taskRows.length ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Due</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${taskRows.map(t => `
              <tr>
                <td>${esc(t.title)}</td>
                <td>${esc(t.reason)}</td>
                <td>${esc(label(t.status))}</td>
                <td>${date(t.dueAt)}</td>
                <td>
                  <button class="btn secondary"
                          type="button"
                          data-task="${esc(t.id)}">
                    Change status
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : `<p class="muted">No reassessment tasks found.</p>`}

    <div id="taskEditor"></div>
    `
  );

  $("#taskForm").addEventListener("submit", async e => {
    e.preventDefault();

    const saveButton = e.currentTarget.querySelector(
      'button[type="submit"]'
    );

    saveButton.disabled = true;

    try {
      await api("/api/reassessment-tasks", {
        method: "POST",
        body: formData(e.currentTarget)
      });

      toast("Reassessment task created.");
      await renderTasks();

    } catch (err) {
      toast(err.message, "error");
      saveButton.disabled = false;
    }
  });

  $$("[data-task]").forEach(button => {
    button.addEventListener("click", () => {
      const task = taskRows.find(
        t => String(t.id) === button.dataset.task
      );

      if (!task) return;

      const editor = $("#taskEditor");

      editor.innerHTML = panel(
        `Update task: ${esc(task.title)}`,
        `
        <form id="updateTaskForm">

          <div class="field">
            <label>Task status</label>
            <select name="status" required>
              ${taskStatuses.map(status => `
                <option value="${status}"
                  ${task.status === status ? "selected" : ""}>
                  ${label(status)}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="inline" style="margin-top:12px">
            <button class="btn" type="submit">
              Save task status
            </button>

            <button class="btn secondary"
                    type="button"
                    id="cancelTask">
              Cancel
            </button>
          </div>
        </form>
        `
      );

      editor.scrollIntoView({ behavior: "smooth" });

      $("#cancelTask").addEventListener("click", () => {
        editor.innerHTML = "";
      });

      $("#updateTaskForm").addEventListener(
        "submit",
        async e => {
          e.preventDefault();

          const saveButton = e.currentTarget.querySelector(
            'button[type="submit"]'
          );

          saveButton.disabled = true;

          try {
            await api(`/api/reassessment-tasks/${task.id}`, {
              method: "PATCH",
              body: formData(e.currentTarget)
            });

            toast("Task status updated.");
            await renderTasks();

          } catch (err) {
            toast(err.message, "error");
            saveButton.disabled = false;
          }
        }
      );
    });
  });
}

async function renderCycles() {
  const p = await api("/api/cycles");
  const rows = p.data || [];

  const statuses = [
    "DRAFT",
    "CONFIGURED",
    "PUBLISHED",
    "OPEN",
    "CLOSED",
    "ARCHIVED"
  ];

  const options = (selected) => statuses.map(status => `
    <option value="${status}" ${status === selected ? "selected" : ""}>
      ${label(status)}
    </option>
  `).join("");
  const dateTimeValue = value => {
    if (!value) return "";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? ""
      : new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
  };

  $("#workspaceContent").innerHTML = panel("Award cycles", `
    <form id="cycleForm" class="form-grid">

      <div class="field">
        <label>Cycle name *</label>
        <input name="name" placeholder="NTA 2027" required>
      </div>

      <div class="field">
        <label>Year *</label>
        <input name="year" type="number" min="2020" max="2100" required>
      </div>

      <div class="field">
        <label>Status</label>
        <select name="status">${options("DRAFT")}</select>
      </div>

      <div class="field">
        <label>Official guide URL</label>
        <input name="guideUrl" type="url">
      </div>

      <div class="field">
        <label>Opens at</label>
        <input name="opensAt" type="datetime-local">
      </div>

      <div class="field">
        <label>Closes at</label>
        <input name="closesAt" type="datetime-local">
      </div>

      <div class="field full">
        <label>Internal notes</label>
        <textarea name="notes" maxlength="2000" placeholder="Optional administrative notes"></textarea>
      </div>

      <div class="field full">
        <button class="btn" type="submit">Create cycle</button>
      </div>
    </form>

    <h3>Configured cycles</h3>

    ${rows.length ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cycle</th>
              <th>Year</th>
              <th>Status</th>
              <th>Opens</th>
              <th>Closes</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(c => `
              <tr>
                <td>${esc(c.name)}</td>
                <td>${esc(c.year)}</td>
                <td>${esc(label(c.status))}</td>
                <td>${date(c.opensAt)}</td>
                <td>${date(c.closesAt)}</td>
                <td>
                  <button
                    class="btn secondary"
                    type="button"
                    data-cycle="${esc(c.id)}">
                    Update
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : `<p class="muted">No cycles configured yet.</p>`}

    <div id="cycleEditor"></div>

    <p class="small muted">
      Only open a cycle after confirming the official nomination
      guide and receiving the required approval.
    </p>
  `);

  $("#cycleForm").addEventListener("submit", async e => {
    e.preventDefault();

    const button = e.currentTarget.querySelector(
      'button[type="submit"]'
    );
    const d = formData(e.currentTarget);

    d.year = Number(d.year);

    button.disabled = true;

    try {
      for (const key of ["opensAt", "closesAt"]) {
        const parsed = d[key] ? new Date(d[key]) : null;
        if (parsed && Number.isNaN(parsed.getTime())) throw Error("Enter valid opening and closing dates.");
        d[key] = parsed ? parsed.toISOString() : null;
      }
      if (d.opensAt && d.closesAt && new Date(d.opensAt) >= new Date(d.closesAt)) {
        throw Error("Closing time must be after opening time.");
      }
      await api("/api/cycles", {
        method: "POST",
        body: d
      });

      toast("Award cycle created successfully.");
      await renderCycles();

    } catch (err) {
      toast(err.message, "error");
      button.disabled = false;
    }
  });

  $$("[data-cycle]").forEach(button => {
    button.addEventListener("click", () => {
      const cycle = rows.find(
        c => String(c.id) === button.dataset.cycle
      );

      if (!cycle) {
        toast("Cycle not found.", "error");
        return;
      }

      const editor = $("#cycleEditor");

      editor.innerHTML = panel(
        `Update cycle: ${esc(cycle.name)}`,
        `
        <form id="updateCycleForm" class="form-grid">

          <div class="field full">
            <label for="updateCycleStatus">New status</label>
            <select id="updateCycleStatus" name="status" required>
              ${options(cycle.status)}
            </select>
          </div>

          <div class="field full">
            <p class="small muted">
              Current status: ${esc(label(cycle.status))}
            </p>
          </div>

          <div class="field">
            <label for="updateCycleOpensAt">Opens at</label>
            <input id="updateCycleOpensAt" name="opensAt" type="datetime-local"
                   value="${esc(dateTimeValue(cycle.opensAt))}">
          </div>

          <div class="field">
            <label for="updateCycleClosesAt">Closes at</label>
            <input id="updateCycleClosesAt" name="closesAt" type="datetime-local"
                   value="${esc(dateTimeValue(cycle.closesAt))}">
          </div>

          <div class="field full">
            <label for="updateCycleGuideUrl">Official guide URL</label>
            <input id="updateCycleGuideUrl" name="guideUrl" type="url"
                   value="${esc(cycle.guideUrl || "")}">
          </div>

          <div class="field full">
            <label for="updateCycleNotes">Internal notes</label>
            <textarea id="updateCycleNotes" name="notes">${esc(cycle.notes || "")}</textarea>
          </div>

          <div class="field full inline">
            <button class="btn" type="submit">
              Save cycle status
            </button>

            <button class="btn secondary"
                    id="cancelCycleUpdate"
                    type="button">
              Cancel
            </button>
          </div>

        </form>
        `
      );

      editor.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });

      $("#cancelCycleUpdate").addEventListener("click", () => {
        editor.innerHTML = "";
      });

      $("#updateCycleForm").addEventListener(
        "submit",
        async e => {
          e.preventDefault();

          const saveButton = e.currentTarget.querySelector(
            'button[type="submit"]'
          );

          const changes = formData(e.currentTarget);
          saveButton.disabled = true;
          saveButton.textContent = "Saving...";

          try {
            for (const key of ["opensAt", "closesAt"]) {
              const parsed = changes[key] ? new Date(changes[key]) : null;
              if (parsed && Number.isNaN(parsed.getTime())) throw Error("Enter valid opening and closing dates.");
              changes[key] = parsed ? parsed.toISOString() : null;
            }
            if (changes.opensAt && changes.closesAt && new Date(changes.opensAt) >= new Date(changes.closesAt)) {
              throw Error("Closing time must be after opening time.");
            }
            await api(`/api/cycles/${cycle.id}`, {
              method: "PATCH",
              body: changes
            });

            toast("Award cycle updated successfully.");
            await renderCycles();
            await loadPublicCountdown();

          } catch (err) {
            toast(err.message, "error");
            saveButton.disabled = false;
            saveButton.textContent = "Save cycle status";
          }
        }
      );
    });
  });
}

function renderReports(){$("#workspaceContent").innerHTML=panel("Provincial export",`<p>Export only applications with provincial compliance approval that have not previously been exported. The export action is audit logged.</p><button class="btn" id="exportBtn">Download approved applications CSV</button><p class="small muted">This export is restricted to provincial officials and system administrators. It does not include supporting document files or confidential vetting notes.</p>`);$("#exportBtn").addEventListener("click",async()=>{try{const r=await fetch("/api/reports/export.csv");if(!r.ok){const d=await r.json();throw Error(d.error)}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="nta-approved.csv";a.click();URL.revokeObjectURL(url);toast("CSV export generated.")}catch(e){toast(e.message,"error")}})}
async function renderAudit(){const p=await api("/api/audit-logs");$("#workspaceContent").innerHTML=panel("Audit logs",p.data.length?`<div class="table-wrap"><table><thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>${p.data.map(a=>`<tr><td>${date(a.createdAt)}</td><td>${esc(a.user?.email||"System")}</td><td>${esc(a.action)}</td><td>${esc(a.entityType)} ${esc(a.entityId||"")}</td><td><code>${esc(JSON.stringify(a.details||{}))}</code></td></tr>`).join("")}</tbody></table></div>`:'<p class="muted">No audit entries yet.</p>')}
async function renderSchools(){const [d,s]=await Promise.all([api("/api/reference/districts"),api("/api/reference/schools")]);$("#workspaceContent").innerHTML=panel("School directory",`<form id="schoolForm" class="form-grid"><div class="field"><label>School name *</label><input name="name" required></div><div class="field"><label>EMIS number *</label><input name="emisNumber" required></div><div class="field"><label>School type *</label><select name="schoolType"><option>Public</option><option>Independent</option><option>Special</option><option>Other</option></select></div><div class="field"><label>District *</label><select name="districtId" required>${d.data.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div><div class="field"><label>Quintile</label><input name="quintile"></div><div class="field"><label>Urban / rural</label><select name="urbanRural"><option value="">Not specified</option><option>Urban</option><option>Rural</option></select></div><div class="field full"><button class="btn">Add school</button></div></form><h3>Schools (${s.data.length})</h3><div class="table-wrap"><table><thead><tr><th>School</th><th>EMIS</th><th>Type</th><th>District</th></tr></thead><tbody>${s.data.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.emisNumber)}</td><td>${esc(x.schoolType)}</td><td>${esc(d.data.find(z=>z.id===x.districtId)?.name||"")}</td></tr>`).join("")}</tbody></table></div>`);$("#schoolForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("/api/admin/schools",{method:"POST",body:formData(e.currentTarget)});toast("School added.");await renderSchools()}catch(err){toast(err.message,"error")}})}
async function renderNotifications(){const p=await api("/api/notifications");$("#workspaceContent").innerHTML=panel("Notifications",p.data.length?p.data.map(n=>`<div class="document-row"><div><strong>${esc(n.title)}</strong><p>${esc(n.message)}</p><small class="muted">${date(n.createdAt)} · ${n.readAt?"Read":"Unread"}</small></div>${n.readAt?"":`<button class="btn secondary" data-read="${n.id}">Mark read</button>`}</div>`).join(""):'<p class="muted">No notifications.</p>');$$('[data-read]').forEach(b=>b.addEventListener("click",async()=>{try{await api(`/api/notifications/${b.dataset.read}/read`,{method:"PATCH",body:{}});await renderNotifications()}catch(e){toast(e.message,"error")}}))}
const renderApplicationDetailWithoutTenure=renderApplicationDetail;
renderApplicationDetail=async function(id){
  await renderApplicationDetailWithoutTenure(id);
  const {data:a}=await api(`/api/applications/${id}`);
  const years=a.teacher.yearsTeaching,schoolYears=a.teacher.yearsAtCurrentSchool,minimum=a.category.experienceMin;
  const minimumLabel=Number.isInteger(minimum)?`${minimum} years`:"No minimum configured";
  const warning=Number.isInteger(minimum)&&years<minimum
    ?`<p class="notice error">Reported total service is below the configured ${minimum}-year category minimum. Officials must verify the official guide and evidence.</p>`
    :'<p class="small muted">Reported tenure is for guidance only; authorised officials verify service and apply the current official guide.</p>';
  const detailPanels=[...$("#workspaceContent").querySelectorAll(".panel")];
  const details=detailPanels.find(section=>section.querySelector("h2")?.textContent==="Application details");
  if(details)details.insertAdjacentHTML("beforeend",`<hr><h3>Service tenure</h3><p><strong>Teacher-reported total service:</strong> ${esc(years)} years</p><p><strong>Teacher-reported current-school service:</strong> ${esc(schoolYears)} years</p><p><strong>Configured category minimum:</strong> ${esc(minimumLabel)}</p>${warning}`);
  if(currentUser.role==="TEACHER"){
    const supporting=detailPanels.find(section=>section.querySelector("h2")?.textContent==="Supporting documents");
    if(supporting)supporting.insertAdjacentHTML("beforebegin",renderApplicationReadiness(a));
    const requirementLabels=new Map((a.cycleRequirements||[]).filter(item=>item.kind==="DOCUMENT").map(item=>[item.id,item.label]));
    supporting?.querySelectorAll("[data-download]").forEach(button=>{
      const doc=(a.documents||[]).find(item=>item.id===button.dataset.download);
      const label=doc&&!doc.registrationDocument?requirementLabels.get(doc.type):null;
      if(label)button.parentElement.querySelector("strong").textContent=label;
    });
    const uploadType=$("#uploadForm select[name=type]");
    if(uploadType){
      for(const requirement of (a.cycleRequirements||[]).filter(item=>item.kind==="DOCUMENT")){
        const option=document.createElement("option");
        option.value=requirement.id;
        option.textContent=`${requirement.required?"Required":"Optional"} · ${requirement.label}`;
        uploadType.insertBefore(option,uploadType.firstChild);
      }
    }
    const submitButton=$("#submitApp");
    if(submitButton)submitButton.addEventListener("click",event=>{
      const uploadedTypes=new Set((a.documents||[]).filter(document=>!document.registrationDocument).map(document=>document.type));
      const missing=(a.cycleRequirements||[]).filter(requirement=>requirement.required&&requirement.kind==="DOCUMENT"&&!uploadedTypes.has(requirement.id));
      if(missing.length&&!window.confirm(`These required documents are not attached:\n\n${missing.map(requirement=>`• ${requirement.label}`).join("\n")}\n\nYou may still submit, but district reviewers may request corrections. Submit anyway?`)){
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },true);
  }
  const form=$("#vettingForm");
  if(!form)return;
  const experience=form.elements.experienceChecked?.closest("label");
  if(experience)experience.querySelector("span").textContent="Service tenure evidence reviewed against the official guide";
  const verified=Number.isInteger(a.vetting?.serviceTenureYearsVerified)?a.vetting.serviceTenureYearsVerified:"";
  const currentVerified=Number.isInteger(a.vetting?.currentSchoolYearsVerified)?a.vetting.currentSchoolYearsVerified:"";
  const notes=esc(a.vetting?.serviceTenureNotes||"");
  const checks=form.querySelector(".checklist");
  if(checks)checks.insertAdjacentHTML("afterend",`<div class="notice"><strong>Service tenure review</strong><br>Teacher reports ${esc(years)} total years and ${esc(schoolYears)} years at the current school. Configured category minimum: ${esc(minimumLabel)}. Verify dates and continuity against supporting documents and the official guide before recording a decision.</div><div class="form-grid" style="margin-top:12px"><div class="field"><label for="verifiedServiceYears">Verified total service (years) *</label><input id="verifiedServiceYears" name="serviceTenureYearsVerified" type="number" min="0" max="60" step="1" value="${esc(verified)}"></div><div class="field"><label for="verifiedCurrentSchoolYears">Verified current-school service (years) *</label><input id="verifiedCurrentSchoolYears" name="currentSchoolYearsVerified" type="number" min="0" max="60" step="1" value="${esc(currentVerified)}"></div><div class="field full"><label for="serviceTenureNotes">Service evidence / dates checked</label><textarea id="serviceTenureNotes" name="serviceTenureNotes" maxlength="1000" placeholder="Record the service documents and period checked">${notes}</textarea></div></div>`);
};

function selectPublicCycle(cycles){
  const now=Date.now();
  const open=cycles.filter(c=>c.status==="OPEN"&&(!c.closesAt||new Date(c.closesAt).getTime()>now))
    .sort((a,b)=>new Date(a.closesAt||"9999-12-31")-new Date(b.closesAt||"9999-12-31"));
  const upcoming=cycles.filter(c=>["PUBLISHED","CONFIGURED"].includes(c.status)&&c.opensAt&&new Date(c.opensAt).getTime()>now)
    .sort((a,b)=>new Date(a.opensAt)-new Date(b.opensAt));
  const closed=cycles.filter(c=>c.status==="CLOSED"||(c.status==="OPEN"&&c.closesAt&&new Date(c.closesAt).getTime()<=now))
    .sort((a,b)=>new Date(b.closesAt||0)-new Date(a.closesAt||0));
  return open[0]||upcoming[0]||closed[0]||cycles.slice().sort((a,b)=>b.year-a.year)[0]||null;
}
function cycleDisplayStatus(cycle,now=Date.now()){
  if(cycle.status==="OPEN"&&(!cycle.closesAt||new Date(cycle.closesAt).getTime()>now))return"Open";
  if(cycle.status==="CLOSED"||(cycle.status==="OPEN"&&cycle.closesAt&&new Date(cycle.closesAt).getTime()<=now))return"Closed";
  if(cycle.opensAt&&new Date(cycle.opensAt).getTime()>now)
    return new Date(cycle.opensAt).getTime()-now<=30*86400000?"Opening soon":"Upcoming";
  return"Not open";
}
function calendarDeadline(cycle){
  if(!cycle.closesAt||new Date(cycle.closesAt).getTime()<=Date.now()||cycleDisplayStatus(cycle)==="Closed")return"";
  const end=new Date(cycle.closesAt),start=new Date(end.getTime()-30*60000);
  const stamp=value=>value.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
  const icsEscape=value=>String(value||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/([,;])/g,"\\$1");
  const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Northern Cape NTA//Award cycle//EN","BEGIN:VEVENT",`UID:${esc(cycle.id)}@northern-cape-nta`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(end)}`,`SUMMARY:${icsEscape(`NTA submission deadline: ${cycle.name}`)}`,`DESCRIPTION:${icsEscape("Submit your National Teaching Awards application before this deadline.")}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
  return`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
function renderCountdown(cycles){
  const el=$("#cycleCountdown");if(!el)return;
  const cycle=selectPublicCycle(cycles),now=Date.now(),guide=$("#prepGuideLink"),guideNote=$("#prepGuideNote");
  if(guide){
    if(cycle&&cycleDisplayStatus(cycle,now)!=="Closed"&&/^https?:\/\//i.test(cycle.guideUrl||"")){
      guide.href=cycle.guideUrl;guide.target="_blank";guide.rel="noopener noreferrer";guide.textContent="Open current award guide";guide.removeAttribute("aria-disabled");
      if(guideNote)guideNote.textContent=`Official guide for ${cycle.name}. Confirm category-specific requirements there.`;
    }else{
      guide.removeAttribute("href");guide.removeAttribute("target");guide.removeAttribute("rel");guide.textContent="Current award guide not published";guide.setAttribute("aria-disabled","true");
      if(guideNote)guideNote.textContent="Check the cycle updates below for the approved guide.";
    }
  }
  if(!cycle){el.innerHTML="<strong>No cycle currently open</strong><span>Approved cycle dates and the official guide will appear here when published.</span>";return;}
  const status=cycleDisplayStatus(cycle,now);
  const target=status==="Open"&&cycle.closesAt?new Date(cycle.closesAt):status==="Opening soon"||status==="Upcoming"?new Date(cycle.opensAt):null;
  const dateLine=cycle.closesAt?`Submission deadline: ${date(cycle.closesAt)}`:cycle.opensAt?`Opening date: ${date(cycle.opensAt)}`:"Award dates have not been announced.";
  const calendar=calendarDeadline(cycle);
  const update=()=>{
    const delta=target?target.getTime()-Date.now():0;
    const liveStatus=cycleDisplayStatus(cycle);
    const liveControls=`<div class="cycle-actions">${liveStatus!=="Closed"&&calendar?`<a class="small" href="${calendar}" download="nta-${esc(cycle.year)}-deadline.ics">Add deadline to calendar</a>`:""}${cycle.guideUrl&&/^https?:\/\//i.test(cycle.guideUrl)?`<a class="small" href="${esc(cycle.guideUrl)}" target="_blank" rel="noopener noreferrer">Official guide</a>`:""}</div>`;
    const countdown=delta>0?`<div class="countdown-digits"><span><b>${Math.floor(delta/86400000)}</b> days</span><span><b>${Math.floor(delta%86400000/3600000)}</b> hrs</span><span><b>${Math.floor(delta%3600000/60000)}</b> min</span><span><b>${Math.floor(delta%60000/1000)}</b> sec</span></div>`:"";
    el.innerHTML=`<strong>${esc(cycle.name)} · ${esc(liveStatus)}</strong><span>${esc(dateLine)}</span>${countdown}${liveControls}`;
  };
  update();
  if(window.__ntaCountdownTimer)clearInterval(window.__ntaCountdownTimer);
  if(target)window.__ntaCountdownTimer=setInterval(update,1000);
}
async function loadPublicCountdown(){try{const response=await fetch("/api/public/cycles");if(!response.ok)throw Error(`Unable to load cycle dates (${response.status}).`);const payload=await response.json();renderCountdown(payload.data||[])}catch(error){const el=$("#cycleCountdown");if(el)el.innerHTML=`<strong>Award dates unavailable</strong><span>${esc(error.message)} Refresh the page to try again.</span>`;}}
function setupSupportChat(){const toggle=$("#supportToggle"),panel=$("#supportPanel"),close=$("#supportClose"),form=$("#supportForm"),input=$("#supportMessage"),messages=$("#supportMessages");if(!toggle||!panel||!form)return;const show=()=>{panel.classList.remove('hidden');toggle.setAttribute('aria-expanded','true');input.focus()};const hide=()=>{panel.classList.add('hidden');toggle.setAttribute('aria-expanded','false');toggle.focus()};toggle.addEventListener('click',()=>panel.classList.contains('hidden')?show():hide());close.addEventListener('click',hide);function bubble(text,who,extra=''){const div=document.createElement('div');div.className=`chat-bubble ${who} ${extra}`.trim();div.textContent=text;messages.appendChild(div);messages.scrollTop=messages.scrollHeight;return div;}form.addEventListener('submit',async e=>{e.preventDefault();const message=input.value.trim();if(!message)return;bubble(message,'user');input.value='';const pending=bubble('Checking how I can help…','bot','pending');const send=form.querySelector('button');send.disabled=true;try{const r=await fetch('/api/support/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});const data=await r.json();if(!r.ok)throw Error(data.error||'Support is temporarily unavailable.');pending.textContent=data.reply||'I could not prepare a response. Please try again.';pending.classList.remove('pending');if(data.notice)bubble(data.notice,'bot');}catch(err){pending.textContent=err.message||'Support is temporarily unavailable. Please try again.';pending.classList.remove('pending');}finally{send.disabled=false;input.focus();messages.scrollTop=messages.scrollHeight;}});}
loadPublicCountdown();setupSupportChat();
(async()=>{try{const p=await api("/api/auth/me");currentUser=p.user;await showWorkspace()}catch(e){if(e.status!==401)toast(e.message,"error")}})();