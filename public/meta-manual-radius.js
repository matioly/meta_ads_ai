// OpenFreeMap vector basemap, MapLibre interaction, confirmed radius for Meta targeting.
(function(){
 const meta=document.querySelector("#adset-mode-meta"),manual=document.querySelector("#adset-mode-manual");
 const metaFields=document.querySelector("#adset-meta-location-fields"),manualFields=document.querySelector("#adset-manual-location-fields");
 const coords=document.querySelector("#adset-manual-coordinates"),feedback=document.querySelector("#adset-manual-feedback");
 const km=document.querySelector("#adset-manual-km"),confirm=document.querySelector("#adset-manual-confirm");
 if(!meta||!manual||!window.getAdsetLocations)return;
 const original=window.getAdsetLocations;let active=false,map,marker,pin=null,confirmed=null;
 const circleSource="custom-radius-circle";
 function notify(){document.querySelector("#adset-preview-form")?.dispatchEvent(new Event("input",{bubbles:true}));}
 function circleGeo(){
  if(!pin)return {type:"FeatureCollection",features:[]};
  const radius=Number(km.value),lat=pin.latitude,lon=pin.longitude,pts=[];
  for(let i=0;i<=96;i++){
   const angle=i*2*Math.PI/96;
   const dLat=(radius/111.32)*Math.cos(angle);
   const dLon=(radius/(111.32*Math.max(.01,Math.cos(lat*Math.PI/180))))*Math.sin(angle);
   pts.push([lon+dLon,lat+dLat]);
  }
  return {type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"Polygon",coordinates:[pts]},properties:{}}]};
 }
 function updateCircle(){
  if(!map||!map.isStyleLoaded())return;
  const source=map.getSource(circleSource);
  if(source)source.setData(circleGeo());
 }
 function setPin(lngLat){
  const latitude=Number(lngLat.lat.toFixed(6)),longitude=Number(lngLat.lng.toFixed(6));
  pin={latitude,longitude};
  if(marker)marker.setLngLat([longitude,latitude]);
  else marker=new maplibregl.Marker({draggable:true,color:"#6746c8"}).setLngLat([longitude,latitude]).addTo(map).on("dragend",()=>setPin(marker.getLngLat()));
  coords.textContent="Centro: "+latitude.toFixed(6)+", "+longitude.toFixed(6);
  confirmed=null;confirm.disabled=false;feedback.textContent="Confirme este ponto para utilizá-lo no público.";
  updateCircle();notify();
 }
 function init(){
  if(map)return;
  if(typeof maplibregl==="undefined"){feedback.textContent="Não foi possível carregar a biblioteca do mapa. Atualize a página.";return;}
  map=new maplibregl.Map({container:"adset-manual-map",style:"https://tiles.openfreemap.org/styles/liberty",center:[-47.0608,-22.9056],zoom:11,attributionControl:true});
  map.addControl(new maplibregl.NavigationControl(),"top-right");
  map.on("load",()=>{
   map.addSource(circleSource,{type:"geojson",data:circleGeo()});
   map.addLayer({id:"custom-radius-fill",type:"fill",source:circleSource,paint:{"fill-color":"#6746c8","fill-opacity":0.14}});
   map.addLayer({id:"custom-radius-outline",type:"line",source:circleSource,paint:{"line-color":"#6746c8","line-width":2}});
   updateCircle();
  });
  map.on("error",e=>{if(e.error)feedback.textContent="Não foi possível carregar parte do mapa. Verifique a conexão e tente novamente.";});
  map.on("click",e=>setPin(e.lngLat));
 }
 function setMode(value){
  active=value==="manual";metaFields.hidden=active;manualFields.hidden=!active;
  meta.className=active?"secondary":"primary";manual.className=active?"primary":"secondary";
  meta.setAttribute("aria-pressed",String(!active));manual.setAttribute("aria-pressed",String(active));
  if(active){init();setTimeout(()=>map?.resize(),80);}
  notify();
 }
 meta.addEventListener("click",()=>setMode("meta"));manual.addEventListener("click",()=>setMode("manual"));
 km.addEventListener("change",()=>{confirmed=null;confirm.disabled=!pin;updateCircle();feedback.textContent=pin?"Confirme novamente o raio atualizado.":"";notify();});
 confirm.addEventListener("click",()=>{
  if(!pin)return;
  confirmed={...pin,radiusKm:Number(km.value)};
  confirm.disabled=true;feedback.textContent="✓ Raio confirmado. O conjunto será criado pausado após sua confirmação na Meta.";notify();
 });
 window.getAdsetLocations=()=>{
  if(!active)return original();
  if(!confirmed)return [];
  const {latitude,longitude,radiusKm}=confirmed;
  return [{key:"pin:"+latitude+":"+longitude,type:"custom",name:"Ponto personalizado ("+latitude.toFixed(5)+", "+longitude.toFixed(5)+")",region:"",latitude,longitude,radiusKm,mode:"radius"}];
 };
 document.querySelector("#meta-company")?.addEventListener("change",()=>{confirmed=null;confirm.disabled=!pin;feedback.textContent="";notify();});
})();
