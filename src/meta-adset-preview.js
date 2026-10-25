const express=require("express");
const access=require("./company-access");
const pool=require("./db");
const router=express.Router();

// META04.2A: validate a planned ad set. This endpoint NEVER calls the Meta API.
router.post("/:companyId/meta-adset-preview",access,async(req,res,next)=>{
  try{
    const {campaignId,name,ageMin,ageMax,dailyBudgetBrl}=req.body||{};
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
      status:"PAUSED",targeting:{geo_locations:{countries:["BR"]},age_min:ageMin,age_max:ageMax},
      dailyBudgetBrl:cents/100,dailyBudgetMinorUnits:cents,
      pending:["Definir otimização e destino compatíveis com o objetivo","Validar campanha e conta pela Meta antes de criar","Confirmar programação e posicionamentos","Aprovar criação pausada na etapa META04.2B"]});
  }catch(e){next(e);}
});
module.exports=router;
