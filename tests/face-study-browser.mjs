import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {chromium} from 'playwright';

const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.webp':'image/webp','.js':'text/javascript'};
const server=createServer(async(req,res)=>{
  try{
    const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const target=resolve(root,'.'+(p.endsWith('/')?p+'index.html':p));
    if(!target.startsWith(root+sep)){res.writeHead(403);res.end();return}
    const data=await readFile(target);
    res.writeHead(200,{'Content-Type':mime[target.slice(target.lastIndexOf('.'))]||'application/octet-stream'});res.end(data);
  }catch{res.writeHead(404);res.end('Not Found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
  for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
    const page=await browser.newPage({viewport});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/face-study/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>!!window.AetheriaFaceStudy);
    const loaded=await page.locator('#base').evaluate(img=>img.complete&&img.naturalWidth===490&&img.naturalHeight===545);
    assert.ok(loaded,'Portrait asset should load at 490x545');
    assert.equal((await page.evaluate(()=>window.AetheriaFaceStudy.getState())).eyes,'open');
    await page.locator('#automatic').uncheck();
    await page.locator('#eyes-close').click();
    assert.equal((await page.evaluate(()=>window.AetheriaFaceStudy.getState())).eyes,'closed');
    // Validate that a transparent overlay was actually painted on the canvas.
    const painted=await page.locator('#lids').evaluate(c=>{
      const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let pixels=0;for(let i=3;i<data.length;i+=4)if(data[i]>40)pixels++;
      return pixels;
    });
    assert.ok(painted>300,'Closed-eyelid overlay must contain painted pixels: '+painted);
    await page.locator('#eyes-open').click();
    assert.equal((await page.evaluate(()=>window.AetheriaFaceStudy.getState())).eyes,'open');
    await page.locator('#sway').uncheck();
    assert.equal((await page.evaluate(()=>window.AetheriaFaceStudy.getState())).hair,'off');
    await page.locator('#sway').check();
    await page.locator('#blink').click();
    await page.waitForTimeout(360);
    assert.equal((await page.evaluate(()=>window.AetheriaFaceStudy.getState())).eyes,'open');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow');
    assert.deepEqual(errors,[],'No JavaScript errors');
    console.log('PASS face-study '+viewport.width+'x'+viewport.height+': '+painted+' eyelid pixels');
    await page.close();
  }
}finally{await browser.close();server.close()}
