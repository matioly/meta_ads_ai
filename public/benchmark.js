(() => {
 const $ = id => document.getElementById(id);
 const company=$("company"), form=$("benchmark-form"), dialog=$("benchmark-dialog"), feedback=$("benchmark-feedback");
 let competitors=[],editing=null,role="member",busy=false;
 function say(message,error=false){feedback.textContent=message;feedback.style.color=error?"#a02f48":"#50617d";}
 async function api(path,method="GET",body){
  const r=await fetch(path,{method,credentials:"same-origin",headers:body?{"Content-Type":"application/json"}:{},body:body?JSON.stringify(body):undefined});
  if(r.status===401){location.replace("/login");throw Error("Sessão expirada.");}
  const data=await r.json();if(!r.ok)throw Error(data.error||"Falha na operação.");return data;
 }
 function endpoint(){return "/api/companies/"+encodeURIComponent(company.value)+"/benchmark-competitors";}
 function canWrite(){return ["owner","admin"].includes(role);}
 function render(){
  $("benchmark-count").textContent=competitors.length+" de 5 concorrentes";
  $("benchmark-add").disabled=!canWrite()||competitors.length>=5||busy;
  const root=$("benchmark-list");root.replaceChildren();
  if(!competitors.length){const p=document.createElement("p");p.className="no-results";p.textContent="Nenhum concorrente cadastrado nesta clínica.";root.append(p);return;}
  for(const c of competitors){
   const card=document.createElement("article");card.className="panel benchmark-card";
   const title=document.createElement("h2");title.textContent=c.name;
   const info=document.createElement("p");info.textContent=[c.city,c.state,c.specialty].filter(Boolean).join(" · ")||"Sem detalhes adicionais";
   const actions=document.createElement("div");actions.className="benchmark-actions";
   function link(label,url){if(!url)return;const a=document.createElement("a");a.className="secondary";a.textContent=label;a.href=url;a.target="_blank";a.rel="noopener noreferrer";actions.append(a);}
   link("Instagram ↗",c.instagramUrl);link("Facebook ↗",c.facebookUrl);
   const library=new URL("https://www.facebook.com/ads/library/");
   library.searchParams.set("active_status","active");library.searchParams.set("ad_type","all");library.searchParams.set("country","BR");library.searchParams.set("q",c.name);
   link("Ver anúncios ↗",library.toString());
   const analyze=document.createElement("button");analyze.className="secondary";analyze.type="button";analyze.textContent="Analisar anúncios";analyze.onclick=()=>window.benchmarkAdsOpen(c,canWrite());actions.append(analyze);
   if(canWrite()){const auto=document.createElement("button");auto.type="button";auto.className="primary";auto.textContent="📋 Ver anúncios salvos";auto.onclick=()=>window.benchmarkAutoSearch(c);actions.append(auto);}
   if(canWrite()){
    const edit=document.createElement("button");edit.className="secondary";edit.textContent="Editar";edit.onclick=()=>open(c);
    const del=document.createElement("button");del.className="remove-button";del.textContent="Excluir";del.onclick=()=>remove(c);
    actions.append(edit,del);
   }
   card.append(title,info);
   if(c.notes){const notes=document.createElement("p");notes.textContent=c.notes;card.append(notes);}
   card.append(actions);root.append(card);
  }
 }
 async function load(){
  if(!company.value)return;
  say("Carregando concorrentes…");competitors=[];render();
  try{const data=await api(endpoint());competitors=data.competitors;say("");}
  catch(e){say(e.message,true);}render();
 }
 function open(c=null){
  editing=c?.id||null;form.reset();
  $("benchmark-dialog-title").textContent=c?"Editar concorrente":"Novo concorrente";
  for(const key of ["name","city","state","instagramUrl","facebookUrl","specialty","notes"])form.elements[key].value=c?.[key]||"";
  $("benchmark-form-error").textContent="";dialog.showModal();
 }
 async function remove(c){
  if(!confirm('Excluir o concorrente "'+c.name+'"?'))return;
  try{await api(endpoint()+"/"+encodeURIComponent(c.id),"DELETE",{});await load();say("Concorrente excluído.");}catch(e){say(e.message,true);}
 }
 $("benchmark-add").onclick=()=>open();
 $("benchmark-cancel").onclick=()=>dialog.close();
 form.addEventListener("submit",async e=>{
  e.preventDefault();if(busy)return;
  const body={};for(const key of ["name","city","state","instagramUrl","facebookUrl","specialty","notes"])body[key]=form.elements[key].value.trim();
  busy=true;render();
  try{await api(endpoint()+(editing?"/"+encodeURIComponent(editing):""),editing?"PUT":"POST",body);dialog.close();await load();say(editing?"Concorrente atualizado.":"Concorrente cadastrado.");}
  catch(err){$("benchmark-form-error").textContent=err.message;}
  finally{busy=false;render();}
 });
 async function init(){
  try{
   const data=await api("/api/me");$("user-name").textContent=data.user.name;
   company.replaceChildren();
   for(const c of data.companies){const option=document.createElement("option");option.value=c.id;option.textContent=c.name;company.append(option);}
   if(!data.companies.length){say("Nenhuma clínica vinculada.",true);return;}
   const selected=sessionStorage.getItem("benchmark-company");
   if(data.companies.some(c=>c.id===selected))company.value=selected;
   function update(){window.benchmarkAdsReset?.();const c=data.companies.find(c=>c.id===company.value);role=c?.role||"member";$("company-name").textContent=c?.name||"";sessionStorage.setItem("benchmark-company",company.value);load();}
   company.addEventListener("change",update);update();
  }catch(e){say(e.message,true);}
 }
 $("logout").onclick=async()=>{try{await api("/api/logout","POST",{});location.replace("/login");}catch(e){say(e.message,true);}};
 init();
})();
