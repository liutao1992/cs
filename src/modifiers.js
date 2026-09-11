export const MODIFIERS=[
  {id:'none',name:'常规行动',desc:'标准战场规则',scoreMult:1},
  {id:'sandstorm',name:'沙尘暴',desc:'能见度降低 · 得分 ×1.2',scoreMult:1.2},
  {id:'elite',name:'精锐敌军',desc:'敌人更强更快 · 得分 ×1.4',scoreMult:1.4},
  {id:'scarce',name:'弹药紧张',desc:'开局备弹减半 · 得分 ×1.35',scoreMult:1.35},
  {id:'airdrop',name:'高频补给',desc:'补给刷新更快 · 得分 ×1.1',scoreMult:1.1},
  {id:'random',name:'随机词条',desc:'每回合随机抽取',scoreMult:1},
];
export function modifierById(id){return MODIFIERS.find(item=>item.id===id)||MODIFIERS[0];}
export function resolveModifier(choice,rand=Math.random){
  if(choice!=='random')return modifierById(choice);
  const pool=MODIFIERS.filter(item=>!['none','random'].includes(item.id));
  return pool[Math.floor(rand()*pool.length)]||MODIFIERS[0];
}
export function enemyModifiers(modifier){
  if(modifier?.id==='elite')return {accuracy:.06,reaction:.85,speed:1.08,damage:3};
  return {accuracy:0,reaction:1,speed:1,damage:0};
}
