const express=require("express");
const pool=require("./db");
const access=require("./company-access");
const router=express.Router();
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const base="/:companyId/benchmark-competitors/:competitorId/ads";
const cols='id, competitor_id AS "competitorId", title, ad_url AS "adUrl", format, message, hook, call_to_action AS "callToAction", observed_at AS "observedAt", created_at AS "createdAt"';
function valid(req,res,next){if(!uuid.test(req.params.competitorId)||(req.params.adId&&!uuid.test(req.params.adId)))return res.status(400).json({error:"Identificador inválido."});next();}
function parse(body){
 const max={title:160,adUrl:2048,format:30,message:3000,hook:300,callToAction:160};
 const data={};
 for(const key of Object.keys(max)){if(body?.[key]!==undefined&&typeof body[key]!=="string")throw Error("Campo inválido: "+key);data[key]=(body?.[key]||"").trim();if(data[key].length>max[key])throw Error("Campo muito longo: "+key);}
 if(!data.title||!data.adUrl)throw Error("Informe o título e o link do anúncio.");
 let u;try{u=new URL(data.adUrl);}catch{throw Error("Link inválido.");}
 if(u.protocol!=="https:"||u.username||u.password||!["facebook.com","www.facebook.com","m.facebook.com","instagram.com","www.instagram.com"].includes(u.hostname.toLowerCase()))throw Error("Informe um link HTTPS da Meta.");
 data.adUrl=u.toString();data.format=data.format||"unknown";
 if(!["video","image","carousel","unknown"].includes(data.format))throw Error("Formato inválido.");
 return data;
}
async function exists(req){const r=await pool.query("SELECT id FROM benchmark_competitors WHERE company_id=$1 AND id=$2",[req.params.companyId,req.params.competitorId]);return !!r.rowCount;}
router.get(base,access,valid,async(req,res,next)=>{try{if(!await exists(req))return res.status(404).json({error:"Concorrente não encontrado."});const r=await pool.query("SELECT "+cols+" FROM benchmark_ads WHERE company_id=$1 AND competitor_id=$2 ORDER BY created_at DESC LIMIT 100",[req.params.companyId,req.params.competitorId]);res.json({ads:r.rows});}catch(e){next(e);}});
router.post(base,access,valid,async(req,res,next)=>{let d;try{d=parse(req.body);}catch(e){return res.status(400).json({error:e.message});}try{if(!await exists(req))return res.status(404).json({error:"Concorrente não encontrado."});const r=await pool.query("INSERT INTO benchmark_ads (company_id,competitor_id,title,ad_url,format,message,hook,call_to_action) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING "+cols,[req.params.companyId,req.params.competitorId,d.title,d.adUrl,d.format,d.message,d.hook,d.callToAction]);res.status(201).json({ad:r.rows[0]});}catch(e){if(e.code==="23505")return res.status(409).json({error:"Este anúncio já está registrado para o concorrente."});next(e);}});
router.delete(base+"/:adId",access,valid,async(req,res,next)=>{try{const r=await pool.query("DELETE FROM benchmark_ads WHERE company_id=$1 AND competitor_id=$2 AND id=$3",[req.params.companyId,req.params.competitorId,req.params.adId]);if(!r.rowCount)return res.status(404).json({error:"Anúncio não encontrado."});res.json({ok:true});}catch(e){next(e);}});
module.exports=router;
