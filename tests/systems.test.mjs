import test from 'node:test';
import assert from 'node:assert/strict';
import { streakLevel, streakLabel, streakSub, computeScore, createStreak, registerKill, tickStreak, STREAK_WINDOW } from '../src/killstreak.js';
import { waveStats } from '../src/survival.js';
import { createRecords } from '../src/records.js';

const memStorage=()=>{const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))};};

test('streakLevel maps kill counts to tiers',()=>{
  assert.equal(streakLevel(0),0);assert.equal(streakLevel(1),0);
  assert.equal(streakLevel(2),1);assert.equal(streakLevel(3),2);
  assert.equal(streakLevel(4),3);assert.equal(streakLevel(5),4);assert.equal(streakLevel(9),4);
  assert.equal(streakLabel(1),'双杀');assert.equal(streakLabel(4),'疯狂杀戮');assert.equal(streakSub(2),'TRIPLE KILL');
});

test('streak window expires and resets count',()=>{
  const st=createStreak();
  assert.equal(registerKill(st,0),0);
  assert.equal(registerKill(st,1),1); // double kill within window
  assert.equal(st.count,2);
  assert.equal(tickStreak(st,1+STREAK_WINDOW+.1),false); // expired
  assert.equal(st.count,0);
  assert.equal(registerKill(st,10),0); // fresh streak after expiry
  assert.equal(st.count,1);
  assert.equal(st.max,2);
});

test('computeScore applies headshot bonus and streak doubling',()=>{
  assert.equal(computeScore(false,false),100);
  assert.equal(computeScore(true,false),150);
  assert.equal(computeScore(false,true),200);
  assert.equal(computeScore(true,true),300);
});

test('waveStats scales and caps with boss every third wave',()=>{
  const base={reaction:.8,accuracy:.38,damage:19,speed:2.1};
  const w1=waveStats(1,base),w8=waveStats(8,base),w12=waveStats(12,base);
  assert.equal(w1.count,4);assert.equal(w8.count,8);
  assert.equal(w1.health,100);assert.equal(w8.health,205);
  assert.equal(w12.health,250); // cap
  assert.ok(w8.accuracy<=.85);assert.ok(w8.reaction>=.3);assert.ok(w8.speed<=3.4);
  assert.equal(waveStats(3,base).boss,true);assert.equal(waveStats(4,base).boss,false);assert.equal(waveStats(6,base).boss,true);
});

test('records save/best keeps the highest score per mode and level',()=>{
  const r=createRecords(memStorage());
  assert.equal(r.best('survival','normal'),null);
  assert.equal(r.save('survival','normal',{score:500,kills:12,wave:3}),true);
  assert.equal(r.save('survival','normal',{score:300,kills:20,wave:5}),false); // lower score ignored
  const best=r.best('survival','normal');
  assert.equal(best.score,500);assert.equal(best.wave,3);
  assert.equal(r.save('survival','normal',{score:900,kills:8,wave:2}),true);
  assert.equal(r.best('survival','normal').score,900);
  assert.equal(r.best('elimination','normal'),null); // keys are isolated
});

test('records addRound unlocks achievements cumulatively',()=>{
  const r=createRecords(memStorage());
  let out=r.addRound({kills:1,headshots:1,pickups:0,streakMax:0,untouched:true,awpKill:false,roundKills:1,shots:12,hits:9,wave:0,bossKills:0});
  assert.ok(out.includes('first-blood'));
  assert.ok(out.includes('untouchable'));
  assert.ok(out.includes('sharpshooter')); // 9/12 = 75%
  assert.ok(!out.includes('rampage-5'));
  out=r.addRound({kills:99,headshots:49,pickups:20,streakMax:5,untouched:false,awpKill:true,roundKills:10,shots:0,hits:0,wave:10,bossKills:1});
  assert.ok(out.includes('marksman-10')); // cumulative headshots 50
  assert.ok(out.includes('marksman-50'));
  assert.ok(out.includes('centurion')); // cumulative kills 100
  assert.ok(out.includes('rampage-5'));
  assert.ok(out.includes('round-10'));
  assert.ok(out.includes('wave-5'));assert.ok(out.includes('wave-10'));
  assert.ok(out.includes('titan-slayer'));
  assert.ok(out.includes('scavenger'));
  assert.ok(out.includes('wallbang-awp'));
  // Nothing new on an empty round
  out=r.addRound({kills:0,headshots:0,pickups:0,streakMax:0,untouched:false,awpKill:false,roundKills:0,shots:0,hits:0,wave:0,bossKills:0});
  assert.equal(out.length,0);
});
