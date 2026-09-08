import { test, expect } from '@playwright/test';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

test('one HTML works via file:// from an isolated folder while offline', async ({ page, context }) => {
  const folder = await mkdtemp(join(tmpdir(), 'dust-standalone-'));
  const target = join(folder, '沙域行动.html');
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  try {
    await copyFile(fileURLToPath(new URL('../../index.html', import.meta.url)), target);
    await context.setOffline(true);
    await page.goto(pathToFileURL(target).href + '?test');
    await expect(page.locator('#load-status')).toContainText('战场就绪');
    await page.locator('.brand').click();
    await expect(page.locator('#load-status')).toContainText('战场就绪');
    await page.locator('[data-level="easy"]').click();
    await page.locator('#deploy').click();
    await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
    await page.keyboard.down('w');
    await expect.poll(() => page.evaluate(() => __game.player.z)).toBeLessThan(24);
    await page.keyboard.up('w');
    await page.mouse.down();
    await expect.poll(async () => Number(await page.locator('#ammo').textContent())).toBeLessThan(30);
    await page.mouse.up();
    await page.keyboard.press('r');
    await expect(page.locator('#weapon-state')).toHaveText('RELOADING…');
    await expect(page.locator('#ammo')).toHaveText('30', { timeout: 5000 });
    await page.keyboard.press('3');
    await expect(page.locator('#weapon-label')).toHaveText('AWP');
    await page.mouse.down({ button: 'right' });
    await expect(page.locator('#scope')).toBeVisible();
    await page.mouse.up({ button: 'right' });
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause')).toBeVisible();
    await page.locator('#return-menu').click();
    await expect(page.locator('#menu')).toBeVisible();
    expect(errors).toEqual([]);
    expect(requests.every(url => url.startsWith(pathToFileURL(target).href))).toBe(true);
    await page.screenshot({ path: 'artifacts/standalone.png' });
  } finally {
    await page.close();
    await rm(folder, { recursive: true, force: true });
  }
});
