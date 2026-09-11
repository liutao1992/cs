import bpy
bpy.ops.import_scene.fbx(filepath='/Users/liutao/Desktop/arms.fbx')
for obj in bpy.data.objects:
    print('OBJECT', obj.name, obj.type, tuple(obj.dimensions))
    if obj.type == 'ARMATURE':
        print('BONES', [(b.name, tuple(b.head_local), tuple(b.tail_local)) for b in obj.data.bones])
for image in bpy.data.images:
    print('IMAGE', image.name, image.filepath, bool(image.packed_file))
