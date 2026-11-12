import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateMasks,updatePoint,getJointPose,deepCopy} from '../pose-lab/core.mjs';
const m=JSON.parse(readFileSync(new URL('../pose-lab/masks.json',import.meta.url),'utf8'));
test('two source masks are valid',()=>assert.deepEqual(validateMasks(m),[]));
test('neither mask has outside-canvas vertices',()=>assert.equal(m.parts.head.polygon.every(([x,y])=>x>=0&&y>=0&&x<=1024&&y<=1536),true));
test('pointer adjustments validate finite coordinates',()=>{const a=deepCopy(m);assert.equal(updatePoint(a,'head',0,[800,200]),true);assert.deepEqual(a.parts.head.polygon[0],[800,200]);assert.equal(updatePoint(a,'head',0,[NaN,200]),false);assert.equal(updatePoint(a,'head',999,[500,200]),false)});
test('head and hair movements are clamped to safe experimental limits',()=>assert.deepEqual(getJointPose({head:90,hair:-90}),{head:8,hair_back:-14}));
