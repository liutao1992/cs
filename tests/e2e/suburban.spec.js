import { test, expect } from '@playwright/test';
import { collides, findPath } from '../../src/logic.js';
import * as THREE from 'three';

test('suburban models, routes and repeated map switching work offline',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/?test');
  await page.selectOption('#map','suburban');
  await expect(page.locator('#preview-label')).toHaveText('绿荫街区');
  const layout=await page.evaluate(()=>{
    const w=__game.world;
    return {obstacles:w.obstacles,spawns:[w.map.playerSpawn,w.map.ctPlayerSpawn,...w.map.botSpawns.map(([x,z])=>({x,z})),...w.map.tBotSpawns.map(([x,z])=>({x,z}))],waypoints:w.map.waypoints,sites:w.sites,models:w.group.children.filter(o=>o.name.startsWith('suburban:')).length};
  });
  expect(layout.models).toBeGreaterThan(35);
  for(const point of [...layout.spawns,...layout.waypoints,...layout.sites])expect(collides(point.x,point.z,layout.obstacles,.4)).toBe(false);
  for(const spawn of layout.spawns)for(const site of layout.sites){
    if(Math.hypot(spawn.x-site.x,spawn.z-site.z)<2)continue;
    const path=findPath(spawn,site,layout.obstacles);
    expect(path.length).toBeGreaterThan(0);
    const end=path.at(-1);expect(Math.hypot(end.x-site.x,end.z-site.z)).toBeLessThan(2);
    for(const p of path)expect(collides(p.x,p.z,layout.obstacles,.38)).toBe(false);
  }
  expect(collides(-12,12,layout.obstacles)).toBe(true);
  const house=await page.evaluate(()=>{
    const w=__game.world,house=w.group.children.find(o=>o.name==='suburban:building-type-a');
    return house.children.map(mesh=>({geometry:mesh.geometry.toJSON(),matrix:mesh.matrixWorld.toArray(),solid:w.solids.includes(mesh)}));
  });
  const targets=house.map(data=>{
    expect(data.solid).toBe(true);
    const mesh=new THREE.Mesh(new THREE.BufferGeometryLoader().parse(data.geometry),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
    mesh.matrixWorld.fromArray(data.matrix);return mesh;
  });
  expect(new THREE.Raycaster(new THREE.Vector3(-24,1.65,12),new THREE.Vector3(1,0,0),0,24).intersectObjects(targets).length).toBeGreaterThan(0);
  await page.locator('[data-level="easy"]').click();await page.locator('#deploy').click();
  await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
  await expect(page.locator('#location')).toHaveText('进攻方 · 南街');
  await expect.poll(()=>page.evaluate(()=>{
    const meshes=[];__game.world.group.traverse(o=>{if(o.isMesh&&o.parent.name.startsWith('suburban:'))meshes.push(o);});
    return meshes.length>0&&meshes.every(o=>o.material.map?.image?.complete);
  })).toBe(true);
  await page.evaluate(()=>{__game.bots().forEach(b=>b.health=0);__game.teleport(0,22,.45);});
  await page.screenshot({path:'test-results/suburban-street.png'});
  await page.evaluate(()=>__game.finish(true,'换图测试'));await page.locator('#result-menu').click();
  await page.selectOption('#map','oldcity');await page.selectOption('#map','suburban');
  await page.locator('#deploy').click();
  await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
  expect(await page.evaluate(()=>__game.world.sites.map(s=>s.label))).toEqual(['A','B']);
  expect(errors).toEqual([]);
});

test('standalone HTML loads suburban without network access',async({page,context})=>{
  await context.setOffline(true);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(new URL('../../index.html?test',import.meta.url).href);
  await page.selectOption('#map','suburban');await page.locator('#deploy').click();
  await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
  await expect.poll(()=>page.evaluate(()=>{
    const house=__game.world.group.children.find(o=>o.name==='suburban:building-type-a');
    return house?.children[0].material.map.image?.naturalWidth||0;
  })).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
