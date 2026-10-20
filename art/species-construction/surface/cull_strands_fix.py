"""Cull listed strands of a fix surface (zero radius, as earlier rogue culls) and
mark them in the step's changed key. Saves in place.
  blender -b --python cull_strands_fix.py -- <before dir> <surface dir> <ids.npy> <changed key>
"""
import sys
from pathlib import Path
import bpy
import numpy as np

_, surf, ids_path, key = sys.argv[sys.argv.index('--') + 1:]
surf = Path(surf)
ids = np.load(ids_path)
bpy.ops.wm.open_mainfile(filepath=str(surf / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
cu = bpy.data.objects['Akinza fur'].data
st = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', st)
counts = np.diff(np.r_[st, len(cu.points)])
rad = np.empty(len(cu.points), np.float32)
cu.attributes['radius'].data.foreach_get('value', rad)
mask = np.zeros(len(st), bool)
mask[ids] = True
rad[np.repeat(mask, counts)] = 0
cu.attributes['radius'].data.foreach_set('value', rad)
ev = dict(np.load(surf / 'patch-evidence.npz'))
ev[key] = ev[key] | mask
ev[key + 'Culled'] = mask
np.savez_compressed(surf / 'patch-evidence.npz', **ev)
bpy.ops.wm.save_as_mainfile(filepath=str(surf / 'surface.blend'))
print('CULLED', int(mask.sum()), flush=True)
