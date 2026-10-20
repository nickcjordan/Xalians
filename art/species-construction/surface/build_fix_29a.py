"""Step 29a: the fur around the upper eyeliner starts just outside the line.

Nick (on 24): "its better but you can still see the root of the hair above the eye
liner, just scoot the hairs out a bit more."

For each G1 ribbon, the front view (x, z) outline is binned by angle around the
ribbon's center: rOut(angle) is the ribbon's outer edge. Native strands whose
root, seen from the front, lies on the ribbon or within MARGIN of its outer edge
over the upper line (angles from -LOW to 180 + LOW, which takes in the outer
end) are moved outward: the root goes to rOut + MARGIN + jitter along its own
angle, back onto the skin (ray along +y), and the whole strand is translated with
it (shape unchanged). Strands that step 24 cut at the ribbon get their s12-23
radii back first. Then every candidate whose path still passes in front of a
ribbon (the 24 ray test) is shortened along its own path to end STOP before the
first hit, so it keeps its taper instead of a blunt cut; one left shorter than
MINLEN is culled (zero radius), which removes the white stubs at the outer end of
the line. The lower line (13h edge fur, appended strands) is not touched.

  blender -b --python build_fix_29a.py -- <s12-27 dir> <out dir> <s12-23 dir>
"""
import sys
import json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
from clip_ribbon_fur_13h import PREFIX

MARGIN, JITTER, LOW, STOP, MINLEN = .0018, .0008, 25.0, .0004, .0025
before, out, base23 = map(Path, sys.argv[sys.argv.index('--') + 1:])
assert not (out / 'surface.blend').exists()
out.mkdir(parents=True, exist_ok=True)


def curves():
    cu = bpy.data.objects['Akinza fur'].data
    st = np.empty(len(cu.curves), np.int32)
    cu.curves.foreach_get('first_point_index', st)
    P = np.empty(len(cu.points) * 3, np.float32)
    cu.points.foreach_get('position', P)
    rad = np.empty(len(cu.points), np.float32)
    cu.attributes['radius'].data.foreach_get('value', rad)
    return cu, st, P.reshape(-1, 3), rad


bpy.ops.wm.open_mainfile(filepath=str(base23 / 'surface.blend'))
_, st23, _, rad23 = curves()
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
ev = dict(np.load(before / 'patch-evidence.npz'))
cu, starts, P, rad = curves()
orig, rad0 = P.copy(), rad.copy()
counts = np.diff(np.r_[starts, len(P)])
nrm = np.empty(len(starts) * 3, np.float32)
cu.attributes['nrm'].data.foreach_get('vector', nrm)
nrm = nrm.reshape(-1, 3)
NATIVE = int(info['originalFurStrands'])
dg = bpy.context.evaluated_depsgraph_get()
ribbons = sorted([o for o in bpy.data.objects if o.name.startswith(PREFIX)], key=lambda o: o.name)
assert len(ribbons) == 2
rtrees = [BVHTree.FromObject(o, dg) for o in ribbons]
skin = bpy.data.objects[info['skin']]
sbvh = BVHTree.FromObject(skin, dg)
dirs = []
for az, el in ((0, 2), (0, 3), (35, 8)):
    a, e = np.radians(az), np.radians(el)
    dirs.append(-np.array((np.sin(a) * np.cos(e), -np.cos(a) * np.cos(e), np.sin(e))))


def first_hit(path):
    for j, p in enumerate(path):
        for d in dirs:
            for t in rtrees:
                if t.ray_cast(Vector(p), Vector(d), .03)[0] is not None:
                    return j
    return None


