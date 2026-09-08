export const ACH=[
  {id:'first-blood',icon:'⚔',name:'首杀',desc:'完成任意击杀'},
  {id:'marksman-10',icon:'◎',name:'神射手',desc:'累计爆头 10 次'},
  {id:'marksman-50',icon:'◎',name:'神枪手',desc:'累计爆头 50 次'},
  {id:'rampage-5',icon:'⚡',name:'疯狂杀戮',desc:'单次连杀达到 5'},
  {id:'untouchable',icon:'♦',name:'毫发无伤',desc:'单回合有击杀且未受任何伤害'},
  {id:'wallbang-awp',icon:'✛',name:'一击毙命',desc:'使用 AWP 完成击杀'},
  {id:'round-10',icon:'☠',name:'杀戮机器',desc:'单回合击杀 10 名敌人'},
  {id:'centurion',icon:'✦',name:'百人斩',desc:'累计击杀 100 名敌人'},
  {id:'wave-5',icon:'▲',name:'站稳阵脚',desc:'生存模式坚守到第 5 波'},
  {id:'wave-10',icon:'▲',name:'钢铁防线',desc:'生存模式坚守到第 10 波'},
  {id:'titan-slayer',icon:'♜',name:'巨像猎人',desc:'击杀 Boss「泰坦」'},
  {id:'scavenger',icon:'✚',name:'战场拾荒者',desc:'累计拾取 20 个补给'},
  {id:'sharpshooter',icon:'✧',name:'神准射手',desc:'单回合射击≥10 发且命中率≥60%'},
];
const REC_KEY='dust-records',PROG_KEY='dust-achievements';
const fallback={getItem:()=>null,setItem:()=>{}};
export function createRecords(storage=null){
  const s=storage||(typeof localStorage!=='undefined'?localStorage:fallback);
  const read=(k,d)=>{try{const v=s.getItem(k);return v?JSON.parse(v):d;}catch{return d;}};
  const write=(k,v)=>{try{s.setItem(k,JSON.stringify(v));}catch{/* Storage is optional in private browsing. */}};
  return{
    best(mode,level){return read(REC_KEY,{})[`${mode}:${level}`]||null;},
    save(mode,level,result){const all=read(REC_KEY,{}),k=`${mode}:${level}`,prev=all[k],better=!prev||result.score>(prev.score||0);if(better){all[k]={...result,date:Date.now()};write(REC_KEY,all);}return better;},
    progress(){return read(PROG_KEY,{unlocked:{},counters:{}});},
    unlock(id){const p=read(PROG_KEY,{unlocked:{},counters:{}});if(p.unlocked[id])return false;p.unlocked[id]=true;write(PROG_KEY,p);return true;},
    addRound(r){const p=read(PROG_KEY,{unlocked:{},counters:{}}),c=p.counters,out=[];c.kills=(c.kills||0)+r.kills;c.headshots=(c.headshots||0)+r.headshots;c.pickups=(c.pickups||0)+(r.pickups||0);
      const test=(id,ok)=>{if(ok&&!p.unlocked[id]){p.unlocked[id]=true;out.push(id);}};
      test('first-blood',c.kills>=1);test('marksman-10',c.headshots>=10);test('marksman-50',c.headshots>=50);test('rampage-5',r.streakMax>=5);test('untouchable',r.untouched&&r.roundKills>=1);test('wallbang-awp',!!r.awpKill);test('round-10',r.roundKills>=10);test('centurion',c.kills>=100);test('wave-5',r.wave>=5);test('wave-10',r.wave>=10);test('titan-slayer',r.bossKills>=1);test('scavenger',c.pickups>=20);test('sharpshooter',r.shots>=10&&r.hits/r.shots>=.6);
      write(PROG_KEY,p);return out;},
  };
}
