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
   root.append(el("h3","Diagnóstico competitivo"),el("p",a.summary));
   root.append(el("h3","Padrões identificados"));
   for(const p of a.patterns||[])root.append(card(p.theme,[["Evidência",p.evidence],["Interpretação",p.interpretation]]));
   root.append(el("h3","Oportunidades para a clínica"));
   for(const p of a.opportunities||[])root.append(el("p","• "+p));
   root.append(el("h3","Roteiros originais para gravar"));
   for(const s of a.scripts||[])root.append(card((s.duration||"")+" — "+(s.title||"Roteiro"),[["Abertura",s.hook],["Desenvolvimento",s.body],["Chamada para ação",s.cta]]));
   root.append(el("h3","Ideias de anúncios"));
   for(const c of a.campaigns||[])root.append(card(c.title,[["Texto principal",c.primaryText],["Título",c.headline],["CTA",c.cta]]));
   root.append(el("h3","Cuidados antes de publicar"));
   for(const caution of a.cautions||[])root.append(el("p","• "+caution));
   status.textContent="Análise concluída. Revise os roteiros e alegações clínicas antes de publicar.";
  }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
 });
})();
