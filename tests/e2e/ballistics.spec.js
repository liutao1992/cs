import { test, expect } from '@playwright/test';

async function deploy(page) {
  await page.goto('/?test');
  await page.locator('[data-level="easy"]').click();
  await page.locator('#deploy').click();
  await expect.poll(() => page.evaluate(() => __game.state.phase)).toBe('playing');
}

test('recoil follows an increasing pattern, recovers, and never permanently climbs the aim', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await deploy(page);
  const burst = await page.evaluate(() => {
    const g = __game;
    g.bots().forEach(b => { b.fireTimer = 9999; b.seen = false; });
    g.teleport(0, 20); g.aimAtPoint(0, 1.6, -10);
    const pitch0 = g.player.pitch, yaw0 = g.player.yaw, kicks = [];
    for (let i = 0; i < 6; i++) { g.state.cooldown = 0; g.shoot(); kicks.push(g.state.recoilPitch); }
    return { pitch0, yaw0, pitch: g.player.pitch, yaw: g.player.yaw, kicks, recoil: g.state.recoilPitch, inaccuracy: g.state.inaccuracy };
  });
  expect(burst.recoil).toBeGreaterThan(0);
  expect(Math.abs(burst.pitch - burst.pitch0)).toBeLessThan(1e-9);
  expect(Math.abs(burst.yaw - burst.yaw0)).toBeLessThan(1e-9);
  expect(burst.kicks[5]).toBeGreaterThan(burst.kicks[0]);
  expect(burst.inaccuracy).toBeGreaterThan(0);
  await page.waitForTimeout(900);
  const settled = await page.evaluate(() => ({ recoil: __game.state.recoilPitch, yaw: __game.state.recoilYaw, inaccuracy: __game.state.inaccuracy, shots: __game.state.recoilShots }));
  expect(settled.recoil).toBeLessThan(.002);
  expect(Math.abs(settled.yaw)).toBeLessThan(.002);
  expect(settled.inaccuracy).toBeLessThan(.01);
  expect(settled.shots).toBe(0);
  expect(errors).toEqual([]);
});

test('rifle rounds penetrate wooden crates and damage bots behind cover', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await deploy(page);
  const result = await page.evaluate(() => {
    const g = __game;
    g.bots().forEach(b => { b.fireTimer = 9999; b.seen = false; });
    const bot = g.bots()[0]; bot.group.position.set(-2, 0, 8.6);
    g.teleport(-2, 13); g.aimAt(0, true); g.state.cooldown = 0;
    const before = bot.health; g.shoot();
    return { before, after: bot.health, hits: g.state.hits, kills: g.state.kills };
  });
  expect(result.hits).toBe(1);
  expect(result.after).toBeLessThan(result.before);
  expect(errors).toEqual([]);
});

test('empty-magazine reload is slower than a tactical reload', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await deploy(page);
  const reloads = await page.evaluate(() => {
    const g = __game, w = g.state.weapons[g.state.weapon];
    w.ammo = 1; g.state.cooldown = 0; g.shoot();
    g.state.cooldown = 0; g.shoot();
    const empty = g.state.reload;
    g.state.reload = 0; w.ammo = 10; g.reload();
    const tactical = g.state.reload;
    return { empty, tactical, base: w.reload };
  });
  expect(reloads.empty).toBeGreaterThan(reloads.tactical);
  expect(reloads.tactical).toBeCloseTo(reloads.base, 5);
  expect(errors).toEqual([]);
});
