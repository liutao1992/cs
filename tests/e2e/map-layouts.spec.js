import { test, expect } from '@playwright/test';
import { collides, findPath, moveWithCollision } from '../../src/logic.js';

test('every map has a distinct, physically walkable route skeleton',async({page})=>{
  test.setTimeout(60000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/?test');
  const layouts=[];
  for(const id of ['oldcity','dust2','mirage','suburban','plaza','courtyard','forest','outpost','downtown']){
    await page.selectOption('#map',id);
    const layout=await page.evaluate(()=>({
      id:__game.world.map.id,topology:__game.world.map.topology,
      obstacles:__game.world.obstacles,walkthroughs:__game.world.map.walkthroughs,
    }));
    layouts.push(layout);
  }
  expect(new Set(layouts.map(layout=>layout.topology)).size).toBe(layouts.length);
  for(const layout of layouts){
    for(const route of layout.walkthroughs){
      expect(collides(route.from.x,route.from.z,layout.obstacles,.4),`${layout.id} ${route.label} starts blocked`).toBe(false);
      expect(collides(route.to.x,route.to.z,layout.obstacles,.4),`${layout.id} ${route.label} ends blocked`).toBe(false);
      const path=findPath(route.from,route.to,layout.obstacles);
      expect(path.length,`${layout.id} ${route.label} has no route`).toBeGreaterThan(0);
      const end=path.at(-1);
      expect(Math.hypot(end.x-route.to.x,end.z-route.to.z),`${layout.id} ${route.label} misses its destination`).toBeLessThan(2);
      let previous=route.from,walker={...route.from};
      for(const point of path){
        for(let t=.1;t<=1;t+=.1)expect(collides(previous.x+(point.x-previous.x)*t,previous.z+(point.z-previous.z)*t,layout.obstacles,.38),`${layout.id} ${route.label} clips cover`).toBe(false);
        moveWithCollision(walker,point.x-walker.x,point.z-walker.z,layout.obstacles,.36);
        previous=point;
      }
      expect(Math.hypot(walker.x-route.to.x,walker.z-route.to.z),`${layout.id} ${route.label} cannot be walked`).toBeLessThan(2);
    }
  }
  expect(errors).toEqual([]);
});
