const { createHash, randomBytes } = require('node:crypto');
const { COOKIE, ttl, equal, sign, valid } = require('./_cockpit/session');
module.exports=async function handler(req,res){
res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
const password=process.env.COCKPIT_PASSWORD||'';const configured=password.length>=20;
if(req.method==='GET')return send(200,{configured,authenticated:configured&&valid(req,password)});
if(!['POST','DELETE'].includes(req.method)){res.setHeader('Allow','GET, POST, DELETE');return send(405,{message:'Methode nicht erlaubt.'});}
// Same-origin requests only; no forwarded host supplied by the caller is trusted.
let origin;try{origin=new URL(req.headers.origin||'');}catch{return send(403,{message:'Ungültige Anfrage.'});}
if(origin.protocol!=='https:'||origin.host!==req.headers.host)return send(403,{message:'Ungültige Anfrage.'});
if(req.method==='DELETE'){res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);return send(200,{ok:true});}
if(!configured)return send(503,{message:'Der persönliche Zugang ist noch nicht eingerichtet. Bitte nutze vorerst die Demo.'});
if(!String(req.headers['content-type']||'').startsWith('application/json'))return send(415,{message:'Ungültiges Anfrageformat.'});
let body=req.body;try{if(typeof body==='string')body=JSON.parse(body);}catch{return send(400,{message:'Ungültige Anfrage.'});}
const input=body?.password;if(typeof input!=='string'||input.length>256)return send(400,{message:'Ungültige Anmeldung.'});
const digest=s=>createHash('sha256').update(s).digest('hex');
if(!equal(digest(input),digest(password))){await new Promise(resolve=>setTimeout(resolve,800));return send(401,{message:'Das Passwort stimmt nicht.'});}
const value=String(Date.now()+ttl*1000)+'.'+randomBytes(16).toString('hex');res.setHeader('Set-Cookie',`${COOKIE}=${value}.${sign(value,password)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${ttl}`);return send(200,{authenticated:true});
};
