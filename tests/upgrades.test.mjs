import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADE_DEFS, rollUpgrades, upgradeMods, applyUpgrade, waveStartBonus } from '../src/upgrades.js';

test('rollUpgrades returns distinct cards and respects the stack cap', () => {
  const picks = rollUpgrades({}, 3, Math.random);
  assert.equal(picks.length, 3);
  assert.equal(new Set(picks.map(p => p.id)).size, 3);
  const capped = Object.fromEntries(UPGRADE_DEFS.map(def => [def.id, 5]));
  assert.equal(rollUpgrades(capped).length, 0);
});

test('upgradeMods scales with stacks and clamps fire rate, reload and spread', () => {
  const mods = upgradeMods({ damage: 2, firerate: 3, reload: 2, spread: 2, speed: 1, headshot: 1, lifesteal: 2, armor: 1, supply: 2 });
  assert.equal(mods.damage, 1.24);
  assert.ok(mods.fireRate < 1 && mods.fireRate >= .5);
  assert.ok(mods.reload >= .5 && mods.spread >= .4);
  assert.equal(mods.speed, 1.07);
  assert.equal(mods.headshot, 1.2);
  assert.equal(mods.lifesteal, 16);
  assert.equal(mods.armorPerWave, 30);
  assert.equal(mods.supplyPerWave, 2);
  assert.equal(upgradeMods({ firerate: 20 }).fireRate, .5);
});

test('applyUpgrade mutates stacks and applies immediate effects', () => {
  const stacks = {}, player = { health: 50, armor: 10 }, state = { maxHealth: 100, nades: { he: 0, flash: 0, smoke: 0 } };
  applyUpgrade('health', { player, state }, stacks);
  assert.equal(state.maxHealth, 120);
  assert.equal(player.health, 90);
  applyUpgrade('armor', { player, state }, stacks);
  assert.equal(player.armor, 40);
  applyUpgrade('supply', { player, state }, stacks, () => 0);
  assert.equal(state.nades.he, 1);
  assert.deepEqual(stacks, { health: 1, armor: 1, supply: 1 });
  assert.equal(applyUpgrade('missing', { player, state }, stacks), null);
});

test('waveStartBonus grants armor and supply per wave', () => {
  const state = { upgrades: { armor: 1, supply: 1 }, nades: { he: 0, flash: 0, smoke: 0 } };
  const player = { armor: 20 };
  const granted = waveStartBonus(state, player, () => .99);
  assert.equal(player.armor, 50);
  assert.equal(state.nades.smoke, 1);
  assert.equal(granted.length, 2);
});
