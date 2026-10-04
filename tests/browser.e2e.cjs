const {chromium}=require('playwright');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const assert=require('node:assert/strict');const {once}=require('node:events');
const {start}=require('../tools/local-server.cjs');
(async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'personal-browser-test-'));
 const captures=process.env.DASHBOARD_SCREENSHOT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'personal-captures-'));fs.mkdirSync(captures,{recursive:true});
 const {server,passwordPath}=start({port:0,directory,quiet:true});await once(server,'listening');
 const base=`https://localhost:${server.address().port}`;let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'})});
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(base+'/intern/persoenlich');assert.equal(response.status(),401);
  assert.equal(await page.locator('#quick-title').count(),0);
  const api=await context.request.get(base+'/api/personal-tasks');assert.equal(api.status(),401);
  assert.equal((await context.request.get(base+'/api/_personal/app.html')).status(),404);
  await page.locator('#password').fill(fs.readFileSync(passwordPath,'utf8'));
  await page.locator('#login-submit').click();await page.locator('#quick-title:not([disabled])').waitFor();
  await page.screenshot({path:path.join(captures,'Dashboard-Desktop.png'),fullPage:true});
  await page.locator('#quick-title').fill('Testaufgabe – nur zur Prüfung');await page.locator('#add').click();
  await page.getByText('Im Eingang gespeichert.',{exact:true}).waitFor();assert.equal(await page.locator('.task').count(),1);
  await page.reload();await page.locator('.task').waitFor();
  await page.locator('.task button').click();await page.locator('#edit-title').fill('Testaufgabe geändert');
  await page.locator('#edit-planned').fill('2026-10-05');await page.locator('#edit-deadline').fill('2026-11-06');
  await page.locator('#edit-labels').fill('Prüfung, Test');await page.locator('#edit-duration').fill('30');
  await page.locator('#edit-note').fill('<img src=x onerror=alert(1)>');await page.locator('#save').click();
  await page.getByText('Änderungen dauerhaft gespeichert.',{exact:true}).waitFor();
  assert.equal(await page.locator('.task img').count(),0);assert.equal(await page.locator('.task h3').textContent(),'Testaufgabe geändert');
  assert.ok((await page.locator('.task').textContent()).includes(new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeZone:'UTC'}).format(new Date('2026-11-06T12:00:00Z'))));
  // Two windows: a stale editor must preserve input while reporting a conflict.
  const second=await context.newPage();await second.goto(base+'/intern/persoenlich');await second.locator('.task button').click();await second.locator('#edit-title').fill('Nicht überschriebener Entwurf');
  await page.locator('.task input[type=checkbox]').click();await page.getByText('Als erledigt gespeichert.',{exact:true}).waitFor();
  await second.locator('#save').click();await second.getByText(/anderen Fenster geändert/).waitFor();assert.equal(await second.locator('#edit-title').inputValue(),'Nicht überschriebener Entwurf');
  await second.close();await page.locator('[data-filter=done]').click();assert.equal(await page.locator('.task').count(),1);
  await page.locator('.task input[type=checkbox]').click();await page.getByText('Wieder geöffnet und gespeichert.',{exact:true}).waitFor();
  await page.locator('[data-filter=all]').click();assert.equal(await page.locator('.task').count(),1);
  await page.locator('#search').fill('Prüfung');assert.equal(await page.locator('.task').count(),1);await page.locator('#search').fill('Kein Treffer');assert.equal(await page.locator('.task').count(),0);await page.locator('#search').fill('');
  const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;const saved=path.join(directory,'export.json');await download.saveAs(saved);assert.equal(JSON.parse(fs.readFileSync(saved,'utf8')).tasks.length,1);
  await page.goto(base+'/intern');await page.getByRole('link',{name:'Persönliches Dashboard →'}).waitFor();assert.ok(await page.locator('#workspace').count());await page.getByRole('link',{name:'Persönliches Dashboard →'}).click();await page.locator('.task').waitFor();
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#quick-title').fill('Mobile Testaufgabe');await page.locator('#add').click();await page.getByText('Im Eingang gespeichert.',{exact:true}).waitFor();assert.equal(await page.locator('.task').count(),2);
  await page.locator('.task button').first().click();await page.locator('#edit-status').selectOption('someday');await page.locator('#save').click();await page.getByText('Änderungen dauerhaft gespeichert.',{exact:true}).waitFor();await page.locator('[data-filter=someday]').click();assert.equal(await page.locator('.task').count(),1);
  await page.setViewportSize({width:320,height:700});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.task button').click();assert.equal(await page.evaluate(()=>document.querySelector('dialog').scrollWidth>document.querySelector('dialog').clientWidth),false);await page.locator('#cancel-editor').click();
  await page.locator('#logout').click();await page.locator('#password').waitFor();assert.equal((await context.request.get(base+'/api/personal-tasks')).status(),401);
  assert.deepEqual(errors,[]);await context.close();
  // User-facing mobile capture uses an empty isolated store, not example tasks.
  await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});
  const cleanDir=fs.mkdtempSync(path.join(os.tmpdir(),'personal-empty-test-'));const clean=start({port:0,directory:cleanDir,quiet:true});await once(clean.server,'listening');
  const mobile=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mp=await mobile.newPage();await mp.goto(`https://localhost:${clean.server.address().port}/intern/persoenlich`);await mp.locator('#password').fill(fs.readFileSync(clean.passwordPath,'utf8'));await mp.locator('#login-submit').click();await mp.locator('#quick-title:not([disabled])').waitFor();await mp.screenshot({path:path.join(captures,'Dashboard-Mobil.png'),fullPage:true});await mobile.close();await new Promise(resolve=>clean.server.close(resolve));fs.rmSync(cleanDir,{recursive:true,force:true});
  console.log('PASS: Desktop and mobile CRUD, reload, filters, fixed dates, export, concurrent edit conflict, escaped text, original cockpit, logout, protected API, 320px/390px layouts; no browser errors. Test records removed.');
 }finally{if(browser)await browser.close();if(!process.env.DASHBOARD_SCREENSHOT_DIR)fs.rmSync(captures,{recursive:true,force:true});if(server.listening)await new Promise(r=>server.close(r));fs.rmSync(directory,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
