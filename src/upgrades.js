export const UPGRADE_DEFS=[
  {id:'damage',name:'大口径',icon:'✹',desc:'所有武器伤害 +12%',tone:'#e8935a'},
  {id:'firerate',name:'快速射击',icon:'⟫',desc:'射速 +8%',tone:'#e8d25a'},
  {id:'reload',name:'高速换弹',icon:'↻',desc:'换弹速度 +12%',tone:'#8be86a'},
  {id:'spread',name:'精准射击',icon:'◎',desc:'弹道散布 -15%',tone:'#6aa8e8'},
  {id:'speed',name:'轻装疾行',icon:'➤',desc:'移动速度 +7%',tone:'#d5ed8b'},
  {id:'health',name:'强健体魄',icon:'✚',desc:'生命上限 +20 并回复 40',tone:'#e86a5a'},
  {id:'armor',name:'战术装甲',icon:'⬡',desc:'立即 +30 护甲 · 每波开始 +30',tone:'#c0d4d5'},
  {id:'headshot',name:'猎杀本能',icon:'☠',desc:'爆头伤害 +20%',tone:'#f5ad80'},
  {id:'lifesteal',name:'嗜血',icon:'♥',desc:'击杀回复 8 生命',tone:'#e86a8b'},
  {id:'supply',name:'战地补给',icon:'❖',desc:'立即获得投掷物 · 每波开始再补 1 枚',tone:'#9aa08a'},
];
const STACK_CAP=5;
export function rollUpgrades(stacks,count=3,rand=Math.random){
  const pool=UPGRADE_DEFS.filter(def=>(stacks[def.id]??0)<STACK_CAP),picks=[];
  while(picks.length<count&&pool.length){const index=Math.floor(rand()*pool.length);picks.push(pool.splice(index,1)[0]);}
  return picks;
}
export function upgradeMods(stacks={}){
  const level=id=>stacks[id]??0;
  return {
    damage:1+.12*level('damage'),
    fireRate:Math.max(.5,1-.08*level('firerate')),
    reload:Math.max(.5,1-.12*level('reload')),
    spread:Math.max(.4,1-.15*level('spread')),
    speed:1+.07*level('speed'),
    headshot:1+.2*level('headshot'),
    lifesteal:8*level('lifesteal'),
    armorPerWave:30*level('armor'),
    supplyPerWave:level('supply'),
  };
}
export function upgradeStacks(stacks={}){
  return UPGRADE_DEFS.filter(def=>(stacks[def.id]??0)>0).map(def=>({...def,count:stacks[def.id]}));
}
export function applyUpgrade(id,ctx,stacks,rand=Math.random){
  const def=UPGRADE_DEFS.find(item=>item.id===id);if(!def)return null;
  stacks[id]=(stacks[id]??0)+1;
  const {player,state}=ctx;
  if(id==='health'){state.maxHealth=(state.maxHealth||100)+20;player.health=Math.min(state.maxHealth,player.health+40);}
  if(id==='armor')player.armor=Math.min(100,player.armor+30);
  if(id==='supply'){const types=['he','flash','smoke'],pick=types[Math.floor(rand()*types.length)];state.nades[pick]=(state.nades[pick]??0)+1;}
  return def;
}
export function waveStartBonus(state,player,rand=Math.random){
  const mods=upgradeMods(state.upgrades||{}),granted=[];
  if(mods.armorPerWave){player.armor=Math.min(100,player.armor+mods.armorPerWave);granted.push(`护甲 +${mods.armorPerWave}`);}
  if(mods.supplyPerWave){const types=['he','flash','smoke'],pick=types[Math.floor(rand()*types.length)];state.nades[pick]=(state.nades[pick]??0)+mods.supplyPerWave;granted.push('投掷物补给');}
  return granted;
}
