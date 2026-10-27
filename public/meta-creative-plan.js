// Drafts are persisted per clinic; no Meta write occurs here.
(function(){
 const $=id=>document.getElementById(id);
 const form=$("creative-plan-form"),feedback=$("creative-feedback"),preview=$("creative-preview");
 const mediaSelect=$("creative-media"),saved=$("creative-saved"),campaign=$("creative-campaign"),adset=$("creative-adset");
 let media=[],drafts=[],campaigns=[],adsets=[],companyId="",sequence=0;
 const editor=$("creative-editor"),reusePanel=$("creative-reuse-panel"),publishSelect=$("meta-publish-draft");
 function showEditor(reusing=false){editor.hidden=false;reusePanel.hidden=!reusing;}
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
  showEditor(false);form.reset();saved.value="";campaign.value="";updateAdsets();preview.hidden=true;feedback.textContent="Novo anúncio. Escolha a mídia e preencha a mensagem.";
  $("creative-primary-text").focus();
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
  fill(saved,drafts,d=>d.headline+" · "+d.mediaName,"Selecione um anúncio");
  fill(publishSelect,drafts,d=>d.headline+" · "+d.mediaName,"Selecione um anúncio salvo");
  if(keepId&&drafts.some(d=>String(d.id)===String(keepId))){saved.value=String(keepId);publishSelect.value=String(keepId);}
  else if(keepId){throw Error("O anúncio não apareceu na lista após salvar. Confira antes de tentar novamente.");}
  publishSelect.dispatchEvent(new Event("change"));
 }
 function applyDraft(){
  const d=drafts.find(x=>x.id===saved.value);if(!d)return;
  showEditor(true);
  mediaSelect.value=d.mediaId;
  $("creative-headline").value=d.headline;
  $("creative-primary-text").value=d.primaryText;
  $("creative-description").value=d.description;
  campaign.value=d.campaignMetaId||"";
  updateAdsets();adset.value=d.adsetMetaId||"";
  preview.hidden=true;feedback.textContent="Rascunho recuperado. Você pode editar e salvar novamente.";
 }
 async function refresh(){
  const current=++sequence;companyId=select.value;media=[];drafts=[];campaigns=[];adsets=[];
  preview.hidden=true;editor.hidden=true;reusePanel.hidden=true;fill(mediaSelect,[],x=>x.name,"Selecione uma mídia");
  fill(saved,[],x=>x.headline,"Selecione um anúncio");fill(publishSelect,[],x=>x.headline,"Selecione um anúncio salvo");
  fill(campaign,[],x=>x.name,"Sem vínculo por enquanto");updateAdsets();
  if(!companyId)return;
  feedback.textContent="Carregando mídias e rascunhos…";
  try{
   const results=await Promise.allSettled([
    api("/media"),api("/creative-drafts"),api("/meta-campaigns?type=campaigns"),api("/meta-campaigns?type=adsets")
   ]);
   if(current!==sequence)return;
   if(results[0].status==="rejected")throw results[0].reason;
   if(results[1].status==="rejected")throw results[1].reason;
   media=(results[0].value.media||[]).filter(m=>m.kind==="video"||m.kind==="image");
   drafts=results[1].value.drafts||[];
   fill(mediaSelect,media,m=>(m.kind==="image"?"Imagem: ":"Vídeo: ")+m.name+" · "+(m.accountLabel||m.accountEmail||"Conta não informada"),"Selecione um vídeo ou uma imagem");
   fill(saved,drafts,d=>d.headline+" · "+d.mediaName,"Selecione um anúncio");
   fill(publishSelect,drafts,d=>d.headline+" · "+d.mediaName,"Selecione um anúncio salvo");
   campaigns=results[2].status==="fulfilled"?(results[2].value.items||[]):[];
   adsets=results[3].status==="fulfilled"?(results[3].value.items||[]):[];
   fill(campaign,campaigns,c=>c.name+" · "+c.id,"Sem vínculo por enquanto");updateAdsets();
   feedback.textContent="Biblioteca e rascunhos carregados. "+drafts.length+" rascunho(s) salvo(s).";
   if(results[2].status==="rejected"||results[3].status==="rejected")feedback.textContent+=" Vínculos da Meta indisponíveis no momento.";
  }catch(e){feedback.textContent=e.message;}
 }
 function previewDraft(){
  const p=payload(),m=media.find(x=>String(x.id)===p.mediaId);
  if(!m||!p.headline||!p.primaryText){feedback.textContent="Selecione uma imagem ou vídeo e preencha título e texto.";return false;}
  let url;try{url=new URL(m.url);if(url.protocol!=="https:")throw Error("URL inválida");}catch{feedback.textContent="Link HTTPS da mídia inválido.";return false;}
  $("creative-preview-headline").textContent=p.headline;
  $("creative-preview-text").textContent=p.primaryText;
  $("creative-preview-description").textContent=p.description;
  $("creative-preview-media").textContent=(m.kind==="image"?"Imagem: ":"Vídeo: ")+m.name+" · Conta: "+(m.accountLabel||m.accountEmail||"Não informada");
  $("creative-preview-link").href=url.href;
  preview.hidden=false;return true;
 }
 form.addEventListener("input",()=>{preview.hidden=true;});
 form.addEventListener("submit",e=>{e.preventDefault();if(previewDraft())feedback.textContent="Prévia pronta. Clique em Salvar rascunho para guardar os dados.";});
 campaign.addEventListener("change",()=>{updateAdsets();preview.hidden=true;});
 saved.addEventListener("change",()=>{if(saved.value)applyDraft();else clearForm();});
 $("creative-new").addEventListener("click",()=>{clearForm();});
 $("creative-reuse").addEventListener("click",()=>{reusePanel.hidden=false;editor.hidden=true;saved.value="";feedback.textContent="Escolha um anúncio preparado para editar.";});
 $("creative-save").addEventListener("click",async()=>{
  if(!form.reportValidity()||!previewDraft())return;
  const button=$("creative-save");button.disabled=true;
  try{
   const id=saved.value,method=id?"PUT":"POST",path="/creative-drafts"+(id?"/"+encodeURIComponent(id):"");
   const result=await api(path,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(payload())});
   await loadDrafts(result.id||result.draft?.id);
   feedback.textContent="Anúncio salvo! Ele já está selecionado na etapa 4 para envio à Meta.";
  }catch(e){feedback.textContent="Não foi possível salvar: "+e.message;}finally{button.disabled=false;}
 });
 $("creative-delete").addEventListener("click",async()=>{
  if(!saved.value){feedback.textContent="Escolha um rascunho na lista antes de excluir.";saved.focus();return;}
  if(!window.confirm("Excluir este rascunho? Nenhum anúncio da Meta será alterado."))return;
  const id=saved.value;
  try{await api("/creative-drafts/"+encodeURIComponent(id),{method:"DELETE",headers:{"Content-Type":"application/json"}});
   await loadDrafts();clearForm();feedback.textContent="Anúncio preparado excluído.";
  }catch(e){feedback.textContent=e.message;}
 });
 select.addEventListener("change",refresh);
 select.addEventListener("meta-company-ready",refresh);
 window.addEventListener("meta-adset-created",refresh);
})();