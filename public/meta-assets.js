const $ = id => document.getElementById(id);
const fields = [
 ['businessId','ID do portfólio empresarial'],
 ['adAccountId','ID da conta de anúncios (somente números)'],
 ['instagramId','ID do Instagram'],
 ['instagramHandle','Instagram @'],
 ['facebookPageId','ID da página Facebook'],
 ['facebookPageStatus','Acesso à página'],
 ['whatsappBusinessId','ID da conta WhatsApp Business (WABA)'],
 ['whatsappPhone','Número WhatsApp'],
 ['notes','Observações']
];
let companies=[];
let busy=false;
function feedback(message){$('feedback').textContent=message;}
function endpoint(){return '/api/companies/'+encodeURIComponent($('meta-company').value)+'/meta-assets';}
async function request(url,method='GET',body){
 const r=await fetch(url,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 if(r.status===401){location.assign('/login');throw Error('Sessão expirada.');}
 const data=await r.json();if(!r.ok)throw Error(data.error||'Erro ao carregar.');return data;
}
for(const [id,label] of fields){
 const wrapper=document.createElement('label');wrapper.style.display='grid';wrapper.style.gap='8px';wrapper.textContent=label;
 const input=document.createElement(id==='notes'?'textarea':id==='facebookPageStatus'?'select':'input');
 input.id=id;input.name=id;
 if(id==='facebookPageStatus') for(const [value,text] of [['unknown','Não verificado'],['pending','Acesso pendente'],['approved','Acesso aprovado']]){const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option);}
 else if(id==='notes')input.maxLength=500;
 else {input.maxLength=id==='instagramHandle'?120:id==='whatsappPhone'?25:30; if(['businessId','adAccountId','instagramId','facebookPageId','whatsappBusinessId'].includes(id))input.pattern='[0-9]*';}
 wrapper.append(input);$('fields').append(wrapper);
}
async function load(){
 const id=$('meta-company').value;if(!id)return;
 feedback('Carregando...');$('save').disabled=true;
 try{
 const data=await request(endpoint());
 if(id!==$('meta-company').value)return;
 for(const [field] of fields)$(field).value=data.assets[field]|| (field==='facebookPageStatus'?'unknown':'');
 feedback('Inventário carregado. IDs não são verificados automaticamente na Meta.');
 }catch(e){feedback(e.message);}
 finally{$('save').disabled=!['owner','admin'].includes(companies.find(c=>c.id===$('meta-company').value)?.role);}
}
$('meta-company').addEventListener('change',load);
$('assets-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 busy=true;$('save').disabled=true;feedback('Salvando...');
 try{const data=Object.fromEntries(fields.map(([id])=>[id,$(id).value.trim()]));await request(endpoint(),'PUT',data);feedback('Inventário salvo com sucesso.');}
 catch(e){feedback(e.message);}
 finally{busy=false;$('save').disabled=!['owner','admin'].includes(companies.find(c=>c.id===$('meta-company').value)?.role);}
});
(async()=>{try{const data=await request('/api/me');companies=data.companies;for(const c of companies){const option=document.createElement('option');option.value=c.id;option.textContent=c.name;$('meta-company').append(option);}await load();window.dispatchEvent(new Event('workspace-company-ready'));}catch(e){feedback(e.message);}})();
