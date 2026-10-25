const express=require("express");
const bcrypt=require("bcryptjs");
const pool=require("./db");
const router=express.Router();
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function role(req,companyId){
 const {rows}=await pool.query("SELECT role FROM company_members WHERE company_id=$1 AND user_id=$2",[companyId,req.session.userId]);
 return rows[0]?.role||null;
}
router.post("/workspaces",async(req,res,next)=>{
 const name=typeof req.body?.name==="string"?req.body.name.trim():"";
 const city=typeof req.body?.city==="string"?req.body.city.trim():"";
 const state=typeof req.body?.state==="string"?req.body.state.trim().toUpperCase():"";
 if(!name||name.length>120||!city||city.length>120||!/^[A-Z]{2}$/.test(state))return res.status(400).json({error:"Informe nome, cidade e UF válida."});
 const client=await pool.connect();
 try{
  await client.query("BEGIN");
  const owner=await client.query("SELECT 1 FROM company_members WHERE user_id=$1 AND role='owner' LIMIT 1",[req.session.userId]);
  if(!owner.rowCount){await client.query("ROLLBACK");return res.status(403).json({error:"Somente proprietários podem criar espaços de trabalho."});}
  const c=await client.query("INSERT INTO companies(name,city,state) VALUES($1,$2,$3) RETURNING id,name,city,state",[name,city,state]);
  await client.query("INSERT INTO company_members(company_id,user_id,role) VALUES($1,$2,'owner')",[c.rows[0].id,req.session.userId]);
  await client.query("COMMIT");return res.status(201).json({company:c.rows[0]});
 }catch(e){await client.query("ROLLBACK").catch(()=>{});next(e);}finally{client.release();}
});
router.get("/workspaces/:companyId/users",async(req,res,next)=>{
 try{
  if(!uuid.test(req.params.companyId))return res.status(400).json({error:"Clínica inválida."});
  if(!await role(req,req.params.companyId))return res.status(403).json({error:"Sem acesso à clínica."});
  const {rows}=await pool.query("SELECT u.id,u.name,u.email,m.role FROM company_members m JOIN users u ON u.id=m.user_id WHERE m.company_id=$1 ORDER BY u.name",[req.params.companyId]);
  res.json({users:rows});
 }catch(e){next(e);}
});
router.post("/workspaces/:companyId/users",async(req,res,next)=>{
 const cid=req.params.companyId;
 if(!uuid.test(cid))return res.status(400).json({error:"Clínica inválida."});
 const name=typeof req.body?.name==="string"?req.body.name.trim():"";
 const email=typeof req.body?.email==="string"?req.body.email.trim().toLowerCase():"";
 const password=req.body?.password;
 const userRole=req.body?.role;
 if(!name||name.length>120||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!["admin","viewer"].includes(userRole)||typeof password!=="string"||password.length<12||Buffer.byteLength(password,"utf8")>72)return res.status(400).json({error:"Informe nome, e-mail, senha de 12 a 72 bytes e permissão válida."});
 try{
  if(await role(req,cid)!=="owner")return res.status(403).json({error:"Somente o proprietário pode adicionar usuários."});
  const hash=await bcrypt.hash(password,12);
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   let user=await client.query("SELECT id FROM users WHERE lower(email)=lower($1)",[email]);
   if(user.rowCount){await client.query("ROLLBACK");return res.status(409).json({error:"E-mail já cadastrado. O vínculo de usuários existentes será disponibilizado em outra etapa."});}
   user=await client.query("INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id",[name,email,hash]);
   await client.query("INSERT INTO company_members(company_id,user_id,role) VALUES($1,$2,$3)",[cid,user.rows[0].id,userRole]);
   await client.query("COMMIT");
   return res.status(201).json({user:{id:user.rows[0].id,name,email,role:userRole}});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});if(e.code==="23505")return res.status(409).json({error:"E-mail já cadastrado."});next(e);}finally{client.release();}
 }catch(e){next(e);}
});
module.exports=router;
