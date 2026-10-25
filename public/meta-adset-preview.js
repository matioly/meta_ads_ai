// META04.2A is read-only. Never send a request to create an ad set.
const adsetForm=document.querySelector("#adset-preview-form");
const adsetCampaign=document.querySelector("#adset-campaign");
const adsetFeedback=document.querySelector("#adset-preview-feedback");
const adsetResult=document.querySelector("#adset-preview-result");
const adsetButton=document.querySelector("#adset-preview-button");
let approvedAdsetPreview=null;
function resetAdsetApproval(){approvedAdsetPreview=null;document.querySelector("#adset-create-actions").hidden=true;}
for(const element of adsetForm.querySelectorAll("input,select"))element.addEventListener("input",resetAdsetApproval);
async function refreshAdsetCampaigns(){
  resetAdsetApproval();
  adsetCampaign.replaceChildren();
  adsetResult.textContent="";
  adsetFeedback.textContent="";
  if(!select.value)return;
  try{
    const r=await fetch("/api/companies/"+encodeURIComponent(select.value)+"/meta-campaigns?type=campaigns",{credentials:"same-origin"});
    const data=await r.json();
    if(!r.ok)throw Error(data.error||"Falha ao consultar campanhas.");
    const paused=(data.items||[]).filter(c=>c.status==="PAUSED");
    const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="Escolha uma campanha";adsetCampaign.append(placeholder);
    for(const campaign of paused){const option=document.createElement("option");option.value=campaign.id;option.textContent=campaign.name+" · "+campaign.id;adsetCampaign.append(option);}
    adsetFeedback.textContent=paused.length?"Escolha uma campanha para conferir o público e orçamento.":"Nenhuma campanha pausada disponível para configurar.";
  }catch(e){adsetFeedback.textContent=e.message;}
}
adsetForm.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!adsetCampaign.value)return;
  resetAdsetApproval();
  adsetButton.disabled=true;adsetResult.textContent="";adsetFeedback.textContent="Conferindo informações…";
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
    adsetFeedback.textContent="";
    approvedAdsetPreview={companyId:select.value,campaignId:data.campaignId,name:data.name,ageMin:data.targeting.age_min,ageMax:data.targeting.age_max,dailyBudgetBrl:data.dailyBudgetBrl};
    document.querySelector("#adset-create-actions").hidden=true;
    document.querySelector("#adset-create-button").click();
    adsetResult.textContent=[
      "Campanha escolhida: "+adsetCampaign.selectedOptions[0].textContent,"Nome do público: "+data.name,"Situação: ainda não criado",
       "Localização inicial: Brasil","Faixa etária: "+data.targeting.age_min+"–"+data.targeting.age_max,
       "Investimento diário planejado: "+new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(data.dailyBudgetBrl),
      "Antes de criar anúncios, ainda precisamos:",...data.pending.map(p=>"• "+p)
    ].join("\n");
  }catch(e){adsetFeedback.textContent=e.message;}finally{adsetButton.disabled=false;}
});
select.addEventListener("change",refreshAdsetCampaigns);
select.addEventListener("meta-company-ready",refreshAdsetCampaigns);
