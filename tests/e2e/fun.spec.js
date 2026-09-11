import { test, expect } from '@playwright/test';

async function deploy(page, { level = 'easy', mode = null } = {}) {
  await page.goto('/?test');
  if (mode) await page.selectOption('#mode', mode);
  await page.locator(`[data-level="${level}"]`).click();
  await page.locator('#deploy').click();
  await expect.poll(() => page.evaluate(() => __game.state.phase)).toBe('playing');
}

test('HE grenade detonates once, damages bots and awards the kill', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await deploy(page);
  const result = await page.evaluate(() => {
    const g = __game;
    g.bots().forEach(b => { b.fireTimer = 9999; b.seen = false; });
    const bot = g.bots()[0]; bot.group.position.set(0, 0, 12); bot.health = 20;
    g.teleport(0, 16); g.state.nades.he = 1; g.cycleNade();
    g.aimAt(0, false); g.throwSelected();
    const thrown = g.throwables.projectiles.length, left = g.state.nades.he;
    g.throwables.clear();
    g.throwables.throwNade('he', { x: 0, y: 1.2, z: 13.6 }, { x: 0, y: -1, z: 0 });
    for (let i = 0; i < 90; i++) g.throwables.update(.05, null);
    return { thrown, left, health: bot.health, kills: g.state.kills, remaining: g.throwables.projectiles.length };
  });
  expect(result.thrown).toBe(1);
  expect(result.left).toBe(0);
  expect(result.health).toBeLessThanOrEqual(0);
  expect(result.kills).toBe(1);
  expect(result.remaining).toBe(0);
  expect(errors).toEqual([]);
});

test('flashbang blinds bots and whites out the screen', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await deploy(page);
  const result = await page.evaluate(() => {
    const g = __game;
    g.bots().forEach(b => { b.fireTimer = 9999; b.seen = false; });
    g.bots()[0].group.position.set(0, 0, 12);
    g.teleport(0, 16); g.state.nades.flash = 1; g.cycleNade();
    g.aimAt(0, true); g.throwSelected();
    const thrown = g.throwables.projectiles.length;
    g.throwables.clear();
    g.throwables.throwNade('flash', { x: 0, y: 1.7, z: 12.2 }, { x: 0, y: -1, z: 0 });
    for (let i = 0; i < 16; i++) g.throwables.update(.05, null);
    g.effects.update(0);
    return { thrown, blinded: g.bots()[0].blinded || 0, clouds: g.throwables.smokes.length, opacity: document.getElementById('flash-overlay').style.opacity };
  });
  expect(result.thrown).toBe(1);
  expect(result.blinded).toBeGreaterThan(0);
  expect(result.clouds).toBe(0);
  expect(Number(result.opacity)).toBeGreaterThan(0);
  await expect(page.locator('#flash-overlay')).toBeVisible();
  expect(errors).toEqual([]);
});

test('smoke blocks bot line of sight through the cloud', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await deploy(page);
  const result = await page.evaluate(() => {
    const g = __game;
    g.bots().forEach(b => { b.fireTimer = 9999; b.seen = false; });
    g.throwables.throwNade('smoke', { x: 0, y: 1, z: 12 }, { x: 0, y: -1, z: 0 });
    for (let i = 0; i < 30; i++) g.throwables.update(.05, null);
    const blocked = g.throwables.smokeBlocks({ x: 0, y: 1.5, z: 17 }, { x: 0, y: 1.5, z: 9 });
    const bot = g.bots()[0]; bot.group.position.set(0, 0, 9);
    g.teleport(0, 17);
    for (let i = 0; i < 6; i++) g.updateBots(.2);
    return { clouds: g.throwables.smokes.length, blocked, seen: bot.seen };
  });
  expect(result.clouds).toBe(1);
  expect(result.blocked).toBe(true);
  expect(result.seen).toBe(false);
  expect(errors).toEqual([]);
});

