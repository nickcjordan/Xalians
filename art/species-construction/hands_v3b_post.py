"""Akinza hands v3b (cleanup of hands v3 on the refined fore paws of P-pawrefine1: the front toe no longer fused with the old
paw's front face, softer toe-to-paw blends so each toe bean is one clean dome; shapes, separations and claw seating as v3): four distinct rounded toes with readable separations, each claw out of the tip of its own toe (centered,
angled down along the toe and curling toward the palm) and sheathed by a small nail-bed fold of skin, one palm pad and four
toe pads blended in as smooth domes; wrist and arm unchanged. Replaces hands v2 (P-hands2); hands v2's coordinator review (2026-10-13): claw 1 still showed its flat top from the side, the
nail-bed hood on the front toe read as a lump with a lip, the toes read as rectangular sausages with lumpy edges from below
and the palm pad as a slab; the cause was the paw's vertex spacing (median edge .00246), which P-pawrefine1 refines to
about .00065 before this step.

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), appended after P-pawrefine1. Anatomy review
2026-10-13, finding 8; Nick, 2026-10-13: "Yes, fix all ten of them." The coordinator's review of hands v1 (2026-10-13): the
claws came out of the gaps beside the digits with their cut tops showing, they bunched from the front, the digits read as
small lumps, the palm pad had a lip edge. Sheathed claw joins are the coordinator's call (2026-10-13), overridable by Nick.

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python hands_v3b_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/hands-v3b.json
Development: --dry (with --blend <file>) reads the blend, writes only --dump, saves nothing.

Method: first every fore claw is placed by a rigid motion from the spec (`claws`: rotation R about its base `pivot`, then
translation t; the -x claws by the mirror image). Then, per paw, the claws' own signed distance is sampled on the grid near
them and passed to hands_v3b_field.compose as the sheath, the field is composed, and the skin vertices move onto its zero set
(hands_v3b_field.move_vertices_from: the shared mover with the candidates' start positions pre-smoothed, landing on the surface itself inside the part box). By position and object name, never by vertex index. Same vertices and faces; the step fails
if a skin vertex outside the part box moves or any other object changes. Record: hands-v3b.json.
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
import hands_v3b_field as pf
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


MIR = np.diag([-1.0, 1.0, 1.0])
claws = {}
for ob in bpy.context.scene.objects:
    if ob.type != 'MESH' or not ob.name.startswith('body_Curved fore claw '):
        continue
    if not np.allclose(np.array(ob.matrix_world), np.eye(4)):
        raise SystemExit(f'{ob.name}: expected at the identity transform')
    side_s, idx = ob.name[len('body_Curved fore claw '):].split()
    side = 1 if side_s == '+1' else -1
    cs = spec['claws'][idx]
    R, piv, t = np.array(cs['R'], float), np.array(cs['pivot'], float), np.array(cs['t'], float)
    if side < 0:
        R, piv, t = MIR@R@MIR, MIR@piv, MIR@t
    n = len(ob.data.vertices)
    c = np.empty(n*3)
    ob.data.vertices.foreach_get('co', c)
    before = c.reshape(-1, 3).copy()
    after = (before-piv)@R.T+piv+t
    ob.data.calc_loop_triangles()
    ct = np.empty(len(ob.data.loop_triangles)*3, np.int32)
    ob.data.loop_triangles.foreach_get('vertices', ct)
    tip = after[np.argmax(np.linalg.norm(after-(piv+t), axis=1))]
    axis = tip-(piv+t)
    claws[ob.name] = {'object': ob, 'side': side, 'before': before, 'after': after, 'tris': ct.reshape(-1, 3),
                      'base': piv+t, 'axis': axis/np.linalg.norm(axis)}
tick(f'{len(claws)} fore claws placed')


def sheath_field(lo, shape, side):
    """Signed distance of this paw's claws, thickened and cut to a collar at each base; 1.0 (far) elsewhere."""
    sh = spec['sheath']
    out = np.ones(shape)
    xs = lo[0]+STEP*np.arange(shape[0])
    ys = lo[1]+STEP*np.arange(shape[1])
    zs = lo[2]+STEP*np.arange(shape[2])
    for name, cl in claws.items():
        if cl['side'] != side:
            continue
        A = cl['after']
        bvh = BVHTree.FromPolygons([Vector(v) for v in A], cl['tris'].tolist(), all_triangles=True)
        m = float(sh['margin'])
        bmin, bmax = A.min(0)-m, A.max(0)+m
        ii = np.where((xs >= bmin[0]) & (xs <= bmax[0]))[0]
        jj = np.where((ys >= bmin[1]) & (ys <= bmax[1]))[0]
        kk = np.where((zs >= bmin[2]) & (zs <= bmax[2]))[0]
        for i in ii:
            for j in jj:
                for k in kk:
                    q = Vector((xs[i], ys[j], zs[k]))
                    loc, nrm, _, dist = bvh.find_nearest(q, 1.0)
                    if loc is None:
                        continue
                    d = dist if (q-loc).dot(nrm) >= 0 else -dist
                    p = np.array([xs[i], ys[j], zs[k]])
                    tt = float((p-cl['base'])@cl['axis'])
                    v = max(d-sh['thick'], tt-sh['collar'])
                    if v < out[i, j, k]:
                        out[i, j, k] = v
    return out


