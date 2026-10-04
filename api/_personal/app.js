'use strict';
const $=id=>document.getElementById(id);
const state={tasks:[],filter:'all',available:false,editing:null,pendingId:null,busy:false};
const statusNames={inbox:'Eingang',open:'Eingeordnet',someday:'Später vielleicht',done:'Erledigt'};
const day=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date());
$('today').textContent=new Intl.DateTimeFormat('de-DE',{dateStyle:'full',timeZone:'Europe/Berlin'}).format(new Date());
function message(id,text,error=false){$(id).textContent=text;$(id).classList.toggle('error',error);}
async function request(method,body){
  const response=await fetch('/api/personal-tasks',{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  const data=await response.json();if(!response.ok){const e=new Error(data.message||'Anfrage fehlgeschlagen.');e.status=response.status;throw e;}return data;
}
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function setEnabled(){for(const id of ['quick-title','add','export'])$(id).disabled=!state.available||state.busy;document.querySelectorAll('.task button,.task input').forEach(n=>n.disabled=state.busy);}
function render(){
  const query=$('search').value.trim().toLocaleLowerCase('de');
  const tasks=state.tasks.filter(t=>(state.filter==='all'?['inbox','open'].includes(t.status):t.status===state.filter)&&[t.title,t.note,...t.labels].join(' ').toLocaleLowerCase('de').includes(query));
  $('count').textContent=String(tasks.length);$('task-list').replaceChildren();$('task-list').setAttribute('aria-busy','false');
  if(!tasks.length){const empty=el('div',undefined,'empty');empty.append(el('h3',state.available?'Hier ist Platz.':'Speicher noch nicht verfügbar.'),el('p',state.available?(state.tasks.length?'Für diesen Filter gibt es keine Aufgaben.':'Dein Eingang ist leer. Halte oben deinen ersten Gedanken fest.'):'Diese Ansicht enthält keine geladenen Aufgaben.'));$('task-list').append(empty);}
  for(const task of tasks){
    const row=el('article',undefined,'task'+(task.status==='done'?' done':''));
    const check=el('input');check.type='checkbox';check.checked=task.status==='done';check.setAttribute('aria-label',task.title+(check.checked?' wieder öffnen':' abhaken'));check.addEventListener('change',()=>toggle(task));
    const body=el('div',undefined,'task-body');body.append(el('h3',task.title));const meta=el('div',undefined,'meta');meta.append(el('span',statusNames[task.status]));if(task.priority==='high')meta.append(el('span','Wichtig','important'));
    for(const label of task.labels)meta.append(el('span',label));if(task.plannedDay)meta.append(el('span','Geplant: '+formatDate(task.plannedDay)));if(task.deadline)meta.append(el('span','Deadline: '+formatDate(task.deadline),task.deadline<day()&&task.status!=='done'?'overdue':''));if(task.durationMinutes)meta.append(el('span',task.durationMinutes+' Min.'));body.append(meta);if(task.note)body.append(el('p',task.note,'note'));
    const edit=el('button','Bearbeiten');edit.setAttribute('aria-label',task.title+' bearbeiten');edit.addEventListener('click',()=>openEditor(task));row.append(check,body,edit);$('task-list').append(row);
  }setEnabled();
}
function formatDate(value){return new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));}
function editable(task){const {id,version,createdAt,updatedAt,completedAt,...data}=task;return data;}
function replace(task){const index=state.tasks.findIndex(t=>t.id===task.id);if(index<0)state.tasks.unshift(task);else state.tasks[index]=task;render();}
async function load(){
  $('reload').disabled=true;message('feedback','Aufgaben werden geladen …');
  try{const data=await request('GET');state.tasks=data.tasks;state.available=true;$('storage-badge').textContent='Lokal · dauerhaft gespeichert';$('connection-note').textContent='Deine Aufgaben bleiben auf diesem Mac gespeichert. Notion und der ChatGPT-Sprachzugriff sind noch nicht verbunden.';render();message('feedback','Aktueller Speicherstand geladen.');}
  catch(e){state.available=false;state.tasks=[];$('storage-badge').textContent='Speicher nicht erreichbar';$('connection-note').textContent=e.message;render();message('feedback',e.message,true);}
  finally{$('reload').disabled=false;setEnabled();}
}
$('quick-form').addEventListener('submit',async e=>{
  e.preventDefault();if(state.busy||!state.available)return;state.busy=true;setEnabled();state.pendingId??=crypto.randomUUID();message('feedback','Wird gespeichert …');
  try{const data=await request('POST',{id:state.pendingId,task:{title:$('quick-title').value,status:'inbox'}});state.pendingId=null;$('quick-title').value='';replace(data.task);message('feedback','Im Eingang gespeichert.');}
  catch(error){message('feedback',error.message,true);}finally{state.busy=false;setEnabled();$('quick-title').focus();}
});
$('quick-title').addEventListener('input',()=>{state.pendingId=null;});
async function toggle(task){
  if(state.busy)return;state.busy=true;setEnabled();try{const data=await request('PATCH',{id:task.id,version:task.version,task:{...editable(task),status:task.status==='done'?'inbox':'done'}});replace(data.task);message('feedback',data.task.status==='done'?'Als erledigt gespeichert.':'Wieder geöffnet und gespeichert.');}catch(e){render();message('feedback',e.message,true);}finally{state.busy=false;setEnabled();}
}
function openEditor(task){
  state.editing=task;const map={title:'title',status:'status',priority:'priority',planned:'plannedDay',deadline:'deadline',duration:'durationMinutes',note:'note'};for(const [name,key] of Object.entries(map))$('edit-'+name).value=task[key]??'';$('edit-labels').value=task.labels.join(', ');message('edit-feedback','');$('editor').showModal();$('edit-title').focus();
}
function closeEditor(){if(!state.busy)$('editor').close();}
$('close-editor').addEventListener('click',closeEditor);$('cancel-editor').addEventListener('click',closeEditor);$('editor').addEventListener('cancel',e=>{if(state.busy)e.preventDefault();});
$('edit-form').addEventListener('submit',async e=>{
  e.preventDefault();if(state.busy)return;state.busy=true;$('save').disabled=true;message('edit-feedback','Wird gespeichert …');
  const task={...editable(state.editing),title:$('edit-title').value,status:$('edit-status').value,priority:$('edit-priority').value,plannedDay:$('edit-planned').value,deadline:$('edit-deadline').value,durationMinutes:$('edit-duration').value?Number($('edit-duration').value):null,labels:$('edit-labels').value.split(',').map(s=>s.trim()).filter(Boolean),note:$('edit-note').value};
  try{const data=await request('PATCH',{id:state.editing.id,version:state.editing.version,task});replace(data.task);$('editor').close();message('feedback','Änderungen dauerhaft gespeichert.');}catch(error){message('edit-feedback',error.message,true);}finally{state.busy=false;$('save').disabled=false;setEnabled();}
});
for(const button of document.querySelectorAll('[data-filter]'))button.addEventListener('click',()=>{state.filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();});
$('search').addEventListener('input',render);$('reload').addEventListener('click',load);
$('export').addEventListener('click',async()=>{try{const data=await request('GET');const url=URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),tasks:data.tasks},null,2)],{type:'application/json'}));const link=el('a');link.href=url;link.download='Aufgaben-Sicherung-'+day()+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('feedback','Sicherung heruntergeladen. Sie enthält private Daten.');}catch(e){message('feedback',e.message,true);}});
$('logout').addEventListener('click',async()=>{try{const r=await fetch('/api/cockpit',{method:'DELETE',credentials:'same-origin',headers:{'Content-Type':'application/json'}});if(!r.ok)throw new Error();state.tasks=[];location.replace('/intern/persoenlich');}catch{message('feedback','Abmelden fehlgeschlagen. Bitte erneut versuchen.',true);}});
load();
