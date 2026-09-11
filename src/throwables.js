import * as THREE from 'three';
import { collides } from './logic.js';

export const NADE_DEFS={
  he:{type:'he',name:'高爆手雷',fuse:2.6,radius:6.4,maxDamage:125,minDamage:24,speed:16,color:0x49523c},
  flash:{type:'flash',name:'闪光弹',fuse:.75,impact:true,radius:9.5,speed:17,color:0x9aa08a},
  smoke:{type:'smoke',name:'烟雾弹',fuse:.6,impact:true,radius:4.4,duration:14,speed:15,color:0xb9c0b8},
};
const SMOKE_BLOCK_RADIUS=4.4,MAX_SMOKES=3,MAX_PROJECTILES=12,SMOKE_LOW=.35,SMOKE_HIGH=4.6;

export function blastDamage(distance,maxDamage,radius){
  if(distance>=radius)return 0;
  const t=1-distance/radius;
  return Math.max(1,Math.round(maxDamage*t*t));
}
export function flashBlind(distance,angle,radius=NADE_DEFS.flash.radius,los=true){
  if(!los||distance>=radius)return 0;
  const near=Math.max(0,1-distance/radius),facing=Math.max(0,1-Math.abs(angle)/2.6);
  return Math.min(1,near*near*(.25+.75*facing));
}
export function segmentPointDistance2D(ax,az,bx,bz,px,pz){
  const dx=bx-ax,dz=bz-az,length=dx*dx+dz*dz;
  let t=length?((px-ax)*dx+(pz-az)*dz)/length:0;t=Math.max(0,Math.min(1,t));
  return Math.hypot(ax+dx*t-px,az+dz*t-pz);
}

function smokeTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,6,64,64,62);
  gradient.addColorStop(0,'rgba(226,229,224,.95)');gradient.addColorStop(.55,'rgba(198,203,197,.72)');gradient.addColorStop(1,'rgba(190,196,190,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export function createThrowSystem(scene,getWorld,audio,effects,handlers={}){
  const projectiles=[],smokes=[],raycaster=new THREE.Raycaster();
  const texture=smokeTexture();
  const geo=new THREE.IcosahedronGeometry(.075,1);
  const materials={he:new THREE.MeshStandardMaterial({color:NADE_DEFS.he.color,metalness:.3,roughness:.5,emissive:0x1a2012,emissiveIntensity:.4}),flash:new THREE.MeshStandardMaterial({color:NADE_DEFS.flash.color,metalness:.5,roughness:.4,emissive:0x2a2d24,emissiveIntensity:.5}),smoke:new THREE.MeshStandardMaterial({color:NADE_DEFS.smoke.color,metalness:.4,roughness:.5,emissive:0x24261f,emissiveIntensity:.4})};
  function hasLineOfSight(from,to){
    const world=getWorld();if(!world)return true;
    raycaster.set(from,new THREE.Vector3().subVectors(to,from).normalize());raycaster.far=Math.max(.1,from.distanceTo(to)-.25);
    return !raycaster.intersectObjects(world.solids,false).length;
  }
  function throwNade(type,origin,direction){
    const def=NADE_DEFS[type];if(!def)return null;
    while(projectiles.length>=MAX_PROJECTILES)removeProjectile(projectiles.shift());
    const mesh=new THREE.Mesh(geo,materials[type]);mesh.position.copy(origin);mesh.castShadow=true;scene.add(mesh);
    const p={type,def,mesh,vx:direction.x*def.speed,vy:direction.y*def.speed+2.1,vz:direction.z*def.speed,fuse:def.fuse,age:0,armed:false,bounces:0};
    projectiles.push(p);return p;
  }
  function removeProjectile(p){scene.remove(p.mesh);}
  function spawnSmokeCloud(point){
    const group=new THREE.Group();group.position.set(point.x,1.6,point.z);
    const puffs=[];
    for(let i=0;i<9;i++){
      const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide});
      const size=2.4+Math.random()*1.5,mesh=new THREE.Mesh(new THREE.PlaneGeometry(size,size),material);
      mesh.position.set((Math.random()-.5)*SMOKE_BLOCK_RADIUS*1.1,(Math.random()-.5)*2.6,(Math.random()-.5)*SMOKE_BLOCK_RADIUS*1.1);
      const spin=(Math.random()-.5)*.5;group.add(mesh);puffs.push({mesh,spin,base:material.opacity});
    }
    scene.add(group);
    while(smokes.length>=MAX_SMOKES){const old=smokes.shift();scene.remove(old.group);old.group.traverse(m=>{if(m.isMesh)m.material.dispose();});}
    const cloud={group,puffs,life:NADE_DEFS.smoke.duration,total:NADE_DEFS.smoke.duration};
    smokes.push(cloud);
    audio?.smokePop?.();
  }
  function detonate(p){
    const point=p.mesh.position.clone();
    if(p.type==='he'){
      effects?.explosion?.(point,1);audio?.explosion?.();
      handlers.onExplosionAt?.(point,p.def.radius);
      const damageBots=handlers.getBots?handlers.getBots():[];
      for(const bot of damageBots){
        if(bot.health<=0)continue;
        const distance=bot.group.position.distanceTo(point);
        const damage=blastDamage(distance,p.def.maxDamage,p.def.radius);
        if(!damage)continue;
        bot.health-=damage;bot.revealed=3;bot.reaction=2;
        if(bot.health<=0)handlers.onBotKilled?.(bot,'he');
        else handlers.onBotHurt?.(bot);
      }
      const player=handlers.getPlayer?.();
      if(player){
        const distance=Math.hypot(player.x-point.x,player.z-point.z);
        const damage=blastDamage(distance,p.def.maxDamage,p.def.radius);
        if(damage)handlers.damagePlayer?.(damage,'高爆手雷');
      }
    }
    if(p.type==='flash'){
      const player=handlers.getPlayer?.();
      if(player){
        const eye=new THREE.Vector3(player.x,player.y+1.6,player.z),camera=handlers.getCamera?.();
        const distance=eye.distanceTo(point);
        let angle=Math.PI;if(camera){const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);angle=forward.angleTo(new THREE.Vector3().subVectors(point,eye).normalize());}
        const factor=flashBlind(distance,angle,p.def.radius,hasLineOfSight(point,eye));
        if(factor>0){effects?.flash?.(factor*1.25);effects?.shake?.(factor*.5);audio?.flashRing?.();}
      }
      for(const bot of handlers.getBots?.()??[]){
        if(bot.health<=0)continue;
        const eye=bot.group.position.clone().setY(bot.group.position.y+1.55);
        const distance=eye.distanceTo(point);
        const factor=flashBlind(distance,0,p.def.radius,hasLineOfSight(point,eye));
        if(factor>0){bot.blinded=Math.max(bot.blinded||0,1.4+2.8*factor);bot.seen=false;bot.reaction=0;}
      }
    }
    if(p.type==='smoke')spawnSmokeCloud(point);
    removeProjectile(p);
  }
  function update(dt,camera){
    const world=getWorld(),obstacles=world?world.obstacles:[];
    for(let i=projectiles.length-1;i>=0;i--){
      const p=projectiles[i],position=p.mesh.position;let detonated=false;
      p.age+=dt;p.fuse-=dt;p.armed=p.armed||p.age>.12;
      const nx=position.x+p.vx*dt,nz=position.z+p.vz*dt,feet=Math.max(0,position.y-.06);
      if(collides(nx,position.z,obstacles,.06,feet)){p.vx*=-.42;p.bounces++;if(p.def.impact&&p.armed)detonated=true;}else position.x=nx;
      if(!detonated){if(collides(position.x,nz,obstacles,.06,feet)){p.vz*=-.42;p.bounces++;if(p.def.impact&&p.armed)detonated=true;}else position.z=nz;}
      p.vy-=13.5*dt;position.y+=p.vy*dt;
      if(position.y<.07){position.y=.07;p.vy=Math.abs(p.vy)*.42;p.vx*=.72;p.vz*=.72;if(p.def.impact&&p.armed&&p.vy<.4)detonated=true;}
      p.mesh.rotation.x+=dt*7;p.mesh.rotation.y+=dt*5;
      if(detonated||p.fuse<=0){detonate(p);projectiles.splice(i,1);}
    }
    for(let i=smokes.length-1;i>=0;i--){
      const cloud=smokes[i];cloud.life-=dt;
      if(cloud.life<=0){scene.remove(cloud.group);cloud.group.traverse(m=>{if(m.isMesh)m.material.dispose();});smokes.splice(i,1);continue;}
      const fade=cloud.life<2.5?cloud.life/2.5:1;
      for(const puff of cloud.puffs){
        if(camera)puff.mesh.quaternion.copy(camera.quaternion);
        puff.mesh.material.opacity=puff.base*fade;
        puff.mesh.rotation.z+=puff.spin*dt;
      }
      cloud.group.position.y=1.6+Math.sin(cloud.life*1.4)*.18;
    }
  }
  function smokeBlocks(from,to){
    if(!smokes.length)return false;
    if(Math.min(from.y,to.y)>SMOKE_HIGH||Math.max(from.y,to.y)<SMOKE_LOW)return false;
    for(const cloud of smokes){const c=cloud.group.position;if(segmentPointDistance2D(from.x,from.z,to.x,to.z,c.x,c.z)<SMOKE_BLOCK_RADIUS)return true;}
    return false;
  }
  function clear(){
    for(const p of projectiles)removeProjectile(p);projectiles.length=0;
    for(const cloud of smokes){scene.remove(cloud.group);cloud.group.traverse(m=>{if(m.isMesh)m.material.dispose();});}
    smokes.length=0;
  }
  return {throwNade,update,smokeBlocks,clear,get projectiles(){return projectiles;},get smokes(){return smokes;}};
}
