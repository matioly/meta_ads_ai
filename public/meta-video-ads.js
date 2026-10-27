// Publishing controls driven by server-side video readiness. All writes remain PAUSED.
(function(){
 const $=id=>document.getElementById(id);
 const company=$("meta-company"),status=$("meta-video-status"),upload=$("meta-video-upload"),create=$("meta-ad-create"),publish=$("meta-publish-draft");
 status.style.whiteSpace="pre-line";
 let mediaKind="video",busy=false,state="loading",timer=null,requestId=0,creationOutcome=null;
 const selected=()=>publish.value;
 const logs=[];
 function trace(event,details={}){
  logs.push({time:new Date().toLocaleTimeString("pt-BR"),event,...details});
  if(logs.length>25)logs.shift();

 }
 const url=(id,kind)=>"/api/companies/"+encodeURIComponent(company.value)+"/creative-drafts/"+encodeURIComponent(id)+"/"+kind;
 function buttons(){
  const valid=Boolean(selected()&&company.value);
  upload.disabled=busy||!valid||state!=="not_uploaded";
  create.disabled=busy||!valid||state!=="ready";
 }
 function label(data){
  if(data.state==="not_uploaded")return mediaKind==="image"?"Imagem ainda não enviada. Envie para a Meta antes de criar o anúncio.":"Vídeo ainda não enviado. Envie para a Meta antes de criar o anúncio.";
  if(data.state==="processing")return "Vídeo enviado (ID: "+data.videoId+"). A Meta está processando a capa. Verificando automaticamente…";
  if(data.state==="ready")return mediaKind==="image"?"Imagem pronta. Você já pode criar o anúncio pausado.":"Vídeo pronto (ID: "+data.videoId+"). Você já pode criar o anúncio pausado.";
  if(data.state==="ad_created")return "Anúncio já criado na Meta com status PAUSADO! ID: "+data.adId+". Não é necessário criar novamente.";
  return "Consultando o estado do vídeo…";
 }
 async function refresh(){
  clearTimeout(timer);const seq=++requestId,id=selected(),cid=company.value;
  state="loading";buttons();
  if(!id||!cid){status.textContent="Selecione um anúncio preparado para continuar.";return;}
  status.textContent="Verificando o vídeo na Meta…";
  try{
   const r=await fetch(url(id,"meta-video-status"),{credentials:"same-origin",cache:"no-store"});
   const data=await r.json();
   if(seq!==requestId)return;
   if(!r.ok)throw Error(data.error||"Não foi possível verificar o vídeo.");
   mediaKind=data.mediaKind||"video";upload.textContent=mediaKind==="image"?"Enviar imagem à Meta":"Enviar vídeo à Meta";state=data.state;trace("status",{http:r.status,state:data.state,videoId:data.videoId,adId:data.adId});
   if(state==="ad_created"){creationOutcome=null;status.textContent=label(data);}
   else if(creationOutcome){status.textContent=creationOutcome+" Estado atual na Meta: "+label(data);}
   else status.textContent=label(data);
   buttons();
   if(state==="processing")timer=setTimeout(refresh,10000);
  }catch(e){
   if(seq!==requestId)return;
   state="error";status.textContent=e.message+" Atualize a seleção para tentar novamente.";buttons();
  }
 }
 async function action(kind){
  const id=selected(),cid=company.value;
  if(!id||!cid||busy||((kind==="meta-video"||kind==="meta-image")&&state!=="not_uploaded")||(kind==="meta-paused-ad"&&state!=="ready"))return;
  const question=kind==="meta-video"||kind==="meta-image"?
   "Enviar esta mídia para a Meta? Nenhum anúncio será ativado.":
   "Criar anúncio PAUSADO na Meta? Nenhum anúncio será ativado.";
  if(!confirm(question))return;
  trace("POST iniciado",{operation:kind,draftId:id,state});busy=true;creationOutcome=null;buttons();status.textContent="Processando na Meta. Aguarde; não clique novamente.";
  try{
   const r=await fetch(url(id,kind),{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirm:true})});
   const ct=r.headers.get("content-type")||"";
   if(!ct.includes("application/json"))throw Error("Resposta inesperada. Confira a Meta antes de repetir.");
   const data=await r.json();
   trace("POST resposta",{operation:kind,http:r.status,ok:r.ok,error:data.error,metaErrorDetail:data.metaErrorDetail,adId:data.adId,code:data.code});
   if(!r.ok)throw Error([data.error,data.metaErrorDetail].filter(Boolean).join("\n"));
   creationOutcome=(kind==="meta-video"||kind==="meta-image")?"Mídia enviada. Verificando processamento…":data.adId?"Meta confirmou a criação do anúncio PAUSADO (ID: "+data.adId+").":"A solicitação foi aceita, mas não retornou ID do anúncio. Confira a Meta antes de repetir.";
   status.textContent=creationOutcome;
  }catch(e){trace("POST falhou",{operation:kind,message:e.message});creationOutcome="Não foi possível confirmar a operação: "+e.message+". Confira a Meta antes de repetir.";status.textContent=creationOutcome;}
  finally{busy=false;await refresh();}
 }
 publish.addEventListener("change",()=>{creationOutcome=null;refresh();});
 company.addEventListener("change",()=>{creationOutcome=null;refresh();});
 upload.addEventListener("click",()=>action(mediaKind==="image"?"meta-image":"meta-video"));
 create.addEventListener("click",()=>action("meta-paused-ad"));
 refresh();
})();
