// Planejamento local de criativo: sem persistência ou envio à Meta.
(function(){
  const form=document.querySelector("#creative-plan-form");
  const mediaSelect=document.querySelector("#creative-media");
  const feedback=document.querySelector("#creative-feedback");
  const preview=document.querySelector("#creative-preview");
  let videos=[];
  let companyId="";
  async function refreshVideos(){
    companyId=select.value;
    preview.hidden=true;
    videos=[];
    mediaSelect.replaceChildren();
    const placeholder=document.createElement("option");
    placeholder.value="";placeholder.textContent="Selecione um vídeo";mediaSelect.append(placeholder);
    if(!companyId)return;
    feedback.textContent="Carregando biblioteca…";
    try{
      const r=await fetch("/api/companies/"+encodeURIComponent(companyId)+"/media",{credentials:"same-origin",cache:"no-store"});
      const data=await r.json();
      if(!r.ok)throw Error(data.error||"Não foi possível carregar a biblioteca.");
      if(companyId!==select.value)return;
      videos=(data.media||[]).filter(m=>m.kind==="video"||m.kind==="VIDEO");
      for(const m of videos){
        const option=document.createElement("option");option.value=String(m.id);
        option.textContent=m.name+" · "+(m.accountLabel||m.accountEmail||"Conta não informada");
        mediaSelect.append(option);
      }
      feedback.textContent=videos.length?"Selecione um vídeo e confira a prévia.":"Nenhum vídeo cadastrado. Adicione um na biblioteca de mídias.";
    }catch(e){feedback.textContent=e.message;}
  }
  form.addEventListener("input",()=>{preview.hidden=true;});
  form.addEventListener("submit",event=>{
    event.preventDefault();
    if(companyId!==select.value){feedback.textContent="A clínica mudou. Recarregue a biblioteca.";return;}
    const media=videos.find(m=>String(m.id)===mediaSelect.value);
    const headline=document.querySelector("#creative-headline").value.trim();
    const text=document.querySelector("#creative-primary-text").value.trim();
    const description=document.querySelector("#creative-description").value.trim();
    if(!media||!headline||!text){feedback.textContent="Selecione um vídeo e preencha título e texto.";return;}
    let link;
    try{link=new URL(media.url);if(!["https:","http:"].includes(link.protocol))throw Error("invalid");}
    catch{feedback.textContent="O link do vídeo é inválido.";return;}
    document.querySelector("#creative-preview-headline").textContent=headline;
    document.querySelector("#creative-preview-text").textContent=text;
    document.querySelector("#creative-preview-description").textContent=description;
    document.querySelector("#creative-preview-media").textContent="Vídeo: "+media.name+" · Conta: "+(media.accountLabel||media.accountEmail||"Não informada");
    const anchor=document.querySelector("#creative-preview-link");anchor.href=link.href;
    preview.hidden=false;
    feedback.textContent="Prévia pronta. Nenhum anúncio foi criado ou enviado à Meta; as informações não são salvas ao sair desta página.";
  });
  select.addEventListener("change",refreshVideos);
  select.addEventListener("meta-company-ready",refreshVideos);
})();