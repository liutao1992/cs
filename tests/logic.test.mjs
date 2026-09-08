import test from 'node:test';
import assert from 'node:assert/strict';
import { collides, moveWithCollision, findPath, applyDamage, reloadWeapon } from '../src/logic.js';
const wall={minX:0,maxX:2,minZ:-5,maxZ:5,height:4};
test('fast movement cannot tunnel through walls; tangential motion slides',()=>{const p={x:-2,z:0};moveWithCollision(p,20,3,[wall]);assert.ok(p.x<-.35);assert.ok(p.z>2.9);});
test('map boundaries contain the player',()=>{assert.equal(collides(34,0,[]),true);assert.equal(collides(0,30,[]),true);assert.equal(collides(0,0,[]),false);});
test('pathfinding navigates around a wall without entering it',()=>{const path=findPath({x:-4,z:0},{x:6,z:0},[wall]);assert.ok(path.length>0);assert.deepEqual(path.at(-1),{x:6,z:0});assert.ok(path.every(p=>!collides(p.x,p.z,[wall],.45)));assert.ok(path.some(p=>Math.abs(p.z)>5));});
test('armor absorbs damage and never underflows',()=>{assert.deepEqual(applyDamage(100,10,40),{health:70,armor:0});assert.deepEqual(applyDamage(10,0,100),{health:0,armor:0});});
test('reload conserves ammunition and handles partial reserves',()=>{const w={capacity:30,ammo:23,reserve:4};assert.equal(reloadWeapon(w),4);assert.deepEqual(w,{capacity:30,ammo:27,reserve:0});assert.equal(reloadWeapon(w),0);});
