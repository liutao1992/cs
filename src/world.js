import * as THREE from 'three';
import { createSurface, createPhotoSurface } from './surfaces.js';
import { masonryArch, palm } from './architecture.js';
import { Sky } from '../node_modules/three/examples/jsm/objects/Sky.js';
import { getMap } from './maps.js';
import { createSuburbanModels } from './suburban.js';
import modularAsset from './modular-asset.js';
import natureAsset from './nature-asset.js';
import downtownAsset from './downtown-asset.js';

function createKit(renderer, group, atmo){
  const obstacles=[], solids=[], sites=[], explosives=[], aoPatches=[];
  let seed=427;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  // Photo textures carry the CS look; solid colors stay for painted metal.
  // Ground picks its CC0 set per map: desert sand, grass, brick court or concrete.
  const groundSet=atmo.groundTex==='grass'?'grass':atmo.groundTex==='concrete'?'concrete':atmo.groundTex==='bricks'?'yellowBricks':'sandGround';
  const groundRepeat=atmo.groundTex==='bricks'?22:26;
  const materials={sand:createPhotoSurface('clay',{color:'#d8c6a8'},renderer),light:createPhotoSurface('plaster',{color:'#d9c9ad'},renderer),ground:createPhotoSurface(groundSet,{color:atmo.ground||'#c9b795',roughness:1,repeat:groundRepeat},renderer),wood:createPhotoSurface('wood',{color:'#d6bd97'},renderer),trim:createPhotoSurface('sandstoneBlocks',{color:'#c6b89c'},renderer),blue:new THREE.MeshStandardMaterial({color:0x536f71,roughness:.85}),window:new THREE.MeshStandardMaterial({color:0x272c26,roughness:.35,emissive:0xffb46a,emissiveIntensity:.32}),dark:new THREE.MeshStandardMaterial({color:0x3e433b,roughness:.8}),metal:new THREE.MeshStandardMaterial({color:0x697369,roughness:.65,metalness:.3}),terracotta:createPhotoSurface('yellowBricks',{color:'#d8b48e'},renderer),hazard:new THREE.MeshStandardMaterial({color:0xa8452f,roughness:.55,metalness:.2,emissive:0x2a0d07,emissiveIntensity:.35})};
  function box(x,y,z,w,h,d,mat=materials.sand,collide=false){const geo=new THREE.BoxGeometry(w,h,d);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++){uv.setXY(i,uv.getX(i)*([d,d,w,w,w,w][Math.floor(i/4)]/4),uv.getY(i)*([h,h,d,d,h,h][Math.floor(i/4)]/4));}const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);if(collide){obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,height:y+h/2});solids.push(m);if(mat===materials.wood)m.userData.penetrable=Math.min(w,d)*.5;if(y-h/2<.3&&w<100)aoPatches.push([x,z,w,d]);}return m;}
  function cylinder(x,y,z,r,h,mat,segments=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
  function textPlane(text,x,y,z,w,h,color='#6c3325',bg=null,rot=0){const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,512,256);}ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 118px Arial';ctx.fillStyle=color;ctx.fillText(text,256,130,485);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,transparent:true,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));m.position.set(x,y,z);m.rotation.y=rot;group.add(m);return m;}
  function building(x,z,w,d,h,light=false){const mat=light?materials.light:materials.sand;box(x,h/2,z,w,h,d,mat,true);box(x,h+.12,z,w+.5,.24,d+.5,materials.trim);box(x,h+.42,z-d/2,w,.6,.24,mat);box(x,h+.42,z+d/2,w,.6,.24,mat);box(x-w/2,h+.42,z,.24,.6,d,mat);box(x+w/2,h+.42,z,.24,.6,d,mat);
    for(const side of [-1,1]){for(let wx=x-w/2+2;wx<x+w/2-1;wx+=3.5){for(let wy=3;wy<h-1;wy+=3){box(wx,wy,z+side*(d/2+.035),1.05,1.45,.08,materials.window);box(wx,wy-.79,z+side*(d/2+.12),1.35,.14,.28,materials.trim);for(let n=-1;n<=1;n++)box(wx+n*.29,wy,z+side*(d/2+.1),.035,1.35,.04,materials.metal);}}}
    for(const side of [-1,1]){for(let wz=z-d/2+2;wz<z+d/2-1;wz+=3.6){
      const face=x+side*(w/2+.03);
      box(face,3.1,wz,.08,1.4,1,materials.window);
      box(face+side*.11,2.32,wz,.3,.16,1.3,materials.trim);
      box(face+side*.08,3.86,wz,.22,.15,1.28,materials.light);
      for(const edge of [-1,1])box(face+side*.08,3.1,wz+edge*.57,.22,1.45,.14,materials.trim);
      for(const edge of [-1,1]){
        box(face+side*.10,3.1,wz+edge*.3,.10,1.31,.035,materials.blue);
        for(let slat=0;slat<12;slat++){const louver=box(face+side*.12,2.5+slat*.108,wz+edge*.27,.095,.07,.46,materials.blue);louver.rotation.z=side*.25;}
      }
      box(face+side*.19,3.06,wz,.035,.055,.12,materials.metal);
    }}
    for(const side of [-1,1]){
      box(x,.24,z+side*(d/2+.045),w,.48,.12,materials.trim);
      box(x+side*(w/2+.045),.24,z,.12,.48,d,materials.trim);
      for(let wx=x-w/2+2;wx<x+w/2-1;wx+=3.5){for(let wy=3;wy<h-1;wy+=3){const face=z+side*(d/2+.105);box(wx,wy+.8,face,1.35,.16,.2,materials.light);for(const edge of [-1,1])box(wx+edge*.61,wy,face,.13,1.5,.2,materials.trim);box(wx,wy,face,.04,1.42,.12,materials.blue);}}
      const drain=cylinder(x-w/2+.32,h/2,z+side*(d/2+.18),.065,h,materials.metal,8);
      for(let y=.8;y<h;y+=2)box(drain.position.x,y,drain.position.z,.22,.06,.19,materials.dark);
      box(x+w/2-.65,1.2,z+side*(d/2+.14),.48,.66,.22,materials.metal);
      box(x+w/2-.65,1.3,z+side*(d/2+.265),.26,.19,.025,materials.dark);
    }
    const ac=box(x+w/2+.4,4.7,z+1,.8,.85,1.3,materials.light);for(let n=0;n<5;n++)box(ac.position.x+.42,4.45+n*.12,z+1,.03,.025,1.05,materials.metal);
    if(random()>.4){cylinder(x+1,h+1,z,1,1.7,materials.metal);cylinder(x+1,h+1.9,z,1.06,.15,materials.dark);}
    cylinder(x-2,h+1.8,z-2,.035,3.5,materials.metal);box(x-2,h+3.3,z-2,2.3,.025,.03,materials.metal);
  }
  function crate(x,z,w=2,h=2,d=2){box(x,h/2,z,w,h,d,materials.wood,true);for(const side of [-1,1]){for(const yy of [.12,h-.12])box(x,yy,z+side*(d/2+.03),w+.04,.16,.11,materials.dark);for(const xx of [-w/2+.12,w/2-.12])box(x+xx,h/2,z+side*(d/2+.08),.15,h,.13,materials.trim);box(x+side*(w/2+.04),h/2,z,.1,h+.04,.15,materials.dark);}textPlane('↑ ↑',x,h*.58,z+d/2+.16,w*.65,h*.6,'#272e24');}
  function barrel(x,z){const mesh=cylinder(x,.65,z,.48,1.3,materials.hazard);solids.push(mesh);obstacles.push({minX:x-.48,maxX:x+.48,minZ:z-.48,maxZ:z+.48,height:1.3});for(const y of [.12,.65,1.18])cylinder(x,y,z,.5,.07,materials.dark);const ref={x,z,radius:5.8,damage:95,mesh,exploded:false};mesh.userData.explosive=ref;explosives.push(ref);aoPatches.push([x,z,1.15,1.15]);return ref;}
  function site(x,z,label){const ring=new THREE.Mesh(new THREE.RingGeometry(2.4,2.5,4),new THREE.MeshStandardMaterial({color:0xaa642c,transparent:true,opacity:.7,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.rotation.z=Math.PI/4;ring.position.set(x,.016,z);group.add(ring);const t=textPlane(label,x,.025,z,2.5,2.5,'#9e5629');t.rotation.x=-Math.PI/2;sites.push({x,z,label});return {x,z,label};}
  function palmAt(x,z){palm(group,x,z,materials);}
  function cable(z){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-6,8,z),new THREE.Vector3(0,6,z),new THREE.Vector3(6,9,z));const cableMesh=new THREE.Mesh(new THREE.TubeGeometry(curve,18,.024,4,false),materials.dark);group.add(cableMesh);}
  function arch(){masonryArch(group,materials.light,solids);solids.push(box(0,7.75,-2,10,1.2,1.1,materials.sand),box(-4.3,5.7,-2,1.4,3.5,1.1,materials.light),box(4.3,5.7,-2,1.4,3.5,1.1,materials.light));}
  function scatter(count,xMin,xMax,zMin,zMax){for(let i=0;i<count;i++){const x=random()*(xMax-xMin)+xMin,z=random()*(zMax-zMin)+zMin;if(obstacles.some(o=>x>o.minX-.2&&x<o.maxX+.2&&z>o.minZ-.2&&z<o.maxZ+.2))continue;const stone=box(x,.04,z,.05+random()*.15,.08,.06+random()*.14,materials.trim);stone.rotation.y=random()*6;stone.castShadow=false;}}
  return {obstacles,solids,sites,explosives,aoPatches,materials,random,box,cylinder,textPlane,building,crate,barrel,site,palm:palmAt,cable,arch,scatter};
}

