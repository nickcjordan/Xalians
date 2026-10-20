"""Step 29c, on s12-29b.

1. The ear-base chunk is culled: the strands that the first 29b build culled as
   standing (more than 4 mm past the right ear's 95th percentile clearance; 339,
   read from s12-29b-try1 as the strands active in s12-29b and inactive there)
   get zero radius. Nick: "Can you just remove this little chunk".
2. The eyeliner gap is closed. 29a moved roots to 1.8 to 2.6 mm past the upper
   line's outer edge, which left a pale band of bare skin (Nick rejected that in
   F12a: "it's left a gap... cover that with hair"). Every 29a strand whose root
   lies more than 1.2 mm past the edge moves back in to 0.3 to 0.8 mm past it
   (same angle, back on the skin, whole strand translated). A strand that then
   crosses the ribbon is shortened along its own path to end before it; one left
   under MINLEN is culled. Any point that ends up in the skin is lifted out to
   just above it (as lift_out_fix.py).

  blender -b --python build_fix_29c.py -- <s12-29b dir> <out dir> <s12-29b-try1 dir>
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

IN0, IN1, FAR, STOP, MINLEN, CLEAR = .0003, .0008, .0012, .0004, .0012, .0004
before, out, try1 = map(Path, sys.argv[sys.argv.index('--') + 1:])
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


bpy.ops.wm.open_mainfile(filepath=str(try1 / 'surface.blend'))
_, st1, _, rad1 = curves()
act1 = np.maximum.reduceat(rad1, st1) > 0
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
ev = dict(np.load(before / 'patch-evidence.npz'))
cu, starts, P, rad = curves()
orig, rad0 = P.copy(), rad.copy()
counts = np.diff(np.r_[starts, len(P)])
assert len(st1) == len(starts)
act = np.maximum.reduceat(rad, starts) > 0
chunk = np.where(act & ~act1)[0]
chunk = chunk[chunk != 117825]
for i in chunk:
    rad[starts[i]:starts[i] + counts[i]] = 0
print('CHUNK_CULLED', len(chunk), flush=True)

dg = bpy.context.evaluated_depsgraph_get()
ribbons = sorted([o for o in bpy.data.objects if o.name.startswith(PREFIX)], key=lambda o: o.name)
rtrees = [BVHTree.FromObject(o, dg) for o in ribbons]
sbvh = BVHTree.FromObject(bpy.data.objects[info['skin']], dg)
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


rng = np.random.default_rng(291)
moved29a = np.where(ev['changed29a'])[0]
roots = P[starts]
redo = []
for ob in ribbons:
    V = np.array([ob.matrix_world @ v.co for v in ob.data.vertices])
    c = V.mean(0)
    ang = np.degrees(np.arctan2(V[:, 2] - c[2], V[:, 0] - c[0])) % 360
    rr = np.hypot(V[:, 0] - c[0], V[:, 2] - c[2])
    bins = np.array([rr[np.abs(((ang - (b * 5 + 2.5)) + 180) % 360 - 180) < 5].max(initial=0) for b in range(72)])
    sub = moved29a[np.linalg.norm(roots[moved29a] - c, axis=1) < .12]
    ra = np.degrees(np.arctan2(roots[sub, 2] - c[2], roots[sub, 0] - c[0])) % 360
    rd = np.hypot(roots[sub, 0] - c[0], roots[sub, 2] - c[2])
    rout = bins[(ra // 5).astype(int) % 72]
    for i, a_, d_, ro in zip(sub, ra, rd, rout):
        if ro <= 0 or d_ < ro + FAR or rad[starts[i]:starts[i] + counts[i]].max() <= 0:
            continue
        th = np.radians(a_)
        rt = ro + rng.uniform(IN0, IN1)
        hit = sbvh.ray_cast(Vector((c[0] + rt * np.cos(th), roots[i, 1] - .03, c[2] + rt * np.sin(th))), Vector((0, 1, 0)), .08)
        if hit[0] is None:
            continue
        s, n = starts[i], counts[i]
        P[s:s + n] = orig[s:s + n] + (np.array(hit[0]) - roots[i])
        redo.append(i)
shortened = culled = lifted = 0
for i in redo:
    s, n = starts[i], counts[i]
    path = P[s:s + n].astype(float)
    j = first_hit(path)
    if j is not None:
        arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
        keep = 0.0
        if j > 0:
            keep = arc[j - 1] - STOP
            for f in np.linspace(1, 0, 11):
                q = path[j - 1] + (path[j] - path[j - 1]) * f
                if first_hit([q]) is None:
                    keep = arc[j - 1] + (arc[j] - arc[j - 1]) * f - STOP
                    break
        if keep < MINLEN:
            rad[s:s + n] = 0
            culled += 1
            continue
        target = np.linspace(0, keep, n)
        P[s:s + n] = np.column_stack([np.interp(target, arc, path[:, k]) for k in range(3)])
        shortened += 1
    for _ in range(3):  # lift any point that went into the skin
        again = False
        for k in range(1, n):
            a, q = P[s + k - 1].astype(float), P[s + k].astype(float)
            loc, nn, _, _ = sbvh.find_nearest(Vector(q))
            loc, nn = np.array(loc), np.array(nn)
            b = q - a
            ln = np.linalg.norm(b)
            crosses = ln > 1e-7 and sbvh.ray_cast(Vector(a + b / ln * 1e-4), Vector(b / ln), max(0, ln - 2e-4))[0] is not None
            if np.dot(q - loc, nn) < CLEAR * .5 or crosses:
                P[s + k] = loc + nn * CLEAR
                lifted += 1
                again = True
        if not again:
            break
cu.points.foreach_set('position', P.ravel())
cu.attributes['radius'].data.foreach_set('value', rad)
changed = np.zeros(len(starts), bool)
changed[chunk] = True
changed[redo] = True
keep_pts = np.repeat(~changed, counts)
assert np.array_equal(P[keep_pts], orig[keep_pts]) and np.array_equal(rad[keep_pts], rad0[keep_pts])
rep = dict(chunkCulled=int(len(chunk)), linerMovedIn=len(redo), shortened=shortened, culled=culled, liftedPoints=lifted,
           band=[IN0, IN1])
print('FIX29C', rep, flush=True)
info.update(parent=str(before))
info['step29c'] = rep
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
ev['changed29c'] = changed
np.savez_compressed(out / 'patch-evidence.npz', **ev)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('FIX29C_SAVED', flush=True)
