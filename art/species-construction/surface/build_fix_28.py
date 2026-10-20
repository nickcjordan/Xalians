"""Step 28: the fur follows the filled ear base (ear base v1, earbase_v1_post.py).

The skin's vertices take the post step's positions (same vertex order; the surface
skin must equal the step's input exactly). Every strand whose root lies on a face
with a moved vertex is re-attached: its root moves with the surface (barycentric
on its face) and its whole shape turns with the rotation from the old to the new
face normal, so its offset along the normal and its shape relative to the root are
kept; nothing is regroomed. Strands rooted elsewhere are byte-identical (asserted).

Fix 1 (mode field): the root-only carry left hair lying over the fill under the
raised skin (gate: 103 carried and 282 neighboring strands newly through the skin).
In field mode every strand point instead moves by the skin displacement at its
nearest point on the old skin (barycentric on that face), so each point keeps its
offset along the surface; a point whose nearest face did not move is unchanged
byte for byte. Strands rooted outside the region keep their roots exactly; only
their points that lie over the fill rise (counted and reported).

  blender -b --python build_fix_28.py -- <before dir> <out dir> <earbase-v1-positions.npz> [field]
"""
import sys
import json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:]
before, out, pos = map(Path, argv[:3])
FIELD = argv[3:] == ['field']
assert not (out / 'surface.blend').exists()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
skin = bpy.data.objects[info['skin']]
assert np.allclose(np.array(skin.matrix_world), np.eye(4))
me = skin.data
nv = len(me.vertices)
co = np.empty(nv * 3, np.float32)
me.vertices.foreach_get('co', co)
co = co.reshape(-1, 3)
z = np.load(pos)
A, B = z['before'], z['after']
assert len(A) == nv and np.abs(co - A).max() < 1e-6, 'surface skin is not the post step input'
moved_v = np.linalg.norm(B - A, axis=1) > 0
me.calc_loop_triangles()
tri = np.empty(len(me.loop_triangles) * 3, np.int64)
me.loop_triangles.foreach_get('vertices', tri)
tri = tri.reshape(-1, 3)
bvh = BVHTree.FromPolygons([Vector(v) for v in A], tri.tolist(), all_triangles=True)

cu = bpy.data.objects['Akinza fur'].data
starts = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', starts)
P = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', P)
P = P.reshape(-1, 3)
orig = P.copy()
counts = np.diff(np.r_[starts, len(P)])
roots = P[starts]
lo, hi = A[moved_v].min(0) - .06, A[moved_v].max(0) + .06
near = np.where(np.all((roots > lo) & (roots < hi), axis=1))[0]


def fnormal(V, t):
    n = np.cross(V[t[1]] - V[t[0]], V[t[2]] - V[t[0]])
    return n / np.linalg.norm(n)


def rot(a, b):
    v, c = np.cross(a, b), float(np.dot(a, b))
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K / (1 + c)


changed = np.zeros(len(starts), bool)
maxroot = 0.0


def bary_delta(q):
    loc, _, f, dist = bvh.find_nearest(Vector(q))
    t = tri[f]
    if not moved_v[t].any():
        return None, t
    a = A[t[0]]
    v0, v1, v2 = A[t[1]] - a, A[t[2]] - a, np.array(loc) - a
    d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
    den = d00 * d11 - d01 * d01
    bv, bw = (d11 * d20 - d01 * d21) / den, (d00 * d21 - d01 * d20) / den
    return np.array([1 - bv - bw, bv, bw]) @ (B[t] - A[t]), t


if FIELD:
    rootmoved = np.zeros(len(starts), bool)
    near_pts = np.where(np.all((P > lo) & (P < hi), axis=1))[0]
    owner = np.searchsorted(starts, near_pts, side='right') - 1
    moved_pts = 0
    for q, i in zip(near_pts, owner):
        dlt, _ = bary_delta(orig[q])
        if dlt is None:
            continue
        P[q] = orig[q] + dlt
        changed[i] = True
        moved_pts += 1
        if q == starts[i]:
            rootmoved[i] = True
            maxroot = max(maxroot, float(np.linalg.norm(dlt)))
    print('FIELD28', dict(pointsMoved=moved_pts, strands=int(changed.sum()), rootsMoved=int(rootmoved.sum()),
                          tipOnlyStrands=int((changed & ~rootmoved).sum())), flush=True)
else:
    for i in near:
        dlt, t = bary_delta(roots[i])
        if dlt is None:
            continue
        R = rot(fnormal(A, t), fnormal(B, t))
        s, n = starts[i], counts[i]
        P[s:s + n] = (roots[i] + dlt) + (orig[s:s + n] - roots[i]) @ R.T
        changed[i] = True
        maxroot = max(maxroot, float(np.linalg.norm(dlt)))
me.vertices.foreach_set('co', B.astype(np.float32).ravel())
me.update()
cu.points.foreach_set('position', P.ravel())
keep = np.repeat(~changed, counts)
assert np.array_equal(P[keep], orig[keep]), 'strands rooted outside the region must be byte-identical'
print('FIX28', dict(movedVertices=int(moved_v.sum()), strandsReattached=int(changed.sum()), maxRootMove=maxroot), flush=True)
info.update(parent=str(before))
info['earBase28'] = dict(mode='field' if FIELD else 'root', positions=str(pos), movedVertices=int(moved_v.sum()), strandsReattached=int(changed.sum()), maxRootMove=maxroot,
                         method='skin to ear base v1; strands on moved faces carried by barycentric root delta and the face-normal rotation')
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
prior = dict(np.load(before / 'patch-evidence.npz'))
prior['changed28'] = changed
np.savez_compressed(out / 'patch-evidence.npz', **prior)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('FIX28_SAVED', flush=True)
