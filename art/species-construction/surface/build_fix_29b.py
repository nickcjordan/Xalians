"""Step 29b: the chunk above the left ear base lies down into the fan.

Nick (on 28-ear-base.png): "Can you just remove this little chunk or flatten it
out to make it look like the rest of the fan out section of hair?"

The chunk (step 28 diagnosis) is poof and native hairs standing off the skin
above the left ear base: there the natives rise at a median 16 degrees and the
poof at 25, against 11 and 19 at the same place on the right ear, which reads
clean. So the right ear is the template. Every active strand (native or poof)
rooted within R_OUT of the left chunk center turns rigidly about its root toward
the mirrored mean direction of its K nearest same-kind strands on the right ear
(mirrored roots, mirrored directions): the same fan direction and the same lie.
The turn is full inside R_IN and fades to none at R_OUT. Length, shape, taper and
color attributes are unchanged. A turn that would put the strand through the skin
is reduced, then skipped. (A first build also culled strands standing more than
4 mm past the template's 95th percentile clearance: 339 of 694, which would thin
the poof, so the fix pass culls nothing for standing; the turn alone brings the
lie to the template.) The stray hooked hair above the ear edge (strand 117825, 78 mm, kinks
up past the ear and back) is culled.

  blender -b --python build_fix_29b.py -- <before dir> <out dir>
"""
import sys
import json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

CENTER = np.array([-.19, -.01, .755])
R_IN, R_OUT, K, STAND, STRAY = .015, .027, 6, .004, 117825
before, out = map(Path, sys.argv[sys.argv.index('--') + 1:])
assert not (out / 'surface.blend').exists()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
ev = dict(np.load(before / 'patch-evidence.npz'))
skin = bpy.data.objects[info['skin']]
dg = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(skin, dg)
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
rad0 = rad.copy()
nrm = np.empty(len(starts) * 3, np.float32)
cu.attributes['nrm'].data.foreach_get('vector', nrm)
nrm = nrm.reshape(-1, 3)
nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
NATIVE = int(info['originalFurStrands'])
POOF_END = NATIVE + len(ev['poofSource'])
active = np.maximum.reduceat(rad, starts) > 0
roots = P[starts]
tipv = P[starts + counts - 1] - roots
unit = tipv / np.maximum(np.linalg.norm(tipv, axis=1, keepdims=True), 1e-9)
ids = np.arange(len(starts))
kind = np.where(ids < NATIVE, 0, np.where(ids < POOF_END, 1, 2))
mirror = np.array([-1., 1., 1.])


def clearance(i, path=None):
    path = P[starts[i]:starts[i] + counts[i]] if path is None else path
    return max(np.linalg.norm(np.array(bvh.find_nearest(Vector(q))[0]) - q) for q in path)


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


dist = np.linalg.norm(roots - CENTER, axis=1)
region = np.where(active & (kind < 2) & (dist < R_OUT))[0]
tmpl_c = CENTER * mirror
tmpl = {k: np.where(active & (kind == k) & (np.linalg.norm(roots - tmpl_c, axis=1) < R_OUT + .01))[0] for k in (0, 1)}
trees = {}
for k, sel in tmpl.items():
    t = KDTree(len(sel))
    for q, i in enumerate(sel):
        t.insert(Vector(roots[i] * mirror), q)
    t.balance()
    trees[k] = t
tclear = np.array([clearance(i) for i in np.r_[tmpl[0], tmpl[1]]])
limit = np.percentile(tclear, 95) + STAND
before_clear = np.array([clearance(i) for i in region])
changed = np.zeros(len(starts), bool)
turned = skipped = culled = 0
for i in region:
    sel = tmpl[kind[i]]
    nb = [sel[q] for _, q, _ in trees[kind[i]].find_n(Vector(roots[i]), K)]
    target = (unit[nb] * mirror).mean(0)
    target /= np.linalg.norm(target)
    t = np.clip((R_OUT - dist[i]) / (R_OUT - R_IN), 0, 1)
    w = t * t * (3 - 2 * t)
    axis = np.cross(unit[i], target)
    sn, cs = np.linalg.norm(axis), float(np.dot(unit[i], target))
    if sn < 1e-6 or w <= 0:
        continue
    ang = np.arctan2(sn, cs) * w
    s, n = starts[i], counts[i]
    off = orig[s:s + n] - roots[i]
    for f in (1, .7, .4):
        R = np.array(Matrix.Rotation(float(ang * f), 3, Vector(axis / sn)))
        path = roots[i] + off @ R.T
        if not collides(path):
            P[s:s + n] = path
            changed[i] = True
            turned += 1
            break
    else:
        skipped += 1
after_clear = np.array([clearance(i) for i in region])
stand = region[:0]  # no stand-off cull (fix pass)
for i in list(stand) + [STRAY]:
    rad[starts[i]:starts[i] + counts[i]] = 0
    changed[i] = True
culled = len(stand) + 1
cu.points.foreach_set('position', P.ravel())
cu.attributes['radius'].data.foreach_set('value', rad)
keep = np.repeat(~changed, counts)
assert np.array_equal(P[keep], orig[keep]) and np.array_equal(rad[keep], rad0[keep])
reg_nat, reg_poof = kind[region] == 0, kind[region] == 1


def elev(sel_ids, PP):
    tv = PP[starts[sel_ids] + counts[sel_ids] - 1] - PP[starts[sel_ids]]
    return np.degrees(np.arcsin(np.clip(np.sum(tv * nrm[sel_ids], 1) / np.maximum(np.linalg.norm(tv, axis=1), 1e-9), -1, 1)))


rep = dict(region=len(region), turned=turned, skippedOnCollision=skipped, culledStanding=len(stand), culledStray=STRAY,
           clearanceLimit=float(limit),
           clearanceBefore=np.percentile(before_clear, [50, 90, 99]).round(4).tolist(),
           clearanceAfter=np.percentile(after_clear, [50, 90, 99]).round(4).tolist(),
           elevNativeBeforeAfter=[float(np.median(elev(region[reg_nat], orig))), float(np.median(elev(region[reg_nat], P)))],
           elevPoofBeforeAfter=[float(np.median(elev(region[reg_poof], orig))), float(np.median(elev(region[reg_poof], P)))],
           elevTemplateNativePoof=[float(np.median(elev(tmpl[0], orig))), float(np.median(elev(tmpl[1], orig)))])
print('FIX29B', rep, flush=True)
info.update(parent=str(before))
info['earBaseChunk29b'] = rep
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
ev['changed29b'] = changed
np.savez_compressed(out / 'patch-evidence.npz', **ev)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('FIX29B_SAVED', flush=True)
