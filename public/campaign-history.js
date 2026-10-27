// Read-only campaign history, independent of draft planning and overview metrics.
(function(){
 const $=id=>document.getElementById(id);
 if(!$("history-rows"))return;
 const company=$("company"),search=$("history-search"),status=$("history-status"),objective=$("history-objective"),sort=$("history-sort");
 let items=[],activeCompany="",requestId=0,loaded=false;
 const formatDate=value=>{if(!value)return "—";const d=new Date(value);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("pt-BR",{dateStyle:"short"}).format(d);};
 const money=value=>value==null?"—":new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(value)/100);
 const statusLabels={ACTIVE:"Ativa",PAUSED:"Pausada",ARCHIVED:"Arquivada",DELETED:"Excluída",CAMPAIGN_PAUSED:"Campanha pausada",ADSET_PAUSED:"Conjunto pausado",WITH_ISSUES:"Com problemas",IN_PROCESS:"Em processamento",PENDING_REVIEW:"Em análise",DISAPPROVED:"Reprovada"};
 const label=value=>statusLabels[value]||value||"—";
 function cell(row,value){const td=document.createElement("td");td.textContent=String(value??"—");row.append(td);}
 function render(){
  const q=search.value.trim().toLocaleLowerCase("pt-BR"),st=status.value,obj=objective.value;
  const filtered=items.filter(x=>(!q||(x.name+" "+x.id).toLocaleLowerCase("pt-BR").includes(q))&&(!st||x.status===st||x.effectiveStatus===st)&&(!obj||x.objective===obj));
  filtered.sort((a,b)=>sort.value==="name"?(a.name||"").localeCompare(b.name||"","pt-BR"):sort.value==="budget"?(Number(b.dailyBudget||b.lifetimeBudget||0)-Number(a.dailyBudget||a.lifetimeBudget||0)):sort.value==="oldest"?(Date.parse(a.createdAt||0)-Date.parse(b.createdAt||0)):(Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0)));
  const body=$("history-rows");body.replaceChildren();
  for(const item of filtered){
   const row=document.createElement("tr");
   const name=document.createElement("td");const strong=document.createElement("strong");strong.textContent=item.name||"Sem nome";const small=document.createElement("small");small.textContent="ID: "+item.id;small.style.display="block";name.append(strong,small);row.append(name);
   cell(row,item.objective);cell(row,label(item.status));cell(row,label(item.effectiveStatus));
   cell(row,item.dailyBudget!=null?money(item.dailyBudget)+" / dia":item.lifetimeBudget!=null?money(item.lifetimeBudget)+" total":"—");
   cell(row,formatDate(item.createdAt));cell(row,formatDate(item.updatedAt));body.append(row);
  }
  $("history-summary").textContent=loaded?filtered.length+" de "+items.length+" campanhas encontradas"+(filtered.length!==items.length?" com os filtros atuais.":"."):"Carregando histórico…";
  if(loaded&&!filtered.length)$("history-feedback").textContent="Nenhuma campanha corresponde aos filtros.";
 }
 async function load(){
  const id=company.value;if(!id)return;
  const seq=++requestId;activeCompany=id;loaded=false;items=[];render();$("history-feedback").textContent="Consultando histórico na Meta…";
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
