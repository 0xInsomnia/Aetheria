import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Alpha 0.11: draft anatomical map matches all canonical rig bones',()=>{
 const html=readFileSync(new URL('../character/artwork-fit/index.html',import.meta.url),'utf8');
 const rig=JSON.parse(readFileSync(new URL('../character/rig/aetheria.rig.json',import.meta.url),'utf8'));
 const startTag='<script id="art-data" type="application/json">';
 const start=html.indexOf(startTag);assert.ok(start>=0,'missing artwork JSON');
 const end=html.indexOf('</script>',start);assert.ok(end>start,'missing closing script');
 const data=JSON.parse(html.slice(start+startTag.length,end));
 assert.ok(data.status.includes('not approved'));
 assert.equal(Object.keys(data.landmarks).length,rig.bones.length);
 for(const bone of rig.bones){
   const p=data.landmarks[bone.name];
   assert.ok(Array.isArray(p)&&p.length===2,'missing '+bone.name);
   assert.ok(p.every(Number.isFinite));
   assert.ok(p[0]>=0&&p[0]<=data.imageSize.width);
   assert.ok(p[1]>=0&&p[1]<=data.imageSize.height);
 }
 assert.ok(html.includes('aetheria-character-concept-v06.webp'));
});
