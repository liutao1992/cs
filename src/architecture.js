import * as THREE from 'three';

export function masonryArch(scene, material, solids) {
  // Individual wedge-shaped voussoirs: a flat stone face, deep soffit and
  // visible mortar joints instead of a rounded tube silhouette.
  const count = 19, inner = 3.16, outer = 4.04;
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI + .004, b = (i + 1) / count * Math.PI - .004;
    const shape = new THREE.Shape();
    shape.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    shape.absarc(0, 0, inner, a, b, false);
    shape.lineTo(Math.cos(b) * outer, Math.sin(b) * outer);
    shape.absarc(0, 0, outer, b, a, true); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.14, bevelEnabled: true, bevelSegments: 2, bevelSize: .017, bevelThickness: .017, curveSegments: 3 });
    const uv = geometry.attributes.uv;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) / 4, uv.getY(j) / 4);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 3.7, -2.57); mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh); solids.push(mesh);
  }
}

export function palm(scene, x, z, materials) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.13, .29, 7.2, 14, 16), materials.terracotta);
  trunk.position.set(x, 3.6, z); trunk.rotation.z = .045; trunk.castShadow = trunk.receiveShadow = true; scene.add(trunk);
  for (let i = 0; i < 29; i++) {
    const scar = new THREE.Mesh(new THREE.TorusGeometry(.275 - i * .0049, .025, 4, 14), materials.trim);
    scar.rotation.x = Math.PI / 2; scar.position.set(x - i * .011, .24 + i * .24, z); scene.add(scar);
  }
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x657449, roughness: .88, side: THREE.DoubleSide });
  const vertices = [], normals = [];
  const triangle = (a, b, c) => {
    vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    for (let i = 0; i < 3; i++) normals.push(...normal.toArray());
  };
  for (let frond = 0; frond < 13; frond++) {
    const angle = frond * Math.PI * 2 / 13, length = frond % 3 === 0 ? 2.6 : 3.7;
    const along = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const cross = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x - .32, 7.15, z), new THREE.Vector3(x + along.x * length * .45, 8.8, z + along.z * length * .45), new THREE.Vector3(x + along.x * length, 6.3 + frond % 3 * .22, z + along.z * length));
    const rib = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, .023, 5, false), materials.trim); scene.add(rib);
    for (let n = 1; n < 23; n++) {
      const t = n / 24, root = curve.getPoint(t), width = Math.sin(t * Math.PI) * .65;
      for (const side of [-1, 1]) {
        const tip = root.clone().addScaledVector(cross, side * width).addScaledVector(along, .25);
        tip.y -= .15 + width * .3;
        const ridge = root.clone().lerp(tip, .52); ridge.y += .045;
        const rear = curve.getPoint(Math.min(1, t + .033));
        triangle(root, ridge, tip); triangle(ridge, rear, tip);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  const crown = new THREE.Mesh(geometry, leafMaterial); crown.castShadow = crown.receiveShadow = true; scene.add(crown);
}
