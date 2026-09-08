import * as THREE from 'three';
export function createWorld(scene, renderer) {
  const obstacles=[], solids=[];
  let seed=427;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function texture(kind, color) {
    const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,512,512);
    for(let i=0;i<26000;i++){const v=random()>.5?255:20;ctx.fillStyle=`rgba(${v},${v*.95},${v*.8},${random()*.09})`;const s=random()*4+.5;ctx.fillRect(random()*512,random()*512,s,s);}
    if(kind==='wall'){
      for(let row=0;row<8;row++){const y=row*64;ctx.strokeStyle='#75634922';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();for(let col=0;col<5;col++){const x=col*128+(row%2)*64;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+64);ctx.stroke();}}
      for(let i=0;i<30;i++){ctx.fillStyle='#5c503808';ctx.fillRect(random()*512,random()*512,random()*120,random()*30);}
    }
    if(kind==='wood'){for(let i=0;i<8;i++){ctx.fillStyle='#221a1544';ctx.fillRect(0,i*64,512,3);for(let j=0;j<35;j++){ctx.fillStyle='#34221418';ctx.fillRect(random()*512,i*64+random()*60,50+random()*200,1+random()*2);}}}
    if(kind==='ground'){for(let i=0;i<1500;i++){ctx.fillStyle='#82745335';ctx.fillRect(random()*512,random()*512,1+random()*5,random()*2);}}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
  }
  const wallTex=texture('wall','#c2ad88'),lightTex=texture('wall','#d2bea0'),groundTex=texture('ground','#b8a685'),woodTex=texture('wood','#84704a');
  groundTex.repeat.set(24,24);
  const materials={sand:new THREE.MeshStandardMaterial({map:wallTex,roughness:1}),light:new THREE.MeshStandardMaterial({map:lightTex,roughness:1}),ground:new THREE.MeshStandardMaterial({map:groundTex,roughness:1}),wood:new THREE.MeshStandardMaterial({map:woodTex,roughness:.9}),trim:new THREE.MeshStandardMaterial({color:0x9c8867,roughness:.94}),blue:new THREE.MeshStandardMaterial({color:0x536f71,roughness:.85}),dark:new THREE.MeshStandardMaterial({color:0x3e433b,roughness:.8}),metal:new THREE.MeshStandardMaterial({color:0x697369,roughness:.65,metalness:.3}),terracotta:new THREE.MeshStandardMaterial({color:0x93694e,roughness:1})};
  function box(x,y,z,w,h,d,mat=materials.sand,collide=false){const geo=new THREE.BoxGeometry(w,h,d);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++){uv.setXY(i,uv.getX(i)*Math.max(1,w/4),uv.getY(i)*Math.max(1,h/4));}const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);if(collide){obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,height:y+h/2});solids.push(m);}return m;}
  function cylinder(x,y,z,r,h,mat,segments=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
  solids.push(box(0,-.2,0,180,.4,180,materials.ground));
  function textPlane(text,x,y,z,w,h,color='#6c3325',bg=null,rot=0){const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,512,256);}ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 118px Arial';ctx.fillStyle=color;ctx.fillText(text,256,130,485);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,transparent:true,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));m.position.set(x,y,z);m.rotation.y=rot;scene.add(m);return m;}
  function building(x,z,w,d,h,light=false){const mat=light?materials.light:materials.sand;box(x,h/2,z,w,h,d,mat,true);box(x,h+.12,z,w+.5,.24,d+.5,materials.trim);box(x,h+.42,z-d/2,w,.6,.24,mat);box(x,h+.42,z+d/2,w,.6,.24,mat);box(x-w/2,h+.42,z,.24,.6,d,mat);box(x+w/2,h+.42,z,.24,.6,d,mat);
    for(const side of [-1,1]){for(let wx=x-w/2+2;wx<x+w/2-1;wx+=3.5){for(let wy=3;wy<h-1;wy+=3){box(wx,wy,z+side*(d/2+.035),1.05,1.45,.08,materials.dark);box(wx,wy-.79,z+side*(d/2+.12),1.35,.14,.28,materials.trim);for(let n=-1;n<=1;n++)box(wx+n*.29,wy,z+side*(d/2+.1),.035,1.35,.04,materials.metal);}}}
    for(const side of [-1,1]){for(let wz=z-d/2+2;wz<z+d/2-1;wz+=3.6){box(x+side*(w/2+.03),3.1,wz,.08,1.4,1,materials.blue);box(x+side*(w/2+.14),2.32,wz,.3,.16,1.3,materials.trim);}}
    const ac=box(x+w/2+.4,4.7,z+1,.8,.85,1.3,materials.light);for(let n=0;n<5;n++)box(ac.position.x+.42,4.45+n*.12,z+1,.03,.025,1.05,materials.metal);
    if(random()>.4){cylinder(x+1,h+1,z,1,1.7,materials.metal);cylinder(x+1,h+1.9,z,1.06,.15,materials.dark);}
    cylinder(x-2,h+1.8,z-2,.035,3.5,materials.metal);box(x-2,h+3.3,z-2,2.3,.025,.03,materials.metal);
  }
  // Four blocks leave a connected middle, long alleys, and two cross streets.
  building(-13,12,16,14,8.1);building(13,12,16,14,9.3,true);
  building(-13,-10,16,14,10.2,true);building(13,-10,16,14,7.4);
  box(-34,3,0,2,6,62,materials.sand,true);box(34,3,0,2,6,62,materials.sand,true);box(0,3,-30,70,6,2,materials.sand,true);box(0,2.2,30,70,4.4,2,materials.sand,true);
  for(let i=0;i<12;i++){const x=-55+i*10;building(x,-43,8,10,7+random()*9,random()>.5);}
  // The gateway: carved arch segments over a clear central passage.
  box(-4.3,2,-2,1.4,4,1.1,materials.light,true);box(4.3,2,-2,1.4,4,1.1,materials.light,true);
  const arch=new THREE.Mesh(new THREE.TorusGeometry(3.6,.45,6,24,Math.PI),materials.trim);arch.position.set(0,3.7,-2);arch.castShadow=true;scene.add(arch);solids.push(arch);
  solids.push(box(0,7.75,-2,10,1.2,1.1,materials.sand),box(-4.3,5.7,-2,1.4,3.5,1.1,materials.light),box(4.3,5.7,-2,1.4,3.5,1.1,materials.light));
  function crate(x,z,w=2,h=2,d=2){box(x,h/2,z,w,h,d,materials.wood,true);for(const side of [-1,1]){for(const yy of [.12,h-.12])box(x,yy,z+side*(d/2+.03),w+.04,.16,.11,materials.dark);for(const xx of [-w/2+.12,w/2-.12])box(x+xx,h/2,z+side*(d/2+.08),.15,h,.13,materials.trim);box(x+side*(w/2+.04),h/2,z,.1,h+.04,.15,materials.dark);}textPlane('↑ ↑',x,h*.58,z+d/2+.16,w*.65,h*.6,'#272e24');}
  crate(-2,10,2.2,1.8,2.2);crate(7,1,2.3,2.2,2.2);crate(-24,6,2.4,2.2,2.4);crate(26,-8,2.3,1.8,2.2);crate(23,-23,3,2.5,2.6);crate(26.2,-23,2.7,2,2.6);crate(-25,-23,3.2,2.5,3);crate(-28,-23,2.2,1.9,2.6);crate(11,-23,2,1.5,2);
  function barrel(x,z){solids.push(cylinder(x,.65,z,.48,1.3,materials.blue));obstacles.push({minX:x-.48,maxX:x+.48,minZ:z-.48,maxZ:z+.48,height:1.3});for(const y of [.12,.65,1.18])cylinder(x,y,z,.5,.07,materials.dark);}
  barrel(22,15);barrel(22.8,15.4);barrel(-7,-20);barrel(30,-17);
  // Doors, shop fronts, worn signs, cables, lamps, and palms.
  for(const [x,z] of [[-10,19.04],[11,19.04],[-13,-2.96],[13,-2.96]]){box(x,1.45,z,1.8,2.9,.12,materials.blue);for(let n=0;n<8;n++)box(x-.8+n*.23,1.45,z+.08,.03,2.8,.025,materials.dark);box(x,3,z,2.15,.22,.4,materials.trim);}
  textPlane('A →',7.4,2.3,19.09,2.7,1.4,'#923d27');textPlane('← B',-6.8,2.3,19.09,2.7,1.4,'#923d27');
  textPlane('A',23,3.2,-28.95,2.5,2.6,'#9b402b');textPlane('B',-25,3.2,-28.95,2.5,2.6,'#9b402b');textPlane('MARCHÉ',12,4.2,19.16,4.8,1.15,'#e6ddbf','#425f60');textPlane('المدينة',-13,4,-2.88,4.8,1.2,'#dfd0a7','#736344');
  function site(x,z,label){const ring=new THREE.Mesh(new THREE.RingGeometry(2.4,2.5,4),new THREE.MeshStandardMaterial({color:0xaa642c,transparent:true,opacity:.7,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.rotation.z=Math.PI/4;ring.position.set(x,.016,z);scene.add(ring);const t=textPlane(label,x,.025,z,2.5,2.5,'#9e5629');t.rotation.x=-Math.PI/2;return {x,z,label};}
  const sites=[site(24,-19,'A'),site(-24,-19,'B')];
  for(const [x,z] of [[29,19],[-29,-12],[30,-25],[-29,22]]){const trunk=cylinder(x,3.6,z,.21,7.2,materials.terracotta);trunk.rotation.z=.07;for(let n=0;n<8;n++){const a=n*Math.PI/4;const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(x,7,z),new THREE.Vector3(x+Math.cos(a)*2,8.4,z+Math.sin(a)*2),new THREE.Vector3(x+Math.cos(a)*4,6.6,z+Math.sin(a)*4));const leaf=new THREE.Mesh(new THREE.TubeGeometry(curve,6,.17,3,false),new THREE.MeshStandardMaterial({color:n%2?0x69704a:0x777e4c,roughness:1}));leaf.castShadow=true;scene.add(leaf);}}
  for(const z of [15,-12]){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-6,8,z),new THREE.Vector3(0,6,z),new THREE.Vector3(6,9,z));const cable=new THREE.Mesh(new THREE.TubeGeometry(curve,18,.024,4,false),materials.dark);scene.add(cable);}
  for(let i=0;i<85;i++){const x=random()*64-32,z=random()*56-28;if(obstacles.some(o=>x>o.minX-.2&&x<o.maxX+.2&&z>o.minZ-.2&&z<o.maxZ+.2))continue;const stone=box(x,.04,z,.05+random()*.15,.08,.06+random()*.14,materials.trim);stone.rotation.y=random()*6;stone.castShadow=false;}
  const sun=new THREE.DirectionalLight(0xffe4b5,3.2);sun.position.set(-30,48,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-46,right:46,top:46,bottom:-46,near:1,far:130});sun.shadow.bias=-.0005;sun.shadow.normalBias=.025;scene.add(sun);scene.add(new THREE.HemisphereLight(0xc4dae3,0x897758,2.1));
  scene.background=new THREE.Color(0xb7cbd0);scene.fog=new THREE.Fog(0xb7cbd0,45,125);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(170,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color('#769dab')},bottom:{value:new THREE.Color('#e8ddc2')}},vertexShader:'varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',fragmentShader:'uniform vec3 top; uniform vec3 bottom; varying vec3 vPos; void main(){float h=normalize(vPos).y;gl_FragColor=vec4(mix(bottom,top,smoothstep(-0.05,0.8,h)),1.0);}'}));scene.add(sky);
  return {obstacles,solids,sites,materials,box};
}

