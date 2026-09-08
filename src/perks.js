import * as THREE from 'three';
import { collides } from './logic.js';
export const PERK_DEFS=[
  {type:'health',name:'医疗包',desc:'+40 生命',color:0xe86a5a,weight:30},
  {type:'armor',name:'护甲',desc:'+50 护甲',color:0x6aa8e8,weight:25},
  {type:'speed',name:'加速',desc:'移速 ×1.35 · 10 秒',color:0xe8d25a,weight:20},
  {type:'damage',name:'双倍伤害',desc:'伤害 ×2 · 10 秒',color:0xe8935a,weight:15},
  {type:'ammo',name:'弹药箱',desc:'补满当前武器备弹',color:0x8be86a,weight:10},
];
const ANCHORS=[[0,6],[0,-8],[-27,10],[27,10],[-27,-26],[27,-26],[-10,25],[10,25],[-27,0],[27,0]],MAX_ACTIVE=3,PICKUP_RADIUS=1.3;
export function createPerkSystem(scene,world,audio,rand=Math.random){
  const anchors=ANCHORS.filter(([x,z])=>!collides(x,z,world.obstacles,.7));
  const pickups=[],sparks=[];let timer=15;
  const weightTotal=PERK_DEFS.reduce((s,d)=>s+d.weight,0);
  function pickDef(){let r=rand()*weightTotal;for(const d of PERK_DEFS){r-=d.weight;if(r<=0)return d;}return PERK_DEFS[0];}
  function buildMesh(def){
    const g=new THREE.Group(),glow=new THREE.MeshStandardMaterial({color:def.color,emissive:def.color,emissiveIntensity:.75,transparent:true,opacity:.92,roughness:.35});
    const shell=new THREE.Mesh(new THREE.OctahedronGeometry(.42),glow);g.add(shell);
    const core=new THREE.Mesh(new THREE.BoxGeometry(.3,.3,.3),new THREE.MeshStandardMaterial({color:0xf4f4e8,emissive:def.color,emissiveIntensity:.25,roughness:.5}));g.add(core);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.5,.58,24),new THREE.MeshBasicMaterial({color:def.color,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=-.5;g.add(ring);
    g.userData={shell,core};return g;
  }
  function spawn(forced=null){
    if(pickups.length>=MAX_ACTIVE&&!forced)return null;
    const free=anchors.filter(a=>!pickups.some(p=>p.x===a[0]&&p.z===a[1]));if(!free.length)return null;
    const a=free[Math.floor(rand()*free.length)],def=forced||pickDef(),mesh=buildMesh(def);
    mesh.position.set(a[0],.85,a[1]);scene.add(mesh);
    const p={...def,x:a[0],z:a[1],mesh,spin:rand()*6,air:!!forced};pickups.push(p);return p;
  }
  function spark(x,z,color){
    const m=new THREE.Mesh(new THREE.RingGeometry(.2,.3,20),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));
    m.rotation.x=-Math.PI/2;m.position.set(x,.06,z);scene.add(m);sparks.push({mesh:m,life:.4,total:.4});
  }
  function apply(p,player,state,clockTime){
    switch(p.type){
      case'health':if(player.health>=100)return false;player.health=Math.min(100,player.health+40);break;
      case'armor':if(player.armor>=100)return false;player.armor=Math.min(100,player.armor+50);break;
      case'speed':state.buffs.speed=clockTime+10;break;
      case'damage':state.buffs.damage=clockTime+10;break;
      case'ammo':{const w=state.weapons[state.weapon],def=state.weaponDefs?.[state.weapon];if(def)w.reserve=def.reserve;break;}
    }
    return true;
  }
  return{
    pickups,
    reset(){for(const p of pickups){scene.remove(p.mesh);p.mesh.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});}pickups.length=0;for(const s of sparks){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();}sparks.length=0;timer=15;},
    forceSpawn(index=0){const def=PERK_DEFS[Math.min(index,PERK_DEFS.length-1)];return spawn(def);},
    spawnAirDrop(){const def=PERK_DEFS[rand()<.5?3:4];return spawn(def);},
    update(dt,player,state,clockTime,toast){
      timer-=dt;if(timer<=0){spawn();timer=22+rand()*10;}
      for(let i=pickups.length-1;i>=0;i--){
        const p=pickups[i];p.spin+=dt*1.6;p.mesh.rotation.y=p.spin;p.mesh.position.y=.85+Math.sin(clockTime*2.2+p.spin)*.12;p.mesh.userData.core.rotation.x=p.spin*.7;
        if(Math.hypot(player.x-p.x,player.z-p.z)<PICKUP_RADIUS){
          if(apply(p,player,state,clockTime)){
            audio?.perk();toast?.(`${p.name} · ${p.desc}`);state.pickups=(state.pickups||0)+1;spark(p.x,p.z,p.color);
            scene.remove(p.mesh);p.mesh.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});pickups.splice(i,1);
          }
        }
      }
      for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.life-=dt;s.mesh.scale.setScalar(1+(1-s.life/s.total)*3);s.mesh.material.opacity=Math.max(0,s.life/s.total)*.85;if(s.life<=0){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();sparks.splice(i,1);}}
    },
  };
}
