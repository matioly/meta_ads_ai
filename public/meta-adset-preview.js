// META04.2A is read-only. Never send a request to create an ad set.
const adsetForm=document.querySelector("#adset-preview-form");
const adsetCampaign=document.querySelector("#adset-campaign");
const adsetFeedback=document.querySelector("#adset-preview-feedback");
const adsetResult=document.querySelector("#adset-preview-result");
const adsetButton=document.querySelector("#adset-preview-button");
async function refreshAdsetCampaigns(){
  adsetCampaign.replaceChildren();
  adsetResult.textContent="";
  if(!select.value)return;
  try{
    const r=await fetch("/api/companies/"+encodeURIComponent(select.value)+"/meta-campaigns?type=campaigns",{credentials:"same-origin"});
    const data=await r.json();
    if(!r.ok)throw Error(data.error||"Falha ao consultar campanhas.");
    const paused=(data.items||[]).filter(c=>c.status==="PAUSED");
    const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="Selecione uma campanha pausada";adsetCampaign.append(placeholder);
    for(const campaign of paused){const option=document.createElement("option");option.value=campaign.id;option.textContent=campaign.name+" · "+campaign.id;adsetCampaign.append(option);}
    adsetFeedback.textContent=paused.length?"Escolha uma campanha pausada para simular.":"Nenhuma campanha pausada disponível.";
  }catch(e){adsetFeedback.textContent=e.message;}
}
adsetForm.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!adsetCampaign.value)return;
  adsetButton.disabled=true;adsetResult.textContent="";adsetFeedback.textContent="Validando plano…";
  try{
    const r=await fetch("/api/companies/"+encodeURIComponent(select.value)+"/meta-adset-preview",{
      method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({campaignId:adsetCampaign.value,name:document.querySelector("#adset-name").value.trim(),
        ageMin:Number(document.querySelector("#adset-age-min").value),
        ageMax:Number(document.querySelector("#adset-age-max").value),
        dailyBudgetBrl:Number(document.querySelector("#adset-budget").value)})
    });
    const data=await r.json();
    if(!r.ok)throw Error(data.error||"Não foi possível validar.");
    adsetFeedback.textContent="Plano validado. Nenhum conjunto foi criado.";
    adsetResult.textContent=[
      "Campanha: "+data.campaignId,"Conjunto: "+data.name,"Status futuro: PAUSADA",
      "Região: Brasil","Idades: "+data.targeting.age_min+"–"+data.targeting.age_max,
      "Orçamento diário planejado: "+new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(data.dailyBudgetBrl),
      "Pendente para META04.2B:",...data.pending.map(p=>"• "+p)
    ].join("\n");
  }catch(e){adsetFeedback.textContent=e.message;}finally{adsetButton.disabled=false;}
});
select.addEventListener("change",refreshAdsetCampaigns);
window.addEventListener("load",refreshAdsetCampaigns);
