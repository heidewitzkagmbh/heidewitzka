const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { randomBytes } = require('node:crypto');
const { valid } = require('./_cockpit/session');

const files=Object.fromEntries(['login.html','app.html','login.js','cockpit.js','cockpit.css'].map(name=>[name,readFileSync(join(__dirname,'_cockpit',name),'utf8')]));

module.exports=function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');res.statusCode=405;return res.end();}
  const path=new URL(req.url,'https://example.invalid').pathname;
  if(path!=='/intern'&&path!=='/intern/'&&path!=='/api/internal'){res.statusCode=404;return res.end();}
  const authenticated=valid(req,process.env.COCKPIT_PASSWORD||'');
  const nonce=randomBytes(16).toString('base64');
  res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`);
  res.setHeader('Content-Type','text/html; charset=utf-8');
  let html=files[authenticated?'app.html':'login.html'];
  html=html.replaceAll('__NONCE__',nonce).replace('__CSS__',files['cockpit.css']).replace(authenticated?'__APP_JS__':'__LOGIN_JS__',files[authenticated?'cockpit.js':'login.js']);
  res.statusCode=authenticated?200:401;
  res.end(req.method==='HEAD'?'':html);
};
