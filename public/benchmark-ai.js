(()=>{
 const $=id=>document.getElementById(id);
 const selected=new Set();let ads=[],competitor=null;
 function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n;}
 function card(title,lines){const box=el("article");box.className="panel benchmark-card";box.append(el("h3",title));for(const [label,value] of lines){if(!value)continue;box.append(el("strong",label),el("p",value));}const copy=el("button","Copiar texto");copy.className="secondary";copy.type="button";copy.onclick=()=>navigator.clipboard.writeText(lines.map(([a,b])=>a+"\n"+b).join("\n\n")).then(()=>{copy.textContent="Copiado ✓";}).catch(()=>{copy.textContent="Não foi possível copiar";});box.append(copy);return box;}
 window.benchmarkAiReset=()=>{selected.clear();ads=[];competitor=null;$("benchmark-ai-lab").hidden=true;$("benchmark-ai-output").replaceChildren();$("benchmark-ai-status").textContent="";};
 window.benchmarkAiLoad=(c,items)=>{
  window.benchmarkAiReset();competitor=c;ads=items;
  $("benchmark-ai-lab").hidden=!items.length;
  const root=$("benchmark-auto-results");
  [...root.querySelectorAll("article")].forEach((node,i)=>{
   const ad=ads[i];if(!ad)return;
   const label=el("label");label.style.cssText="display:flex;align-items:center;gap:8px;font-weight:600;margin:12px 0";
   const check=document.createElement("input");check.type="checkbox";check.setAttribute("aria-label","Selecionar anúncio para análise");
   const id=String(ad.externalId||ad.adUrl);
   check.onchange=()=>{if(check.checked){if(selected.size>=10){check.checked=false;return;}selected.add(id);}else selected.delete(id);};
   label.append(check,el("span","Selecionar para IA"));node.prepend(label);
  });
 };
 $("benchmark-ai-generate").addEventListener("click",async()=>{
  const status=$("benchmark-ai-status"),button=$("benchmark-ai-generate");
  if(!competitor||!selected.size){status.textContent="Selecione pelo menos um anúncio.";return;}
  button.disabled=true;status.textContent="Analisando os anúncios selecionados…";$("benchmark-ai-output").replaceChildren();
  try{
   const path="/api/companies/"+encodeURIComponent($("company").value)+"/benchmark-competitors/"+encodeURIComponent(competitor.id)+"/ai-analysis";
   const r=await fetch(path,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({adIds:[...selected],focus:$("benchmark-ai-focus").value})});
   const data=await r.json();if(!r.ok)throw Error(data.error||"Erro na análise.");
   const a=data.analysis,root=$("benchmark-ai-output");
   const dashboard=el("div");dashboard.className="ai-dashboard";
   function panel(icon,title,subtitle){const section=el("section");section.className="ai-quadrant";const head=el("header");head.className="ai-quadrant-head";head.append(el("span",icon),el("div"));head.lastChild.append(el("h3",title),el("p",subtitle));section.append(head);dashboard.append(section);return section;}
   function item(title,content){const article=el("article");article.className="ai-insight";article.append(el("h4",title),el("p",content));return article;}
   function copyButton(lines){const btn=el("button","📋 Copiar texto");btn.className="secondary ai-copy";btn.type="button";btn.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(lines.filter(Boolean).join("\\n\\n"));btn.textContent="✓ Copiado";setTimeout(()=>btn.textContent="📋 Copiar texto",2200);}catch{btn.textContent="Não foi possível copiar";}});return btn;}
   const strategy=panel("📊","Estratégia da concorrência","O que os anúncios comunicam");
   strategy.append(item("Visão geral",a.summary||"Nenhum resumo disponível."));
   for(const p of a.patterns||[]){const block=el("details");block.className="ai-detail";const summary=el("summary",p.theme||"Padrão observado");block.append(summary,item("Interpretação",p.interpretation||""),item("Evidência",p.evidence||""));strategy.append(block);}
   const opportunities=panel("🎯","Oportunidades para a clínica","Caminhos para diferenciar sua comunicação");
   for(const [i,value] of (a.opportunities||[]).entries()){const block=item(String(i+1).padStart(2,"0"),value);block.classList.add("ai-opportunity");opportunities.append(block);}
   const scripts=panel("🎬","Roteiros para gravar","Ideias originais para vídeos da Pâmela");
   for(const s of a.scripts||[]){const block=el("details");block.className="ai-detail ai-creative";if(s.duration==="30s"||s.duration==="30 segundos")block.open=true;block.append(el("summary",(s.duration||"Vídeo")+" · "+(s.title||"Roteiro")));const body=el("div");body.className="ai-creative-body";body.append(item("Abertura",s.hook||""),item("Desenvolvimento",s.body||""),item("Chamada para ação",s.cta||""),copyButton([s.title,s.hook,s.body,s.cta]));block.append(body);scripts.append(block);}
   const campaigns=panel("📢","Textos de campanhas","Sugestões para adaptar aos anúncios Meta");
   for(const [i,v] of (a.campaigns||[]).entries()){const block=el("details");block.className="ai-detail ai-creative";if(i===0)block.open=true;block.append(el("summary",v.title||"Sugestão "+(i+1)));const body=el("div");body.className="ai-creative-body";body.append(item("Texto principal",v.primaryText||""),item("Título",v.headline||""),item("CTA",v.cta||""),copyButton([v.primaryText,v.headline,v.cta]));block.append(body);campaigns.append(block);}
   root.append(dashboard);
   const cautions=a.cautions||[];
   if(cautions.length){const note=el("details");note.className="ai-safety";note.append(el("summary","⚖️ Cuidados antes de publicar"));for(const v of cautions)note.append(el("p","• "+v));root.append(note);}
   status.textContent="Análise concluída. Revise os roteiros e alegações clínicas antes de publicar.";
  }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
 });
})();
