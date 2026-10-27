// Manual radius targeting: a confirmed pin is required before submitting.
(function(){
 const meta=document.querySelector("#adset-mode-meta"),manual=document.querySelector("#adset-mode-manual");
 const metaFields=document.querySelector("#adset-meta-location-fields"),manualFields=document.querySelector("#adset-manual-location-fields");
 const coords=document.querySelector("#adset-manual-coordinates"),feedback=document.querySelector("#adset-manual-feedback");
 const km=document.querySelector("#adset-manual-km"),confirm=document.querySelector("#adset-manual-confirm");
 if(!meta||!manual||!window.getAdsetLocations)return;
 const original=window.getAdsetLocations;let active=false,map,marker,circle,pin=null,confirmed=null;
 function notify(){document.querySelector("#adset-preview-form")?.dispatchEvent(new Event("input",{bubbles:true}));}
 function draw(latlng){
  pin={latitude:Number(latlng.lat.toFixed(6)),longitude:Number(latlng.lng.toFixed(6))};
  if(marker)marker.setLatLng(latlng);else marker=L.marker(latlng,{draggable:true}).addTo(map).on("dragend",()=>draw(marker.getLatLng()));
  if(circle)circle.setLatLng(latlng).setRadius(Number(km.value)*1000);
  else circle=L.circle(latlng,{radius:Number(km.value)*1000,color:"#6746c8",fillOpacity:0.12}).addTo(map);
  coords.textContent="Centro: "+pin.latitude.toFixed(6)+", "+pin.longitude.toFixed(6);
  confirmed=null;confirm.disabled=false;feedback.textContent="Confirme este ponto para utilizá-lo no público.";notify();
 }
 function init(){
  if(map)return;
  if(typeof L==="undefined"){feedback.textContent="Não foi possível carregar o mapa interativo. Tente atualizar a página.";return;}
  map=L.map("adset-manual-map").setView([-22.9056,-47.0608],11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  map.on("click",e=>draw(e.latlng));
 }
 function setMode(value){
  active=value==="manual";metaFields.hidden=active;manualFields.hidden=!active;
  meta.className=active?"secondary":"primary";manual.className=active?"primary":"secondary";
  meta.setAttribute("aria-pressed",String(!active));manual.setAttribute("aria-pressed",String(active));
  if(active){init();setTimeout(()=>map?.invalidateSize(),60);}
  notify();
 }
 meta.addEventListener("click",()=>setMode("meta"));manual.addEventListener("click",()=>setMode("manual"));
 km.addEventListener("change",()=>{if(pin&&map)draw(L.latLng(pin.latitude,pin.longitude));});
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
