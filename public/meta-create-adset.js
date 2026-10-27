// META04.2B: explicit user confirmation, visible status and no automatic retries.
(function(){
 const button=document.querySelector("#adset-create-button");
 const status=document.querySelector("#adset-create-feedback");
 if(!button||!status)return;
 async function submitApprovedAdset(){
  status.textContent="Conferindo os dados…";
  try{
   const plan=approvedAdsetPreview;
   if(!plan||plan.companyId!==select.value){
    status.textContent="As informações mudaram. Tente criar o público novamente.";
    return;
   }
   const value=Number(plan.dailyBudgetBrl);
   if(!Number.isFinite(value))throw Error("Orçamento inválido. Confira o valor informado.");
   status.textContent="Aguardando sua confirmação…";
   const locationSummary=plan.locations.map(location=>location.name+" · "+location.radiusKm+" km").join("; ");
   const confirmationMessage=[
    "Confirma criar o público '"+plan.name+"' na Meta?",
    "Idades: "+plan.ageMin+" a "+plan.ageMax+" anos",
    "Localização: "+locationSummary,
    "Gênero: "+plan.gender,
    "Orçamento diário: R$ "+value.toFixed(2),
    "",
    "O conjunto ficará PAUSADO. Nenhum anúncio será veiculado."
   ].join("\n");
   const approved=window.confirm(confirmationMessage);
   if(!approved){status.textContent="Operação cancelada. Nada foi enviado à Meta.";return;}
   button.disabled=true;
   status.textContent="Enviando solicitação à Meta. Aguarde…";
   const key=window.crypto&&typeof window.crypto.randomUUID==="function"?window.crypto.randomUUID():null;
   if(!key)throw Error("Navegador sem suporte à identificação segura da solicitação. Atualize o navegador.");
   const response=await fetch("/api/companies/"+encodeURIComponent(plan.companyId)+"/meta-create-adset",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","Idempotency-Key":key},
    body:JSON.stringify({...plan,confirm:true})
   });
   const data=await response.json();
   if(!response.ok){
    throw Error([data.error,data.metaErrorCode?"Código Meta: "+data.metaErrorCode:null,data.metaErrorSubcode?"Subcódigo: "+data.metaErrorSubcode:null,data.metaErrorDetail].filter(Boolean).join(" | ")||"Erro ao criar público.");
   }
   approvedAdsetPreview=null;
   document.querySelector("#adset-create-actions").hidden=true;
   adsetFeedback.textContent="Público criado com sucesso e mantido pausado na Meta.";
   status.textContent="";
   window.dispatchEvent(new Event("meta-adset-created"));
   adsetResult.textContent=adsetResult.textContent.replace("Situação: ainda não criado","Situação: criado e pausado na Meta · ID: "+data.id).replace("Antes de criar anúncios, ainda precisamos:","Próxima etapa: preparar o vídeo e o texto do anúncio.");
   if(typeof window.load==="function")await window.load();
  }catch(error){
   status.textContent="Não foi possível concluir: "+(error.message||"Erro desconhecido")+". Confira os públicos na Meta antes de tentar novamente.";
  }finally{button.disabled=false;}
 }
 window.submitApprovedAdset=submitApprovedAdset;
 button.addEventListener("click",submitApprovedAdset);
})();
