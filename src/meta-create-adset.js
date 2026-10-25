const express = require("express");
const crypto = require("node:crypto");
const pool = require("./db");
const access = require("./company-access");
const router = express.Router();
const locks = new Map();
const done = new Map();
const version = () => /^v\d+\.\d+$/.test(process.env.META_API_VERSION || "") ? process.env.META_API_VERSION : "v24.0";
const digits = v => typeof v === "string" && /^\d{10,30}$/.test(v);
const clean = v => typeof v === "string" ? v.replace(/EAA[A-Za-z0-9_-]{12,}/g,"[REDACTED]").replace(/(?:access_token|appsecret_proof|client_secret)\s*[=:]\s*[^\s&,;]+/gi,"[REDACTED]").replace(/https?:\/\/\S+/gi,"[link omitido]").slice(0,300) : null;
async function meta(url,token,options={}) {
  const response=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,...(options.headers||{})},signal:AbortSignal.timeout(15000)});
  const data=await response.json();
  if(!response.ok){
    const error=new Error("A Meta recusou a operação.");
    error.meta=true;error.code=Number(data?.error?.code)||null;error.subcode=Number(data?.error?.error_subcode)||null;
    error.detail=clean(data?.error?.error_user_msg)||clean(data?.error?.message);
    error.trace=clean(data?.error?.fbtrace_id);
    throw error;
  }
  return data;
}
router.post("/:companyId/meta-create-adset",access,async(req,res,next)=>{
  if(process.env.META_ADSET_CREATION_ENABLED!=="true")return res.status(503).json({error:"Criação de públicos ainda desabilitada. Ative META_ADSET_CREATION_ENABLED=true no Railway somente após revisar a configuração."});
  const {campaignId,name,ageMin,ageMax,dailyBudgetBrl,confirm}=req.body||{};
  const key=req.get("Idempotency-Key");
  if(!digits(campaignId)||typeof name!=="string"||!name.trim()||name.trim().length>120||
    !Number.isInteger(ageMin)||!Number.isInteger(ageMax)||ageMin<18||ageMax>65||ageMin>ageMax||
    typeof dailyBudgetBrl!=="number"||!Number.isFinite(dailyBudgetBrl)||dailyBudgetBrl<10||dailyBudgetBrl>10000||
    Math.round(dailyBudgetBrl*100)/100!==dailyBudgetBrl||confirm!==true||
    typeof key!=="string"||!/^[a-f0-9-]{36}$/.test(key))
    return res.status(400).json({error:"Confira a campanha, o público, o orçamento, a confirmação e a chave da solicitação."});
  const token=process.env.META_ACCESS_TOKEN;
  if(!token)return res.status(503).json({error:"Conexão Meta não configurada."});
  const scope=req.params.companyId+":"+req.session.userId+":"+key;
  const fingerprint=crypto.createHash("sha256").update(JSON.stringify({campaignId,name:name.trim(),ageMin,ageMax,dailyBudgetBrl})).digest("hex");
  const previous=done.get(scope);
  if(previous){
    if(previous.fingerprint!==fingerprint)return res.status(409).json({error:"Essa solicitação já foi usada com outras configurações."});
    return res.status(200).json({...previous.result,reused:true});
  }
  if(locks.has(scope))return res.status(409).json({error:"Solicitação em andamento. Aguarde e confira os públicos antes de tentar novamente."});
  locks.set(scope,true);
  try{
    const {rows}=await pool.query("SELECT ad_account_id FROM meta_assets WHERE company_id=$1",[req.params.companyId]);
    const accountId=rows[0]?.ad_account_id;
    if(!digits(accountId))return res.status(422).json({error:"Conta de anúncios não cadastrada."});
    const root=`https://graph.facebook.com/${version()}`;
    const [account,campaign]=await Promise.all([
      meta(`${root}/act_${accountId}?fields=id,currency,account_status`,token),
      meta(`${root}/${campaignId}?fields=id,name,status,objective,account_id`,token)
    ]);
    if(account.id!==`act_${accountId}`||account.currency!=="BRL")
      return res.status(422).json({error:"A conta de anúncios deve estar configurada em reais (BRL)."});
    if(String(campaign.account_id||"").replace(/^act_/,"")!==accountId||
       campaign.status!=="PAUSED"||campaign.objective!=="OUTCOME_ENGAGEMENT")
      return res.status(422).json({error:"Escolha uma campanha de Engajamento pausada, pertencente à conta selecionada."});
    const body=new URLSearchParams({
      name:name.trim(),campaign_id:campaignId,status:"PAUSED",
      billing_event:"IMPRESSIONS",optimization_goal:"POST_ENGAGEMENT",
      bid_strategy:"LOWEST_COST_WITHOUT_CAP",
      destination_type:"UNDEFINED",
      daily_budget:String(Math.round(dailyBudgetBrl*100)),
      targeting:JSON.stringify({geo_locations:{countries:["BR"]},age_min:ageMin,age_max:ageMax,targeting_automation:{advantage_audience:0}})
    });
    let data;
    try{
      data=await meta(`${root}/act_${accountId}/adsets`,token,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
    }catch(error){
      if(error.meta)return res.status(502).json({error:"A Meta recusou a criação do público.",metaErrorCode:error.code,metaErrorSubcode:error.subcode,metaErrorDetail:error.detail,metaTraceId:error.trace});
      return res.status(502).json({error:"Não foi possível confirmar a criação. Confira a lista de públicos antes de tentar novamente.",uncertain:true});
    }
    if(!digits(String(data.id||"")))return res.status(502).json({error:"Resposta inesperada da Meta. Confira a lista de públicos.",uncertain:true});
    const result={created:true,id:String(data.id),name:name.trim(),campaignId,status:"PAUSED",dailyBudgetBrl};
    done.set(scope,{fingerprint,result});
    if(done.size>500)done.delete(done.keys().next().value);
    return res.status(201).json(result);
  }catch(error){
    if(error.meta)return res.status(502).json({error:"Não foi possível validar a conta e a campanha na Meta.",metaErrorCode:error.code,metaErrorSubcode:error.subcode,metaErrorDetail:error.detail,metaTraceId:error.trace});
    if(["TimeoutError","AbortError"].includes(error.name))return res.status(504).json({error:"A consulta de validação à Meta demorou demais. Tente novamente mais tarde."});
    next(error);
  }finally{locks.delete(scope);}
});
module.exports=router;
