import test from 'node:test';
import assert from 'node:assert/strict';
import { collides, moveWithCollision, findPath, applyDamage, reloadWeapon, damageFalloff, recoilKick, weaponDefinitions } from '../src/logic.js';
const wall={minX:0,maxX:2,minZ:-5,maxZ:5,height:4};
test('fast movement cannot tunnel through walls; tangential motion slides',()=>{const p={x:-2,z:0};moveWithCollision(p,20,3,[wall]);assert.ok(p.x<-.35);assert.ok(p.z>2.9);});
test('map boundaries contain the player',()=>{assert.equal(collides(34,0,[]),true);assert.equal(collides(0,30,[]),true);assert.equal(collides(0,0,[]),false);});
test('pathfinding navigates around a wall without entering it',()=>{const path=findPath({x:-4,z:0},{x:6,z:0},[wall]);assert.ok(path.length>0);assert.deepEqual(path.at(-1),{x:6,z:0});assert.ok(path.every(p=>!collides(p.x,p.z,[wall],.45)));assert.ok(path.some(p=>Math.abs(p.z)>5));});
test('pathfinding does not cross a thin wall between two clear grid nodes',()=>{
  const thinWall={minX:-.2,maxX:.2,minZ:-3,maxZ:3,height:4};
  const path=findPath({x:-2,z:0},{x:2,z:0},[thinWall]);
  assert.ok(path.length>2);
  let previous={x:-2,z:0};
  for(const point of path){
    for(let t=.125;t<=1;t+=.125)assert.equal(collides(previous.x+(point.x-previous.x)*t,previous.z+(point.z-previous.z)*t,[thinWall],.45),false);
    previous=point;
  }
});
test('armor absorbs damage and never underflows',()=>{assert.deepEqual(applyDamage(100,10,40),{health:70,armor:0});assert.deepEqual(applyDamage(10,0,100),{health:0,armor:0});});
test('reload conserves ammunition and handles partial reserves',()=>{const w={capacity:30,ammo:23,reserve:4};assert.equal(reloadWeapon(w),4);assert.deepEqual(w,{capacity:30,ammo:27,reserve:0});assert.equal(reloadWeapon(w),0);});
test('damageFalloff keeps close shots full and tapers to the minimum',()=>{
  const def={falloffStart:20,falloffEnd:60,falloffMin:.7};
  assert.equal(damageFalloff(5,def),1);
  assert.equal(damageFalloff(20,def),1);
  assert.equal(damageFalloff(60,def),.7);
  assert.equal(damageFalloff(90,def),.7);
  assert.ok(damageFalloff(40,def)<1&&damageFalloff(40,def)>.7);
  assert.equal(damageFalloff(10,{}),1);
});
test('recoilKick grows vertical kick with each shot and keeps horizontal drift bounded',()=>{
  const first=recoilKick(1,.012),fifth=recoilKick(5,.012),late=recoilKick(30,.012);
  assert.ok(fifth.pitch>first.pitch);
  assert.ok(late.pitch>fifth.pitch);
  assert.ok(Math.abs(first.yaw)<=.012*.38+.0001);
  assert.ok(Math.abs(recoilKick(7,.012).yaw)<=.012*.38+.0001);
  assert.ok(late.pitch<=.012*(1+13*.09)+.0001);
});
test('every weapon exposes realistic ballistics fields',()=>{
  for(const weapon of weaponDefinitions){
    assert.ok(weapon.falloffStart>0&&weapon.falloffEnd>weapon.falloffStart,weapon.name);
    assert.ok(weapon.falloffMin>0&&weapon.falloffMin<=1,weapon.name);
    assert.ok(weapon.penetrationDepth>0&&weapon.inaccuracy>0&&weapon.maxInaccuracy>0,weapon.name);
  }
});
