const express = require("express");
const pool = require("./db");
const access = require("./company-access");
const router = express.Router();
const FIELDS = {
  campaigns: "id,name,objective,status,effective_status,daily_budget,lifetime_budget",
  adsets: "id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,start_time,end_time,targeting",
  ads: "id,name,campaign_id,adset_id,status,effective_status,creative{id,name,object_story_spec,thumbnail_url}"
};
const TYPES = Object.keys(FIELDS);
// Read-only historical inventory. Meta may not expose permanently removed objects.
router.get("/:companyId/meta-campaign-history", access, async (req, res, next) => {
 try {
  const token=process.env.META_ACCESS_TOKEN;
  if(!token)return res.status(503).json({error:"Conexão Meta não configurada."});
  const {rows}=await pool.query("SELECT ad_account_id FROM meta_assets WHERE company_id=$1",[req.params.companyId]);
  const id=rows[0]?.ad_account_id;
  if(!id||!/^[0-9]{1,30}$/.test(id))return res.status(422).json({error:"Conta de anúncios não configurada."});
  const version=/^v\\d+\\.\\d+$/.test(process.env.META_API_VERSION||"")?process.env.META_API_VERSION:"v24.0";
  const url=new URL("https://graph.facebook.com/"+version+"/act_"+id+"/campaigns");
  url.searchParams.set("fields","id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time,updated_time,start_time,stop_time");
  url.searchParams.set("filtering",JSON.stringify([{field:"status",operator:"IN",value:["ACTIVE","PAUSED","DELETED","ARCHIVED"]}]));
  url.searchParams.set("limit","100");
  const items=[];let next=url.toString();let pages=0;
  while(next&&pages<30){
   const u=new URL(next);
   if(u.protocol!=="https:"||u.hostname!=="graph.facebook.com")throw Error("Paginação inválida da Meta.");
   const response=await fetch(u,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(12000)});
   const data=await response.json();
   if(!response.ok)return res.status([190,10,200].includes(Number(data?.error?.code))?403:502).json({error:"Não foi possível consultar o histórico na Meta.",metaErrorCode:data?.error?.code??null});
   if(!Array.isArray(data.data))return res.status(502).json({error:"Resposta inesperada da Meta."});
   for(const item of data.data)items.push({id:item.id,name:item.name,objective:item.objective,status:item.status,effectiveStatus:item.effective_status,dailyBudget:item.daily_budget??null,lifetimeBudget:item.lifetime_budget??null,createdAt:item.created_time??null,updatedAt:item.updated_time??null,startAt:item.start_time??null,stopAt:item.stop_time??null});
   next=data.paging?.next||null;pages++;
  }
  res.json({items,hasMore:!!next,source:"Meta Marketing API",note:"Campanhas excluídas permanentemente podem não estar mais disponíveis na Meta."});
 }catch(error){if(["TimeoutError","AbortError"].includes(error.name))return res.status(504).json({error:"Tempo limite na consulta à Meta."});next(error);}
});
router.get("/:companyId/meta-campaigns", access, async (req, res, next) => {
  try {
    const type = req.query.type || "campaigns";
    if (!TYPES.includes(type)) return res.status(400).json({ error: "Tipo de consulta inválido." });
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) return res.status(503).json({ error: "Conexão Meta não configurada." });
    const { rows } = await pool.query("SELECT ad_account_id FROM meta_assets WHERE company_id=$1", [req.params.companyId]);
    const id = rows[0]?.ad_account_id;
    if (!id || !/^[0-9]{1,30}$/.test(id)) return res.status(422).json({ error: "Cadastre a conta de anúncios no inventário." });
    const version = /^v\d+\.\d+$/.test(process.env.META_API_VERSION || "") ? process.env.META_API_VERSION : "v24.0";
    const url = new URL(`https://graph.facebook.com/${version}/act_${id}/${type}`);
    url.searchParams.set("fields", FIELDS[type]);
    url.searchParams.set("limit", "100");
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
    const data = await response.json();
    if (!response.ok) {
      const code = Number(data?.error?.code);
      return res.status([190,10,200].includes(code) ? 403 : 502).json({
        error: "A Meta não permitiu consultar os dados. Confira o token e as permissões.",
        metaErrorCode: Number.isFinite(code) ? code : null
      });
    }
    if (!Array.isArray(data.data)) return res.status(502).json({ error: "Resposta inesperada da Meta." });
    const items = data.data.map(c => {
      const base = { id:c.id, name:c.name, status:c.status, effectiveStatus:c.effective_status };
      if (type === "campaigns") return { ...base, objective:c.objective, dailyBudget:c.daily_budget ?? null, lifetimeBudget:c.lifetime_budget ?? null };
      if (type === "adsets") return { ...base, campaignId:c.campaign_id, dailyBudget:c.daily_budget ?? null, lifetimeBudget:c.lifetime_budget ?? null, startTime:c.start_time ?? null, endTime:c.end_time ?? null, locations:c.targeting?.geo_locations?.countries ?? [], cities:(c.targeting?.geo_locations?.cities ?? []).map(city=>city.name).filter(Boolean) };
      return { ...base, campaignId:c.campaign_id, adsetId:c.adset_id, creativeName:c.creative?.name ?? null, thumbnailUrl:typeof c.creative?.thumbnail_url === "string" && c.creative.thumbnail_url.startsWith("https://") ? c.creative.thumbnail_url : null, creativeId:c.creative?.id ?? null };
    });
    res.json({ items, campaigns:type==="campaigns" ? items : undefined, hasMore:Boolean(data.paging?.next), type });
  } catch (error) {
    if (["TimeoutError","AbortError"].includes(error.name)) return res.status(504).json({ error: "Tempo limite na consulta à Meta." });
    next(error);
  }
});
module.exports = router;
