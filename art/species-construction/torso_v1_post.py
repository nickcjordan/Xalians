"""Akinza torso v1: the trunk's midline depth profile re-faired (chest front, belly, upper back, lumbar hollow).

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), appended to the chain after the pelvis step.
Anatomy review 2026-10-13, finding 1; Nick, 2026-10-13: "Yes, fix all ten of them." The trunk read as a flat board in front
and a hump plus a deep hollow behind (the front midline a vertical plane from z .22 to -.04; the back at y +.055 at z .28,
-.044 at z .08, +.06 at z -.08; waist depth .153), with a hard horizontal shading edge across the lower back.

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python torso_v1_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/torso-v1.json
Development: --dry (with --blend <file>) reads the blend, writes only --dump, saves nothing.

Method (torso_v1_field.py): stage 1, a depth-only warp (every vertex moves along y, so every front-view width is unchanged
exactly) from the measured midline profiles to the spec's target profiles, spread round the section by a ramp from the side of
the trunk; stage 2, masked Gaussian blurs of the warped skin's signed distance on the back (BVH on a grid), with vertices moved
onto that field and relaxed (hips_v1_field.move_vertices), which takes out the rest of the old lumbar crease. Everything is by
position, never by vertex index. Same vertices and faces; the step fails if a vertex outside the part moves.
Record: torso-v1.json (spec, displacement statistics, the measured and target profiles).
"""
import argparse
import json
import sys
import time
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, sha
import torso_v1_field as tf
import hips_v1_field as hf

T0 = time.time()


def tick(message):
    print(f'[{time.time()-T0:7.1f}s] {message}', flush=True)


p = argparse.ArgumentParser()
p.add_argument('--asm', type=Path, default=None)
p.add_argument('--out', type=Path, default=None)
p.add_argument('--spec', type=Path, required=True)
p.add_argument('--dump', type=Path, default=None)
p.add_argument('--dry', action='store_true')
p.add_argument('--blend', type=Path, default=None)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
spec = json.loads(args.spec.read_text(encoding='utf-8'))

blend = args.blend if args.dry else args.out/'akinza.blend'
bpy.ops.wm.open_mainfile(filepath=str(Path(blend).resolve()))
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

# stage 1: depth-only warp
sel = tf.region(V0, spec)
dy, rec = tf.warp(V0, spec, sel)
V1 = V0.copy()
V1[:, 1] += dy
V1 = tf.taubin(V0, V1, tris, np.abs(dy) > 0, spec)
tick(f'warp: {int((np.abs(dy) > 0).sum())} vertices, max |dy| {np.abs(dy).max():.4f}')

# stage 2: masked blur of the warped skin's signed distance, vertices moved onto it
part = np.abs(dy) > 0
st_move = {'folded': [], 'residualMax': 0.0}
if spec.get('blurs'):
    G = spec['grid']
    STEP = float(G['step'])
    LO = np.array(G['lo'], float)
    HI = np.array(G['hi'], float)
    SHAPE = tuple(int(v) for v in np.round((HI-LO)/STEP).astype(int)+1)
    margin = .03
    inbox = np.all((V1 > LO-margin) & (V1 < HI+margin), axis=1)
    tsel = tris[inbox[tris].any(1)]
    used = np.unique(tsel)
    remap = -np.ones(nv, np.int64)
    remap[used] = np.arange(len(used))
    bvh = BVHTree.FromPolygons([Vector(v) for v in V1[used]], remap[tsel].tolist(), all_triangles=True)
    far = float(G.get('far', .04))
    S = np.full(SHAPE, np.nan)
    xs = LO[0]+STEP*np.arange(SHAPE[0])
    ys = LO[1]+STEP*np.arange(SHAPE[1])
    zs = LO[2]+STEP*np.arange(SHAPE[2])
    fn = bvh.find_nearest
    for i, x in enumerate(xs):
        for j, y in enumerate(ys):
            row = S[i, j]
            for k, z in enumerate(zs):
                q = Vector((x, y, z))
                loc, nrm, _, dist = fn(q, far)
                if loc is not None:
                    row[k] = dist if (q-loc).dot(nrm) >= 0 else -dist
    for i in range(SHAPE[0]):
        for j in range(SHAPE[1]):
            col = S[i, j]
            bad = np.isnan(col)
            if not bad.any():
                continue
            if bad.all():
                S[i, j] = far
                continue
            good = np.where(~bad)[0]
            nearest = good[np.abs(good[None, :]-np.where(bad)[0][:, None]).argmin(1)]
            col[bad] = np.sign(col[nearest])*far
    tick(f'S sampled {SHAPE}')
    F, w = tf.blur_field(S, LO, STEP, spec)
    V2, st_move, wall = hf.move_vertices(V1, tris, S, F, w, LO, STEP, spec, log=tick)
    part = part | (wall > 0)
    V1 = V2

disp = np.linalg.norm(V1-V0, axis=1)
fnrm = lambda P: np.cross(P[tris[:, 1]]-P[tris[:, 0]], P[tris[:, 2]]-P[tris[:, 0]])
n0, n1 = fnrm(V0), fnrm(V1)
cosang = (n0*n1).sum(1)/(np.linalg.norm(n0, axis=1)*np.linalg.norm(n1, axis=1)+1e-20)
R = spec['region']
inregion = tf.region(V0, spec)
stats = {'skinVertices': int(nv), 'moved': int((disp > 0).sum()), 'max': float(disp.max()),
         'medianMoved': float(np.median(disp[disp > 0])) if (disp > 0).any() else 0.0,
         'outsideRegionMax': float(disp[~inregion].max()), 'outsideRegionMoved': int((disp[~inregion] > 0).sum()),
         'maxAbsDx': float(np.abs(V1[:, 0]-V0[:, 0]).max()),
         'movedBounds': [V0[disp > 0].min(0).round(4).tolist(), V0[disp > 0].max(0).round(4).tolist()] if (disp > 0).any() else None,
         'facesTurnedOver45deg': int(((cosang < .7) & (disp[tris] > 0).any(1)).sum()),
         'facesTurnedOver72deg': int(((cosang < .3) & (disp[tris] > 0).any(1)).sum()),
         'foldedFacesPerUntanglePass': st_move['folded'], 'residualMax': st_move['residualMax']}
tick(json.dumps(stats))
if stats['outsideRegionMax'] != 0.0 or stats['outsideRegionMoved'] != 0:
    raise SystemExit('vertices outside the region moved')
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
record = {'approval': None, 'step': 'torso v1 (post-assembly)', 'input': str(args.asm), 'spec': spec, 'specSha256': sha(args.spec),
          'scriptSha256': sha(Path(__file__)), 'fieldSha256': sha(Path(tf.__file__)), 'hipsFieldSha256': sha(Path(hf.__file__)),
          'displacement': stats, 'skinAfter': st, 'profiles': rec,
          'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'torso-v1.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
tick(f'done: {st}')
