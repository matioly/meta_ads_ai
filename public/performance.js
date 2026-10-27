(function(){
 const $=id=>document.getElementById(id), fmt=new Intl.NumberFormat("pt-BR"),currency=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
 let company="",campaigns=[],adsets=[],request=0;
 function option(select,id,name){const o=document.createElement("option");o.value=id;o.textContent=name;select.append(o);}
 function choices(select,items,label){const previous=select.value;select.replaceChildren();option(select,"",label);for(const i of items)option(select,i.id,i.name);if(items.some(i=>i.id===previous))select.value=previous;}
 function cell(row,value){const td=document.createElement("td");td.textContent=value;row.append(td);}
 async function api(level,period,c){const response=await fetch("/api/companies/"+encodeURIComponent(c)+"/meta-performance?level="+level+"&period="+period,{credentials:"same-origin",cache:"no-store"});const data=await response.json();if(!response.ok)throw Error(data.error||"Erro ao consultar Meta");return data;}
 async function load(){
  const c=$("company").value;if(!c)return;
  const seq=++request,period=$("perf-period").value,level=$("perf-level").value;
  $("perf-feedback").textContent="Consultando resultados reais da Meta…";$("perf-rows").replaceChildren();
  try{
   const [campaignData,adsetData,results]=await Promise.all([api("campaign",period,c),api("adset",period,c),api(level,period,c)]);
   if(seq!==request||$("company").value!==c)return;
   campaigns=campaignData.items;adsets=adsetData.items;
   choices($("perf-campaign"),campaigns.map(i=>({id:i.id,name:i.name})),"Todas");
   const campaign=$("perf-campaign").value;
   choices($("perf-adset"),adsets.filter(i=>!campaign||i.campaignId===campaign).map(i=>({id:i.id,name:i.name})),"Todos");
   const adset=$("perf-adset").value;
   const rows=results.items.filter(i=>(!campaign||i.id===campaign||i.campaignId===campaign)&&(!adset||i.id===adset||i.adsetId===adset)).sort((a,b)=>b.spend-a.spend);
   for(const item of rows){const tr=document.createElement("tr");cell(tr,item.name||item.id);cell(tr,currency.format(item.spend));cell(tr,fmt.format(item.reach));cell(tr,fmt.format(item.impressions));cell(tr,fmt.format(item.linkClicks));cell(tr,item.ctr==null?"—":item.ctr.toFixed(2)+"%");cell(tr,item.cpc==null?"—":currency.format(item.cpc));cell(tr,item.conversations==null?"Não disponível":fmt.format(item.conversations));cell(tr,item.costPerConversation==null?"—":currency.format(item.costPerConversation));$("perf-rows").append(tr);}
   $("perf-feedback").textContent=(rows.length?rows.length+" resultados encontrados.":"Nenhum resultado no período.")+(results.hasMore?" A Meta retornou apenas os primeiros 500 registros.":"");
  }catch(e){if(seq===request)$("perf-feedback").textContent="Não foi possível carregar: "+e.message;}
 }
 $("performance-details").addEventListener("toggle",()=>{if($("performance-details").open)load();});
 for(const id of ["perf-period","perf-level","perf-campaign","perf-adset"])$(id).addEventListener("change",()=>{
  if(id==="perf-campaign"){$("perf-adset").value="";}
  load();
 });
 $("perf-refresh").addEventListener("click",load);
 $("company").addEventListener("change",()=>{request++;$("perf-campaign").value="";$("perf-adset").value="";if($("performance-details").open)load();});
})();
