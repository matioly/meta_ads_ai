const createButton=document.querySelector("#adset-create-button");
const createFeedback=document.querySelector("#adset-create-feedback");
createButton.addEventListener("click",async()=>{
 const plan=approvedAdsetPreview;
 if(!plan||plan.companyId!==select.value)return;
 if(!confirm("Criar público "+plan.name+" na Meta, com orçamento diário de R$ "+plan.dailyBudgetBrl.toFixed(2)+"? Ele ficará PAUSADO, sem anúncios."))return;
 createButton.disabled=true;
 createFeedback.textContent="Criando público pausado…";
 try{
  const response=await fetch("/api/companies/"+encodeURIComponent(plan.companyId)+"/meta-create-adset",{
   method:"POST",credentials:"same-origin",
   headers:{"Content-Type":"application/json","Idempotency-Key":crypto.randomUUID()},
   body:JSON.stringify({...plan,confirm:true})
  });
  const data=await response.json();
  if(!response.ok)throw Error([data.error,data.metaErrorCode?"Código "+data.metaErrorCode:null,data.metaErrorSubcode?"Subcódigo "+data.metaErrorSubcode:null,data.metaErrorDetail].filter(Boolean).join(" | "));
  approvedAdsetPreview=null;
  createButton.disabled=true;
  adsetFeedback.textContent="Público criado e pausado! ID Meta: "+data.id;
  document.querySelector("#adset-create-actions").hidden=true;
  await load();
 }catch(error){createFeedback.textContent=error.message;}
 finally{createButton.disabled=false;}
});
