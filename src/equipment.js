import * as THREE from 'three';
const mat=(color,metalness=0,roughness=.7)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const metal=mat(0x303736,.8,.34),edge=mat(0x555d57,.8,.3),wood=mat(0x825035,0,.8),black=mat(0x181e1d,.2,.7),skin=mat(0xb68d67),glove=mat(0x3c473a),cloth=mat(0x62634b);
function part(group,x,y,z,w,h,d,material){const bevel=Math.min(.007,w/6,h/6,d/6),shape=new THREE.Shape();shape.moveTo(-w/2+bevel,-h/2+bevel);shape.lineTo(w/2-bevel,-h/2+bevel);shape.lineTo(w/2-bevel,h/2-bevel);shape.lineTo(-w/2+bevel,h/2-bevel);shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-2*bevel,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:bevel,bevelThickness:bevel});geometry.translate(0,0,-d/2+bevel);const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);group.add(m);return m;}
function tube(group,x,y,z,r,len,material){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,12),material);m.rotation.x=Math.PI/2;m.position.set(x,y,z);group.add(m);return m;}
export function createWeapon(type=0,held=true){const g=new THREE.Group();
  if(type===0){
    part(g,0,0,0,.115,.15,.42,metal);part(g,0,.07,.03,.09,.035,.38,edge);part(g,0,-.03,.33,.105,.18,.3,wood).rotation.x=-.08;
    part(g,0,-.03,-.33,.12,.11,.25,wood);tube(g,0,.03,-.58,.022,.38,metal);tube(g,0,.073,-.38,.02,.28,edge);tube(g,0,.03,-.8,.032,.075,black);
    part(g,0,.1,-.68,.024,.14,.035,black);part(g,0,.171,-.68,.07,.026,.035,edge);part(g,0,.104,.065,.077,.043,.05,black);
    const mag=part(g,0,-.2,-.08,.073,.28,.12,black);mag.rotation.x=-.21;part(g,0,-.34,-.045,.076,.055,.13,edge).rotation.x=-.35;
    part(g,0,-.18,.13,.075,.21,.09,wood).rotation.x=-.24;part(g,.064,.025,-.04,.028,.025,.1,edge);
    for(let i=0;i<5;i++)part(g,0,-.12-i*.039,-.142+i*.008,.077,.013,.011,edge);
  }else if(type===1){part(g,0,0,-.07,.105,.115,.3,metal);part(g,0,-.13,.03,.088,.2,.095,black).rotation.x=-.14;tube(g,0,.011,-.36,.042,.32,black);part(g,0,.073,-.18,.016,.033,.026,edge);part(g,0,.073,.05,.075,.025,.025,edge);for(let i=0;i<6;i++)part(g,.055,.015,i*.012,.012,.06,.005,edge);
  }else{part(g,0,-.035,.06,.14,.18,.55,glove);part(g,0,-.045,.4,.12,.2,.26,glove);tube(g,0,.04,-.55,.031,.8,black);part(g,0,-.16,-.06,.09,.22,.15,black);tube(g,0,.165,-.09,.051,.35,black);tube(g,0,.165,-.31,.065,.11,metal);tube(g,0,.165,.12,.068,.09,metal);part(g,0,.09,-.03,.065,.09,.12,edge);part(g,.12,.018,.02,.16,.025,.025,edge);tube(g,.19,.018,.02,.025,.045,black);part(g,0,-.16,.2,.075,.2,.09,glove).rotation.x=-.25;}
  if(held){part(g,.026,-.185,.13,.13,.15,.13,glove).rotation.x=-.18;const arm=part(g,.15,-.31,.37,.17,.2,.48,cloth);arm.rotation.y=-.34;arm.rotation.x=-.3;part(g,-.04,-.14,type===1?-.06:-.31,.14,.1,.17,glove);const left=part(g,-.19,-.29,type===1?.05:-.17,.16,.18,.45,cloth);left.rotation.y=.6;left.rotation.x=.4;part(g,.075,-.195,.2,.11,.12,.1,skin);}
  g.userData.muzzle=new THREE.Vector3(0,.03,type===0?-.84:type===1?-.52:-.97);return g;
}
export function createBot(scene,index){const g=new THREE.Group(),shirt=mat(index%2?0x8b775d:0x77745d),pants=mat(0x555648),vest=mat(0x3d4134),scarf=mat(0xa8997b),boots=mat(0x30362e);const hitboxes=[];
  const body=part(g,0,1.13,0,.48,.62,.3,shirt);hitboxes.push(body);part(g,0,1.15,-.18,.43,.45,.12,vest);
  for(let i=0;i<3;i++)part(g,-.14+i*.14,1.06,-.255,.11,.17,.065,glove);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.185,12,10),skin);head.scale.set(1,1.15,.92);head.position.set(0,1.66,0);g.add(head);hitboxes.push(head);head.userData.head=true;
  const mask=part(g,0,1.6,-.145,.29,.16,.1,scarf);part(g,0,1.77,0,.34,.12,.31,scarf);part(g,0,1.69,-.171,.255,.047,.014,black);
  const limbs=[];for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.13,.82,0);g.add(leg);part(leg,0,-.33,0,.205,.65,.23,pants);part(leg,0,-.73,-.065,.21,.18,.34,boots);limbs.push(leg);const arm=part(g,side*.31,1.18,-.12,.17,.44,.19,shirt);arm.rotation.x=-.65;part(g,side*.3,1,-.31,.14,.14,.15,glove);}
  const gun=createWeapon(0,false);gun.scale.setScalar(.68);gun.position.set(.14,1.12,-.35);g.add(gun);g.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;if(m!==head)hitboxes.push(m);}});scene.add(g);return{group:g,hitboxes:[...new Set(hitboxes)],head,limbs,gun};
}
export class AudioEngine{
  constructor(){this.context=null;this.volume=.5;}
  unlock(){if(!this.context){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)this.context=new Audio();}this.context?.resume().catch(()=>{});}
  noise(duration,frequency,gain=.5){const c=this.context;if(!c||!this.volume)return;const size=Math.floor(c.sampleRate*duration),buffer=c.createBuffer(1,size,c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<size;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/size,2);const src=c.createBufferSource();src.buffer=buffer;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=frequency;const amp=c.createGain();amp.gain.value=gain*this.volume;src.connect(filter);filter.connect(amp);amp.connect(c.destination);src.start();src.onended=()=>{src.disconnect();filter.disconnect();amp.disconnect();};}
  tone(freq,duration,gain=.2,type='sine'){const c=this.context;if(!c||!this.volume)return;const osc=c.createOscillator(),amp=c.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,c.currentTime);amp.gain.setValueAtTime(gain*this.volume,c.currentTime);amp.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);osc.connect(amp);amp.connect(c.destination);osc.start();osc.stop(c.currentTime+duration);osc.onended=()=>{osc.disconnect();amp.disconnect();};}
  shot(type=0,distant=false){this.noise(type===2?.4:.16,type===1?1600:4800,distant?.14:type===2?1:.6);this.tone(type===2?65:95,.14,distant?.06:.28,'triangle');}
  step(){this.noise(.055,650,.12);}
  reload(){this.noise(.11,2800,.27);this.tone(650,.04,.05,'square');}
  hit(){this.tone(1400,.065,.13,'triangle');}
}
