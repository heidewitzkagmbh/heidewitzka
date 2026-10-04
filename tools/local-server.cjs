'use strict';
// Runs the existing Vercel handlers over loopback HTTPS. No finance files are served.
const https=require('node:https');const fs=require('node:fs');const path=require('node:path');const {randomBytes}=require('node:crypto');const {execFileSync}=require('node:child_process');
const {openStore}=require('./sqlite-tasks.cjs');
const root=path.resolve(__dirname,'..');
function start(options={}){
  if(process.env.VERCEL)throw new Error('Dieser Server ist ausschließlich lokal.');
  process.umask(0o077);
  const directory=path.resolve(options.directory||process.env.PERSONAL_DATA_DIR||path.join(root,'..','..','work','personal-dashboard-private'));
  fs.mkdirSync(directory,{recursive:true,mode:0o700});fs.chmodSync(directory,0o700);
  const passwordPath=path.join(directory,'login-password');
  if(!fs.existsSync(passwordPath))fs.writeFileSync(passwordPath,randomBytes(32).toString('base64url'),{mode:0o600});
  process.env.COCKPIT_PASSWORD=fs.readFileSync(passwordPath,'utf8').trim();
  const certPath=path.join(directory,'localhost.crt'),keyPath=path.join(directory,'localhost.key');
  if(!fs.existsSync(certPath)||!fs.existsSync(keyPath))execFileSync('/usr/bin/openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',keyPath,'-out',certPath,'-days','365','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
  const store=openStore(directory);const tasks=require('../api/personal-tasks').createHandler(store);const internal=require('../api/internal');const login=require('../api/cockpit');
  const server=https.createServer({key:fs.readFileSync(keyPath),cert:fs.readFileSync(certPath)},async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    const hosts=[`localhost:${server.address().port}`,`127.0.0.1:${server.address().port}`];
    if(!hosts.includes(req.headers.host)){res.writeHead(403);return res.end('Ungültiger Host.');}
    let pathname;try{pathname=new URL(req.url,'https://localhost').pathname;}catch{res.writeHead(400);return res.end();}
    if(['POST','PATCH','DELETE'].includes(req.method)){
      let origin;try{origin=new URL(req.headers.origin||'');}catch{res.writeHead(403);return res.end();}
      if(origin.protocol!=='https:'||origin.host!==req.headers.host){res.writeHead(403);return res.end();}
      const length=Number(req.headers['content-length']);if(Number.isFinite(length)&&length>16384){res.writeHead(413);return res.end();}
      let bytes=0;const chunks=[];try{for await(const chunk of req){bytes+=chunk.length;if(bytes>16384){res.writeHead(413);res.end();return;}chunks.push(chunk);}}catch{return;}
      req.body=Buffer.concat(chunks).toString('utf8');
    }
    try{
      if(pathname==='/api/cockpit'){
        if(req.method==='POST'&&!store.allowLogin()){res.writeHead(429,{'Content-Type':'application/json','Retry-After':'900'});return res.end(JSON.stringify({message:'Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.'}));}return await login(req,res);
      }
      if(pathname==='/api/personal-tasks')return await tasks(req,res);
      if(pathname==='/api/internal'||pathname==='/intern'||pathname.startsWith('/intern/'))return internal(req,res);
      // Never expose api/, tools/, tests/, Git metadata or the private data directory.
      if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
      let name=pathname==='/'?'index.html':pathname.slice(1);if(!path.extname(name))name+='.html';
      if(!/^[a-zA-Z0-9/_-]+\.(html|css|js|svg|png|jpg|webp|ico|txt|xml|pdf)$/.test(name)||['api/','tools/','tests/'].some(p=>name.startsWith(p))){res.writeHead(404);return res.end();}
      const full=path.join(root,name);if(!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);return res.end();}
      const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf','.xml':'application/xml','.txt':'text/plain; charset=utf-8'};
      res.setHeader('Content-Type',mime[path.extname(name)]||'application/octet-stream');res.end(req.method==='HEAD'?'':fs.readFileSync(full));
    }catch{if(!res.headersSent)res.writeHead(500);res.end('Anfrage fehlgeschlagen.');}
  });
  server.on('close',()=>store.close());
  server.listen(options.port??Number(process.env.PORT||8766),'127.0.0.1',()=>{if(!options.quiet)console.log(`Persönliches Dashboard: https://localhost:${server.address().port}/intern/persoenlich\nNur lokal erreichbar. Das Anmeldepasswort liegt in der privaten Ablage; Start.command kopiert es in die Zwischenablage.`);});
  return {server,directory,passwordPath};
}
if(require.main===module){const {server}=start();for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));}
module.exports={start};
