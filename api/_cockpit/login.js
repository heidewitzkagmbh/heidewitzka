'use strict';
const form=document.querySelector('#login-form');
const status=document.querySelector('#login-status');
fetch('/api/cockpit',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(data=>{
  if(data.authenticated){location.replace('/intern'+location.search);return;}
  status.textContent=data.configured?'Der interne Zugang ist bereit.':'Der Zugang ist noch nicht eingerichtet.';
  if(!data.configured){document.querySelector('#login-submit').disabled=true;document.querySelector('#password').disabled=true;}
}).catch(()=>{status.textContent='Der Anmeldedienst ist derzeit nicht erreichbar.';});
form.addEventListener('submit',async event=>{
  event.preventDefault();const button=document.querySelector('#login-submit');button.disabled=true;status.textContent='Anmeldung läuft …';
  try{
    const response=await fetch('/api/cockpit',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.querySelector('#password').value})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.message||'Anmeldung fehlgeschlagen.');
    document.querySelector('#password').value='';location.replace('/intern'+location.search);
  }catch(error){status.textContent=error.message;status.classList.add('error');button.disabled=false;}
});
