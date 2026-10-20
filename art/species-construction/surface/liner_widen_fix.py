"""29c fix: hairs whose width still lies over the eyeliner. For the listed liner
strands, a point counts as over a ribbon when a ray from it, or from it offset
WIDE sideways in the view plane (four directions), hits a ribbon from the 24 view
directions. A strand over a ribbon is shortened along its own path to end STOP
before the first such point; under MINLEN it is culled. Strands in the cull list
are culled. Saves in place; ids are added to the changed key.
  blender -b --python liner_widen_fix.py -- <surface dir> <liner ids.npy> <cull ids.npy> <changed key>
"""
import sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
from clip_ribbon_fur_13h import PREFIX

WIDE, STOP, MINLEN = .0004, .0004, .0012
surf, liner_p, cull_p, key = sys.argv[sys.argv.index('--') + 1:]
surf = Path(surf)
bpy.ops.wm.open_mainfile(filepath=str(surf / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
dg = bpy.context.evaluated_depsgraph_get()
rtrees = [BVHTree.FromObject(o, dg) for o in bpy.data.objects if o.name.startswith(PREFIX)]
dirs = []
for az, el in ((0, 2), (0, 3), (35, 8)):
    a, e = np.radians(az), np.radians(el)
    dirs.append(-np.array((np.sin(a) * np.cos(e), -np.cos(a) * np.cos(e), np.sin(e))))
offs = [np.zeros(3)] + [np.array(v) * WIDE for v in ((1, 0, 0), (-1, 0, 0), (0, 0, 1), (0, 0, -1))]


def over(p):
    for o in offs:
        for d in dirs:
            for t in rtrees:
                if t.ray_cast(Vector(p + o), Vector(d), .03)[0] is not None:
                    return True
    return False


cu = bpy.data.objects['Akinza fur'].data
st = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', st)
counts = np.diff(np.r_[st, len(cu.points)])
P = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', P)
P = P.reshape(-1, 3)
rad = np.empty(len(cu.points), np.float32)
cu.attributes['radius'].data.foreach_get('value', rad)
liner, culls = np.load(liner_p), np.load(cull_p)
mask = np.zeros(len(st), bool)
short = cull = 0
for i in liner:
    s, n = st[i], counts[i]
    if rad[s:s + n].max() <= 0:
        continue
    path = P[s:s + n].astype(float)
    j = next((k for k in range(n) if over(path[k])), None)
    if j is None:
        continue
    arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
    keep = 0.0
    if j > 0:
        keep = arc[j - 1] - STOP
        for f in np.linspace(1, 0, 11):
            if not over(path[j - 1] + (path[j] - path[j - 1]) * f):
                keep = arc[j - 1] + (arc[j] - arc[j - 1]) * f - STOP
                break
    mask[i] = True
    if keep < MINLEN:
        rad[s:s + n] = 0
        cull += 1
    else:
        P[s:s + n] = np.column_stack([np.interp(np.linspace(0, keep, n), arc, path[:, k]) for k in range(3)])
        short += 1
for i in culls:
    rad[st[i]:st[i] + counts[i]] = 0
    mask[i] = True
cu.points.foreach_set('position', P.ravel())
cu.attributes['radius'].data.foreach_set('value', rad)
ev = dict(np.load(surf / 'patch-evidence.npz'))
ev[key] = ev[key] | mask
ev[key + 'Fix'] = mask
np.savez_compressed(surf / 'patch-evidence.npz', **ev)
bpy.ops.wm.save_as_mainfile(filepath=str(surf / 'surface.blend'))
print('WIDEN', dict(shortened=short, culled=cull, extraCulled=int(len(culls))), flush=True)
