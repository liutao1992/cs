export function waveStats(n,base){
  return{count:Math.min(3+n,8),health:Math.min(100+15*(n-1),250),accuracy:Math.min(base.accuracy+.03*n,.85),reaction:Math.max(base.reaction-.03*n,.3),speed:Math.min(base.speed+.08*n,3.4),boss:n%3===0};
}
export function createSurvival(spawnWave,audio){
  let wave=0,phase='idle',breakT=0;
  return{
    get wave(){return wave;},
    get phase(){return phase;},
    get breakLeft(){return breakT;},
    start(){wave=1;phase='combat';spawnWave(wave);},
    onBotKilled(bots){if(phase==='combat'&&!bots.some(b=>b.health>0)){phase='break';breakT=6;}},
    update(dt){if(phase!=='break')return;breakT-=dt;if(breakT<=0){wave++;phase='combat';audio?.waveStart();spawnWave(wave);}},
  };
}
