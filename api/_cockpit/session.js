const { createHmac, timingSafeEqual } = require('node:crypto');

const COOKIE='__Host-heidewitzka_session';
const ttl=8*60*60;
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
function sign(value,password){return createHmac('sha256',password).update('heidewitzka-cockpit-v1:'+value).digest('base64url');}
function valid(req,password){
  if(password.length<20)return false;
  const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
  if(!cookie)return false;
  const [exp,nonce,sig,...extra]=cookie.slice(COOKIE.length+1).split('.');
  const time=Number(exp);
  return !extra.length&&/^\d+$/.test(exp)&&Number.isSafeInteger(time)&&time>Date.now()&&time<=Date.now()+ttl*1000&&/^[a-f0-9]{32}$/.test(nonce||'')&&!!sig&&equal(sign(exp+'.'+nonce,password),sig);
}
module.exports={COOKIE,ttl,equal,sign,valid};
