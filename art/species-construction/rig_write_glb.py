"""Write new world-space vertex positions into a glb's meshes and export it again (Blender step of retarget).

  loop_tools.py blender art/species-construction/rig_write_glb.py --glb IN.glb --verts new-verts.npz --out OUT.glb
"""
import argparse
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix

p = argparse.ArgumentParser()
p.add_argument('--glb', type=Path, required=True)
p.add_argument('--verts', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
data = np.load(a.verts)
names = list(data['names'])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(a.glb.resolve()))
for k, name in enumerate(names):
    obj = bpy.data.objects[name]
    new = data[f'v{k}']
    assert len(new) == len(obj.data.vertices), name
    inv = np.array(obj.matrix_world.inverted())
    local = new@inv[:3, :3].T+inv[:3, 3]
    obj.data.vertices.foreach_set('co', local.astype(np.float32).ravel())
    obj.data.update()
bpy.ops.export_scene.gltf(filepath=str(a.out.resolve()), export_format='GLB')
print('wrote', a.out)
