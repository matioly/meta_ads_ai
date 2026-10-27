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
 url.searchParams.set("location_types",JSON.stringify(["city","region"]));url.searchParams.set("limit","25");
 const response=await fetch(url,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(12000)});
 const data=await response.json();if(!response.ok)return res.status(502).json({error:"A Meta não disponibilizou a pesquisa de localidades."});
 res.json({items:(Array.isArray(data.data)?data.data:[]).filter(x=>typeof x.name==="string"&&x.key).map(x=>({key:String(x.key),name:x.name,region:x.region||"",country:x.country_name||"Brasil",type:x.type||"",latitude:Number(x.latitude),longitude:Number(x.longitude)}))});
 }catch(e){if(["TimeoutError","AbortError"].includes(e.name))return res.status(504).json({error:"Pesquisa de localidades demorou demais."});next(e);}
});
module.exports=router;