function buildDowntown(k){
  // The imported street pieces establish a city scale, but the playable plan
  // is deliberately asymmetric: market bend, indoor warehouse and service yard.
  for(const [x,z,yaw] of [[-26,23,0],[-26,11,0],[-26,-1,0],[27,22,0],[27,10,0],[27,-2,0],[0,24,Math.PI/2],[12,14,Math.PI/2],[-3,3,Math.PI/2]])k.model('Street_2Lane',x,z,1,yaw,false);
  k.model('Street_4WayIntersection',11,-6,.5,0,false);
  // Imported facades make the lanes feel like a built city, while the western
  // warehouse below is built from individual walls so it remains enterable.
  const westFacade=k.model('Building_Small_1',-23,13,.72,0);
  k.model('Building_Medium_2_001',13,13,.52,Math.PI);
  k.model('Building_Large_2',13,-12,.42,Math.PI);
  const brick=westFacade.children.find(mesh=>mesh.material.name==='downtown:MI_RedBrick_Pale')?.material||k.materials.terracotta;
  const wall=(x,z,w,d,mat=brick)=>k.box(x,1.7,z,w,3.4,d,mat,true);
  const roof=(x,z,w,d)=>{const m=k.box(x,3.65,z,w,.28,d,k.materials.dark);k.solids.push(m);};
  // Perimeter and distant skyline.
  for(const x of [-34,34])k.box(x,1.6,0,2,3.2,62,k.materials.dark,true);
  for(const z of [-30,30])k.box(0,1.6,z,70,3.2,2,k.materials.dark,true);
  for(const [name,x] of [['Building_Medium_2_001',-28],['Building_Large_2',0],['Building_Medium_2_001',28]])k.model(name,x,-43,.85,Math.PI,false);
  // A: enclosed warehouse with a north loading door, east side door and a
  // south market entrance.  A roof blocks sightlines but does not create a
  // fake upper floor in the flat movement system.
  wall(-27,-15,.8,14);wall(-15,-19,4,.8);wall(-15,-10,4,.8);
  wall(-21,-22,10,.8);wall(-25,-8,4,.8);wall(-17,-8,4,.8);
  roof(-21,-15,12,14);
  wall(-24,-15,.7,3,k.materials.metal);wall(-18,-15,.7,3,k.materials.metal);
  k.crate(-25,-18,2.6,2.2,2.4);k.crate(-19,-13,3,2.4,2.2);k.barrel(-22,-11.5);k.barrel(-22.8,-11.5);
  k.textPlane('仓库 A',-21,3.1,-22.43,4.8,1.2,'#e7ddc5','#43504e');
  // Middle is a staggered market lane: neither spawn can see directly through it.
  // A covered market gate breaks the first sightline from T spawn while still
  // giving a readable, walkable entrance into the market bend.
  wall(-7,16,4,1);wall(1,16,4,1);roof(-3,16,4,2);
  wall(-5,16,.6,1.2,k.materials.metal);wall(-1,16,.6,1.2,k.materials.metal);
  k.textPlane('市 集',-3,3.15,15.46,3.2,1,'#eadfbc','#3d4645');
  wall(-8,10,1,10);
  wall(2,5,12,1);wall(7,-1,1,10);
  wall(-2,-6,10,1);roof(-2,10,10,4);
  for(const [x,z] of [[-3,12],[2,8],[-4,1],[4,-3]])k.crate(x,z,2.1,1.8,2.1);
  for(const [x,z] of [[-6,14],[5,2]])k.barrel(x,z);
  // B: an open loading yard.  Its two wide gates feed different flanks, and a
  // lean-to gives close cover without becoming another enclosed room.
  wall(17,-22,8,.8);wall(29,-21,.8,2);wall(29,-14.5,.8,5);wall(24,-10,10,.8);wall(18,-13,.8,5);
  roof(25,-14,7,4);wall(21.7,-14,.6,4,k.materials.metal);wall(28.3,-14,.6,4,k.materials.metal);
  k.crate(25,-15,3,2.4,2.6);k.crate(20,-16,2.4,2,2.4);k.crate(26,-12.5,2.6,2.1,2.2);k.barrel(18.8,-19);
  // A short west arcade creates a third, low-visibility rotation route.
  wall(-30,3,.8,12,k.materials.dark);wall(-23,8,7,.8,k.materials.dark);wall(-17,3,.8,10,k.materials.dark);roof(-23,3,7,10);
  for(const x of [-26,-20])wall(x,3,.55,.55,k.materials.metal);
  k.crate(-23,1,2.2,1.8,2.2);k.barrel(-20,6);
  k.site(-21,-16,'A');k.site(24,-18,'B');
  k.textPlane('A · 装卸大厅',-22,2.2,-28.94,5.2,1.3,'#e5dfcc','#3c4547');
  k.textPlane('B · 服务后院',24,2.2,-28.94,5.2,1.3,'#e5dfcc','#3c4547');
}

export const downtownMap={
  id:'downtown',name:'市中心街区',subtitle:'DOWNTOWN / 折线市集与装卸后院',size:'68 × 60 M',environment:'downtown',
  playerSpawn:{x:0,z:25,yaw:0},ctPlayerSpawn:{x:0,z:-25,yaw:Math.PI},
  botSpawns:[[0,-25],[-4,-24],[4,-24],[-12,-25],[12,-25],[-28,-12],[31,-12]],
  tBotSpawns:[[-2,24],[2,24],[-4,26],[4,26],[-8,24],[8,24]],
  waypoints:[[0,24],[-28,22],[28,22],[-28,0],[-21,2],[-10,12],[-4,4],[4,0],[12,-6],[27,0],[24,-18],[-21,-16],[0,-24]].map(([x,z])=>({x,z})),
  zones:[
    {x1:-34,x2:34,z1:21,z2:30,label:'进攻方 · 南街'},
    {x1:-28,x2:-15,z1:-23,z2:-8,label:'A 区 · 装卸大厅'},
    {x1:17,x2:30,z1:-23,z2:-9,label:'B 区 · 服务后院'},
    {x1:-19,x2:19,z1:-30,z2:-21,label:'防守方 · 北街'},
    {x1:-9,x2:8,z1:-7,z2:17,label:'中央折线市集'},
    {x1:-32,x2:-16,z1:-7,z2:10,label:'西侧连廊'},
    {x1:18,x2:32,z1:-9,z2:21,label:'东侧服务巷'},
    {x1:-34,x2:34,z1:-30,z2:30,label:'市中心街区'},
  ],
  atmosphere:{groundTex:'concrete',ground:'#8a8d8b',ridgeColor:0x7e8588,bg:0xbfcad2,sun:[-32,46,26],sunColor:0xffe7c9,hemi:[0xd9e6ef,0x7c7870,1.3],fog:[60,155],turbidity:3,rayleigh:1.2},
  topology:'warehouse-market-service-yard',
  walkthroughs:[
    {from:{x:-21,z:-5},to:{x:-21,z:-16},label:'A 大厅南门'},
    {from:{x:-13,z:-15},to:{x:-21,z:-16},label:'A 大厅侧门'},
    {from:{x:31,z:-18},to:{x:24,z:-18},label:'B 后院东门'},
    {from:{x:-12,z:18},to:{x:10,z:-8},label:'折线市集'},
  ],
  build:buildDowntown,
};
