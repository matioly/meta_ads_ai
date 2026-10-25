// Shared dashboard header: use the authenticated profile and company names.
document.addEventListener("DOMContentLoaded",async()=>{
 const logout=document.getElementById("logout");
 const company=document.getElementById("company");
 const selected=document.getElementById("meta-company");
 const label=document.getElementById("company-name");
 const user=document.getElementById("user-name");
 if(logout)logout.addEventListener("click",async()=>{
  logout.disabled=true;
  try{
   const r=await fetch("/api/logout",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}"});
   if(!r.ok&&r.status!==401)throw Error("Não foi possível sair.");
   location.replace("/login");
  }catch(e){logout.disabled=false;alert(e.message);}
 });
 try{
  const r=await fetch("/api/me",{credentials:"same-origin",cache:"no-store"});
  if(r.status===401){location.replace("/login");return;}
  if(!r.ok)throw Error("Não foi possível carregar o usuário.");
  const data=await r.json();
  user.textContent=data.user?.name||"Usuário";
  company.replaceChildren();
  for(const item of data.companies||[]){const option=document.createElement("option");option.value=item.id;option.textContent=item.name;company.append(option);}
  function syncHeader(){
   company.value=selected.value;
   label.textContent=selected.selectedOptions[0]?.textContent||company.selectedOptions[0]?.textContent||"Selecione uma clínica";
  }
  selected.addEventListener("change",syncHeader);
  company.addEventListener("change",()=>{selected.value=company.value;selected.dispatchEvent(new Event("change",{bubbles:true}));syncHeader();});
  if(selected.options.length&&selected.value)syncHeader();
  else{
   const observer=new MutationObserver(()=>{if(selected.value){syncHeader();observer.disconnect();}});
   observer.observe(selected,{childList:true});
  }
 }catch(e){user.textContent="Conta";label.textContent="Não foi possível carregar a clínica";}
});
