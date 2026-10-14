"""Akinza knee v1: the angular front corner of each knee rounded, a low kneecap mound added and the faint diagonal
crease below the kneecap on the inner side smoothed (both knees, mirrored).

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), appended after P-groin1. Anatomy review
2026-10-13, finding 11. Field: pelvis_v1_field.compose (blurZ, masked blurs and swells, mirrored, inside the part box) on the skin's signed
distance; vertices move onto the new zero set and are relaxed (hips_v1_field.move_vertices) with neck_v3_post.py's spot relax.
Script otherwise neck_v3_post.py's. Same vertices and faces; the step fails if a vertex outside the part box moves. Record:
knee-v1.json (spec recordName).
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
import pelvis_v1_field as pf
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



def spot_relax(V1, V0, tris, F, lo, step, spec, part):
    """Tangential relax of the moved skin inside spots (spec 'spotRelax': spheres c, r, fade, iterations), each pass projected
    back onto the new field: where a fill closes an inside corner (the throat under the jaw), the vertices of both old walls
    land on one surface and bunch into a ridge, which the projection's own short relax does not spread out."""
    import neck_v1_field as nf
    out = V1.copy()
    fF = nf.Trilinear(F, lo, step)
    gx, gy, gz = np.gradient(F, step)
    fg = [nf.Trilinear(g, lo, step) for g in (gx, gy, gz)]
    e = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    for sp in spec.get('spotRelax', []):
        c = np.array(sp['c'], float)
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


F, w, rec = pf.compose(S, LO, STEP, V0, spec, log=tick)
tick('field composed')
V1, st_move, wall = hf.move_vertices(V0, tris, S, F, w, LO, STEP, spec, log=tick)
V1 = spot_relax(V1, V0, tris, F, LO, STEP, spec, wall > 0)
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
         'fieldChangedOutsideMaskMax': float(np.abs(F-S)[w <= 0].max())}
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
record = {'approval': None, 'step': spec.get('name', 'knee v1')+' (post-assembly)', 'input': str(args.asm), 'spec': spec, 'specSha256': sha(args.spec),
          'scriptSha256': sha(Path(__file__)), 'fieldSha256': sha(Path(pf.__file__)), 'hipsFieldSha256': sha(Path(hf.__file__)),
          'displacement': stats, 'skinAfter': st, 'records': rec,
          'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/(spec.get('recordName', 'knee-v1')+'.json')).write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
tick(f'done: {st}')
