const express=require("express");
const pool=require("./db");
const access=require("./company-access");
const router=express.Router();
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const base="/:companyId/benchmark-competitors/:competitorId/auto-ads";
const actor="apify~facebook-ads-scraper";
const running=new Set();
const short=(value,max=3000)=>String(value??"").slice(0,max);
const get=(obj,...paths)=>{for(const path of paths){const value=path.split(".").reduce((v,k)=>v?.[k],obj);if(value!==undefined&&value!==null&&value!=="")return value;}return null;};
function mapItem(item){
 const id=get(item,"adArchiveId","ad_archive_id","adId","ad_id","id","snapshot.id");
 const page=get(item,"pageName","page_name","page.name","advertiserName","advertiser_name")||"Anunciante";
 const text=get(item,"adText","ad_text","text","body","snapshot.body.text","snapshot.cards.0.body")||"";
 const image=get(item,"imageUrl","image_url","snapshot.images.0.original_image_url","snapshot.images.0.resized_image_url");
 const video=get(item,"videoUrl","video_url","snapshot.videos.0.video_hd_url","snapshot.videos.0.video_sd_url");
 const link=get(item,"adUrl","ad_url","url","link")||(id?"https://www.facebook.com/ads/library/?id="+encodeURIComponent(id):null);
 if(!link||!/^https:\/\/(www\.|m\.)?(facebook|instagram)\.com\//i.test(link))return null;
 const start=get(item,"startDate","start_date","startDateFormatted","start_date_formatted","ad_delivery_start_time");
 return {externalId:short(id,100),pageName:short(page,160),text:short(text,3000),imageUrl:image&&/^https:\/\//.test(image)?short(image,2048):null,videoUrl:video&&/^https:\/\//.test(video)?short(video,2048):null,adUrl:short(link,2048),format:video?"video":image?"image":"unknown",startDate:start?short(start,60):null};
}
router.get(base,access,async(req,res,next)=>{
 if(!uuid.test(req.params.competitorId))return res.status(400).json({error:"Identificador inválido."});
 try{
  const row=await pool.query("SELECT ads,found,search_mode AS \"searchMode\",updated_at AS \"updatedAt\" FROM benchmark_ad_cache WHERE company_id=$1 AND competitor_id=$2",[req.params.companyId,req.params.competitorId]);
  if(!row.rowCount)return res.json({cached:false,ads:[]});
  res.json({cached:true,...row.rows[0],returned:row.rows[0].ads.length});
 }catch(e){next(e);}
});
router.post(base,access,async(req,res,next)=>{
 if(!uuid.test(req.params.competitorId))return res.status(400).json({error:"Identificador inválido."});
 if(!process.env.APIFY_TOKEN)return res.status(503).json({error:"APIFY_TOKEN não configurado no servidor."});
 const key=req.params.companyId+":"+req.params.competitorId;
 if(running.has(key))return res.status(409).json({error:"Já existe uma busca em andamento para este concorrente."});
 try{
  const found=await pool.query("SELECT name,facebook_url,instagram_url FROM benchmark_competitors WHERE company_id=$1 AND id=$2",[req.params.companyId,req.params.competitorId]);
  if(!found.rowCount)return res.status(404).json({error:"Concorrente não encontrado."});
  const c=found.rows[0];
  let searchUrl,searchMode;
  if(c.facebook_url){
   const u=new URL(c.facebook_url);
   if(u.protocol!=="https:"||!["facebook.com","www.facebook.com","m.facebook.com"].includes(u.hostname.toLowerCase()))return res.status(422).json({error:"Página do Facebook inválida."});
   searchUrl=u.toString();searchMode="facebook";
  }else{
   // Instagram profiles are not valid actor start URLs; use a Meta Library keyword search.
   const library=new URL("https://www.facebook.com/ads/library/");
   library.searchParams.set("active_status","active");
   library.searchParams.set("ad_type","all");
   library.searchParams.set("country","BR");
   library.searchParams.set("q",c.name);
   searchUrl=library.toString();searchMode="name";
  }
  running.add(key);
  const response=await fetch("https://api.apify.com/v2/acts/"+actor+"/run-sync-get-dataset-items?format=json&clean=true&timeout=110",{method:"POST",headers:{"Authorization":"Bearer "+process.env.APIFY_TOKEN,"Content-Type":"application/json"},body:JSON.stringify({startUrls:[{url:searchUrl}],resultsLimit:20,activeStatus:"active"}),signal:AbortSignal.timeout(115000)});
  if(!response.ok){const error=await response.text();console.error("Benchmark Apify status",response.status,short(error,250));return res.status(502).json({error:"A busca externa falhou (HTTP "+response.status+"). Confira créditos e configuração na Apify."});}
  const result=await response.json();
  if(!Array.isArray(result))return res.status(502).json({error:"A fonte externa não retornou uma lista de anúncios. Confira a execução na Apify."});
  const ads=result.map(mapItem).filter(Boolean).slice(0,20);
  await pool.query("INSERT INTO benchmark_ad_cache(company_id,competitor_id,ads,found,search_mode,updated_at) VALUES($1,$2,$3::jsonb,$4,$5,NOW()) ON CONFLICT(company_id,competitor_id) DO UPDATE SET ads=EXCLUDED.ads,found=EXCLUDED.found,search_mode=EXCLUDED.search_mode,updated_at=NOW()",[req.params.companyId,req.params.competitorId,JSON.stringify(ads),result.length,searchMode]);
  return res.json({cached:false,updatedAt:new Date().toISOString(),searchMode,ads,found:result.length,returned:ads.length,source:"Apify / Biblioteca pública da Meta",automaticallyImported:false,note:"Resultados públicos da fonte externa; não representam desempenho, investimento ou conversões. Confirme o anunciante antes de usar."});
 }catch(e){if(e.name==="TimeoutError"||e.name==="AbortError")return res.status(504).json({error:"A busca excedeu o tempo limite. Confira a execução na Apify antes de tentar novamente para evitar cobranças duplicadas."});next(e);}
 finally{running.delete(key);}
});
module.exports=router;
