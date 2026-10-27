(function(){
 const input=document.querySelector("#adset-location-search"),results=document.querySelector("#adset-location-results"),selected=document.querySelector("#adset-selected-locations");
 if(!input||!results||!selected)return;
 const chosen=new Map();let timer,sequence=0;
 window.getAdsetLocations=()=>Array.from(chosen.values()).map(x=>({...x}));
 function changed(){document.querySelector("#adset-preview-form")?.dispatchEvent(new Event("input",{bubbles:true}));}
 function render(){selected.replaceChildren();for(const [key,item] of chosen){
 const row=document.createElement("div");row.style.cssText="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0";
 const label=document.createElement("span");label.textContent=item.name+(item.region?", "+item.region:"")+(item.type==="custom"?" (pino)":"");
 const radius=document.createElement("select");radius.setAttribute("aria-label","Raio para "+item.name);
 for(const km of [3,5,10,15,20]){const option=document.createElement("option");option.value=km;option.textContent=km+" km";radius.append(option);}
 radius.value=String(item.radiusKm);radius.disabled=item.type==="region"||((item.type==="neighborhood"||item.type==="subcity")&&!Number.isFinite(Number(item.latitude)))||((item.type==="neighborhood"||item.type==="subcity")&&!Number.isFinite(Number(item.longitude)));radius.title=radius.disabled?"Esta localidade não possui coordenadas para configurar um raio":"Raio em quilômetros";radius.addEventListener("change",()=>{item.radiusKm=Number(radius.value);changed();});
 const remove=document.createElement("button");remove.type="button";remove.className="secondary";remove.textContent="Remover";remove.addEventListener("click",()=>{chosen.delete(key);render();changed();});
 row.append(label,radius,remove);selected.append(row);
 }}
 input.addEventListener("input",()=>{clearTimeout(timer);const q=input.value.trim(),seq=++sequence;results.replaceChildren();if(q.length<2)return;
 timer=setTimeout(async()=>{try{const company=document.querySelector("#meta-company")?.value;if(!company){results.textContent="Selecione uma clínica.";return;}
 const response=await fetch("/api/companies/"+encodeURIComponent(company)+"/meta-locations?q="+encodeURIComponent(q),{credentials:"same-origin"});
 const data=await response.json();if(seq!==sequence)return;if(!response.ok)throw Error(data.error||"Falha na busca");
 results.replaceChildren();for(const item of data.items||[]){if(!item.key||!["city","region","neighborhood","subcity"].includes(item.type))continue;const key=item.key;if(chosen.has(key))continue;
 const button=document.createElement("button");button.type="button";button.className="secondary";button.style.margin="4px";button.textContent="+ "+item.name+(item.region?", "+item.region:"");
 button.addEventListener("click",()=>{if(chosen.size>=10){results.textContent="Limite de 10 localidades.";return;}chosen.set(key,{key:item.key,type:item.type,name:item.name,latitude:item.latitude,longitude:item.longitude,radiusKm:3,region:item.region});render();button.remove();changed();});results.append(button);}
 if(!results.children.length)results.textContent="Nenhuma localidade disponível para esta busca.";
 }catch(e){if(seq===sequence)results.textContent=e.message;}},350);
 });
 document.querySelector("#meta-company")?.addEventListener("change",()=>{chosen.clear();render();results.replaceChildren();input.value="";changed();});
})();