export function createWorld(scene, renderer, mapId){
  const map=getMap(mapId),atmo=map.atmosphere||{},group=new THREE.Group();scene.add(group);
  const kit=createKit(renderer,group,atmo);
  if(map.environment)kit.model=createSuburbanModels(group,kit.obstacles,kit.solids,{modular:modularAsset,nature:natureAsset,downtown:downtownAsset}[map.environment]||null);
  const ground=kit.box(0,-.2,0,180,.4,180,kit.materials.ground);ground.geometry.attributes.uv.copy(new THREE.BoxGeometry(1,1,1).attributes.uv);kit.solids.push(ground);
  map.build(kit);
  // Baked contact shadows: one InstancedMesh of radial-gradient patches under
  // every collider — cover sits on the ground instead of floating on it.
  if(kit.aoPatches.length){
    const aoCanvas=document.createElement('canvas');aoCanvas.width=aoCanvas.height=128;
    const aoCtx=aoCanvas.getContext('2d'),gradient=aoCtx.createRadialGradient(64,64,8,64,64,62);
    gradient.addColorStop(0,'rgba(10,8,4,.4)');gradient.addColorStop(1,'rgba(10,8,4,0)');
    aoCtx.fillStyle=gradient;aoCtx.fillRect(0,0,128,128);
    const aoMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(aoCanvas),transparent:true,depthWrite:false}),kit.aoPatches.length);
    const aoMatrix=new THREE.Matrix4(),aoQuat=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)),aoScale=new THREE.Vector3(),aoPos=new THREE.Vector3();
    kit.aoPatches.forEach((p,i)=>{aoScale.set(p[2]*1.5,p[3]*1.5,1);aoPos.set(p[0],.011+i*.00004,p[1]);aoMatrix.compose(aoPos,aoQuat,aoScale);aoMesh.setMatrixAt(i,aoMatrix);});
    aoMesh.instanceMatrix.needsUpdate=true;aoMesh.renderOrder=1;group.add(aoMesh);
  }
  // Distant ridge ring: flat-shaded peaks kept inside the fog range, so the
  // arena reads as a valley in a landscape instead of a walled box.
  const ridgeMat=new THREE.MeshStandardMaterial({color:atmo.ridgeColor??0x8a7a60,roughness:1,flatShading:true});
  for(let i=0;i<13;i++){
    const angle=i/13*Math.PI*2+kit.random()*.4,radius=102+kit.random()*32,height=18+kit.random()*26,base=22+kit.random()*24;
    const peakGeo=new THREE.ConeGeometry(base,height,7,3),peakAttr=peakGeo.attributes.position;
    for(let v=0;v<peakAttr.count;v++){peakAttr.setX(v,peakAttr.getX(v)*(.7+kit.random()*.6));peakAttr.setZ(v,peakAttr.getZ(v)*(.7+kit.random()*.6));peakAttr.setY(v,peakAttr.getY(v)+(kit.random()-.5)*height*.22);}
    peakGeo.computeVertexNormals();
    const peak=new THREE.Mesh(peakGeo,ridgeMat);peak.position.set(Math.cos(angle)*radius,height/2-.8,Math.sin(angle)*radius);group.add(peak);
  }
  // Drifting dust motes around the player — visible air at near-zero cost.
  const dustCount=220,dustPositions=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++){const r=Math.sqrt(kit.random())*17,a=kit.random()*Math.PI*2;dustPositions[i*3]=Math.cos(a)*r;dustPositions[i*3+1]=.25+kit.random()*6.2;dustPositions[i*3+2]=Math.sin(a)*r;}
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xffe2b8,size:.05,transparent:true,opacity:.3,depthWrite:false,blending:THREE.AdditiveBlending}));
  group.add(dust);
  function update(dt,player){if(!player)return;dust.position.x=player.x;dust.position.z=player.z;dust.rotation.y+=dt*.014;}
  const sunPos=atmo.sun||[-30,48,25];
  const sun=new THREE.DirectionalLight(atmo.sunColor||0xffe4b5,3.2);sun.position.set(...sunPos);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-46,right:46,top:46,bottom:-46,near:1,far:130});sun.shadow.bias=-.0005;sun.shadow.normalBias=.025;group.add(sun);
  const hemi=atmo.hemi||[0xc4dae3,0x897758,1.25];group.add(new THREE.HemisphereLight(...hemi));
  const bg=atmo.bg??0xb7cbd0;scene.background=new THREE.Color(bg);scene.fog=new THREE.Fog(bg,...(atmo.fog||[45,125]));
  const sky=new Sky();sky.scale.setScalar(200);sky.material.uniforms.turbidity.value=atmo.turbidity||3;sky.material.uniforms.rayleigh.value=atmo.rayleigh||1.4;sky.material.uniforms.mieCoefficient.value=.004;sky.material.uniforms.mieDirectionalG.value=.8;sky.material.uniforms.sunPosition.value.copy(sun.position);group.add(sky);
  const skyEnvironmentScene=new THREE.Scene();skyEnvironmentScene.add(sky.clone());
  const environmentGenerator=new THREE.PMREMGenerator(renderer);const environment=environmentGenerator.fromScene(skyEnvironmentScene,.04,.1,300);
  scene.environment=environment.texture;scene.environmentIntensity=.3;environmentGenerator.dispose();
  function dispose(){
    scene.remove(group);
    const geometries=new Set(),materials=new Set(),textures=new Set();
    group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
    for(const material of materials)for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
    for(const geometry of geometries)geometry.dispose();
    for(const texture of textures)texture.dispose();
    for(const material of materials)material.dispose();
    scene.environment?.dispose?.();scene.environment=null;
  }
  return {group,obstacles:kit.obstacles,solids:kit.solids,sites:kit.sites,explosives:kit.explosives,materials:kit.materials,box:kit.box,map,update,dispose};
}

