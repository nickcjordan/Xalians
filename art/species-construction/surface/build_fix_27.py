"""Step 27: sole edges. Stray pointed hairs on the hind soles are laid down.

Sole strands (the 12d sole mask: roots below z -.91, facing down, solef > .5)
are compared with their sole neighbors (within 6 mm). A strand is a stray when
it stands up from the skin much more steeply than its neighbors (elevation
over 35 degrees and 15 degrees above the neighbor median) or reaches past
1.4 times their median length. A stray is rotated down toward the skin, to the
neighbor median elevation, and trimmed to 1.2 times the neighbor median length.
Pads carry no strands (7c), and the fringe keeps its own direction and length
because only outliers against it change.

  blender -b --python build_fix_27.py -- <before dir> <out dir>
"""
import sys
import json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

before, out = map(Path, sys.argv[sys.argv.index('--') + 1:])
assert not (out / 'surface.blend').exists()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
skin = bpy.data.objects[info['skin']]
co = np.empty(len(skin.data.vertices) * 3, np.float32)
skin.data.vertices.foreach_get('co', co)
co = co.reshape(-1, 3)
solef = np.empty(len(co), np.float32)
skin.data.attributes['solef'].data.foreach_get('value', solef)
bvh = BVHTree.FromObject(skin, bpy.context.evaluated_depsgraph_get())
stree = KDTree(len(co))
for i, q in enumerate(co):
    stree.insert(Vector(q), i)
stree.balance()
cu = bpy.data.objects['Akinza fur'].data
starts = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', starts)
P = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', P)
P = P.reshape(-1, 3)
orig = P.copy()
counts = np.diff(np.r_[starts, len(P)])
rad = np.empty(len(P), np.float32)
cu.attributes['radius'].data.foreach_get('value', rad)
nrm = np.empty(len(starts) * 3, np.float32)
cu.attributes['nrm'].data.foreach_get('vector', nrm)
nrm = nrm.reshape(-1, 3)
active = np.maximum.reduceat(rad, starts) > 0
roots = P[starts]
cand = np.where(active & (roots[:, 2] < -.91) & (nrm[:, 2] < -.25))[0]
cand = np.array([i for i in cand if solef[stree.find(Vector(roots[i]))[1]] > .5])
n = nrm[cand] / np.linalg.norm(nrm[cand], axis=1, keepdims=True)
tip = P[starts[cand] + counts[cand] - 1] - roots[cand]
L = np.add.reduceat(np.r_[np.linalg.norm(np.diff(P, axis=0), axis=1), 0], starts)
L[starts + counts - 1 < starts] = 0
Lc = np.array([np.linalg.norm(np.diff(P[starts[i]:starts[i] + counts[i]], axis=0), axis=1).sum() for i in cand])
elev = np.degrees(np.arcsin(np.clip(np.sum(tip * n, axis=1) / np.maximum(np.linalg.norm(tip, axis=1), 1e-9), -1, 1)))
kd = KDTree(len(cand))
for k, i in enumerate(cand):
    kd.insert(Vector(roots[i]), k)
kd.balance()


def collides(path):
    for a, b in zip(path[:-1], path[1:]):
        delta = b - a
        ln = np.linalg.norm(delta)
        if ln > 1e-7:
            eps = min(.0002, ln * .15)
            if bvh.ray_cast(Vector(a + delta / ln * eps), Vector(delta / ln), max(0, ln - 2 * eps))[0] is not None:
                return True
        for q in (b, (a + b) * .5):
            hit = bvh.find_nearest(Vector(q))
            if np.dot(q - np.array(hit[0]), np.array(hit[1])) < -.0001:
                return True
    return False


changed = np.zeros(len(starts), bool)
laid = trimmed = held = 0
for k, i in enumerate(cand):
    nb = [j for _, j, _ in kd.find_range(Vector(roots[i]), .006) if j != k]
    if len(nb) < 5:
        continue
    me, ml = np.median(elev[nb]), np.median(Lc[nb])
    steep = elev[k] > 35 and elev[k] > me + 15
    long = Lc[k] > 1.4 * ml
    if not (steep or long):
        continue
    s, c = starts[i], counts[i]
    off = orig[s:s + c] - roots[i]
    path = off.copy()
    if steep:
        flat = tip[k] - n[k] * np.dot(tip[k], n[k])
        axis = np.cross(n[k], flat)
        if np.linalg.norm(axis) > 1e-9:
            R = np.array(Matrix.Rotation(-np.radians(elev[k] - max(me, 5)), 3, Vector(axis / np.linalg.norm(axis))))
            path = path @ R.T
    if long:
        arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
        target = np.linspace(0, min(arc[-1], 1.2 * ml), c)
        path = np.column_stack([np.interp(target, arc, path[:, q]) for q in range(3)])
    path = roots[i] + path
    if collides(path):
        held += 1
        continue
    P[s:s + c] = path
    changed[i] = True
    laid += steep
    trimmed += long
cu.points.foreach_set('position', P.ravel())
keep = np.repeat(~changed, counts)
assert np.array_equal(P[keep], orig[keep])
print('SOLES27', dict(soleStrands=len(cand), laid=int(laid), trimmed=int(trimmed), keptOnCollision=held), flush=True)
info.update(parent=str(before))
info['soles27'] = dict(soleStrands=len(cand), laid=int(laid), trimmed=int(trimmed), keptOnCollision=held)
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
prior = dict(np.load(before / 'patch-evidence.npz'))
prior['changed27'] = changed
np.savez_compressed(out / 'patch-evidence.npz', **prior)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('FIX27_SAVED', flush=True)
