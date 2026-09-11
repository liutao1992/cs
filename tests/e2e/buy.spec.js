import { test, expect } from '@playwright/test';

test('competitive economy: buy menu, purchases, side limits and kill awards', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?test');
  await page.selectOption('#mode', 'competitive');
  await page.locator('[data-level="easy"]').click();
  await page.locator('#deploy').click();
  await expect.poll(() => page.evaluate(() => __game.state.phase)).toBe('playing');
  // T side starts with $800 and only the Glock-18.
  expect(await page.evaluate(() => __game.economy.money)).toBe(800);
  expect(await page.evaluate(() => __game.state.weapon)).toBe(4);
  expect(await page.evaluate(() => __game.state.weapons.filter(w => w.owned).map(w => w.name))).toEqual(['Glock-18']);
  await expect(page.locator('#money')).toHaveText('$ 800');
  // B opens the buy menu during the 15s buy window; CT gear is disabled for T.
  await page.keyboard.press('b');
  await expect(page.locator('#buy-menu')).toBeVisible();
  await expect(page.locator('#buy-money')).toHaveText('$ 800');
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  // Real UI purchase: flashbang $200 via its grid button.
  await page.getByRole('button', { name: /闪光弹/ }).click();
  expect(await page.evaluate(() => __game.economy.money)).toBe(600);
  expect(await page.evaluate(() => __game.state.nades.flash)).toBe(1);
  await expect(page.locator('#buy-money')).toHaveText('$ 600');
  // Side limits and affordability are enforced.
  expect(await page.evaluate(() => __game.buyWeapon(3))).toBe(false); // M4A1-S is CT-only
  expect(await page.evaluate(() => __game.buyWeapon(2))).toBe(false); // AWP unaffordable
  expect(await page.evaluate(() => __game.buyWeapon(0))).toBe(false); // AK-47 unaffordable
  expect(await page.evaluate(() => __game.economy.money)).toBe(600);
  // B closes the menu and re-locks the pointer.
  await page.keyboard.press('b');
  await expect(page.locator('#buy-menu')).toBeHidden();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  // Headshot kill pays $450 in competitive.
  await page.evaluate(() => { const g = __game; g.bots().forEach((b, i) => { b.fireTimer = 1000; b.group.position.set(i === 0 ? 0 : 26, 0, i === 0 ? 10 : -24); }); g.teleport(0, 15); g.state.cooldown = 0; g.aimAt(0, true); g.shoot(); });
  await expect.poll(() => page.evaluate(() => __game.state.kills)).toBe(1);
  expect(await page.evaluate(() => __game.economy.money)).toBe(1050);
  // Winning the round pays $3500; money and purchases persist into round 2.
  await page.evaluate(() => __game.finish(true, '测试胜利结算'));
  await expect(page.locator('#result')).toBeVisible();
  expect(await page.evaluate(() => __game.economy.money)).toBe(4550);
  await page.locator('#next-round').click();
  await expect.poll(() => page.evaluate(() => __game.state.phase)).toBe('playing');
  expect(await page.evaluate(() => __game.economy.money)).toBe(4550);
  expect(await page.evaluate(() => __game.state.nades)).toEqual({ he: 0, flash: 0, smoke: 0 });
  // Now the AK-47 is affordable: buy it through the real UI and check slot replacement.
  await page.keyboard.press('b');
  await expect(page.locator('#buy-menu')).toBeVisible();
  await page.getByRole('button', { name: /AK-47/ }).click();
  expect(await page.evaluate(() => __game.economy.money)).toBe(2050);
  expect(await page.evaluate(() => __game.state.weapon)).toBe(0);
  expect(await page.evaluate(() => __game.state.weapons.filter(w => w.owned).map(w => w.name).sort())).toEqual(['AK-47', 'Glock-18']);
  await page.keyboard.press('Escape');
  await expect(page.locator('#buy-menu')).toBeHidden();
  // Weapon switch refuses unowned weapons (M4A1-S is CT-only and unowned).
  await page.evaluate(() => __game.switchWeapon(3));
  expect(await page.evaluate(() => __game.state.weapon)).toBe(0);
  expect(errors).toEqual([]);
});