export function drawMap(canvas, world, player=null, bots=[], bomb=null, preview=false, pickups=[]){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#1c2822';ctx.fillRect(0,0,w,h);
  const scale=preview?2.05:2.45,ox=w/2,oz=h/2;
  const xy=(x,z)=>[ox+x*scale,oz+z*scale];
  ctx.strokeStyle='#c6dcb00a';ctx.lineWidth=.6;for(let x=0;x<w;x+=14){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let z=0;z<h;z+=14){ctx.beginPath();ctx.moveTo(0,z);ctx.lineTo(w,z);ctx.stroke();}
  ctx.fillStyle='#89978040';ctx.strokeStyle='#b4c49f50';for(const o of world.obstacles){if(o.minZ<-31)continue;const [x,y]=xy(o.minX,o.minZ);ctx.fillRect(x,y,(o.maxX-o.minX)*scale,(o.maxZ-o.minZ)*scale);ctx.strokeRect(x,y,(o.maxX-o.minX)*scale,(o.maxZ-o.minZ)*scale);}
  for(const s of world.sites){const[x,y]=xy(s.x,s.z);ctx.fillStyle='#d5ed8b22';ctx.fillRect(x-8,y-8,16,16);ctx.fillStyle='#d5ed8b';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillText(s.label,x,y+4);}
  if(bomb){const[x,y]=xy(bomb.x,bomb.z);ctx.fillStyle='#ff7956';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}
  if(!preview)for(const p of pickups){const[x,y]=xy(p.x,p.z);ctx.fillStyle=`#${p.color.toString(16).padStart(6,'0')}`;ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillRect(-3,-3,6,6);ctx.restore();}
  if(player){for(const b of bots){if(b.health<=0||b.revealed<=0)continue;const[x,y]=xy(b.group.position.x,b.group.position.z);ctx.fillStyle='#f0a475';ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}const[x,y]=xy(player.x,player.z);ctx.save();ctx.translate(x,y);ctx.rotate(-player.yaw);ctx.fillStyle='#e8ffb5';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-4,4);ctx.lineTo(4,4);ctx.closePath();ctx.fill();ctx.restore();}
  else{const[x,y]=xy(world.map.playerSpawn.x,world.map.playerSpawn.z);ctx.fillStyle='#d5ed8b';ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fill();}
}
