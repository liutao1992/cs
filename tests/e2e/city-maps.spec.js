import { test, expect } from '@playwright/test';
import * as THREE from 'three';
import { collides, findPath } from '../../src/logic.js';

for(const [id,name,houseX,houseZ] of [['plaza','都会广场',-14,11],['courtyard','红砖庭院',-19,13]]){
  test(`${id}: clear routes, bullet cover and competitive spawns`,async({page})=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/?test');await page.selectOption('#map',id);
    await expect(page.locator('#preview-label')).toHaveText(name);
    const layout=await page.evaluate(()=>{
      const w=__game.world;
      const house=w.group.children.find(o=>o.name.startsWith('modular:'));
      return {obstacles:w.obstacles,spawns:[w.map.playerSpawn,w.map.ctPlayerSpawn,...w.map.botSpawns.map(([x,z])=>({x,z})),...w.map.tBotSpawns.map(([x,z])=>({x,z}))],waypoints:w.map.waypoints,sites:w.sites,house:house.children.map(mesh=>({geometry:mesh.geometry.toJSON(),matrix:mesh.matrixWorld.toArray(),solid:w.solids.includes(mesh)}))};
    });
    for(const p of [...layout.spawns,...layout.waypoints,...layout.sites])expect(collides(p.x,p.z,layout.obstacles,.45),`blocked point ${p.x},${p.z}`).toBe(false);
    for(const start of [...layout.spawns,...layout.waypoints])for(const site of layout.sites){
      if(Math.hypot(start.x-site.x,start.z-site.z)<2)continue;
      const path=findPath(start,site,layout.obstacles);
      expect(path.length,`route ${start.x},${start.z} to ${site.label}`).toBeGreaterThan(0);
      const end=path.at(-1);expect(Math.hypot(end.x-site.x,end.z-site.z)).toBeLessThan(2);
      // Check movement along entire route segments, not just the grid nodes.
      let previous=start;
      for(const p of path){
        for(let t=0;t<=1;t+=.1)expect(collides(previous.x+(p.x-previous.x)*t,previous.z+(p.z-previous.z)*t,layout.obstacles,.38),`blocked segment ${previous.x},${previous.z} → ${p.x},${p.z}`).toBe(false);
        previous=p;
      }
    }
    expect(collides(houseX,houseZ,layout.obstacles)).toBe(true);
    const targets=layout.house.map(data=>{
      expect(data.solid).toBe(true);
      const mesh=new THREE.Mesh(new THREE.BufferGeometryLoader().parse(data.geometry),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
      mesh.matrixWorld.fromArray(data.matrix);return mesh;
    });
    expect(new THREE.Raycaster(new THREE.Vector3(houseX-10,1.65,houseZ),new THREE.Vector3(1,0,0),0,20).intersectObjects(targets).length).toBeGreaterThan(0);
    await page.selectOption('#mode','competitive');await page.locator('#deploy').click();
    await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
    await expect.poll(()=>page.evaluate(()=>{
      const meshes=[];__game.world.group.traverse(o=>{if(o.isMesh&&o.parent.name.startsWith('modular:'))meshes.push(o);});
      return meshes.length>0&&meshes.every(o=>o.material.map?.image?.naturalWidth>0);
    })).toBe(true);
    await page.evaluate(()=>__game.teleport(0,24,.4));
    await page.screenshot({path:`test-results/${id}-street.png`});
    await page.evaluate(()=>{__game.state.round=6;__game.startRound();});
    expect(await page.evaluate(()=>({x:__game.player.x,z:__game.player.z}))).toEqual({x:0,z:-25});
    expect(await page.evaluate(()=>__game.bots().every(b=>b.group.position.z>20))).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('new city maps switch and restore from settings in offline HTML',async({page,context})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await context.setOffline(true);
  await page.goto(new URL('../../index.html?test',import.meta.url).href);
  for(const id of ['plaza','courtyard','suburban','plaza','courtyard']){
    await page.selectOption('#map',id);await page.locator('#deploy').click();
    // Headless Chrome can deliver a delayed pointer-lock loss after returning to the menu.
    await expect.poll(()=>page.evaluate(()=>{if(__game.state.phase==='paused')__game.resume();return __game.state.phase;})).toBe('playing');
    expect(await page.evaluate(()=>__game.world.sites.map(s=>s.label))).toEqual(['A','B']);
    await page.evaluate(()=>{if(__game.state.phase==='paused')__game.resume();__game.finish(true,'换图测试');});await page.locator('#result-menu').click();
  }
  await page.reload();await expect(page.locator('#map')).toHaveValue('courtyard');
  expect(await page.evaluate(()=>__game.world.map.id)).toBe('courtyard');
  expect(errors).toEqual([]);
});
