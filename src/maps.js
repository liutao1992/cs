// Map registry: layout data + build functions. Geometry is authored in code (no extracted assets).
const oldCityZones=[
  {x1:-35,x2:35,z1:20,z2:32,label:'进攻方出生点'},
  {x1:10,x2:35,z1:-32,z2:-17,label:'A 区 · 集市'},
  {x1:-35,x2:-10,z1:-32,z2:-17,label:'B 区 · 后院'},
  {x1:-10,x2:10,z1:-32,z2:-17,label:'中路尽头'},
  {x1:21,x2:35,z1:-17,z2:20,label:'东侧长街'},
  {x1:-35,x2:-21,z1:-17,z2:20,label:'西侧巷道'},
  {x1:-35,x2:35,z1:-32,z2:32,label:'中路 · 拱门'},
];
const dust2Zones=[
  {x1:15,x2:20,z1:0,z2:8,label:'B 连接狗洞'},
  {x1:-34,x2:34,z1:20,z2:30,label:'悍匪出生点'},
  {x1:-5,x2:11,z1:-28,z2:-12,label:'警方出生点'},
  {x1:-30,x2:-16,z1:-8,z2:20,label:'A 大道'},
  {x1:-5,x2:5,z1:-2,z2:20,label:'中路'},
  {x1:-27,x2:-5,z1:-8,z2:-2,label:'A 小路'},
  {x1:-32,x2:-7,z1:-28,z2:-8,label:'A 平台'},
  {x1:19,x2:29,z1:-10,z2:20,label:'B 隧道'},
  {x1:14,x2:34,z1:-28,z2:-10,label:'B 平台'},
  {x1:9,x2:16,z1:-13,z2:20,label:'中东庭院'},
  {x1:-7,x2:9,z1:-12,z2:-2,label:'警中路口'},
  {x1:-34,x2:34,z1:-30,z2:30,label:'炙热沙城'},
];

function buildOldCity(k){
  // Four blocks leave a connected middle, long alleys, and two cross streets.
  k.building(-13,12,16,14,8.1);k.building(13,12,16,14,9.3,true);
  k.building(-13,-10,16,14,10.2,true);k.building(13,-10,16,14,7.4);
  k.box(-34,3,0,2,6,62,k.materials.sand,true);k.box(34,3,0,2,6,62,k.materials.sand,true);k.box(0,3,-30,70,6,2,k.materials.sand,true);k.box(0,2.2,30,70,4.4,2,k.materials.sand,true);
  for(let i=0;i<12;i++){const x=-55+i*10;k.building(x,-43,8,10,7+k.random()*9,k.random()>.5);}
  // The gateway: carved arch segments over a clear central passage.
  k.box(-4.3,2,-2,1.4,4,1.1,k.materials.light,true);k.box(4.3,2,-2,1.4,4,1.1,k.materials.light,true);
  k.arch();
  k.crate(-2,10,2.2,1.8,2.2);k.crate(7,1,2.3,2.2,2.2);k.crate(-24,6,2.4,2.2,2.4);k.crate(26,-8,2.3,1.8,2.2);k.crate(23,-23,3,2.5,2.6);k.crate(26.2,-23,2.7,2,2.6);k.crate(-25,-23,3.2,2.5,3);k.crate(-28,-23,2.2,1.9,2.6);k.crate(11,-23,2,1.5,2);
  k.barrel(22,15);k.barrel(22.8,15.4);k.barrel(-7,-20);k.barrel(30,-17);
  // Doors, shop fronts, worn signs, cables, lamps, and palms.
  for(const [x,z] of [[-10,19.04],[11,19.04],[-13,-2.96],[13,-2.96]]){k.box(x,1.45,z,1.8,2.9,.12,k.materials.blue);for(let n=0;n<8;n++)k.box(x-.8+n*.23,1.45,z+.08,.03,2.8,.025,k.materials.dark);k.box(x,3,z,2.15,.22,.4,k.materials.trim);}
  k.textPlane('A →',7.4,2.3,19.09,2.7,1.4,'#923d27');k.textPlane('← B',-6.8,2.3,19.09,2.7,1.4,'#923d27');
  k.textPlane('A',23,3.2,-28.95,2.5,2.6,'#9b402b');k.textPlane('B',-25,3.2,-28.95,2.5,2.6,'#9b402b');k.textPlane('MARCHÉ',12,4.2,19.16,4.8,1.15,'#e6ddbf','#425f60');k.textPlane('المدينة',-13,4,-2.88,4.8,1.2,'#dfd0a7','#736344');
  k.site(24,-19,'A');k.site(-24,-19,'B');
  for(const [x,z] of [[29,19],[-29,-12],[30,-25],[-29,22]])k.palm(x,z);
  k.cable(15);k.cable(-12);
  k.scatter(85,-32,32,-28,28);
}

