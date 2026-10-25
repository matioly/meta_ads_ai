// Explicit, paused-only publishing workflow. Never activates an ad.
const express=require("express");
const pool=require("./db");
const access=require("./company-access");
const router=express.Router();
const {uuid}=require("./media-validation");
const digits=v=>typeof v==="string"&&/^\d{10,30}$/.test(v);
const version=()=>/^v\d+\.\d+$/.test(process.env.META_API_VERSION||"")?process.env.META_API_VERSION:"v24.0";
const clean=s=>typeof s==="string"?s.replace(/EAA[A-Za-z0-9_-]{12,}/g,"[REDACTED]").replace(/(?:access_token|appsecret_proof)\s*[=:]\s*[^\s&,;]+/gi,"[REDACTED]").slice(0,350):"";
const metaError=(data)=>({code:Number(data?.error?.code)||null,subcode:Number(data?.error?.error_subcode)||null,detail:clean(data?.error?.error_user_msg||data?.error?.message)});
async function graph(path,token,options={}){
 const response=await fetch("https://graph.facebook.com/"+version()+"/"+path,{...options,headers:{Authorization:"Bearer "+token,...(options.headers||{})},signal:AbortSignal.timeout(45000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok||!data){const e=new Error("Meta API recusou a operação.");e.meta=metaError(data);throw e;}
 return data;
}
function driveId(value){
 const url=new URL(value);
 if(url.protocol!=="https:"||url.hostname!=="drive.google.com"||url.username||url.password||url.port)throw Error("Somente links HTTPS do Google Drive são aceitos.");
 const id=url.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]{15,})\//)?.[1]||url.searchParams.get("id");
 if(!id||!/^[a-zA-Z0-9_-]{15,}$/.test(id))throw Error("Link do Drive sem identificador de arquivo válido.");
 return id;
}
function googleHost(url){
 return url.protocol==="https:"&&!url.username&&!url.password&&!url.port&&
 (url.hostname==="drive.google.com"||url.hostname==="docs.google.com"||url.hostname==="drive.usercontent.google.com"||url.hostname==="googleusercontent.com"||url.hostname.endsWith(".googleusercontent.com"));
}
async function downloadDrive(id){
 let url=new URL("https://drive.google.com/uc?export=download&id="+encodeURIComponent(id));
 for(let redirects=0;redirects<6;redirects++){
  if(!googleHost(url))throw Error("Redirecionamento do Drive para domínio não autorizado.");
  const response=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(60000)});
  if([301,302,303,307,308].includes(response.status)){
   const location=response.headers.get("location");await response.body?.cancel();
   if(!location)throw Error("Redirecionamento do Drive inválido.");
   url=new URL(location,url);continue;
  }
  if(!response.ok)throw Error("O Drive não permitiu baixar o vídeo. Confira se o arquivo está compartilhado para qualquer pessoa com o link.");
  const type=(response.headers.get("content-type")||"").split(";")[0].toLowerCase();
  if(!type.startsWith("video/")&&type!=="application/octet-stream"){await response.body?.cancel();throw Error("O Drive retornou uma página em vez do vídeo. É necessário um link de download público direto ou futura integração OAuth.");}
  const max=75*1024*1024;const length=Number(response.headers.get("content-length")||0);
  if(length>max){await response.body?.cancel();throw Error("Vídeo maior que 75 MB. Use um arquivo menor para este teste.");}
  const chunks=[];let size=0;
  for await(const chunk of response.body){size+=chunk.length;if(size>max)throw Error("Vídeo maior que 75 MB.");chunks.push(chunk);}
  if(size<1024)throw Error("Arquivo de vídeo vazio ou incompleto.");
  return new Blob(chunks,{type:type.startsWith("video/")?type:"video/mp4"});
 }
 throw Error("O Drive redirecionou muitas vezes; não foi possível obter o arquivo.");
}
async function context(companyId,draftId){
 const r=await pool.query(`SELECT d.id,d.headline,d.primary_text,d.description,d.campaign_meta_id,d.adset_meta_id,
 d.meta_video_id,d.meta_creative_id,d.meta_ad_id,d.meta_publish_state,
 m.drive_url,m.name AS media_name,a.ad_account_id,a.facebook_page_id,a.instagram_id,a.facebook_page_status
 FROM creative_drafts d JOIN media m ON m.id=d.media_id AND m.company_id=d.company_id AND m.kind='video'
 JOIN meta_assets a ON a.company_id=d.company_id WHERE d.company_id=$1 AND d.id=$2`,[companyId,draftId]);
 return r.rows[0];
}
const failure=(res,e,stage)=>{
 if(e.meta)return res.status(502).json({error:"A Meta recusou a etapa "+stage+".",metaErrorCode:e.meta.code,metaErrorSubcode:e.meta.subcode,metaErrorDetail:e.meta.detail});
 if(["TimeoutError","AbortError"].includes(e.name))return res.status(504).json({error:"Tempo limite na etapa "+stage+". Confira a Meta antes de tentar novamente."});
 return res.status(422).json({error:clean(e.message)||"Não foi possível concluir."});
};
// Read-only diagnostic: expose IDs and matching status, never credentials.
router.get("/:companyId/meta-instagram-diagnostic",access,async(req,res)=>{
 const token=process.env.META_ACCESS_TOKEN;
 if(!token)return res.status(503).json({error:"Token Meta não configurado."});
 try{
  const r=await pool.query("SELECT ad_account_id,instagram_id,facebook_page_id FROM meta_assets WHERE company_id=$1",[req.params.companyId]);
  const a=r.rows[0];
  if(!a||!digits(a.ad_account_id))return res.status(422).json({error:"Cadastre uma conta de anúncios válida."});
  const [adAccounts,page]=await Promise.allSettled([
   graph("act_"+a.ad_account_id+"/instagram_accounts?fields=id,username&limit=100",token),
   digits(a.facebook_page_id)?graph(a.facebook_page_id+"?fields=id,instagram_business_account{id,username},connected_instagram_account{id,username}",token):Promise.resolve(null)
  ]);
  const accounts=adAccounts.status==="fulfilled"&&Array.isArray(adAccounts.value.data)?adAccounts.value.data:[];
  const safeAccounts=accounts.map(x=>({id:String(x.id||""),username:typeof x.username==="string"?x.username:null}));
  const pageData=page.status==="fulfilled"?page.value:null;
  const safeIg=x=>x&&x.id?{id:String(x.id),username:typeof x.username==="string"?x.username:null}:null;
  const inventoryId=String(a.instagram_id||"");
  return res.json({
   inventory:{instagramId:inventoryId,facebookPageId:a.facebook_page_id,adAccountId:a.ad_account_id},
   authorizedInstagramAccounts:safeAccounts,
   inventoryIdAuthorized:safeAccounts.some(x=>x.id===inventoryId),
   accountListHasNextPage:Boolean(adAccounts.status==="fulfilled"&&adAccounts.value.paging?.next),
   pageInstagram:pageData?{businessAccount:safeIg(pageData.instagram_business_account),connectedAccount:safeIg(pageData.connected_instagram_account)}:null,
   checks:{
    adAccountInstagramQuery:adAccounts.status,
    facebookPageQuery:page.status,
    adAccountError:adAccounts.status==="rejected"?(adAccounts.reason.meta||{detail:"Falha na consulta."}):null,
    facebookPageError:page.status==="rejected"?(page.reason.meta||{detail:"Falha na consulta."}):null
   },
   note:"Diagnóstico somente leitura. IDs da API de anúncios e do perfil podem ser diferentes; não atualize o inventário sem confirmar."
  });
 }catch(e){return failure(res,e,"de diagnóstico do Instagram");}
});
router.post("/:companyId/creative-drafts/:draftId/meta-video",access,async(req,res,next)=>{
 if(process.env.META_VIDEO_UPLOAD_ENABLED!=="true")return res.status(503).json({error:"Envio de vídeo desabilitado. Configure META_VIDEO_UPLOAD_ENABLED=true no Railway após revisar o fluxo."});
 if(!uuid.test(req.params.draftId)||req.body?.confirm!==true)return res.status(400).json({error:"Selecione o rascunho e confirme o envio do vídeo."});
 const token=process.env.META_ACCESS_TOKEN;if(!token)return res.status(503).json({error:"Token Meta não configurado."});
 const client=await pool.connect();let locked=false;
 try{
  const lock=await client.query("SELECT pg_try_advisory_lock(hashtext($1),hashtext($2)) AS locked",[req.params.companyId,req.params.draftId]);
  locked=lock.rows[0].locked;if(!locked)return res.status(409).json({error:"Este rascunho já está sendo processado. Aguarde."});
  const d=await context(req.params.companyId,req.params.draftId);
  if(!d)return res.status(404).json({error:"Rascunho ou conta Meta não encontrados."});
  if(d.meta_video_id)return res.json({videoId:d.meta_video_id,reused:true});
  if(!digits(d.ad_account_id))return res.status(422).json({error:"Conta de anúncios inválida."});
  const fileId=driveId(d.drive_url);
  const blob=await downloadDrive(fileId);
  const form=new FormData();form.set("source",blob,"video.mp4");form.set("title",d.media_name.slice(0,100));
  const result=await graph("act_"+d.ad_account_id+"/advideos",token,{method:"POST",body:form});
  if(!digits(String(result.id||"")))throw Error("Meta não confirmou o ID do vídeo. Verifique a biblioteca antes de reenviar.");
  await client.query("UPDATE creative_drafts SET meta_video_id=$3,meta_publish_state='video_uploaded',meta_last_error=NULL,updated_at=NOW() WHERE company_id=$1 AND id=$2",[req.params.companyId,req.params.draftId,String(result.id)]);
  return res.status(201).json({videoId:String(result.id),status:"uploaded"});
 }catch(e){return failure(res,e,"de envio do vídeo");}
 finally{if(locked)await client.query("SELECT pg_advisory_unlock(hashtext($1),hashtext($2))",[req.params.companyId,req.params.draftId]);client.release();}
});
router.post("/:companyId/creative-drafts/:draftId/meta-paused-ad",access,async(req,res,next)=>{
 if(process.env.META_PAUSED_AD_CREATION_ENABLED!=="true")return res.status(503).json({error:"Criação de anúncios desabilitada. Configure META_PAUSED_AD_CREATION_ENABLED=true no Railway após revisar o fluxo."});
 if(!uuid.test(req.params.draftId)||req.body?.confirm!==true)return res.status(400).json({error:"Confirme expressamente a criação do anúncio pausado."});
 const token=process.env.META_ACCESS_TOKEN;if(!token)return res.status(503).json({error:"Token Meta não configurado."});
 const client=await pool.connect();let locked=false;
 try{
  const lock=await client.query("SELECT pg_try_advisory_lock(hashtext($1),hashtext($2)) AS locked",[req.params.companyId,req.params.draftId]);
  locked=lock.rows[0].locked;if(!locked)return res.status(409).json({error:"Este rascunho já está sendo processado."});
  const d=await context(req.params.companyId,req.params.draftId);
  if(!d)return res.status(404).json({error:"Rascunho ou conta Meta não encontrados."});
  if(d.meta_ad_id)return res.json({adId:d.meta_ad_id,status:"PAUSED",reused:true});
  if(!digits(d.meta_video_id)||!digits(d.ad_account_id)||!digits(d.campaign_meta_id)||!digits(d.adset_meta_id))return res.status(422).json({error:"Envie o vídeo e vincule campanha e público antes de criar o anúncio."});
  if(!digits(d.facebook_page_id)||d.facebook_page_status!=="approved")return res.status(422).json({error:"É necessário vincular uma Página do Facebook aprovada para criar o anúncio."});
  const [campaign,adset]=await Promise.all([
   graph(d.campaign_meta_id+"?fields=id,account_id,status,objective",token),
   graph(d.adset_meta_id+"?fields=id,account_id,campaign_id,status",token)
  ]);
  if(String(campaign.account_id).replace(/^act_/,"")!==d.ad_account_id||campaign.status!=="PAUSED"||
     String(adset.account_id).replace(/^act_/,"")!==d.ad_account_id||adset.campaign_id!==d.campaign_meta_id||adset.status!=="PAUSED")
    return res.status(422).json({error:"Campanha e público precisam pertencer à mesma conta e estar pausados."});
  let creativeId=d.meta_creative_id;
  if(!creativeId){
   const spec={page_id:d.facebook_page_id,video_data:{video_id:d.meta_video_id,message:d.primary_text,title:d.headline}};
   if(d.description)spec.video_data.link_description=d.description;
   // Never assume an inventory Instagram ID is a valid advertising actor.
   // Meta can expose different IDs for an Instagram profile and its ad actor.
   if(d.instagram_id){
    if(!digits(d.instagram_id))return res.status(422).json({error:"ID do Instagram inválido no inventário Meta."});
    const linked=await graph("act_"+d.ad_account_id+"/instagram_accounts?fields=id,username&limit=100",token);
    const accounts=Array.isArray(linked.data)?linked.data:[];
    const match=accounts.find(a=>String(a.id)===String(d.instagram_id));
    if(!match)return res.status(422).json({error:"O Instagram cadastrado não foi encontrado entre as contas de Instagram autorizadas para esta conta de anúncios. Verifique a vinculação Página–Instagram no Meta Business Suite e confirme o ID de publicidade antes de repetir."});
    // Use the verified Instagram user identity on the creative itself.
    // An authorized account ID is not necessarily a legacy instagram_actor_id.
   }
   const creativeParams={name:d.headline.slice(0,120),object_story_spec:JSON.stringify(spec)};
   if(d.instagram_id)creativeParams.instagram_user_id=String(d.instagram_id);
   const body=new URLSearchParams(creativeParams);
   const creative=await graph("act_"+d.ad_account_id+"/adcreatives",token,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
   creativeId=String(creative.id||"");if(!digits(creativeId))throw Error("Meta não confirmou o criativo. Confira a conta antes de repetir.");
   await client.query("UPDATE creative_drafts SET meta_creative_id=$3,meta_publish_state='creative_created',updated_at=NOW() WHERE company_id=$1 AND id=$2",[req.params.companyId,req.params.draftId,creativeId]);
  }
  const body=new URLSearchParams({name:d.headline.slice(0,120),adset_id:d.adset_meta_id,creative:JSON.stringify({creative_id:creativeId}),status:"PAUSED"});
  const ad=await graph("act_"+d.ad_account_id+"/ads",token,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  const adId=String(ad.id||"");if(!digits(adId))throw Error("Meta não confirmou o anúncio. Confira a lista antes de repetir.");
  await client.query("UPDATE creative_drafts SET meta_ad_id=$3,meta_publish_state='ad_paused',updated_at=NOW() WHERE company_id=$1 AND id=$2",[req.params.companyId,req.params.draftId,adId]);
  res.status(201).json({adId,status:"PAUSED"});
 }catch(e){return failure(res,e,"de criação do anúncio pausado");}
 finally{if(locked)await client.query("SELECT pg_advisory_unlock(hashtext($1),hashtext($2))",[req.params.companyId,req.params.draftId]);client.release();}
});
module.exports=router;
