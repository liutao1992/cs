import * as THREE from 'three';
import { createDetailedAK } from './ak47.js';
import { createArms } from './arms.js';
import { createSoldier } from './soldier.js';
import { createImportedWeapon } from './imported-weapons.js';
import { weaponSurface, mapWeaponGeometry } from './weapon-surfaces.js';
import { RoundedBoxGeometry } from '../node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
const mat=(color,metalness=0,roughness=.7)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const metal=weaponSurface('steel',0x303736,.8,.42),edge=weaponSurface('steel',0x555d57,.8,.36),wood=weaponSurface('wood',0x825035,0,.65),black=weaponSurface('steel',0x181e1d,.2,.7),steel=mat(0x68716d,.85,.3),skin=mat(0xb68d67),glove=weaponSurface('fabric',0x3c473a,0,.9),cloth=weaponSurface('fabric',0x62634b,0,1);
function part(group,x,y,z,w,h,d,material){const bevel=Math.min(.007,w/6,h/6,d/6),shape=new THREE.Shape();shape.moveTo(-w/2+bevel,-h/2+bevel);shape.lineTo(w/2-bevel,-h/2+bevel);shape.lineTo(w/2-bevel,h/2-bevel);shape.lineTo(-w/2+bevel,h/2-bevel);shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-2*bevel,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:bevel,bevelThickness:bevel});geometry.translate(0,0,-d/2+bevel);mapWeaponGeometry(geometry);const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);group.add(m);return m;}
function rounded(group,x,y,z,w,h,d,radius,material){const geometry=new RoundedBoxGeometry(w,h,d,3,radius);mapWeaponGeometry(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);return mesh;}
function tube(group,x,y,z,r,len,material,segments=24){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,segments),material);m.rotation.x=Math.PI/2;m.position.set(x,y,z);group.add(m);return m;}
function profile(group,points,width,material){
  const shape=new THREE.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:width-.008,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:.004,bevelThickness:.004});
  geometry.translate(0,0,-(width-.008)/2);geometry.rotateY(-Math.PI/2);mapWeaponGeometry(geometry);
  const mesh=new THREE.Mesh(geometry,material);group.add(mesh);return mesh;
}
function organic(group,position,scale,material){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),material);mesh.position.set(...position);mesh.scale.set(...scale);group.add(mesh);return mesh;
}
function sleeve(group,start,end,radius){
  const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),direction=b.clone().sub(a);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius*.78,radius,direction.length(),20,8),cloth);
  const p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),angle=Math.atan2(p.getZ(i),p.getX(i));const fold=1+.045*Math.sin(y*105+angle*3)+.025*Math.cos(y*61-angle*5);p.setX(i,p.getX(i)*fold);p.setZ(i,p.getZ(i)*fold);}
  mesh.geometry.computeVertexNormals();mesh.position.copy(a.add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());group.add(mesh);
}
function hand(group,x,y,z,support=false){
  organic(group,[x,y,z],[.055,.043,.076],glove);
  organic(group,[x+.014,y+.031,z+.01],[.043,.013,.047],black);
  for(let i=0;i<4;i++){
    const finger=organic(group,[x-.033+i*.021,y-.02,z-.054],[.012,.021,.034],glove);finger.rotation.x=support?.75:.25;
    organic(group,[x-.033+i*.021,y+.007,z-.046],[.01,.01,.017],edge);
  }
  const thumb=organic(group,[x+.047,y-.003,z+.005],[.018,.022,.045],glove);thumb.rotation.y=-.6;
}
function rifleHands(group,type){
  // Contact points are in the imported weapon's coordinates, not the old blockout.
  const grip=type===0?[.035,-.105,.095]:type===2?[.035,-.10,.20]:[.035,-.12,.10];
  const support=type===0?[-.025,.003,-.46]:type===2?[-.025,-.075,-.48]:[-.025,-.065,-.40];
  const [x,y,z]=grip,[sx,sy,sz]=support;
  organic(group,[x,y,z],[.028,.052,.041],glove);
  // Curled fingers wrap around the front of the pistol grip.
  for(let i=0;i<3;i++)organic(group,[.006,y+.024-i*.025,z-.031],[.034,.011,.015],glove);
  organic(group,[x+.008,y+.054,z-.055],[.011,.012,.047],glove);
  organic(group,[-.016,y+.031,z+.008],[.014,.034,.023],glove);
  organic(group,[sx,sy-.018,sz],[.042,.025,.061],glove);
  for(let i=0;i<4;i++){
    organic(group,[.026,sy+.003,sz-.043+i*.027],[.012,.032,.011],glove);
    organic(group,[.014,sy+.028,sz-.043+i*.027],[.019,.012,.011],glove);
  }
  organic(group,[-.044,sy+.018,sz+.025],[.014,.034,.023],glove);
  sleeve(group,[x+.015,y-.043,z+.025],[.24,-.39,.56],.064);
  sleeve(group,[sx-.012,sy-.035,sz+.043],[-.27,-.38,.24],.066);
  organic(group,[x+.014,y-.045,z+.03],[.036,.028,.033],black);
  organic(group,[sx-.012,sy-.034,sz+.044],[.04,.029,.035],black);
}
function addRail(group,z,length,material=black){
  part(group,0,.112,z,.052,.018,length,material);
  for(let i=0;i<Math.floor(length/.052);i++)part(group,0,.128,z-length/2+.03+i*.052,.075,.018,.011,material);
}
function addSlingLoop(group,x,y,z){
  const loop=new THREE.Mesh(new THREE.TorusGeometry(.025,.004,6,16,Math.PI*1.6),steel);loop.rotation.y=Math.PI/2;loop.rotation.z=Math.PI/2;loop.position.set(x,y,z);group.add(loop);
}
function addSight(group,z,front=false){
  // Keep both irons attached to the weapon, with an open sight picture.
  part(group,0,.091,z,.052,.025,.045,black);
  if(front){
    part(group,0,.119,z,.008,.035,.012,metal);
    for(const side of [-1,1])part(group,side*.024,.121,z,.009,.041,.022,black);
  }else{
    for(const side of [-1,1])part(group,side*.018,.111,z,.021,.022,.022,black);
  }
}
function addTrigger(group,z,large=false){
  const guard=new THREE.Mesh(new THREE.TorusGeometry(large?.058:.05,.005,8,24,Math.PI*1.55),metal);guard.rotation.y=Math.PI/2;guard.rotation.z=.7;guard.position.set(0,-.118,z);group.add(guard);
  part(group,0,-.12,z-.015,.01,large?.055:.045,.014,black).rotation.x=.4;
}
function addMagazineRibs(group,points,side=.037){for(const x of [-side,side])for(let i=0;i<points;i++)part(group,x,-.03,-.25-i*.038,.004,.018,.022,edge);}
function buildAK(g){
  // AK-47 silhouette: stamped receiver, wood furniture, curved magazine and hooded irons.
  rounded(g,0,-.012,0,.09,.115,.42,.008,metal);
  // Arched dust cover and a tapered stock instead of stacked rectangular blocks.
  tube(g,0,.035,-.025,.043,.37,metal);
  profile(g,[[.19,.035],[.27,.025],[.55,-.025],[.56,-.16],[.43,-.145],[.28,-.07],[.19,-.065]],.082,wood);
  rounded(g,0,-.09,.554,.087,.145,.023,.008,black);
  rounded(g,0,-.03,-.32,.098,.09,.27,.021,wood);
  rounded(g,0,.047,-.40,.078,.045,.19,.016,wood);
  for(const z of [-.205,-.455])rounded(g,0,-.015,z,.103,.103,.02,.01,metal);
  tube(g,0,.059,-.50,.018,.22,metal);tube(g,0,.014,-.65,.016,.37,metal);tube(g,0,.014,-.86,.022,.075,black);
  part(g,0,.062,-.72,.03,.055,.04,black);addSight(g,-.08);addSight(g,-.72,true);
  part(g,0,.074,-.025,.024,.008,.14,edge);
  rounded(g,0,.074,.135,.022,.014,.026,.004,black);rounded(g,0,-.176,.13,.068,.20,.085,.015,wood).rotation.x=-.24;
  for(const side of [-1,1]){
    rounded(g,side*.046,.005,-.08,.004,.035,.12,.002,black);
    for(const z of [-.165,.1,.155])organic(g,[side*.047,-.03,z],[.0025,.004,.004],steel);
    for(let i=0;i<3;i++)rounded(g,side*.046,.035,-.28-i*.042,.004,.014,.026,.002,black);
  }
  const magazine=[[-.145,-.07],[-.02,-.07],[-.012,-.17],[.012,-.26],[.055,-.35],[-.044,-.395],[-.096,-.30],[-.13,-.19]];profile(g,magazine,.071,black);addMagazineRibs(g,4);
  for(const side of [-1,1])for(let rib=0;rib<3;rib++){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(side*.037,-.12,-.12+rib*.035),new THREE.Vector3(side*.037,-.25,-.105+rib*.035),new THREE.Vector3(side*.037,-.35,-.024+rib*.035));g.add(new THREE.Mesh(new THREE.TubeGeometry(curve,12,.0035,5,false),metal));}
  for(const side of [-1,1]){for(const z of [-.16,-.1,.1,.15])organic(g,[side*.059,-.027,z],[.003,.006,.006],edge);part(g,side*.062,.004,.055,.005,.009,.13,black).rotation.x=.13;}
  part(g,.079,.026,-.045,.055,.015,.027,black);part(g,.067,.025,.02,.015,.06,.045,metal).rotation.z=.25;addTrigger(g,.046,true);addSlingLoop(g,-.06,-.06,.41);addSlingLoop(g,.06,-.01,-.38);
}
function buildUSP(g){
  // USP-S: squared slide, frame, long suppressor and recognizable trigger guard.
  part(g,0,.02,-.03,.105,.105,.32,metal);part(g,0,.075,-.08,.095,.035,.25,edge);for(let i=0;i<7;i++)part(g,.053,.046,-.19+i*.035,.012,.045,.009,black);
  part(g,0,-.115,.06,.09,.21,.105,black).rotation.x=-.14;tube(g,0,.01,-.38,.043,.35,black,14);part(g,0,.012,-.57,.073,.085,.04,black);part(g,0,.073,-.2,.016,.033,.026,edge);part(g,0,.08,.055,.078,.024,.025,edge);
  part(g,0,-.064,.11,.012,.062,.012,metal).rotation.x=-.25;addTrigger(g,.045,true);addSight(g,.07);addSight(g,-.2,true);
  const magazine=[[-.125,-.06],[-.008,-.06],[.008,-.24],[-.04,-.275],[-.1,-.23]];profile(g,magazine,.065,black);for(let i=0;i<5;i++)part(g,.054,-.01,-.12-i*.03,.004,.012,.022,edge);addSlingLoop(g,-.058,-.05,.11);
}
function buildAWP(g){
  // AWP: long bull-barrel, wooden thumbhole stock, scope rings and bipod.
  const stock=weaponSurface('fabric',0x526044,0,.83);
  rounded(g,0,-.035,.12,.12,.15,.5,.025,stock);rounded(g,0,-.09,.38,.105,.18,.28,.022,stock).rotation.x=-.12;rounded(g,0,-.12,.58,.115,.15,.08,.014,black);
  part(g,0,.015,-.16,.14,.14,.3,metal);part(g,0,.09,-.06,.11,.035,.25,edge);tube(g,0,.045,-.6,.031,.78,black,16);tube(g,0,.045,-1.04,.041,.105,metal,16);part(g,0,.09,-.67,.03,.055,.25,black);
  for(const z of [-.38,-.64]){part(g,0,.117,z,.055,.06,.038,black);tube(g,0,.18,z,.042,.035,edge);}
  tube(g,0,.18,-.55,.034,.42,black);tube(g,0,.18,-.32,.048,.09,black);tube(g,0,.18,-.80,.059,.14,black);
  const lens=mat(0x244c56,.65,.12);tube(g,0,.18,-.272,.041,.004,lens);tube(g,0,.18,-.872,.052,.004,lens);
  const dial=tube(g,0,.227,-.51,.024,.027,black);dial.rotation.x=0;
  part(g,0,-.16,-.05,.09,.22,.16,black).rotation.x=-.2;part(g,.13,.018,.02,.16,.025,.025,edge);tube(g,.2,.018,.02,.025,.045,black);part(g,0,-.165,.34,.075,.18,.09,wood).rotation.x=-.3;addTrigger(g,.09,true);addSight(g,-.98,true);addSlingLoop(g,-.07,-.05,.5);addSlingLoop(g,.07,.02,-.55);
  part(g,-.055,-.36,-.35,.018,.28,.018,black).rotation.z=-.18;part(g,.055,-.36,-.35,.018,.28,.018,black).rotation.z=.18;
  const magazine=[[-.12,-.05],[-.015,-.05],[.002,-.2],[-.045,-.24],[-.095,-.2]];profile(g,magazine,.062,black);
}
function buildM4(g){
  // M4A1-S: AR receiver, quad rail, adjustable stock and suppressor.
  part(g,0,0,0,.11,.14,.42,metal);part(g,0,.07,-.03,.088,.032,.37,edge);part(g,0,.02,.34,.095,.13,.18,black);tube(g,0,.02,.48,.037,.26,black,12);part(g,0,-.01,.67,.1,.14,.09,black);
  part(g,0,.02,-.35,.1,.13,.24,black);addRail(g,-.37,.45,black);for(const y of [.015,-.015])for(let i=0;i<5;i++)part(g,y,.02,-.38+i*.08,.006,.075,.012,edge);
  tube(g,0,.025,-.62,.03,.29,black,14);tube(g,0,.025,-.86,.042,.25,black,16);part(g,0,.1,-.62,.02,.05,.03,black);part(g,0,.13,-.62,.05,.016,.03,edge);addSight(g,-.62,true);
  const magazine=[[-.13,-.06],[-.015,-.06],[.004,-.24],[-.035,-.25],[-.085,-.22]];profile(g,magazine,.066,black);addMagazineRibs(g,4,.033);for(const side of [-1,1])for(let i=0;i<4;i++)part(g,side*.056,-.005,-.47+i*.04,.004,.012,.026,black);
  part(g,0,-.17,.13,.07,.2,.085,black).rotation.x=-.22;part(g,.06,.02,-.05,.02,.02,.11,edge);part(g,0,.105,.065,.075,.042,.05,black);addTrigger(g,.05,true);
  part(g,0,.12,.56,.12,.035,.12,black);part(g,0,.12,.68,.12,.035,.06,black);addSlingLoop(g,-.055,-.05,.48);addSlingLoop(g,.055,.02,-.36);
}
export function createWeapon(type=0,held=true){
  const g=new THREE.Group();if(type===0)g.add(createDetailedAK());else g.add(createImportedWeapon(type));
  if(type===1||type===3){const z=type===1?-.435:-.98;const radius=type===1?.027:.033;tube(g,0,.03,z,radius,type===1?.30:.20,black);tube(g,0,.03,z-(type===1?.151:.101),radius*.76,.003,mat(0x080a0a));}
  if(held){const arms=createArms(type);g.add(arms);g.userData.updateArms=progress=>arms.userData.update?.(progress);}
  g.userData.muzzle=new THREE.Vector3(0,.03,[-.94,-.585,-1.12,-1.08,-.28][type]);return g;
}

