"""Akinza ear base v1: the shallow pocket where the front of each ear folds into the head filled gently, so it no longer
reads as a dark mark under fur.

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), appended after P-lids1 of
recipe-integrated-v3 (the step 14 cups recipe v4 is set aside). Cause (fur step 28, 2026-10-20): above the ear base,
on the front, the skin forms a broad concave pocket about 3 cm across (no sharp crease); in shade it reads as a dark
mark through the white fur.

Method: the region is the skin within spec radius of a pocket center on the pocket's own side. Each region vertex's
depth below the plane fitted to the skin within fitRadius is measured (fill only, so a convex or flat spot gets 0),
weighted by a smoothstep from the center to the region edge, then diffused (diffusePasses neighbor-average passes, held
at zero outside the region) so the fill tapers with no rim or plateau, and scaled so its peak is fillFraction of the
deepest depth. Each vertex moves along its rest normal by that height; a vertex outside the region never moves.
(A first try filled each vertex toward its plane with a 1 cm falloff; at 3 mm it left a visible round blister.) Same topology, by position (centers are world points, no vertex indices). The step
fails if a vertex outside the radius moves, a vertex moves more than maxMove, or the skin is not one closed mesh.
Record: earbase-v1.json.

  blender -b --factory-startup --python earbase_v1_post.py -- --asm <assembly dir> --out <new dir> --spec specs/earbase-v1.json
"""
import argparse
import json
import sys
import time
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, sha

T0 = time.time()


def tick(message):
    print(f'[{time.time()-T0:7.1f}s] {message}', flush=True)


p = argparse.ArgumentParser()
p.add_argument('--asm', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--spec', type=Path, required=True)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
spec = json.loads(args.spec.read_text(encoding='utf-8'))
asm_record = json.loads((args.out/'assembly.json').read_text(encoding='utf-8'))
bpy.ops.wm.open_mainfile(filepath=str((args.out/'akinza.blend').resolve()))
skin = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
if not np.allclose(np.array(skin.matrix_world), np.eye(4)):
    raise SystemExit('the skin object is expected at the identity transform')
me = skin.data
nv = len(me.vertices)
V0 = np.empty(nv*3)
me.vertices.foreach_get('co', V0)
V0 = V0.reshape(-1, 3)
N = np.empty(nv*3)
me.vertices.foreach_get('normal', N)
N = N.reshape(-1, 3)
E = np.empty(len(me.edges)*2, np.int64)
me.edges.foreach_get('vertices', E)
E = E.reshape(-1, 2)
R, FIT, DIFFUSE, FRACTION, MAXMOVE = (float(spec['radius']), float(spec['fitRadius']), int(spec['diffusePasses']),
                                       float(spec['fillFraction']), float(spec['maxMove']))
dist = np.full(nv, 9.0)
region = np.zeros(nv, bool)
for c in spec['centers']:
    d = np.linalg.norm(V0 - np.array(c, float), axis=1)
    nc = N[np.argmin(d)]  # the pocket's own side only: the back of the ear sheet is never reached
    m = (d < R) & (N @ nc > .3)
    region |= m
    dist = np.where(m, np.minimum(dist, d), dist)
sub = np.where(region)[0]
kd = KDTree(nv)
for q, v in enumerate(V0):
    kd.insert(Vector(v), q)
kd.balance()
dep = np.zeros(nv)
for q in sub:  # depth below the plane fitted to the skin within fitRadius (same-side normals); fill only
    nb = np.array([j for _, j, _ in kd.find_range(Vector(V0[q]), FIT)])
    nb = nb[N[nb] @ N[q] > .3]
    c = V0[nb].mean(0)
    n = np.linalg.svd(V0[nb] - c, full_matrices=False)[2][2]
    if n @ N[q] < 0:
        n = -n
    dep[q] = max(0.0, float((c - V0[q]) @ n))
t = np.clip(1 - dist / R, 0, 1)
h = np.where(region, dep * t * t * (3 - 2 * t), 0.0)
src, dst = np.r_[E[:, 0], E[:, 1]], np.r_[E[:, 1], E[:, 0]]
keep = region[src]
src, dst = src[keep], dst[keep]
deg = np.bincount(src, minlength=nv)[sub].astype(float)
for _ in range(DIFFUSE):  # heat diffusion of the fill height, held at zero outside the region: no rim, no plateau
    acc = np.zeros(nv)
    np.add.at(acc, src, h[dst])
    h[sub] = acc[sub] / deg
h *= FRACTION * dep.max() / h.max()
tick(f'region: {len(sub)} vertices, deepest {dep.max():.5f}, peak fill {h.max():.5f}')
V = V0 + h[:, None] * N
disp = np.linalg.norm(V - V0, axis=1)
if disp[~region].max(initial=0) != 0.0:
    raise SystemExit('vertices outside the region moved')
if disp.max() > MAXMOVE:
    raise SystemExit(f'max displacement {disp.max():.5f} over maxMove {MAXMOVE}')
me.vertices.foreach_set('co', V.ravel())
me.update()
st = mesh_stats(skin)
stats = {'regionVertices': int(region.sum()), 'movedVertices': int((disp > 0).sum()), 'maxMove': float(disp.max()),
         'meanMoveInRegion': float(disp[region].mean()), 'outsideRegionMax': float(disp[~region].max(initial=0)),
         'perCenterMax': [float(disp[np.linalg.norm(V0 - np.array(c), axis=1) < R].max(initial=0)) for c in spec['centers']], 'deepest': float(dep.max()),
         'regionBounds': [V0[region].min(0).round(4).tolist(), V0[region].max(0).round(4).tolist()]}
tick(json.dumps(stats))
if st['components'] != 1 or st['nonManifoldEdges'] != 0:
    raise SystemExit(f'the skin is not one closed mesh: {st}')
np.savez_compressed(args.out/'earbase-v1-positions.npz', before=V0, after=V, region=region)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
asm_record['objects'][skin.name] = {'components': st['components'], 'nonManifoldEdges': st['nonManifoldEdges'], 'vertices': st['vertices']}
asm_record.setdefault('post', []).append({'step': 'P-earbase1', 'script': 'art/species-construction/earbase_v1_post.py', 'input': str(args.asm)})
asm_record['outputs'] = {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']}
(args.out/'assembly.json').write_text(json.dumps(asm_record, indent=1)+'\n', encoding='utf-8')
record = {'approval': None, 'step': 'ear base v1 (post-assembly)', 'input': str(args.asm), 'spec': spec,
          'specSha256': sha(args.spec), 'scriptSha256': sha(Path(__file__)), 'displacement': stats, 'skinAfter': st,
          'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'earbase-v1.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
tick(f'done: {st}')
