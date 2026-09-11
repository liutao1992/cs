import * as THREE from 'three';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import data from './weapons-asset.js';

const models=new Map(),instances=new Map();
const configurations={usp:{length:.37,muzzle:-.27,y:-.07},glock:{length:.40,muzzle:-.28,y:-.07},awp:{length:1.65,muzzle:-1.12,y:0},m4a1:{length:1.42,muzzle:-.90,y:-.03}};
export const weaponsReady=Promise.all(Object.entries(data).map(async([name,encoded])=>{
  const asset=await new GLTFLoader().parseAsync(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)).buffer,'');
  const model=asset.scene,config=configurations[name];
  const props=[];model.traverse(mesh=>{if(mesh.name.startsWith('Projetil'))props.push(mesh);});
  for(const prop of props)prop.removeFromParent();
  let box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
  if(size.x>size.z)model.rotation.y=Math.PI/2;
  box=new THREE.Box3().setFromObject(model);size=box.getSize(new THREE.Vector3());
  const scale=config.length/size.z,center=box.getCenter(new THREE.Vector3());
  const root=new THREE.Group();root.add(model);root.scale.setScalar(scale);
  root.position.set(-center.x*scale,config.y-center.y*scale,config.muzzle-box.min.z*scale);
  model.traverse(mesh=>{if(mesh.isMesh){mesh.material.metalness=Math.min(mesh.material.metalness??0,.45);mesh.material.roughness=Math.max(mesh.material.roughness??.6,.45);if(name==='m4a1'&&!mesh.material.map){mesh.material.color.set(0x303536);mesh.material.metalness=.65;}}});
  models.set(name,root);
  for(const group of instances.get(name)||[])group.add(root.clone(true));
}));
export function createImportedWeapon(type){
  const name=['','usp','awp','m4a1','glock'][type],group=new THREE.Group();
  if(models.has(name))group.add(models.get(name).clone(true));
  else{if(!instances.has(name))instances.set(name,[]);instances.get(name).push(group);}
  return group;
}
