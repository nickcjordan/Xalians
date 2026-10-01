"""Dump every mesh of a glb as world-space vertices to an npz (Blender step for the rig tools).

  loop_tools.py blender art/species-construction/rig_dump.py --log X -- --glb A.glb --out DIR/verts.npz
"""
import argparse
import sys
from pathlib import Path

import bpy
import numpy as np

p = argparse.ArgumentParser()
p.add_argument('--glb', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(a.glb.resolve()))
names, chunks, tris = [], [], []
for o in bpy.context.scene.objects:
    if o.type != 'MESH':
        continue
    n = len(o.data.vertices)
    v = np.empty(n*3, np.float32)
    o.data.vertices.foreach_get('co', v)
    m = np.array(o.matrix_world)
    v = v.reshape(-1, 3).astype(np.float64)
    v = v@m[:3, :3].T+m[:3, 3]
    names.append(o.name)
    chunks.append(v.astype(np.float32))
a.out.parent.mkdir(parents=True, exist_ok=True)
np.savez(a.out, names=np.array(names), counts=np.array([len(c) for c in chunks]), verts=np.concatenate(chunks))
print('dumped', len(names), sum(len(c) for c in chunks))
