// Two explicit confirmation gates. Never sends ACTIVE to Meta.
(function(){
 const $=id=>document.getElementById(id);
 const saved=$("creative-saved"),company=$("meta-company"),status=$("meta-video-status");
 const upload=$("meta-video-upload"),create=$("meta-ad-create");
 const publish=$("meta-publish-draft");
 status.style.whiteSpace="pre-line";
 let busy=false;
 function selected(){return publish.value;}
 function refresh(){
  const id=selected();
  upload.disabled=busy||!id;create.disabled=busy||!id;
  if(!id){status.textContent="Selecione um anúncio preparado acima para continuar.";return;}
  if(!busy)status.textContent="Anúncio selecionado. Envie o vídeo e depois crie o anúncio pausado.";
 }
 async function action(kind){
  const id=selected(),cid=company.value;
  if(!id||!cid||busy){refresh();return;}
  const readOnly=false;
  const question=kind==="meta-video"?
   "Enviar o vídeo deste rascunho para a biblioteca de vídeos da Meta? O vídeo será armazenado na Meta, mas nenhum anúncio será ativado.":
   "Criar um anúncio PAUSADO na Meta usando o vídeo, campanha, público e texto deste rascunho? Nenhum anúncio será ativado.";
  if(!readOnly&&!confirm(question))return;
  busy=true;upload.disabled=true;create.disabled=true;status.textContent="Processando na Meta. Aguarde; não clique novamente.";
  try{
   const r=await fetch("/api/companies/"+encodeURIComponent(cid)+"/creative-drafts/"+encodeURIComponent(id)+"/"+kind,{
    method:readOnly?"GET":"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},...(readOnly?{}:{body:JSON.stringify({confirm:true})})
   });
   const ct=r.headers.get("content-type")||"";
   if(!ct.includes("application/json"))throw Error("Resposta inesperada. Confira a Meta antes de tentar novamente.");
   const data=await r.json();
   if(!r.ok)throw Error([data.error,data.metaErrorDetail].filter(Boolean).join("\n"));
   
   if(kind==="meta-video")status.textContent="Vídeo registrado na Meta! ID: "+data.videoId+(data.reused?" (já enviado)":"")+". Agora você pode criar o anúncio pausado.";
   else status.textContent="Anúncio criado na Meta com status PAUSADO! ID: "+data.adId+(data.reused?" (já existente)":"")+". Confira na aba Anúncios.";
  }catch(e){status.textContent="Não foi possível concluir: "+e.message+" Se houver dúvida sobre o resultado, confira a Meta antes de repetir.";}
  finally{busy=false;refresh();}
 }
 publish.addEventListener("change",refresh);
 company.addEventListener("change",()=>{status.textContent="Selecione um rascunho da clínica.";refresh();});
 upload.addEventListener("click",()=>action("meta-video"));
 create.addEventListener("click",()=>action("meta-paused-ad"));
 refresh();
})();
