import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, getMap } from '../src/maps.js';

const inBounds=(x,z)=>x>=-34&&x<=34&&z>=-30&&z<=30;

test('map registry has unique ids and complete metadata',()=>{
  const ids=new Set();
  for(const m of MAPS){
    assert.ok(m.id&&m.name&&m.subtitle&&m.size,`${m.id} missing metadata`);
    assert.ok(!ids.has(m.id),`duplicate id ${m.id}`);ids.add(m.id);
    assert.equal(typeof m.build,'function');
    assert.equal(getMap(m.id).id,m.id);
  }
  assert.equal(getMap('nonexistent').id,MAPS[0].id); // fallback
});

test('every map has spawn points, waypoints, zones inside the arena',()=>{
  for(const m of MAPS){
    assert.ok(inBounds(m.playerSpawn.x,m.playerSpawn.z),`${m.id} player spawn out of bounds`);
    assert.ok(Number.isFinite(m.playerSpawn.yaw),`${m.id} player spawn yaw`);
    assert.ok(m.ctPlayerSpawn&&inBounds(m.ctPlayerSpawn.x,m.ctPlayerSpawn.z),`${m.id} ctPlayerSpawn missing/out of bounds`);
    assert.ok(m.tBotSpawns&&m.tBotSpawns.length>=5,`${m.id} needs tBotSpawns for CT half`);
    for(const [x,z] of m.tBotSpawns)assert.ok(inBounds(x,z),`${m.id} t bot spawn ${x},${z} out of bounds`);
    assert.ok(m.playerSpawn.z>10&&m.ctPlayerSpawn.z<-10,`${m.id} spawns must be on opposite sides (T south / CT north)`);
    assert.ok(m.botSpawns.length>=5,`${m.id} needs at least 5 bot spawns`);
    for(const [x,z] of m.botSpawns)assert.ok(inBounds(x,z),`${m.id} bot spawn ${x},${z} out of bounds`);
    assert.ok(m.waypoints.length>=5,`${m.id} needs at least 5 waypoints`);
    for(const w of m.waypoints)assert.ok(inBounds(w.x,w.z),`${m.id} waypoint ${w.x},${w.z} out of bounds`);
    assert.ok(m.zones.length>=3,`${m.id} needs location zones`);
    const last=m.zones[m.zones.length-1];
    assert.ok(last.x1<=-34&&last.x2>=34&&last.z1<=-30&&last.z2>=30,`${m.id} last zone must cover the map as fallback`);
  }
});

test('each map declares a distinct playable spatial structure and route checks',()=>{
  const topologies=MAPS.map(map=>map.topology);
  assert.equal(topologies.filter(Boolean).length,MAPS.length);
  assert.equal(new Set(topologies).size,MAPS.length);
  for(const map of MAPS){
    assert.ok(Array.isArray(map.walkthroughs)&&map.walkthroughs.length>=3,`${map.id} needs route checks`);
    for(const route of map.walkthroughs){
      assert.ok(route.label&&route.from&&route.to,`${map.id} has an incomplete route`);
    }
  }
});

test('dust2 layout data matches the classic three-lane structure',()=>{
  const d=getMap('dust2');
  assert.equal(d.playerSpawn.z>20,true); // T side is south
  const labels=d.zones.map(z=>z.label);
  for(const expected of ['中路','A 大道','A 平台','B 隧道','B 平台','警方出生点','悍匪出生点'])assert.ok(labels.includes(expected),`dust2 zone missing ${expected}`);
  // Waypoints must reach both sites and the tunnels.
  const reach=(x,z)=>d.waypoints.some(w=>Math.hypot(w.x-x,w.z-z)<4);
  assert.ok(reach(-22,-17),'A site waypoint');assert.ok(reach(24,-19),'B site waypoint');
  assert.ok(reach(24,6),'B tunnels waypoint');assert.ok(reach(0,12),'mid waypoint');
});
