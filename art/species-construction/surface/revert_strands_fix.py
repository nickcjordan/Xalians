"""Restore listed strands of a fix surface to their positions in the before surface
(used when a turned strand newly flags in the 13 rogue test). Saves in place and
clears those ids from the step's changed key.
  blender -b --python revert_strands_fix.py -- <before dir> <surface dir> <ids.npy> <changed key>
"""
import sys
from pathlib import Path
import bpy
import numpy as np

before, surf, ids_path, key = sys.argv[sys.argv.index('--') + 1:]
before, surf = Path(before), Path(surf)
ids = np.load(ids_path)


def load(path):
    bpy.ops.wm.open_mainfile(filepath=str(path / 'surface.blend'))
    cu = bpy.data.objects['Akinza fur'].data
    st = np.empty(len(cu.curves), np.int32)
    cu.curves.foreach_get('first_point_index', st)
    P = np.empty(len(cu.points) * 3, np.float32)
    cu.points.foreach_get('position', P)
    return cu, st, P.reshape(-1, 3)


_, sb, Pb = load(before)
cu, st, P = load(surf)
bpy.context.preferences.filepaths.save_version = 0
cb = np.diff(np.r_[sb, len(Pb)])
ca = np.diff(np.r_[st, len(P)])
for i in ids:
    assert cb[i] == ca[i]
    P[st[i]:st[i] + ca[i]] = Pb[sb[i]:sb[i] + cb[i]]
cu.points.foreach_set('position', P.ravel())
ev = dict(np.load(surf / 'patch-evidence.npz'))
ev[key][ids] = False
prev = ev.get(key + 'Reverted', np.zeros(len(ev[key]), bool))
ev[key + 'Reverted'] = prev | np.isin(np.arange(len(ev[key])), ids)
np.savez_compressed(surf / 'patch-evidence.npz', **ev)
bpy.ops.wm.save_as_mainfile(filepath=str(surf / 'surface.blend'))
print('REVERTED', len(ids), flush=True)
