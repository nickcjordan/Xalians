"""Akinza ear roots v2: the skull rounded into the back of each ear and the ear's back rolled smoothly into it, with no
line from behind or from the rear three-quarter views; the front-view outline, rim, angle and inner ear held.

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), appended after P-neck3 in place of
P-earroot1. Anatomy review 2026-10-13, finding 10; Nick, 2026-10-13: "Yes, fix all ten of them." Ear roots v1 left a
visible line where the ear's flat back begins (coordinator review, 2026-10-13). Two causes, both fixed here: v1 blurred its
fill, and because the fill carries the old crease's kink, the blurred fill added back to the creased skin left part of the
crease; and the closing's circular fillet meets the flat back of the ear (and a flat band on the skull's side) with a step
in curvature. The coordinator cleared a slight convex roll on the back of the ear near its root (REFINEMENT rule 1: Nick's
approval of the ears protects their look, not their implementation), with the front-view outline held to .0005.

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python earroot_v2_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/earroot-v2.json
Development: --dry (with --blend <file>) reads the blend, writes only --dump, saves nothing.

Method: stage 1 is earroot_v1_field.compose (the fill-only closing of radius .085, gated to backward-facing surface; the
spec's fillSigma is 0) and the projection of the vertices onto its zero set (hips_v1_field.move_vertices). Stage 2 is
earroot_v2_fair.fair: a weighted umbrella smoothing of the backward-facing vertices near the rear ear root, which spreads the
remaining curvature steps so the back of the ear rolls into the skull; the front face is never selected. By position, never
by vertex index. Same vertices and faces; the step fails if a vertex outside the stage-1 mask or the fairing mask moves, or
if the front-view outline changes by more than the spec's outlineTol. Record: earroot-v2.json.
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
import earroot_v1_field as pf
import earroot_v2_fair as ef
import hips_v1_field as hf

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
G = spec['grid']
STEP = float(G['step'])
LO = np.array(G['lo'], float)
HI = np.array(G['hi'], float)
SHAPE = tuple(int(v) for v in np.round((HI-LO)/STEP).astype(int)+1)

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
tick(f'skin {skin.name}: {nv} vertices, {len(tris)} triangles, grid {SHAPE}')

margin = .03
inbox = np.all((V0 > LO-margin) & (V0 < HI+margin), axis=1)
tsel = tris[inbox[tris].any(1)]
used = np.unique(tsel)
remap = -np.ones(nv, np.int64)
remap[used] = np.arange(len(used))
bvh = BVHTree.FromPolygons([Vector(v) for v in V0[used]], remap[tsel].tolist(), all_triangles=True)
far = float(G.get('far', .06))
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
tick('S sampled')



F, w, rec = pf.compose(S, LO, STEP, V0, spec, log=tick)
tick('field composed')
V1, st_move, wall = hf.move_vertices(V0, tris, S, F, w, LO, STEP, spec, log=tick)
V1, wfair = ef.fair(V1, tris, spec, log=tick)
wall = np.maximum(wall, (wfair > 0).astype(float))


def outline(V):
    h = V[V[:, 2] > .5]
    xb = np.round(np.abs(h[:, 0])/.002).astype(int)
    zb = np.round(h[:, 2]/.002).astype(int)
    top, bot, sid = {}, {}, {}
    for x, z, v in zip(xb, zb, h):
        top[x] = max(top.get(x, -9), v[2])
        bot[x] = min(bot.get(x, 9), v[2])
        sid[z] = max(sid.get(z, -9), abs(v[0]))
    return top, bot, sid


outline_change = {}
for name, a, b in zip(('topZperX', 'bottomZperX', 'maxXperZ'), outline(V0), outline(V1)):
    outline_change[name] = float(max(abs(a[q]-b[q]) for q in a if q in b))
tick(f'front-view outline change {outline_change}')
if max(outline_change.values()) > spec['outlineTol']:
    raise SystemExit('the front-view outline changed by more than outlineTol')
disp = np.linalg.norm(V1-V0, axis=1)
part = wall > 0
fnrm = lambda P: np.cross(P[tris[:, 1]]-P[tris[:, 0]], P[tris[:, 2]]-P[tris[:, 0]])
n0, n1 = fnrm(V0), fnrm(V1)
cosang = (n0*n1).sum(1)/(np.linalg.norm(n0, axis=1)*np.linalg.norm(n1, axis=1)+1e-20)
stats = {'skinVertices': int(nv), 'moved': int((disp > 0).sum()), 'max': float(disp.max()),
         'medianMoved': float(np.median(disp[disp > 0])) if (disp > 0).any() else 0.0,
         'outsidePartMax': float(disp[~part].max()), 'outsidePartMoved': int((disp[~part] > 0).sum()),
         'movedBounds': [V0[disp > 0].min(0).round(4).tolist(), V0[disp > 0].max(0).round(4).tolist()] if (disp > 0).any() else None,
         'facesTurnedOver72deg': int(((cosang < .3) & (disp[tris] > 0).any(1)).sum()),
         'foldedFacesPerUntanglePass': st_move['folded'], 'residualMax': st_move['residualMax'],
         'maskBounds': [[float(v) for v in (LO+STEP*np.argwhere(w > 0).min(0)).round(4)], [float(v) for v in (LO+STEP*np.argwhere(w > 0).max(0)).round(4)]],
         'fieldChangedOutsideMaskMax': float(np.abs(F-S)[w <= 0].max()), 'frontOutlineChange': outline_change,
         'fairVertices': int((wfair > 0).sum()), 'fairBounds': [V0[wfair > 0].min(0).round(4).tolist(), V0[wfair > 0].max(0).round(4).tolist()]}
tick(json.dumps(stats))
if stats['outsidePartMax'] != 0.0 or stats['outsidePartMoved'] != 0:
    raise SystemExit('vertices outside the mask moved')
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
record = {'approval': None, 'step': 'ear roots v2 (post-assembly)', 'input': str(args.asm), 'spec': spec, 'specSha256': sha(args.spec),
          'scriptSha256': sha(Path(__file__)), 'fieldSha256': sha(Path(pf.__file__)), 'hipsFieldSha256': sha(Path(hf.__file__)), 'fairSha256': sha(Path(ef.__file__)),
          'displacement': stats, 'skinAfter': st, 'records': rec,
          'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'earroot-v2.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
tick(f'done: {st}')
