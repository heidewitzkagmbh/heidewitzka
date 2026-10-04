'use strict';
const { randomUUID } = require('node:crypto');
class TaskError extends Error { constructor(status,message){super(message);this.status=status;} }
const fail=message=>{throw new TaskError(400,message);};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fields(input){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('Ungültige Aufgabe.');
  const allowed=['title','status','labels','plannedDay','deadline','durationMinutes','priority','projectId','goalId','note'];
  if(Object.keys(input).some(k=>!allowed.includes(k)))fail('Unbekanntes Aufgabenfeld.');
  const text=(key,max,required=false)=>{const v=input[key]??'';if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail('Bitte gültige Texte eingeben.');return v.trim();};
  const date=key=>{const v=text(key,10);if(v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v))fail('Bitte ein gültiges Datum eingeben.');return v;};
  const status=input.status??'inbox';if(!['inbox','open','someday','done'].includes(status))fail('Ungültiger Status.');
  const priority=input.priority??'normal';if(!['normal','high'].includes(priority))fail('Ungültige Priorität.');
  const labels=input.labels??[];if(!Array.isArray(labels)||labels.length>12||labels.some(v=>typeof v!=='string'||!v.trim()||v.length>40))fail('Bitte höchstens zwölf kurze Labels eingeben.');
  const durationMinutes=input.durationMinutes??null;if(durationMinutes!==null&&(!Number.isInteger(durationMinutes)||durationMinutes<1||durationMinutes>1440))fail('Dauer muss zwischen 1 und 1440 Minuten liegen.');
  return {title:text('title',240,true),status,labels:[...new Set(labels.map(v=>v.trim()))],plannedDay:date('plannedDay'),deadline:date('deadline'),durationMinutes,priority,projectId:text('projectId',100),goalId:text('goalId',100),note:text('note',4000)};
}
function createTask(input,id=randomUUID()){if(!UUID.test(id))fail('Ungültige Aufgaben-ID.');const stamp=new Date().toISOString();const data=fields(input);return {...data,id,version:1,createdAt:stamp,updatedAt:stamp,completedAt:data.status==='done'?stamp:null};}
function updateTask(previous,input){const data=fields(input);const stamp=new Date().toISOString();return {...previous,...data,version:previous.version+1,updatedAt:stamp,completedAt:data.status==='done'?(previous.completedAt||stamp):null};}
module.exports={TaskError,fields,createTask,updateTask,UUID};
