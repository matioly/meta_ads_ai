// The manager is a creation-only flow. The hidden company selector keeps
// existing campaign, audience and creative modules synchronized with the sidebar.
const select=document.querySelector("#meta-company");
async function get(url){
 const response=await fetch(url,{credentials:"same-origin",cache:"no-store"});
 if(response.status===401){location.replace("/login");throw Error("Sessão expirada.");}
 const data=await response.json();
 if(!response.ok)throw Error(data.error||"Falha na consulta.");
 return data;
}
(async()=>{
 try{
  const profile=await get("/api/me");
  select.replaceChildren();
  for(const company of profile.companies||[]){
   const option=document.createElement("option");option.value=company.id;option.textContent=company.name;select.append(option);
  }
  const preferred=profile.companies?.find(c=>c.name.toLowerCase().includes("alps"));
  if(preferred)select.value=preferred.id;
  if(select.value)select.dispatchEvent(new Event("meta-company-ready"));
 }catch(error){console.error("Não foi possível carregar as clínicas do gerenciador.",error);}
})();
