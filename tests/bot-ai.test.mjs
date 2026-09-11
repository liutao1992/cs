import test from 'node:test';
import assert from 'node:assert/strict';
import { BOT_ROLES, roleForIndex, applyRole, chooseObjective } from '../src/bot-ai.js';

test('roleForIndex returns stable role patterns', () => {
  assert.equal(roleForIndex(0, 'competitive'), 'rifle');
  assert.equal(roleForIndex(1, 'competitive'), 'sniper');
  assert.equal(roleForIndex(3, 'competitive'), 'rusher');
  assert.equal(roleForIndex(7, 'competitive'), roleForIndex(0, 'competitive'));
  assert.equal(roleForIndex(2, 'elimination'), 'rusher');
  assert.equal(roleForIndex(3, 'elimination'), 'sniper');
});

test('applyRole adjusts accuracy, reaction, speed and damage without extremes', () => {
  const base = { accuracy: .4, reaction: .8, speed: 2.1, damage: 19 };
  const sniper = applyRole(base, 'sniper');
  const rusher = applyRole(base, 'rusher');
  assert.ok(sniper.accuracy > base.accuracy && sniper.damage > base.damage);
  assert.ok(sniper.speed < base.speed && sniper.reaction > base.reaction);
  assert.ok(rusher.speed > base.speed && rusher.damage < base.damage);
  assert.ok(applyRole({ ...base, accuracy: .95 }, 'sniper').accuracy <= .92);
  assert.ok(applyRole({ ...base, accuracy: .01 }, 'rusher').accuracy >= .05);
  assert.ok(applyRole({ ...base, damage: 10 }, 'rusher').damage >= 8);
});

test('chooseObjective prioritises carrier, bomb, alert, anchors and contact', () => {
  const player = { x: 0, z: 20 };
  const waypoints = [{ x: 1, z: 1 }, { x: -30, z: -28 }];
  const site = { x: 20, z: -20 };
  const base = { role: 'rifle', anchor: { x: 10, z: 10 }, suspect: { x: 5, z: 5 }, revealed: 0, retreat: false, bomb: null, botPlant: null, isCarrier: false, side: 'T', mode: 'competitive', elapsed: 5, seen: false, player, waypoints, index: 0 };
  assert.deepEqual(chooseObjective({ ...base, botPlant: site, isCarrier: true }), site);
  assert.deepEqual(chooseObjective({ ...base, botPlant: site }), site);
  assert.deepEqual(chooseObjective({ ...base, bomb: { x: 3, z: 3 } }), { x: 3, z: 3 });
  assert.deepEqual(chooseObjective({ ...base, suspect: { x: 8, z: 8 }, revealed: 2 }), { x: 8, z: 8 });
  assert.deepEqual(chooseObjective({ ...base, mode: 'elimination' }), { x: 1, z: 1 });
  assert.deepEqual(chooseObjective({ ...base, mode: 'elimination', elapsed: 2, role: 'rusher' }), { x: 1, z: 1 });
  assert.deepEqual(chooseObjective({ ...base, seen: true }), player);
  assert.deepEqual(chooseObjective({ ...base, elapsed: 20 }), player);
});

test('chooseObjective falls back to the farthest waypoint when retreating', () => {
  const player = { x: 0, z: 0 };
  const objective = chooseObjective({ role: 'rifle', retreat: true, waypoints: [{ x: 2, z: 2 }, { x: -30, z: -28 }], player, elapsed: 30, seen: true, playerRef: null });
  assert.deepEqual(objective, { x: -30, z: -28 });
});
