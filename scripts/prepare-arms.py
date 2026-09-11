"""Convert user-provided FPS arms, excluding the sculpt and example weapons."""
import bpy
import pathlib
import zipfile
root = pathlib.Path(__file__).resolve().parents[1]
dest = root / 'assets' / 'arms'
dest.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile('/Users/liutao/Desktop/Textures.zip') as archive:
    for name in ['T_arms_A.png', 'T_arms_AORM.png', 'T_arms_N.png', 'T_arms_SSS.png']:
        (dest / name).write_bytes(archive.read(name))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/Users/liutao/Desktop/arms.fbx')
arms = bpy.data.objects['arms']
material = bpy.data.materials.new('Skin')
material.use_nodes = True
nodes = material.node_tree.nodes
links = material.node_tree.links
shader = nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = .6
for filename, socket in [('T_arms_A.png', 'Base Color'), ('T_arms_N.png', 'Normal')]:
    texture = nodes.new('ShaderNodeTexImage')
    texture.image = bpy.data.images.load(str(dest / filename))
    if socket == 'Normal':
        texture.image.colorspace_settings.name = 'Non-Color'
        normal = nodes.new('ShaderNodeNormalMap')
        links.new(texture.outputs['Color'], normal.inputs['Color'])
        links.new(normal.outputs['Normal'], shader.inputs[socket])
    else:
        links.new(texture.outputs['Color'], shader.inputs[socket])
arms.data.materials.clear()
arms.data.materials.append(material)
bpy.ops.object.select_all(action='DESELECT')
arms.select_set(True)
bpy.data.objects['skeleton'].select_set(True)
print('ACTIONS', [(a.name, tuple(a.frame_range)) for a in bpy.data.actions])
bpy.ops.export_scene.gltf(filepath=str(dest / 'arms.glb'), use_selection=True, export_format='GLB', export_animations=True)
