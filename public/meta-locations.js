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
 radius.value=String(item.radiusKm);radius.disabled=item.type==="neighborhood"||item.type==="subcity"||item.type==="region";radius.title=radius.disabled?"Área definida pela Meta":"Raio em quilômetros";radius.addEventListener("change",()=>{item.radiusKm=Number(radius.value);changed();});
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
const addPin=document.querySelector("#adset-add-pin");
 addPin?.addEventListener("click",()=>{
 const name=String(document.querySelector("#adset-pin-name")?.value||"").trim();
 const latitude=Number(document.querySelector("#adset-pin-lat")?.value),longitude=Number(document.querySelector("#adset-pin-lng")?.value);
 if(!name||name.length>120||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180||!document.querySelector("#adset-pin-lat")?.value||!document.querySelector("#adset-pin-lng")?.value){results.textContent="Informe nome, latitude e longitude válidos para o pino.";return;}
 if(chosen.size>=10){results.textContent="Limite de 10 localidades.";return;}
 const key="pin:"+latitude+":"+longitude;chosen.set(key,{key,type:"custom",name,latitude,longitude,radiusKm:3});render();results.textContent="Pino adicionado. Ajuste o raio abaixo.";changed();
 });
})();