import {test,expect} from '@playwright/test';

test('textured arms preserve joint lengths through reload and reset after switching',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1600,height:900});
  await page.goto('/?test');
  await expect(page.locator('#load-status')).toContainText('战场就绪');
  await page.locator('#deploy').click();
  await expect.poll(()=>page.evaluate(()=>__game.state.phase)).toBe('playing');
  await page.evaluate(()=>{
    __game.bots().forEach(bot=>{bot.fireTimer=9999;});
    __game.state.phase='inspection';
    document.getElementById('toast').style.opacity='0';
  });
  const result=await page.evaluate(()=>{
    const results=[];
    for(const gun of __game.viewModel.guns){
      const arms=gun.getObjectByName('FirstPersonArms');
      const meshes=[];arms.traverse(node=>{if(node.isSkinnedMesh)meshes.push(node);});
      const bones=meshes[0].skeleton.bones;
      const lengths=bones.filter(bone=>bone.parent.isBone).map(bone=>bone.position.length());
      const read=()=>{
        arms.updateWorldMatrix(true,true);
        const left=arms.getObjectByName('hand_L'),right=arms.getObjectByName('hand_R');
        return {left:left.getWorldPosition(left.position.clone()),right:right.getWorldPosition(right.position.clone())};
      };
      gun.userData.updateArms(0);const start=read();
      let maxLengthError=0,finite=true,leftTravel=0,rightTravel=0;
      for(const progress of [0,.07,.14,.22,.30,.40,.50,.60,.69,.77,.85,.94,1]){
        gun.userData.updateArms(progress);
        const current=read();leftTravel=Math.max(leftTravel,current.left.distanceTo(start.left));rightTravel=Math.max(rightTravel,current.right.distanceTo(start.right));
        bones.filter(bone=>bone.parent.isBone).forEach((bone,i)=>{maxLengthError=Math.max(maxLengthError,Math.abs(bone.position.length()-lengths[i]));});
        for(const mesh of meshes){
          mesh.skeleton.update();mesh.computeBoundingBox();
          finite&&=[...mesh.boundingBox.min.toArray(),...mesh.boundingBox.max.toArray()].every(Number.isFinite);
        }
      }
      gun.userData.updateArms(0);const end=read();
      results.push({bones:bones.length,textured:meshes.every(mesh=>mesh.material.map?.image?.width>0&&mesh.material.normalMap?.image?.width>0),maxLengthError,finite,leftTravel,rightTravel,resetError:end.left.distanceTo(start.left)});
    }
    return results;
  });
  expect(result).toHaveLength(5);
  for(const item of result){
    expect(item.bones).toBe(54);expect(item.textured).toBe(true);expect(item.finite).toBe(true);
    expect(item.maxLengthError).toBeLessThan(1e-6);expect(item.leftTravel).toBeGreaterThan(.3);
    expect(item.rightTravel).toBeLessThan(1e-6);expect(item.resetError).toBeLessThan(1e-6);
  }
  await page.screenshot({path:'artifacts/arms-ak-idle.png'});
  await page.evaluate(()=>{
    __game.state.phase='playing';__game.state.weapons[0].ammo=20;__game.reload();
  });
  await expect.poll(()=>page.evaluate(()=>__game.state.reload)).toBeLessThan(2);
  await page.screenshot({path:'artifacts/arms-ak-reload.png'});
  await page.keyboard.press('q');
  await expect(page.locator('#weapon-label')).toHaveText('USP-S');
  await expect.poll(()=>page.evaluate(()=>__game.state.reload)).toBe(0);
  await page.mouse.down({button:'right'});
  await expect.poll(()=>page.evaluate(()=>__game.state.aim)).toBe(true);
  await page.screenshot({path:'artifacts/arms-pistol-aim.png'});
  await page.mouse.up({button:'right'});
  expect(errors).toEqual([]);
});
