const express = require("express");
const crypto = require("node:crypto");
const pool = require("./db");
const access = require("./company-access");
const router = express.Router();
const pending = new Map();
const completed = new Map();
const TTL = 30 * 60 * 1000;

router.post("/:companyId/meta-create-campaign", access, async (req,res,next)=>{
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const objective = req.body?.objective;
  const key = req.get("Idempotency-Key");
  if (!name || name.length > 120 || !["OUTCOME_TRAFFIC","OUTCOME_ENGAGEMENT"].includes(objective) ||
      req.body?.confirm !== true || typeof key !== "string" ||
      !/^[a-f0-9-]{36}$/.test(key)) {
    return res.status(400).json({error:"Informe nome, objetivo Tráfego ou Engajamento, confirmação e chave da solicitação."});
  }
  if (process.env.META_CAMPAIGN_CREATION_ENABLED !== "true") {
    return res.status(503).json({error:"Criação de campanhas desabilitada. Ative META_CAMPAIGN_CREATION_ENABLED=true no Railway após revisar o fluxo."});
  }
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return res.status(503).json({error:"Conexão Meta não configurada."});
  const scope = req.params.companyId+":"+req.session.userId+":"+key;
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify({name,objective})).digest("hex");
  const existing = completed.get(scope);
  if (existing && existing.expires > Date.now()) {
    if (existing.fingerprint !== fingerprint) return res.status(409).json({error:"Chave já utilizada com outros dados."});
    return res.status(200).json({...existing.result,reused:true});
  }
  if (pending.has(scope)) return res.status(409).json({error:"Solicitação já está em andamento. Aguarde antes de tentar novamente."});
  pending.set(scope,true);
  try {
    const {rows} = await pool.query("SELECT ad_account_id FROM meta_assets WHERE company_id=$1",[req.params.companyId]);
    const id = rows[0]?.ad_account_id;
    if (!id || !/^[0-9]{1,30}$/.test(id)) return res.status(422).json({error:"Conta de anúncios não cadastrada."});
    const version = /^v\d+\.\d+$/.test(process.env.META_API_VERSION||"")?process.env.META_API_VERSION:"v24.0";
    const url = `https://graph.facebook.com/${version}/act_${id}/campaigns`;
    const body = new URLSearchParams({name,objective,status:"PAUSED",special_ad_categories:"[]",is_adset_budget_sharing_enabled:"false"});
    let response;
    try {
      response = await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(15000)});
    } catch(error) {
      return res.status(502).json({error:"Não foi possível confirmar se a Meta criou a campanha. Confira a lista de campanhas antes de tentar novamente.",uncertain:true});
    }
    const data = await response.json();
    if (!response.ok) {
      const metaError = data?.error || {};
      const code = Number(metaError.code);
      const subcode = Number(metaError.error_subcode);
      // Never forward arbitrary Meta response objects or access tokens to the browser.
      // error_user_msg is intended for display; message is sanitized and length-limited.
      const clean = (value) => typeof value === "string"
        ? value.replace(/EAA[A-Za-z0-9_-]{12,}/g, "[REDACTED]")
          .replace(/(?:access_token|appsecret_proof|client_secret)\s*[=:]\s*[^\s&,;]+/gi, "[REDACTED]")
          .replace(/https?:\/\/\S+/gi, "[link omitido]")
          .slice(0, 350)
        : null;
      const detail = clean(metaError.error_user_msg) || clean(metaError.message);
      const traceId = typeof metaError.fbtrace_id === "string"
        ? metaError.fbtrace_id.slice(0, 80) : null;
      return res.status(502).json({
        error: "A Meta recusou a criação da campanha.",
        metaErrorCode: Number.isFinite(code) ? code : null,
        metaErrorSubcode: Number.isFinite(subcode) && subcode > 0 ? subcode : null,
        metaErrorType: typeof metaError.type === "string" ? metaError.type.slice(0, 80) : null,
        metaErrorDetail: detail,
        metaTraceId: traceId
      });
    }
    if (!/^[0-9]+$/.test(String(data.id||""))) return res.status(502).json({error:"Resposta inesperada da Meta. Verifique a lista antes de repetir.",uncertain:true});
    const result = {created:true,id:data.id,name,objective,status:"PAUSED"};
    completed.set(scope,{fingerprint,result,expires:Date.now()+TTL});
    if(completed.size>1000)for(const [k,v] of completed)if(v.expires<Date.now())completed.delete(k);
    return res.status(201).json(result);
  }catch(error){next(error);}finally{pending.delete(scope);}
});
module.exports=router;
