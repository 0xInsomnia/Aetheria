import test from 'node:test';
import assert from 'node:assert/strict';
import {clamp01,smoothstep,normalizeBone,interpolatePose,Skeleton2D,sampleKeyframes,POSES} from '../src/skeleton2d.mjs';

test('safe animation ranges', () => {
  assert.equal(clamp01(3),1);
  assert.equal(clamp01(-5),0);
  assert.equal(smoothstep(.5),.5);
  assert.equal(normalizeBone({scaleX:0,opacity:5}).scaleX,.05);
  assert.equal(normalizeBone({opacity:5}).opacity,1);
});

test('bone interpolation endpoints and midpoint', () => {
  const a={armRight:{rotation:0}}, b={armRight:{rotation:-40}};
  assert.equal(interpolatePose(a,b,0).armRight.rotation,0);
  assert.equal(interpolatePose(a,b,1).armRight.rotation,-40);
  assert.equal(interpolatePose(a,b,.5).armRight.rotation,-20);
});

test('independent DOM transforms for prepared sprite layers', () => {
  const rightArm={style:{}},head={style:{}};
  new Skeleton2D({armRight:rightArm,head}).setPose({armRight:{rotation:-35},head:{rotation:4}});
  assert.match(rightArm.style.transform,/rotate\(-35deg\)/);
  assert.match(head.style.transform,/rotate\(4deg\)/);
});

test('keyframe sampling and looping', () => {
  const frames=[{at:0,pose:POSES.neutral},{at:600,pose:POSES.wave},{at:1200,pose:POSES.neutral}];
  assert.equal(sampleKeyframes(frames,600).armRight.rotation,-35);
  assert.equal(sampleKeyframes(frames,1200).armRight.rotation,0);
  assert.equal(sampleKeyframes(frames,1800,true).armRight.rotation,-35);
});
