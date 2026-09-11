import * as THREE from 'three';

const cache = new Map();
export function weaponSurface(kind, color, metalness, roughness) {
  if (!cache.has(kind)) {
    const size = 512, canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d'), data = ctx.createImageData(size, size);
    let seed = 173;
    const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const p = (y * size + x) * 4;
      let value = 218 + random() * 30;
      if (kind === 'wood') {
        const phase = y * .48 + Math.sin(x * .018) * 1.4 + Math.sin(x * .043 + y * .012) * .7;
        value = 194 + 9 * Math.sin(phase) + 4 * Math.sin(phase * 3.1) + random() * 10;
      } else if (kind === 'fabric') {
        value = 195 + (x % 4 < 2 ? 20 : 0) + (y % 4 < 2 ? 18 : 0) + random() * 15;
      }
      data.data[p] = data.data[p + 1] = data.data[p + 2] = value;
      data.data[p + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    if (kind === 'steel') for (let i = 0; i < 850; i++) {
      const x = random() * size, y = random() * size;
      ctx.strokeStyle = `rgba(255,255,255,${.05 + random() * .18})`;
      ctx.lineWidth = .3 + random() * .6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + random() * 35, y + random() * 3); ctx.stroke();
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 8;
    const bump = map.clone(); bump.colorSpace = THREE.NoColorSpace;
    cache.set(kind, { map, bump });
  }
  const { map, bump } = cache.get(kind);
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, map, bumpMap: bump, bumpScale: kind === 'fabric' ? .00035 : .00015, roughnessMap: bump });
}

// Extruded geometry uses world-sized UVs by default; map every face at a
// consistent physical texel density so small weapon parts retain surface detail.
export function mapWeaponGeometry(geometry) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ax > ay && ax > az) uv.setXY(i, p.getZ(i) * 5, p.getY(i) * 5);
    else if (ay > az) uv.setXY(i, p.getX(i) * 5, p.getZ(i) * 5);
    else uv.setXY(i, p.getX(i) * 5, p.getY(i) * 5);
  }
}