export function drawMap(canvas, world, player=null, bots=[], bomb=null, preview=false){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#1c2822';ctx.fillRect(0,0,w,h);
  const scale=preview?2.05:2.45,ox=w/2,oz=h/2;
  const xy=(x,z)=>[ox+x*scale,oz+z*scale];
  ctx.strokeStyle='#c6dcb00a';ctx.lineWidth=.6;for(let x=0;x<w;x+=14){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let z=0;z<h;z+=14){ctx.beginPath();ctx.moveTo(0,z);ctx.lineTo(w,z);ctx.stroke();}
  ctx.fillStyle='#89978040';ctx.strokeStyle='#b4c49f50';for(const o of world.obstacles){if(o.minZ<-31)continue;const [x,y]=xy(o.minX,o.minZ);ctx.fillRect(x,y,(o.maxX-o.minX)*scale,(o.maxZ-o.minZ)*scale);ctx.strokeRect(x,y,(o.maxX-o.minX)*scale,(o.maxZ-o.minZ)*scale);}
  for(const s of world.sites){const[x,y]=xy(s.x,s.z);ctx.fillStyle='#d5ed8b22';ctx.fillRect(x-8,y-8,16,16);ctx.fillStyle='#d5ed8b';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillText(s.label,x,y+4);}
  if(bomb){const[x,y]=xy(bomb.x,bomb.z);ctx.fillStyle='#ff7956';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}
  if(player){for(const b of bots){if(b.health<=0||b.revealed<=0)continue;const[x,y]=xy(b.group.position.x,b.group.position.z);ctx.fillStyle='#f0a475';ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}const[x,y]=xy(player.x,player.z);ctx.save();ctx.translate(x,y);ctx.rotate(-player.yaw);ctx.fillStyle='#e8ffb5';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-4,4);ctx.lineTo(4,4);ctx.closePath();ctx.fill();ctx.restore();}
  else{const[x,y]=xy(0,25);ctx.fillStyle='#d5ed8b';ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fill();}
}
