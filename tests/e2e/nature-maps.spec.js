import { test, expect } from '@playwright/test';
import * as THREE from 'three';
import { collides, findPath } from '../../src/logic.js';

for(const [id,name,rockX,rockZ] of [['forest','松林营地',-12,12],['outpost','林间哨站',-16,-12]]){
  test(`${id}: offline foliage, walkable routes, cover and bomb sites`,async({page,context})=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));await context.setOffline(true);
    await page.goto(new URL('../../index.html?test',import.meta.url).href);
    await page.selectOption('#map',id);await expect(page.locator('#preview-label')).toHaveText(name);
    const layout=await page.evaluate(()=>{
      const w=__game.world,rock=w.group.children.find(o=>o.name==='nature:rock');
      const trees=w.group.children.filter(o=>o.name==='nature:pine');
      const leaves=trees.flatMap(o=>o.children.filter(m=>m.material.alphaTest>0));
      return {obstacles:w.obstacles,points:[w.map.playerSpawn,w.map.ctPlayerSpawn,...w.map.botSpawns.map(([x,z])=>({x,z})),...w.map.tBotSpawns.map(([x,z])=>({x,z})),...w.map.waypoints],sites:w.sites,leaves:leaves.length,leafBlockers:leaves.filter(m=>w.solids.includes(m)).length,rock:rock.children.map(m=>({geometry:m.geometry.toJSON(),matrix:m.matrixWorld.toArray(),solid:w.solids.includes(m)}))};
    });
    expect(layout.leaves).toBeGreaterThan(20);expect(layout.leafBlockers).toBe(0);
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
    const targets=layout.rock.map(data=>{
      expect(data.solid).toBe(true);
      const mesh=new THREE.Mesh(new THREE.BufferGeometryLoader().parse(data.geometry),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.matrixWorld.fromArray(data.matrix);return mesh;
    });
    expect(new THREE.Raycaster(new THREE.Vector3(rockX-10,1.65,rockZ),new THREE.Vector3(1,0,0),0,20).intersectObjects(targets).length).toBeGreaterThan(0);
    await page.selectOption('#mode','demolition');await page.locator('#deploy').click();
    await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
    await expect.poll(()=>page.evaluate(()=>{
      const meshes=[];__game.world.group.traverse(o=>{if(o.isMesh&&o.parent.name.startsWith('nature:'))meshes.push(o);});
      return meshes.length>0&&meshes.every(o=>o.material.map.image?.naturalWidth>0);
    })).toBe(true);
    await page.evaluate(()=>{__game.player.health=1e6;__game.teleport(0,24,.35);});
    await page.screenshot({path:`test-results/${id}-street.png`});
    await page.evaluate(()=>{
      const g=__game,s=g.world.sites[0];if(g.state.phase==='paused')g.resume();
      g.teleport(s.x,s.z);g.keys.add('KeyE');g.updateBomb(3.1);g.keys.delete('KeyE');
    });
    expect(await page.evaluate(()=>!!__game.state.bomb)).toBe(true);
    await page.evaluate(()=>{if(__game.state.phase==='paused')__game.resume();__game.finish(true,'换图测试');});await page.locator('#result-menu').click();
    await page.selectOption('#map','plaza');await page.selectOption('#map',id);
    await expect(page.locator('#preview-label')).toHaveText(name);
    await expect.poll(()=>page.evaluate(()=>__game.world.group.children.find(o=>o.name==='nature:pine')?.children[0].material.map.image?.naturalWidth||0)).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}
