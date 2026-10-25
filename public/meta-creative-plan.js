// Drafts are persisted per clinic; no Meta write occurs here.
(function(){
 const $=id=>document.getElementById(id);
 const form=$("creative-plan-form"),feedback=$("creative-feedback"),preview=$("creative-preview");
 const mediaSelect=$("creative-media"),saved=$("creative-saved"),campaign=$("creative-campaign"),adset=$("creative-adset");
 let videos=[],drafts=[],campaigns=[],adsets=[],companyId="",sequence=0;
 const base=()=>"/api/companies/"+encodeURIComponent(companyId);
 async function api(path,options={}){
  const r=await fetch(base()+path,{credentials:"same-origin",cache:"no-store",...options});
  const ct=r.headers.get("content-type")||"";
  if(!ct.includes("application/json"))throw Error("Resposta inesperada do servidor. Atualize a página e tente novamente.");
  const data=await r.json();if(!r.ok)throw Error(data.error||"Falha ao acessar o servidor.");return data;
 }
 function fill(select,items,label,placeholder){
  select.replaceChildren();const empty=new Option(placeholder,"");select.append(empty);
  for(const item of items)select.append(new Option(label(item),String(item.id)));
 }
 function clearForm(){
  saved.value="";form.reset();campaign.value="";updateAdsets();preview.hidden=true;feedback.textContent="Novo rascunho. Preencha os campos e clique em Salvar rascunho.";
 }
 function updateAdsets(){
  const filtered=adsets.filter(x=>String(x.campaignId)===campaign.value);
  fill(adset,filtered,x=>x.name+" · "+x.id,"Sem vínculo por enquanto");
 }
 function payload(){
  return {mediaId:mediaSelect.value,headline:$("creative-headline").value.trim(),
   primaryText:$("creative-primary-text").value.trim(),description:$("creative-description").value.trim(),
   campaignMetaId:campaign.value,adsetMetaId:adset.value};
 }
 async function loadDrafts(keepId=""){
  const result=await api("/creative-drafts");drafts=result.drafts||[];
  fill(saved,drafts,d=>d.headline+" · "+d.mediaName,"Novo rascunho");
  if(keepId&&drafts.some(d=>d.id===keepId))saved.value=keepId;
 }
 function applyDraft(){
  const d=drafts.find(x=>x.id===saved.value);if(!d)return;
  mediaSelect.value=d.mediaId;
  $("creative-headline").value=d.headline;
  $("creative-primary-text").value=d.primaryText;
  $("creative-description").value=d.description;
  campaign.value=d.campaignMetaId||"";
  updateAdsets();adset.value=d.adsetMetaId||"";
  preview.hidden=true;feedback.textContent="Rascunho recuperado. Você pode editar e salvar novamente.";
 }
 async function refresh(){
  const current=++sequence;companyId=select.value;videos=[];drafts=[];campaigns=[];adsets=[];
  preview.hidden=true;fill(mediaSelect,[],x=>x.name,"Selecione um vídeo");
  fill(saved,[],x=>x.headline,"Novo rascunho");
  fill(campaign,[],x=>x.name,"Sem vínculo por enquanto");updateAdsets();
  if(!companyId)return;
  feedback.textContent="Carregando vídeos e rascunhos…";
  try{
   const results=await Promise.allSettled([
    api("/media"),api("/creative-drafts"),api("/meta-campaigns?type=campaigns"),api("/meta-campaigns?type=adsets")
   ]);
   if(current!==sequence)return;
   if(results[0].status==="rejected")throw results[0].reason;
   if(results[1].status==="rejected")throw results[1].reason;
   videos=(results[0].value.media||[]).filter(m=>m.kind==="video");
   drafts=results[1].value.drafts||[];
   fill(mediaSelect,videos,m=>m.name+" · "+(m.accountLabel||m.accountEmail||"Conta não informada"),"Selecione um vídeo");
   fill(saved,drafts,d=>d.headline+" · "+d.mediaName,"Novo rascunho");
   campaigns=results[2].status==="fulfilled"?(results[2].value.items||[]):[];
   adsets=results[3].status==="fulfilled"?(results[3].value.items||[]):[];
   fill(campaign,campaigns,c=>c.name+" · "+c.id,"Sem vínculo por enquanto");updateAdsets();
   feedback.textContent="Biblioteca e rascunhos carregados. "+drafts.length+" rascunho(s) salvo(s).";
   if(results[2].status==="rejected"||results[3].status==="rejected")feedback.textContent+=" Vínculos da Meta indisponíveis no momento.";
  }catch(e){feedback.textContent=e.message;}
 }
 function previewDraft(){
  const p=payload(),m=videos.find(x=>String(x.id)===p.mediaId);
  if(!m||!p.headline||!p.primaryText){feedback.textContent="Selecione um vídeo e preencha título e texto.";return false;}
  let url;try{url=new URL(m.url);if(url.protocol!=="https:")throw Error("URL inválida");}catch{feedback.textContent="Link HTTPS do vídeo inválido.";return false;}
  $("creative-preview-headline").textContent=p.headline;
  $("creative-preview-text").textContent=p.primaryText;
  $("creative-preview-description").textContent=p.description;
  $("creative-preview-media").textContent="Vídeo: "+m.name+" · Conta: "+(m.accountLabel||m.accountEmail||"Não informada");
  $("creative-preview-link").href=url.href;
  preview.hidden=false;return true;
 }
 form.addEventListener("input",()=>{preview.hidden=true;});
 form.addEventListener("submit",e=>{e.preventDefault();if(previewDraft())feedback.textContent="Prévia pronta. Clique em Salvar rascunho para guardar os dados.";});
 campaign.addEventListener("change",()=>{updateAdsets();preview.hidden=true;});
 saved.addEventListener("change",()=>{if(saved.value)applyDraft();else clearForm();});
 $("creative-new").addEventListener("click",clearForm);
 $("creative-save").addEventListener("click",async()=>{
  if(!form.reportValidity()||!previewDraft())return;
  const button=$("creative-save");button.disabled=true;
  try{
   const id=saved.value,method=id?"PUT":"POST",path="/creative-drafts"+(id?"/"+encodeURIComponent(id):"");
   const result=await api(path,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(payload())});
   await loadDrafts(result.id);
   feedback.textContent="Rascunho salvo no banco! Você pode voltar depois e continuar. Nenhum anúncio foi enviado à Meta.";
  }catch(e){feedback.textContent="Não foi possível salvar: "+e.message;}finally{button.disabled=false;}
 });
 $("creative-delete").addEventListener("click",async()=>{
  if(!saved.value){feedback.textContent="Selecione um rascunho salvo para excluir.";return;}
  if(!window.confirm("Excluir este rascunho? Nenhum anúncio da Meta será alterado."))return;
  const id=saved.value;
  try{await api("/creative-drafts/"+encodeURIComponent(id),{method:"DELETE",headers:{"Content-Type":"application/json"}});
   await loadDrafts();clearForm();feedback.textContent="Rascunho excluído do banco.";
  }catch(e){feedback.textContent=e.message;}
 });
 select.addEventListener("change",refresh);
 select.addEventListener("meta-company-ready",refresh);
})();