import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { chromium } from 'playwright';

// Browser integration test against the real repository files (no fake rig or sprites).
const root=process.cwd();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const target=resolve(root,'.'+(p.endsWith('/')?p+'index.html':p));
    if(!target.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
    const data=await readFile(target);
    const ext=target.slice(target.lastIndexOf('.'));
    res.writeHead(200,{'Content-Type':types[ext]??'application/octet-stream'});
    res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
  for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
    const page=await browser.newPage({viewport});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.AetheriaRoomRig,null,{timeout:15000});
    await page.locator('[data-tab="room"]').click();
    assert.equal(await page.locator('.room-avatar-art').isVisible(),true,'Illustration visible by default');
    await page.getByRole('button',{name:'Rig animato · demo'}).click();
    await page.waitForFunction(()=>window.AetheriaRoomRig?.getState().mode==='rig'&&window.AetheriaRoomRig?.getState().ready,null,{timeout:30000});
    await page.waitForTimeout(350);
    const evidence=await page.evaluate(()=>{
      const canvas=document.querySelector('.room-rig-canvas');
      const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let opaque=0;
      for(let i=3;i<data.length;i+=80)if(data[i]>20)opaque++;
      return {width:canvas.width,height:canvas.height,opaque};
    });
    assert.ok(evidence.width>50&&evidence.height>evidence.width,JSON.stringify(evidence));
    assert.ok(evidence.opaque>40,'Rig must paint visible pixels: '+JSON.stringify(evidence));
    // Alpha 0.9: facial actions drive the SAME live rig inside the room.
    await page.waitForFunction(() => !!window.AetheriaFaceControls, null, {timeout:15000});
    await page.getByRole('button',{name:'Sorriso',exact:true}).click();
    await page.waitForFunction(() => window.AetheriaRoomRig?.getState().expression==='smile');
    await page.locator('[data-face-command="blink"]').click();
    assert.match(await page.locator('#face-control-status').innerText(),/Battito/);
    await page.locator('#face-head-tilt').evaluate(input => {input.value='12';input.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.equal(await page.locator('#face-head-tilt-value').innerText(),'12°');
    await page.locator('#face-follow-pointer').check();
    await page.locator('#room-v04').hover({position:{x:25,y:25}});
    await page.waitForTimeout(400);
    const zoom = await page.locator('#face-preview-canvas').evaluate(canvas => {
      const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let pixels=0; for(let i=3;i<d.length;i+=80) if(d[i]>20)pixels++;
      return pixels;
    });
    assert.ok(zoom>20,'Facial zoom must contain rendered rig pixels: '+zoom);
    await page.getByRole('button',{name:'↺ Ripristina'}).click();
    await page.waitForFunction(() => window.AetheriaRoomRig?.getState().expression==='neutral');
    console.log('PASS face controls '+viewport.width+'px: '+zoom+' visible zoom samples');
    await page.getByRole('button',{name:'👋 Saluta'}).click();
    await page.getByLabel('Palette del rig').selectOption('nero-rosso');
    assert.equal((await page.evaluate(()=>window.AetheriaRoomRig.getState())).palette,'nero-rosso');
    await page.getByRole('button',{name:'Illustrata'}).click();
    assert.equal((await page.evaluate(()=>window.AetheriaRoomRig.getState())).mode,'illustration');
    assert.equal(await page.locator('.room-avatar-art').isVisible(),true);
    assert.deepEqual(errors,[],'No browser errors');
    console.log('PASS '+viewport.width+'x'+viewport.height+': '+evidence.opaque+' opaque pixel samples');
    await page.close();
  }
}finally{
  await browser.close();
  server.close();
}
