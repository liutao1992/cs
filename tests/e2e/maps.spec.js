import { test, expect } from '@playwright/test';

test('dust2 deploy: map zones drive the location readout, and switching maps rebuilds the world',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?test');
  await page.selectOption('#map','dust2');
  await expect(page.locator('#preview-label')).toHaveText('炙热沙城');
  await page.locator('[data-level="easy"]').click();await page.locator('#deploy').click();
  await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
  expect(await page.evaluate(()=>__game.world.map.id)).toBe('dust2');
  expect(await page.evaluate(()=>({x:__game.player.x,z:__game.player.z}))).toEqual({x:0,z:26});
  await expect(page.locator('#location')).toHaveText('悍匪出生点');
  // Zone lookup across the three classic lanes.
  await page.evaluate(()=>__game.teleport(0,12));await expect(page.locator('#location')).toHaveText('中路');
  await page.evaluate(()=>__game.teleport(-23,10));await expect(page.locator('#location')).toHaveText('A 大道');
  await page.evaluate(()=>__game.teleport(24,6));await expect(page.locator('#location')).toHaveText('B 隧道');
  await page.evaluate(()=>__game.teleport(24,-19));await expect(page.locator('#location')).toHaveText('B 平台');
  // Bots spawn on the CT side (north) and the bomb sites exist.
  expect(await page.evaluate(()=>__game.world.sites.map(s=>s.label).join(''))).toBe('AB');
  expect(await page.evaluate(()=>__game.bots().every(b=>b.group.position.z<-10))).toBe(true);
  // Back to menu, swap map, redeploy: the world must be rebuilt around the old city.
  await page.evaluate(()=>__game.finish(true,'测试换图'));
  await page.locator('#result-menu').click();
  await page.selectOption('#map','oldcity');
  await expect(page.locator('#preview-label')).toHaveText('沙域 · 旧城');
  await page.locator('#deploy').click();
  await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
  expect(await page.evaluate(()=>__game.world.map.id)).toBe('oldcity');
  await expect(page.locator('#location')).toHaveText('进攻方出生点');
  expect(errors).toEqual([]);
});
