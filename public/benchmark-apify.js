(() => {
 const $=id=>document.getElementById(id);
 let request=0;
 function reset(){request++;$("benchmark-auto-refresh").hidden=true;window.benchmarkSelectedCompetitor=null;$("benchmark-auto-results").replaceChildren();}
 window.benchmarkAutoReset=reset;
 window.benchmarkAutoSearch=async competitor=>{
  window.benchmarkSelectedCompetitor=competitor;
  window.benchmarkAdsOpen(competitor,true);
  $("benchmark-auto-refresh").hidden=false;
  const current=++request;
  const root=$("benchmark-auto-results");root.replaceChildren();
  const status=document.createElement("p");status.textContent="Carregando anúncios salvos…";root.append(status);
  try{
   const path="/api/companies/"+encodeURIComponent($("company").value)+"/benchmark-competitors/"+encodeURIComponent(competitor.id)+"/auto-ads";
   const response=await fetch(path,{method:"GET",credentials:"same-origin"});
   const data=await response.json();
   if(current!==request)return;
   if(!response.ok)throw Error(data.error||"Falha na busca automática.");
   if(!data.cached){status.textContent="Nenhuma busca salva ainda. Clique em Atualizar anúncios para consultar a Apify.";return;}
   status.textContent=data.returned===0?"Nenhum anúncio encontrado nesta busca. Isso não significa necessariamente que a clínica não anuncia.":data.returned+" anúncio(s) encontrado(s). "+(data.searchMode==="name"?"Busca por nome: confira cuidadosamente o anunciante. ":"")+"Atualizado em "+new Date(data.updatedAt).toLocaleString("pt-BR")+". Exibindo resultados salvos.";
   for(const ad of data.ads){
    const card=document.createElement("article");card.className="panel benchmark-card";
    const title=document.createElement("h3");title.textContent=ad.pageName||"Anúncio público";
    const info=document.createElement("p");info.textContent=[ad.format,ad.startDate?"Início: "+ad.startDate:null].filter(Boolean).join(" · ");
    card.append(title,info);
    if(ad.text){const p=document.createElement("p");p.textContent=ad.text;card.append(p);}
    if(ad.imageUrl){const img=document.createElement("img");img.src=ad.imageUrl;img.alt="Imagem pública do anúncio";img.loading="lazy";img.referrerPolicy="no-referrer";img.style.cssText="width:100%;max-height:260px;object-fit:contain";card.append(img);}
    const actions=document.createElement("div");actions.className="benchmark-actions";
    const link=document.createElement("a");link.className="secondary";link.href=ad.adUrl;link.target="_blank";link.rel="noopener noreferrer";link.textContent="Conferir na Meta ↗";actions.append(link);
    const save=document.createElement("button");save.className="primary";save.textContent="Registrar na biblioteca";save.onclick=()=>{
     const form=$("benchmark-ad-form");form.reset();
     form.elements.title.value=(ad.pageName||"Anúncio")+" — "+(ad.externalId||"referência");
     form.elements.adUrl.value=ad.adUrl;form.elements.format.value=ad.format;
     form.elements.message.value=ad.text||"";
     $("benchmark-ad-error").textContent="";
     $("benchmark-ad-dialog").showModal();
    };actions.append(save);card.append(actions);root.append(card);
   }
  }catch(e){if(current===request)status.textContent=e.message;}
 };
 window.benchmarkAutoRefresh=async()=>{
  const root=$("benchmark-auto-results");
  const refresh=$("benchmark-auto-refresh");
  if(!window.benchmarkSelectedCompetitor)return;
  const c=window.benchmarkSelectedCompetitor;
  refresh.disabled=true;refresh.textContent="Consultando Apify…";
  const status=document.createElement("p");status.textContent="Atualizando anúncios na Apify. Aguarde; esta operação pode gerar cobrança.";root.prepend(status);
  try{
   const path="/api/companies/"+encodeURIComponent($("company").value)+"/benchmark-competitors/"+encodeURIComponent(c.id)+"/auto-ads";
   const r=await fetch(path,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}"});
   const d=await r.json();if(!r.ok)throw Error(d.error||"Falha ao atualizar.");
   await window.benchmarkAutoSearch(c);
  }catch(e){status.textContent=e.message;}
  finally{refresh.disabled=false;refresh.textContent="↻ Atualizar anúncios";}
 };
})();
