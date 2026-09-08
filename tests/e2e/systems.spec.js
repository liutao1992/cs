import { test, expect } from '@playwright/test';

test('streak banner, score doubling and achievements toast on rapid double kill',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?test');await page.locator('[data-level="easy"]').click();await page.locator('#deploy').click();
  await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
  await page.evaluate(()=>{const g=__game;g.bots().forEach((b,i)=>{b.fireTimer=1000;b.group.position.set(i*2,0,10);});g.teleport(0,15);});
  for(const i of [0,1]){
    await page.evaluate(i=>{const g=__game;g.bots()[i].health=1;g.state.cooldown=0;g.aimAt(i,true);g.shoot();},i);
    await expect.poll(()=>page.evaluate(()=>__game.state.kills)).toBe(i+1);
  }
  await expect(page.locator('#streak-banner')).toBeVisible();
  await expect(page.locator('#streak-text')).toHaveText('双杀');
  expect(await page.evaluate(()=>__game.state.score)).toBeGreaterThanOrEqual(300); // 100 + streak-doubled 200
  await expect(page.locator('#achievement-toast')).toBeVisible();
  await expect(page.locator('#achievement-toast')).toContainText('首杀');
  const prog=await page.evaluate(()=>JSON.parse(localStorage.getItem('dust-achievements')));
  expect(prog.unlocked['first-blood']).toBe(true);
  expect(errors).toEqual([]);
});

test('perks spawn, auto-pickup applies buffs and HUD chips',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?test');await page.locator('[data-level="easy"]').click();await page.locator('#deploy').click();
  await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
  await page.evaluate(()=>{__game.player.health=50;});
  const spawned=await page.evaluate(()=>{const p=__game.perks.forceSpawn(0);return!!p;});
  expect(spawned).toBe(true);
  await page.evaluate(()=>{const p=__game.perks.pickups[0];__game.teleport(p.x,p.z);});
  await expect.poll(()=>page.evaluate(()=>__game.state.pickups)).toBe(1);
  expect(await page.evaluate(()=>__game.player.health)).toBe(90); // 50 + 40
  await page.evaluate(()=>{__game.perks.forceSpawn(2);const p=__game.perks.pickups.find(p=>p.type==='speed');__game.teleport(p.x,p.z);});
  await expect.poll(()=>page.evaluate(()=>__game.state.buffs.speed>0)).toBe(true);
  await expect(page.locator('#buffs .buff-chip')).toHaveCount(1);
  await expect(page.locator('#buffs')).toContainText('加速');
  const air=await page.evaluate(()=>{const p=__game.perks.spawnAirDrop();return p&&p.air;});
  expect(air).toBe(true);
  expect(errors).toEqual([]);
});

test('survival mode waves, boss every third wave, records persistence',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?test');await page.locator('[data-level="easy"]').click();
  await page.selectOption('#mode','survival');await expect(page.locator('#bot-count')).toHaveText('∞');
  await page.locator('#deploy').click();
  await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
  await expect(page.locator('#wave-label')).toHaveText('WAVE 01');
  expect(await page.evaluate(()=>__game.bots().length)).toBe(4); // waveStats(1).count = 3+1
  async function clearWave(){
    for(let i=0;i<20;i++){
      const done=await page.evaluate(()=>{
        const g=__game,b=g.bots().find(b=>b.health>0);
        if(!b)return true;
        b.fireTimer=1000;b.group.position.set(0,0,10);g.teleport(0,15);g.state.cooldown=0;
        const idx=g.bots().indexOf(b);b.health=1;g.aimAt(idx,true);g.shoot();return false;
      });
      if(done)break;
    }
  }
  await clearWave();
  await expect.poll(()=>page.evaluate(()=>__game.survival.phase)).toBe('break');
  await page.evaluate(()=>__game.survival.update(6.1)); // fast-forward the 6s intermission (rAF-throttle safe)
  await expect(page.locator('#wave-label')).toHaveText('WAVE 02');
  expect(await page.evaluate(()=>__game.bots().filter(b=>b.health>0).length)).toBe(5); // waveStats(2).count
  await clearWave();
  await expect.poll(()=>page.evaluate(()=>__game.survival.phase)).toBe('break');
  await page.evaluate(()=>__game.survival.update(6.1));
  await expect.poll(()=>page.evaluate(()=>__game.bots().some(b=>b.elite&&b.health>0))).toBe(true);
  await page.evaluate(()=>__game.finish(false,'测试结束'));
  await expect(page.locator('#result-title')).toHaveText('防线失守');
  await expect(page.locator('#result-description')).toContainText('第 3 波');
  const rec=await page.evaluate(()=>JSON.parse(localStorage.getItem('dust-records')));
  expect(rec['survival:easy']).toBeTruthy();
  expect(rec['survival:easy'].wave).toBe(3);
  expect(errors).toEqual([]);
});
