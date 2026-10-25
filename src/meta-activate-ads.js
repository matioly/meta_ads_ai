const express=require("express");
const pool=require("./db");
const access=require("./company-access");
const router=express.Router();
const version=()=>/^v\d+\.\d+$/.test(process.env.META_API_VERSION||"")?process.env.META_API_VERSION:"v24.0";
async function meta(path,token,options={}){
 const r=await fetch("https://graph.facebook.com/"+version()+"/"+path,{...options,headers:{Authorization:"Bearer "+token,...(options.headers||{})},signal:AbortSignal.timeout(15000)});
 const data=await r.json();
 if(!r.ok){const e=new Error("A Meta recusou a solicitação.");e.code=Number(data?.error?.code)||null;throw e;}
 return data;
}
async function account(req){
 const {rows}=await pool.query("SELECT ad_account_id FROM meta_assets WHERE company_id=$1",[req.params.companyId]);
 const id=rows[0]?.ad_account_id;
 if(!/^\d{1,30}$/.test(id||""))throw Error("Conta Meta não configurada.");
 return id;
}
router.get("/:companyId/meta-paused-ads",access,async(req,res)=>{
 try{
  const token=process.env.META_ACCESS_TOKEN;if(!token)return res.status(503).json({error:"Conexão Meta não configurada."});
  const id=await account(req);
  const result=await meta("act_"+id+"/ads?fields=id,name,status,effective_status,campaign{id,name,status},adset{id,name,status}&limit=100",token);
  const items=(result.data||[]).filter(a=>a.status==="PAUSED").map(a=>({id:a.id,name:a.name,campaign:a.campaign?.name||"—",adset:a.adset?.name||"—",eligible:a.campaign?.status==="ACTIVE"&&a.adset?.status==="ACTIVE",campaignStatus:a.campaign?.status,adsetStatus:a.adset?.status}));
  return res.json({items,hasMore:Boolean(result.paging?.next)});
 }catch(e){return res.status(502).json({error:e.message==="Conta Meta não configurada."?e.message:"Não foi possível consultar anúncios na Meta."});}
});
router.post("/:companyId/meta-activate-ad",access,async(req,res)=>{
 const id=req.body?.adId;
 if(req.body?.confirm!==true||typeof id!=="string"||!/^\d{10,30}$/.test(id))return res.status(400).json({error:"Confirmação ou anúncio inválido."});
 try{
  const token=process.env.META_ACCESS_TOKEN;if(!token)return res.status(503).json({error:"Conexão Meta não configurada."});
  const accountId=await account(req);
  const ad=await meta(id+"?fields=id,name,status,account_id,campaign{id,name,status},adset{id,name,status}",token);
  if(String(ad.account_id||"").replace(/^act_/,"")!==accountId)return res.status(403).json({error:"Anúncio não pertence à conta selecionada."});
  if(ad.status!=="PAUSED")return res.status(409).json({error:"Anúncio não está pausado. Atualize a lista."});
  if(ad.campaign?.status!=="ACTIVE"||ad.adset?.status!=="ACTIVE")return res.status(409).json({error:"Ative primeiro a campanha e o conjunto no Gerenciador da Meta. Nenhuma alteração foi feita."});
  await meta(id,token,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({status:"ACTIVE"})});
  return res.json({id,activated:true});
 }catch(e){return res.status(502).json({error:"Não foi possível confirmar a ativação na Meta. Verifique o status antes de repetir.",metaErrorCode:e.code||null});}
});
module.exports=router;
