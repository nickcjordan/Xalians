"""Akinza arms v2: the upper arm brought up to the forearm's fullness and elbow landmarks added (anatomy review finding 5).

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), appended after P-shoulders3d. Nick,
2026-10-13: "Yes, fix all ten of them." The upper arm was thinnest under the shoulder and widened to its maximum just below
the elbow (a thin upper arm on a club forearm), with no elbow landmark.

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python arms_v2_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/arms-v2.json
Development: --dry (with --blend <file>) reads the blend, writes only --dump, saves nothing.

Method (arms_v2_field.py): arms v1's tube retaper (each arm vertex moved along its radial direction onto the smoothed tube
rescaled to the authored taper) with this spec's taper, faded in below the deltoid and out above the wrist, plus radial
landmark offsets (the olecranon point behind the elbow, a soft crease in front). Same vertices and faces; nothing outside the
arm masks moves (checked), and nothing below the spec's handZ moves (checked: the wrists and hands are held).
Records: arms-v2.json.
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
import arms_v2_field as af

T0 = time.time()


def tick(message):
    print(f'[{time.time()-T0:7.1f}s] {message}', flush=True)


p = argparse.ArgumentParser()
p.add_argument('--asm', type=Path, default=None)
p.add_argument('--out', type=Path, default=None)
p.add_argument('--dry', action='store_true')
p.add_argument('--blend', type=Path, default=None)
p.add_argument('--spec', type=Path, required=True)
p.add_argument('--dump', type=Path, default=None)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
spec = json.loads(args.spec.read_text(encoding='utf-8'))

bpy.ops.wm.open_mainfile(filepath=str(Path(args.blend if args.dry else args.out/'akinza.blend').resolve()))
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
if spec.get('handZ') is not None:
    # the relax spreads a few millionths into the wrist; the wrists and hands are held exactly
    keep = V0[:, 2] < spec['handZ']
    V1[keep] = V0[keep]
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
hz = spec.get('handZ')
if hz is not None:
    stats['belowHandZMax'] = float(disp[V0[:, 2] < hz].max())
    tick(f'below handZ {hz}: max move {stats["belowHandZMax"]}')
    if stats['belowHandZMax'] > 0:
        raise SystemExit('the wrist or hand moved')
if args.dump:
    np.savez_compressed(args.dump, before=V0, after=V1, tris=tris, wall=part.astype(float))
if args.dry:
    tick('dry run: nothing saved')
    raise SystemExit(0)

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
record = {'approval': None, 'step': 'arms v2 (post-assembly)', 'input': str(args.asm), 'spec': spec, 'specSha256': sha(args.spec),
          'scriptSha256': sha(Path(__file__)), 'fieldSha256': sha(Path(af.__file__)), 'displacement': stats, 'skinAfter': st,
          'profileBefore': records, 'profileAfterMean': after, 'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'arms-v2.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
if args.dump:
    np.savez_compressed(args.dump, before=V0, after=V1, tris=tris, wall=part.astype(float))
tick(f'done: {st}')
