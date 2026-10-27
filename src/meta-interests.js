const express=require("express");
const access=require("./company-access");
const pool=require("./db");
const router=express.Router();
router.get("/:companyId/meta-interests",access,async(req,res,next)=>{
 try{
  const q=String(req.query.q||"").trim();
  if(q.length<2||q.length>80)return res.status(400).json({error:"Digite de 2 a 80 caracteres."});
  const token=process.env.META_ACCESS_TOKEN;
  if(!token)return res.status(503).json({error:"Meta não configurada."});
  const {rows}=await pool.query("SELECT ad_account_id FROM meta_assets WHERE company_id=$1",[req.params.companyId]);
  if(!/^\d{1,30}$/.test(String(rows[0]?.ad_account_id||"")))return res.status(422).json({error:"Conta Meta não configurada."});
  const version=/^v\d+\.\d+$/.test(process.env.META_API_VERSION||"")?process.env.META_API_VERSION:"v24.0";
  const url=new URL("https://graph.facebook.com/"+version+"/search");
  url.searchParams.set("type","adinterest");url.searchParams.set("q",q);url.searchParams.set("limit","15");
  const response=await fetch(url,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(12000)});
  const data=await response.json();
  if(!response.ok)return res.status(502).json({error:"A Meta não disponibilizou a pesquisa de interesses."});
  res.json({items:(Array.isArray(data.data)?data.data:[]).filter(x=>/^\d+$/.test(String(x.id))&&typeof x.name==="string").map(x=>({id:String(x.id),name:x.name}))});
 }catch(e){if(["TimeoutError","AbortError"].includes(e.name))return res.status(504).json({error:"Pesquisa de interesses demorou demais."});next(e);}
});
router.get("/:companyId/meta-locations",access,async(req,res,next)=>{try{
 const q=String(req.query.q||"").trim();if(q.length<2||q.length>80)return res.status(400).json({error:"Digite de 2 a 80 caracteres."});
 const token=process.env.META_ACCESS_TOKEN;if(!token)return res.status(503).json({error:"Meta não configurada."});
 const {rows}=await pool.query("SELECT ad_account_id FROM meta_assets WHERE company_id=$1",[req.params.companyId]);
 if(!/^[0-9]{1,30}$/.test(String(rows[0]?.ad_account_id||"")))return res.status(422).json({error:"Conta Meta não configurada."});
 const version=/^v[0-9]+[.][0-9]+$/.test(process.env.META_API_VERSION||"")?process.env.META_API_VERSION:"v24.0";
 const url=new URL("https://graph.facebook.com/"+version+"/search");
 url.searchParams.set("type","adgeolocation");url.searchParams.set("q",q);url.searchParams.set("country_code","BR");
 url.searchParams.set("location_types",JSON.stringify(["city","region","neighborhood","subcity"]));url.searchParams.set("limit","25");
 const response=await fetch(url,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(12000)});
 const data=await response.json();if(!response.ok)return res.status(502).json({error:"A Meta não disponibilizou a pesquisa de localidades."});
 res.json({items:(Array.isArray(data.data)?data.data:[]).filter(x=>typeof x.name==="string"&&x.key).map(x=>({key:String(x.key),name:x.name,region:x.region||"",country:x.country_name||"Brasil",type:x.type||"",latitude:Number.isFinite(Number(x.latitude))&&x.latitude!=null?Number(x.latitude):null,longitude:Number.isFinite(Number(x.longitude))&&x.longitude!=null?Number(x.longitude):null}))});
 }catch(e){if(["TimeoutError","AbortError"].includes(e.name))return res.status(504).json({error:"Pesquisa de localidades demorou demais."});next(e);}
});

const geoCache=new Map();
let lastGeoRequest=0;
router.get("/:companyId/meta-location-center",access,async(req,res,next)=>{
 try{
  const name=String(req.query.name||"").trim(),city=String(req.query.city||"").trim(),state=String(req.query.state||"São Paulo").replace(/\s*\([^)]*\)/g,"").trim();
  if(!name||name.length>100||city.length<2||city.length>80||state.length>80)return res.status(400).json({error:"Informe o bairro e a cidade para localizar o centro."});
  const cacheKey=[name,city,state].map(x=>x.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR")).join("|");
  const cached=geoCache.get(cacheKey);
  if(cached&&cached.until>Date.now())return res.json(cached.value);
  // Nominatim usage policy: at most one request per second, identified User-Agent and cache.
  if(Date.now()-lastGeoRequest<1100)return res.status(429).json({error:"Aguarde um segundo e tente localizar novamente."});
  lastGeoRequest=Date.now();
  const url=new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q",[name,city,state,"Brasil"].filter(Boolean).join(", "));
  url.searchParams.set("format","jsonv2");url.searchParams.set("addressdetails","1");url.searchParams.set("limit","5");url.searchParams.set("countrycodes","br");
  const response=await fetch(url,{headers:{"User-Agent":"MetaAdsAI/1.0 (business location geocoding; contact: "+(process.env.GEOCODER_CONTACT_EMAIL||process.env.APP_URL||"MetaAdsAI")+")","Accept-Language":"pt-BR"},signal:AbortSignal.timeout(10000)});
  if(!response.ok)return res.status(502).json({error:"Serviço de mapas indisponível no momento."});
  const candidates=await response.json();
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const match=(Array.isArray(candidates)?candidates:[]).find(x=>{
    const a=x.address||{};
    const names=[a.suburb,a.neighbourhood,a.quarter,a.residential,a.city_district,a.hamlet,x.name].filter(Boolean);
    const cities=[a.city,a.town,a.municipality,a.village,a.county].filter(Boolean);
    const cityMatches=cities.some(v=>norm(v)===norm(city))||norm(x.display_name).split(",").map(v=>v.trim()).includes(norm(city));
    const states=[a.state,a.region].filter(Boolean);
    const stateMatches=!states.length||states.some(v=>norm(v)===norm(state)||norm(state)==="sp"&&norm(v)==="sao paulo");
    return cityMatches&&stateMatches&&names.some(v=>norm(v)===norm(name))&&Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lon));
  });
  const value=match?{found:true,latitude:Number(match.lat),longitude:Number(match.lon),source:"OpenStreetMap / Nominatim",displayName:match.display_name}:{found:false,message:"Não encontramos coordenadas confiáveis para esse bairro em "+city+". O bairro inteiro da Meta permanece disponível; o raio personalizado exige um centro confirmado."};
  geoCache.set(cacheKey,{value,until:Date.now()+(match?7*86400000:3600000)});
  if(geoCache.size>500)geoCache.delete(geoCache.keys().next().value);
  res.json(value);
 }catch(e){if(["TimeoutError","AbortError"].includes(e.name))return res.status(504).json({error:"A consulta ao mapa demorou demais."});next(e);}
});
module.exports=router;