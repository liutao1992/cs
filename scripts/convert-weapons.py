"""Convert Maia Studios source blend files to embedded game GLBs using Blender."""
import bpy
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile

target = Path(__file__).resolve().parents[1] / 'assets' / 'weapons'
temporary = TemporaryDirectory(prefix='dust-weapon-convert-')
source = Path(temporary.name)
for name in ['M4A1', 'USP']:
    with ZipFile(target / (name + '-source.zip')) as archive:
        archive.extractall(source)
    directory = source / name / 'BLEND'
    bpy.ops.wm.open_mainfile(filepath=str(directory / (name + '.blend')))
    for image in bpy.data.images:
        if image.source == 'FILE':
            matches = list(directory.rglob(Path(image.filepath.replace('\\', '/')).name))
            if matches:
                image.filepath = str(matches[0])
                image.reload()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH' and not obj.hide_render and obj.name != 'Plane':
            obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(target / (name.lower() + '.glb')),export_format='GLB',use_selection=True,export_animations=False)
    print('EXPORTED', name)
temporary.cleanup()