test('knife melee kills a weakened bot and number keys switch weapons', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await deploy(page);
  await page.keyboard.press('2');
  await expect(page.locator('#weapon-label')).toHaveText('USP-S');
  const result = await page.evaluate(() => {
    const g = __game;
    g.bots().forEach(b => { b.fireTimer = 9999; b.seen = false; });
    const bot = g.bots()[0]; bot.group.position.set(0, 0, 15); bot.health = 40;
    g.teleport(0, 16.7); g.aimAt(0, false); g.switchWeapon(0);
    const before = g.state.kills;
    g.melee();
    return { kills: g.state.kills - before, melee: g.state.melee, health: bot.health };
  });
  expect(result.melee).toBeGreaterThan(0);
  expect(result.health).toBeLessThanOrEqual(0);
  expect(result.kills).toBe(1);
  expect(errors).toEqual([]);
});

test('survival offers upgrade cards between waves and applies the chosen stack', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await deploy(page, { mode: 'survival' });
  const clearWave = async () => {
    for (let i = 0; i < 20; i++) {
      const done = await page.evaluate(() => {
        const g = __game, bot = g.bots().find(b => b.health > 0);
        if (!bot) return true;
        bot.fireTimer = 1000; bot.group.position.set(0, 0, 10); g.teleport(0, 15); g.state.cooldown = 0;
        bot.health = 1; g.aimAt(g.bots().indexOf(bot), true); g.shoot(); return false;
      });
      if (done) break;
    }
  };
  await clearWave();
  await expect.poll(() => page.evaluate(() => __game.survival.phase)).toBe('break');
  await expect(page.locator('#upgrade-overlay')).toBeVisible();
  await expect(page.locator('.upgrade-card')).toHaveCount(3);
  await page.keyboard.press('1');
  await expect(page.locator('#upgrade-overlay')).toBeHidden();
  const stacks = await page.evaluate(() => __game.state.upgrades);
  expect(Object.values(stacks).reduce((sum, count) => sum + count, 0)).toBe(1);
  expect(errors).toEqual([]);
});

test('kill streak in elimination opens a one-of-three supply reward', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await deploy(page, { level: 'normal' });
  await page.evaluate(() => { __game.bots().forEach(b => { b.fireTimer = 9999; b.seen = false; }); });
  for (const i of [0, 1, 2]) {
    await page.evaluate(i => {
      const g = __game, bot = g.bots()[i];
      bot.health = 1; bot.group.position.set(i * 2, 0, 10);
      g.teleport(0, 15); g.aimAt(i, true); g.state.cooldown = 0; g.shoot();
    }, i);
  }
  await expect(page.locator('#upgrade-overlay')).toBeVisible();
  await expect(page.locator('#upgrade-title')).toHaveText('连杀奖励');
  await expect(page.locator('.upgrade-card')).toHaveCount(3);
  await page.keyboard.press('2');
  await expect(page.locator('#upgrade-overlay')).toBeHidden();
  expect(await page.evaluate(() => __game.state.supplyUsed)).toBe(true);
  expect(errors).toEqual([]);
});

test('armory tracks mastery, dailies and skins with persistence', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?test');
  await expect(page.locator('#load-status')).toContainText('战场就绪');
  await page.locator('#armory-button').click();
  await expect(page.locator('#armory')).toBeVisible();
  await expect(page.locator('#mastery-list .armory-row')).toHaveCount(5);
  await expect(page.locator('#daily-list .armory-row')).toHaveCount(3);
  await page.locator('#armory-close').click();
  const progressed = await page.evaluate(() => {
    const meta = __game.meta;
    for (let i = 0; i < 10; i++) meta.registerKill(0);
    const bonus = meta.bonusFor(0);
    const events = { kills: 'kill', headshots: 'headshot', plants: 'plant', wins: 'win', knife: 'knife', nade: 'nade' };
    for (const item of meta.daily()) meta.recordEvent(events[item.id], 999);
    meta.daily().forEach((_, index) => meta.claimDaily(index));
    meta.buySkin('sand'); meta.equipSkin('sand');
    return { kills: meta.masteryFor(0).kills, damage: bonus.damage, skin: meta.skin, credits: meta.credits };
  });
  expect(progressed.kills).toBe(10);
  expect(progressed.damage).toBeCloseTo(1.01, 5);
  expect(progressed.skin).toBe('sand');
  await page.reload();
  await expect(page.locator('#load-status')).toContainText('战场就绪');
  const persisted = await page.evaluate(() => ({ kills: __game.meta.masteryFor(0).kills, skin: __game.meta.skin }));
  expect(persisted).toEqual({ kills: 10, skin: 'sand' });
  expect(errors).toEqual([]);
});

