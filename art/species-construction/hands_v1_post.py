"""Akinza hands v1: four digits with shallow separations, one palm pad and four digit pads, each claw at the tip of its
digit with a small nail-bed rise, and the crease band on the back of the hand smoothed; wrist and arm unchanged.

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), appended after P-earroot1. Anatomy review
2026-10-13, finding 8; Nick, 2026-10-13: "Yes, fix all ten of them." The hand was a mitten: digits small lumps at the very
end with no separation, the claws on a fixed arc along the paw's rim instead of on the digits, the palm lumpy, a crease
band across the back of the hand.

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python hands_v1_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/hands-v1.json
Development: --dry (with --blend <file>) reads the blend, writes only --dump, saves nothing.

Method: hands_v1_field.compose (see its docstring) on the skin's signed distance inside the paw's part box; vertices move
onto the new zero set and are relaxed (hips_v1_field.move_vertices). The fore claws are separate objects: each is
translated rigidly by its spec `claws` delta (the -x claws by the mirrored delta) so its base sits in its digit's tip at
the nail bed. By position and object name, never by vertex index. Same vertices and faces; the step fails if a skin vertex
outside the part box moves or any other object changes. Record: hands-v1.json.
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
import hands_v1_field as pf
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
G = spec['grid']          # the +x paw's grid; the -x paw uses its mirror image
STEP = float(G['step'])
far = float(G.get('far', .06))

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
tick(f'skin {skin.name}: {nv} vertices, {len(tris)} triangles')


def sample(LO, HI):
    SHAPE = tuple(int(v) for v in np.round((HI-LO)/STEP).astype(int)+1)
    margin = .03
    inbox = np.all((V0 > LO-margin) & (V0 < HI+margin), axis=1)
    tsel = tris[inbox[tris].any(1)]
    used = np.unique(tsel)
    remap = -np.ones(nv, np.int64)
    remap[used] = np.arange(len(used))
    bvh = BVHTree.FromPolygons([Vector(v) for v in V0[used]], remap[tsel].tolist(), all_triangles=True)
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
    return S


V1 = V0.copy()
part = np.zeros(nv, bool)
rec, st_moves, mask_bounds, field_out = {}, [], [], []
for side in (1, -1):
    lo, hi = np.array(G['lo'], float), np.array(G['hi'], float)
    if side < 0:
        lo, hi = np.array([-hi[0], lo[1], lo[2]]), np.array([-lo[0], hi[1], hi[2]])
    S = sample(lo, hi)
    tick(f'side {side:+d}: S sampled, grid {S.shape}')
    F, w, r = pf.compose(S, lo, STEP, V0, spec, log=tick)
    rec[f'side{side:+d}'] = r
    Vs, st, wall = hf.move_vertices(V0, tris, S, F, w, lo, STEP, spec, log=tick)
    sel = wall > 0
    V1[sel] = Vs[sel]
    if np.abs(Vs[~sel]-V0[~sel]).max() > 0:
        raise SystemExit('move_vertices moved a vertex outside its wall')
    part |= sel
    st_moves.append(st)
    mask_bounds.append([(lo+STEP*np.argwhere(w > 0).min(0)).round(4).tolist(), (lo+STEP*np.argwhere(w > 0).max(0)).round(4).tolist()])
    field_out.append(float(np.abs(F-S)[w <= 0].max()))
st_move = {'folded': [s['folded'] for s in st_moves], 'residualMax': max(s['residualMax'] for s in st_moves)}
disp = np.linalg.norm(V1-V0, axis=1)
fnrm = lambda P: np.cross(P[tris[:, 1]]-P[tris[:, 0]], P[tris[:, 2]]-P[tris[:, 0]])
n0, n1 = fnrm(V0), fnrm(V1)
cosang = (n0*n1).sum(1)/(np.linalg.norm(n0, axis=1)*np.linalg.norm(n1, axis=1)+1e-20)
stats = {'skinVertices': int(nv), 'moved': int((disp > 0).sum()), 'max': float(disp.max()),
         'medianMoved': float(np.median(disp[disp > 0])) if (disp > 0).any() else 0.0,
         'outsidePartMax': float(disp[~part].max()), 'outsidePartMoved': int((disp[~part] > 0).sum()),
         'movedBounds': [V0[disp > 0].min(0).round(4).tolist(), V0[disp > 0].max(0).round(4).tolist()] if (disp > 0).any() else None,
         'facesTurnedOver72deg': int(((cosang < .3) & (disp[tris] > 0).any(1)).sum()),
         'foldedFacesPerUntanglePass': st_move['folded'], 'residualMax': st_move['residualMax'],
         'maskBounds': mask_bounds, 'fieldChangedOutsideMaskMax': max(field_out)}
tick(json.dumps(stats))
if stats['outsidePartMax'] != 0.0 or stats['outsidePartMoved'] != 0:
    raise SystemExit('vertices outside the part box moved')
claw_moves = {}
for ob in bpy.context.scene.objects:
    if ob.type != 'MESH' or not ob.name.startswith('body_Curved fore claw '):
        continue
    if not np.allclose(np.array(ob.matrix_world), np.eye(4)):
        raise SystemExit(f'{ob.name}: expected at the identity transform')
    side_s, idx = ob.name[len('body_Curved fore claw '):].split()
    side = 1 if side_s == '+1' else -1
    d = np.array(spec['claws'][idx], float)*np.array([side, 1, 1])
    n = len(ob.data.vertices)
    c = np.empty(n*3)
    ob.data.vertices.foreach_get('co', c)
    claw_moves[ob.name] = {'object': ob, 'before': c.reshape(-1, 3).copy(), 'delta': d}
stats['clawDeltas'] = {k: v['delta'].round(4).tolist() for k, v in sorted(claw_moves.items())}
tick(f'claws: {stats["clawDeltas"]}')
if args.dump:
    np.savez_compressed(args.dump, before=V0, after=V1, tris=tris, wall=part.astype(float),
                        **{'claw:'+k: v['before']+v['delta'] for k, v in claw_moves.items()},
                        **{'clawbefore:'+k: v['before'] for k, v in claw_moves.items()})
if args.dry:
    tick('dry run: nothing saved')
    raise SystemExit(0)

me.vertices.foreach_set('co', V1.ravel())
me.update()
for v in claw_moves.values():
    v['object'].data.vertices.foreach_set('co', (v['before']+v['delta']).ravel())
    v['object'].data.update()
st = mesh_stats(skin)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
asm_record = json.loads((args.out/'assembly.json').read_text(encoding='utf-8'))
asm_record['objects'][skin.name] = {'components': st['components'], 'nonManifoldEdges': st['nonManifoldEdges'], 'vertices': st['vertices']}
asm_record['outputs'] = {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']}
(args.out/'assembly.json').write_text(json.dumps(asm_record, indent=1)+'\n', encoding='utf-8')
record = {'approval': None, 'step': 'hands v1 (post-assembly)', 'input': str(args.asm), 'spec': spec, 'specSha256': sha(args.spec),
          'scriptSha256': sha(Path(__file__)), 'fieldSha256': sha(Path(pf.__file__)), 'hipsFieldSha256': sha(Path(hf.__file__)),
          'displacement': stats, 'skinAfter': st, 'records': rec,
          'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'hands-v1.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
tick(f'done: {st}')
