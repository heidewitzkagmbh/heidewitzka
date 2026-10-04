'use strict';
const {DatabaseSync}=require('node:sqlite');
const {mkdirSync,chmodSync}=require('node:fs');
const {join}=require('node:path');
const {TaskError,fields,createTask,updateTask,UUID}=require('../api/_personal/task-model');
function openStore(directory){
  if(process.env.VERCEL)throw new Error('Lokale Speicherung darf nicht auf Vercel laufen.');
  mkdirSync(directory,{recursive:true,mode:0o700});chmodSync(directory,0o700);
  const path=join(directory,'tasks.sqlite3');const db=new DatabaseSync(path,{timeout:5000});chmodSync(path,0o600);
  db.exec(`PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,payload TEXT NOT NULL,version INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY,task_id TEXT,payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS login_attempts(id INTEGER PRIMARY KEY CHECK(id=1),count INTEGER NOT NULL,reset INTEGER NOT NULL);
    PRAGMA user_version=1;`);
  function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}}
  return {
    list(){return db.prepare('SELECT payload FROM tasks ORDER BY rowid DESC').all().map(r=>JSON.parse(r.payload));},
    create(input,id){const task=createTask(input,id);return transaction(()=>{
      const old=db.prepare('SELECT payload FROM tasks WHERE id=?').get(task.id);
      if(old){const previous=JSON.parse(old.payload);if(JSON.stringify(fields(previousFields(previous)))!==JSON.stringify(fields(input)))throw new TaskError(409,'Diese Aufgaben-ID wurde schon für eine andere Eingabe verwendet.');return previous;}
      db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(task.id,JSON.stringify(task),task.version);return task;
    });},
    update(id,version,input){if(typeof id!=='string'||!UUID.test(id)||!Number.isInteger(version)||version<1)throw new TaskError(400,'Ungültiger Datenstand.');return transaction(()=>{
      const row=db.prepare('SELECT payload,version FROM tasks WHERE id=?').get(id);if(!row)throw new TaskError(404,'Aufgabe nicht gefunden.');
      if(row.version!==version)throw new TaskError(409,'Die Aufgabe wurde in einem anderen Fenster geändert. Bitte neu laden; deine Eingabe bleibt erhalten.');
      const next=updateTask(JSON.parse(row.payload),input);
      db.prepare('INSERT INTO history(task_id,payload) VALUES(?,?)').run(id,row.payload);
      db.prepare('UPDATE tasks SET payload=?,version=? WHERE id=? AND version=?').run(JSON.stringify(next),next.version,id,version);
      db.exec('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY id DESC LIMIT 1000)');return next;
    });},
    allowLogin(){return transaction(()=>{const now=Date.now();const row=db.prepare('SELECT count,reset FROM login_attempts WHERE id=1').get();if(row&&row.reset>now&&row.count>=10)return false;db.prepare('INSERT OR REPLACE INTO login_attempts VALUES(1,?,?)').run(row&&row.reset>now?row.count+1:1,row&&row.reset>now?row.reset:now+15*60*1000);return true;});},
    close(){db.close();}
  };
}
function previousFields(task){const {id,version,createdAt,updatedAt,completedAt,...data}=task;return data;}
module.exports={openStore};
