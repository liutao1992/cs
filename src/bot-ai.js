export const BOT_ROLES={
  rifle:{weapon:0,accuracy:0,reaction:1,speed:1,damage:1,fireDelay:.38,fireSpread:.45,strafe:true,anchor:true},
  rusher:{weapon:3,accuracy:-.05,reaction:.86,speed:1.18,damage:.85,fireDelay:.28,fireSpread:.3,strafe:true,anchor:false},
  sniper:{weapon:2,accuracy:.06,reaction:1.18,speed:.82,damage:3.4,fireDelay:.95,fireSpread:.7,strafe:false,anchor:true},
};
const COMPETITIVE_PATTERN=['rifle','sniper','rifle','rusher','rusher','rifle','sniper'];
const STANDARD_PATTERN=['rifle','rifle','rusher','sniper','rifle','rusher','rusher'];
export function roleForIndex(index,mode){
  return (mode==='competitive'?COMPETITIVE_PATTERN:STANDARD_PATTERN)[index%7];
}
export function applyRole(base,role){
  const config=BOT_ROLES[role]||BOT_ROLES.rifle;
  return {
    accuracy:Math.min(.92,Math.max(.05,base.accuracy+config.accuracy)),
    reaction:Math.max(.24,base.reaction*config.reaction),
    speed:Math.max(1,base.speed*config.speed),
    damage:Math.max(8,Math.round(base.damage*config.damage)),
  };
}
export function chooseObjective({role,anchor,suspect,revealed,retreat,bomb,botPlant,isCarrier,side,mode,elapsed,seen,player,waypoints,index=0}){
  if(retreat&&waypoints.length){
    let far=waypoints[0];
    for(const point of waypoints)if(Math.hypot(point.x-player.x,point.z-player.z)>Math.hypot(far.x-player.x,far.z-player.z))far=point;
    return far;
  }
  if(botPlant&&(isCarrier||mode==='competitive'))return botPlant;
  if(bomb)return bomb;
  if(suspect&&revealed>0)return suspect;
  if(seen||elapsed>14)return player;
  if(role==='rusher'&&mode==='competitive'&&elapsed>7)return player;
  if(mode==='competitive'&&side==='T'&&anchor&&elapsed<20&&BOT_ROLES[role]?.anchor)return anchor;
  return waypoints[(index+Math.floor(elapsed/7))%waypoints.length];
}