V1 = V0.copy()
part = np.zeros(nv, bool)
rec, st_moves, mask_bounds, field_out = {}, [], [], []
for side in (1, -1):
    lo, hi = np.array(G['lo'], float), np.array(G['hi'], float)
    if side < 0:
        lo, hi = np.array([-hi[0], lo[1], lo[2]]), np.array([-lo[0], hi[1], hi[2]])
    S = sample(lo, hi)
    tick(f'side {side:+d}: S sampled, grid {S.shape}')
    SH = sheath_field(lo, S.shape, side)
    tick(f'side {side:+d}: sheath sampled')
    F, w, r = pf.compose(S, lo, STEP, V0, spec, log=tick, sheath=SH)
    rec[f'side{side:+d}'] = r
    Vs, st, wall = pf.move_vertices_from(V0, tris, S, F, w, lo, STEP, spec, log=tick)
    Vs = pf.taubin(Vs, V0, tris, spec, log=tick)
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
stats['clawBases'] = {k: v['base'].round(4).tolist() for k, v in sorted(claws.items())}
stats['clawAxes'] = {k: v['axis'].round(4).tolist() for k, v in sorted(claws.items())}
tick(f"claws: {stats['clawBases']}")
if args.dump:
    np.savez_compressed(args.dump, before=V0, after=V1, tris=tris, wall=part.astype(float),
                        **{'claw:'+k: v['after'] for k, v in claws.items()},
                        **{'clawbefore:'+k: v['before'] for k, v in claws.items()})
if args.dry:
    tick('dry run: nothing saved')
    raise SystemExit(0)

me.vertices.foreach_set('co', V1.ravel())
me.update()
for v in claws.values():
    v['object'].data.vertices.foreach_set('co', v['after'].ravel())
    v['object'].data.update()
st = mesh_stats(skin)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
asm_record = json.loads((args.out/'assembly.json').read_text(encoding='utf-8'))
asm_record['objects'][skin.name] = {'components': st['components'], 'nonManifoldEdges': st['nonManifoldEdges'], 'vertices': st['vertices']}
asm_record['outputs'] = {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']}
(args.out/'assembly.json').write_text(json.dumps(asm_record, indent=1)+'\n', encoding='utf-8')
record = {'approval': None, 'step': 'hands v3b (post-assembly)', 'input': str(args.asm), 'spec': spec, 'specSha256': sha(args.spec),
          'scriptSha256': sha(Path(__file__)), 'fieldSha256': sha(Path(pf.__file__)), 'hipsFieldSha256': sha(Path(hf.__file__)),
          'displacement': stats, 'skinAfter': st, 'records': rec,
          'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'hands-v3b.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
tick(f'done: {st}')
