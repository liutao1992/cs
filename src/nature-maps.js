function forestEdge(k){
  for(const x of [-34,34])k.box(x,1.1,0,1,2.2,60,k.materials.wood,true);
  for(const z of [-30,30])k.box(0,1.1,z,69,2.2,1,k.materials.wood,true);
  // Distant trees enclose the arena without adding navigation obstacles.
  for(const x of [-40,-30,-20,-10,0,10,20,30,40]){
    k.model('pine',x,-38,1.3,0,false);k.model('pine',x,38,1.2,0,false);
  }
  for(const z of [-24,-12,0,12,24])for(const x of [-40,40])k.model('pine',x,z,1.4,0,false);
}

function buildForest(k){
  forestEdge(k);
  for(const x of [-24,0,24])k.box(x,-.095,0,4,.2,57,k.materials.sand);
  for(const z of [-24,24])k.box(0,-.09,z,60,.2,4,k.materials.sand);
  for(const [x,z,scale] of [[-12,12,2],[12,10,2],[-10,-10,2],[14,-12,2],[0,2,1.8]])k.model('rock',x,z,scale);
  // Fallen-log walls form two winding trails between clearings. Foliage stays
  // visual cover only, so the actual choices come from rock and log geometry.
  for(const [x,z,w,d] of [[-5,14,12,.7],[7,5,.7,10],[-5,-3,12,.7],[-8,-13,.7,9],[9,-17,12,.7]])k.box(x,.65,z,w,1.3,d,k.materials.wood,true);
  for(const x of [-22,22])for(const z of [-18,-6,6,18])k.model('pine',x,z,1,0,'tree');
  for(const [x,z] of [[-8,20],[8,-20],[-16,0],[16,0]])k.model('pine',x,z,1,0,'tree');
  for(const [x,z] of [[-14,16],[14,14],[-14,-14],[18,-16],[-28,10],[28,-8]])k.model('bush',x,z,1.2,0,false);
  k.crate(-25,-19,2.5,1.8,2.5);k.crate(25,-19,2.5,1.8,2.5);
  k.site(-24,-24,'A');k.site(24,-24,'B');
  k.textPlane('A · 西营地',-24,2,-29.4,4,1.2,'#e7edc9','#3f5138');
  k.textPlane('B · 东营地',24,2,-29.4,4,1.2,'#e7edc9','#3f5138');
}

function buildOutpost(k){
  forestEdge(k);
  k.box(0,-.095,0,12,.2,57,k.materials.light);
  for(const z of [-24,24])k.box(0,-.09,z,60,.2,5,k.materials.light);
  k.model('building-type-a',-16,12,8);
  k.model('building-type-f',14,-10,8,Math.PI);
  // Offset roadblocks force turns through the checkpoint, while both flanks stay open.
  k.box(-4,1.3,6,8,2.6,1,k.materials.wood,true);
  k.box(6,1.3,-6,8,2.6,1,k.materials.wood,true);
  // A checkpoint is a defended spine, not a forest maze: sandbag wings force
  // a choice between the roadblock gaps and exposed outer flanks.
  k.box(-15,1.1,5,7,2.2,.8,k.materials.wood,true);
  k.box(15,1.1,-5,7,2.2,.8,k.materials.wood,true);
  k.box(-6,1.1,14,.8,2.2,8,k.materials.wood,true);
  k.box(6,1.1,-14,.8,2.2,8,k.materials.wood,true);
  k.model('rock',-16,-12,2.5);k.model('rock',18,14,2);
  for(const [x,z] of [[-28,16],[28,18],[-28,2],[28,0],[-28,-14],[28,-14],[-10,-22],[10,22]])k.model('pine',x,z,1.1,0,'tree');
  for(const [x,z] of [[-24,6],[24,-6],[-20,-18],[22,8]])k.model('bush',x,z,1.1,0,false);
  k.crate(0,16,2.4,2,2.4);k.crate(-23,-17,2.4,2,2.4);k.crate(24,-17,2.4,2,2.4);
  k.barrel(-6,-2);k.barrel(8,10);
  k.site(-24,-24,'A');k.site(24,-24,'B');
  k.textPlane('A · 补给站',-24,2,-29.4,4,1.2,'#dfe9e6','#3f555a');
  k.textPlane('B · 通信站',24,2,-29.4,4,1.2,'#dfe9e6','#3f555a');
}

function metadata(id,name,subtitle,waypoints,labels,atmosphere,build){
  return {
    id,name,subtitle,size:'68 × 60 M',environment:'nature',
    playerSpawn:{x:0,z:25,yaw:0},ctPlayerSpawn:{x:0,z:-25,yaw:Math.PI},
    botSpawns:[[0,-25],[-4,-24],[4,-24],[-24,-24],[24,-24],[-30,-22],[30,-22]],
    tBotSpawns:[[-2,24],[2,24],[-4,26],[4,26],[-8,24],[8,24]],
    waypoints:waypoints.map(([x,z])=>({x,z})),
    zones:[
      {x1:-34,x2:34,z1:20,z2:30,label:'进攻方 · 南入口'},
      {x1:-34,x2:-18,z1:-30,z2:-20,label:labels[0]},
      {x1:18,x2:34,z1:-30,z2:-20,label:labels[1]},
      {x1:-18,x2:18,z1:-30,z2:-20,label:'防守方 · 北入口'},
      {x1:-7,x2:7,z1:-20,z2:20,label:labels[2]},
      {x1:-34,x2:34,z1:-30,z2:30,label:name},
    ],
    atmosphere,
    topology:id==='forest'?'winding-forest-clearings':'checkpoint-spine-and-flanks',
    walkthroughs:id==='forest'?
      [{from:{x:0,z:24},to:{x:-20,z:6},label:'西侧林径'},{from:{x:-4,z:8},to:{x:6,z:-14},label:'岩石清场'},{from:{x:22,z:0},to:{x:24,z:-24},label:'东营地'}]:
      [{from:{x:0,z:24},to:{x:-8,z:8},label:'西检查口'},{from:{x:10,z:8},to:{x:4,z:-8},label:'东侧路障'},{from:{x:30,z:0},to:{x:24,z:-24},label:'通信站侧翼'}],
    build,
  };
}

export const natureMaps=[
  metadata('forest','松林营地','PINE CAMP / 岩石与林间小径',
    [[0,24],[-28,24],[28,24],[-28,0],[28,0],[-6,2],[6,2],[0,-14],[0,-24],[-24,-24],[24,-24]],
    ['A 区 · 西营地','B 区 · 东营地','林间小径'],
    {ground:'#637b48',bg:0xb9c9b7,sun:[-25,45,20],sunColor:0xffedc2,hemi:[0xdbe9cf,0x596144,1.5],fog:[50,130],turbidity:3,rayleigh:1.2},buildForest),
  metadata('outpost','林间哨站','FOREST OUTPOST / 道路检查站',
    [[0,24],[-30,24],[30,24],[-30,0],[30,0],[4,6],[0,0],[-2,-8],[0,-24],[-24,-24],[24,-24]],
    ['A 区 · 补给站','B 区 · 通信站','中央检查站'],
    {ground:'#6c7964',bg:0xadbfca,sun:[-32,36,24],sunColor:0xddeaff,hemi:[0xd9e9f1,0x55604d,1.5],fog:[45,125],turbidity:5,rayleigh:1.1},buildOutpost),
];
