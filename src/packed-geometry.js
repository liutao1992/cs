import { BufferGeometry, BufferAttribute } from 'three';

const arrays={Float32Array,Uint32Array,Uint16Array,Uint8Array,Int16Array,Int8Array};
export function parsePackedGeometry(data){
  const geometry=new BufferGeometry();
  function attribute(value){
    const Type=arrays[value.type];
    if(!Type)throw new Error('Unsupported geometry array '+value.type);
    const bytes=Uint8Array.from(atob(value.array),char=>char.charCodeAt(0));
    return new BufferAttribute(new Type(bytes.buffer),value.itemSize,value.normalized);
  }
  for(const [key,value] of Object.entries(data.attributes))geometry.setAttribute(key,attribute(value));
  if(data.index)geometry.setIndex(attribute(data.index));
  for(const group of data.groups||[])geometry.addGroup(group.start,group.count,group.materialIndex);
  return geometry;
}
