// Mirage-style layout: mid control with a sniper window, two indoor side
// lanes, and connector rooms that give each bombsite a second entrance.
// Holding mid therefore opens a second way into A or B — the core of this
// topology, and the layer the dust2 tribute does not have.
function buildMirage(k){
  const S=k.materials.sand,W=(x,z,w,d)=>k.box(x,2,z,w,4,d,S,true);
  const roof=(x,z,w,d)=>{const m=k.box(x,3.65,z,w,.28,d,k.materials.dark);k.solids.push(m);};
  // Outer shell.
  k.box(-34,3,0,2,6,62,S,true);k.box(34,3,0,2,6,62,S,true);k.box(0,3,-30,70,6,2,S,true);k.box(0,2.2,30,70,4.4,2,S,true);
  // T spawn row (z=14): three exits — A palace (west), mid (center), B apartments (east).
  W(-31,14,6,1);W(-27,14,2,1);W(-17,14,2,1);W(-10.5,14,11,1);W(10.5,14,11,1);W(17,14,2,1);W(27,14,2,1);W(31,14,6,1);
  k.textPlane('← A 宫殿',-22,2.3,14.78,3.4,1.3,'#923d27');k.textPlane('B 公寓 →',22,2.3,14.78,3.4,1.3,'#923d27');
  // A palace (x -28..-16, z -2..14): indoor lane, south door x -26..-18,
  // north door onto the A site. The roof blocks sightlines, not movement.
  W(-28,6,1,16);W(-16,6,1,16);W(-27,-2,2,1);W(-17,-2,2,1);
  roof(-22,6,12,16);
  k.textPlane('宫 殿',-22,3.15,14.78,3.2,1,'#eadfbc','#3d4645');
  // B apartments (x 16..28, z -2..14): mirror lane onto the B site.
  W(16,6,1,16);W(28,6,1,16);W(17,-2,2,1);W(27,-2,2,1);
  roof(22,6,12,16);
  k.textPlane('公 寓',22,3.15,14.78,3.2,1,'#eadfbc','#3d4645');
  // Connector room (x -16..-5, z -10..-2): only a mid west mouth and an A
  // mouth, so taking mid opens a second A entrance.
  W(-10.5,-10,11,1);W(-10.5,-2,11,1);
  W(-5,-3,1,2);W(-5,-9,1,2);W(-5,-11,1,2);
  roof(-10.5,-6,11,8);
  k.barrel(-8,-4.5);
  // Market room (x 5..16, z -10..-2): mirror connector, second B entrance.
  W(10.5,-10,11,1);W(10.5,-2,11,1);
  W(16,-9,1,2);W(16,-3,1,2);
  roof(10.5,-6,11,8);
  k.barrel(8,-8);
  k.textPlane('市 集',10.5,3.12,-2.44,3,1,'#eadfbc','#3d4645');
  // Mid corridor (x -5..5, z -12..20) with side walls opening into the
  // connector / market mouths at z -8..-4.
  W(-5,6,1,16);W(5,6,1,16);
  // CT south wall (z=-12): the mid window sits beside the CT mid door.
  // The window is a 1.1 m sill: it blocks movement (2D obstacle) but not
  // standing fire, so both sides can fight over it — the signature duel.
  W(-7.5,-12,5,1);W(-3.1,-12,3.8,1);W(1.7,-12,1,1);W(7.5,-12,5,1);
  k.box(0,.55,-12,2.4,1.1,.9,S,true);
  // CT spawn (x -10..10, z -28..-12): side walls open into A/B retake lanes.
  W(-10,-26,1,4);W(-10,-15,1,6);W(10,-26,1,4);W(10,-15,1,6);W(0,-28,20,1);
  // A site east wall (x=-16): CT retake opening (z -24..-18) and the
  // connector west mouth (z -8..-4).
  W(-16,-26,1,4);W(-16,-14,1,8);W(-16,-9,1,2);W(-16,-3,1,2);
  // B site west wall (x=5 north of mid, x=16 south of mid) seals CT from B.
  W(5,-20,1,16);W(16,-19,1,18);
  // B site south wall west of the apartments.
  W(31,-2,6,1);
  // Mid cover: an X box and window-side crates.
  k.crate(0,9,2.4,2,2.4);k.crate(-3.5,2,2,1.7,2);k.crate(3,16,2,1.7,2);
  k.barrel(-4,16);k.barrel(4.6,16.5);
  // Interior cover inside the two side lanes.
  k.crate(-25,4,1.8,1.7,1.8);k.crate(18.5,4,1.8,1.7,1.8);
  // A site crates.
  k.crate(-22,-22,3,2.4,3);k.crate(-27,-24,2.6,2.2,2.6);k.crate(-18,-24,2.2,1.9,2.2);k.barrel(-14,-18);
  // B site crates.
  k.crate(22,-22,3,2.4,3);k.crate(27,-24,2.6,2.2,2.6);k.crate(18,-24,2.2,1.9,2.2);k.barrel(30,-18);
  // T spawn cover.
  k.crate(0,22,2.2,1.8,2.2);k.crate(-8,24,2.2,1.8,2.2);k.crate(8,24,2.2,1.8,2.2);
  k.site(-22,-20,'A');k.site(22,-20,'B');
  k.textPlane('A',-22,3.2,-28.95,2.5,2.6,'#9b402b');k.textPlane('B',22,3.2,-28.95,2.5,2.6,'#9b402b');
  for(let i=0;i<8;i++){const x=-55+i*14;k.building(x,-43,8,10,7+k.random()*9,k.random()>.5);}
  for(const [x,z] of [[-30,26],[30,26],[-32,4],[32,4]])k.palm(x,z);
  k.cable(20);k.cable(-16);
  k.scatter(60,-32,32,-28,28);
}

