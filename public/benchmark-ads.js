(() => {
 const $=id=>document.getElementById(id);
 let selected=null,canEdit=false,items=[];
 const modal=$("benchmark-ad-dialog"),form=$("benchmark-ad-form");
 async function api(url,method="GET",body){
  const r=await fetch(url,{method,credentials:"same-origin",headers:body?{"Content-Type":"application/json"}:{},body:body?JSON.stringify(body):undefined});
  if(r.status===401){location.replace("/login");throw Error("Sessão expirada.");}
  const d=await r.json();if(!r.ok)throw Error(d.error||"Falha na operação.");return d;
 }
 function base(){return "/api/companies/"+encodeURIComponent($("company").value)+"/benchmark-competitors/"+encodeURIComponent(selected.id)+"/ads";}
 function feedback(message){$("benchmark-ads-feedback").textContent=message;}
 function draw(){
  const root=$("benchmark-ads-list");root.replaceChildren();
  if(!items.length){const p=document.createElement("p");p.textContent="Nenhum anúncio registrado. Consulte a Biblioteca da Meta e salve aqui os anúncios relevantes.";root.append(p);}
  for(const ad of items){
   const article=document.createElement("article");article.className="panel benchmark-card";
   const h=document.createElement("h3");h.textContent=ad.title;
   const info=document.createElement("p");info.textContent=({video:"Vídeo",image:"Imagem",carousel:"Carrossel",unknown:"Não identificado"})[ad.format]+" · Observado em "+String(ad.observedAt).slice(0,10);
   article.append(h,info);
   for(const [label,value] of [["Mensagem",ad.message],["Gancho",ad.hook],["Chamada para ação",ad.callToAction]])if(value){const p=document.createElement("p");const strong=document.createElement("strong");strong.textContent=label+": ";p.append(strong,document.createTextNode(value));article.append(p);}
   const actions=document.createElement("div");actions.className="benchmark-actions";
   const a=document.createElement("a");a.className="secondary";a.href=ad.adUrl;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Abrir anúncio ↗";actions.append(a);
   if(canEdit){const b=document.createElement("button");b.className="remove-button";b.textContent="Remover";b.onclick=async()=>{if(!confirm("Remover este registro?"))return;try{await api(base()+"/"+encodeURIComponent(ad.id),"DELETE",{});await load();}catch(e){feedback(e.message);}};actions.append(b);}
   article.append(actions);root.append(article);
  }
 }
 async function load(){feedback("Carregando anúncios…");try{items=(await api(base())).ads;feedback(items.length+" anúncio(s) registrado(s) manualmente.");draw();}catch(e){feedback(e.message);}}
 window.benchmarkAdsOpen=(competitor,write)=>{selected=competitor;canEdit=write;$("benchmark-ads-title").textContent="Anúncios de "+competitor.name;$("benchmark-ad-add").hidden=!write;$("benchmark-ads-section").hidden=false;items=[];draw();load();$("benchmark-ads-section").scrollIntoView({behavior:"smooth",block:"start"});};
 window.benchmarkAdsReset=()=>{selected=null;items=[];$("benchmark-ads-section").hidden=true;};
 $("benchmark-ad-add").onclick=()=>{form.reset();$("benchmark-ad-error").textContent="";modal.showModal();};
 $("benchmark-ad-cancel").onclick=()=>modal.close();
 $("benchmark-ad-close").onclick=()=>{$("benchmark-ads-section").hidden=true;selected=null;};
 form.onsubmit=async e=>{e.preventDefault();if(!selected||!canEdit)return;const data={};for(const key of ["title","adUrl","format","message","hook","callToAction"])data[key]=form.elements[key].value.trim();try{await api(base(),"POST",data);modal.close();await load();}catch(err){$("benchmark-ad-error").textContent=err.message;}};
})();
