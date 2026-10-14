"""Akinza lids v1: the lid rims of both eyes put back on the head component's own surface at a finer mesh, so the lower lid
shows no dark ticks in close front crops.

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), appended after P-knee1 (final cleanup,
2026-10-14). Cause, measured on assembled-3296: the head component (head-3167) renders clean, every assembled build shows
short dark ticks in the cast shadow along the lower lid; the ticks fade but stay at assembly voxel sizes .0020, .0016 and
.0012 (3.5M skin vertices), and vanish with shadows off. The lid roll is a fold of radius about .003 world: the assembly's
.0028 voxel facets chord across it and the grazing shadow edge picks up each facet as a tick. A finer remesh of the whole
body is 2 to 5 times the vertices for a partial fix, so this step refines only the rims.

Method: the skin faces within bandR of either eye globe (z above .5) are subdivided (cuts per edge, grid fill), and every
vertex of the band is moved to its nearest point on the head component's surface (head-3167 shape.glb placed by the
assembly's headTransform; the assembly never changes the eye region and no later post step reaches it), faded to zero
over the band's outer part. Approval of the eyes protects their look; the target is the approved head surface itself, so
the step moves the skin by at most the remesh error (spec maxMove). By position, never by vertex index. The step fails if
a vertex outside the band moves, a vertex moves more than maxMove, or the skin is not one closed mesh. Record: lids-v1.json.

Run by recipe.py:
  blender -b --factory-startup --python lids_v1_post.py -- --asm <assembly dir> --out <new dir> --head <head step dir> --spec specs/lids-v1.json
"""
import argparse
import json
import sys
import time
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, sha

T0 = time.time()


def tick(message):
    print(f'[{time.time()-T0:7.1f}s] {message}', flush=True)


p = argparse.ArgumentParser()
p.add_argument('--asm', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--head', type=Path, required=True)
p.add_argument('--spec', type=Path, required=True)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
spec = json.loads(args.spec.read_text(encoding='utf-8'))
asm_record = json.loads((args.out/'assembly.json').read_text(encoding='utf-8'))
xf = asm_record['headTransform']

bpy.ops.wm.open_mainfile(filepath=str((args.out/'akinza.blend').resolve()))
skin = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
if not np.allclose(np.array(skin.matrix_world), np.eye(4)):
    raise SystemExit('the skin object is expected at the identity transform')
globes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and 'eye_globe' in o.name]
if len(globes) != 2:
    raise SystemExit(f'expected two eye globes, found {[o.name for o in globes]}')
before = set(bpy.data.objects)

# the head component's skin, placed as the assembly placed it
bpy.ops.import_scene.gltf(filepath=str((args.head/'shape.glb').resolve()))
new = [o for o in bpy.data.objects if o not in before]
hskin = max((o for o in new if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
X = Matrix.Translation(Vector(xf['translation'])) @ Matrix.Scale(xf['scale'], 4)
hm = X @ hskin.matrix_world
hv = [hm @ v.co for v in hskin.data.vertices]
hskin.data.calc_loop_triangles()
head_bvh = BVHTree.FromPolygons(hv, [tuple(t.vertices) for t in hskin.data.loop_triangles], all_triangles=True)
tick(f'head surface {hskin.name}: {len(hv)} vertices')
for o in new:
    bpy.data.objects.remove(o, do_unlink=True)

gbvh = []
for g in globes:
    g.data.calc_loop_triangles()
    gv = [g.matrix_world @ v.co for v in g.data.vertices]
    gbvh.append(BVHTree.FromPolygons(gv, [tuple(t.vertices) for t in g.data.loop_triangles], all_triangles=True))

R, FADE, CUTS, MAXMOVE = float(spec['bandR']), float(spec['fadeFrom']), int(spec['cuts']), float(spec['maxMove'])


def globe_distance(c):
    best = 9.0
    for b in gbvh:
        hit = b.find_nearest(c, R*2)
        if hit[0] is not None:
            best = min(best, hit[3])
    return best


me = skin.data
nv0 = len(me.vertices)
co = np.empty(nv0*3)
me.vertices.foreach_get('co', co)
V0 = co.reshape(-1, 3).copy()
bm = bmesh.new()
bm.from_mesh(me)
bm.verts.ensure_lookup_table()
cand = np.where((V0[:, 2] > .5) & (np.abs(V0[:, 0]) < .2) & (V0[:, 1] < -.03))[0]
gd = np.full(nv0, 9.0)
for i in cand:
    gd[i] = globe_distance(Vector(V0[i]))
band = gd < R
edges = [e for e in bm.edges if band[e.verts[0].index] and band[e.verts[1].index]]
tick(f'band: {int(band.sum())} of {nv0} vertices, {len(edges)} edges to subdivide')
bmesh.ops.subdivide_edges(bm, edges=edges, cuts=CUTS, use_grid_fill=True)
bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
bm.verts.ensure_lookup_table()
moved, worst = 0, 0.0
for v in bm.verts:
    if v.index < nv0 and not band[v.index]:
        continue
    d = gd[v.index] if v.index < nv0 else globe_distance(v.co)
    if d >= R:
        continue
    t = 1.0 if d <= FADE else (R-d)/(R-FADE)
    t = t*t*(3-2*t)
    loc, _, _, dist = head_bvh.find_nearest(v.co, MAXMOVE*4)
    if loc is None:
        raise SystemExit(f'no head surface within {MAXMOVE*4} of a band vertex at {tuple(v.co)}')
    if dist > MAXMOVE:
        raise SystemExit(f'band vertex {tuple(round(c, 4) for c in v.co)} lies {dist:.5f} from the head surface (maxMove {MAXMOVE})')
    v.co = v.co.lerp(loc, t)
    moved += 1
    worst = max(worst, dist*t)
bm.to_mesh(me)
bm.free()
me.update()
for poly in me.polygons:
    poly.use_smooth = True

nv1 = len(me.vertices)
co = np.empty(nv1*3)
me.vertices.foreach_get('co', co)
V1 = co.reshape(-1, 3)
disp = np.linalg.norm(V1[:nv0]-V0, axis=1)
outside = disp[~band]
st = mesh_stats(skin)
stats = {'skinVerticesBefore': int(nv0), 'skinVerticesAfter': int(nv1), 'bandVertices': int(band.sum()),
         'subdividedEdges': len(edges), 'movedVertices': moved, 'maxMove': worst,
         'outsideBandMax': float(outside.max()) if len(outside) else 0.0,
         'bandBounds': [V0[band].min(0).round(4).tolist(), V0[band].max(0).round(4).tolist()]}
tick(json.dumps(stats))
if stats['outsideBandMax'] != 0.0:
    raise SystemExit('vertices outside the band moved')
if st['components'] != 1 or st['nonManifoldEdges'] != 0:
    raise SystemExit(f'the skin is not one closed mesh: {st}')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
asm_record['objects'][skin.name] = {'components': st['components'], 'nonManifoldEdges': st['nonManifoldEdges'], 'vertices': st['vertices']}
asm_record['outputs'] = {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']}
(args.out/'assembly.json').write_text(json.dumps(asm_record, indent=1)+'\n', encoding='utf-8')
record = {'approval': None, 'step': 'lids v1 (post-assembly)', 'input': str(args.asm), 'head': str(args.head), 'spec': spec,
          'specSha256': sha(args.spec), 'scriptSha256': sha(Path(__file__)), 'displacement': stats, 'skinAfter': st,
          'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'lids-v1.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
tick(f'done: {st}')
