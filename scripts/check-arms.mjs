import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
globalThis.ProgressEvent=class {constructor(type,init){this.type=type;Object.assign(this,init);}};
const file=await readFile(new URL('../assets/arms/arms.glb',import.meta.url));
const jsonSize=file.readUInt32LE(12),json=JSON.parse(file.subarray(20,20+jsonSize));
json.buffers[0].uri='data:application/octet-stream;base64,'+file.subarray(28+jsonSize).toString('base64');
delete json.images;delete json.textures;delete json.materials;
for(const mesh of json.meshes)for(const primitive of mesh.primitives)delete primitive.material;
const {scene}=await new GLTFLoader().parseAsync(JSON.stringify(json),'');
scene.updateMatrixWorld(true);
scene.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;
  mesh.skeleton.update();mesh.computeBoundingBox();
  console.log('MESH',mesh.name,'vertices',mesh.geometry.attributes.position.count,'bounds',mesh.boundingBox);
  console.log('BIND',mesh.bindMatrix.elements);
  for(const bone of mesh.skeleton.bones.filter(b=>/^(arm|forearm|hand|index1|middle1|pinky1)_/.test(b.name)))console.log(bone.name,bone.getWorldPosition(new THREE.Vector3()).toArray(),bone.getWorldQuaternion(new THREE.Quaternion()).toArray());
});
