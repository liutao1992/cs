import { test, expect } from '@playwright/test';

test('competitive halves: T plant, halftime side swap, CT bot plant and player defuse', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?test');
  await page.selectOption('#mode', 'competitive');
  await page.locator('[data-level="easy"]').click();
  await page.locator('#deploy').click();
  await expect.poll(() => page.evaluate(() => __game.state.phase)).toBe('playing');
  // Round 1: player is T, spawns south with the Glock-18.
  expect(await page.evaluate(() => __game.state.side)).toBe('T');
  expect(await page.evaluate(() => __game.state.weapon)).toBe(4);
  expect(await page.evaluate(() => __game.player.z)).toBeGreaterThan(10);
  // T half: player can plant at a site. Teleport to site A and hold E.
  await page.evaluate(() => { const g = __game, s = g.world.sites[0]; g.player.health = 1e6; g.player.armor = 1e6; g.bots().forEach(b => { b.fireTimer = 9999; b.seen = false; }); g.teleport(s.x, s.z); g.keys.add('KeyE'); g.updateBomb(3.1); g.keys.delete('KeyE'); });
  expect(await page.evaluate(() => !!__game.state.bomb)).toBe(true);
  expect(await page.evaluate(() => __game.state.bomb.plantedByBot)).toBeFalsy();
  // Bomb detonation wins the round for the player (T half).
  await page.evaluate(() => __game.updateBomb(36));
  await expect(page.locator('#result')).toBeVisible();
  expect(await page.evaluate(() => __game.state.wins)).toBe(1);
  // Rush through rounds 2..6 as T wins (auto-resume: pointer lock can drop spuriously in headless).
  const advance = async () => {
    await page.locator('#next-round').click();
    await expect.poll(() => page.evaluate(() => { if (__game.state.phase === 'paused') __game.resume(); return __game.state.phase; })).toBe('playing');
  };
  const winRound = () => page.evaluate(() => { const g = __game; if (g.state.phase === 'paused') g.resume(); g.player.health = 1e6; g.player.armor = 1e6; g.bots().forEach(b => { b.fireTimer = 9999; b.seen = false; }); g.finish(true, '测试推进'); });
  for (let r = 2; r <= 6; r++) {
    await advance();
    expect(await page.evaluate(() => __game.state.side)).toBe('T');
    await winRound();
  }
  await advance();
  expect(await page.evaluate(() => __game.state.round)).toBe(7);
  expect(await page.evaluate(() => __game.state.side)).toBe('CT');
  await expect(page.locator('#streak-banner')).toBeVisible();
  await page.evaluate(() => { __game.player.health = 1e6; __game.player.armor = 1e6; __game.bots().forEach(b => { b.fireTimer = 9999; b.seen = false; }); });
  // CT half: player spawns north, owns USP-S, bots attack from the south.
  expect(await page.evaluate(() => __game.player.z)).toBeLessThan(-10);
  expect(await page.evaluate(() => __game.state.weapon)).toBe(1);
  expect(await page.evaluate(() => Math.min(...__game.bots().map(b => b.group.position.z)))).toBeGreaterThan(15);
  expect(await page.evaluate(() => !!__game.state.botPlant)).toBe(true);
  // Bot carrier walks to a site and plants (step AI deterministically, bomb timer untouched).
  await page.evaluate(() => { const g = __game; g.bots().forEach(b => { b.fireTimer = 9999; b.seen = false; b.stats = { ...b.stats, speed: 6 }; }); for (let i = 0; i < 900 && !g.state.bomb; i++) g.updateBots(.1); });
  expect(await page.evaluate(() => !!__game.state.bomb)).toBe(true);
  expect(await page.evaluate(() => __game.state.bomb.plantedByBot)).toBe(true);
  // Player defuses without a kit: 10 seconds held at the bomb.
  const moneyBefore = await page.evaluate(() => __game.economy.money);
  await page.evaluate(() => { const g = __game; if (g.state.phase === 'paused') g.resume(); g.teleport(g.state.bomb.x, g.state.bomb.z); g.keys.add('KeyE'); g.updateBomb(10); g.keys.delete('KeyE'); });
  await expect(page.locator('#result')).toBeVisible();
  expect(await page.evaluate(() => __game.state.wins)).toBe(7);
  expect(await page.evaluate(() => __game.economy.money)).toBe(Math.min(16000, moneyBefore + 3500 + 800));
  // Match point: after round 12 the next-round button is hidden and the scoreboard shows the total.
  for (let r = 8; r <= 12; r++) {
    await advance();
    await winRound();
  }
  await expect(page.locator('#result')).toBeVisible();
  expect(await page.evaluate(() => __game.state.round)).toBe(12);
  await expect(page.locator('#next-round')).toBeHidden();
  await expect(page.locator('#result-title')).toContainText('12 : 0');
  expect(errors).toEqual([]);
});