function buildDust2(k){
  const S=k.materials.sand,W=(x,z,w,d)=>k.box(x,2,z,w,4,d,S,true);
  // Outer shell.
  k.box(-34,3,0,2,6,62,S,true);k.box(34,3,0,2,6,62,S,true);k.box(0,3,-30,70,6,2,S,true);k.box(0,2.2,30,70,4.4,2,S,true);
  // Mid corridor (x -5..5) with the classic cracked mid doors.
  W(-7.5,9,5,22);W(7.5,9,5,22);
  k.box(-1.9,1.6,8,2.2,3.2,.35,S,true);k.box(2.1,1.6,8.5,2.2,3.2,.35,S,true);
  // T spawn row: three exits — long (west), mid (center), B tunnels (east).
  W(-13,20,6,1.4);W(10.5,20,11,1.4);W(31,20,6,1.4);
  k.textPlane('← A 大道',-13,2.3,20.78,3.4,1.3,'#923d27');k.textPlane('B 隧道 →',10.5,2.3,20.78,3.4,1.3,'#923d27');
  // Long corridor (x -30..-16) with the S-jog long doors.
  W(-31.5,6,3,28);W(-14.5,14,3,12);W(-14.5,-3,3,10);
  W(-28,7.4,4,1.6);W(-18,6.4,4,1.6);
  k.barrel(-18,12);
  // A site (northwest) — south wall with A doors gap + catwalk gap, east wall.
  W(-30.5,-8,5,1.4);W(-17,-8,6,1.4);W(-8.5,-18,3,20);
  k.box(-24.6,1.6,-8.5,2,3.2,.4,S,true);k.box(-21.4,1.6,-7.4,2,3.2,.4,S,true);
  // Catwalk (A short): from mid top westward, dead-ending at the long corner.
  W(-26.8,-5,1.6,6);
  k.crate(-8,-4.5,2.2,1.8,2.2); // mid X box overlooking the catwalk
  // CT mid court east of mid, tunnel wall with crawl gap (z 1..7).
  W(12.5,-7.5,7,11);
  W(17.5,-3.5,3,9);W(17.5,12.5,3,11);
  const lintel=k.box(17.5,1.5,4,3,.5,6,S);k.solids.push(lintel); // crawl slab: bullets blocked, movement passes under
  W(24,2,8,1.2); // tunnel partition making the L bend
  // CT spawn (north center): walls + CT mid doors.
  W(-6.5,-20,3,16);W(-3.25,-12,6.5,1.4);W(6.25,-12,7.5,1.4);
  k.box(.3,1.6,-12.5,1.5,3.2,.5,S,true);k.box(2,1.6,-11.4,1.5,3.2,.5,S,true);
  // B tunnels (x 19..29) and B site (northeast), B doors from CT spawn.
  W(31.5,5,5,30);W(16.5,-10,5,1.4);
  W(12.5,-25.5,3,5);W(12.5,-12.5,3,5);
  k.box(12.2,1.6,-20.9,.5,3.2,2.4,S,true);k.box(12.8,1.6,-18.1,.5,3.2,2.4,S,true);
  // Site props: big crates, double stacks, barrels.
  k.crate(-22,-18,3,2.4,3);k.crate(-28,-22,3.2,2.4,3);k.crate(-18,-24,2.4,2,2.4);k.crate(-12,-10.5,2.2,1.7,2.2);
  k.barrel(-14,-20);
  k.crate(20,-14,2.4,2.2,2.4);k.crate(23.2,-13,2.2,1.9,2.2);k.crate(26,-22,3,2.5,2.8);k.crate(28.5,-24,2.6,2,2.6);k.crate(17,-25.5,2.8,2,2.2);
  k.barrel(24,-24);k.barrel(24.8,-24.4);
  k.crate(-4,26,2.2,1.8,2.2);k.crate(6,-24,2.4,2,2.4);k.crate(12.5,6,2.4,2,2.4);
  k.barrel(6,26);k.barrel(6.7,26.4);k.barrel(-2,-25);k.barrel(14,14);
  k.site(-22,-17,'A');k.site(24,-19,'B');
  for(let i=0;i<8;i++){const x=-55+i*14;k.building(x,-43,8,10,7+k.random()*9,k.random()>.5);}
  for(const [x,z] of [[30,25],[-30,26],[-31,14]])k.palm(x,z);
  k.cable(26);k.cable(18);
  k.scatter(60,-32,32,-28,28);
}

export const MAPS=[
  {
    id:'oldcity',name:'沙域 · 旧城',subtitle:'DUST SECTOR / 34° N — 06° W',size:'68 × 60 M',
    playerSpawn:{x:0,z:25,yaw:0},
    ctPlayerSpawn:{x:0,z:-22,yaw:Math.PI},
    botSpawns:[[0,-22],[-25,-13],[25,-13],[-1,-9],[24,-25],[-24,-25],[0,1]],
    tBotSpawns:[[-2,23],[2,23],[-4,26],[4,26],[0,20],[6,24]],
    waypoints:[{x:0,z:16},{x:0,z:0},{x:0,z:-22},{x:26,z:-20},{x:26,z:1},{x:26,z:23},{x:-26,z:23},{x:-26,z:1},{x:-26,z:-20}],
    zones:oldCityZones,
    build:buildOldCity,
  },
  {
    id:'dust2',name:'炙热沙城',subtitle:'DUNES / 致敬经典 de_dust2 布局',size:'68 × 60 M',
    playerSpawn:{x:0,z:26,yaw:0},
    ctPlayerSpawn:{x:0,z:-22,yaw:Math.PI},
    botSpawns:[[2,-22],[-2,-18],[6,-20],[-22,-20],[26,-16],[20,-24],[0,-14]],
    tBotSpawns:[[-2,24],[2,24],[-4,26],[4,26],[0,22],[6,25]],
    waypoints:[{x:0,z:24},{x:0,z:12},{x:0,z:2},{x:0,z:-5},{x:-14,z:-5},{x:-22,z:-14},{x:-23,z:10},{x:-23,z:-4},{x:4,z:-8},{x:2,z:-20},{x:24,z:-18},{x:24,z:6},{x:24,z:16},{x:12.5,z:-19},{x:13,z:6},{x:-4,z:24},{x:8,z:24}],
    zones:dust2Zones,
    atmosphere:{ground:'#c9ad7c',bg:0xd9c096,sun:[-38,44,30],sunColor:0xffdfae,hemi:[0xd8e2ea,0x9a8258,1.15],fog:[55,140],turbidity:4,rayleigh:1.8},
    build:buildDust2,
  },
];

export function getMap(id){return MAPS.find(m=>m.id===id)||MAPS[0];}
