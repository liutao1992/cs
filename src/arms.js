import * as THREE from 'three';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from '../node_modules/three/examples/jsm/utils/SkeletonUtils.js';
import data from './arms-asset.js';

let asset;
const pending=[];
export const armsReady=new GLTFLoader().parseAsync(Uint8Array.from(atob(data),c=>c.charCodeAt(0)).buffer,'').then(result=>{
  asset=result.scene;
  for(const [group,type] of pending)populate(group,type);
  pending.length=0;
});
const vector=a=>new THREE.Vector3(...a);
function worldRotation(bone,q){
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
  bone.updateWorldMatrix(false,true);
}
function pointDirection(bone,child,direction){
  const origin=bone.getWorldPosition(new THREE.Vector3());
  const current=child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
  worldRotation(bone,new THREE.Quaternion().setFromUnitVectors(current,direction.clone().normalize()).multiply(bone.getWorldQuaternion(new THREE.Quaternion())));
}
function curlThumb(model,side,target){
  const tip=model.getObjectByName('thumb3_'+side+'_end');
  for(let iteration=0;iteration<7;iteration++)for(let i=3;i>=1;i--){
    const bone=model.getObjectByName('thumb'+i+'_'+side),origin=bone.getWorldPosition(new THREE.Vector3());
    const current=tip.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(),desired=target.clone().sub(origin).normalize();
    const delta=new THREE.Quaternion().setFromUnitVectors(current,desired);
    const limited=new THREE.Quaternion().slerp(delta,Math.min(1,.3/Math.max(.001,delta.angleTo(new THREE.Quaternion()))));
    worldRotation(bone,limited.multiply(bone.getWorldQuaternion(new THREE.Quaternion())));
  }
}
function basis(across,forward){
  const y=forward.clone().normalize(),x=across.clone().addScaledVector(y,-across.dot(y)).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,x.clone().cross(y)));
}
function poseModel(model,type,stage='idle'){
  const pistol=type===1||type===4;
  for(const side of ['R','L']){
    const right=side==='R',upper=model.getObjectByName('arm_'+side),lower=model.getObjectByName('forearm_'+side),hand=model.getObjectByName('hand_'+side);
    const wrist=vector(right?[.065,-.115,.22]:pistol?[-.08,-.15,.12]:[-.075,-.048,type===0?-.36:-.32]);
    const originalWrist=wrist.clone();
    if(!right){
      if(stage==='release')wrist.add(vector([-.10,-.10,.035]));
      if(stage==='magazine')wrist.copy(vector(pistol?[-.09,-.245,.13]:[-.10,-.24,type===0?-.18:-.08]));
      if(stage==='lowered')wrist.copy(vector([-.24,-.48,.10]));
    }
    const upperLength=upper.getWorldPosition(new THREE.Vector3()).distanceTo(lower.getWorldPosition(new THREE.Vector3()));
    const lowerLength=lower.getWorldPosition(new THREE.Vector3()).distanceTo(hand.getWorldPosition(new THREE.Vector3()));
    const elbow=wrist.clone().addScaledVector(vector(right?[.4,-.4,.8]:[-.3,-.55,.8]).normalize(),lowerLength);
    const shoulder=elbow.clone().addScaledVector(vector(right?[.12,-.45,.88]:[-.22,-.5,.84]).normalize(),upperLength);
    const index=model.getObjectByName('index1_'+side),pinky=model.getObjectByName('pinky1_'+side),middle=model.getObjectByName('middle1_'+side);
    const across=index.getWorldPosition(new THREE.Vector3()).sub(pinky.getWorldPosition(new THREE.Vector3())).normalize();
    const forward=middle.getWorldPosition(new THREE.Vector3()).sub(hand.getWorldPosition(new THREE.Vector3())).normalize();
    const magazineGrip=!right&&(stage==='magazine'||stage==='lowered');
    const desired=basis(vector(right?[0,1,0]:[0,0,-1]),vector(right?[-.25,0,-1]:magazineGrip?[.75,.65,-.15]:[.68,.10,-.73]));
    const handRotation=desired.multiply(basis(across,forward).invert()).multiply(hand.getWorldQuaternion(new THREE.Quaternion()));
    // Spread wrist roll over the forearm instead of twisting its last vertices.
    const rollAxis=vector([1,0,0]).applyQuaternion(handRotation);
    upper.position.copy(upper.parent.worldToLocal(shoulder.clone()));upper.updateWorldMatrix(false,true);
    worldRotation(upper,basis(rollAxis,elbow.clone().sub(shoulder)));
    worldRotation(lower,basis(rollAxis,wrist.clone().sub(elbow)));
    worldRotation(hand,handRotation);
    // Joint directions describe a C-shaped grip around the weapon surface.
    for(const finger of ['index','middle','ring','pinky'])for(let i=1;i<=3;i++){
      const bone=model.getObjectByName(finger+i+'_'+side);
      const child=model.getObjectByName(finger+(i===3?'3_'+side+'_end':(i+1)+'_'+side));
      const directions=right?[[-.3,0,-1],[-1,0,.05],[-.3,0,1]]:stage==='release'?[[.7,.25,-.3],[.7,.4,0],[.3,.6,0]]:[[.75,.7,0],[0,1,.05],[-1,.1,0]];
      pointDirection(bone,child,vector(directions[i-1]));
    }
    const thumbTarget=right?vector([-.018,-.063,.12]):pistol?vector([-.02,-.085,.035]):vector([-.035,.04,type===0?-.43:-.39]);
    if(!right)thumbTarget.add(wrist.clone().sub(originalWrist));
    curlThumb(model,side,thumbTarget);
  }
}
function populate(group,type){
  const model=clone(asset);model.scale.setScalar(1.25);model.updateMatrixWorld(true);
  const bones=[];model.traverse(object=>{if(object.isBone)bones.push(object);});
  const snapshot=()=>bones.map(bone=>({position:bone.position.clone(),rotation:bone.quaternion.clone()}));
  const restore=pose=>{bones.forEach((bone,i)=>{bone.position.copy(pose[i].position);bone.quaternion.copy(pose[i].rotation);});model.updateMatrixWorld(true);};
  const rest=snapshot(),poses={};
  for(const stage of ['idle','release','magazine','lowered']){
    restore(rest);poseModel(model,type,stage);poses[stage]=snapshot();
  }
  restore(poses.idle);
  const timeline=[[0,'idle'],[.14,'release'],[.30,'magazine'],[.50,'lowered'],[.69,'magazine'],[.85,'release'],[1,'idle']];
  let lastProgress=-1;
  group.userData.update=progress=>{
    progress=Number.isFinite(progress)?THREE.MathUtils.clamp(progress,0,1):0;
    if(progress===lastProgress)return;lastProgress=progress;
    let segment=1;while(segment<timeline.length-1&&progress>timeline[segment][0])segment++;
    const [start,from]=timeline[segment-1],[end,to]=timeline[segment];
    const t=THREE.MathUtils.smoothstep(progress,start,end);
    bones.forEach((bone,i)=>{
      bone.position.lerpVectors(poses[from][i].position,poses[to][i].position,t);
      bone.quaternion.slerpQuaternions(poses[from][i].rotation,poses[to][i].rotation,t);
    });
  };
  model.traverse(mesh=>{if(mesh.isMesh){
    mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
    mesh.material=mesh.material.clone();mesh.material.color.setRGB(.74,.62,.52);
    if(mesh.material.map)mesh.material.map.anisotropy=8;
    if(mesh.material.normalMap)mesh.material.normalMap.anisotropy=8;
  }});
  model.updateMatrixWorld(true);
  group.add(model);
  group.name='FirstPersonArms';
}
export function createArms(type){
  const group=new THREE.Group();
  if(asset)populate(group,type);else pending.push([group,type]);
  return group;
}
