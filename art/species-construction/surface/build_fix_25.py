"""Step 25: blend the ear-back direction fields across the part line.

Ear-back strands (native, rooted on ear skin facing back) each get their lie
direction in the root's tangent plane. The field is smoothed over 10 mm
neighborhoods (three passes); a strand turns toward the smoothed direction only
where its neighborhood disagrees (direction spread), so the seam where two
fields meet closes and the rest of the ear back stays as it is. Turning is a
rotation of the whole strand about its root normal: length, shape, taper and
color are unchanged (the 13i ear-back lengths stay exactly). A turned strand
that would touch the skin is turned less, then left alone.

  blender -b --python build_fix_25.py -- <s12-24 dir> <out dir>
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
earw = np.empty(len(co), np.float32)
skin.data.attributes['earw'].data.foreach_get('value', earw)
bvh = BVHTree.FromObject(skin, bpy.context.evaluated_depsgraph_get())
stree = KDTree(len(co))
for i, q in enumerate(co):
    stree.insert(Vector(q), i)
stree.balance()

cu = bpy.data.objects['Akinza fur'].data
NATIVE = 420420
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
cand = np.where(active[:NATIVE] & (np.abs(roots[:NATIVE, 0]) > .14) & (roots[:NATIVE, 2] > .65) & (nrm[:NATIVE, 1] > .2))[0]
cand = np.array([i for i in cand if earw[stree.find(Vector(roots[i]))[1]] > .9])
n = nrm[cand] / np.linalg.norm(nrm[cand], axis=1, keepdims=True)
tipv = P[starts[cand] + counts[cand] - 1] - roots[cand]
d = tipv - n * np.sum(tipv * n, axis=1, keepdims=True)
ok = np.linalg.norm(d, axis=1) > 1e-5
cand, n, d = cand[ok], n[ok], d[ok]
d /= np.linalg.norm(d, axis=1, keepdims=True)
print('EAR_BACK_STRANDS', len(cand), flush=True)
kd = KDTree(len(cand))
for k, i in enumerate(cand):
    kd.insert(Vector(roots[i]), k)
kd.balance()
nbrs = [np.array([j for _, j, _ in kd.find_range(Vector(roots[i]), .010)]) for i in cand]
spread = np.array([1 - np.linalg.norm(d[nb].mean(0)) for nb in nbrs])
sm = d.copy()
for _ in range(3):
    nxt = np.array([sm[nb].mean(0) for nb in nbrs])
    nxt -= n * np.sum(nxt * n, axis=1, keepdims=True)
    sm = nxt / np.maximum(np.linalg.norm(nxt, axis=1, keepdims=True), 1e-9)


def smooth(v):
    v = np.clip(v, 0, 1)
    return v * v * (3 - 2 * v)


w = smooth((spread - .04) / .12)
ang = np.arctan2(np.sum(np.cross(d, sm) * n, axis=1), np.sum(d * sm, axis=1))
ang = np.clip(ang, -np.radians(70), np.radians(70)) * w


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
turned = held = 0
for k, i in enumerate(cand):
    if abs(ang[k]) < np.radians(3):
        continue
    s, c = starts[i], counts[i]
    off = orig[s:s + c] - roots[i]
    for f in (1, .6, .3):
        R = np.array(Matrix.Rotation(float(ang[k] * f), 3, Vector(n[k])))
        path = roots[i] + off @ R.T
        if not collides(path):
            P[s:s + c] = path
            changed[i] = True
            turned += 1
            break
    else:
        held += 1
cu.points.foreach_set('position', P.ravel())
own = np.ones(len(P), bool)
own[starts + counts - 1] = False  # a strand's last point: its diff jumps to the next strand
L0 = np.add.reduceat(np.r_[np.linalg.norm(np.diff(orig, axis=0), axis=1), 0] * own, starts)
L1 = np.add.reduceat(np.r_[np.linalg.norm(np.diff(P, axis=0), axis=1), 0] * own, starts)
assert np.allclose(L0[changed], L1[changed], atol=2e-5), 'Lengths must be unchanged'
assert np.array_equal(P[np.repeat(~changed, counts)], orig[np.repeat(~changed, counts)])
print('PART_LINE', dict(turned=turned, keptOnCollision=held, meanTurnDeg=float(np.degrees(np.abs(ang[np.abs(ang) >= np.radians(3)])).mean()) if (np.abs(ang) >= np.radians(3)).any() else 0,
                        highSpread=int((spread > .1).sum())), flush=True)
info.update(parent=str(before))
info['earBackPart25'] = dict(strands=len(cand), turned=turned, keptOnCollision=held, neighborhood=.010, passes=3,
                             method='rotate about root normal toward the smoothed field where the neighborhood spread is high; length exact')
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
prior = dict(np.load(before / 'patch-evidence.npz'))
prior['changed25'] = changed
np.savez_compressed(out / 'patch-evidence.npz', **prior)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('FIX25_SAVED', flush=True)
