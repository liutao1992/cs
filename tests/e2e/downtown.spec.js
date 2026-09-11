import { test, expect } from '@playwright/test';
import * as THREE from 'three';
import { collides, findPath } from '../../src/logic.js';

test('downtown: offline PBR, routes, bomb sites, side swap and disposal',async({page,context})=>{
  test.setTimeout(45000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await context.setOffline(true);
  await page.goto(new URL('../../index.html?test',import.meta.url).href);
  await page.selectOption('#map','downtown');await expect(page.locator('#preview-label')).toHaveText('市中心街区');
  const layout=await page.evaluate(()=>{
    const w=__game.world,house=w.group.children.find(o=>o.name==='downtown:Building_Small_1');
    return {obstacles:w.obstacles,points:[w.map.playerSpawn,w.map.ctPlayerSpawn,...w.map.botSpawns.map(([x,z])=>({x,z})),...w.map.tBotSpawns.map(([x,z])=>({x,z})),...w.map.waypoints],sites:w.sites,
      house:house.children.map(m=>({geometry:m.geometry.toJSON(),matrix:m.matrixWorld.toArray(),solid:w.solids.includes(m)}))};
  });
  for(const p of [...layout.points,...layout.sites])expect(collides(p.x,p.z,layout.obstacles,.45),`blocked ${p.x},${p.z}`).toBe(false);
  for(const start of layout.points)for(const site of layout.sites){
    if(Math.hypot(start.x-site.x,start.z-site.z)<2)continue;
    const path=findPath(start,site,layout.obstacles);expect(path.length).toBeGreaterThan(0);
    const end=path.at(-1);expect(Math.hypot(end.x-site.x,end.z-site.z)).toBeLessThan(2);
    let previous=start;
    for(const p of path){
      for(let t=0;t<=1;t+=.1)expect(collides(previous.x+(p.x-previous.x)*t,previous.z+(p.z-previous.z)*t,layout.obstacles,.38),`blocked segment ${previous.x},${previous.z} → ${p.x},${p.z}`).toBe(false);
      previous=p;
    }
  }
  const targets=layout.house.map(data=>{
    expect(data.solid).toBe(true);
    const mesh=new THREE.Mesh(new THREE.BufferGeometryLoader().parse(data.geometry),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.matrixWorld.fromArray(data.matrix);return mesh;
  });
  expect(new THREE.Raycaster(new THREE.Vector3(-28,1.65,12),new THREE.Vector3(1,0,0),0,25).intersectObjects(targets).length).toBeGreaterThan(0);
  await expect.poll(()=>page.evaluate(()=>{
    const maps=new Set();__game.world.group.traverse(o=>{if(o.isMesh&&o.parent.name.startsWith('downtown:'))for(const v of Object.values(o.material))if(v?.isTexture)maps.add(v);});
    return maps.size>10&&[...maps].every(t=>t.image?.naturalWidth>0);
  })).toBe(true);
  expect(await page.evaluate(()=>{
    const meshes=__game.world.group.children.find(o=>o.name==='downtown:Building_Small_1').children;
    const brick=meshes.find(m=>m.material.name==='downtown:MI_RedBrick_Pale').material,glass=meshes.find(m=>m.material.name==='downtown:MI_Glass').material;
    return !!brick.normalMap&&!!brick.roughnessMap&&brick.roughnessMap===brick.metalnessMap&&glass.transparent&&glass.opacity<1&&brick.map.colorSpace==='srgb'&&brick.normalMap.colorSpace==='';
  })).toBe(true);
  await page.selectOption('#mode','competitive');await page.locator('#deploy').click();
  await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
  await page.evaluate(()=>__game.teleport(0,24,.35));await page.screenshot({path:'test-results/downtown-street.png'});
  await page.evaluate(()=>{
    const g=__game;if(g.state.phase==='paused')g.resume();g.player.health=1e6;
    const s=g.world.sites[0];g.teleport(s.x,s.z);g.keys.add('KeyE');g.updateBomb(3.1);g.keys.delete('KeyE');
  });
  expect(await page.evaluate(()=>!!__game.state.bomb)).toBe(true);
  await page.evaluate(()=>{__game.state.round=6;__game.startRound();});
  expect(await page.evaluate(()=>__game.player.z)).toBe(-25);
  expect(await page.evaluate(()=>__game.bots().every(b=>b.group.position.z>20))).toBe(true);
  await page.evaluate(()=>{if(__game.state.phase==='paused')__game.resume();__game.finish(true,'换图测试');});await page.locator('#result-menu').click();
  await page.evaluate(()=>{
    const maps=new Set();__game.world.group.traverse(o=>{if(o.material)for(const v of Object.values(o.material))if(v?.isTexture)maps.add(v);});
    window.__disposedMaps={total:maps.size,count:0};for(const t of maps)t.addEventListener('dispose',()=>window.__disposedMaps.count++);
  });
  await page.selectOption('#map','forest');
  expect(await page.evaluate(()=>__disposedMaps.count)).toBe(await page.evaluate(()=>__disposedMaps.total));
  await page.selectOption('#map','downtown');await page.reload();await expect(page.locator('#map')).toHaveValue('downtown');
  expect(errors).toEqual([]);
});
