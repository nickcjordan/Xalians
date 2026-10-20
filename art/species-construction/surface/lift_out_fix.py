"""Lift listed strands out of the skin: every point below the skin surface, or
within CLEAR of it past the root, goes to the nearest skin point plus CLEAR along
that point's normal; a segment that still crosses the skin lifts its far point the
same way. The root stays. Saves in place; the ids are added to the changed key.
  blender -b --python lift_out_fix.py -- <surface dir> <ids.npy> <changed key>
"""
import sys
from pathlib import Path
import json
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

CLEAR = .0004
surf, ids_path, key = sys.argv[sys.argv.index('--') + 1:]
surf = Path(surf)
ids = np.load(ids_path)
bpy.ops.wm.open_mainfile(filepath=str(surf / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((surf / 'surface-info.json').read_text())
bvh = BVHTree.FromObject(bpy.data.objects[info['skin']], bpy.context.evaluated_depsgraph_get())
cu = bpy.data.objects['Akinza fur'].data
st = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', st)
counts = np.diff(np.r_[st, len(cu.points)])
P = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', P)
P = P.reshape(-1, 3)
lifted = 0
for i in ids:
    s, n = st[i], counts[i]
    for _ in range(3):
        moved = False
        for j in range(1, n):
            a, q = P[s + j - 1].astype(float), P[s + j].astype(float)
            loc, nn, _, _ = bvh.find_nearest(Vector(q))
            loc, nn = np.array(loc), np.array(nn)
            d = b = q - a
            ln = np.linalg.norm(b)
            crosses = ln > 1e-7 and bvh.ray_cast(Vector(a + b / ln * 1e-4), Vector(b / ln), max(0, ln - 2e-4))[0] is not None
            if np.dot(q - loc, nn) < CLEAR * .5 or crosses:
                P[s + j] = loc + nn * CLEAR
                lifted += 1
                moved = True
        if not moved:
            break
cu.points.foreach_set('position', P.ravel())
ev = dict(np.load(surf / 'patch-evidence.npz'))
mask = np.zeros(len(st), bool)
mask[ids] = True
ev[key] = ev[key] | mask
ev[key + 'Lifted'] = mask
np.savez_compressed(surf / 'patch-evidence.npz', **ev)
bpy.ops.wm.save_as_mainfile(filepath=str(surf / 'surface.blend'))
print('LIFTED', dict(strands=int(len(ids)), points=lifted), flush=True)
