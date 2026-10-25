// Two explicit confirmation gates. Never sends ACTIVE to Meta.
(function(){
 const $=id=>document.getElementById(id);
 const saved=$("creative-saved"),company=$("meta-company"),status=$("meta-video-status");
 const upload=$("meta-video-upload"),create=$("meta-ad-create");
 const diagnosticButton=document.createElement("button");
 diagnosticButton.type="button";
 diagnosticButton.className=create.className;
 diagnosticButton.textContent="Conferir campos do 5B (sem criar)";
 create.before(diagnosticButton);
 status.style.whiteSpace="pre-line";
 function diagnosticText(d){
  if(!d||!Array.isArray(d.checks))return "";
  return ["Campanha: "+d.campaignId+" | Conjunto: "+d.adsetId,
   ...d.checks.map(c=>(c.ok?"OK":"AJUSTAR")+" — "+c.label+": "+(c.actual??"não informado")+"; esperado: "+c.expected),
   d.compatible?"Configuração de campanha/conjunto compatível. Isso não valida vídeo, Página ou criativo.":"Corrija os campos marcados AJUSTAR e confira os vínculos salvos na etapa 3."
  ].join("\n");
 }
 let busy=false;
 function selected(){return saved.value;}
 function refresh(){
  const id=selected();
  upload.disabled=busy||!id;create.disabled=busy||!id;diagnosticButton.disabled=busy||!id;
  if(!id){status.textContent="Selecione um rascunho salvo na etapa 3.";return;}
  if(!busy)status.textContent="Rascunho selecionado. O envio é manual e a criação do anúncio será sempre PAUSADA. Se o vídeo já foi enviado, use 5B.";
 }
 async function action(kind){
  const id=selected(),cid=company.value;
  if(!id||!cid||busy){refresh();return;}
  const readOnly=kind==="meta-ad-diagnostic";
  const question=kind==="meta-video"?
   "Enviar o vídeo deste rascunho para a biblioteca de vídeos da Meta? O vídeo será armazenado na Meta, mas nenhum anúncio será ativado.":
   "Criar um anúncio PAUSADO na Meta usando o vídeo, campanha, público e texto deste rascunho? Nenhum anúncio será ativado.";
  if(!readOnly&&!confirm(question))return;
  busy=true;upload.disabled=true;create.disabled=true;diagnosticButton.disabled=true;status.textContent="Processando na Meta. Aguarde; não clique novamente.";
  try{
   const r=await fetch("/api/companies/"+encodeURIComponent(cid)+"/creative-drafts/"+encodeURIComponent(id)+"/"+kind,{
    method:readOnly?"GET":"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},...(readOnly?{}:{body:JSON.stringify({confirm:true})})
   });
   const ct=r.headers.get("content-type")||"";
   if(!ct.includes("application/json"))throw Error("Resposta inesperada. Confira a Meta antes de tentar novamente.");
   const data=await r.json();
   if(!r.ok)throw Error([data.error,data.metaErrorDetail,diagnosticText(data.diagnostic)].filter(Boolean).join("\n"));
   if(readOnly){status.textContent=diagnosticText(data.diagnostic);return;}
   if(kind==="meta-video")status.textContent="Vídeo registrado na Meta! ID: "+data.videoId+(data.reused?" (já enviado)":"")+". Agora você pode criar o anúncio pausado.";
   else status.textContent="Anúncio criado na Meta com status PAUSADO! ID: "+data.adId+(data.reused?" (já existente)":"")+". Confira na aba Anúncios.";
  }catch(e){status.textContent="Não foi possível concluir: "+e.message+" Se houver dúvida sobre o resultado, confira a Meta antes de repetir.";}
  finally{busy=false;upload.disabled=!selected();create.disabled=!selected();diagnosticButton.disabled=!selected();}
 }
 saved.addEventListener("change",refresh);
 company.addEventListener("change",()=>{status.textContent="Selecione um rascunho da clínica.";refresh();});
 diagnosticButton.addEventListener("click",()=>action("meta-ad-diagnostic"));
 upload.addEventListener("click",()=>action("meta-video"));
 create.addEventListener("click",()=>action("meta-paused-ad"));
 refresh();
})();
