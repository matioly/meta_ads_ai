const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {diagnose}=require("../src/meta-ad-diagnostic");
const d={ad_account_id:"123456789012",campaign_meta_id:"223456789012",adset_meta_id:"323456789012",meta_video_id:"423456789012",facebook_page_id:"523456789012",facebook_page_status:"approved"};
const campaign={account_id:d.ad_account_id,status:"PAUSED",objective:"OUTCOME_TRAFFIC"};
const adset={account_id:d.ad_account_id,campaign_id:d.campaign_meta_id,status:"PAUSED",destination_type:"WEBSITE",optimization_goal:"LINK_CLICKS"};
test("distinguishes landing page views from link clicks without mislabeling campaign",()=>{
 const result=diagnose(d,campaign,{...adset,optimization_goal:"LANDING_PAGE_VIEWS"});
 assert.equal(result.compatible,false);
 assert.deepEqual(result.checks.filter(x=>!x.ok).map(x=>x.field),["adsetOptimizationGoal"]);
 assert.equal(result.checks.at(-1).actual,"LANDING_PAGE_VIEWS");
});
test("compatible configuration; missing values, foreign account and active status block",()=>{
 assert.equal(diagnose(d,campaign,adset).compatible,true);
 for(const change of [{destination_type:undefined},{campaign_id:"999999999999"},{account_id:"999999999999"},{status:"ACTIVE"}]){
  assert.equal(diagnose(d,campaign,{...adset,...change}).compatible,false);
 }
 const secret="EAAsecret_token_value";
 const output=JSON.stringify(diagnose(d,{...campaign,objective:secret,access_token:secret},adset));
 assert.equal(output.includes(secret),false);
});
test("read-only diagnostic uses only GET; incompatible 5B never writes to Meta",async()=>{
 const routes={};let calls=[];
 const router={get:(path,...handlers)=>routes["GET "+path]=handlers.at(-1),post:(path,...handlers)=>routes["POST "+path]=handlers.at(-1)};
 const pool={query:async()=>({rows:[d]}),connect:async()=>({query:async()=>({rows:[{locked:true}]}),release(){}})};
 const sandbox={module:{exports:{}},require:name=>{
  if(name==="express")return {Router:()=>router};
  if(name==="./db")return pool;
  if(name==="./company-access")return ()=>{};
  if(name==="./media-validation")return {uuid:/^valid$/};
  if(name==="./meta-ad-diagnostic")return {diagnose};
  throw Error(name);
 },process:{env:{META_ACCESS_TOKEN:"test",META_PAUSED_AD_CREATION_ENABLED:"true"}},AbortSignal,
 fetch:async(url,options)=>{calls.push({url,method:options.method||"GET"});return {ok:true,json:async()=>url.includes(d.campaign_meta_id)?campaign:{...adset,optimization_goal:"LANDING_PAGE_VIEWS"}};}};
 vm.runInNewContext(fs.readFileSync(require.resolve("../src/meta-video-ads"),"utf8"),sandbox);
 const req={params:{companyId:"company",draftId:"valid"},body:{confirm:true}};
 const res={code:200,set(){return this;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 await routes["GET /:companyId/creative-drafts/:draftId/meta-ad-diagnostic"](req,res);
 assert.equal(res.code,200);assert.equal(res.body.diagnostic.compatible,false);
 assert.equal(calls.length,2);assert.ok(calls.every(c=>c.method==="GET"));
 calls=[];
 await routes["POST /:companyId/creative-drafts/:draftId/meta-paused-ad"](req,res);
 assert.equal(res.code,422);assert.equal(res.body.diagnostic.checks.at(-1).actual,"LANDING_PAGE_VIEWS");
 assert.equal(calls.length,2);assert.ok(calls.every(c=>c.method==="GET"));
});

test("UNDEFINED permits only traffic/link clicks and preserves the actual value and warning",()=>{
 const candidate={...adset,destination_type:"UNDEFINED"};
 const result=diagnose(d,campaign,candidate);
 assert.equal(result.compatible,true);
 const dest=result.checks.find(c=>c.field==="adsetDestinationType");
 assert.equal(dest.actual,"UNDEFINED");assert.ok(dest.warning);
 for(const change of [{status:"ACTIVE"},{campaign_id:"999999999999"},{account_id:"999999999999"},{optimization_goal:"LANDING_PAGE_VIEWS"}]){
  assert.equal(diagnose(d,campaign,{...candidate,...change}).compatible,false);
 }
 assert.equal(diagnose(d,{...campaign,objective:"OUTCOME_ENGAGEMENT"},candidate).compatible,false);
 for(const destination_type of [null,undefined,"","MESSENGER","APP","WHATSAPP","UNKNOWN"]){
  assert.equal(diagnose(d,campaign,{...adset,destination_type}).compatible,false);
 }
 assert.equal(diagnose(d,campaign,adset).checks.some(c=>c.warning),false);
});
test("UNDEFINED flow creates explicit website CTA and PAUSED ad; invalid URL prevents writes",async()=>{
 const routes={},calls=[],writes=[];
 const draft={...d,headline:"Teste",primary_text:"Texto"};
 const router={get(){},post:(path,...handlers)=>routes[path]=handlers.at(-1)};
 const pool={query:async()=>({rows:[draft]}),connect:async()=>({
  query:async(sql,args)=>{if(sql.startsWith("UPDATE"))writes.push({sql,args});return {rows:[{locked:true}]};},release(){}
 })};
 const env={META_ACCESS_TOKEN:"test",META_PAUSED_AD_CREATION_ENABLED:"true",META_WEBSITE_URL:"https://alpsclinic.com"};
 const sandbox={module:{exports:{}},require:name=>{
  if(name==="express")return {Router:()=>router};
  if(name==="./db")return pool;
  if(name==="./company-access")return ()=>{};
  if(name==="./media-validation")return {uuid:/^valid$/};
  if(name==="./meta-ad-diagnostic")return {diagnose};
  throw Error(name);
 },process:{env},AbortSignal,URL,URLSearchParams,
 fetch:async(url,options)=>{
  calls.push({url,options});
  let data;
  if(url.includes(d.campaign_meta_id))data=campaign;
  else if(url.includes(d.adset_meta_id))data={...adset,destination_type:"UNDEFINED"};
  else if(url.includes("/thumbnails"))data={data:[{uri:"https://example.com/cover.jpg",is_preferred:true}]};
  else if(url.endsWith("/adcreatives"))data={id:"623456789012"};
  else if(url.endsWith("/ads"))data={id:"723456789012"};
  else throw Error("Unexpected request");
  return {ok:true,json:async()=>data};
 }};
 vm.runInNewContext(fs.readFileSync(require.resolve("../src/meta-video-ads"),"utf8"),sandbox);
 const req={params:{companyId:"company",draftId:"valid"},body:{confirm:true}};
 const res={status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 await routes["/:companyId/creative-drafts/:draftId/meta-paused-ad"](req,res);
 assert.equal(res.code,201);assert.equal(res.body.status,"PAUSED");
 const creative=calls.find(c=>c.url.endsWith("/adcreatives"));
 const spec=JSON.parse(creative.options.body.get("object_story_spec"));
 assert.equal(spec.video_data.call_to_action.type,"LEARN_MORE");
 assert.equal(spec.video_data.call_to_action.value.link,"https://alpsclinic.com/");
 assert.equal(calls.find(c=>c.url.endsWith("/ads")).options.body.get("status"),"PAUSED");
 assert.equal(writes.length,2);
 calls.length=0;writes.length=0;env.META_WEBSITE_URL="http://alpsclinic.com";
 await routes["/:companyId/creative-drafts/:draftId/meta-paused-ad"](req,res);
 assert.equal(res.code,422);assert.ok(calls.every(c=>!c.options.method));assert.equal(writes.length,0);
});
