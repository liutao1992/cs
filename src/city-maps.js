// Two distinct outdoor layouts built from Kenney Modular Buildings (CC0).
function boundary(k){
  for(const x of [-34,34])k.box(x,1.5,0,2,3,62,k.materials.trim,true);
  for(const z of [-30,30])k.box(0,1.5,z,70,3,2,k.materials.trim,true);
}

function buildPlaza(k){
  boundary(k);
  k.box(0,-.09,0,40,.2,40,k.materials.light);
  // Perimeter traffic routes flank the central pedestrian square.
  for(const x of [-24,24])for(let z=-24;z<=24;z+=8)k.model(Math.abs(z)===24?'road-crossroad':'road-straight',x,z,8,0,false);
  for(const z of [-24,24])for(const x of [-16,-8,0,8,16])k.model('road-straight',x,z,8,Math.PI/2,false);
  for(const [x,z,name] of [[-14,11,'a'],[14,11,'d'],[-14,-12,'d'],[14,-12,'a']])k.model('building-sample-tower-'+name,x,z,6);
  for(const x of [-29,29])k.model('building-sample-tower-a',x,0,4);
  // Monument plinth: low cover around a solid central sculpture.
  k.box(0,.55,0,7,1.1,6,k.materials.trim,true);
  k.box(0,2.8,0,1.8,4.5,1.8,k.materials.metal,true);
  // The civic square stays open: low planters define radial approaches rather
  // than turning the centre into another street-grid maze.
  for(const [x,z,w,d] of [[-13,0,5,2],[13,0,5,2],[0,-15,2,3],[0,15,2,3]])k.box(x,.5,z,w,1,d,k.materials.wood,true);
  for(const [x,z,w,d] of [[-10,0,1,12],[10,0,1,12],[0,-10,12,1],[0,10,12,1]])k.box(x,1.25,z,w,2.5,d,k.materials.trim,true);
  k.crate(0,15,3,2.1,2);k.crate(-6,-9,2,1.8,2);k.crate(7,7,2,1.8,2);
  k.crate(-26,-13,2.4,2,2.4);k.crate(26,-13,2.4,2,2.4);
  for(const [x,z] of [[-6,18],[6,-18],[-30,20],[30,-20]])k.model('tree-large',x,z,8,0,'tree');
  for(const x of [-24,-8,8,24])k.model('building-sample-tower-d',x,-40,6,0,false);
  k.site(-24,-21,'A');k.site(24,-21,'B');
  k.textPlane('A · 西广场',-24,2,-28.95,4.5,1.3,'#d8e5ec','#374c60');
  k.textPlane('B · 东广场',24,2,-28.95,4.5,1.3,'#d8e5ec','#374c60');
}

function buildCourtyard(k){
  boundary(k);
  // An offset arrangement of houses and courtyard walls creates winding routes.
  k.model('building-sample-house-a',-19,13,4.5,Math.PI/2);
  k.model('building-sample-house-c',12,13,4.5,Math.PI);
  k.model('building-sample-house-c',-12,-11,4.5);
  k.model('building-sample-house-a',19,-11,4.5,Math.PI/2);
  k.box(-8,1.3,2,14,2.6,.8,k.materials.sand,true);
  k.box(12,1.3,-4,12,2.6,.8,k.materials.sand,true);
  for(const [x,z,w,d] of [[-26,-4,1,14],[-18,5,10,1],[18,6,10,1],[26,-4,1,14]])k.box(x,1.2,z,w,2.4,d,k.materials.sand,true);
  // Alternating gate walls form nested courts. Each break is on the opposite
  // side, so movement snakes through rooms instead of a broad central cross.
  k.box(-12,1.25,10,1,2.5,10,k.materials.terracotta,true);
  k.box(9,1.25,-10,1,2.5,10,k.materials.terracotta,true);
  k.box(-3,1.25,3,9,2.5,1,k.materials.terracotta,true);
  k.box(4,1.25,-3,9,2.5,1,k.materials.terracotta,true);
  // Flat paved lanes keep the movement plane and visible ground aligned.
  for(const x of [-28,0,28])k.box(x,-.095,0,5,.2,57,k.materials.light);
  for(const z of [-23,24])k.box(0,-.09,z,62,.2,5,k.materials.light);
  k.crate(0,16,2.4,2.2,2.4);k.crate(-23,-17,2.4,2,2.4);k.crate(25,-17,2.4,2,2.4);
  k.crate(-19,5,2,1.8,2);k.crate(20,3,2,1.8,2);
  k.barrel(-4,-10);k.barrel(6,6);
  for(const [x,z] of [[-4,12],[4,-14],[-30,6],[30,-6]])k.model('tree-large',x,z,7,0,'tree');
  for(const x of [-26,-8,10,28])k.model('building-sample-house-c',x,-38,5,Math.PI,false);
  k.site(-24,-23,'A');k.site(24,-23,'B');
  k.textPlane('A · 后院',-24,2,-28.95,4,1.3,'#efe0c9','#805241');
  k.textPlane('B · 货场',24,2,-28.95,4,1.3,'#efe0c9','#805241');
}

