import test from 'node:test';
import assert from 'node:assert/strict';
import { MODIFIERS, modifierById, resolveModifier, enemyModifiers } from '../src/modifiers.js';

test('modifierById falls back to the default rules', () => {
  assert.equal(modifierById('sandstorm').id, 'sandstorm');
  assert.equal(modifierById('missing').id, 'none');
  for (const modifier of MODIFIERS) assert.ok(modifier.scoreMult >= 1);
});

test('resolveModifier returns the chosen rule or a deterministic random pick', () => {
  assert.equal(resolveModifier('elite').id, 'elite');
  const picks = new Set();
  for (let i = 0; i < 16; i++) {
    const picked = resolveModifier('random', () => i / 16);
    assert.ok(!['none', 'random'].includes(picked.id));
    picks.add(picked.id);
  }
  assert.ok(picks.size > 1);
});

test('enemyModifiers only tunes enemies for the elite rule', () => {
  assert.deepEqual(enemyModifiers(modifierById('none')), { accuracy: 0, reaction: 1, speed: 1, damage: 0 });
  const elite = enemyModifiers(modifierById('elite'));
  assert.ok(elite.accuracy > 0 && elite.reaction < 1 && elite.speed > 1 && elite.damage > 0);
});