rng = np.random.default_rng(29)
cut24 = {int(i) for i, _ in ev['cut24']}
cand = np.zeros(len(starts), bool)
moved = culled = shortened = restored = 0
roots = P[starts]
for ob in ribbons:
    V = np.array([ob.matrix_world @ v.co for v in ob.data.vertices])
    c = V.mean(0)
    ang = np.degrees(np.arctan2(V[:, 2] - c[2], V[:, 0] - c[0])) % 360
    rr = np.hypot(V[:, 0] - c[0], V[:, 2] - c[2])
    bins = np.zeros(72)
    for b in range(72):
        sel = np.abs(((ang - (b * 5 + 2.5)) + 180) % 360 - 180) < 5
        bins[b] = rr[sel].max() if sel.any() else 0
    ra = np.degrees(np.arctan2(roots[:, 2] - c[2], roots[:, 0] - c[0])) % 360
    rd = np.hypot(roots[:, 0] - c[0], roots[:, 2] - c[2])
    rout = bins[(ra // 5).astype(int) % 72]
    upper = (ra <= 180 + LOW) | (ra >= 360 - LOW)
    near3d = np.linalg.norm(roots - c, axis=1) < .12  # the cartoon eye is large: rOut is 4.8 to 7.4 cm
    front = nrm[:, 1] < -.3  # roots on front-facing skin (the ribbon itself sits in front of the skin)
    ring = (rout > 0) & (rd < rout + MARGIN)
    nat = np.arange(len(starts)) < NATIVE
    sel = np.where(upper & near3d & front & ring & nat & (np.maximum.reduceat(rad, starts) > 0) | (upper & near3d & ring & nat & np.isin(np.arange(len(starts)), list(cut24))))[0]
    print('RIBBON', ob.name, dict(upper=int(upper.sum()), near3d=int(near3d.sum()), front=int((front & near3d).sum()),
                                  ring=int((ring & near3d).sum()), candidates=len(sel), center=c.round(4).tolist(),
                                  rOut=[float(bins.min()), float(bins.max())]), flush=True)
    for i in sel:
        s, n = starts[i], counts[i]
        if i in cut24:
            rad[s:s + n] = rad23[st23[i]:st23[i] + n]
            restored += 1
        if rad[s:s + n].max() <= 0:
            continue
        th = np.radians(ra[i])
        rt = rout[i] + MARGIN + rng.uniform(0, JITTER)
        x, z = c[0] + rt * np.cos(th), c[2] + rt * np.sin(th)
        hit = sbvh.ray_cast(Vector((x, roots[i, 1] - .03, z)), Vector((0, 1, 0)), .08)
        if hit[0] is None:
            continue
        P[s:s + n] = orig[s:s + n] + (np.array(hit[0]) - roots[i])
        cand[i] = True
        moved += 1
# shorten or cull every candidate and every 24-cut strand that still crosses a ribbon
for i in sorted(set(np.where(cand)[0]) | {i for i in cut24 if i < NATIVE}):
    s, n = starts[i], counts[i]
    if i in cut24 and not cand[i]:
        rad[s:s + n] = rad23[st23[i]:st23[i] + n]
        restored += 1
    path = P[s:s + n].astype(float)
    j = first_hit(path)
    if j is None:
        cand[i] = True
        continue
    arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
    keep = arc[j] - STOP if j > 0 else 0.0
    if j > 0:  # back off to where the segment into the hit point first meets the ribbon
        for f in np.linspace(1, 0, 11):
            q = path[j - 1] + (path[j] - path[j - 1]) * f
            if first_hit([q]) is None:
                keep = arc[j - 1] + (arc[j] - arc[j - 1]) * f - STOP
                break
    cand[i] = True
    if keep < MINLEN:
        rad[s:s + n] = 0
        culled += 1
        continue
    target = np.linspace(0, keep, n)
    P[s:s + n] = np.column_stack([np.interp(target, arc, path[:, k]) for k in range(3)])
    shortened += 1
cu.points.foreach_set('position', P.ravel())
cu.attributes['radius'].data.foreach_set('value', rad)
keep_pts = np.repeat(~cand, counts)
assert np.array_equal(P[keep_pts], orig[keep_pts]) and np.array_equal(rad[keep_pts], rad0[keep_pts])
rep = dict(moved=moved, restored24=restored, shortened=shortened, culled=culled, changed=int(cand.sum()),
           margin=MARGIN, jitter=JITTER)
print('FIX29A', rep, flush=True)
info.update(parent=str(before))
info['eyeliner29a'] = rep
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
ev['changed29a'] = cand
np.savez_compressed(out / 'patch-evidence.npz', **ev)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('FIX29A_SAVED', flush=True)
