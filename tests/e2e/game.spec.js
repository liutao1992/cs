import { test, expect } from '@playwright/test';
test('deployment, real controls, combat, collision, bomb and round lifecycle',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?test');await expect(page.locator('#load-status')).toContainText('战场就绪');
  await page.locator('[data-level="easy"]').click();await expect(page.locator('#bot-count')).toHaveText('3');
  await page.screenshot({path:'artifacts/deployment.png'});
  await page.locator('#deploy').click();
  await expect.poll(()=>page.evaluate(()=>({phase:__game.state.phase,locked:!!document.pointerLockElement}))).toEqual({phase:'playing',locked:true});
  await page.keyboard.down('w');await expect.poll(()=>page.evaluate(()=>__game.player.z)).toBeLessThan(24);await page.keyboard.up('w');
  await page.mouse.down();await expect.poll(()=>page.evaluate(()=>__game.state.weapons[0].ammo)).toBeLessThan(29);await page.mouse.up();
  await page.keyboard.press('r');await expect(page.locator('#weapon-state')).toHaveText('RELOADING…');await expect(page.locator('#ammo')).toHaveText('30',{timeout:5000});
  await page.keyboard.press('q');await expect(page.locator('#weapon-label')).toHaveText('USP-S');
  await page.keyboard.press('q');await page.mouse.down({button:'right'});await expect(page.locator('#scope')).toBeVisible();await page.mouse.up({button:'right'});await expect(page.locator('#scope')).toBeHidden();
  await page.keyboard.press('Escape');await expect(page.locator('#pause')).toBeVisible();const time=await page.evaluate(()=>__game.state.time);await page.screenshot({path:'artifacts/pause.png'});expect(await page.evaluate(()=>__game.state.time)).toBe(time);
  // Programmatic unlock is used to avoid Chromium's Escape relock cooldown.
  await page.locator('#resume').click();await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
  await page.evaluate(()=>{const g=__game;g.bots().forEach((b,i)=>{b.fireTimer=1000;b.group.position.set(i===0?0:26,0,i===0?10:-24);});g.teleport(0,15);g.switchWeapon(0);g.state.cooldown=0;g.aimAt(0,true);g.shoot();});
  await expect.poll(()=>page.evaluate(()=>__game.state.kills)).toBe(1);expect(await page.evaluate(()=>__game.state.headshots)).toBe(1);
  await page.evaluate(()=>{const g=__game;g.teleport(-3,12,-Math.PI/2);});await page.keyboard.down('w');await expect.poll(()=>page.evaluate(()=>__game.player.x)).toBeGreaterThan(3);await page.keyboard.up('w');expect(await page.evaluate(()=>__game.player.x)).toBeLessThan(4.65);
  await page.evaluate(()=>{const g=__game;g.teleport(0,22);g.state.weapon=0;});await page.screenshot({path:'artifacts/gameplay.png'});
  await page.evaluate(()=>{const g=__game;g.config.mode='demolition';g.teleport(24,-19);g.keys.add('KeyE');g.updateBomb(3.1);g.keys.delete('KeyE');});expect(await page.evaluate(()=>!!__game.state.bomb)).toBe(true);
  await page.evaluate(()=>__game.updateBomb(36));await expect(page.locator('#result-title')).toHaveText('目标已摧毁');
  await page.locator('#next-round').click();await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');expect(await page.evaluate(()=>({round:__game.state.round,bomb:__game.state.bomb,health:__game.player.health}))).toEqual({round:2,bomb:null,health:100});
  await page.evaluate(()=>{__game.state.time=-1;});await expect(page.locator('#result-title')).toHaveText('行动未完成');
  await page.locator('#result-menu').click();await expect(page.locator('#menu')).toBeVisible();expect(errors).toEqual([]);
});
test('all assets are local and deployment fits narrow screens',async({page})=>{const external=[];page.on('request',req=>{const url=new URL(req.url());if(['http:','https:'].includes(url.protocol)&&!url.hostname.match(/^(localhost|127\.0\.0\.1)$/))external.push(req.url());});await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#load-status')).toContainText('战场就绪');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(external).toEqual([]);});
test('walls block shots, exposed bots deal damage, and bots can defuse',async({page})=>{
  await page.goto('/?test');await page.locator('#deploy').click();await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
  const occlusion=await page.evaluate(()=>{const g=__game;g.bots().forEach((b,i)=>{b.fireTimer=10000;b.group.position.set(-26,0,i===0?12:-24);});g.teleport(0,12);g.aimAt(0,true);g.state.cooldown=0;g.shoot();return g.bots()[0].health;});expect(occlusion).toBe(100);
  const health=await page.evaluate(()=>{const g=__game,b=g.bots()[0];g.teleport(0,22);b.group.position.set(0,0,19);b.reaction=100;b.seen=true;const original=Math.random;try{Math.random=()=>0;for(let i=0;i<10;i++)g.updateBots(.1);b.fireTimer=0;g.updateBots(.1);}finally{Math.random=original;}return g.player.health;});expect(health).toBeLessThan(100);
  await page.evaluate(()=>{const g=__game;g.config.mode='demolition';g.teleport(24,-19);g.keys.add('KeyE');g.updateBomb(3.1);g.keys.clear();g.bots()[0].group.position.set(24,0,-19);g.bots()[0].fireTimer=10000;for(let i=0;i<75;i++){if(g.state.phase!=='playing')break;g.updateBots(.1);}});await expect(page.locator('#result-description')).toContainText('拆除');
});
