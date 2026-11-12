import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';

const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.webp':'image/webp','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const path=resolve(root,'.'+(p.endsWith('/')?p+'index.html':p));
    if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    const data=await readFile(path);
    res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(data);
  }catch {res.writeHead(404);res.end('Not Found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const origin='http://127.0.0.1:'+server.address().port;
try{
  for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
    const page=await browser.newPage({viewport,acceptDownloads:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/character/pose-lab/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.AetheriaPoseLab?.getState().ready===true);
    assert.equal((await page.evaluate(()=>window.AetheriaPoseLab.getState())).parts.length,3);
    assert.match(await page.locator('#state').textContent(),/Primi tre pezzi/);
    const original=await page.evaluate(()=>JSON.stringify(window.AetheriaPoseLab.exportMasks()));
    await page.locator('#head').fill('2');
    await page.locator('#hair').fill('-2');
    assert.equal((await page.evaluate(()=>window.AetheriaPoseLab.getState())).head,2);
    await page.locator('[data-mode="masks"]').click();
    assert.equal((await page.evaluate(()=>window.AetheriaPoseLab.getState())).mode,'masks');
    await page.locator('#part').selectOption('head');
    const jsonDownload=page.waitForEvent('download');
    await page.locator('#export-json').click();
    assert.equal((await jsonDownload).suggestedFilename(),'aetheria-cut-masks-v1.json');
    const pngDownload=page.waitForEvent('download');
    await page.locator('[data-export="head"]').click();
    assert.equal((await pngDownload).suggestedFilename(),'aetheria-head-draft.png');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow');
    assert.equal(await page.evaluate(()=>JSON.stringify(window.AetheriaPoseLab.exportMasks())),original,'No unintended geometry mutation');
    assert.deepEqual(errors,[],'No script errors');
    console.log('PASS Aetheria pose-lab '+viewport.width+'x'+viewport.height);
    await page.close();
  }
}finally{await browser.close();server.close();}