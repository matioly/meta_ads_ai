// Navegação progressiva sem alterar os formulários nem os contratos da API.
document.addEventListener('DOMContentLoaded',()=>{
  const panels=[...document.querySelectorAll('.workflow-accordion')];
  const openPanel=(panel)=>{
    if(!panel)return;
    panels.forEach(other=>{if(other!==panel)other.open=false;});
    panel.open=true;
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  };
  panels.forEach(panel=>panel.addEventListener('toggle',()=>{
    if(panel.open)panels.forEach(other=>{if(other!==panel)other.open=false;});
  }));
  document.querySelectorAll('[data-next]').forEach(button=>{
    button.addEventListener('click',()=>openPanel(document.getElementById(button.dataset.next)));
  });
  const first=document.getElementById('workflow-creative');
  if(first)first.open=true;
});
