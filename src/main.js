import * as THREE from 'three';
import { RoomEnvironment } from '../node_modules/three/examples/jsm/environments/RoomEnvironment.js';
import { createWorld, drawMap } from './world.js';
import { createWeapon, createBot, AudioEngine } from './equipment.js';
import { moveWithCollision, collides, findPath, applyDamage, reloadWeapon, weaponDefinitions } from './logic.js';
import { createStreak, registerKill, tickStreak, streakLevel, streakLabel, streakSub, computeScore } from './killstreak.js';
import { createPerkSystem, PERK_DEFS } from './perks.js';
import { createSurvival, waveStats } from './survival.js';
import { createRecords, ACH } from './records.js';
import { createEconomy } from './economy.js';
import { soldierReady } from './soldier.js';
import { weaponsReady } from './imported-weapons.js';
import { armsReady } from './arms.js';

const $=id=>document.getElementById(id),canvas=$('game');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(error){$('fatal').hidden=false;$('fatal').textContent='无法启动 3D 场景。请使用桌面版 Chrome 或 Edge，并在浏览器设置中开启图形加速后重试。';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.autoClear=false;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(78,innerWidth/innerHeight,.07,220);camera.rotation.order='YXZ';
const storedSettings=(()=>{try{return JSON.parse(localStorage.getItem('dust-settings')||'{}');}catch{return{};}})();
let world=createWorld(scene,renderer,storedSettings.map),weaponScene=new THREE.Scene(),weaponCamera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.01,10);
const environmentRoom=new RoomEnvironment(),environmentGenerator=new THREE.PMREMGenerator(renderer);
const weaponEnvironment=environmentGenerator.fromScene(environmentRoom,.04);weaponScene.environment=weaponEnvironment.texture;weaponScene.environmentIntensity=.65;environmentRoom.dispose();environmentGenerator.dispose();
weaponScene.add(new THREE.HemisphereLight(0xe4ece8,0x615143,2.5));const weaponLight=new THREE.DirectionalLight(0xffe7c4,3);weaponLight.position.set(-3,5,2);weaponScene.add(weaponLight);
const gunRig=new THREE.Group();weaponScene.add(gunRig);const guns=weaponDefinitions.map((_,i)=>{const g=createWeapon(i);gunRig.add(g);g.visible=i===0;return g;});
const flashMaterial=new THREE.MeshBasicMaterial({color:0xffdc7a,transparent:true,opacity:.95,depthWrite:false});const flash=new THREE.Mesh(new THREE.OctahedronGeometry(.09),flashMaterial);flash.scale.set(.55,.55,1.9);gunRig.add(flash);flash.visible=false;
const ray=new THREE.Raycaster(),direction=new THREE.Vector3(),audio=new AudioEngine(),keys=new Set();
const config={level:'normal',mode:'elimination',sensitivity:1,map:world.map.id},levels={easy:{count:3,reaction:1.2,accuracy:.25,damage:15,speed:1.7},normal:{count:5,reaction:.8,accuracy:.38,damage:19,speed:2.1},hard:{count:7,reaction:.48,accuracy:.58,damage:24,speed:2.6}};
const player={x:0,z:25,y:0,vy:0,yaw:0,pitch:0,health:100,armor:100};
const state={phase:'menu',round:0,wins:0,losses:0,time:150,elapsed:0,weapon:0,weapons:[],reload:0,cooldown:0,recoil:0,flash:0,shots:0,hits:0,kills:0,headshots:0,aim:false,mouseDown:false,bomb:null,plant:0,botCount:0,score:0,streak:createStreak(),buffs:{speed:0,damage:0},timeScale:1,pickups:0,wave:0,streakMax:0,awpKills:0,bossKills:0,untouched:true,weaponDefs:weaponDefinitions};
let bots=[],effects=[],roundDecals=[],toastTime=0,hitTime=0,damageTime=0,footstep=0,botThink=0,frameCounter=0,fpsTime=0,clockTime=0,hasFired=false,lastBombBeep=0,bannerUntil=0,slowUntil=0,achTimer=0,airdropWave=0;
const records=createRecords(),survival=createSurvival(spawnWave,audio),economy=createEconomy();
const BUY_TIME=15,COMP_ROUNDS=12,HALF_ROUND=6,NADE_DEFS={he:{name:'高爆手雷',price:300,tag:'投掷'},flash:{name:'闪光弹',price:200,tag:'投掷'},smoke:{name:'烟雾弹',price:300,tag:'投掷'}};
let perks=createPerkSystem(scene,world,audio);
const botNames=['Viper','Nomad','Falcon','Ghost','Raven','Echo','Wolf'];
function setVisible(id,visible){$(id).hidden=!visible;}
function toast(message){$('toast').textContent=message;$('toast').style.opacity='1';toastTime=2.4;}
function resetInput(){keys.clear();state.mouseDown=false;state.aim=false;hasFired=false;$('scoreboard').hidden=true;$('buy-menu').hidden=true;}
function spawnBot(i,stats=null,elite=false){
  const faction=config.mode==='competitive'&&state.side==='T'?'CT':'T';
  const rig=createBot(scene,i,elite,faction),spawns=config.mode==='competitive'&&state.side==='CT'?world.map.tBotSpawns:world.map.botSpawns,spawn=spawns[i%spawns.length],base=levels[config.level];
  const bot={...rig,id:i,name:elite?'泰坦':botNames[i],health:elite?600:(stats?.health??100),path:[],pathTime:0,fireTimer:base.reaction+Math.random(),reaction:0,revealed:0,seen:false,patrol:i,death:0,elite,damageMult:elite?1.5:1};
  bot.stats=elite?{accuracy:Math.min((stats?.accuracy??base.accuracy)+.1,.9),reaction:(stats?.reaction??base.reaction)*.8,speed:(stats?.speed??base.speed)*.85,damage:base.damage+6}:stats?{accuracy:stats.accuracy,reaction:stats.reaction,speed:stats.speed}:null;
  bot.group.position.set(spawn[0],0,spawn[1]);bot.hitboxes.forEach(m=>{m.userData.bot=bot;});bots.push(bot);return bot;
}
function spawnWave(n){
  const st=waveStats(n,levels[config.level]);state.wave=n;state.botCount=st.count;
  for(let i=0;i<st.count;i++)spawnBot(i,st,st.boss&&i===st.count-1);
  if(st.boss){audio.bossRoar();toast(`第 ${n} 波 · Boss「泰坦」登场`);}else toast(`第 ${n} 波来袭 · ${st.count} 名敌人`);
  if(n%4===0&&n>airdropWave){airdropWave=n;const p=perks.spawnAirDrop();if(p){audio.airdrop();toast('补给空投已投放 · 查看小地图');}}
}
function showStreak(level){$('streak-text').textContent=streakLabel(level);$('streak-sub').textContent=streakSub(level);const el=$('streak-banner');el.dataset.level=level;el.hidden=false;bannerUntil=performance.now()+1600;}
function showAchievement(id){const a=ACH.find(a=>a.id===id);if(!a)return;const el=$('achievement-toast');$('ach-icon').textContent=a.icon;$('ach-name').textContent=`成就解锁 · ${a.name}`;el.hidden=false;clearTimeout(achTimer);achTimer=setTimeout(()=>el.hidden=true,3200);audio.achievement();}
function slowmo(){slowUntil=performance.now()+900;state.timeScale=.28;audio.slowmo();}
function onKill(b,head,w){
  const level=registerKill(state.streak,clockTime);
  if(config.mode==='competitive')economy.award('kill',head);
  state.streakMax=Math.max(state.streakMax,state.streak.count);
  state.score+=computeScore(head,state.streak.count>1);
  if(head)audio.headshot();audio.killConfirm();
  if(state.weapon===2)state.awpKills++;
  const row=document.createElement('div'),who=document.createElement('em'),enemy=document.createElement('span');
  who.textContent='你';enemy.textContent=(b.elite?'♜ ':(head?'☠ ':''))+b.name+(head?' · 爆头':'');row.append(who,document.createTextNode(`  ─ ${w.name} → `),enemy);
  $('killfeed').prepend(row);while($('killfeed').children.length>5)$('killfeed').lastChild.remove();
  if(records.unlock('first-blood'))showAchievement('first-blood');
  if(b.elite){state.bossKills++;if(records.unlock('titan-slayer'))showAchievement('titan-slayer');}
  if(level>0){showStreak(level);audio.streak(level);}
  if(level>=4)slowmo();
  if(config.mode==='survival')survival.onBotKilled(bots);
  else if(state.kills===state.botCount&&!state.bomb){if(state.botCount>2)slowmo();finish(true,'所有敌人已被消灭，行动区域安全。');}
}
function requestCapture(){audio.unlock();const testMode=new URLSearchParams(location.search).has('test');if(!canvas.requestPointerLock){if(!testMode)pause('当前浏览器不支持鼠标锁定，请在桌面版 Chrome 或 Edge 打开游戏。');return;}try{const pending=canvas.requestPointerLock();pending?.catch(()=>{if(state.phase==='playing'&&!testMode)pause('鼠标尚未锁定。请点击“继续行动”；若内嵌窗口不支持，请在桌面浏览器打开本地地址。');});}catch{if(!testMode)pause('鼠标锁定失败，请点击“继续行动”重试。');}}
function clearEffects(){for(const fx of effects){scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();}effects=[];for(const d of roundDecals){scene.remove(d);d.geometry.dispose();d.material.dispose();}roundDecals=[];}
function rebuildWorld(){
  clearEffects();for(const bot of bots){scene.remove(bot.group);bot.group.traverse(m=>{if(m.isMesh)m.geometry.dispose();});}bots=[];
  if(state.bomb?.mesh){scene.remove(state.bomb.mesh);state.bomb.mesh.geometry.dispose();state.bomb.mesh.material.dispose();}
  world.dispose();world=createWorld(scene,renderer,config.map);perks=createPerkSystem(scene,world,audio);
}
function startRound(){
  if(world.map.id!==config.map)rebuildWorld();
  clearEffects();for(const bot of bots){scene.remove(bot.group);bot.group.traverse(m=>{if(m.isMesh)m.geometry.dispose();});}bots=[];
  if(state.bomb?.mesh){scene.remove(state.bomb.mesh);state.bomb.mesh.geometry.dispose();state.bomb.mesh.material.dispose();}
  state.round++;const comp=config.mode==='competitive';if(comp){if(state.round===1){economy.reset();state.hasKit=false;}state.side=state.round<=HALF_ROUND?'T':'CT';}
  const ps=comp&&state.side==='CT'?world.map.ctPlayerSpawn:world.map.playerSpawn;Object.assign(player,{x:ps.x,z:ps.z,y:0,vy:0,yaw:ps.yaw||0,pitch:0,health:100,armor:comp?player.armor:100});
  Object.assign(state,{phase:'playing',time:150,elapsed:0,weapon:comp?(state.side==='T'?4:1):0,weapons:weaponDefinitions.map((d,i)=>({...d,ammo:d.capacity,owned:!comp||(state.side==='T'?i===4:i===1)})),nades:{he:0,flash:0,smoke:0},botPlant:null,reload:0,cooldown:0,recoil:0,shots:0,hits:0,kills:0,headshots:0,aim:false,mouseDown:false,bomb:null,plant:0,score:0,streak:createStreak(),buffs:{speed:0,damage:0},timeScale:1,pickups:0,wave:0,streakMax:0,awpKills:0,bossKills:0,untouched:true});
  perks.reset();slowUntil=0;state.timeScale=1;document.body.classList.remove('slowmo');
  resetInput();botThink=0;footstep=0;damageTime=0;hitTime=0;lastBombBeep=0;$('damage').style.opacity='0';$('killfeed').replaceChildren();
  if(config.mode==='survival'){state.botCount=0;survival.start();}else{const level=levels[config.level];state.botCount=level.count;for(let i=0;i<level.count;i++)spawnBot(i);}
  guns.forEach((g,i)=>g.visible=i===state.weapon);['menu','pause','result','scope','interaction'].forEach(id=>setVisible(id,false));setVisible('hud',true);$('round-label').textContent=`ROUND ${String(state.round).padStart(2,'0')}`;$('wins').textContent=state.wins;$('losses').textContent=state.losses;
  if(comp&&state.round===HALF_ROUND+1){$('streak-text').textContent='换边 HALF-TIME';$('streak-sub').textContent='现在你扮演特警 · 守住包点阻止安放';const el=$('streak-banner');el.dataset.level=0;el.hidden=false;bannerUntil=performance.now()+2600;audio.waveStart();}
  if(comp&&state.side==='CT'&&bots.length)state.botPlant={bot:bots[0],site:world.sites[Math.floor(Math.random()*world.sites.length)],progress:0};
  if(config.mode!=='survival')toast(config.mode==='demolition'?'前往 A / B 点，按住 E 安放炸弹':comp?(state.side==='T'?'竞技对抗 · 你是悍匪进攻方 · 按 B 购买装备':'竞技对抗 · 你是特警防守方 · 按 B 购买装备'):'清剿开始 · 消灭全部敌人');updateHUD();requestCapture();
}
function pause(description='调整呼吸，准备下一次交锋。'){
  if(state.phase!=='playing'&&state.phase!=='paused')return;state.phase='paused';resetInput();$('pause-description').textContent=description;setVisible('pause',true);setVisible('scope',false);document.exitPointerLock?.();
}
function resume(){if(state.phase!=='paused')return;state.phase='playing';setVisible('pause',false);requestCapture();}
function menu(){state.phase='menu';resetInput();document.exitPointerLock?.();['hud','pause','result','scope'].forEach(id=>setVisible(id,false));setVisible('menu',true);$('damage').style.opacity='0';renderBest();renderHall();}
function finish(win,reason){if(state.phase!=='playing')return;state.phase='result';resetInput();if(win)state.wins++;else state.losses++;
  if(config.mode==='competitive')economy.award(win?'win':'loss');
  const isSurvival=config.mode==='survival';
  const newly=records.addRound({kills:state.kills,headshots:state.headshots,pickups:state.pickups,streakMax:state.streakMax,untouched:state.untouched,awpKill:state.awpKills>0,roundKills:state.kills,shots:state.shots,hits:state.hits,wave:state.wave,bossKills:state.bossKills});
  const isRecord=records.save(config.mode,config.level,{score:state.score,kills:state.kills,wave:state.wave});
  newly.forEach(showAchievement);
  const matchOver=config.mode==='competitive'&&state.round>=COMP_ROUNDS;$('next-round').style.display=matchOver?'none':'';
  $('result-label').textContent=matchOver?(state.wins>state.losses?'MATCH COMPLETE':state.wins<state.losses?'MATCH FAILED':'MATCH DRAW'):win?'MISSION COMPLETE':'MISSION FAILED';
  $('result-title').textContent=matchOver?`全场比赛 ${state.wins} : ${state.losses}`:isSurvival?(win?'区域已肃清':'防线失守'):win?(config.mode==='demolition'&&state.bomb?'目标已摧毁':'区域已肃清'):'行动未完成';
  $('result-description').textContent=isSurvival?`${reason}（坚守到第 ${Math.max(1,state.wave)} 波 · 得分 ${state.score}）`:matchOver?`${reason} · 12 局竞技对抗结束`:reason;
  $('result-kills').textContent=state.kills;$('result-accuracy').textContent=accuracy();$('result-time').textContent=formatTime(state.elapsed);$('result-score').textContent=state.score;
  const best=records.best(config.mode,config.level);
  $('result-record').innerHTML=best?`${isSurvival?'最佳纪录':'最佳得分'} · ${best.score} 分${best.wave?` · 第 ${best.wave} 波`:''}${isRecord?' <b class="new-record">新纪录</b>':''}`:'';
  $('result-achievements').replaceChildren(...newly.map(id=>{const a=ACH.find(a=>a.id===id),d=document.createElement('div');d.className='result-ach';d.innerHTML=`<b>${a.icon}</b><span>${a.name}</span>`;return d;}));
  setVisible('result',true);setVisible('scope',false);document.exitPointerLock?.();audio.tone(win?660:130,.5,.25,'triangle');renderBest();}
