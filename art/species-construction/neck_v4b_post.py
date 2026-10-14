"""Akinza neck v4b: neck v4 with the jaw-to-throat junction closed by a rolling ball (no undercut under the jaw).

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), appended after P-torso1 in place of P-neck4 (and P-neck3, P-neck2). Anatomy review
2026-10-13, finding 2; Nick, 2026-10-13: "Yes, fix all ten of them." The head sat on a short thin stalk (narrowest section
z .46, .114 wide and .099 deep), the throat ran almost level under the jaw and then turned straight down at a sharp inside
corner, the back of the skull overhung the nape, a faint ring showed at the narrowest section and the side of the neck base
was lumpy. Neck v1 (2026-10-12) had slimmed its column back toward the old proportions under the inferred hold "overall neck
length and the head's position", which this step keeps (the head does not move) while giving the neck its thickness.

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python neck_v4b_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/neck-v4b.json
Development: --dry (with --blend <file>) reads the blend, writes only --dump, saves nothing.

Neck v2 (2026-10-13) was rejected on its side view (Nick: "It looks like it has a neck brace on"): its column and throat
mass made the front of the neck a vertical wall from just under the chin to the chest. Neck v3 was then judged to carry a double chin (Nick: "it still has a bit of a double chin"); neck_v4_field carves the jaw
underside first and then runs neck v3's field. Neck v4's junction under the jaw was then a tight corner with a slight
undercut; neck_v4b_field runs neck v4's field and closes the junction with a rolling ball (round fillet, no backward lean). Method of v3: neck_v3_field.compose (see its
docstring): v2's neck column, cut at the front by a forward-leaning throat line (a cylinder round an axis parallel to it), is
joined to the skin by smooth minimum; then the nape lobe, masked blurs and part box of pelvis_v1_field.compose. The head is
never cut, so the jaw and chin underside stay the old skin. Vertices move onto the new zero set and are relaxed
(hips_v1_field.move_vertices), with the spot relax below. By position, never by vertex index. Same vertices and faces; the
step fails if a vertex outside the part box moves. Record: neck-v4b.json.
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
import neck_v4b_field as pf
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
record = {'approval': None, 'step': 'neck v4b (post-assembly)', 'input': str(args.asm), 'spec': spec, 'specSha256': sha(args.spec),
          'scriptSha256': sha(Path(__file__)), 'fieldSha256': sha(Path(pf.__file__)), 'hipsFieldSha256': sha(Path(hf.__file__)),
          'displacement': stats, 'skinAfter': st, 'records': rec,
          'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'neck-v4b.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
tick(f'done: {st}')
