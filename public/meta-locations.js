(function(){
 const input=document.querySelector("#adset-location-search"),results=document.querySelector("#adset-location-results"),selected=document.querySelector("#adset-selected-locations"),map=document.querySelector("#adset-location-map");
 if(!input||!results||!selected)return;
 const chosen=new Map();let timer,sequence=0;
 window.getAdsetLocations=()=>Array.from(chosen.values()).map(({resolving,error,...x})=>({...x}));
 function changed(){document.querySelector("#adset-preview-form")?.dispatchEvent(new Event("input",{bubbles:true}));}
 function coords(item){return Number.isFinite(item.latitude)&&Number.isFinite(item.longitude);}
 function drawMap(){
  if(!map)return;
  const points=[...chosen.values()].filter(coords);
  if(!points.length){map.hidden=true;map.replaceChildren();return;}
  const point=points[points.length-1],lat=point.latitude,lon=point.longitude;
  const delta=Math.max(.018,(point.mode==="radius"?point.radiusKm:3)/80);
  const url=new URL("https://www.openstreetmap.org/export/embed.html");
  url.searchParams.set("bbox",[lon-delta,lat-delta,lon+delta,lat+delta].join(","));
  url.searchParams.set("layer","mapnik");url.searchParams.set("marker",lat+","+lon);
  map.replaceChildren();
  const heading=document.createElement("strong");heading.textContent="Prévia do mapa — "+point.name;
  const frame=document.createElement("iframe");frame.title="Mapa de "+point.name;frame.loading="lazy";frame.referrerPolicy="no-referrer";frame.src=url.toString();frame.style.cssText="width:100%;height:250px;border:0;border-radius:10px;margin-top:8px";
  const note=document.createElement("small");note.textContent="Marcador do centro da localização. O mapa é ilustrativo: não representa o alcance exato nem desenha o círculo de segmentação. © OpenStreetMap contributors.";
  map.append(heading,frame,note);map.hidden=false;
 }
 async function resolve(item,key){
  if(coords(item)){item.mode="radius";render();changed();return;}
  item.resolving=true;render();
  try{
   const company=document.querySelector("#meta-company")?.value;
   const city=document.querySelector("#adset-location-city")?.value.trim();
   if(!city)throw Error("Informe a cidade de referência para localizar o bairro.");
   const qs=new URLSearchParams({name:item.name,city,state:item.region||"São Paulo"});
   const response=await fetch("/api/companies/"+encodeURIComponent(company)+"/meta-location-center?"+qs,{credentials:"same-origin"});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"Falha ao consultar mapa.");
   if(chosen.get(key)!==item)return;
   if(data.found){item.latitude=data.latitude;item.longitude=data.longitude;item.mode="radius";item.source=data.source;item.error="";}
   else{item.mode="native";item.error=data.message||"Centro não localizado.";}
  }catch(e){item.mode="native";item.error=e.message;}
  finally{item.resolving=false;if(chosen.get(key)===item){render();changed();}}
 }
 function render(){
  selected.replaceChildren();
  for(const [key,item] of chosen){
   const row=document.createElement("div");row.className="adset-location-row";
   const title=document.createElement("strong");title.textContent=item.name+(item.region?", "+item.region:"");
   const mode=document.createElement("select");mode.setAttribute("aria-label","Tipo de segmentação para "+item.name);
   const radiusMode=document.createElement("option");radiusMode.value="radius";radiusMode.textContent="📍 Raio personalizado";
   const nativeMode=document.createElement("option");nativeMode.value="native";nativeMode.textContent="Bairro inteiro (Meta)";
   if(item.type==="city"){nativeMode.disabled=true;nativeMode.textContent="Cidade (Meta)";}
   if(item.type==="region"){radiusMode.disabled=true;nativeMode.textContent="Região inteira (Meta)";}
   mode.append(radiusMode,nativeMode);mode.value=item.mode;
   mode.disabled=item.resolving;
   mode.addEventListener("change",()=>{if(mode.value==="radius"&&!coords(item)&&item.type!=="city"){resolve(item,key);return;}item.mode=mode.value;render();changed();});
   const radius=document.createElement("select");radius.setAttribute("aria-label","Raio para "+item.name);
   for(const km of [3,5,10,15,20]){const option=document.createElement("option");option.value=km;option.textContent=km+" km";radius.append(option);}
   radius.value=String(item.radiusKm);radius.disabled=item.mode!=="radius"||item.resolving;
   radius.addEventListener("change",()=>{item.radiusKm=Number(radius.value);drawMap();changed();});
   const remove=document.createElement("button");remove.type="button";remove.className="secondary";remove.textContent="Remover";remove.addEventListener("click",()=>{chosen.delete(key);render();changed();});
   row.append(title,mode,radius,remove);
   if(item.resolving||item.error){const msg=document.createElement("small");msg.className="adset-location-message";msg.textContent=item.resolving?"Localizando centro do bairro…":item.error;row.append(msg);}
   selected.append(row);
  }
  drawMap();
 }
 input.addEventListener("input",()=>{clearTimeout(timer);const q=input.value.trim(),seq=++sequence;results.replaceChildren();if(q.length<2)return;
  timer=setTimeout(async()=>{try{
   const company=document.querySelector("#meta-company")?.value;if(!company){results.textContent="Selecione uma clínica.";return;}
   const response=await fetch("/api/companies/"+encodeURIComponent(company)+"/meta-locations?q="+encodeURIComponent(q),{credentials:"same-origin"});
   const data=await response.json();if(seq!==sequence)return;if(!response.ok)throw Error(data.error||"Falha na busca");
   results.replaceChildren();
   for(const item of data.items||[]){
    if(!item.key||!["city","region","neighborhood","subcity"].includes(item.type)||chosen.has(item.key))continue;
    const button=document.createElement("button");button.type="button";button.className="secondary";button.textContent="+ "+item.name+(item.region?", "+item.region:"");
    button.addEventListener("click",()=>{
     if(chosen.size>=10){results.textContent="Limite de 10 localidades.";return;}
     const location={key:item.key,type:item.type,name:item.name,region:item.region,radiusKm:3,latitude:item.latitude,longitude:item.longitude,mode:item.type==="region"?"native":"radius",resolving:false,error:""};
     chosen.set(item.key,location);button.remove();
     if(["neighborhood","subcity"].includes(item.type)&&!coords(location))resolve(location,item.key);
     else{render();changed();}
    });results.append(button);
   }
   if(!results.children.length)results.textContent="Nenhuma localidade disponível para esta busca.";
  }catch(e){if(seq===sequence)results.textContent=e.message;}},350);
 });
 document.querySelector("#meta-company")?.addEventListener("change",()=>{chosen.clear();render();results.replaceChildren();input.value="";changed();});
 document.querySelector("#adset-location-city")?.addEventListener("change",()=>{for(const [key,item] of chosen){if(["neighborhood","subcity"].includes(item.type)){item.latitude=null;item.longitude=null;item.mode="native";item.error="Cidade de referência alterada. Selecione raio personalizado para localizar novamente.";}}render();changed();});
})();