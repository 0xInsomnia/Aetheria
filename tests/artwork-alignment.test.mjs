import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Alpha 0.11: artwork draft has one valid landmark for each actual rig bone', () => {
  const html=readFileSync(new URL('../character/artwork-fit/index.html',import.meta.url),'utf8');
  const rig=JSON.parse(readFileSync(new URL('../character/rig/aetheria.rig.json',import.meta.url),'utf8'));
  const match=html.match(/<script id="art-data" type="application\\/json">\\s*([\\s\\S]*?)\\s*<\\/script>/);
  assert.ok(match,'Embedded artwork metadata must exist');
  const data=JSON.parse(match[1]);
  assert.equal(data.status.includes('not approved'),true);
  assert.equal(Object.keys(data.landmarks).length,rig.bones.length);
  for(const bone of rig.bones){
    const point=data.landmarks[bone.name];
    assert.ok(Array.isArray(point)&&point.length===2,'Missing landmark for '+bone.name);
    assert.ok(point.every(Number.isFinite),'Non-finite coordinates for '+bone.name);
    assert.ok(point[0]>=0&&point[0]<=data.imageSize.width,'X outside source for '+bone.name);
    assert.ok(point[1]>=0&&point[1]<=data.imageSize.height,'Y outside source for '+bone.name);
  }
  assert.ok(html.includes('aetheria-character-concept-v06.webp'));
  assert.ok(html.includes('aetheria-alignment-draft.json'));
});
