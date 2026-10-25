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
