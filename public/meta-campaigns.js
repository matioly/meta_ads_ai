const select=document.querySelector("#meta-company");
const feedback=document.querySelector("#feedback");
const tbody=document.querySelector("#campaigns");
const note=document.querySelector("#pagination-note");
const refresh=document.querySelector("#refresh");
const headers=document.querySelector("#headers");
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const types={campaigns:["Campanha","Objetivo","Status","Orçamento diário","Orçamento total","Data de criação"],adsets:["Conjunto","Campanha (ID)","Status","Região","Orçamento diário","Programação","Data de criação"],ads:["Anúncio","Conjunto (ID)","Status","Criativo","Prévia","Data de criação"]};
const statuses={ACTIVE:"Ativa",PAUSED:"Pausada",DELETED:"Excluída",ARCHIVED:"Arquivada",IN_PROCESS:"Em processamento",WITH_ISSUES:"Com problemas",PENDING_REVIEW:"Em análise",DISAPPROVED:"Reprovada",PREAPPROVED:"Pré-aprovada",CAMPAIGN_PAUSED:"Campanha pausada",ADSET_PAUSED:"Conjunto pausado",PENDING_BILLING_INFO:"Pagamento pendente"};
const objectives={OUTCOME_ENGAGEMENT:"Engajamento",OUTCOME_AWARENESS:"Reconhecimento",OUTCOME_TRAFFIC:"Tráfego",OUTCOME_LEADS:"Cadastros",OUTCOME_SALES:"Vendas",OUTCOME_APP_PROMOTION:"Promoção de aplicativo"};
let type="campaigns",currency="BRL",requestId=0;
function td(row,value){const c=document.createElement("td");c.textContent=value==null?"—":String(value);row.append(c);return c;}
function budget(value){if(value==null)return "Não informado neste nível";if(currency!=="BRL")return value+" (centésimos em "+currency+")";return money.format(Number(value)/100);}
function createdAt(value){if(!value)return "Não informado";const d=new Date(value);return Number.isNaN(d.getTime())?"Não informado":new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(d);}
function date(value){if(!value)return "Não informado";const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleDateString("pt-BR");}
async function get(url){const r=await fetch(url,{credentials:"same-origin",cache:"no-store"});if(r.status===401){location.replace("/login");throw Error("Sessão expirada.");}const data=await r.json();if(!r.ok)throw Error(data.error||"Falha na consulta.");return data;}
function setHeaders(){headers.replaceChildren();for(const label of types[type]){const th=document.createElement("th");th.textContent=label;headers.append(th);}document.querySelector("#table-caption").textContent=({campaigns:"Campanhas",adsets:"Conjuntos de anúncios",ads:"Anúncios"})[type]+" da Meta";document.querySelectorAll("[data-type]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.type===type)));}
async function load(){if(!select.value)return;const current=++requestId;const currentType=type;refresh.disabled=true;select.disabled=true;tbody.replaceChildren();note.textContent="";feedback.textContent="Consultando a Meta…";setHeaders();
try{const base="/api/companies/"+encodeURIComponent(select.value);const [account,result]=await Promise.all([get(base+"/meta-connection"),get(base+"/meta-campaigns?type="+currentType)]);if(current!==requestId)return;currency=account.account?.currency||"BRL";
for(const item of result.items){const row=document.createElement("tr");td(row,item.name);if(currentType==="campaigns"){td(row,objectives[item.objective]||item.objective);td(row,statuses[item.effectiveStatus]||item.effectiveStatus||item.status);td(row,budget(item.dailyBudget));td(row,budget(item.lifetimeBudget));}
else if(currentType==="adsets"){td(row,item.campaignId);td(row,statuses[item.effectiveStatus]||item.effectiveStatus||item.status);td(row,[...(item.countries||[]),...(item.cities||[])].join(", ")||"Não informado");td(row,budget(item.dailyBudget));td(row,date(item.startTime)+" → "+date(item.endTime));}
else{td(row,item.adsetId);td(row,statuses[item.effectiveStatus]||item.effectiveStatus||item.status);td(row,item.creativeName||item.creativeId||"Não informado");const c=td(row,"");if(item.thumbnailUrl){const a=document.createElement("a");a.href=item.thumbnailUrl;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Abrir imagem";c.append(a);}else c.textContent="Sem prévia";}
td(row,createdAt(item.createdTime||item.created_time));tbody.append(row);}
feedback.textContent=result.items.length+" registro(s) em "+({campaigns:"campanhas",adsets:"conjuntos",ads:"anúncios"})[currentType]+" · "+(account.account?.name||"Conta Meta");
if(result.hasMore)note.textContent="Existem mais de 100 registros. A paginação será implementada posteriormente.";
}catch(e){if(current===requestId)feedback.textContent=e.message;}finally{if(current===requestId){refresh.disabled=false;select.disabled=false;}}}
refresh.addEventListener("click",load);select.addEventListener("change",load);
document.querySelectorAll("[data-type]").forEach(button=>button.addEventListener("click",()=>{if(button.dataset.type===type)return;type=button.dataset.type;load();}));
(async()=>{try{const profile=await get("/api/me");select.replaceChildren();for(const company of profile.companies){const option=document.createElement("option");option.value=company.id;option.textContent=company.name;select.append(option);}const alps=profile.companies.find(c=>c.name.toLowerCase().includes("alps"));if(alps)select.value=alps.id;if(!select.value){feedback.textContent="Nenhuma clínica vinculada.";return;}select.dispatchEvent(new Event("meta-company-ready"));await load();}catch(e){feedback.textContent=e.message;}})();

const periodSelect=document.querySelector("#insights-period");
const sinceInput=document.querySelector("#insights-since");
const untilInput=document.querySelector("#insights-until");
const insightsFeedback=document.querySelector("#insights-feedback");
const insightsRefresh=document.querySelector("#insights-refresh");
const numberFormat=new Intl.NumberFormat("pt-BR");
let insightsRequestId=0;
function resetInsights(){for(const id of ["spend","reach","impressions","clicks","link-clicks","cpc","conversations"])document.querySelector("#insights-"+id).textContent="—";}
periodSelect.addEventListener("change",()=>{const custom=periodSelect.value==="custom";sinceInput.disabled=!custom;untilInput.disabled=!custom;});
async function loadInsights(){
  if(!select.value)return;
  const current=++insightsRequestId;
  insightsRefresh.disabled=true;
  resetInsights();
  insightsFeedback.textContent="Consultando resultados…";
  try{
    const params=new URLSearchParams({period:periodSelect.value});
    if(periodSelect.value==="custom"){if(!sinceInput.value||!untilInput.value)throw Error("Escolha as duas datas.");params.set("since",sinceInput.value);params.set("until",untilInput.value);}
    const base="/api/companies/"+encodeURIComponent(select.value);
    const [account,result]=await Promise.all([get(base+"/meta-connection"),get(base+"/meta-insights?"+params)]);
    if(current!==insightsRequestId)return;
    const curr=account.account?.currency||"BRL";
    const moneyFormat=new Intl.NumberFormat("pt-BR",{style:"currency",currency:curr});
    const set=(id,value)=>document.querySelector("#insights-"+id).textContent=value;
    set("spend",moneyFormat.format(result.spend));
    set("reach",numberFormat.format(result.reach));
    set("impressions",numberFormat.format(result.impressions));
    set("clicks",numberFormat.format(result.clicks));
    set("link-clicks",numberFormat.format(result.linkClicks));
    set("cpc",result.cpc===null?"—":moneyFormat.format(result.cpc));
    set("conversations",result.messagingConversationsStarted===null?"Não disponível":numberFormat.format(result.messagingConversationsStarted));
    insightsFeedback.textContent=(result.hasData?"Dados carregados":"Nenhum registro retornado")+" · "+(result.dates?result.dates.since+" a "+result.dates.until:"Período selecionado")+" · Fonte: "+result.source;
  }catch(error){if(current===insightsRequestId)insightsFeedback.textContent=error.message;}
  finally{if(current===insightsRequestId)insightsRefresh.disabled=false;}
}
insightsRefresh.addEventListener("click",loadInsights);
select.addEventListener("change",()=>{resetInsights();loadInsights();});
window.addEventListener("load",()=>{if(select.value)loadInsights();});
