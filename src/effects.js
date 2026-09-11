import * as THREE from 'three';

const PARTICLE_CAP=220,CASING_CAP=36;
const norm=angle=>{while(angle>Math.PI)angle-=Math.PI*2;while(angle<-Math.PI)angle+=Math.PI*2;return angle;};

export function createEffects(scene,audio){
  let trauma=0,time=0,lowHealth=false,heartbeat=0,flashPower=0,hurtTimer=0,hurtAngle=0;
  const parts=[],casings=[];
  const damageEl=typeof document!=='undefined'?document.getElementById('damage-dir'):null;
  const flashEl=typeof document!=='undefined'?document.getElementById('flash-overlay'):null;
  const bloodGeo=new THREE.OctahedronGeometry(.032,0),dustGeo=new THREE.OctahedronGeometry(.028,0),sparkGeo=new THREE.OctahedronGeometry(.026,0);
  const bloodMat=new THREE.MeshBasicMaterial({color:0x9c2a20,transparent:true,opacity:.92,depthWrite:false});
  const dustMat=new THREE.MeshBasicMaterial({color:0xcdbb95,transparent:true,opacity:.72,depthWrite:false});
  const sparkMat=new THREE.MeshBasicMaterial({color:0xffc46a,transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending});
  const shellGeo=new THREE.CylinderGeometry(.008,.009,.026,6),shellMat=new THREE.MeshStandardMaterial({color:0xc9a24a,metalness:.9,roughness:.32});
  const fireMat=new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:.92,depthWrite:false,blending:THREE.AdditiveBlending});
  const ringGeo=new THREE.RingGeometry(.5,.68,26);
  const vector=new THREE.Vector3(),vector2=new THREE.Vector3();

  function emit(geo,mat,point,count,speed,gravity,life,dir=null,scale=1,floor=0){
    for(let i=0;i<count;i++){
      const mesh=new THREE.Mesh(geo,mat.clone());mesh.position.copy(point);
      if(scale!==1)mesh.scale.setScalar(scale*(.7+Math.random()*.6));
      mesh.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);
      scene.add(mesh);
      const spray=dir?dir.clone():new THREE.Vector3(0,1,0);
      const rx=(Math.random()-.5),ry=(Math.random()-.5),rz=(Math.random()-.5);
      const vel=new THREE.Vector3(rx,ry+ (dir?0:.9),rz).normalize().multiplyScalar(speed*(.5+Math.random()*.8)).addScaledVector(spray,dir?speed*.6:0);
      parts.push({mesh,vx:vel.x,vy:vel.y+.6,vz:vel.z,life,total:life,gravity,floor,spin:(Math.random()-.5)*14});
    }
    while(parts.length>PARTICLE_CAP)dropParticle(parts.shift());
  }
  function dropParticle(p){scene.remove(p.mesh);p.mesh.material.dispose();}
  function dropCasing(c){scene.remove(c.mesh);}

  function shake(amount){trauma=Math.min(1,trauma+amount);}
  function blood(point,dir){emit(bloodGeo,bloodMat,point,7,2.4,9,.34,dir||null,.9);}
  function dust(point,normal){emit(dustGeo,dustMat,point,6,1.5,4,.42,normal||null,.85,.02);}
  function sparks(point,count=10,color=0xffc46a){const old=sparkMat.color.clone();sparkMat.color.setHex(color);emit(sparkGeo,sparkMat,point,count,5.5,12,.5,null,1);sparkMat.color.copy(old);}
  function casing(camera){
    const mesh=new THREE.Mesh(shellGeo,shellMat);
    const right=vector.set(1,0,0).applyQuaternion(camera.quaternion),up=vector2.set(0,1,0).applyQuaternion(camera.quaternion);
    mesh.position.copy(camera.position).addScaledVector(right,.17).addScaledVector(up,-.1);
    mesh.position.addScaledVector(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion),.35);
    mesh.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);
    scene.add(mesh);
    casings.push({mesh,vx:right.x*2.4+(Math.random()-.5),vy:1.4+Math.random()*.8,vz:right.z*2.4+(Math.random()-.5),life:.85,total:.85,spin:(Math.random()-.5)*22});
    while(casings.length>CASING_CAP)dropCasing(casings.shift());
  }
  function explosion(point,strength=.9){
    const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.5,1),fireMat.clone());
    core.position.copy(point);scene.add(core);
    parts.push({mesh:core,vx:0,vy:0,vz:0,life:.38,total:.38,gravity:0,floor:0,spin:0,grow:strength*7});
    const ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xffb466,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
    ring.rotation.x=-Math.PI/2;ring.position.set(point.x,.05,point.z);scene.add(ring);
    parts.push({mesh:ring,vx:0,vy:0,vz:0,life:.5,total:.5,gravity:0,floor:0,spin:0,grow:strength*9});
    sparks(point,Math.round(14*strength)+6,0xffd27a);
    emit(dustGeo,new THREE.MeshBasicMaterial({color:0x6b6257,transparent:true,opacity:.6,depthWrite:false}),point,10,3.4,2.6,.9,null,1.6);
    shake(strength);
  }
  function flash(power){flashPower=Math.max(flashPower,Math.min(1,power));}
  function hurt(relAngle){hurtAngle=norm(relAngle);hurtTimer=1.1;}
  function setLowHealth(on){if(on===lowHealth)return;lowHealth=on;if(typeof document!=='undefined')document.body.classList.toggle('lowhp',on);if(!on)heartbeat=.4;}
  function update(dt){
    time+=dt;trauma=Math.max(0,trauma-dt*1.9);
    if(lowHealth){heartbeat-=dt;if(heartbeat<=0){heartbeat=.85;audio?.heartbeat?.();}}
    if(flashPower>0)flashPower=Math.max(0,flashPower-dt*1.15);
    if(flashEl){flashEl.style.opacity=String(flashPower);flashEl.style.display=flashPower>0?'block':'none';}
    if(hurtTimer>0){hurtTimer-=dt;if(damageEl){damageEl.style.opacity=String(Math.min(1,hurtTimer*2));damageEl.querySelector('i').style.transform=`rotate(${Math.round(hurtAngle*180/Math.PI)}deg)`;}}else if(damageEl&&damageEl.style.opacity!=='0')damageEl.style.opacity='0';
    for(let i=parts.length-1;i>=0;i--){
      const p=parts[i];p.life-=dt;
      if(p.life<=0){dropParticle(p);parts.splice(i,1);continue;}
      if(p.grow){const t=1-p.life/p.total;p.mesh.scale.setScalar(1+t*p.grow);}
      p.vy-=p.gravity*dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=p.vz*dt;
      if(p.floor&&p.mesh.position.y<p.floor){p.mesh.position.y=p.floor;p.vy=Math.abs(p.vy)*.3;p.vx*=.6;p.vz*=.6;}
      p.mesh.rotation.x+=p.spin*dt;p.mesh.rotation.y+=p.spin*dt;
      const t=p.life/p.total;if(p.mesh.material.opacity!==undefined)p.mesh.material.opacity=t*(p.mesh.material.userData?.base??1);
    }
    for(let i=casings.length-1;i>=0;i--){
      const c=casings[i];c.life-=dt;
      if(c.life<=0){dropCasing(c);casings.splice(i,1);continue;}
      c.vy-=16*dt;c.mesh.position.x+=c.vx*dt;c.mesh.position.y+=c.vy*dt;c.mesh.position.z+=c.vz*dt;
      if(c.mesh.position.y<.02){c.mesh.position.y=.02;c.vy=Math.abs(c.vy)*.25;c.vx*=.5;c.vz*=.5;}
      c.mesh.rotation.x+=c.spin*dt;c.mesh.rotation.z+=c.spin*dt*.7;
    }
  }
  function applyShake(camera){
    if(trauma<=0)return;
    const s=trauma*trauma,now=time*36;
    camera.position.x+=Math.sin(now*1.13)*.045*s;
    camera.position.y+=Math.cos(now*1.31)*.04*s;
    camera.position.z+=Math.sin(now*.97)*.03*s;
    camera.rotation.z+=Math.sin(now*.83)*.02*s;
  }
  function clear(){
    for(const p of parts)dropParticle(p);parts.length=0;
    for(const c of casings)dropCasing(c);casings.length=0;
    trauma=0;flashPower=0;hurtTimer=0;setLowHealth(false);if(flashEl)flashEl.style.display='none';if(damageEl)damageEl.style.opacity='0';
  }
  return {shake,blood,dust,sparks,casing,explosion,flash,hurt,setLowHealth,update,applyShake,clear,get trauma(){return trauma;}};
}
