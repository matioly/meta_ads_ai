(function(){
 const chosen=new Map();let timer,sequence=0;
 const input=document.querySelector("#adset-interest-search"),results=document.querySelector("#adset-interest-results"),selected=document.querySelector("#adset-selected-interests");
 window.getAdsetInterests=()=>Array.from(chosen,([id,name])=>({id,name}));
 function render(){selected.replaceChildren();for(const [id,name] of chosen){const button=document.createElement("button");button.type="button";button.className="secondary";button.style.margin="4px";button.textContent=name+" ×";button.addEventListener("click",()=>{chosen.delete(id);render()});selected.append(button);}}
 input.addEventListener("input",()=>{
  clearTimeout(timer);const q=input.value.trim(),seq=++sequence;results.replaceChildren();
  if(q.length<2)return;
  timer=setTimeout(async()=>{
   try{
    const company=document.querySelector("#company-select")?.value||document.querySelector("#company")?.value||window.select?.value;
    if(!company){results.textContent="Selecione uma clínica.";return;}
    const response=await fetch("/api/companies/"+encodeURIComponent(company)+"/meta-interests?q="+encodeURIComponent(q),{credentials:"same-origin"});
    const data=await response.json();if(seq!==sequence)return;
    if(!response.ok)throw Error(data.error||"Falha na busca");
    results.replaceChildren();
    for(const item of data.items||[]){if(chosen.has(item.id))continue;const button=document.createElement("button");button.type="button";button.className="secondary";button.style.margin="4px";button.textContent="+ "+item.name;button.addEventListener("click",()=>{chosen.set(item.id,item.name);render();button.remove();document.querySelector("#adset-preview-form").dispatchEvent(new Event("input",{bubbles:true}))});results.append(button);}
    if(!results.children.length)results.textContent="Nenhum interesse disponível para esta busca.";
   }catch(e){if(seq===sequence)results.textContent=e.message;}
  },350);
 });
})();