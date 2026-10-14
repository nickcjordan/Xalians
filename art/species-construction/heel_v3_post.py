"""Akinza heel v3: heel v2's sole pads kept; the heel back reshaped into one round mass and its back-bottom corner filleted
tangent to it and to the floor, the side wall rolled into the sole in one rounded edge, the heel's floor contact blended into
its underside; the heel stays flat on the floor (anatomy review 2026-10-13, finding 7; Nick, 2026-10-14: "7: I am fine with how
it is now"). In place of heel v2 (P-heel2).

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), appended after P-ankle1.
Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python heel_v3_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/heel-v3.json
Development: --dry (with --blend <file>) reads the blend, writes only --dump, saves nothing.

Method, per foot (the spec is written for the +x foot; the -x foot uses it mirrored, on its own grid): the skin's signed
distance S is sampled on a fine grid round the foot only; heel_v3_field.compose (see its docstring) builds the new field; then
the part box. Vertices move onto the new zero set and are relaxed (hips_v1_field.move_vertices); moved vertices are clamped to
the floor plane. By position, never by vertex index. Same vertices and faces; the step fails if a vertex outside the part box
moves, if any vertex above the box top moves, or if the sole goes below the floor plane. The hind claws do not move.
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
import heel_v3_field as pf
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
p.add_argument('--record', default='heel-v3.json')
p.add_argument('--step-name', default='heel v3 (post-assembly)')
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
spec = json.loads(args.spec.read_text(encoding='utf-8'))
G = spec['grid']
STEP = float(G['step'])

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


def sample_S(V, LO, SHAPE, far):
    margin = .03
    HI = LO+STEP*(np.array(SHAPE)-1)
    inbox = np.all((V > LO-margin) & (V < HI+margin), axis=1)
    tsel = tris[inbox[tris].any(1)]
    used = np.unique(tsel)
    remap = -np.ones(nv, np.int64)
    remap[used] = np.arange(len(used))
    bvh = BVHTree.FromPolygons([Vector(v) for v in V[used]], remap[tsel].tolist(), all_triangles=True)
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


def spot_relax(V1, V0, F, lo, spec, part, side):
    """Tangential relax of the moved skin inside spots (spec 'spotRelax': spheres c (for the +x leg), r, fade, iterations),
    each pass projected back onto the new field."""
    import neck_v1_field as nf
    out = V1.copy()
    fF = nf.Trilinear(F, lo, STEP)
    gx, gy, gz = np.gradient(F, STEP)
    fg = [nf.Trilinear(g, lo, STEP) for g in (gx, gy, gz)]
    e = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    for sp in spec.get('spotRelax', []):
        c = np.array(sp['c'], float)*np.array([side, 1, 1])
        r = np.linalg.norm(V0-c, axis=1)
        wv = np.clip((sp['r']+sp['fade']-r)/sp['fade'], 0, 1)
        wv = wv*wv*(3-2*wv)*part
        sel = np.where(wv > 0)[0]
        if not len(sel):
            continue
        m = np.zeros(len(V0), bool)
        m[sel] = True
        ee = e[m[e[:, 0]]]
        deg = np.bincount(ee[:, 0], minlength=len(V0)).astype(float)
        ws = wv[sel][:, None]
        for _ in range(int(sp['iterations'])):
            acc = np.zeros_like(out)
            np.add.at(acc, ee[:, 0], out[ee[:, 1]])
            avg = acc[sel]/np.maximum(deg[sel], 1)[:, None]
            g = np.stack([f(out[sel]) for f in fg], 1)
            g /= np.maximum(np.linalg.norm(g, axis=1, keepdims=True), 1e-9)
            dlt = avg-out[sel]
            dlt -= (dlt*g).sum(1, keepdims=True)*g
            out[sel] += .5*ws*dlt
            for _k in range(4):
                P = out[sel]
                ev = fF(P)
                g = np.stack([f(P) for f in fg], 1)
                out[sel] = P-(ev/np.maximum((g*g).sum(1), 1e-8))[:, None]*g
    return out


far = float(G.get('far', .06))
Vcur = V0.copy()
part = np.zeros(nv, bool)
recs = {}
moves = {}
fieldOut = {}
for side in (1, -1):
    lo = np.array(G['lo'], float)
    hi = np.array(G['hi'], float)
    if side < 0:
        lo[0], hi[0] = -hi[0], -lo[0]
    SHAPE = tuple(int(v) for v in np.round((hi-lo)/STEP).astype(int)+1)
    S = sample_S(Vcur, lo, SHAPE, far)
    tick(f'side {side:+d}: S sampled on grid {SHAPE}')
    F, w, rec = pf.compose(S, lo, STEP, Vcur, spec, log=tick)
    tick(f'side {side:+d}: field composed')
    Vprev = Vcur
    V1, st_move, wall = hf.move_vertices(Vprev, tris, S, F, w, lo, STEP, spec, log=tick)
    V1 = spot_relax(V1, Vprev, F, lo, spec, wall > 0, side)
    part |= wall > 0
    Vcur = V1
    recs[f'{side:+d}'] = rec
    moves[f'{side:+d}'] = st_move
    fieldOut[f'{side:+d}'] = float(np.abs(F-S)[w <= 0].max())

V1 = Vcur
# the floor plane is a hold: the untangle pass averages vertices with their neighbours and can push a sole vertex a hair below it
zfloor = float(V0[:, 2].min())
V1[:, 2] = np.maximum(V1[:, 2], zfloor)
disp = np.linalg.norm(V1-V0, axis=1)
fnrm = lambda P: np.cross(P[tris[:, 1]]-P[tris[:, 0]], P[tris[:, 2]]-P[tris[:, 0]])
n0, n1 = fnrm(V0), fnrm(V1)
cosang = (n0*n1).sum(1)/(np.linalg.norm(n0, axis=1)*np.linalg.norm(n1, axis=1)+1e-20)
ztop = float(spec['partBox']['z'][3])
stats = {'skinVertices': int(nv), 'moved': int((disp > 0).sum()), 'max': float(disp.max()),
         'medianMoved': float(np.median(disp[disp > 0])) if (disp > 0).any() else 0.0,
         'outsidePartMax': float(disp[~part].max()), 'outsidePartMoved': int((disp[~part] > 0).sum()),
         'aboveBoxTopMax': float(disp[V0[:, 2] > ztop].max()),
         'lowestZ': [float(V0[:, 2].min()), float(V1[:, 2].min())],
         'movedBounds': [V0[disp > 0].min(0).round(4).tolist(), V0[disp > 0].max(0).round(4).tolist()] if (disp > 0).any() else None,
         'facesTurnedOver72deg': int(((cosang < .3) & (disp[tris] > 0).any(1)).sum()),
         'foldedFacesPerUntanglePass': {k: v['folded'] for k, v in moves.items()},
         'residualMax': max(v['residualMax'] for v in moves.values()),
         'fieldChangedOutsideMaskMax': fieldOut}
tick(json.dumps(stats))
if stats['outsidePartMax'] != 0.0 or stats['outsidePartMoved'] != 0:
    raise SystemExit('vertices outside the part moved')
if stats['aboveBoxTopMax'] != 0.0:
    raise SystemExit('vertices above the part box top moved')
if stats['lowestZ'][1] < stats['lowestZ'][0]-1e-6:
    raise SystemExit('the sole went below the floor plane')
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
record = {'approval': None, 'step': args.step_name, 'input': str(args.asm), 'spec': spec, 'specSha256': sha(args.spec),
          'scriptSha256': sha(Path(__file__)), 'fieldSha256': sha(Path(pf.__file__)), 'hipsFieldSha256': sha(Path(hf.__file__)),
          'displacement': stats, 'skinAfter': st, 'records': recs,
          'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/args.record).write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
tick(f'done: {st}')
