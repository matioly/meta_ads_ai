const express = require("express");
const pool = require("./db");
const access = require("./company-access");
const router = express.Router();
const presets = new Set(["today","last_7d","last_30d"]);
function validDate(v) { if (!/^\d{4}-\d{2}-\d{2}$/.test(v || "")) return false; const d=new Date(v+"T00:00:00Z"); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10)===v; }
router.get("/:companyId/meta-insights",access,async(req,res,next)=>{
  try {
    const token=process.env.META_ACCESS_TOKEN;
    if(!token)return res.status(503).json({error:"Conexão Meta não configurada."});
    const {rows}=await pool.query("SELECT ad_account_id FROM meta_assets WHERE company_id=$1",[req.params.companyId]);
    const id=rows[0]?.ad_account_id;
    if(!id||!/^[0-9]{1,30}$/.test(id))return res.status(422).json({error:"Cadastre a conta de anúncios no inventário."});
    const preset=req.query.period||"last_7d";
    if(!presets.has(preset)&&preset!=="custom")return res.status(400).json({error:"Período inválido."});
    if(preset==="custom"){
      const since=req.query.since,until=req.query.until;
      if(!validDate(since)||!validDate(until)||since>until||((Date.parse(until)-Date.parse(since))/86400000)>366)return res.status(400).json({error:"Informe datas válidas em intervalo de até 366 dias."});
    }
    const version=/^v\d+\.\d+$/.test(process.env.META_API_VERSION||"")?process.env.META_API_VERSION:"v24.0";
    const url=new URL(`https://graph.facebook.com/${version}/act_${id}/insights`);
    url.searchParams.set("fields","spend,reach,impressions,clicks,inline_link_clicks,actions,date_start,date_stop");
    url.searchParams.set("level","account");
    url.searchParams.set("limit","1");
    if(preset==="custom")url.searchParams.set("time_range",JSON.stringify({since:req.query.since,until:req.query.until}));
    else url.searchParams.set("date_preset",preset);
    const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000)});
    const data=await response.json();
    if(!response.ok){const code=Number(data?.error?.code);return res.status([190,10,200].includes(code)?403:502).json({error:"Não foi possível consultar os resultados na Meta. Verifique permissões e período.",metaErrorCode:Number.isFinite(code)?code:null});}
    if(!Array.isArray(data.data))return res.status(502).json({error:"Resposta inesperada da Meta."});
    const row=data.data[0]||null;
    const actions=Array.isArray(row?.actions)?row.actions:[];
    const actionValue=(key)=>{const item=actions.find(a=>a.action_type===key);return item?Number(item.value):null;};
    const spend=row?Number(row.spend||0):0;
    const clicks=row?Number(row.clicks||0):0;
    res.json({period:preset,dates:row?{since:row.date_start,until:row.date_stop}:preset==="custom"?{since:req.query.since,until:req.query.until}:null,
      hasData:!!row,spend,reach:row?Number(row.reach||0):0,impressions:row?Number(row.impressions||0):0,clicks,
      linkClicks:row?Number(row.inline_link_clicks||0):0,cpc:clicks>0?spend/clicks:null,
      messagingConversationsStarted:actionValue("onsite_conversion.messaging_conversation_started_7d"),
      messagingConversationsNote:"Evento de conversa iniciada informado pela Meta quando disponível; não equivale a cliques no WhatsApp.",
      source:"Meta Marketing API · Insights (nível da conta)"});
  }catch(error){if(["TimeoutError","AbortError"].includes(error.name))return res.status(504).json({error:"Tempo limite na consulta de resultados."});next(error);}
});
module.exports=router;
