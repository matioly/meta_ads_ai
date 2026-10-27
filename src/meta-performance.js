const express=require("express");
const pool=require("./db");
const access=require("./company-access");
const router=express.Router();
const levels=new Set(["campaign","adset","ad"]),periods=new Set(["today","last_7d","last_30d"]);
router.get("/:companyId/meta-performance",access,async(req,res,next)=>{
 try{
  const token=process.env.META_ACCESS_TOKEN;
  if(!token)return res.status(503).json({error:"Conexão Meta não configurada."});
  const level=String(req.query.level||"ad"),period=String(req.query.period||"last_30d");
  if(!levels.has(level)||!periods.has(period))return res.status(400).json({error:"Filtros inválidos."});
  const {rows}=await pool.query("SELECT ad_account_id FROM meta_assets WHERE company_id=$1",[req.params.companyId]);
  const id=rows[0]?.ad_account_id;
  if(!id||!/^[0-9]{1,30}$/.test(id))return res.status(422).json({error:"Conta de anúncios não configurada."});
  const version=/^v\d+\.\d+$/.test(process.env.META_API_VERSION||"")?process.env.META_API_VERSION:"v24.0";
  const url=new URL("https://graph.facebook.com/"+version+"/act_"+id+"/insights");
  url.searchParams.set("fields","campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,reach,impressions,inline_link_clicks,actions");
  url.searchParams.set("level",level);url.searchParams.set("date_preset",period);url.searchParams.set("limit","100");
  const items=[];let next=url.toString();
  for(let page=0;page<5&&next;page++){
   const u=new URL(next);if(u.hostname!=="graph.facebook.com"||u.protocol!=="https:")throw Error("Paginação inválida");
   const response=await fetch(u,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(12000)});
   const data=await response.json();
   if(!response.ok)return res.status([10,190,200].includes(Number(data?.error?.code))?403:502).json({error:"Falha ao consultar insights da Meta."});
   if(!Array.isArray(data.data))return res.status(502).json({error:"Resposta inesperada da Meta."});
   items.push(...data.data);next=data.paging?.next||null;
  }
  res.json({level,period,hasMore:!!next,items:items.map(r=>{
   const spend=Number(r.spend||0),impressions=Number(r.impressions||0),linkClicks=Number(r.inline_link_clicks||0);
   const action=(r.actions||[]).find(a=>a.action_type==="onsite_conversion.messaging_conversation_started_7d");
   const conversations=action?Number(action.value):null;
   return {id:r[level+"_id"],name:r[level+"_name"],campaignId:r.campaign_id||null,campaignName:r.campaign_name||null,adsetId:r.adset_id||null,adsetName:r.adset_name||null,spend,reach:Number(r.reach||0),impressions,linkClicks,ctr:impressions?100*linkClicks/impressions:null,cpc:linkClicks?spend/linkClicks:null,conversations,costPerConversation:conversations?spend/conversations:null};
  })});
 }catch(e){if(["TimeoutError","AbortError"].includes(e.name))return res.status(504).json({error:"Tempo limite da Meta."});next(e);}
});
module.exports=router;
