// Read-only Meta overview: never creates or activates campaigns.
(function(){
 let lastCompany="",pending=null,loadedAt=0;
 const $=id=>document.getElementById(id);
 function status(id,message){$(id).textContent=message;}
 function cell(row,value){const td=document.createElement("td");td.textContent=String(value??"—");row.append(td);}
 function money(cents){if(cents==null)return "—";return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(cents)/100);}
 async function load(){
  const company=$("company").value;
  if(!company){status("meta-home-feedback","Selecione uma clínica.");return;}
  if(pending===company)return;
  if(company===lastCompany&&Date.now()-loadedAt<30000)return;
  pending=company;
  status("meta-home-feedback","Atualizando indicadores da Meta…");
  status("meta-campaigns-feedback","Consultando campanhas…");
  try{
   const base="/api/companies/"+encodeURIComponent(company)+"/meta-campaigns?type=";
   const results=await Promise.allSettled(["campaigns","ads","insights"].map(async type=>{
    const response=await fetch(type==="insights"?"/api/companies/"+encodeURIComponent(company)+"/meta-insights?period=last_30d":base+type,{credentials:"same-origin",cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||"Falha na consulta à Meta");
    return data;
   }));
   if($("company").value!==company)return;
   const [campaigns,ads,insights]=results;
   if(insights.status==="fulfilled"){
    const d=insights.value;const n=new Intl.NumberFormat("pt-BR");
    $("dashboard-spend").textContent=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(d.spend);
    $("dashboard-reach").textContent=n.format(d.reach);
    $("dashboard-impressions").textContent=n.format(d.impressions);
    $("dashboard-links").textContent=n.format(d.linkClicks);
    $("dashboard-conversations").textContent=d.messagingConversationsStarted===null?"Não disponível":n.format(d.messagingConversationsStarted);
   }else{
    for(const id of ["dashboard-spend","dashboard-reach","dashboard-impressions","dashboard-links","dashboard-conversations"])$(id).textContent="—";
   }
   const rows=$("meta-home-rows");rows.replaceChildren();
   if(campaigns.status==="fulfilled"){
    const items=campaigns.value.items||[];
    $("meta-campaign-count").textContent=items.length+(campaigns.value.hasMore?"+":"");
    for(const item of items){
     const tr=document.createElement("tr");
     cell(tr,item.name);cell(tr,item.objective);cell(tr,item.effectiveStatus||item.status);cell(tr,money(item.dailyBudget));
     rows.append(tr);
    }
    status("meta-campaigns-feedback",items.length?(campaigns.value.hasMore?"Mostrando os primeiros 100 resultados. Abra o Gerenciador Meta para consultar mais.":"Campanhas sincronizadas da Meta."):"Nenhuma campanha encontrada na Meta.");
   }else{
    $("meta-campaign-count").textContent="—";
    status("meta-campaigns-feedback","Não foi possível consultar campanhas: "+campaigns.reason.message);
   }
   if(ads.status==="fulfilled")$("meta-ad-count").textContent=(ads.value.items||[]).length+(ads.value.hasMore?"+":"");
   else $("meta-ad-count").textContent="—";
   status("meta-home-feedback",insights.status==="fulfilled"?"Desempenho dos últimos 30 dias · Fonte: Meta Marketing API.":"Resultados de 30 dias indisponíveis: "+insights.reason.message);
   lastCompany=company;loadedAt=Date.now();
  }catch(e){status("meta-home-feedback","Não foi possível carregar a Meta: "+e.message);}
  finally{if(pending===company)pending=null;}
 }
 window.loadHomeMeta=load;
})();