function accuracy(){return`${state.shots?Math.round(state.hits/state.shots*100):0}%`;}
function formatTime(seconds){const n=Math.max(0,Math.ceil(seconds));return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function updateHUD(){const w=state.weapons[state.weapon];if(!w)return;$('health').textContent=Math.ceil(player.health);$('armor').textContent=Math.ceil(player.armor);$('health-bar').style.width=`${player.health}%`;$('health-bar').style.background=player.health<30?'#f08a70':'#d5ed8b';$('ammo').textContent=w.ammo;$('reserve').textContent=w.reserve;$('weapon-label').textContent=w.name;$('weapon-state').textContent=state.reload>0?'RELOADING…':w.description;$('timer').textContent=formatTime(state.bomb?state.bomb.time:state.time);$('timer').style.color=state.bomb?'#f5ad80':state.time<20?'#f5ad80':'';$('enemies-left').textContent=bots.filter(b=>b.health>0).length;$('objective-text').textContent=state.bomb?(config.mode==='competitive'&&state.side==='CT'?(state.bomb.plantedByBot?'炸弹已安放 · 按住 E 拆除':'阻止敌人安放'):'守卫目标，等待引爆'):config.mode==='demolition'?'在 A / B 点安放炸弹':config.mode==='competitive'?(state.side==='T'?'安放并守卫炸弹（E）':'阻止安放 · 必要时拆除炸弹'):config.mode==='survival'?'抵御无尽波次 · 拾取补给强化':'消灭全部敌人';
  const waveEl=$('wave-label');if(config.mode==='survival'){waveEl.hidden=false;waveEl.textContent=`WAVE ${String(Math.max(1,state.wave)).padStart(2,'0')}`;$('timer').textContent=survival.phase==='break'?`下一波 ${Math.ceil(survival.breakLeft)}s`:'∞';$('timer').style.color='';}else waveEl.hidden=true;
  $('score-hud').textContent=state.score;
  $('hint-buy').hidden=config.mode!=='competitive';
  $('hint-interact').hidden=!['demolition','competitive'].includes(config.mode);
  const buffs=$('buffs'),chips=[];if(state.buffs.speed>clockTime)chips.push(`<span class="buff-chip" style="--c:#e8d25a">加速 ${Math.ceil(state.buffs.speed-clockTime)}s</span>`);if(state.buffs.damage>clockTime)chips.push(`<span class="buff-chip" style="--c:#e8935a">双倍伤害 ${Math.ceil(state.buffs.damage-clockTime)}s</span>`);if(buffs.dataset.sig!==chips.join('')){buffs.innerHTML=chips.join('');buffs.dataset.sig=chips.join('');}
  const zone=world.map.zones.find(zn=>player.x>=zn.x1&&player.x<=zn.x2&&player.z>=zn.z1&&player.z<=zn.z2);$('location').textContent=zone?zone.label:world.map.name;$('stat-kills').textContent=state.kills;$('stat-headshots').textContent=state.headshots;$('stat-accuracy').textContent=accuracy();$('stat-score').textContent=state.score;
  const comp=config.mode==='competitive';$('money-hud').hidden=!comp;$('nade-slots').hidden=!comp;if(comp){$('money').textContent=`$ ${economy.money}`;$('nade-he').textContent=state.nades.he;$('nade-flash').textContent=state.nades.flash;$('nade-smoke').textContent=state.nades.smoke;if(!$('buy-menu').hidden){if(!canBuy())toggleBuy(false);else{$('buy-time').textContent=Math.max(0,Math.ceil(BUY_TIME-state.elapsed));$('buy-money').textContent=`$ ${economy.money}`;}}}}
function switchWeapon(index){if(state.weapon===index||state.phase!=='playing')return;if(!state.weapons[index]?.owned){toast('未持有该武器 · 按 B 购买');return;}state.weapon=index;state.reload=0;state.cooldown=.24;state.aim=false;hasFired=state.mouseDown;guns.forEach((g,i)=>g.visible=i===index);audio.reload();updateHUD();}
function cycleWeapon(){
  if(state.phase!=='playing')return;
  const owned=state.weapons.map((weapon,index)=>weapon.owned?index:-1).filter(index=>index>=0);
  if(owned.length<2)return;
  const current=owned.indexOf(state.weapon),next=owned[(current+1)%owned.length];
  switchWeapon(next);
}
function reload(){const w=state.weapons[state.weapon];if(state.phase!=='playing'||state.reload>0||w.ammo===w.capacity)return;if(!w.reserve){toast('备用弹药耗尽 · 按 Q 切换武器');return;}state.reload=w.reload;state.aim=false;audio.reload();toast('正在更换弹匣');updateHUD();}
function canBuy(){return config.mode==='competitive'&&state.phase==='playing'&&state.elapsed<BUY_TIME&&!state.bomb;}
function buyWeapon(i){const d=weaponDefinitions[i];if(d.side!=='both'&&d.side!==state.side){audio.deny();toast(`${state.side==='T'?'悍匪':'特警'}阵营无法购买 ${d.name}`);return false;}if(state.weapons[i].owned){toast('已持有该武器');return false;}if(!economy.spend(d.price)){audio.deny();toast('资金不足');return false;}for(const s of [0,2,3].includes(i)?[0,2,3]:[1,4])state.weapons[s].owned=false;state.weapons[i]={...d,ammo:d.capacity,reserve:d.reserve,owned:true};state.weapon=i;state.reload=0;state.cooldown=.24;state.aim=false;guns.forEach((g,gi)=>g.visible=gi===i);audio.buy();toast(`已购入 ${d.name}`);renderBuyMenu();updateHUD();return true;}
function buyEquip(id){if(id==='armor'){if(player.armor>=100){toast('护甲已满');return false;}if(!economy.spend(1000)){audio.deny();toast('资金不足');return false;}player.armor=100;audio.buy();toast('防弹护甲已装备');}else{if(state.side!=='CT'){audio.deny();toast('仅特警阵营可购买拆弹器');return false;}if(state.hasKit){toast('已持有拆弹器');return false;}if(!economy.spend(400)){audio.deny();toast('资金不足');return false;}state.hasKit=true;audio.buy();toast('拆弹器已装备 · 拆除 5 秒');}renderBuyMenu();updateHUD();return true;}
function buyNade(t){const d=NADE_DEFS[t];if(state.nades[t]>=1){toast('该类投掷物最多携带 1 枚');return false;}if(!economy.spend(d.price)){audio.deny();toast('资金不足');return false;}state.nades[t]++;audio.buy();toast(`已购入 ${d.name}`);renderBuyMenu();updateHUD();return true;}
function renderBuyMenu(){$('buy-money').textContent=`$ ${economy.money}`;$('buy-time').textContent=Math.max(0,Math.ceil(BUY_TIME-state.elapsed));const items=[];
  weaponDefinitions.forEach((d,i)=>items.push({kind:'weapon',id:i,name:d.name,price:d.price,desc:d.description,tag:d.side==='both'?'通用':d.side==='T'?'悍匪':'特警',disabled:state.weapons[i].owned||economy.money<d.price||(d.side!=='both'&&d.side!==state.side)}));
  items.push({kind:'equip',id:'armor',name:'防弹护甲',price:1000,desc:'补满 100 点护甲',tag:'装备',disabled:player.armor>=100||economy.money<1000});
  items.push({kind:'equip',id:'kit',name:'拆弹器',price:400,desc:'拆除速度 10s → 5s',tag:'特警',disabled:state.hasKit||state.side!=='CT'||economy.money<400});
  for(const [t,d] of Object.entries(NADE_DEFS))items.push({kind:'nade',id:t,name:d.name,price:d.price,desc:`投掷物 · 当前 ${state.nades[t]}/1`,tag:d.tag,disabled:state.nades[t]>=1||economy.money<d.price});
  $('buy-grid').replaceChildren(...items.map(it=>{const b=document.createElement('button');b.type='button';b.className='buy-item';b.disabled=it.disabled;b.dataset.kind=it.kind;b.dataset.id=String(it.id);b.innerHTML=`<span class="bi-head"><span class="bi-name">${it.name}</span><span class="bi-tag">${it.tag}</span></span><span class="bi-price">$ ${it.price}</span><span class="bi-desc">${it.desc}</span>`;return b;}));}
function toggleBuy(open){const el=$('buy-menu'),show=open??el.hidden;if(!show){el.hidden=true;if(state.phase==='playing')requestCapture();return;}if(!canBuy()){toast(config.mode==='competitive'?'购买时间已过 · 下回合开始 15 秒内可购买':'竞技模式专属 · 部署界面切换模式');return;}renderBuyMenu();el.hidden=false;state.aim=false;state.mouseDown=false;hasFired=false;document.exitPointerLock?.();}
$('buy-grid').addEventListener('click',event=>{const b=event.target.closest('.buy-item');if(!b||b.disabled)return;if(b.dataset.kind==='weapon')buyWeapon(Number(b.dataset.id));else if(b.dataset.kind==='equip')buyEquip(b.dataset.id);else buyNade(b.dataset.id);});
function tracer(from,to,color=0xffdf91){const geo=new THREE.BufferGeometry().setFromPoints([from,to]),material=new THREE.LineBasicMaterial({color,transparent:true,opacity:.8});const line=new THREE.Line(geo,material);scene.add(line);effects.push({mesh:line,life:.065,total:.065});}
function impact(point,normal){const m=new THREE.Mesh(new THREE.CircleGeometry(.042,6),new THREE.MeshBasicMaterial({color:0x38362c,transparent:true,opacity:.75,depthWrite:false,side:THREE.DoubleSide}));m.position.copy(point).addScaledVector(normal,.012);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);scene.add(m);roundDecals.push(m);if(roundDecals.length>70){const old=roundDecals.shift();scene.remove(old);old.geometry.dispose();old.material.dispose();}}
function shoot(){
  const w=state.weapons[state.weapon];if(state.phase!=='playing'||state.cooldown>0||state.reload>0)return;if(!w.ammo){reload();state.cooldown=.2;audio.tone(220,.04,.08,'square');return;}
  w.ammo--;state.shots++;state.cooldown=w.interval;state.flash=.045;state.recoil=Math.min(.1,state.recoil+w.recoil);audio.shot(state.weapon);
  camera.updateMatrixWorld(true);const moving=keys.has('KeyW')||keys.has('KeyS')||keys.has('KeyA')||keys.has('KeyD');let spread=w.spread*(moving?3:1)*(keys.has('KeyC')?.6:1);if(state.aim)spread*=state.weapon===2?.015:.45;
  ray.setFromCamera(new THREE.Vector2((Math.random()-.5)*spread,(Math.random()-.5)*spread),camera);ray.far=120;
  scene.updateMatrixWorld(true);const targets=bots.filter(b=>b.health>0).flatMap(b=>b.hitboxes);const intersections=ray.intersectObjects([...world.solids,...targets],false);const hit=intersections[0];const end=hit?hit.point:ray.ray.at(95,new THREE.Vector3());const origin=camera.position.clone().add(new THREE.Vector3(.2,-.15,-.45).applyQuaternion(camera.quaternion));tracer(origin,end);
  if(hit?.object.userData.bot){const b=hit.object.userData.bot;const head=!!hit.object.userData.head||hit.point.y>b.group.position.y+1.52;b.health-=w.damage*(head?4:1)*(state.buffs.damage>clockTime?2:1);b.revealed=3;b.reaction=2;state.hits++;hitTime=.15;$('hitmarker').style.color=head?'#f5ad80':'#fff';audio.hit();if(b.health<=0){state.kills++;if(head)state.headshots++;onKill(b,head,w);}}
  else if(hit){const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);impact(hit.point,normal);}
  player.pitch=Math.min(1.4,player.pitch+w.recoil*(state.aim?.5:1));flash.position.copy(guns[state.weapon].userData.muzzle);flash.rotation.z=Math.random()*6;flash.visible=true;updateHUD();
}
function visibleToBot(bot,dist){const start=bot.group.position.clone().add(new THREE.Vector3(0,1.55,0));const target=new THREE.Vector3(player.x,player.y+(keys.has('KeyC')?1.05:1.58),player.z);direction.copy(target).sub(start);ray.set(start,direction.normalize());ray.far=dist-.3;return !ray.intersectObjects(world.solids,false).length;}
function updateBots(dt){const level=levels[config.level];botThink-=dt;const think=botThink<=0;if(think)botThink=.13;
  for(const b of bots){
    if(b.health<=0){b.death=Math.min(1,b.death+dt*2);b.group.rotation.z=-b.death*Math.PI/2;b.group.position.y=-.1*b.death;continue;}
    b.revealed=Math.max(0,b.revealed-dt);b.pathTime-=dt;b.fireTimer-=dt;const pos=b.group.position,dx=player.x-pos.x,dz=player.z-pos.z,dist=Math.hypot(dx,dz);
    const previousX=pos.x,previousZ=pos.z;
    if(think)b.seen=dist<37&&visibleToBot(b,dist);
    if(b.seen){b.reaction+=dt;b.revealed=1.2;b.group.rotation.y=Math.atan2(-dx,-dz);if(b.reaction>(b.stats?.reaction??level.reaction)&&b.fireTimer<=0){b.fireTimer=.38+Math.random()*.45;audio.shot(0,true);const from=pos.clone().add(new THREE.Vector3(0,1.3,0)),to=new THREE.Vector3(player.x,player.y+1.2,player.z);tracer(from,to,0xf3ac62);const chance=(b.stats?.accuracy??level.accuracy)*(dist<12?1.15:.8)*(keys.has('KeyC')?.8:1);if(Math.random()<chance){const damage=applyDamage(player.health,player.armor,(b.stats?.damage??level.damage)*(b.damageMult||1));Object.assign(player,damage);state.untouched=false;damageTime=.3;audio.noise(.08,500,.18);if(player.health<=0){finish(false,config.mode==='survival'?`你被 ${b.name} 击倒，倒在了第 ${state.wave} 波的战场上。`:`你被 ${b.name} 击倒。利用掩体、短点射和静步重新组织进攻。`);break;}}}}
    else b.reaction=Math.max(0,b.reaction-dt*2);
    if(!b.seen||dist>16||(state.botPlant&&state.side==='CT'&&state.botPlant.bot===b)){
      if(b.pathTime<=0){b.pathTime=1.2+Math.random()*.4;let target;if(state.botPlant&&state.side==='CT'&&state.botPlant.bot===b)target=state.botPlant.site;else if(state.bomb)target=state.bomb;else if(b.seen||state.elapsed>14)target=player;else target=world.map.waypoints[(b.patrol+Math.floor(state.elapsed/7))%world.map.waypoints.length];b.path=findPath(pos,target,world.obstacles);}
      const target=b.path[0];if(target){const tx=target.x-pos.x,tz=target.z-pos.z,len=Math.hypot(tx,tz);if(len<.3)b.path.shift();else{const bs=b.stats?.speed??level.speed;moveWithCollision(pos,tx/len*bs*dt,tz/len*bs*dt,world.obstacles,.38);if(!b.seen)b.group.rotation.y=Math.atan2(-tx,-tz);b.limbs.forEach((leg,i)=>leg.rotation.x=Math.sin(clockTime*9+i*Math.PI)*.4);}}
    }else b.limbs.forEach(leg=>leg.rotation.x*=.85);
    b.animate?.(dt,Math.hypot(pos.x-previousX,pos.z-previousZ)>.0001);
    if(state.botPlant&&state.side==='CT'){
      if(state.botPlant.bot!==b||b.health<=0)continue;
      const sp=state.botPlant.site,d2=Math.hypot(pos.x-sp.x,pos.z-sp.z);
      if(d2<2.2){state.botPlant.progress+=dt;b.group.rotation.y=Math.atan2(-(sp.x-pos.x),-(sp.z-pos.z));if(state.botPlant.progress>=3){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.4,.15,.27),new THREE.MeshStandardMaterial({color:0x39472f,emissive:0x391805}));mesh.position.set(pos.x,.09,pos.z);scene.add(mesh);state.bomb={x:pos.x,z:pos.z,time:35,defuse:0,mesh,plantedByBot:true};state.botPlant=null;toast(`敌人已在 ${sp.label} 点安放炸弹 · 按住 E 拆除`);audio.tone(300,.5,.3,'sawtooth');}}
    }
    if(state.bomb&&!state.bomb.plantedByBot&&Math.hypot(pos.x-state.bomb.x,pos.z-state.bomb.z)<2.2){state.bomb.defuse+=dt;toastTime=Math.max(toastTime,.1);$('toast').textContent='警告：敌人正在拆除炸弹';$('toast').style.opacity='1';if(state.bomb.defuse>7){finish(false,'炸弹已被敌人拆除。下次安放后请守住目标。');break;}}
  }
  if(state.botPlant&&state.botPlant.bot.health<=0){const next=bots.find(b=>b.health>0);if(next){state.botPlant.bot=next;state.botPlant.progress=0;}else state.botPlant=null;}
  if(state.bomb&&!state.bomb.plantedByBot&&!bots.some(b=>b.health>0&&Math.hypot(b.group.position.x-state.bomb.x,b.group.position.z-state.bomb.z)<2.2))state.bomb.defuse=0;
}
function updateBomb(dt){
  const bombMode=config.mode==='demolition'||config.mode==='competitive';
  if(!bombMode)return;
  if(state.bomb){state.bomb.time-=dt;lastBombBeep-=dt;if(lastBombBeep<=0){lastBombBeep=state.bomb.time<10?.35:.85;audio.tone(1600,.07,.12);}if(state.bomb.time<=0){audio.noise(.8,1000,1);const win=config.mode==='demolition'||!state.bomb.plantedByBot;finish(win,win?'爆破成功，目标已摧毁。':'炸弹引爆，任务失败。');return;}
    if(config.mode==='competitive'&&state.side==='CT'&&state.phase==='playing'){const req=state.hasKit?5:10,d=Math.hypot(player.x-state.bomb.x,player.z-state.bomb.z);if(d<2.2&&player.y===0){state.bomb.defuse+=dt;$('interaction-text').textContent=state.hasKit?'按住 E 拆除炸弹 · 拆弹器 5 秒':'按住 E 拆除炸弹 · 10 秒';setVisible('interaction',true);$('plant-progress').style.width=`${Math.min(100,state.bomb.defuse/req*100)}%`;if(state.bomb.defuse>=req){economy.award('defuse');finish(true,'炸弹已被拆除，防守成功。');}}else{state.bomb.defuse=0;setVisible('interaction',false);}return;}
    setVisible('interaction',false);return;}
  if(config.mode==='competitive'&&state.side==='CT'){ // CT 半场：玩家防守/拆除，不放包
    if(state.botPlant){const bp=state.botPlant.progress;$('interaction-text').textContent=`敌人正在安放炸弹（${Math.min(100,Math.round(bp/3*100))}%）`;setVisible('interaction',bp>0);$('plant-progress').style.width=`${Math.min(100,bp/3*100)}%`;}else setVisible('interaction',false);
    return;}
  const site=world.sites.find(s=>Math.hypot(player.x-s.x,player.z-s.z)<3.2);setVisible('interaction',!!site);
  if(site){$('interaction-text').textContent=`${site.label} 点 · 按住 E 安放炸弹`;if(keys.has('KeyE')&&player.y===0){state.plant+=dt;if(state.plant>=3){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.4,.15,.27),new THREE.MeshStandardMaterial({color:0x39472f,emissive:0x391805}));mesh.position.set(player.x,.09,player.z);scene.add(mesh);state.bomb={x:player.x,z:player.z,time:35,defuse:0,mesh};state.plant=0;if(config.mode==='competitive')economy.award('plant');toast('炸弹已安放 · 守卫目标 35 秒');audio.tone(1000,.4,.15);}}else state.plant=0;$('plant-progress').style.width=`${state.plant/3*100}%`;}else state.plant=0;
}
function updatePlayer(dt){
  const crouch=keys.has('KeyC'),walk=keys.has('ShiftLeft')||keys.has('ShiftRight'),speed=(crouch?2.1:walk?2.6:4.8)*(state.aim?.68:1)*(state.plant>0?0:1)*(state.buffs.speed>clockTime?1.35:1);let mx=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),mz=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));const moving=mx!==0||mz!==0;
  if(moving){const length=Math.hypot(mx,mz);mx/=length;mz/=length;const dx=(mx*Math.cos(player.yaw)+mz*Math.sin(player.yaw))*speed*dt,dz=(-mx*Math.sin(player.yaw)+mz*Math.cos(player.yaw))*speed*dt;moveWithCollision(player,dx,dz,world.obstacles,.36,player.y);footstep-=dt;if(footstep<=0&&player.y===0){if(!walk&&!crouch)audio.step();footstep=walk?.53:.36;}}
  if(keys.has('Space')&&player.y===0&&!crouch){player.vy=5.2;keys.delete('Space');}player.vy-=15*dt;player.y=Math.max(0,player.y+player.vy*dt);if(player.y===0)player.vy=0;
  camera.position.set(player.x,player.y+(crouch?1.1:1.65)+(moving&&player.y===0?Math.sin(clockTime*(walk?8:12))*.026:0),player.z);camera.rotation.set(-player.pitch,player.yaw,0,'YXZ');
  const fov=state.aim?(state.weapon===2?25:59):78;camera.fov=THREE.MathUtils.lerp(camera.fov,fov,Math.min(1,dt*14));camera.updateProjectionMatrix();
  state.cooldown=Math.max(0,state.cooldown-dt);if(state.reload>0){state.reload-=dt;if(state.reload<=0){reloadWeapon(state.weapons[state.weapon]);audio.reload();toast('换弹完成');}}
  if(state.mouseDown&&(!hasFired||state.weapons[state.weapon].automatic)){shoot();hasFired=true;}
  state.recoil=Math.max(0,state.recoil-dt*.15);const bob=moving?Math.sin(clockTime*9)*.012:Math.sin(clockTime*1.5)*.003;
  const reloadProgress=state.reload>0?1-state.reload/state.weapons[state.weapon].reload:0,reloadMotion=Math.sin(reloadProgress*Math.PI);
  gunRig.position.set(state.aim&&state.weapon!==2?.015:.29,-.29+bob-reloadMotion*.06,-.88+state.recoil*.8);
  gunRig.rotation.set(state.recoil*.75,state.aim?0:.10,-reloadMotion*.18);state.flash=Math.max(0,state.flash-dt);flash.visible=state.flash>0;flash.scale.setScalar(.7+Math.random()*.6);
  guns[state.weapon].userData.updateArms(reloadProgress);
  $('crosshair').style.setProperty('--spread',`${(state.aim?4:7)+(moving?4:0)+state.recoil*170}px`);setVisible('scope',state.aim&&state.weapon===2);setVisible('crosshair',!(state.aim&&state.weapon===2));
}
function updateEffects(dt){for(let i=effects.length-1;i>=0;i--){const fx=effects[i];fx.life-=dt;fx.mesh.material.opacity=Math.max(0,fx.life/fx.total);if(fx.life<=0){scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();effects.splice(i,1);}}toastTime-=dt;if(toastTime<=0)$('toast').style.opacity='0';hitTime-=dt;$('hitmarker').style.opacity=hitTime>0?'1':'0';damageTime=Math.max(0,damageTime-dt);$('damage').style.opacity=String(damageTime*2.4);}
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const realDt=Math.min((now-last)/1000,.05);last=now;state.timeScale=slowUntil>now?.28:Math.min(1,state.timeScale+realDt*1.4);document.body.classList.toggle('slowmo',state.timeScale<.9);const dt=realDt*state.timeScale;clockTime+=dt;frameCounter++;fpsTime+=dt;if(fpsTime>.75){$('fps').textContent=`${Math.round(frameCounter/fpsTime)} FPS`;fpsTime=0;frameCounter=0;}
  if(bannerUntil&&now>bannerUntil){$('streak-banner').hidden=true;bannerUntil=0;}
  if(state.phase==='menu'){camera.position.set(1.8+Math.sin(clockTime*.08)*1.3,4.2,26);camera.lookAt(-.6,3,-5);camera.fov=65;camera.updateProjectionMatrix();}
  if(state.phase==='playing'){if(config.mode!=='survival')state.time-=dt;state.elapsed+=dt;updatePlayer(dt);if(state.phase==='playing')updateBots(dt);if(state.phase==='playing')updateBomb(dt);if(state.phase==='playing'){perks.update(dt,player,state,clockTime,toast);if(config.mode==='survival')survival.update(dt);tickStreak(state.streak,clockTime);}if(state.time<=0&&!state.bomb&&config.mode!=='survival'&&state.phase==='playing')finish(false,'行动时间已耗尽。下次请加快推进。');updateEffects(dt);updateHUD();drawMap($('radar'),world,player,bots,state.bomb,false,perks.pickups);}
  renderer.clear();renderer.render(scene,camera);if(state.phase!=='menu'&&!(state.aim&&state.weapon===2)){renderer.clearDepth();renderer.render(weaponScene,weaponCamera);}
}
let hadLock=false;document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===canvas){hadLock=true;return;}if(hadLock){hadLock=false;if(state.phase==='playing'&&$('buy-menu').hidden)pause();}});
document.addEventListener('pointerlockerror',()=>{if(state.phase==='playing')pause('无法锁定鼠标。请点击“继续行动”，或使用桌面版 Chrome / Edge 打开游戏 HTML 文件。');});
document.addEventListener('mousemove',event=>{if(state.phase!=='playing'||document.pointerLockElement!==canvas)return;const sens=.002*config.sensitivity*(state.aim?.55:1);player.yaw-=Math.max(-300,Math.min(300,event.movementX))*sens;player.pitch=Math.max(-1.45,Math.min(1.45,player.pitch-event.movementY*sens));});
document.addEventListener('mousedown',event=>{if(state.phase!=='playing'||document.pointerLockElement!==canvas)return;if(event.button===0){state.mouseDown=true;hasFired=false;}if(event.button===2&&state.reload<=0)state.aim=true;});
document.addEventListener('mouseup',event=>{if(event.button===0){state.mouseDown=false;hasFired=false;}if(event.button===2)state.aim=false;});
canvas.addEventListener('contextmenu',event=>event.preventDefault());
document.addEventListener('keydown',event=>{if(state.phase!=='playing')return;if(!$('buy-menu').hidden){if(event.code==='Escape'||event.code==='KeyB'){event.preventDefault();toggleBuy(false);}return;}if(['Space','Tab','KeyW','KeyA','KeyS','KeyD','KeyR','KeyE','KeyC','KeyB','KeyQ'].includes(event.code))event.preventDefault();keys.add(event.code);if(event.repeat)return;if(event.code==='KeyR')reload();if(event.code==='KeyQ')cycleWeapon();if(event.code==='KeyB')toggleBuy();if(event.code==='Tab')setVisible('scoreboard',true);if(event.code==='Escape')pause();});
document.addEventListener('keyup',event=>{keys.delete(event.code);if(event.code==='Tab')setVisible('scoreboard',false);});
window.addEventListener('blur',()=>{if(state.phase==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.phase==='playing')pause();});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;weaponCamera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();weaponCamera.updateProjectionMatrix();});
$('setup').addEventListener('submit',event=>{event.preventDefault();config.mode=$('mode').value;state.round=0;state.wins=0;state.losses=0;startRound();});
document.querySelectorAll('[data-level]').forEach(button=>button.addEventListener('click',()=>{config.level=button.dataset.level;document.querySelectorAll('[data-level]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});updateDeployInfo();}));
function updateDeployInfo(){$('bot-count').textContent=$('mode').value==='survival'?'∞':levels[config.level].count;$('preview-label').textContent=world.map.name;$('map-size').textContent=world.map.size;const tag=document.querySelector('.map-tag strong'),sub=document.querySelector('.map-tag small');if(tag)tag.textContent=world.map.name;if(sub)sub.textContent=world.map.subtitle;renderBest();}
function renderBest(){const best=records.best($('mode').value,config.level);$('best-record').textContent=best?`${best.score} 分${best.wave?` · 第 ${best.wave} 波`:''}`:'—';}
function renderHall(){const p=records.progress();$('hall').innerHTML=ACH.map(a=>`<div class="hall-badge${p.unlocked[a.id]?' on':''}" title="${a.name} · ${a.desc}"><b>${a.icon}</b><span>${a.name}</span></div>`).join('');}
$('mode').addEventListener('change',updateDeployInfo);
$('map').addEventListener('change',e=>{config.map=e.target.value;saveSettings();rebuildWorld();drawMap($('preview-map'),world,null,[],null,true);updateDeployInfo();});
$('pause-button').addEventListener('click',()=>pause());$('resume').addEventListener('click',resume);$('return-menu').addEventListener('click',menu);$('result-menu').addEventListener('click',menu);$('next-round').addEventListener('click',startRound);
$('sensitivity').addEventListener('input',e=>{config.sensitivity=Number(e.target.value);saveSettings();});$('volume').addEventListener('input',e=>{audio.volume=Number(e.target.value);saveSettings();});$('quality').addEventListener('change',e=>{const high=e.target.value==='high';renderer.shadowMap.enabled=high;renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.75:1));scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});saveSettings();});
function saveSettings(){try{localStorage.setItem('dust-settings',JSON.stringify({sensitivity:config.sensitivity,volume:audio.volume,quality:$('quality').value,map:config.map}));}catch{/* Storage is optional in private browsing. */}}
try{const settings=JSON.parse(localStorage.getItem('dust-settings')||'{}');if(Number.isFinite(settings.sensitivity))config.sensitivity=Math.max(.3,Math.min(2,settings.sensitivity));if(Number.isFinite(settings.volume))audio.volume=Math.max(0,Math.min(1,settings.volume));$('sensitivity').value=config.sensitivity;$('volume').value=audio.volume;if(settings.quality==='low'){$('quality').value='low';renderer.shadowMap.enabled=false;renderer.setPixelRatio(1);}}catch{/* Invalid stored settings fall back to defaults. */}
$('map').value=world.map.id;drawMap($('preview-map'),world,null,[],null,true);updateDeployInfo();renderHall();$('load-status').textContent='战场就绪 · 建议使用键盘与鼠标';requestAnimationFrame(frame);
// Deterministic inspection hooks are available only on the local test route.
$('deploy').disabled=true;$('load-status').textContent='正在准备人物模型…';
Promise.all([soldierReady,weaponsReady,armsReady]).then(()=>{$('deploy').disabled=false;$('load-status').textContent='战场就绪 · 建议使用键盘与鼠标';}).catch(error=>{console.error('Model loading failed',error);$('load-status').textContent='模型加载失败，请刷新重试';});
if(new URLSearchParams(location.search).has('test'))window.__game={state,player,bots:()=>bots,get world(){return world;},viewModel:{guns,rig:gunRig},config,keys,shoot,reload,switchWeapon,startRound,finish,updateBomb,updateBots,pause,resume,collides,get perks(){return perks;},survival,records,waveStats,economy,buyWeapon,buyEquip,buyNade,toggleBuy,teleport(x,z,yaw=0){Object.assign(player,{x,z,yaw,pitch:0});},aimAt(index,head=false){const p=bots[index].group.position;player.yaw=Math.atan2(-(p.x-player.x),-(p.z-player.z));player.pitch=Math.atan2((head?1.67:1.2)-(player.y+1.65),Math.hypot(p.x-player.x,p.z-player.z));camera.position.set(player.x,player.y+1.65,player.z);camera.rotation.set(-player.pitch,player.yaw,0,'YXZ');camera.updateMatrixWorld(true);}};
