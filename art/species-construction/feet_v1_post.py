"""Akinza feet v1: each hind foot narrowed sideways about its own ankle, as a post step on the joined skin.

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), after body B (P-bodyB1); the chain is meant as
tails, then body B, then feet. Nick, 2026-10-13: "Let's go with your recommendations for changes": the 2026-10-12 hind-foot
proposal (narrow each hind foot to about 74 percent about its own ankle, move the ball inward under the ankle, round the lower
side edges into the sole; side view unchanged; claws move with their toes).

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python feet_v1_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/feet-v1.json

Method: feet_v1_field.compute (numpy; see its docstring). The region is found by position (|x| beyond the hips, below the lower
shin), never by vertex index. Every move is along x, so no vertex changes its y or z (checked: the side view cannot change).
Same vertices and faces; the step fails if a vertex outside the region moves. Record: feet-v1.json.
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
import feet_v1_field as ff

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
tick(f'skin {skin.name}: {nv} vertices, {len(tris)} triangles')

claw_objects = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH' and 'hind claw' in o.name}
hind = {}
for name, o in claw_objects.items():
    if not np.allclose(np.array(o.matrix_world), np.eye(4)):
        raise SystemExit(f'{name} is expected at the identity transform')
    c = np.empty(len(o.data.vertices)*3)
    o.data.vertices.foreach_get('co', c)
    hind[name] = c.reshape(-1, 3)
if len(hind) != 8:
    raise SystemExit(f'expected 8 hind claws, found {len(hind)}')

V1, claws, parts = ff.compute(V0, spec, hind)
disp = np.linalg.norm(V1-V0, axis=1)
region = parts['region']
claw_shift = {k: float(np.abs((c-hind[k]) - (c-hind[k]).mean(0)).max()) for k, c in claws.items()}
stats = {'skinVertices': int(nv), 'moved': int((disp > 0).sum()), 'max': float(disp.max()),
         'medianMoved': float(np.median(disp[disp > 0])), 'regionVertices': int(region.sum()),
         'outsideRegionMax': float(disp[~region].max()), 'outsideRegionMoved': int((disp[~region] > 0).sum()),
         'yzChangeMax': float(np.abs(V1[:, 1:]-V0[:, 1:]).max()),
         'clawShapeChangeMax': max(claw_shift.values()),
         'clawMoveMax': float(max(np.abs(c-hind[k]).max() for k, c in claws.items())),
         'ankleCentreX': parts['ankleCentreX']}
tick(json.dumps(stats))
if stats['outsideRegionMax'] != 0.0 or stats['yzChangeMax'] != 0.0 or stats['clawShapeChangeMax'] > 1e-9:
    raise SystemExit('a vertex outside the foot moved, a vertex left the side view, or a claw changed shape')

me.vertices.foreach_set('co', V1.ravel())
me.update()
for name, c in claws.items():
    o = claw_objects[name]
    o.data.vertices.foreach_set('co', c.ravel())
    o.data.update()
st = mesh_stats(skin)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
asm_record = json.loads((args.out/'assembly.json').read_text(encoding='utf-8'))
asm_record['objects'][skin.name] = {'components': st['components'], 'nonManifoldEdges': st['nonManifoldEdges'], 'vertices': st['vertices']}
asm_record['outputs'] = {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']}
(args.out/'assembly.json').write_text(json.dumps(asm_record, indent=1)+'\n', encoding='utf-8')
record = {'approval': spec.get('approval'), 'step': 'feet v1 (post-assembly)', 'input': str(args.asm), 'spec': spec,
          'specSha256': sha(args.spec), 'scriptSha256': sha(Path(__file__)), 'fieldSha256': sha(Path(ff.__file__)),
          'displacement': stats, 'skinAfter': st, 'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'feet-v1.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
if args.dump:
    np.savez_compressed(args.dump, before=V0, after=V1, tris=tris, region=region)
tick(f'done: {st}')