export const mirageMap={
  id:'mirage',name:'迷城 · 蜃楼',subtitle:'MIRAGE / 致敬经典 de_mirage 布局',size:'68 × 60 M',
  playerSpawn:{x:0,z:25,yaw:0},ctPlayerSpawn:{x:0,z:-22,yaw:Math.PI},
  botSpawns:[[0,-22],[-4,-24],[4,-24],[-26,-19],[26,-19],[-28,-14],[28,-14]],
  tBotSpawns:[[-2,24],[2,24],[-4,26],[4,26],[-22,24],[22,24]],
  waypoints:[{x:0,z:24},{x:-22,z:20},{x:-22,z:8},{x:22,z:20},{x:22,z:8},{x:0,z:16},{x:0,z:6},{x:0,z:-6},{x:-10,z:-6},{x:10,z:-6},{x:-24,z:-14},{x:-24,z:-20},{x:24,z:-14},{x:24,z:-20},{x:0,z:-22}].map(p=>({x:p.x,z:p.z})),
  zones:[
    {x1:-34,x2:34,z1:14,z2:30,label:'悍匪出生点'},
    {x1:-10,x2:10,z1:-28,z2:-12,label:'警方出生点'},
    {x1:-5,x2:5,z1:-12,z2:14,label:'中路'},
    {x1:-16,x2:-5,z1:-10,z2:-2,label:'连接'},
    {x1:5,x2:16,z1:-10,z2:-2,label:'市集'},
    {x1:-28,x2:-16,z1:-2,z2:14,label:'A 宫殿'},
    {x1:16,x2:28,z1:-2,z2:14,label:'B 公寓'},
    {x1:-34,x2:-10,z1:-28,z2:-2,label:'A 平台'},
    {x1:10,x2:34,z1:-28,z2:-2,label:'B 平台'},
    {x1:-34,x2:34,z1:-30,z2:30,label:'迷城蜃楼'},
  ],
  atmosphere:{ground:'#c2a67e',bg:0xd9b98a,sun:[-40,26,28],sunColor:0xffc98a,hemi:[0xe8d9c4,0x8a7350,1.2],fog:[55,145],turbidity:5,rayleigh:2},
  topology:'mid-window-connector-market-dual-entry',
  walkthroughs:[
    {from:{x:-22,z:24},to:{x:-24,z:-14},label:'A 宫殿长廊'},
    {from:{x:0,z:24},to:{x:-24,z:-16},label:'中路 · 连接'},
    {from:{x:22,z:24},to:{x:24,z:-16},label:'B 公寓长廊'},
    {from:{x:0,z:-6},to:{x:24,z:-16},label:'中路 · 市集'},
  ],
  build:buildMirage,
};
