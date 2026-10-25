
// META04.1: criação somente após confirmação explícita do operador.
const createForm=document.querySelector("#meta-create-form");
const createFeedback=document.querySelector("#meta-create-feedback");
const createButton=document.querySelector("#meta-create-button");
const objectiveSelect=document.querySelector("#meta-create-objective");
const objectiveHint=document.querySelector("#meta-objective-hint");
objectiveSelect.addEventListener("change",()=>{objectiveHint.textContent=objectiveSelect.value==="OUTCOME_ENGAGEMENT"?"Inicie conversas no WhatsApp. A configuração do conjunto e do anúncio para WhatsApp será disponibilizada na próxima etapa; esta opção cria somente a campanha pausada.":"Leve visitantes ao site da clínica.";});
createForm.addEventListener("submit",async(event)=>{
  event.preventDefault();
  const name=document.querySelector("#meta-create-name").value.trim();
  const objective=objectiveSelect.value;
  if(!select.value||!name||!["OUTCOME_TRAFFIC","OUTCOME_ENGAGEMENT"].includes(objective))return;
  const accepted=window.confirm("Criar na Meta a campanha '"+name+"' com objetivo "+(objective==="OUTCOME_ENGAGEMENT"?"Engajamento (WhatsApp)":"Tráfego (site)")+" e status PAUSADA? Nenhum anúncio será veiculado.");
  if(!accepted)return;
  createButton.disabled=true;
  createFeedback.textContent="Enviando solicitação à Meta…";
  try{
    const response=await fetch("/api/companies/"+encodeURIComponent(select.value)+"/meta-create-campaign",{
      method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","Idempotency-Key":crypto.randomUUID()},
      body:JSON.stringify({name,objective,confirm:true})
    });
    const data=await response.json();
    if(!response.ok){
      const diagnostic=[
        data.error||"Não foi possível criar.",
        data.metaErrorCode!=null?"Código Meta: "+data.metaErrorCode:null,
        data.metaErrorSubcode!=null?"Subcódigo: "+data.metaErrorSubcode:null,
        data.metaErrorDetail?"Detalhe: "+data.metaErrorDetail:null,
        data.metaTraceId?"Referência Meta: "+data.metaTraceId:null,
        data.uncertain?"ATENÇÃO: resultado incerto. Verifique a lista antes de tentar novamente.":null
      ].filter(Boolean).join(" | ");
      throw Error(diagnostic);
    }
    createFeedback.textContent="Campanha criada e pausada! ID Meta: "+data.id+". Atualize a lista para conferir.";
    await load();
    if(typeof refreshAdsetCampaigns==="function")await refreshAdsetCampaigns();
  }catch(error){createFeedback.textContent=error.message;}
  finally{createButton.disabled=false;}
});
