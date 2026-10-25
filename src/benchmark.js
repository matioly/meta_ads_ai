const express = require("express");
const pool = require("./db");
const access = require("./company-access");
const { randomUUID } = require("node:crypto");
const router = express.Router();
const base = "/:companyId/benchmark-competitors";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields = ["name", "city", "state", "instagramUrl", "facebookUrl", "specialty", "notes"];
function validate(body) {
 if (!body || typeof body !== "object" || Array.isArray(body)) throw Error("Dados inválidos.");
 const max = {name:160,city:120,state:2,instagramUrl:500,facebookUrl:500,specialty:120,notes:500};
 const data = {};
 for (const key of fields) {
  if (body[key] !== undefined && typeof body[key] !== "string") throw Error("Campo inválido: " + key);
  data[key] = (body[key] || "").trim();
  if (data[key].length > max[key]) throw Error("Campo muito longo: " + key);
 }
 if (!data.name) throw Error("Informe o nome do concorrente.");
 data.state = data.state.toUpperCase();
 if (data.state && !/^[A-Z]{2}$/.test(data.state)) throw Error("UF deve conter duas letras.");
 for (const key of ["instagramUrl", "facebookUrl"]) {
  if (!data[key]) continue;
  let url;
  try { url = new URL(data[key]); } catch { throw Error("Informe uma URL válida para " + key); }
  const host = url.hostname.toLowerCase();
  const validHosts = key === "instagramUrl" ? ["instagram.com","www.instagram.com"] : ["facebook.com","www.facebook.com","m.facebook.com","fb.com","www.fb.com"];
  if (url.protocol !== "https:" || !validHosts.includes(host) || url.username || url.password) throw Error("Use um link HTTPS oficial de " + key);
  data[key] = url.toString();
 }
 return data;
}
const columns = "id, company_id AS \"companyId\", name, city, state, instagram_url AS \"instagramUrl\", facebook_url AS \"facebookUrl\", specialty, notes, created_at AS \"createdAt\"";
router.get(base, access, async (req,res,next)=>{
 try {
  const r=await pool.query("SELECT "+columns+" FROM benchmark_competitors WHERE company_id=$1 ORDER BY created_at DESC",[req.params.companyId]);
  res.json({competitors:r.rows,limit:5});
 } catch(e){next(e);}
});
router.post(base, access, async(req,res,next)=>{
 let data; try{data=validate(req.body);}catch(e){return res.status(400).json({error:e.message});}
 const client=await pool.connect();
 try {
  await client.query("BEGIN");
  await client.query("SELECT id FROM companies WHERE id=$1 FOR UPDATE",[req.params.companyId]);
  const count=await client.query("SELECT COUNT(*)::int AS n FROM benchmark_competitors WHERE company_id=$1",[req.params.companyId]);
  if(count.rows[0].n>=5){await client.query("ROLLBACK");return res.status(409).json({error:"Limite de cinco concorrentes por clínica."});}
  const id=randomUUID();
  const r=await client.query("INSERT INTO benchmark_competitors (id,company_id,name,city,state,instagram_url,facebook_url,specialty,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING "+columns,[id,req.params.companyId,...fields.map(k=>data[k])]);
  await client.query("COMMIT");res.status(201).json({competitor:r.rows[0]});
 }catch(e){await client.query("ROLLBACK").catch(()=>{});next(e);}finally{client.release();}
});
router.put(base+"/:competitorId",access,async(req,res,next)=>{
 if(!uuid.test(req.params.competitorId))return res.status(400).json({error:"Identificador inválido."});
 let data;try{data=validate(req.body);}catch(e){return res.status(400).json({error:e.message});}
 try{
  const r=await pool.query("UPDATE benchmark_competitors SET name=$3,city=$4,state=$5,instagram_url=$6,facebook_url=$7,specialty=$8,notes=$9,updated_at=NOW() WHERE company_id=$1 AND id=$2 RETURNING "+columns,[req.params.companyId,req.params.competitorId,...fields.map(k=>data[k])]);
  if(!r.rowCount)return res.status(404).json({error:"Concorrente não encontrado."});
  res.json({competitor:r.rows[0]});
 }catch(e){next(e);}
});
router.delete(base+"/:competitorId",access,async(req,res,next)=>{
 if(!uuid.test(req.params.competitorId))return res.status(400).json({error:"Identificador inválido."});
 try{
  const r=await pool.query("DELETE FROM benchmark_competitors WHERE company_id=$1 AND id=$2",[req.params.companyId,req.params.competitorId]);
  if(!r.rowCount)return res.status(404).json({error:"Concorrente não encontrado."});
  res.json({ok:true});
 }catch(e){next(e);}
});
module.exports=router;
