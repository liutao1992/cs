export const bounds = { minX: -33, maxX: 33, minZ: -29, maxZ: 29 };
export function collides(x, z, obstacles, radius = .36, feet = 0) {
  if (x < bounds.minX + radius || x > bounds.maxX - radius || z < bounds.minZ + radius || z > bounds.maxZ - radius) return true;
  return obstacles.some(o => feet < o.height - .05 && x + radius > o.minX && x - radius < o.maxX && z + radius > o.minZ && z - radius < o.maxZ);
}
export function moveWithCollision(position, dx, dz, obstacles, radius = .36, feet = 0) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .18));
  for (let i = 0; i < steps; i++) {
    if (!collides(position.x + dx / steps, position.z, obstacles, radius, feet)) position.x += dx / steps;
    if (!collides(position.x, position.z + dz / steps, obstacles, radius, feet)) position.z += dz / steps;
  }
  return position;
}
export function findPath(start, goal, obstacles) {
  const cell = 2, nx = 33, nz = 29;
  const world = (x, z) => ({ x: -32 + x * cell, z: -28 + z * cell });
  const grid = p => ({ x: Math.max(0, Math.min(nx - 1, Math.round((p.x + 32) / cell))), z: Math.max(0, Math.min(nz - 1, Math.round((p.z + 28) / cell))) });
  const s = grid(start), g = grid(goal), key = (x, z) => z * nx + x;
  const open = [{ ...s, cost: 0, score: 0 }], parents = new Map(), costs = new Map([[key(s.x,s.z),0]]), closed = new Set();
  let best = s, bestDistance = Infinity;
  while (open.length) {
    open.sort((a,b) => a.score - b.score);
    const current = open.shift(), ck = key(current.x,current.z);
    if (closed.has(ck)) continue;
    closed.add(ck);
    const distance = Math.abs(current.x-g.x)+Math.abs(current.z-g.z);
    if (distance < bestDistance) { best = current; bestDistance = distance; }
    if (!distance) break;
    for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x=current.x+dx,z=current.z+dz,k=key(x,z),p=world(x,z),cost=current.cost+1;
      // A grid node can be clear on either side of a thin wall.  Sample the
      // edge as well so bots do not plan a route straight through a doorway
      // frame or a narrow market wall.
      const clearEdge=()=>{
        const from=world(current.x,current.z),steps=8;
        for(let i=1;i<=steps;i++){
          const t=i/steps;
          if(collides(from.x+(p.x-from.x)*t,from.z+(p.z-from.z)*t,obstacles,.45))return false;
        }
        return true;
      };
      if(x<0||z<0||x>=nx||z>=nz||closed.has(k)||collides(p.x,p.z,obstacles,.45)||!clearEdge()||cost>=(costs.get(k)??Infinity))continue;
      costs.set(k,cost);parents.set(k,current);open.push({x,z,cost,score:cost+Math.abs(x-g.x)+Math.abs(z-g.z)});
    }
  }
  const path=[];let current=best;
  while(key(current.x,current.z)!==key(s.x,s.z)){path.unshift(world(current.x,current.z));current=parents.get(key(current.x,current.z));if(!current)break;}
  return path;
}
export function applyDamage(health, armor, rawDamage) {
  const absorbed = Math.min(armor, rawDamage * .55);
  return { health: Math.max(0, health - (rawDamage - absorbed)), armor: Math.max(0, armor - absorbed) };
}
export function reloadWeapon(weapon) {
  const amount=Math.min(weapon.capacity-weapon.ammo,weapon.reserve);
  weapon.ammo+=amount;weapon.reserve-=amount;return amount;
}
export function damageFalloff(distance,def){
  const start=def?.falloffStart??30,end=def?.falloffEnd??80,min=def?.falloffMin??.7;
  if(!(distance>start))return 1;
  if(distance>=end)return min;
  return 1-(1-min)*(distance-start)/(end-start);
}
export function recoilKick(step,base){
  const s=Math.max(1,Math.min(step,14));
  return {pitch:base*(1+(s-1)*.09),yaw:base*Math.sin(s*2.399)*.38};
}
export const weaponDefinitions = [
  {name:'AK-47',capacity:30,reserve:90,damage:36,interval:.105,reload:2.3,spread:.0035,recoil:.012,automatic:true,price:2500,side:'T',description:'7.62 MM / AUTOMATIC',falloffStart:22,falloffEnd:70,falloffMin:.72,penetrationDepth:.5,penetrationDamage:.55,inaccuracy:.32,maxInaccuracy:2.4},
  {name:'USP-S',capacity:12,reserve:48,damage:31,interval:.23,reload:1.6,spread:.0018,recoil:.006,automatic:false,price:500,side:'CT',description:'.45 ACP / SEMI-AUTO',falloffStart:18,falloffEnd:60,falloffMin:.7,penetrationDepth:.2,penetrationDamage:.35,inaccuracy:.3,maxInaccuracy:1.6},
  {name:'AWP',capacity:5,reserve:20,damage:115,interval:1.4,reload:3.1,spread:.017,recoil:.035,automatic:false,price:4750,side:'both',description:'.338 MAGNUM / BOLT ACTION',falloffStart:60,falloffEnd:110,falloffMin:.92,penetrationDepth:.85,penetrationDamage:.85,inaccuracy:1.2,maxInaccuracy:1.6},
  {name:'M4A1-S',capacity:25,reserve:75,damage:33,interval:.09,reload:2.1,spread:.003,recoil:.01,automatic:true,price:3100,side:'CT',description:'5.56 MM / SILENCED',falloffStart:24,falloffEnd:72,falloffMin:.75,penetrationDepth:.45,penetrationDamage:.5,inaccuracy:.28,maxInaccuracy:2.2},
  {name:'Glock-18',capacity:20,reserve:120,damage:26,interval:.14,reload:1.7,spread:.004,recoil:.008,automatic:false,price:400,side:'T',description:'9 MM / SEMI-AUTO',falloffStart:16,falloffEnd:55,falloffMin:.68,penetrationDepth:.18,penetrationDamage:.3,inaccuracy:.26,maxInaccuracy:1.8}
];
