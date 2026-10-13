"""Akinza body B v1: the slimmer and softer trunk, shoulders, arms and legs, as a post step on the joined skin.

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), after the tails step (P-tails4 today; the
chain is meant as tails, then body B, then feet). Nick, 2026-10-13: "Let's go with your recommendations for changes": body
variant B of the 2026-10-12 previews (shoulders about -12 percent, chest -9, waist -6, hips -7, arms -11 to -13, sloped
shoulders, softened deltoids and upper back, chest depth -3 to -6) with the legs at variant A's -5 percent.

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python body_b_v1_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/body-b-v1.json

Method: body_b_v1_field.compute (numpy; see its docstring). The tails are excluded by region and distance, never by vertex
index: tail vertices are found by position (behind the tail cut inside the tail band) and every other vertex is faded in by its
distance to the nearest tail vertex (KD tree), so the step re-applies on a rebuilt tail mesh. The fore claws ride with the arm's
rigid inward shift. Same vertices and faces; the step fails if any held vertex (tails, head above the neck base, hind paws)
moves. Record: body-b-v1.json (spec, displacement statistics per part, arm shift).
"""
import argparse
import json
import sys
import time
from pathlib import Path

import bpy
import numpy as np
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, sha
import body_b_v1_field as bf

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

claw_objects = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH' and 'fore claw' in o.name}
fore = {}
for name, o in claw_objects.items():
    if not np.allclose(np.array(o.matrix_world), np.eye(4)):
        raise SystemExit(f'{name} is expected at the identity transform')
    c = np.empty(len(o.data.vertices)*3)
    o.data.vertices.foreach_get('co', c)
    fore[name] = c.reshape(-1, 3)

is_tail = bf.tail_vertices(V0, spec)
far = float(spec['tails']['fade'][1])*2
dist = np.full(nv, 10.0)
if is_tail.any():
    kd = KDTree(int(is_tail.sum()))
    for i, q in enumerate(V0[is_tail]):
        kd.insert(q, i)
    kd.balance()
    lo = V0[is_tail].min(0)-far
    hi = V0[is_tail].max(0)+far
    near = ~is_tail & np.all((V0 > lo) & (V0 < hi), axis=1)
    for i in np.where(near)[0]:
        dist[i] = kd.find(V0[i])[2]
tick(f'tail vertices {int(is_tail.sum())}; distance-faded vertices {int((dist < far).sum())}')

V1, claws, parts = bf.compute(V0, tris, dist, spec, fore, log=tick)
disp = np.linalg.norm(V1-V0, axis=1)
z = V0[:, 2]
held = (parts['keep'] == 0)
stats = {'skinVertices': int(nv), 'moved': int((disp > 0).sum()), 'max': float(disp.max()),
         'medianMoved': float(np.median(disp[disp > 0])),
         'heldMax': float(disp[held].max()), 'heldMoved': int((disp[held] > 0).sum()),
         'tailVertices': int(is_tail.sum()), 'tailsMax': float(disp[is_tail].max()) if is_tail.any() else 0.0,
         'headAboveFadeMax': float(disp[z > spec['headFade'][1]].max()),
         'hindPawsBelowAnkleMax': float(disp[z < spec['ankleFade'][0]].max()),
         'tailRootFadeMax': float(disp[(dist < spec['tails']['fade'][1]) & ~is_tail].max()),
         'armShift': parts['armShift']}
fp = (parts['arm'] > 0.5) & (np.abs(V0[:, 0]) > spec['forepawMinX']) & (z < spec['wristFade'][0]) & ~is_tail
side = np.where(V0[:, 0] >= 0, 1.0, -1.0)
rel = (V1-V0)[fp]
stats['forepawShapeChangeMax'] = float(max(np.abs(rel[side[fp] == s]-np.median(rel[side[fp] == s], axis=0)).max() for s in (-1, 1)))
tick(json.dumps(stats))
if stats['heldMax'] != 0.0 or stats['tailsMax'] != 0.0 or stats['hindPawsBelowAnkleMax'] != 0.0 or stats['headAboveFadeMax'] != 0.0 or stats['forepawShapeChangeMax'] > 1e-6:
    raise SystemExit('a held vertex moved or a forepaw changed shape')

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
record = {'approval': spec.get('approval'), 'step': 'body B v1 (post-assembly)', 'input': str(args.asm), 'spec': spec,
          'specSha256': sha(args.spec), 'scriptSha256': sha(Path(__file__)), 'fieldSha256': sha(Path(bf.__file__)),
          'displacement': stats, 'skinAfter': st, 'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'body-b-v1.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
if args.dump:
    np.savez_compressed(args.dump, before=V0, after=V1, tris=tris, keep=parts['keep'], isTail=is_tail)
tick(f'done: {st}')
