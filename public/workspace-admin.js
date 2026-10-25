(function(){
 const $=id=>document.getElementById(id);
 const current=()=>$("meta-company").value;
 let roles=[];
 async function api(path,method="GET",body){
  const r=await fetch("/api/"+path,{method,credentials:"same-origin",cache:"no-store",headers:method==="GET"?{}:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
  if(r.status===401){location.replace("/login");throw Error("Sessão expirada.");}
  const data=await r.json();if(!r.ok)throw Error(data.error||"Não foi possível concluir.");return data;
 }
 async function syncRoles(){
  const me=await api("me");roles=me.companies||[];
  const isOwner=roles.some(c=>c.role==="owner");
  $("workspace-form").hidden=!isOwner;
  await loadUsers();
 }
 async function loadUsers(){
  const id=current(),mine=roles.find(c=>c.id===id);
  $("workspace-user-form").hidden=mine?.role!=="owner";
  $("workspace-users").replaceChildren();
  if(!id)return;
  try{
   const data=await api("workspaces/"+encodeURIComponent(id)+"/users");
   const ul=document.createElement("ul");
   for(const user of data.users){const li=document.createElement("li");li.textContent=user.name+" · "+user.email+" · "+({owner:"Proprietário",admin:"Administrador",viewer:"Visualizador"}[user.role]||user.role);ul.append(li);}
   $("workspace-users").append(ul);
  }catch(e){$("user-feedback").textContent=e.message;}
 }
 $("workspace-form").addEventListener("submit",async e=>{
  e.preventDefault();const btn=e.submitter;btn.disabled=true;$("workspace-feedback").textContent="Cadastrando clínica…";
  try{
   const data=await api("workspaces","POST",{name:$("workspace-name").value,city:$("workspace-city").value,state:$("workspace-state").value});
   $("workspace-feedback").textContent="Clínica "+data.company.name+" criada. Atualize a página para selecioná-la e configurar os ativos Meta.";
   $("workspace-form").reset();
  }catch(e){$("workspace-feedback").textContent=e.message;}finally{btn.disabled=false;}
 });
 $("workspace-user-form").addEventListener("submit",async e=>{
  e.preventDefault();const btn=e.submitter;btn.disabled=true;$("user-feedback").textContent="Cadastrando usuário…";
  try{
   await api("workspaces/"+encodeURIComponent(current())+"/users","POST",{name:$("new-user-name").value,email:$("new-user-email").value,password:$("new-user-password").value,role:$("new-user-role").value});
   $("new-user-password").value="";$("user-feedback").textContent="Usuário cadastrado. Ele já pode entrar com o e-mail e a senha inicial.";
   await loadUsers();
  }catch(e){$("user-feedback").textContent=e.message;}finally{btn.disabled=false;}
 });
 $("meta-company").addEventListener("change",loadUsers);
 window.addEventListener("workspace-company-ready",syncRoles);
})();