const point=(x,z)=>({x,z});
export const cityMaps=[
  {
    id:'plaza',name:'都会广场',subtitle:'CITY PLAZA / 高楼与中央广场',size:'68 × 60 M',environment:'modular',
    playerSpawn:{x:0,z:25,yaw:0},ctPlayerSpawn:{x:0,z:-25,yaw:Math.PI},
    botSpawns:[[0,-25],[-4,-24],[4,-24],[-24,-22],[24,-22],[-24,-8],[24,-8]],
    tBotSpawns:[[-2,24],[2,24],[-4,26],[4,26],[-8,24],[8,24]],
    waypoints:[point(0,24),point(-24,24),point(24,24),point(-24,0),point(24,0),point(-7,0),point(7,0),point(0,-12),point(0,-24),point(-24,-22),point(24,-22)],
    zones:[
      {x1:-34,x2:34,z1:20,z2:30,label:'进攻方 · 南环路'},
      {x1:-34,x2:-18,z1:-30,z2:-17,label:'A 区 · 西广场'},
      {x1:18,x2:34,z1:-30,z2:-17,label:'B 区 · 东广场'},
      {x1:-18,x2:18,z1:-30,z2:-20,label:'防守方 · 北环路'},
      {x1:-9,x2:9,z1:-19,z2:19,label:'中央纪念广场'},
      {x1:-34,x2:34,z1:-30,z2:30,label:'都会广场'},
    ],
    atmosphere:{ground:'#828b90',bg:0xc3d2dd,sun:[-30,48,24],sunColor:0xe6efff,hemi:[0xd7eaff,0x7c828b,1.4],fog:[65,155],turbidity:3,rayleigh:1.2},
    topology:'open-plaza-ring-and-radial-cover',
    walkthroughs:[
      {from:{x:0,z:24},to:{x:-16,z:0},label:'西侧环线'},
      {from:{x:16,z:0},to:{x:0,z:-18},label:'东侧放射入口'},
      {from:{x:-24,z:0},to:{x:-24,z:-21},label:'西广场侧翼'},
    ],
    build:buildPlaza,
  },
  {
    id:'courtyard',name:'红砖庭院',subtitle:'BRICK COURT / 巷道与后院',size:'68 × 60 M',environment:'modular',
    playerSpawn:{x:0,z:25,yaw:0},ctPlayerSpawn:{x:0,z:-25,yaw:Math.PI},
    botSpawns:[[0,-25],[-4,-24],[4,-24],[-24,-24],[24,-24],[-28,-8],[28,-8]],
    tBotSpawns:[[-2,24],[2,24],[-4,26],[4,26],[-8,24],[8,24]],
    waypoints:[point(0,24),point(-28,24),point(28,24),point(-28,0),point(28,0),point(0,8),point(2,0),point(-2,-6),point(0,-24),point(-24,-24),point(24,-24)],
    zones:[
      {x1:-34,x2:34,z1:20,z2:30,label:'进攻方 · 南巷'},
      {x1:-34,x2:-18,z1:-30,z2:-19,label:'A 区 · 后院'},
      {x1:18,x2:34,z1:-30,z2:-19,label:'B 区 · 货场'},
      {x1:-18,x2:18,z1:-30,z2:-20,label:'防守方 · 北巷'},
      {x1:-6,x2:6,z1:-19,z2:19,label:'中央曲巷'},
      {x1:-34,x2:34,z1:-30,z2:30,label:'红砖庭院'},
    ],
    atmosphere:{ground:'#b9a087',bg:0xddc6ac,sun:[-36,30,18],sunColor:0xffd49e,hemi:[0xf1dfcc,0x89684e,1.25],fog:[55,145],turbidity:5,rayleigh:1.4},
    topology:'nested-courtyards-and-offset-gates',
    walkthroughs:[
      {from:{x:0,z:24},to:{x:-8,z:8},label:'南侧门洞'},
      {from:{x:-4,z:0},to:{x:12,z:-12},label:'错位内院'},
      {from:{x:28,z:0},to:{x:24,z:-23},label:'东侧货场'},
    ],
    build:buildCourtyard,
  },
];
