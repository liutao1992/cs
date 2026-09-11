import test from 'node:test';
import assert from 'node:assert/strict';
import { blastDamage, flashBlind, segmentPointDistance2D, NADE_DEFS } from '../src/throwables.js';

test('blastDamage falls off quadratically and reaches zero at the radius', () => {
  assert.equal(blastDamage(0, 120, 6), 120);
  assert.equal(blastDamage(6, 120, 6), 0);
  assert.equal(blastDamage(8, 120, 6), 0);
  assert.ok(blastDamage(3, 120, 6) < blastDamage(1, 120, 6));
  assert.ok(blastDamage(3, 120, 6) >= 1);
  assert.equal(blastDamage(5.99, 1, 6), 1);
});

test('flashBlind needs proximity, facing and line of sight', () => {
  assert.equal(flashBlind(2, 0, NADE_DEFS.flash.radius, false), 0);
  assert.equal(flashBlind(12, 0, NADE_DEFS.flash.radius, true), 0);
  const front = flashBlind(2, 0, NADE_DEFS.flash.radius, true);
  const behind = flashBlind(2, Math.PI, NADE_DEFS.flash.radius, true);
  assert.ok(front > behind);
  assert.ok(behind >= 0 && front <= 1);
});

test('segmentPointDistance2D measures the closest approach of a smoke cloud', () => {
  assert.equal(segmentPointDistance2D(0, 0, 10, 0, 5, 3), 3);
  assert.equal(segmentPointDistance2D(0, 0, 10, 0, 15, 0), 5);
});

test('nade definitions expose usable physics fields', () => {
  for (const type of ['he', 'flash', 'smoke']) {
    const def = NADE_DEFS[type];
    assert.ok(def.fuse > 0, type);
    assert.ok(def.speed > 0, type);
    assert.ok(def.name, type);
  }
  assert.ok(NADE_DEFS.smoke.duration > 0);
  assert.ok(NADE_DEFS.he.maxDamage > 0 && NADE_DEFS.he.radius > 0);
});
