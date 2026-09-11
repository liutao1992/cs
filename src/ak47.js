import * as THREE from 'three';
import asset from './ak47-asset.js';

let template;
export function createDetailedAK(){
  if(!template){
    const loader=new THREE.TextureLoader();
    const color=loader.load(asset.textures.color);color.colorSpace=THREE.SRGBColorSpace;
    const normal=loader.load(asset.textures.normal);
    const packed=new THREE.Texture();
    // Source packing is roughness/metalness/AO; Three expects AO/roughness/metalness.
    const image=new Image();image.onload=()=>{
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
      for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];pixels.data[i]=b;pixels.data[i+1]=r;pixels.data[i+2]=g;}
      ctx.putImageData(pixels,0,0);packed.image=canvas;packed.needsUpdate=true;
    };image.src=asset.textures.rmao;
    for(const texture of [color,normal,packed])texture.anisotropy=8;
    const material=new THREE.MeshStandardMaterial({map:color,normalMap:normal,normalScale:new THREE.Vector2(1,-1),roughness:1,metalness:1,roughnessMap:packed,metalnessMap:packed,aoMap:packed,aoMapIntensity:.7});
    template=new THREE.Group();const geometryLoader=new THREE.BufferGeometryLoader();
    for(const data of asset.meshes)template.add(new THREE.Mesh(geometryLoader.parse(data),material));
  }
  return template.clone(true);
}
