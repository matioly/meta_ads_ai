
// META04.1: criação somente após confirmação explícita do operador.
const createForm=document.querySelector("#meta-create-form");
const createFeedback=document.querySelector("#meta-create-feedback");
const createButton=document.querySelector("#meta-create-button");
createForm.addEventListener("submit",async(event)=>{
  event.preventDefault();
  const name=document.querySelector("#meta-create-name").value.trim();
  if(!select.value||!name)return;
  const accepted=window.confirm("Criar na Meta a campanha '"+name+"' com objetivo Engajamento e status PAUSADA? Nenhum anúncio será veiculado.");
  if(!accepted)return;
  createButton.disabled=true;
  createFeedback.textContent="Enviando solicitação à Meta…";
  try{
    const response=await fetch("/api/companies/"+encodeURIComponent(select.value)+"/meta-create-campaign",{
      method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","Idempotency-Key":crypto.randomUUID()},
      body:JSON.stringify({name,objective:"OUTCOME_ENGAGEMENT",confirm:true})
    });
    const data=await response.json();
    if(!response.ok)throw Error(data.error||"Não foi possível criar.");
    createFeedback.textContent="Campanha criada e pausada! ID Meta: "+data.id+". Atualize a lista para conferir.";
    await load();
  }catch(error){createFeedback.textContent=error.message;}
  finally{createButton.disabled=false;}
});
