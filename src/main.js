import * as THREE from 'three';
import { RoomEnvironment } from '../node_modules/three/examples/jsm/environments/RoomEnvironment.js';
import { createWorld, drawMap } from './world.js';
import { createWeapon, createBot, AudioEngine } from './equipment.js';
import { moveWithCollision, collides, findPath, applyDamage, reloadWeapon, weaponDefinitions } from './logic.js';
import { createStreak, registerKill, tickStreak, streakLevel, streakLabel, streakSub, computeScore } from './killstreak.js';
import { createPerkSystem, PERK_DEFS } from './perks.js';
import { createSurvival, waveStats } from './survival.js';
import { createRecords, ACH } from './records.js';

const $=id=>document.getElementById(id),canvas=$('game');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(error){$('fatal').hidden=false;$('fatal').textContent='无法启动 3D 场景。请使用桌面版 Chrome 或 Edge，并在浏览器设置中开启图形加速后重试。';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.autoClear=false;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(78,innerWidth/innerHeight,.07,220);camera.rotation.order='YXZ';
const world=createWorld(scene,renderer),weaponScene=new THREE.Scene(),weaponCamera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.01,10);
const environmentRoom=new RoomEnvironment(),environmentGenerator=new THREE.PMREMGenerator(renderer);
const weaponEnvironment=environmentGenerator.fromScene(environmentRoom,.04);weaponScene.environment=weaponEnvironment.texture;weaponScene.environmentIntensity=.65;environmentRoom.dispose();environmentGenerator.dispose();
weaponScene.add(new THREE.HemisphereLight(0xe4ece8,0x615143,2.5));const weaponLight=new THREE.DirectionalLight(0xffe7c4,3);weaponLight.position.set(-3,5,2);weaponScene.add(weaponLight);
const gunRig=new THREE.Group();weaponScene.add(gunRig);const guns=weaponDefinitions.map((_,i)=>{const g=createWeapon(i);gunRig.add(g);g.visible=i===0;return g;});
const flashMaterial=new THREE.MeshBasicMaterial({color:0xffdc7a,transparent:true,opacity:.95,depthWrite:false});const flash=new THREE.Mesh(new THREE.OctahedronGeometry(.09),flashMaterial);flash.scale.set(.55,.55,1.9);gunRig.add(flash);flash.visible=false;
const ray=new THREE.Raycaster(),direction=new THREE.Vector3(),audio=new AudioEngine(),keys=new Set();
const config={level:'normal',mode:'elimination',sensitivity:1},levels={easy:{count:3,reaction:1.2,accuracy:.25,damage:15,speed:1.7},normal:{count:5,reaction:.8,accuracy:.38,damage:19,speed:2.1},hard:{count:7,reaction:.48,accuracy:.58,damage:24,speed:2.6}};
const player={x:0,z:25,y:0,vy:0,yaw:0,pitch:0,health:100,armor:100};
const state={phase:'menu',round:0,wins:0,losses:0,time:150,elapsed:0,weapon:0,weapons:[],reload:0,cooldown:0,recoil:0,flash:0,shots:0,hits:0,kills:0,headshots:0,aim:false,mouseDown:false,bomb:null,plant:0,botCount:0,score:0,streak:createStreak(),buffs:{speed:0,damage:0},timeScale:1,pickups:0,wave:0,streakMax:0,awpKills:0,bossKills:0,untouched:true,weaponDefs:weaponDefinitions};
let bots=[],effects=[],roundDecals=[],toastTime=0,hitTime=0,damageTime=0,footstep=0,botThink=0,frameCounter=0,fpsTime=0,clockTime=0,hasFired=false,lastBombBeep=0,bannerUntil=0,slowUntil=0,achTimer=0,airdropWave=0;
const records=createRecords(),perks=createPerkSystem(scene,world,audio),survival=createSurvival(spawnWave,audio);
const botNames=['Viper','Nomad','Falcon','Ghost','Raven','Echo','Wolf'];
const enemySpawns=[[0,-22],[-25,-13],[25,-13],[-1,-9],[24,-25],[-24,-25],[0,1]];
const waypoints=[{x:0,z:16},{x:0,z:0},{x:0,z:-22},{x:26,z:-20},{x:26,z:1},{x:26,z:23},{x:-26,z:23},{x:-26,z:1},{x:-26,z:-20}];
function setVisible(id,visible){$(id).hidden=!visible;}
function toast(message){$('toast').textContent=message;$('toast').style.opacity='1';toastTime=2.4;}
function resetInput(){keys.clear();state.mouseDown=false;state.aim=false;hasFired=false;$('scoreboard').hidden=true;}
function spawnBot(i,stats=null,elite=false){
  const rig=createBot(scene,i,elite),spawn=enemySpawns[i%enemySpawns.length],base=levels[config.level];
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
function requestCapture(){audio.unlock();if(!canvas.requestPointerLock){pause('当前浏览器不支持鼠标锁定，请在桌面版 Chrome 或 Edge 打开游戏。');return;}try{const pending=canvas.requestPointerLock();pending?.catch(()=>{if(state.phase==='playing')pause('鼠标尚未锁定。请点击“继续行动”；若内嵌窗口不支持，请在桌面浏览器打开本地地址。');});}catch{pause('鼠标锁定失败，请点击“继续行动”重试。');}}
function clearEffects(){for(const fx of effects){scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();}effects=[];for(const d of roundDecals){scene.remove(d);d.geometry.dispose();d.material.dispose();}roundDecals=[];}
function startRound(){
  clearEffects();for(const bot of bots){scene.remove(bot.group);bot.group.traverse(m=>{if(m.isMesh)m.geometry.dispose();});}bots=[];
  if(state.bomb?.mesh){scene.remove(state.bomb.mesh);state.bomb.mesh.geometry.dispose();state.bomb.mesh.material.dispose();}
  state.round++;Object.assign(player,{x:0,z:25,y:0,vy:0,yaw:0,pitch:0,health:100,armor:100});
  Object.assign(state,{phase:'playing',time:150,elapsed:0,weapon:0,weapons:weaponDefinitions.map(d=>({...d,ammo:d.capacity})),reload:0,cooldown:0,recoil:0,shots:0,hits:0,kills:0,headshots:0,aim:false,mouseDown:false,bomb:null,plant:0,score:0,streak:createStreak(),buffs:{speed:0,damage:0},timeScale:1,pickups:0,wave:0,streakMax:0,awpKills:0,bossKills:0,untouched:true});
  perks.reset();slowUntil=0;state.timeScale=1;document.body.classList.remove('slowmo');
  resetInput();botThink=0;footstep=0;damageTime=0;hitTime=0;lastBombBeep=0;$('damage').style.opacity='0';$('killfeed').replaceChildren();
  if(config.mode==='survival'){state.botCount=0;survival.start();}else{const level=levels[config.level];state.botCount=level.count;for(let i=0;i<level.count;i++)spawnBot(i);}
  guns.forEach((g,i)=>g.visible=i===0);['menu','pause','result','scope','interaction'].forEach(id=>setVisible(id,false));setVisible('hud',true);$('round-label').textContent=`ROUND ${String(state.round).padStart(2,'0')}`;$('wins').textContent=state.wins;$('losses').textContent=state.losses;
  if(config.mode!=='survival')toast(config.mode==='demolition'?'前往 A / B 点，按住 E 安放炸弹':'清剿开始 · 消灭全部敌人');updateHUD();requestCapture();
}
function pause(description='调整呼吸，准备下一次交锋。'){
  if(state.phase!=='playing'&&state.phase!=='paused')return;state.phase='paused';resetInput();$('pause-description').textContent=description;setVisible('pause',true);setVisible('scope',false);document.exitPointerLock?.();
}
function resume(){if(state.phase!=='paused')return;state.phase='playing';setVisible('pause',false);requestCapture();}
function menu(){state.phase='menu';resetInput();document.exitPointerLock?.();['hud','pause','result','scope'].forEach(id=>setVisible(id,false));setVisible('menu',true);$('damage').style.opacity='0';renderBest();renderHall();}
function finish(win,reason){if(state.phase!=='playing')return;state.phase='result';resetInput();if(win)state.wins++;else state.losses++;
  const isSurvival=config.mode==='survival';
  const newly=records.addRound({kills:state.kills,headshots:state.headshots,pickups:state.pickups,streakMax:state.streakMax,untouched:state.untouched,awpKill:state.awpKills>0,roundKills:state.kills,shots:state.shots,hits:state.hits,wave:state.wave,bossKills:state.bossKills});
  const isRecord=records.save(config.mode,config.level,{score:state.score,kills:state.kills,wave:state.wave});
  newly.forEach(showAchievement);
  $('result-label').textContent=win?'MISSION COMPLETE':'MISSION FAILED';
  $('result-title').textContent=isSurvival?(win?'区域已肃清':'防线失守'):win?(config.mode==='demolition'&&state.bomb?'目标已摧毁':'区域已肃清'):'行动未完成';
  $('result-description').textContent=isSurvival?`${reason}（坚守到第 ${Math.max(1,state.wave)} 波 · 得分 ${state.score}）`:reason;
  $('result-kills').textContent=state.kills;$('result-accuracy').textContent=accuracy();$('result-time').textContent=formatTime(state.elapsed);$('result-score').textContent=state.score;
  const best=records.best(config.mode,config.level);
  $('result-record').innerHTML=best?`${isSurvival?'最佳纪录':'最佳得分'} · ${best.score} 分${best.wave?` · 第 ${best.wave} 波`:''}${isRecord?' <b class="new-record">新纪录</b>':''}`:'';
  $('result-achievements').replaceChildren(...newly.map(id=>{const a=ACH.find(a=>a.id===id),d=document.createElement('div');d.className='result-ach';d.innerHTML=`<b>${a.icon}</b><span>${a.name}</span>`;return d;}));
  setVisible('result',true);setVisible('scope',false);document.exitPointerLock?.();audio.tone(win?660:130,.5,.25,'triangle');renderBest();}
function accuracy(){return`${state.shots?Math.round(state.hits/state.shots*100):0}%`;}
function formatTime(seconds){const n=Math.max(0,Math.ceil(seconds));return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function updateHUD(){const w=state.weapons[state.weapon];if(!w)return;$('health').textContent=Math.ceil(player.health);$('armor').textContent=Math.ceil(player.armor);$('health-bar').style.width=`${player.health}%`;$('health-bar').style.background=player.health<30?'#f08a70':'#d5ed8b';$('ammo').textContent=w.ammo;$('reserve').textContent=w.reserve;$('weapon-label').textContent=w.name;$('weapon-state').textContent=state.reload>0?'RELOADING…':w.description;$('timer').textContent=formatTime(state.bomb?state.bomb.time:state.time);$('timer').style.color=state.bomb?'#f5ad80':state.time<20?'#f5ad80':'';$('enemies-left').textContent=bots.filter(b=>b.health>0).length;$('objective-text').textContent=state.bomb?'守卫目标，等待引爆':config.mode==='demolition'?'在 A / B 点安放炸弹':config.mode==='survival'?'抵御无尽波次 · 拾取补给强化':'消灭全部敌人';
  const waveEl=$('wave-label');if(config.mode==='survival'){waveEl.hidden=false;waveEl.textContent=`WAVE ${String(Math.max(1,state.wave)).padStart(2,'0')}`;$('timer').textContent=survival.phase==='break'?`下一波 ${Math.ceil(survival.breakLeft)}s`:'∞';$('timer').style.color='';}else waveEl.hidden=true;
  $('score-hud').textContent=state.score;
  const buffs=$('buffs'),chips=[];if(state.buffs.speed>clockTime)chips.push(`<span class="buff-chip" style="--c:#e8d25a">加速 ${Math.ceil(state.buffs.speed-clockTime)}s</span>`);if(state.buffs.damage>clockTime)chips.push(`<span class="buff-chip" style="--c:#e8935a">双倍伤害 ${Math.ceil(state.buffs.damage-clockTime)}s</span>`);if(buffs.dataset.sig!==chips.join('')){buffs.innerHTML=chips.join('');buffs.dataset.sig=chips.join('');}
  $('location').textContent=player.z>20?'进攻方出生点':player.z<-17?(player.x>10?'A 区 · 集市':player.x<-10?'B 区 · 后院':'中路尽头'):Math.abs(player.x)>21?(player.x>0?'东侧长街':'西侧巷道'):'中路 · 拱门';$('stat-kills').textContent=state.kills;$('stat-headshots').textContent=state.headshots;$('stat-accuracy').textContent=accuracy();$('stat-score').textContent=state.score;}
function switchWeapon(index){if(state.weapon===index||state.phase!=='playing')return;state.weapon=index;state.reload=0;state.cooldown=.24;state.aim=false;hasFired=state.mouseDown;guns.forEach((g,i)=>g.visible=i===index);audio.reload();updateHUD();}
function reload(){const w=state.weapons[state.weapon];if(state.phase!=='playing'||state.reload>0||w.ammo===w.capacity)return;if(!w.reserve){toast('备用弹药耗尽 · 按 1 / 2 / 3 切换武器');return;}state.reload=w.reload;state.aim=false;audio.reload();toast('正在更换弹匣');updateHUD();}
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
    if(think)b.seen=dist<37&&visibleToBot(b,dist);
    if(b.seen){b.reaction+=dt;b.revealed=1.2;b.group.rotation.y=Math.atan2(-dx,-dz);if(b.reaction>(b.stats?.reaction??level.reaction)&&b.fireTimer<=0){b.fireTimer=.38+Math.random()*.45;audio.shot(0,true);const from=pos.clone().add(new THREE.Vector3(0,1.3,0)),to=new THREE.Vector3(player.x,player.y+1.2,player.z);tracer(from,to,0xf3ac62);const chance=(b.stats?.accuracy??level.accuracy)*(dist<12?1.15:.8)*(keys.has('KeyC')?.8:1);if(Math.random()<chance){const damage=applyDamage(player.health,player.armor,(b.stats?.damage??level.damage)*(b.damageMult||1));Object.assign(player,damage);state.untouched=false;damageTime=.3;audio.noise(.08,500,.18);if(player.health<=0){finish(false,config.mode==='survival'?`你被 ${b.name} 击倒，倒在了第 ${state.wave} 波的战场上。`:`你被 ${b.name} 击倒。利用掩体、短点射和静步重新组织进攻。`);break;}}}}
    else b.reaction=Math.max(0,b.reaction-dt*2);
    if(!b.seen||dist>16){
      if(b.pathTime<=0){b.pathTime=1.2+Math.random()*.4;let target;if(state.bomb)target=state.bomb;else if(b.seen||state.elapsed>14)target=player;else target=waypoints[(b.patrol+Math.floor(state.elapsed/7))%waypoints.length];b.path=findPath(pos,target,world.obstacles);}
      const target=b.path[0];if(target){const tx=target.x-pos.x,tz=target.z-pos.z,len=Math.hypot(tx,tz);if(len<.3)b.path.shift();else{const bs=b.stats?.speed??level.speed;moveWithCollision(pos,tx/len*bs*dt,tz/len*bs*dt,world.obstacles,.38);if(!b.seen)b.group.rotation.y=Math.atan2(-tx,-tz);b.limbs.forEach((leg,i)=>leg.rotation.x=Math.sin(clockTime*9+i*Math.PI)*.4);}}
    }else b.limbs.forEach(leg=>leg.rotation.x*=.85);
    if(state.bomb&&Math.hypot(pos.x-state.bomb.x,pos.z-state.bomb.z)<2.2){state.bomb.defuse+=dt;toastTime=Math.max(toastTime,.1);$('toast').textContent='警告：敌人正在拆除炸弹';$('toast').style.opacity='1';if(state.bomb.defuse>7){finish(false,'炸弹已被敌人拆除。下次安放后请守住目标。');break;}}
  }
  if(state.bomb&&!bots.some(b=>b.health>0&&Math.hypot(b.group.position.x-state.bomb.x,b.group.position.z-state.bomb.z)<2.2))state.bomb.defuse=0;
}
function updateBomb(dt){
  if(config.mode!=='demolition')return;
  if(state.bomb){state.bomb.time-=dt;lastBombBeep-=dt;if(lastBombBeep<=0){lastBombBeep=state.bomb.time<10?.35:.85;audio.tone(1600,.07,.12);}if(state.bomb.time<=0){audio.noise(.8,1000,1);finish(true,'爆破成功，目标已摧毁。');}setVisible('interaction',false);return;}
  const site=world.sites.find(s=>Math.hypot(player.x-s.x,player.z-s.z)<3.2);setVisible('interaction',!!site);
  if(site){$('interaction-text').textContent=`${site.label} 点 · 按住 E 安放炸弹`;if(keys.has('KeyE')&&player.y===0){state.plant+=dt;if(state.plant>=3){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.4,.15,.27),new THREE.MeshStandardMaterial({color:0x39472f,emissive:0x391805}));mesh.position.set(player.x,.09,player.z);scene.add(mesh);state.bomb={x:player.x,z:player.z,time:35,defuse:0,mesh};state.plant=0;toast('炸弹已安放 · 守卫目标 35 秒');audio.tone(1000,.4,.15);}}else state.plant=0;$('plant-progress').style.width=`${state.plant/3*100}%`;}else state.plant=0;
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
  gunRig.position.set(state.aim&&state.weapon!==2?.015:.29,-.29+bob-(state.reload>0?Math.sin(state.reload/state.weapons[state.weapon].reload*Math.PI)*.22:0),-.68+state.recoil*.8);
  gunRig.rotation.set(state.recoil*.75,state.aim?0:-.045,state.reload>0?Math.sin(state.reload*3)*.22:0);state.flash=Math.max(0,state.flash-dt);flash.visible=state.flash>0;flash.scale.setScalar(.7+Math.random()*.6);
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
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&state.phase==='playing')pause();});
document.addEventListener('pointerlockerror',()=>{if(state.phase==='playing')pause('无法锁定鼠标。请点击“继续行动”，或使用桌面版 Chrome / Edge 打开游戏 HTML 文件。');});
document.addEventListener('mousemove',event=>{if(state.phase!=='playing'||document.pointerLockElement!==canvas)return;const sens=.002*config.sensitivity*(state.aim?.55:1);player.yaw-=Math.max(-300,Math.min(300,event.movementX))*sens;player.pitch=Math.max(-1.45,Math.min(1.45,player.pitch-event.movementY*sens));});
document.addEventListener('mousedown',event=>{if(state.phase!=='playing'||document.pointerLockElement!==canvas)return;if(event.button===0){state.mouseDown=true;hasFired=false;}if(event.button===2&&state.reload<=0)state.aim=true;});
document.addEventListener('mouseup',event=>{if(event.button===0){state.mouseDown=false;hasFired=false;}if(event.button===2)state.aim=false;});
canvas.addEventListener('contextmenu',event=>event.preventDefault());
document.addEventListener('keydown',event=>{if(state.phase!=='playing')return;if(['Space','Tab','KeyW','KeyA','KeyS','KeyD','KeyR','KeyE','KeyC','Digit1','Digit2','Digit3'].includes(event.code))event.preventDefault();keys.add(event.code);if(event.repeat)return;if(event.code==='KeyR')reload();if(event.code==='Digit1')switchWeapon(0);if(event.code==='Digit2')switchWeapon(1);if(event.code==='Digit3')switchWeapon(2);if(event.code==='Tab')setVisible('scoreboard',true);if(event.code==='Escape')pause();});
document.addEventListener('keyup',event=>{keys.delete(event.code);if(event.code==='Tab')setVisible('scoreboard',false);});
window.addEventListener('blur',()=>{if(state.phase==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.phase==='playing')pause();});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;weaponCamera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();weaponCamera.updateProjectionMatrix();});
$('setup').addEventListener('submit',event=>{event.preventDefault();config.mode=$('mode').value;state.round=0;state.wins=0;state.losses=0;startRound();});
document.querySelectorAll('[data-level]').forEach(button=>button.addEventListener('click',()=>{config.level=button.dataset.level;document.querySelectorAll('[data-level]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});updateDeployInfo();}));
function updateDeployInfo(){$('bot-count').textContent=$('mode').value==='survival'?'∞':levels[config.level].count;renderBest();}
function renderBest(){const best=records.best($('mode').value,config.level);$('best-record').textContent=best?`${best.score} 分${best.wave?` · 第 ${best.wave} 波`:''}`:'—';}
function renderHall(){const p=records.progress();$('hall').innerHTML=ACH.map(a=>`<div class="hall-badge${p.unlocked[a.id]?' on':''}" title="${a.name} · ${a.desc}"><b>${a.icon}</b><span>${a.name}</span></div>`).join('');}
$('mode').addEventListener('change',updateDeployInfo);
$('pause-button').addEventListener('click',()=>pause());$('resume').addEventListener('click',resume);$('return-menu').addEventListener('click',menu);$('result-menu').addEventListener('click',menu);$('next-round').addEventListener('click',startRound);
$('sensitivity').addEventListener('input',e=>{config.sensitivity=Number(e.target.value);saveSettings();});$('volume').addEventListener('input',e=>{audio.volume=Number(e.target.value);saveSettings();});$('quality').addEventListener('change',e=>{const high=e.target.value==='high';renderer.shadowMap.enabled=high;renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.75:1));scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});saveSettings();});
function saveSettings(){try{localStorage.setItem('dust-settings',JSON.stringify({sensitivity:config.sensitivity,volume:audio.volume,quality:$('quality').value}));}catch{/* Storage is optional in private browsing. */}}
try{const settings=JSON.parse(localStorage.getItem('dust-settings')||'{}');if(Number.isFinite(settings.sensitivity))config.sensitivity=Math.max(.3,Math.min(2,settings.sensitivity));if(Number.isFinite(settings.volume))audio.volume=Math.max(0,Math.min(1,settings.volume));$('sensitivity').value=config.sensitivity;$('volume').value=audio.volume;if(settings.quality==='low'){$('quality').value='low';renderer.shadowMap.enabled=false;renderer.setPixelRatio(1);}}catch{/* Invalid stored settings fall back to defaults. */}
drawMap($('preview-map'),world,null,[],null,true);renderBest();renderHall();$('load-status').textContent='战场就绪 · 建议使用键盘与鼠标';requestAnimationFrame(frame);
// Deterministic inspection hooks are available only on the local test route.
if(new URLSearchParams(location.search).has('test'))window.__game={state,player,bots:()=>bots,world,config,keys,shoot,reload,switchWeapon,startRound,finish,updateBomb,updateBots,pause,resume,collides,perks,survival,records,waveStats,teleport(x,z,yaw=0){Object.assign(player,{x,z,yaw,pitch:0});},aimAt(index,head=false){const p=bots[index].group.position;player.yaw=Math.atan2(-(p.x-player.x),-(p.z-player.z));player.pitch=Math.atan2((head?1.67:1.2)-(player.y+1.65),Math.hypot(p.x-player.x,p.z-player.z));camera.position.set(player.x,player.y+1.65,player.z);camera.rotation.set(-player.pitch,player.yaw,0,'YXZ');camera.updateMatrixWorld(true);}};
