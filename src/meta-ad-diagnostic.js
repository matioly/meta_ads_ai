// Only explicitly selected IDs/enums leave the server; never return Graph objects.
const enumValue=v=>typeof v==="string"&&/^[A-Z_]{1,64}$/.test(v)?v:null;
const idValue=v=>typeof v==="string"&&/^\d{1,30}$/.test(v)?v:null;
function diagnose(d,campaign,adset){
 // UNDEFINED is a read value, not proof of WEBSITE. In this website-only flow,
 // allow Meta to validate the explicit HTTPS LEARN_MORE creative for traffic clicks.
 const unspecifiedWebsiteCandidate=adset.destination_type==="UNDEFINED"&&
  campaign.objective==="OUTCOME_TRAFFIC"&&adset.optimization_goal==="LINK_CLICKS";
 const whatsapp=campaign.objective==="OUTCOME_ENGAGEMENT";
 const checks=[
  ["campaignAccount","Conta da campanha",campaign.account_id,d.ad_account_id,String(campaign.account_id).replace(/^act_/,"")===d.ad_account_id],
  ["adsetAccount","Conta do conjunto",adset.account_id,d.ad_account_id,String(adset.account_id).replace(/^act_/,"")===d.ad_account_id],
  ["adsetCampaign","Campanha vinculada ao conjunto",adset.campaign_id,d.campaign_meta_id,adset.campaign_id===d.campaign_meta_id],
  ["campaignStatus","Status da campanha",campaign.status,"PAUSED",campaign.status==="PAUSED"],
  ["adsetStatus","Status do conjunto",adset.status,"PAUSED",adset.status==="PAUSED"],
  ["campaignObjective","Objetivo da campanha",campaign.objective,whatsapp?"OUTCOME_ENGAGEMENT":"OUTCOME_TRAFFIC",whatsapp||campaign.objective==="OUTCOME_TRAFFIC"],
  ["adsetDestinationType","Destino do conjunto",adset.destination_type,whatsapp?"WHATSAPP":"WEBSITE ou UNDEFINED para Tráfego/cliques",whatsapp?adset.destination_type==="WHATSAPP":adset.destination_type==="WEBSITE"||unspecifiedWebsiteCandidate],
  ["adsetOptimizationGoal","Otimização do conjunto",adset.optimization_goal,whatsapp?"CONVERSATIONS":"LINK_CLICKS",whatsapp?adset.optimization_goal==="CONVERSATIONS":adset.optimization_goal==="LINK_CLICKS"]
 ].map(([field,label,actual,expected,ok],i)=>({field,label,actual:i<3?idValue(String(actual).replace(/^act_/,"")):enumValue(actual),expected,ok}));
 const destinationCheck=checks.find(c=>c.field==="adsetDestinationType");
 if(!whatsapp&&unspecifiedWebsiteCandidate)destinationCheck.warning="A Meta retornou UNDEFINED. O criativo enviará uma URL HTTPS com Saiba mais; a compatibilidade final será validada pela Meta. Isso não confirma WEBSITE no conjunto.";
 return {campaignId:idValue(d.campaign_meta_id),adsetId:idValue(d.adset_meta_id),compatible:checks.every(c=>c.ok),destination:whatsapp?"WHATSAPP":"WEBSITE",checks};
}
module.exports={diagnose};
