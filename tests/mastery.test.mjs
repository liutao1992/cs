import test from 'node:test';
import assert from 'node:assert/strict';
import { MASTERY_STEPS, masteryProgress, masteryBonus, dailyChallenges, createMeta, FINISHES, DAILY_POOL } from '../src/mastery.js';

const memoryStorage=()=>{const map=new Map();return{getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,String(value))};};

test('masteryProgress maps kills to levels and ratios', () => {
  assert.deepEqual(masteryProgress(0), { level: 0, previous: 0, next: MASTERY_STEPS[0], ratio: 0 });
  assert.equal(masteryProgress(MASTERY_STEPS[0]).level, 1);
  assert.equal(masteryProgress(MASTERY_STEPS.at(-1)).level, 5);
  assert.equal(masteryProgress(9999).next, null);
  assert.equal(masteryProgress(9999).ratio, 1);
  const mid = masteryProgress(MASTERY_STEPS[0] + (MASTERY_STEPS[1] - MASTERY_STEPS[0]) / 2);
  assert.equal(mid.level, 1);
  assert.ok(mid.ratio > 0 && mid.ratio < 1);
});

test('masteryBonus stays small and scales with level', () => {
  assert.deepEqual(masteryBonus(0), { damage: 1, reload: 1, spread: 1 });
  const max = masteryBonus(5);
  assert.equal(max.damage, 1.05);
  assert.ok(max.reload < 1 && max.spread < 1);
});

test('dailyChallenges is deterministic per date and returns distinct entries', () => {
  const first = dailyChallenges('2026-09-12').map(def => def.id);
  const second = dailyChallenges('2026-09-12').map(def => def.id);
  const other = dailyChallenges('2026-09-13').map(def => def.id);
  assert.deepEqual(first, second);
  assert.equal(new Set(first).size, 3);
  assert.notDeepEqual(first, other);
});

test('createMeta tracks mastery, dailies, credits and skins', () => {
  const meta = createMeta(memoryStorage());
  assert.equal(meta.masteryFor(0).kills, 0);
  meta.registerKill(0, { head: true });
  assert.equal(meta.masteryFor(0).kills, 1);
  const date = '2026-09-12';
  const items = meta.daily(date);
  assert.equal(items.length, 3);
  for (const item of items) meta.recordEvent(DAILY_POOL.find(def => def.id === item.id).event, 999, date);
  let credits = 0;
  items.forEach((_, index) => { credits += meta.claimDaily(index, date); });
  assert.ok(credits >= 430);
  assert.equal(meta.credits, credits);
  assert.equal(meta.claimDaily(0, date), 0);
  const sand = FINISHES.find(finish => finish.id === 'sand');
  assert.ok(credits >= sand.price);
  assert.equal(meta.buySkin('sand'), true);
  assert.equal(meta.buySkin('sand'), false);
  assert.equal(meta.equipSkin('sand'), true);
  assert.equal(meta.skin, 'sand');
  assert.equal(meta.equipSkin('ember'), false);
  assert.ok(meta.ownedSkins.includes('sand'));
});