function webMaterial(isCT,elite){return mat(elite?0x4f2620:(isCT?0x334148:0x4a4b3d),0,.96);}
function addPatch(group,x,y,z,w,h,material){return part(group,x,y,z,w,h,.018,material);}
function createFactionGear(g,faction,accent,skinTone){
  const isCT=faction==='CT',helmet=mat(isCT?0x1c2528:0x716b57,.15,.82),visor=mat(0x0b1112,.35,.28),lens=mat(isCT?0x4d7c8a:0x252b29,.55,.23),web=webMaterial(isCT,false),face=mat(skinTone,0,.84);
  const head=new THREE.Mesh(new THREE.DodecahedronGeometry(.18,1),face);head.scale.set(1,.98,.92);head.position.set(0,1.66,0);g.add(head);
  capsule(g,[0,1.49,0],[0,1.56,0],.085,web,8);
  if(isCT){
    organic(g,[0,1.77,.005],[.22,.14,.21],helmet);addPatch(g,0,1.71,-.176,.25,.05,visor);
    for(const side of [-1,1]){part(g,side*.198,1.69,0,.035,.12,.17,helmet);organic(g,[side*.064,1.715,-.187],[.043,.026,.012],lens);}
    part(g,0,1.57,-.145,.27,.12,.08,web);part(g,0,1.525,-.16,.2,.06,.06,visor);
    part(g,-.22,1.78,.01,.05,.12,.11,helmet);part(g,.22,1.78,.01,.05,.12,.11,helmet);
  }else{
    organic(g,[0,1.77,0],[.22,.12,.2],accent);addPatch(g,0,1.73,-.178,.31,.035,accent);
    addPatch(g,0,1.64,-.17,.28,.13,face);addPatch(g,0,1.69,-.181,.24,.04,visor);
    for(const side of [-1,1])organic(g,[side*.062,1.69,-.193],[.035,.022,.012],lens);
    organic(g,[0,1.64,-.19],[.018,.028,.018],face);part(g,0,1.605,-.185,.075,.012,.01,visor);part(g,0,1.565,-.178,.3,.075,.06,web);part(g,0,1.525,-.16,.22,.06,.06,accent);
    part(g,-.21,1.75,.01,.045,.14,.1,accent);part(g,.21,1.75,.01,.045,.14,.1,accent);
  }
  return head;
}
function capsule(group,start,end,radius,material,segments=10){
  const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),direction=b.clone().sub(a),length=direction.length();
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius*.86,radius,length,segments,1),material);mesh.position.copy(a.add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());group.add(mesh);
  organic(group,start,[radius,radius,radius],material);organic(group,end,[radius*.94,radius*.94,radius*.94],material);return mesh;
}
export function createBot(scene,index,elite=false,faction='T'){
  const isCT=faction==='CT',g=new THREE.Group();
  const uniform=mat(elite?0x743329:(isCT?(index%2?0x33434a:0x28383f):(index%2?0x8b775d:0x77745d)),0,.93),pants=mat(isCT?0x202b30:0x555648,0,.96),vest=mat(elite?0x45211d:(isCT?0x182327:0x3d4134),.1,.9),accent=mat(elite?0x8c3d2c:(isCT?0x587482:0x9a8768),.05,.9),boots=mat(0x252d2c,.15,.85);
  const hitboxes=[];if(elite)g.scale.setScalar(1.3);
  const body=rounded(g,0,1.12,0,.46,.58,.29,.055,uniform);hitboxes.push(body);const hips=rounded(g,0,.76,0,.36,.24,.27,.045,pants);hitboxes.push(hips);rounded(g,0,1.13,-.17,.4,.44,.1,.025,vest);rounded(g,0,1.32,-.228,.24,.13,.018,.008,accent);
  part(g,0,.88,-.158,.39,.055,.1,webMaterial(isCT,elite));
  for(let i=0;i<3;i++)part(g,-.135+i*.135,1.06,-.238,.1,.15,.06,webMaterial(isCT,elite));
  if(isCT){rounded(g,-.23,.91,-.04,.13,.18,.18,.025,vest);rounded(g,.23,.91,-.04,.13,.18,.18,.025,vest);rounded(g,0,1.28,.18,.12,.24,.16,.02,webMaterial(true,elite));}
  else{rounded(g,-.23,.91,-.03,.15,.17,.16,.025,accent);rounded(g,.23,.91,-.03,.15,.17,.16,.025,accent);rounded(g,0,.87,-.24,.28,.045,.018,.008,accent);}
  const head=createFactionGear(g,faction,accent,isCT?0x946f54:0xb68d67);hitboxes.push(head);head.userData.head=true;
  const limbs=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.125,.84,0);g.add(leg);const thigh=capsule(leg,[0,.03,0],[0,-.27,-.015],.105,pants,10),shin=capsule(leg,[0,-.25,-.015],[0,-.62,-.035],.09,pants,10);hitboxes.push(thigh,shin);organic(leg,[0,-.36,-.09],[.105,.075,.035],isCT?webMaterial(true,elite):accent);rounded(leg,0,-.72,-.1,.2,.18,.34,.03,boots);rounded(leg,0,-.73,-.27,.19,.12,.12,.025,black);part(leg,0,-.72,-.29,.12,.018,.02,edge);limbs.push(leg);
    const arm=new THREE.Group();arm.position.set(side*.27,1.33,-.02);g.add(arm);const upper=capsule(arm,[0,0,0],[0,-.24,-.13],.085,uniform,10),fore=capsule(arm,[0,-.23,-.13],[0,-.29,-.32],.072,webMaterial(isCT,elite),10);hitboxes.push(upper,fore);organic(arm,[0,-.32,-.36],[.07,.06,.08],glove);
  }
  const gun=createWeapon(0,false);gun.scale.setScalar(.62);gun.position.set(.14,1.09,-.36);gun.rotation.z=-.035;g.add(gun);
  if(isCT){rounded(g,.22,1.02,.1,.13,.23,.15,.025,vest);rounded(g,-.2,1.02,.08,.13,.23,.15,.025,vest);}else{rounded(g,.2,1.03,.08,.15,.19,.16,.025,accent);rounded(g,-.2,1.03,.08,.15,.19,.16,.025,accent);}
  const soldier=createSoldier(faction,elite);
  if(soldier){
    // Retain the existing raycast proxies so character art does not change damage rules.
    for(const child of g.children)if(child!==gun)child.visible=false;
    g.add(soldier.root);
    gun.position.set(.1,1.3,-.28);
  }
  g.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});scene.add(g);return{group:g,hitboxes:[...new Set(hitboxes)],head,limbs,gun,faction,animate:soldier?.update};
}

