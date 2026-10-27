const express=require("express");
const pool=require("./db");
const access=require("./company-access");
const {uuid}=require("./media-validation");
const router=express.Router();
const fields='d.id,d."media_id" AS "mediaId",d.campaign_meta_id AS "campaignMetaId",d.adset_meta_id AS "adsetMetaId",d.headline,d.primary_text AS "primaryText",d.description,d.updated_at AS "updatedAt",d.meta_video_id AS "metaVideoId",d.meta_creative_id AS "metaCreativeId",d.meta_ad_id AS "metaAdId",d.meta_publish_state AS "metaPublishState",m.name AS "mediaName",a.label AS "accountLabel",m.drive_url AS "mediaUrl"';
const join=" FROM creative_drafts d JOIN media m ON m.company_id=d.company_id AND m.id=d.media_id JOIN drive_accounts a ON a.company_id=m.company_id AND a.id=m.account_id ";
function parse(body){
 const mediaId=body?.mediaId, headline=typeof body?.headline==="string"?body.headline.trim():"",
 primaryText=typeof body?.primaryText==="string"?body.primaryText.trim():"",
 description=typeof body?.description==="string"?body.description.trim():"",
 campaignMetaId=body?.campaignMetaId||"",adsetMetaId=body?.adsetMetaId||"";
 if(typeof mediaId!=="string"||!uuid.test(mediaId)||!headline||headline.length>255||!primaryText||primaryText.length>2200||description.length>255||
 typeof campaignMetaId!=="string"||typeof adsetMetaId!=="string"||
 (campaignMetaId!==""&&!/^\d{1,30}$/.test(campaignMetaId))||
 (adsetMetaId!==""&&!/^\d{1,30}$/.test(adsetMetaId))||
 (adsetMetaId!==""&&!campaignMetaId))return null;
 return {mediaId,headline,primaryText,description,campaignMetaId,adsetMetaId};
}
router.get("/:companyId/creative-drafts",access,async(req,res,next)=>{
 try{const result=await pool.query("SELECT "+fields+join+"WHERE d.company_id=$1 ORDER BY d.updated_at DESC,d.id DESC LIMIT 100",[req.params.companyId]);res.json({drafts:result.rows});}catch(e){next(e);}
});
router.post("/:companyId/creative-drafts",access,async(req,res,next)=>{
 const v=parse(req.body);if(!v)return res.status(400).json({error:"Confira mídia, título, texto e IDs da Meta."});
 try{
 const result=await pool.query(`INSERT INTO creative_drafts(company_id,media_id,campaign_meta_id,adset_meta_id,headline,primary_text,description,created_by)
 SELECT $1,m.id,$3,$4,$5,$6,$7,$8 FROM media m WHERE m.company_id=$1 AND m.id=$2 AND m.kind IN ('video','image') RETURNING id`,
 [req.params.companyId,v.mediaId,v.campaignMetaId,v.adsetMetaId,v.headline,v.primaryText,v.description,req.session.userId]);
 if(!result.rows.length)return res.status(400).json({error:"Mídia indisponível nesta clínica."});
 res.status(201).json({id:result.rows[0].id});
 }catch(e){next(e);}
});
router.put("/:companyId/creative-drafts/:draftId",access,async(req,res,next)=>{
 if(!uuid.test(req.params.draftId))return res.status(400).json({error:"Identificador inválido."});
 const v=parse(req.body);if(!v)return res.status(400).json({error:"Confira mídia, título, texto e IDs da Meta."});
 try{
 const result=await pool.query(`UPDATE creative_drafts d SET media_id=$3,campaign_meta_id=$4,adset_meta_id=$5,headline=$6,primary_text=$7,description=$8,updated_at=NOW()
 WHERE d.company_id=$1 AND d.id=$2 AND d.meta_creative_id IS NULL AND ((d.meta_video_id IS NULL AND d.meta_image_hash IS NULL) OR d.media_id=$3) AND EXISTS(SELECT 1 FROM media m WHERE m.company_id=$1 AND m.id=$3 AND m.kind IN ('video','image')) RETURNING d.id`,
 [req.params.companyId,req.params.draftId,v.mediaId,v.campaignMetaId,v.adsetMetaId,v.headline,v.primaryText,v.description]);
 if(!result.rows.length)return res.status(404).json({error:"Rascunho não encontrado, mídia indisponível, mídia diferente após upload ou criativo já criado na Meta."});
 res.json({id:result.rows[0].id});
 }catch(e){next(e);}
});
router.delete("/:companyId/creative-drafts/:draftId",access,async(req,res,next)=>{
 if(!uuid.test(req.params.draftId))return res.status(400).json({error:"Identificador inválido."});
 try{const result=await pool.query("DELETE FROM creative_drafts WHERE company_id=$1 AND id=$2 RETURNING id",[req.params.companyId,req.params.draftId]);if(!result.rows.length)return res.status(404).json({error:"Rascunho não encontrado."});res.json({ok:true});}catch(e){next(e);}
});
module.exports=router;
