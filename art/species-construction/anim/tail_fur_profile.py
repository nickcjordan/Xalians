"""Akinza clip set batch 2, faint fix pass 8: the tail plumes' fur envelope per tail bone, for the faint bake to rest each tail
on its fur (akinza_clipset_b2.drape_tail_dirs). Blender (run_blender.py), no render:

  run_blender.py tail_fur_profile.py <log> -- <surface dir> <rig dir> <out json> [--bin-mm 10] [--min-points 10]

Opens the surface's surface.blend (the skin and the fur of record, as clip_frames.py --look fur does), takes each strand's root
bone as clip_frames.py does (the strongest bone of its root triangle's first vertex, the triangle nearest the root), and, per
tail bone (tail_a1 to tail_c5), measures the rest fur and skin in the bone's rest frame: s along the bone from its head (rig
metres; the fur runs past the bone's end) and r, the distance from the bone's line. Per bin of s: the largest r of the fur
(live strands only), and of the skin weighted mostly to that bone (the nearest bin's where the fur runs past the skin). The fur
follows its root triangle rigidly (fur_bind), so posed, a bin's ring of radius r about the bone's line reaches lowest at
r * sqrt(1 - dz^2) under the line (dz the bone's world direction's height share); the bake reads it that way.
Writes {bone: {'L': bone length, 'bins': [[s0, s1, r_fur, r_skin, n], ...]}, 'source': ...}.
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('surface', type=Path)
p.add_argument('rig', type=Path)
p.add_argument('out', type=Path)
p.add_argument('--bin-mm', type=float, default=10.)
p.add_argument('--min-points', type=int, default=10)
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])

rig = json.loads((a.rig/'rig.json').read_text())
J = json.loads((a.rig/'joints.json').read_text())
s_, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
idx = np.load(a.rig/'weights.npz')['idx'].astype(int)
to_m = lambda X: s_*(X-off)  # noqa: E731

bpy.ops.wm.open_mainfile(filepath=str(a.surface/'surface.blend'))
skin = bpy.data.objects['akinza_continuous_construction']
fur = bpy.data.objects['Akinza fur']
c = np.empty(len(skin.data.vertices)*3, np.float32)
skin.data.vertices.foreach_get('co', c)
m = np.array(skin.matrix_world)
skin_rest = c.reshape(-1, 3).astype(np.float64)@m[:3, :3].T+m[:3, 3]
skin.data.calc_loop_triangles()
tri = np.empty(len(skin.data.loop_triangles)*3, np.int32)
skin.data.loop_triangles.foreach_get('vertices', tri)
tri = tri.reshape(-1, 3)
fm = np.array(fur.matrix_world)
pts = np.empty(len(fur.data.points)*3, np.float32)
fur.data.attributes['position'].data.foreach_get('vector', pts)
pts = pts.reshape(-1, 3).astype(np.float64)@fm[:3, :3].T+fm[:3, 3]
offs = np.empty(len(fur.data.curves)+1, np.int32)
fur.data.curve_offset_data.foreach_get('value', offs)
roots = pts[offs[:-1]]
bvh = BVHTree.FromPolygons(skin_rest.tolist(), tri.tolist(), all_triangles=True)
tri_of = np.array([bvh.find_nearest(r)[2] for r in roots], np.int64)
names = rc.ANIM_NAMES
root_bone = np.array([names[b] for b in idx[:, 0][tri[tri_of][:, 0]]])
seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
seg[offs[1:-1]-1] = 0
live = np.add.reduceat(np.r_[seg, 0.], offs[:-1]) > 1e-6        # culled strands of the fur of record are zero length
curve_of = np.repeat(np.arange(len(roots)), np.diff(offs))
P = to_m(pts)
S = to_m(skin_rest)
vbone = np.array([names[b] for b in idx[:, 0]])
BO = {b: (h, t) for b, _, h, t in rc.ANIM_BONES}
w = a.bin_mm/1000
out = dict(source=dict(surface=str(a.surface), rig=str(a.rig), bin_mm=a.bin_mm, min_points=a.min_points,
                       rule='per tail bone: the fur of strands rooted on it (live), and its skin (strongest bone), in its rest frame'))
for tn in rc.TAILS:
    for k in range(1, rc.TAIL_BONES+1):
        b = f'tail_{tn}{k}'
        h, t = BO[b]
        H, T = np.array(J[h], float), np.array(J[t], float)
        L = float(np.linalg.norm(T-H))
        ax = (T-H)/L

        def sr(X):
            s = (X-H)@ax
            return s, np.linalg.norm(X-H-np.outer(s, ax), axis=1)
        fs, fr = sr(P[(root_bone[curve_of] == b) & live[curve_of]])
        ks, kr = sr(S[vbone == b])
        edges = np.arange(np.floor(fs.min()/w)*w, fs.max()+w, w)
        bins = []
        for s0 in edges[:-1]:
            mf = (fs >= s0) & (fs < s0+w)
            if mf.sum() < a.min_points:
                continue
            mk = (ks >= s0) & (ks < s0+w)
            rk = float(kr[mk].max()) if mk.any() else None
            bins.append([round(float(s0), 4), round(float(s0+w), 4), round(float(fr[mf].max()), 4), rk, int(mf.sum())])
        known = [i for i, x in enumerate(bins) if x[3] is not None]
        for i, x in enumerate(bins):
            if x[3] is None:
                x[3] = bins[min(known, key=lambda j: abs(j-i))][3]
            x[3] = round(x[3], 4)
        out[b] = dict(L=round(L, 4), bins=bins)
        print(b, 'L', round(L*1000), 'bins', len(bins), 'r_fur max', round(max(x[2] for x in bins)*1000, 1), flush=True)
a.out.write_text(json.dumps(out, indent=1))
print('TAIL_FUR_PROFILE_DONE', flush=True)
