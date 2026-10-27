// Read-only Meta overview: never creates or activates campaigns.
(function(){
 let lastCompany="",pending=null,loadedAt=0;
 const withTimeout=async(url)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);try{return await fetch(url,{credentials:"same-origin",cache:"no-store",signal:controller.signal});}finally{clearTimeout(timer);}};
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
    const response=await withTimeout(type==="insights"?"/api/companies/"+encodeURIComponent(company)+"/meta-insights?period=last_30d":base+type);
    const data=await response.json();
    if(!response.ok)throw Error(data.error||"Falha na consulta à Meta");
    return data;
   }));
   if($("company").value!==company)return;
   const [campaigns,ads,insights]=results;
   let fallbackUsed=false;
   let fallbackError="";
   if(insights.status==="fulfilled"){
    const d=insights.value;const n=new Intl.NumberFormat("pt-BR");
    if(d.hasData){
     $("dashboard-spend").textContent=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(d.spend);
     $("dashboard-reach").textContent=n.format(d.reach);
     $("dashboard-impressions").textContent=n.format(d.impressions);
     $("dashboard-links").textContent=n.format(d.linkClicks);
     $("dashboard-conversations").textContent=d.messagingConversationsStarted===null?"Não disponível":n.format(d.messagingConversationsStarted);
    }else fallbackUsed=true;
   }else fallbackUsed=true;
   if(fallbackUsed){
    // The account-level Insights query may fail even when ad-level insights work.
    // Reuse the same 30-day source as the performance table; do not sum reach,
    // because people reached across ads are not unique.
    try{
     const response=await withTimeout("/api/companies/"+encodeURIComponent(company)+"/meta-performance?level=ad&period=last_30d");
     const data=await response.json();
     if(!response.ok)throw Error(data.error||"Falha ao consultar desempenho por anúncio.");
     if(data.hasMore)throw Error("A consulta por anúncio foi paginada parcialmente; totais não podem ser calculados com segurança.");
     if($("company").value!==company)return;
     const items=data.items||[];
     const sum=key=>items.reduce((total,item)=>total+Number(item[key]||0),0);
     const n=new Intl.NumberFormat("pt-BR");
     $("dashboard-spend").textContent=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(sum("spend"));
     $("dashboard-reach").textContent="—";
     $("dashboard-reach").title="Alcance único não pode ser somado entre anúncios.";
     $("dashboard-impressions").textContent=n.format(sum("impressions"));
     $("dashboard-links").textContent=n.format(sum("linkClicks"));
     $("dashboard-conversations").textContent=items.some(item=>item.conversations!==null&&item.conversations!==undefined)?n.format(sum("conversations")):"Não disponível";
    }catch(error){
     fallbackError=error.message;
     for(const id of ["dashboard-spend","dashboard-reach","dashboard-impressions","dashboard-links","dashboard-conversations"])$(id).textContent="—";
    }
   }else $("dashboard-reach").removeAttribute("title");
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
   status("meta-home-feedback",fallbackUsed?(fallbackError?"Resultados de 30 dias indisponíveis: "+fallbackError:"Desempenho dos últimos 30 dias · Totais por anúncio (alcance único indisponível)."):"Desempenho dos últimos 30 dias · Fonte: Meta Marketing API.");
   lastCompany=company;loadedAt=Date.now();
  }catch(e){status("meta-home-feedback","Não foi possível carregar a Meta: "+(e.name==="AbortError"?"tempo limite excedido. Tente atualizar a página.":e.message));}
  finally{if(pending===company)pending=null;}
 }
 window.loadHomeMeta=load;
 // The workspace is populated asynchronously; ensure overview starts even if the initial callback ran too early.
 if($("overview-section")){let attempts=0;const ready=setInterval(()=>{if($("company")?.value){clearInterval(ready);load();}else if(++attempts>=100){clearInterval(ready);status("meta-home-feedback","Selecione uma clínica para consultar os dados da Meta.");}},200);}
})();
