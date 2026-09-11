import test from 'node:test';
import assert from 'node:assert/strict';
import { createEconomy, ECONOMY } from '../src/economy.js';
import { weaponDefinitions } from '../src/logic.js';

test('economy starts at $800, spends only when affordable, never goes negative', () => {
  const eco = createEconomy();
  assert.equal(eco.money, 800);
  assert.equal(eco.spend(300), true);
  assert.equal(eco.money, 500);
  assert.equal(eco.spend(501), false);
  assert.equal(eco.money, 500);
  assert.equal(eco.spend(-5), false);
  assert.equal(eco.money, 500);
});

test('economy award table matches classic CS values', () => {
  const eco = createEconomy();
  assert.equal(eco.award('kill'), ECONOMY.kill);
  assert.equal(eco.award('kill', true), ECONOMY.headshot);
  assert.equal(eco.award('win'), ECONOMY.win);
  assert.equal(eco.award('loss'), ECONOMY.loss);
  assert.equal(eco.award('plant'), ECONOMY.plant);
  assert.equal(eco.award('defuse'), ECONOMY.defuse);
  assert.equal(eco.award('unknown'), 0);
  assert.equal(eco.money, 800 + 300 + 450 + 3500 + 1400 + 800 + 800);
});

test('economy caps at $16000 and resets to $800', () => {
  const eco = createEconomy();
  eco.add(99999);
  assert.equal(eco.money, 16000);
  eco.reset();
  assert.equal(eco.money, 800);
});

test('weapon definitions carry price, side and the two new guns', () => {
  assert.equal(weaponDefinitions.length, 5);
  for (const w of weaponDefinitions) {
    assert.ok(w.price > 0, `${w.name} missing price`);
    assert.ok(['T', 'CT', 'both'].includes(w.side), `${w.name} bad side ${w.side}`);
  }
  const m4 = weaponDefinitions[3];
  assert.equal(m4.name, 'M4A1-S');
  assert.deepEqual([m4.capacity, m4.reserve, m4.damage, m4.side, m4.price], [25, 75, 33, 'CT', 3100]);
  const glock = weaponDefinitions[4];
  assert.equal(glock.name, 'Glock-18');
  assert.deepEqual([glock.capacity, glock.reserve, glock.damage, glock.side, glock.price], [20, 120, 26, 'T', 400]);
  // Side coverage: T can field a rifle and a pistol, CT likewise, AWP shared.
  assert.ok(weaponDefinitions.some(w => w.side === 'T' && w.capacity > 15));
  assert.ok(weaponDefinitions.some(w => w.side === 'CT' && w.capacity > 15));
  assert.ok(weaponDefinitions.some(w => w.side === 'both'));
});
