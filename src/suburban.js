import * as THREE from 'three';
import asset from './suburban-asset.js';
import { parsePackedGeometry } from './packed-geometry.js';

// Resources belong to one world, so switching maps can release them safely.
export function createSuburbanModels(group,obstacles,solids,extraAsset=null){
  const models={...asset.models,...extraAsset?.models};
  const textureSources={...asset.textures,...extraAsset?.textures};
  const definitions=extraAsset?.materials||{};
  const materials={},geometries={},pbrTextures={};
  function pbrTexture(info,color=false){
    if(!info)return null;
    const key=JSON.stringify([info,color]);
    if(!pbrTextures[key]){
      const map=new THREE.TextureLoader().load(textureSources[info.key]);map.flipY=false;
      map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;map.channel=info.channel;
      const wraps={10497:THREE.RepeatWrapping,33071:THREE.ClampToEdgeWrapping,33648:THREE.MirroredRepeatWrapping};
      map.wrapS=wraps[info.wrapS];map.wrapT=wraps[info.wrapT];map.anisotropy=4;pbrTextures[key]=map;
    }
    return pbrTextures[key];
  }
  function material(key){
    if(!materials[key]){
      const definition=definitions[key]||{};
      if(definition.pbr){
        const color=definition.color,orm=pbrTexture(definition.orm);
        const result=new THREE.MeshStandardMaterial({
          color:new THREE.Color().setRGB(color[0],color[1],color[2],THREE.LinearSRGBColorSpace),opacity:color[3],
          transparent:definition.transparent,depthWrite:!definition.transparent,alphaTest:definition.alphaTest,
          metalness:definition.metalness,roughness:definition.roughness,
          map:pbrTexture(definition.base,true),normalMap:pbrTexture(definition.normal),
          normalScale:new THREE.Vector2(definition.normalScale,definition.normalScale),
          roughnessMap:orm,metalnessMap:orm,aoMap:pbrTexture(definition.ao),aoMapIntensity:definition.aoIntensity,
          side:definition.doubleSided?THREE.DoubleSide:THREE.FrontSide,
        });
        result.name=key;materials[key]=result;return result;
      }
      const texture=new THREE.TextureLoader().load(textureSources[definition.texture||key]);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;
      if(!definitions[key])texture.magFilter=THREE.NearestFilter;
      materials[key]=new THREE.MeshStandardMaterial({map:texture,roughness:1,side:THREE.DoubleSide,alphaTest:definition.cutout?.45:0,vertexColors:!!definition.vertexColors});
    }
    return materials[key];
  }
  const loader=new THREE.BufferGeometryLoader();
  return function model(name,x,z,scale=8,yaw=0,collision='building'){
    const data=models[name];
    if(!data)throw new Error('Unknown environment model: '+name);
    geometries[name]??=data.meshes.map(mesh=>mesh.packed?parsePackedGeometry(mesh):loader.parse(mesh));
    const instance=new THREE.Group();instance.name=(data.namespace|| (data.atlas==='modular'?'modular':'suburban'))+':'+name;
    for(const [i,geometry] of geometries[name].entries()){
      const key=data.materials?.[i]||data.atlas;
      const mesh=new THREE.Mesh(geometry,material(key));mesh.castShadow=!data.ground&&!name.startsWith('road-');mesh.receiveShadow=true;instance.add(mesh);
      // Leaf cards are visual cover only; their transparent areas must not stop bullets.
      if(collision&&!definitions[key]?.cutout)solids.push(mesh);
    }
    instance.scale.setScalar(scale);instance.rotation.y=yaw;
    // Road curbs sit just above the existing flat walking surface.
    instance.position.set(x,data.ground?.002:name.startsWith('road-')?-.15:0,z);group.add(instance);instance.updateMatrixWorld(true);
    if(collision){
      const bounds=new THREE.Box3().setFromObject(instance);
      if(collision==='tree'&&data.trunk){
        const trunk=new THREE.Box3(new THREE.Vector3(...data.trunk.min),new THREE.Vector3(...data.trunk.max)).applyMatrix4(instance.matrixWorld);
        obstacles.push({minX:trunk.min.x,maxX:trunk.max.x,minZ:trunk.min.z,maxZ:trunk.max.z,height:bounds.max.y});
      }
      else if(collision==='tree')obstacles.push({minX:x-.25,maxX:x+.25,minZ:z-.25,maxZ:z+.25,height:bounds.max.y});
      else obstacles.push({minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z,height:bounds.max.y});
    }
    return instance;
  };
}
