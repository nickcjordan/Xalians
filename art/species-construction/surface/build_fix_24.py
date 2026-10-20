"""Step 24, eyeliner touch-up on the approved G1 ribbon.

1. White hairs lying over a ribbon are cut at its edge: for every native strand
   near the eyes, the first point that sits in front of a ribbon from any of the
   13h review directions (front at 2 and 3 degrees, head three-quarter) and
   every point after it get zero radius (positions untouched).
2. The bare sliver under the lower line gets the 13h edge fur: short pale hairs
   rooted on visible skin just outside the ribbon's outer edge where no native
   root is within 1 mm (clip_ribbon_fur_13h.edge_fur, its own guard keeps them
   off the ribbon).
The ribbon itself, its material and the eye are not touched.

  blender -b --python build_fix_24.py -- <s12-23 dir> <out dir>
"""
import sys
import json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
from clip_ribbon_fur_13h import PREFIX, EDGE_FUR, projectors, edge_fur

before, out = map(Path, sys.argv[sys.argv.index('--') + 1:])
assert not (out / 'surface.blend').exists()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
print('EXISTING_EDGE_FUR', [o.name for o in bpy.data.objects if o.name.startswith(EDGE_FUR)], flush=True)
ribbons = [o for o in bpy.data.objects if o.name.startswith(PREFIX)]
assert len(ribbons) == 2, [o.name for o in ribbons]
dg = bpy.context.evaluated_depsgraph_get()
rtrees = [BVHTree.FromObject(o, dg) for o in ribbons]
lo = np.min([np.array([v.co[:] for v in o.data.vertices]).min(0) for o in ribbons], axis=0) - .02
hi = np.max([np.array([v.co[:] for v in o.data.vertices]).max(0) for o in ribbons], axis=0) + .02

cu = bpy.data.objects['Akinza fur'].data
starts = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', starts)
P = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', P)
P = P.reshape(-1, 3)
counts = np.diff(np.r_[starts, len(P)])
rad = np.empty(len(P), np.float32)
cu.attributes['radius'].data.foreach_get('value', rad)
old_rad = rad.copy()
dirs = []
for az, el in ((0, 2), (0, 3), (35, 8)):
    a, e = np.radians(az), np.radians(el)
    toward = np.array((np.sin(a) * np.cos(e), -np.cos(a) * np.cos(e), np.sin(e)))
    dirs.append(-toward)          # from the point away from the camera
near = np.where(((P[starts] > lo) & (P[starts] < hi)).all(1))[0]
cut = []
for i in near:
    s, n = starts[i], counts[i]
    if rad[s:s + n].max() <= 0:
        continue
    first = None
    for j in range(n):
        p = Vector(P[s + j])
        for d in dirs:
            for t in rtrees:
                hit = t.ray_cast(p, Vector(d), .03)
                if hit[0] is not None:
                    first = j
                    break
            if first is not None:
                break
        if first is not None:
            break
    if first is None:
        continue
    rad[s + first:s + n] = 0
    cut.append((int(i), int(first)))
cu.attributes['radius'].data.foreach_set('value', rad)
cut_ids = np.array([c[0] for c in cut], np.int32)
print('RIBBON_CUT', dict(candidates=len(near), cut=len(cut), rootsCut=int(sum(1 for c in cut if c[1] == 0))), flush=True)

# 13h edge-fur paths, appended to the native system (a separate object with the
# 13h attribute copy crashed Blender on save, as 13h attempt 3 did).
patch = edge_fur(projectors())
eob = bpy.data.objects[EDGE_FUR]
ec = eob.data
es = np.empty(len(ec.curves), np.int32)
ec.curves.foreach_get('first_point_index', es)
ep = np.empty(len(ec.points) * 3, np.float32)
ec.points.foreach_get('position', ep)
ep = ep.reshape(-1, 3)
er = np.empty(len(ec.points), np.float32)
ec.attributes['radius'].data.foreach_get('value', er)
ecounts = np.diff(np.r_[es, len(ep)])
bpy.data.objects.remove(eob, do_unlink=True)
from mathutils.kdtree import KDTree
act = np.where(np.maximum.reduceat(rad, starts) > 0)[0]
kd = KDTree(len(act))
for k, i in enumerate(act):
    kd.insert(Vector(P[starts[i]]), k)
kd.balance()
src = np.array([act[kd.find(Vector(ep[s0]))[1]] for s0 in es])
skin = bpy.data.objects[info['skin']]
sbvh = BVHTree.FromObject(skin, dg)
enrm = np.array([np.array(sbvh.find_nearest(Vector(ep[s0]))[1]) for s0 in es], np.float32)
nc0, npt0 = len(cu.curves), len(cu.points)
attrs = {}
for a in cu.attributes:
    if a.name.startswith('.') or a.name == 'position' or a.data_type not in ('FLOAT', 'FLOAT_VECTOR'):
        continue
    w = 3 if a.data_type == 'FLOAT_VECTOR' else 1
    v = np.empty(len(a.data) * w, np.float32)
    a.data.foreach_get('vector' if w == 3 else 'value', v)
    attrs[a.name] = (a.domain, a.data_type, w, v.reshape(len(a.data), w))
cu.add_curves(ecounts.tolist())
P2 = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', P2)
P2 = P2.reshape(-1, 3)
P2[npt0:] = ep
cu.points.foreach_set('position', P2.ravel())
elen = np.array([np.linalg.norm(np.diff(ep[s0:s0 + c], axis=0), axis=1).sum() for s0, c in zip(es, ecounts)], np.float32)
for name, (domain, dtype, w, old) in attrs.items():
    a = cu.attributes[name]
    full = np.empty(len(a.data) * w, np.float32)
    a.data.foreach_get('vector' if w == 3 else 'value', full)
    full = full.reshape(len(a.data), w)
    if domain == 'POINT':
        add = np.repeat(old[starts[src]], ecounts, axis=0)
        if name == 'radius':
            add = er[:, None]
        full[npt0:] = add
    else:
        add = old[src].copy()
        if name == 'nrm':
            add = enrm
        elif name == 'strlen':
            add = elen[:, None]
        full[nc0:] = add
    if name == 'pale':
        (full[npt0:] if domain == 'POINT' else full[nc0:])[:] = 1
    if name in ('cupm', 'pmask', 'pmaskt', 'ptail', 'earw'):
        (full[npt0:] if domain == 'POINT' else full[nc0:])[:] = 0
    a.data.foreach_set('vector' if w == 3 else 'value', full.ravel())
print('EDGE_FUR_APPENDED', dict(hairs=len(es), points=int(len(ep))), flush=True)
info.update(parent=str(before), strands=len(cu.curves), strandPoints=len(cu.points))
info['eyelinerTouchUp24'] = dict(cutStrands=len(cut), rootsCut=int(sum(1 for c in cut if c[1] == 0)),
                                 edgeFurHairs=int(len(es)), method='cut at the first point in front of a ribbon; 13h edge fur on the lower-lid skin sliver')
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
prior = dict(np.load(before / 'patch-evidence.npz'))
changed = np.zeros(len(starts), bool)
changed[cut_ids] = True
prior['changed24'] = changed
np.savez_compressed(out / 'patch-evidence.npz', **prior, cut24=np.array(cut, np.int32).reshape(-1, 2), **{k: v for k, v in patch.items()})
assert np.array_equal(np.repeat(~changed, counts), np.repeat(~changed, counts))
assert np.array_equal(rad[np.repeat(~changed, counts)], old_rad[np.repeat(~changed, counts)])
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('FIX24_SAVED', flush=True)
