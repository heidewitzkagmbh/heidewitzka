'use strict';
const {valid}=require('./_cockpit/session');
const {TaskError}=require('./_personal/task-model');
// Storage is injected by the loopback server. The cloud handler deliberately has no file store.
function createHandler(store=null){return async function(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex, nofollow');
  const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
  if(!valid(req,process.env.COCKPIT_PASSWORD||''))return send(401,{message:'Bitte erneut anmelden.'});
  if(!['GET','POST','PATCH'].includes(req.method)){res.setHeader('Allow','GET, POST, PATCH');return send(405,{message:'Methode nicht erlaubt.'});}
  if(req.method!=='GET'){
    let origin;try{origin=new URL(req.headers.origin||'');}catch{return send(403,{message:'Ungültiger Ursprung.'});}
    if(origin.protocol!=='https:'||origin.host!==req.headers.host)return send(403,{message:'Ungültiger Ursprung.'});
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(415,{message:'JSON erforderlich.'});
  }
  if(!store)return send(503,{message:'Dauerhafte Online-Speicherung ist noch nicht eingerichtet. Bitte die lokale Version verwenden.',storage:{available:false,notionConnected:false,voiceConnected:false}});
  try{
    if(req.method==='GET')return send(200,{tasks:store.list(),storage:{available:true,kind:'local-sqlite',notionConnected:false,voiceConnected:false}});
    let body=req.body;if(typeof body==='string'){if(Buffer.byteLength(body)>16384)throw new TaskError(413,'Anfrage zu groß.');try{body=JSON.parse(body);}catch{throw new TaskError(400,'Ungültige Anfrage.');}}
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['id','version','task'].includes(k)))throw new TaskError(400,'Ungültige Anfrage.');
    if(req.method==='POST')return send(201,{task:store.create(body.task,body.id)});
    return send(200,{task:store.update(body.id,body.version,body.task)});
  }catch(e){return send(e instanceof TaskError?e.status:503,{message:e instanceof TaskError?e.message:'Speicherung fehlgeschlagen. Deine Eingabe bleibt erhalten.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
