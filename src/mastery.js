import * as THREE from 'three';

const META_KEY='dust-meta';
export const MASTERY_STEPS=[10,30,60,100,150];
export const FINISHES=[
  {id:'default',name:'原厂',price:0,color:null},
  {id:'sand',name:'沙暴',price:300,color:0xc2a36b},
  {id:'night',name:'夜行',price:500,color:0x2e3a3d},
  {id:'ember',name:'余烬',price:800,color:0x8c3d2c},
  {id:'arctic',name:'极地',price:1000,color:0xd8e2e4},
];
export const DAILY_POOL=[
  {id:'kills',event:'kill',name:'清除 20 名敌人',goal:20,reward:120},
  {id:'headshots',event:'headshot',name:'完成 8 次爆头',goal:8,reward:150},
  {id:'plants',event:'plant',name:'安放炸弹 2 次',goal:2,reward:160},
  {id:'wins',event:'win',name:'赢得 3 个回合',goal:3,reward:200},
  {id:'knife',event:'knife',name:'近战击杀 2 名敌人',goal:2,reward:180},
  {id:'nade',event:'nade',name:'投掷物击杀 3 名敌人',goal:3,reward:180},
];
export function masteryProgress(kills){
  let level=0;
  for(const step of MASTERY_STEPS){if(kills>=step)level++;else break;}
  const previous=level?MASTERY_STEPS[level-1]:0,next=level<MASTERY_STEPS.length?MASTERY_STEPS[level]:null;
  return {level,previous,next,ratio:next?Math.min(1,(kills-previous)/(next-previous)):1};
}
export function masteryBonus(level){return {damage:1+.01*level,reload:1-.02*level,spread:1-.02*level};}
export function hashString(text){let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return hash>>>0;}
export function dailyChallenges(dateKey,count=3){
  const pool=[...DAILY_POOL],picks=[];let state=hashString(dateKey)||7;
  const rand=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
  while(picks.length<count&&pool.length)picks.push(pool.splice(Math.floor(rand()*pool.length),1)[0]);
  return picks;
}
export function applySkin(gun,skinId){
  const finish=FINISHES.find(item=>item.id===skinId);
  if(!finish?.color)return;
  const arms=gun.getObjectByName?.('FirstPersonArms'),target=new THREE.Color(finish.color);
  gun.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.material?.color||mesh.material.transparent)return;
    if(arms&&(mesh===arms||arms.getObjectById(mesh.id)))return;
    if(mesh.material.userData.baseColor===undefined)mesh.material.userData.baseColor=mesh.material.color.getHex();
    mesh.material.color.setHex(mesh.material.userData.baseColor).lerp(target,.5);
  });
}
const fallback={getItem:()=>null,setItem:()=>{}};
export function createMeta(storage=null){
  const store=storage||(typeof localStorage!=='undefined'?localStorage:fallback);
  const empty=()=>({mastery:{},credits:0,skin:'default',owned:['default'],daily:null});
  const read=()=>{try{const value=store.getItem(META_KEY);const data=value?JSON.parse(value):empty();return {...empty(),...data};}catch{return empty();}};
  const write=data=>{try{store.setItem(META_KEY,JSON.stringify(data));}catch{}};
  const today=()=>new Date().toISOString().slice(0,10);
  function dailyItems(data,dateKey){
    if(!data.daily||data.daily.date!==dateKey){data.daily={date:dateKey,items:dailyChallenges(dateKey).map(def=>({id:def.id,progress:0,claimed:false}))};write(data);}
    return data.daily.items.map(item=>({...DAILY_POOL.find(def=>def.id===item.id),...item}));
  }
  return {
    get credits(){return read().credits;},
    get skin(){return read().skin;},
    get ownedSkins(){return read().owned;},
    masteryFor(index){const kills=read().mastery[index]||0;return {...masteryProgress(kills),kills};},
    bonusFor(index){return masteryBonus(read().mastery[index]?masteryProgress(read().mastery[index]).level:0);},
    registerKill(index,{head=false,knife=false,nade=false}={}){
      const data=read();data.mastery[index]=(data.mastery[index]||0)+1;write(data);
      return {head,knife,nade,mastery:masteryProgress(data.mastery[index])};
    },
    daily(dateKey=today()){return dailyItems(read(),dateKey);},
    recordEvent(event,amount=1,dateKey=today()){
      const data=read(),items=dailyItems(data,dateKey);let completed=0;
      for(const item of items){const def=DAILY_POOL.find(d=>d.id===item.id);if(def?.event!==event||item.claimed)continue;item.progress+=amount;if(item.progress>=def.goal)completed++;}
      data.daily.items=items.map(item=>({id:item.id,progress:item.progress,claimed:item.claimed}));write(data);return completed;
    },
    claimDaily(index,dateKey=today()){
      const data=read(),items=dailyItems(data,dateKey),item=items[index],def=item&&DAILY_POOL.find(d=>d.id===item.id);
      if(!def||item.claimed||item.progress<def.goal)return 0;
      data.daily.items=items.map((entry,i)=>i===index?{id:entry.id,progress:entry.progress,claimed:true}:{id:entry.id,progress:entry.progress,claimed:entry.claimed});
      data.credits+=def.reward;write(data);return def.reward;
    },
    buySkin(id){
      const finish=FINISHES.find(item=>item.id===id);if(!finish)return false;
      const data=read();if(data.owned.includes(id))return false;if(data.credits<finish.price)return false;
      data.credits-=finish.price;data.owned.push(id);write(data);return true;
    },
    equipSkin(id){const data=read();if(!data.owned.includes(id))return false;data.skin=id;write(data);return true;},
  };
}
