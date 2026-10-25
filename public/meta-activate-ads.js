(function(){
 const $=id=>document.getElementById(id),company=$("meta-company"),refresh=$("activate-refresh"),list=$("activate-list"),feedback=$("activate-feedback"),submit=$("activate-submit"),result=$("activate-result");
 let busy=false,seq=0,items=[];
 const base=()=>"/api/companies/"+encodeURIComponent(company.value);
 function selected(){return [...list.querySelectorAll("input[type=checkbox]:checked")].map(el=>el.value);}
 function draw(){
  list.replaceChildren();
  for(const a of items){
   const row=document.createElement("label");row.style.cssText="display:block;padding:10px;border-bottom:1px solid #ddd";
   const box=document.createElement("input");box.type="checkbox";box.value=a.id;box.disabled=!a.eligible||busy;box.addEventListener("change",()=>submit.disabled=busy||!selected().length);
   row.append(box,document.createTextNode(" "+a.name+" · "+a.campaign+" · "+a.adset+" · "+(a.eligible?"Pronto para ativar":"Campanha/conjunto indisponíveis")));
   list.append(row);
  }
  submit.disabled=busy||!selected().length;
 }
 async function load(){
  const n=++seq;items=[];busy=true;refresh.disabled=true;submit.disabled=true;list.replaceChildren();feedback.textContent="Consultando anúncios pausados…";
  try{
   if(!company.value){feedback.textContent="Selecione uma clínica.";return;}
   const r=await fetch(base()+"/meta-paused-ads",{credentials:"same-origin",cache:"no-store"});const data=await r.json();if(n!==seq)return;
   if(!r.ok)throw Error(data.error||"Falha na consulta.");
   items=data.items||[];feedback.textContent=items.length+" anúncio(s) pausado(s)."+(data.hasMore?" A lista mostra apenas os primeiros 100; consulte a Meta para os demais.":"");
  }catch(e){if(n===seq)feedback.textContent=e.message;}finally{if(n===seq){busy=false;refresh.disabled=false;draw();}}
 }
 submit.addEventListener("click",async()=>{
  const ids=selected();if(!ids.length||busy)return;
  const names=items.filter(a=>ids.includes(a.id)).map(a=>a.name);
  if(!window.confirm("ATENÇÃO: serão ativados os anúncios selecionados e suas campanhas/conjuntos pausados. Outros anúncios vinculados podem começar a gastar imediatamente.\n\nAtivar "+ids.length+" anúncio(s)?\n\n"+names.join("\n")+"\n\nConfirma a ativação?"))return;
  busy=true;refresh.disabled=true;draw();result.textContent="Ativando anúncios, aguarde…";
  const outcomes=[];
  for(const id of ids){
   try{
    const r=await fetch(base()+"/meta-activate-ad",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:id,confirm:true})});
    const data=await r.json();outcomes.push(id+": "+(r.ok?"Ativação enviada à Meta":data.error||"Falha"));
   }catch(e){outcomes.push(id+": resposta incerta. Verifique na Meta antes de tentar novamente.");}
  }
  result.textContent=outcomes.join("\n");result.style.whiteSpace="pre-line";busy=false;await load();
 });
 refresh.addEventListener("click",load);company.addEventListener("change",()=>{++seq;items=[];list.replaceChildren();submit.disabled=true;feedback.textContent="Abra a seção para consultar anúncios.";});
 $("workflow-activate").addEventListener("toggle",()=>{if($("workflow-activate").open)load();});
 window.addEventListener("meta-adset-created",()=>{if($("workflow-activate").open)load();});
})();
