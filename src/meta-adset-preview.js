const express=require("express");
const access=require("./company-access");
const pool=require("./db");
const router=express.Router();

// META04.2A: validate a planned ad set. This endpoint NEVER calls the Meta API.
router.post("/:companyId/meta-adset-preview",access,async(req,res,next)=>{
  try{
    const {campaignId,name,ageMin,ageMax,dailyBudgetBrl,locations,gender,interests=[]}=req.body||{};
    if(!Array.isArray(locations)||locations.length<1||locations.length>10||locations.some(l=>!l||typeof l.name!=="string"||!l.name.trim()||l.name.length>120||!(typeof l.key==="string"&&((["city","region","neighborhood","subcity"].includes(l.type)&&/^[0-9]+$/.test(l.key))||(l.type==="custom"&&/^pin:-?[0-9.]+:-?[0-9.]+$/.test(l.key)&&Number.isFinite(l.latitude)&&Number.isFinite(l.longitude)&&Math.abs(l.latitude)<=90&&Math.abs(l.longitude)<=180)))||![3,5,10,15,20].includes(l.radiusKm)||!["native","radius"].includes(l.mode)||((l.mode==="radius"&&l.type!=="city")&&(!Number.isFinite(l.latitude)||!Number.isFinite(l.longitude)||Math.abs(l.latitude)>90||Math.abs(l.longitude)>180))||(["neighborhood","subcity"].includes(l.type)&&((l.latitude!=null||l.longitude!=null)&&(!Number.isFinite(l.latitude)||!Number.isFinite(l.longitude)||Math.abs(l.latitude)>90||Math.abs(l.longitude)>180))))||!["all","male","female"].includes(gender))return res.status(400).json({error:"Selecione de 1 a 10 localidades válidas e seus raios."});
    if(!Array.isArray(interests)||interests.length>20||interests.some(i=>!i||!/^\d{1,30}$/.test(String(i.id))||typeof i.name!=="string"||i.name.length>120))return res.status(400).json({error:"Interesses inválidos."});
    if(typeof campaignId!=="string"||!/^[0-9]{10,30}$/.test(campaignId)||
       typeof name!=="string"||!name.trim()||name.trim().length>120||
       !Number.isInteger(ageMin)||!Number.isInteger(ageMax)||
       ageMin<18||ageMax>65||ageMin>ageMax||
       typeof dailyBudgetBrl!=="number"||!Number.isFinite(dailyBudgetBrl)||
       dailyBudgetBrl<10||dailyBudgetBrl>10000||
       Math.round(dailyBudgetBrl*100)/100!==dailyBudgetBrl){
      return res.status(400).json({error:"Confira campanha, nome, idade (18–65) e orçamento diário (R$ 10 a R$ 10.000)."});
    }
    const {rows}=await pool.query("SELECT ad_account_id FROM meta_assets WHERE company_id=$1",[req.params.companyId]);
    if(!rows[0]?.ad_account_id)return res.status(422).json({error:"Conta de anúncios não configurada para a clínica."});
    const cents=Math.round(dailyBudgetBrl*100);
    return res.json({preview:true,willCreate:false,companyId:req.params.companyId,
      adAccountId:rows[0].ad_account_id,campaignId,name:name.trim(),
      status:"PAUSED",locations,gender,interests,targeting:{geo_locations:{...(locations.some(l=>l.type==="city")?{cities:locations.filter(l=>l.type==="city").map(l=>(l.mode==="radius"?{key:l.key,radius:l.radiusKm,distance_unit:"kilometer"}:{key:l.key}))}:{}),...(locations.some(l=>l.type==="region")?{regions:locations.filter(l=>l.type==="region").map(l=>({key:l.key}))}:{}),...(locations.some(l=>["neighborhood","subcity"].includes(l.type)&&l.mode==="native")?{neighborhoods:locations.filter(l=>["neighborhood","subcity"].includes(l.type)&&l.mode==="native").map(l=>({key:l.key}))}:{}),...(locations.some(l=>l.type==="custom"||(["neighborhood","subcity"].includes(l.type)&&l.mode==="radius"))?{custom_locations:locations.filter(l=>l.type==="custom"||(["neighborhood","subcity"].includes(l.type)&&l.mode==="radius")).map(l=>({latitude:l.latitude,longitude:l.longitude,radius:l.radiusKm,distance_unit:"kilometer"}))}:{})},age_min:ageMin,age_max:ageMax,...(interests.length?{flexible_spec:[{interests:interests.map(i=>({id:String(i.id),name:i.name}))}]}:{}),...(gender==="all"?{}:{genders:[gender==="male"?1:2]})},
      dailyBudgetBrl:cents/100,dailyBudgetMinorUnits:cents,
      pending:["Definir otimização e destino compatíveis com o objetivo","Validar campanha e conta pela Meta antes de criar","Confirmar programação e posicionamentos","Aprovar criação pausada na etapa META04.2B"]});
  }catch(e){next(e);}
});
module.exports=router;