export class AudioEngine{
  constructor(){this.context=null;this.volume=.5;}
  unlock(){if(!this.context){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)this.context=new Audio();}this.context?.resume().catch(()=>{});}
  noise(duration,frequency,gain=.5){const c=this.context;if(!c||!this.volume)return;const size=Math.floor(c.sampleRate*duration),buffer=c.createBuffer(1,size,c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<size;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/size,2);const src=c.createBufferSource();src.buffer=buffer;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=frequency;const amp=c.createGain();amp.gain.value=gain*this.volume;src.connect(filter);filter.connect(amp);amp.connect(c.destination);src.start();src.onended=()=>{src.disconnect();filter.disconnect();amp.disconnect();};}
  tone(freq,duration,gain=.2,type='sine'){const c=this.context;if(!c||!this.volume)return;const osc=c.createOscillator(),amp=c.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,c.currentTime);amp.gain.setValueAtTime(gain*this.volume,c.currentTime);amp.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);osc.connect(amp);amp.connect(c.destination);osc.start();osc.stop(c.currentTime+duration);osc.onended=()=>{osc.disconnect();amp.disconnect();};}
  shot(type=0,distant=false){const sup=type===3;this.noise(sup?.09:type===2?.4:.16,sup?1500:type===1?1600:4800,distant?.1:sup?.3:type===2?1:.6);this.tone(type===2?65:sup?120:95,.14,distant?.06:.28,'triangle');}
  step(){this.noise(.055,650,.12);}
  reload(){this.noise(.11,2800,.27);this.tone(650,.04,.05,'square');}
  hit(){this.tone(1400,.065,.13,'triangle');}
  sweep(f1,f2,duration,gain=.2,type='sine'){const c=this.context;if(!c||!this.volume)return;const osc=c.createOscillator(),amp=c.createGain();osc.type=type;osc.frequency.setValueAtTime(f1,c.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(1,f2),c.currentTime+duration);amp.gain.setValueAtTime(gain*this.volume,c.currentTime);amp.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);osc.connect(amp);amp.connect(c.destination);osc.start();osc.stop(c.currentTime+duration);osc.onended=()=>{osc.disconnect();amp.disconnect();};}
  streak(level=1){const notes=[523,659,784,988,1175];for(let i=0;i<=Math.min(level,4);i++)setTimeout(()=>this.tone(notes[i],.12,.16,'triangle'),i*70);}
  headshot(){this.hit();this.tone(2200,.05,.1,'sine');}
  killConfirm(){this.tone(880,.05,.1,'triangle');setTimeout(()=>this.tone(1320,.06,.1,'triangle'),55);}
  perk(){this.tone(660,.07,.12,'square');setTimeout(()=>this.tone(880,.09,.12,'square'),75);}
  buy(){this.tone(520,.06,.13,'square');setTimeout(()=>this.tone(780,.09,.13,'square'),65);}
  deny(){this.tone(180,.13,.15,'sawtooth');}
  airdrop(){this.sweep(300,1400,.6,.15);}
  achievement(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>this.tone(f,.14,.14,'triangle'),i*110));}
  waveStart(){this.tone(110,.4,.2,'sawtooth');}
  bossRoar(){this.noise(.6,220,.5);this.tone(55,.5,.4,'sawtooth');}
  slowmo(){this.sweep(400,80,.5,.2);}
}
