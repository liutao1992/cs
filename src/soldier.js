import * as THREE from 'three';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from '../node_modules/three/examples/jsm/utils/SkeletonUtils.js';
import data from './soldier-asset.js';

let asset;
export const soldierReady=new GLTFLoader().parseAsync(Uint8Array.from(atob(data),c=>c.charCodeAt(0)).buffer,'').then(result=>{asset=result;});
export function createSoldier(faction,elite){
  if(!asset)return null;
  const model=clone(asset.scene),root=new THREE.Group();root.add(model);
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
    mesh.material=mesh.material.clone();
    mesh.material.color.multiply(new THREE.Color(elite?0xc98d81:faction==='CT'?0x9bb9cd:0xd1c19e));
  });
  const mixer=new THREE.AnimationMixer(model);
  const idle=mixer.clipAction(asset.animations.find(a=>a.name==='Idle'));
  const walk=mixer.clipAction(asset.animations.find(a=>a.name==='Walk'));
  idle.play();walk.play();walk.setEffectiveWeight(0);
  mixer.update(0);model.updateMatrixWorld(true);
  model.traverse(mesh=>{if(mesh.isSkinnedMesh){mesh.skeleton.update();mesh.computeBoundingBox();}});
  const box=new THREE.Box3().setFromObject(model),height=box.max.y-box.min.y;
  root.scale.setScalar(1.8/height);root.position.y=-box.min.y*1.8/height;
  const arms=['Right','Left'].map(side=>({
    upper:model.getObjectByName('mixamorig'+side+'Arm'),
    lower:model.getObjectByName('mixamorig'+side+'ForeArm'),
    hand:model.getObjectByName('mixamorig'+side+'Hand'),
    target:new THREE.Vector3(side==='Right'?.1:-.02,side==='Right'?1.18:1.23,side==='Right'?-.20:-.51),
    side:side==='Right'?1:-1
  }));
  function pointBone(bone,child,destination){
    const from=bone.getWorldPosition(new THREE.Vector3()),direction=child.getWorldPosition(new THREE.Vector3()).sub(from).normalize();
    const rotation=new THREE.Quaternion().setFromUnitVectors(direction,destination.clone().sub(from).normalize()).multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));bone.updateWorldMatrix(false,true);
  }
  function aimArms(){
    if(!root.parent)return;root.parent.updateWorldMatrix(true,true);
    for(const arm of arms){
      if(!arm.upper||!arm.lower||!arm.hand)continue;
      const shoulder=arm.upper.getWorldPosition(new THREE.Vector3()),elbow=arm.lower.getWorldPosition(new THREE.Vector3()),wrist=arm.hand.getWorldPosition(new THREE.Vector3());
      const target=root.parent.localToWorld(arm.target.clone()),a=shoulder.distanceTo(elbow),b=elbow.distanceTo(wrist);
      const direction=target.clone().sub(shoulder),distance=Math.min(direction.length(),a+b-.001);direction.normalize();
      const along=(a*a-b*b+distance*distance)/(2*distance);
      const bend=new THREE.Vector3(arm.side,-1,0).transformDirection(root.parent.matrixWorld);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
      const desiredElbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,a*a-along*along)));
      pointBone(arm.upper,arm.lower,desiredElbow);pointBone(arm.lower,arm.hand,target);
    }
  }
  let blend=0;
  return {root,update(dt,moving){blend=THREE.MathUtils.damp(blend,moving?1:0,10,dt);idle.setEffectiveWeight(1-blend);walk.setEffectiveWeight(blend);mixer.update(dt);aimArms();}};
}
