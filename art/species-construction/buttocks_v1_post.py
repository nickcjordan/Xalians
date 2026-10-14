"""Akinza buttocks v1: the -x buttock given the +x buttock's form (as it is without the tails), its crease smoothed, and the
cleft's lower end faded out above the crotch.

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), appended after P-tailbase1. Anatomy review
2026-10-13, finding 9; Nick, 2026-10-13: "Yes, fix all ten of them." Field: buttocks_v1_field.compose (see its docstring).
Script: tailbase_v1_post.py's, with no tail moved (no warp).

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python buttocks_v1_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/buttocks-v1.json
Development: --dry (with --blend <file>) reads the blend, writes only --dump (and --fields), saves nothing.

Order: (1) the skin's signed distance S is sampled on the grid; (2) the field is composed; (3) the vertices in the part box
move onto its zero set and are relaxed (hips_v1_field.move_vertices). Same vertices and faces. The step fails if a vertex
outside the part box moves. By position, never by vertex index. Record: buttocks-v1.json.
"""
import argparse
import hashlib
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
import buttocks_v1_field as pf
import tailbase_v1_field as tb
import hips_v1_field as hf

T0 = time.time()
REPO = Path(__file__).resolve().parents[2]


def tick(message):
    print(f'[{time.time()-T0:7.1f}s] {message}', flush=True)


p = argparse.ArgumentParser()
p.add_argument('--asm', type=Path, default=None)
p.add_argument('--out', type=Path, default=None)
p.add_argument('--dry', action='store_true')
p.add_argument('--blend', type=Path, default=None)
p.add_argument('--spec', type=Path, required=True)
p.add_argument('--dump', type=Path, default=None)
p.add_argument('--fields', type=Path, default=None)
p.add_argument('--s-cache', type=Path, default=None)
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

Vw = V0
warped = np.zeros(nv, bool)

# 2. S of the warped skin
key = hashlib.sha256(Vw[np.all((Vw > LO-.03) & (Vw < HI+.03), axis=1)].tobytes()+json.dumps(G).encode()).hexdigest()
S = None
if args.s_cache and args.s_cache.is_file():
    z = np.load(args.s_cache)
    if str(z['key']) == key:
        S = z['S']
        tick('S from cache')
if S is None:
    margin = .03
    inbox = np.all((Vw > LO-margin) & (Vw < HI+margin), axis=1)
    tsel = tris[inbox[tris].any(1)]
    used = np.unique(tsel)
    remap = -np.ones(nv, np.int64)
    remap[used] = np.arange(len(used))
    bvh = BVHTree.FromPolygons([Vector(v) for v in Vw[used]], remap[tsel].tolist(), all_triangles=True)
    far = float(G.get('far', .06))
    S = np.full(SHAPE, np.nan)
    xs = LO[0]+STEP*np.arange(SHAPE[0])
    ys = LO[1]+STEP*np.arange(SHAPE[1])
    zs = LO[2]+STEP*np.arange(SHAPE[2])
    fn = bvh.find_nearest
    for i, x in enumerate(xs):
        for j, y in enumerate(ys):
            row = S[i, j]
            for k, zz in enumerate(zs):
                q = Vector((x, y, zz))
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
    S = S.astype(np.float32)
    tick('S sampled')
    if args.s_cache:
        np.savez_compressed(args.s_cache, S=S, key=key)

# 3. the field
F, w, rec, extra = pf.compose(S, LO, STEP, spec, REPO, log=tick)
tick('field composed')
if args.fields:
    np.savez_compressed(args.fields, S=S, F=F, w=w, B=extra['B'], T=extra['T'], hole=extra['hole'], lo=LO, step=STEP)

# 4. move the part's vertices onto the field
V1, st_move, wall = hf.move_vertices(Vw, tris, S, F, w, LO, STEP, spec, log=tick)
V1 = tb.spot_relax(V1, Vw, tris, F, LO, STEP, spec, wall > 0)
# float noise of the projection where the field is unchanged (moves under 1e-7) is returned to the input exactly
V1[np.linalg.norm(V1-Vw, axis=1) < 1e-7] = Vw[np.linalg.norm(V1-Vw, axis=1) < 1e-7]
disp = np.linalg.norm(V1-V0, axis=1)
part = (wall > 0) | warped
fnrm = lambda P: np.cross(P[tris[:, 1]]-P[tris[:, 0]], P[tris[:, 2]]-P[tris[:, 0]])
n0, n1 = fnrm(V0), fnrm(V1)
cosang = (n0*n1).sum(1)/(np.linalg.norm(n0, axis=1)*np.linalg.norm(n1, axis=1)+1e-20)
stats = {'skinVertices': int(nv), 'moved': int((disp > 0).sum()), 'max': float(disp.max()),
         'medianMoved': float(np.median(disp[disp > 0])) if (disp > 0).any() else 0.0,
         'outsidePartMax': float(disp[~part].max()), 'outsidePartMoved': int((disp[~part] > 0).sum()),
         'movedBounds': [V0[disp > 0].min(0).round(4).tolist(), V0[disp > 0].max(0).round(4).tolist()] if (disp > 0).any() else None,
         'facesTurnedOver72degNotWarped': int(((cosang < .3) & (disp[tris] > 0).any(1) & ~warped[tris].all(1)).sum()),
         'foldedFacesPerUntanglePass': st_move['folded'], 'residualMax': st_move['residualMax']}
tick(json.dumps(stats))
if stats['outsidePartMax'] != 0.0 or stats['outsidePartMoved'] != 0:
    raise SystemExit('vertices outside the part moved')
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
record = {'approval': None, 'step': spec.get('name', 'buttocks v1')+' (post-assembly)', 'input': str(args.asm), 'spec': spec,
          'specSha256': sha(args.spec), 'scriptSha256': sha(Path(__file__)), 'fieldSha256': sha(Path(pf.__file__)), 'tailbaseFieldSha256': sha(Path(tb.__file__)),
          'hipsFieldSha256': sha(Path(hf.__file__)), 'displacement': stats, 'skinAfter': st, 'records': rec,
          'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/(spec.get('recordName', 'buttocks-v1')+'.json')).write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
tick(f'done: {st}')
