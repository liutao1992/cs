import * as THREE from 'three';

// Deterministic, tileable surface data, generated locally for file:// builds.
export function createSurface(kind, color, renderer) {
  const size = 512, pixels = size * size;
  let seed = kind === 'wood' ? 317 : kind === 'ground' ? 811 : 197;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const grids = [4, 8, 16, 32, 64, 128].map(n => ({ n, values: Float32Array.from({ length: n * n }, random) }));
  const noise = (x, y, grid) => {
    const { n, values } = grid, u = x / size * n, v = y / size * n;
    const ix = Math.floor(u), iy = Math.floor(v), fx = u - ix, fy = v - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const at = (a, b) => values[((b % n + n) % n) * n + ((a % n + n) % n)];
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(ix, iy), at(ix + 1, iy), sx), THREE.MathUtils.lerp(at(ix, iy + 1), at(ix + 1, iy + 1), sx), sy);
  };
  const base = new THREE.Color(color);
  base.convertLinearToSRGB();
  const heights = new Float32Array(pixels), shades = new Float32Array(pixels);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const p = y * size + x;
    const broad = noise(x, y, grids[0]) * .55 + noise(x, y, grids[1]) * .3 + noise(x, y, grids[2]) * .15;
    const grain = noise(x, y, grids[4]) * .6 + random() * .4;
    let h = broad * .5 + grain * .15, shade = .73 + broad * .4 + grain * .1;
    if (kind === 'wall') {
      // Broken plaster reveals irregular limestone joints beneath it.
      const row = Math.floor(y / 64), jointX = (x + (row % 2) * 64) % 128;
      const joint = Math.min(y % 64, 64 - y % 64, jointX, 128 - jointX);
      const exposed = THREE.MathUtils.smoothstep(.46 - broad, 0, .12);
      const seam = (1 - THREE.MathUtils.smoothstep(joint, 1, 4)) * exposed;
      h -= seam * .23;
      shade -= seam * .25 + exposed * .07;
      if (grain < .22) { h -= .1; shade -= .06; }
    } else if (kind === 'wood') {
      const vein = Math.sin(x * .7 + noise(x, y, grids[1]) * 12 + Math.sin(y / size * Math.PI * 4) * 3);
      const seam = y % 64 < 3;
      h += vein * .035 - (seam ? .2 : 0);
      shade += vein * .07 - (seam ? .3 : 0);
    } else {
      const stone = noise(x, y, grids[5]);
      h += Math.max(0, stone - .61) * .65;
      shade -= Math.max(0, .4 - stone) * .3;
    }
    heights[p] = h; shades[p] = shade;
  }
  function map(type) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d'), data = ctx.createImageData(size, size);
    const height = (x, y) => heights[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const p = y * size + x, i = p * 4;
      if (type === 'normal') {
        const nx = (height(x - 1, y) - height(x + 1, y)) * 3;
        const ny = (height(x, y - 1) - height(x, y + 1)) * 3;
        const length = Math.hypot(nx, ny, 1);
        data.data[i] = (nx / length * .5 + .5) * 255;
        data.data[i + 1] = (ny / length * .5 + .5) * 255;
        data.data[i + 2] = (.5 / length + .5) * 255;
      } else if (type === 'roughness') {
        data.data[i] = data.data[i + 1] = data.data[i + 2] = 205 + heights[p] * 65;
      } else {
        data.data[i] = base.r * shades[p] * 255;
        data.data[i + 1] = base.g * shades[p] * 255;
        data.data[i + 2] = base.b * shades[p] * 255;
      }
      data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    const result = new THREE.CanvasTexture(canvas);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    if (type === 'color') result.colorSpace = THREE.SRGBColorSpace;
    if (kind === 'ground') result.repeat.set(45, 45);
    return result;
  }
  return new THREE.MeshStandardMaterial({ map: map('color'), normalMap: map('normal'), roughnessMap: map('roughness'), roughness: 1, normalScale: new THREE.Vector2(.65, .65) });
}
