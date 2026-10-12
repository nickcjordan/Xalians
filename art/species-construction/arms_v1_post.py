"""Akinza arms v1: the upper arm below the shoulder ball, the elbow, the forearm, the wrist and the palm root as one tube.

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), after P-shoulders1. The arm tube (B-23) and the
paw (B-21 and B-23's paw settings) were built with every paw, digit and claw parameter frozen, which also froze the place where
the paw meets the wrist; the elbow and wrist rings sit at those step boundaries. Here the arm is edited on the fused skin.

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python arms_v1_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/arms-v1.json

Method (arms_v1_field.py): per arm, the old arm's bone axis (smoothed slice centroids, densified with a cubic spline), every arm
vertex's arc length, radius and angle about it, the mean radius on an (s, angle) grid smoothed along the axis and a little around
it, rescaled to an authored taper (spec rows of z and mean radius), and each vertex moved along its radial direction onto that
smooth tube, faded in below the shoulder ball and out across the palm root so the paw (digits, claws, palm) does not move. The
moved vertices are relaxed a little, and small spheres at the front of each armpit apex (the shoulder step's sliver facets) get
a short Laplacian smoothing. Same vertices and faces; nothing outside the arm masks and spots moves (checked).
Records: arms-v1.json (spec, displacement statistics, the radius profile before and after along each arm).
"""
import argparse
import json
import sys
import time
from pathlib import Path

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, sha
import arms_v1_field as af

T0 = time.time()


def tick(message):
    print(f'[{time.time()-T0:7.1f}s] {message}', flush=True)


p = argparse.ArgumentParser()
p.add_argument('--asm', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--spec', type=Path, required=True)
p.add_argument('--dump', type=Path, default=None)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
spec = json.loads(args.spec.read_text(encoding='utf-8'))

bpy.ops.wm.open_mainfile(filepath=str((args.out/'akinza.blend').resolve()))
skin = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
me = skin.data
if not np.allclose(np.array(skin.matrix_world), np.eye(4)):
    raise SystemExit('the skin object is expected at the identity transform')
nv = len(me.vertices)
co = np.empty(nv*3)
me.vertices.foreach_get('co', co)
V0 = co.reshape(-1, 3).copy()
me.calc_loop_triangles()
tris = np.empty(len(me.loop_triangles)*3, np.int32)
me.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
tick(f'skin {skin.name}: {nv} vertices')

V1 = V0.copy()
part = np.zeros(nv, bool)
records = {}
for side, name in ((1, 'plusX'), (-1, 'minusX')):
    idx, newP, rec = af.rebuild_arm(V0, side, spec, log=tick)
    V1[idx] = newP
    part[idx] = True
    records[name] = rec
moved = np.where(np.linalg.norm(V1-V0, axis=1) > 0)[0]
V1 = af.relax(V0, V1, tris, moved, spec)
for sp in spec.get('spots', []):
    for sx in (1, -1):
        part |= np.linalg.norm(V0-np.array(sp['c'])*np.array([sx, 1, 1]), axis=1) < sp['radius']
if spec.get('spots'):
    V1 = af.local_smooth(V1, tris, spec['spots'], log=tick)
disp = np.linalg.norm(V1-V0, axis=1)
stats = {'skinVertices': int(nv), 'moved': int((disp > 0).sum()), 'max': float(disp.max()),
         'medianMoved': float(np.median(disp[disp > 0])), 'outsidePartMax': float(disp[~part].max()),
         'outsidePartMoved': int((disp[~part] > 0).sum())}
tick(json.dumps(stats))
if stats['outsidePartMoved']:
    raise SystemExit('vertices outside the part moved')

me.vertices.foreach_set('co', V1.ravel())
me.update()
st = mesh_stats(skin)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
asm_record = json.loads((args.out/'assembly.json').read_text(encoding='utf-8'))
asm_record['objects'][skin.name] = {'components': st['components'], 'nonManifoldEdges': st['nonManifoldEdges'], 'vertices': st['vertices']}
asm_record['outputs'] = {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']}
(args.out/'assembly.json').write_text(json.dumps(asm_record, indent=1)+'\n', encoding='utf-8')
after = {}
for side, name in ((1, 'plusX'), (-1, 'minusX')):
    _, _, rec = af.rebuild_arm(V1, side, {**spec, 'weight': {'in': [-9, -9.5], 'out': [9, 9.5]}}, log=lambda m: None)
    after[name] = [{'z': q['z'], 'mean': q['oldMean']} for q in rec['profile']]
record = {'approval': None, 'step': 'arms v1 (post-assembly)', 'input': str(args.asm), 'spec': spec, 'specSha256': sha(args.spec),
          'scriptSha256': sha(Path(__file__)), 'fieldSha256': sha(Path(af.__file__)), 'displacement': stats, 'skinAfter': st,
          'profileBefore': records, 'profileAfterMean': after, 'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'arms-v1.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
if args.dump:
    np.savez_compressed(args.dump, before=V0, after=V1, tris=tris, wall=part.astype(float))
tick(f'done: {st}')