test('explosive barrel detonates and damages a nearby bot', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await deploy(page);
  const result = await page.evaluate(() => {
    const g = __game;
    const barrel = g.world.explosives[0];
    g.bots().forEach(b => { b.fireTimer = 9999; b.seen = false; });
    const bot = g.bots()[0]; bot.group.position.set(barrel.x + 1.2, 0, barrel.z); bot.health = 60;
    g.teleport(barrel.x, barrel.z + 3.5);
    g.aimAtPoint(barrel.x, 1, barrel.z); g.state.cooldown = 0; g.shoot();
    return { exploded: barrel.exploded, health: bot.health, kills: g.state.kills };
  });
  expect(result.exploded).toBe(true);
  expect(result.health).toBeLessThanOrEqual(0);
  expect(result.kills).toBe(1);
  expect(errors).toEqual([]);
});

test('chaos modifiers set score multipliers, fog and scarce ammo', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?test');
  await page.selectOption('#modifier', 'sandstorm');
  await page.locator('[data-level="easy"]').click();
  await page.locator('#deploy').click();
  await expect.poll(() => page.evaluate(() => __game.state.phase)).toBe('playing');
  expect(await page.evaluate(() => ({ id: __game.state.modifier.id, mult: __game.state.modifier.scoreMult }))).toEqual({ id: 'sandstorm', mult: 1.2 });
  await expect(page.locator('#buffs')).toContainText('沙尘暴');
  await page.evaluate(() => __game.finish(false, '测试结算'));
  await page.locator('#result-menu').click();
  await page.selectOption('#modifier', 'scarce');
  await page.locator('#deploy').click();
  await expect.poll(() => page.evaluate(() => __game.state.phase)).toBe('playing');
  expect(await page.evaluate(() => __game.state.weapons[0].reserve)).toBe(45);
  expect(errors).toEqual([]);
});

test('bot roles, alert propagation and low-health retreat are wired', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await deploy(page, { level: 'normal', mode: 'competitive' });
  const result = await page.evaluate(() => {
    const g = __game;
    g.bots().forEach(b => { b.fireTimer = 9999; b.seen = false; });
    const victim = g.bots()[0], witness = g.bots()[1], runner = g.bots()[2];
    victim.group.position.set(0, 0, 10); witness.group.position.set(2, 0, 10); runner.group.position.set(4, 0, 10);
    victim.health = 1;
    g.teleport(0, 15); g.aimAt(0, true); g.state.cooldown = 0; g.shoot();
    const alert = { revealed: witness.revealed, suspect: !!witness.suspect };
    runner.health = 20; runner.seen = true; runner.reaction = 0;
    for (let i = 0; i < 6; i++) { g.updateBots(.1); runner.seen = true; }
    return { kills: g.state.kills, alert, retreat: runner.retreatT, roles: g.bots().map(b => b.role) };
  });
  expect(result.kills).toBe(1);
  expect(result.roles).toContain('sniper');
  expect(result.roles).toContain('rusher');
  expect(result.alert.suspect).toBe(true);
  expect(result.alert.revealed).toBeGreaterThan(0);
  expect(result.retreat).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
