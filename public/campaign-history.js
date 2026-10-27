// Read-only campaign history, independent of draft planning and overview metrics.
(function(){
 const $=id=>document.getElementById(id);
 if(!$("history-rows"))return;
 const company=$("company"),search=$("history-search"),status=$("history-status"),objective=$("history-objective"),sort=$("history-sort");
 let items=[],activeCompany="",requestId=0,loaded=false;
 const expandedCampaigns=new Set(),expandedAdsets=new Set(),childrenCache=new Map(),performanceCache=null,performancePending=null;
 const formatDate=value=>{if(!value)return "—";const d=new Date(value);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("pt-BR",{dateStyle:"short"}).format(d);};
 const money=value=>value==null?"—":new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(value)/100);
 const statusLabels={ACTIVE:"Ativa",PAUSED:"Pausada",ARCHIVED:"Arquivada",DELETED:"Excluída",CAMPAIGN_PAUSED:"Campanha pausada",ADSET_PAUSED:"Conjunto pausado",WITH_ISSUES:"Com problemas",IN_PROCESS:"Em processamento",PENDING_REVIEW:"Em análise",DISAPPROVED:"Reprovada"};
 const label=value=>statusLabels[value]||value||"—";
 function cell(row,value){const td=document.createElement("td");td.textContent=String(value??"—");row.append(td);}
 async function expand(type,id){
  const key=type+":"+id, open=type==="adsets"?expandedCampaigns:expandedAdsets;
  if(open.has(id)){open.delete(id);render();return;}
  open.add(id);render();
  if(childrenCache.has(key))return;
  const companyId=activeCompany;
  try{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
   let response;
   try{response=await fetch("/api/companies/"+encodeURIComponent(companyId)+"/meta-campaign-children?type="+encodeURIComponent(type)+"&parentId="+encodeURIComponent(id),{credentials:"same-origin",cache:"no-store",signal:controller.signal});}
   finally{clearTimeout(timer);}
   const data=await response.json();if(!response.ok)throw Error(data.error||"Falha ao consultar a Meta.");
   if(companyId!==activeCompany)return;
   childrenCache.set(key,{items:data.items||[],hasMore:data.hasMore});
  }catch(e){if(companyId!==activeCompany)return;childrenCache.set(key,{error:e.name==="AbortError"?"A consulta demorou demais. Feche e abra para tentar novamente.":e.message});}
  render();
 }
 async function loadPerformance(){
  if(performanceCache||performancePending)return performancePending;
  const companyId=activeCompany;
  performancePending=(async()=>{
   try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
    let response;try{response=await fetch("/api/companies/"+encodeURIComponent(companyId)+"/meta-performance?level=ad&period=last_30d",{credentials:"same-origin",cache:"no-store",signal:controller.signal});}finally{clearTimeout(timer);}
    const data=await response.json();if(!response.ok)throw Error(data.error||"Falha na consulta de resultados.");
    if(data.hasMore)throw Error("Resultados parciais: paginação da Meta incompleta.");
    if(companyId===activeCompany)performanceCache={byId:new Map((data.items||[]).map(item=>[String(item.id),item]))};
   }catch(error){if(companyId===activeCompany)performanceCache={error:error.name==="AbortError"?"Tempo limite na consulta de resultados.":error.message};}
   finally{performancePending=null;if(companyId===activeCompany)render();}
  })();return performancePending;
 }
 function detail(parent,level,items,key){
  const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=7;td.className="history-detail";
  const result=childrenCache.get(key);
  if(!result){td.textContent="Carregando "+(level==="adsets"?"conjuntos":"anúncios")+"…";tr.append(td);parent.append(tr);return;}
  if(result.error){td.textContent="Erro: "+result.error;tr.append(td);parent.append(tr);return;}
  if(!result.items.length){td.textContent="Nenhum "+(level==="adsets"?"conjunto":"anúncio")+" encontrado.";tr.append(td);parent.append(tr);return;}
  const table=document.createElement("table");table.className="history-nested";if(level==="ads"&&!performanceCache&&!performancePending)void loadPerformance();
  const thead=document.createElement("thead"),head=document.createElement("tr");
  for(const name of (level==="adsets"?["Conjunto de anúncios","Status","Status efetivo","Orçamento"]:["Anúncio","Status","Status efetivo","Criativo","Resultados · 30 dias","Atualizado em"])){const th=document.createElement("th");th.textContent=name;head.append(th);}thead.append(head);table.append(thead);
  const tbody=document.createElement("tbody");
  for(const item of result.items){
   const row=document.createElement("tr"),name=document.createElement("td");
   if(level==="adsets"){
    const button=document.createElement("button");button.type="button";button.className="history-expand";button.setAttribute("aria-expanded",String(expandedAdsets.has(item.id)));button.textContent=(expandedAdsets.has(item.id)?"▼ ":"▶ ")+(item.name||"Sem nome");button.addEventListener("click",()=>expand("ads",item.id));name.append(button);
   }else{const strong=document.createElement("strong");strong.textContent=item.name||"Sem nome";name.append(strong);}
   const small=document.createElement("small");small.textContent="ID: "+item.id;small.style.display="block";name.append(small);row.append(name);
   cell(row,label(item.status));cell(row,label(item.effectiveStatus));
   cell(row,level==="adsets"?(item.dailyBudget!=null?money(item.dailyBudget)+" / dia":item.lifetimeBudget!=null?money(item.lifetimeBudget)+" total":"—"):(item.creativeName||"—"));
   if(level==="ads"){
    const metric=performanceCache?.byId?.get(String(item.id));
    const resultText=performanceCache?.error?"Indisponível":!performanceCache?"Carregando…":!metric?"Sem dados":metric.conversations!=null?new Intl.NumberFormat("pt-BR").format(metric.conversations)+" conversas":new Intl.NumberFormat("pt-BR").format(metric.linkClicks||0)+" cliques no link";
    cell(row,resultText);cell(row,formatDate(item.updatedAt));
   }
   tbody.append(row);
   if(level==="adsets"&&expandedAdsets.has(item.id))detail(tbody,"ads",null,"ads:"+item.id);
  }
  table.append(tbody);td.append(table);
  if(result.hasMore){const warning=document.createElement("p");warning.textContent="Histórico parcial: limite de paginação atingido.";td.append(warning);}
  tr.append(td);parent.append(tr);
 }
 function render(){
  const q=search.value.trim().toLocaleLowerCase("pt-BR"),st=status.value,obj=objective.value;
  const filtered=items.filter(x=>(!q||(x.name+" "+x.id).toLocaleLowerCase("pt-BR").includes(q))&&(!st||x.status===st||x.effectiveStatus===st)&&(!obj||x.objective===obj));
  filtered.sort((a,b)=>sort.value==="name"?(a.name||"").localeCompare(b.name||"","pt-BR"):sort.value==="budget"?(Number(b.dailyBudget||b.lifetimeBudget||0)-Number(a.dailyBudget||a.lifetimeBudget||0)):sort.value==="oldest"?(Date.parse(a.createdAt||0)-Date.parse(b.createdAt||0)):(Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0)));
  const body=$("history-rows");body.replaceChildren();
  for(const item of filtered){
   const row=document.createElement("tr");
   const name=document.createElement("td");const strong=document.createElement("strong");strong.textContent=item.name||"Sem nome";const small=document.createElement("small");small.textContent="ID: "+item.id;small.style.display="block";const button=document.createElement("button");button.type="button";button.className="history-expand";button.textContent=(expandedCampaigns.has(item.id)?"▼ ":"▶ ")+(item.name||"Sem nome");button.setAttribute("aria-expanded",String(expandedCampaigns.has(item.id)));button.addEventListener("click",()=>expand("adsets",item.id));name.append(button,small);row.append(name);
   cell(row,item.objective);cell(row,label(item.status));cell(row,label(item.effectiveStatus));
   cell(row,item.dailyBudget!=null?money(item.dailyBudget)+" / dia":item.lifetimeBudget!=null?money(item.lifetimeBudget)+" total":"—");
   cell(row,formatDate(item.createdAt));cell(row,formatDate(item.updatedAt));body.append(row);if(expandedCampaigns.has(item.id))detail(body,"adsets",null,"adsets:"+item.id);
  }
  $("history-summary").textContent=loaded?filtered.length+" de "+items.length+" campanhas encontradas"+(filtered.length!==items.length?" com os filtros atuais.":"."):"Carregando histórico…";
  if(loaded&&!filtered.length)$("history-feedback").textContent="Nenhuma campanha corresponde aos filtros.";
 }
 async function load(){
  const id=company.value;if(!id)return;
  const seq=++requestId;activeCompany=id;loaded=false;items=[];expandedCampaigns.clear();expandedAdsets.clear();childrenCache.clear();performanceCache=null;performancePending=null;render();$("history-feedback").textContent="Consultando histórico na Meta…";
  try{
   const response=await fetch("/api/companies/"+encodeURIComponent(id)+"/meta-campaign-history",{credentials:"same-origin",cache:"no-store"});
   const data=await response.json();if(seq!==requestId||company.value!==id)return;
   if(!response.ok)throw Error(data.error||"Falha ao consultar campanhas.");
   items=data.items||[];loaded=true;
   const previous=objective.value;objective.replaceChildren();const all=document.createElement("option");all.value="";all.textContent="Todos os objetivos";objective.append(all);
   for(const value of [...new Set(items.map(x=>x.objective).filter(Boolean))].sort()){const option=document.createElement("option");option.value=value;option.textContent=value;objective.append(option);}
   objective.value=previous;
   render();
   $("history-feedback").textContent=data.hasMore?"A Meta retornou um histórico parcial (limite de paginação atingido).":"Histórico consultado. Campanhas removidas permanentemente podem não estar disponíveis.";
  }catch(error){if(seq!==requestId)return;loaded=true;render();$("history-feedback").textContent="Erro ao carregar histórico: "+error.message;}
 }
 for(const el of [search,status,objective,sort])el.addEventListener(el===search?"input":"change",render);
 $("history-refresh").addEventListener("click",load);
 company.addEventListener("change",load);
 // app.js populates the company select asynchronously, without dispatching change.
 const ready=setInterval(()=>{if(company.value&&company.value!==activeCompany){clearInterval(ready);load();}},200);
 setTimeout(()=>clearInterval(ready),20000);
})();
