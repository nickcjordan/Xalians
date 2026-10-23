"""B-sntv pass 6: contact diagnosis for a shot (read only).

blender -b --python reskin_contactdiag.py -- RIG.blend PARAMS.json CFG.json OUT.json
For crouch_deep and the chosen sig frames: normal orientation of the crossing triangles (outward from their bone axis
or not), how many forearm skin vertices lie inside the body (ray parity against the body skin) and how deep (distance
to the nearest body skin), and how many body skin vertices lie inside the forearm capsule.
"""
import sys, json, runpy
from pathlib import Path
A = sys.argv[sys.argv.index('--') + 1:]
RIG, PARP, CFGP, OUTP = A[:4]
import bpy
sys.argv = ['x', '--', RIG, PARP, CFGP, '/tmp/diag_unused.blend', '/tmp/diag_unused.json']
src = Path(__file__).with_name('reskin_shotsculpt.py').read_text()
src = src[:src.index("SHOTS = [")]   # definitions only
g = {'__file__': str(Path(__file__).with_name('reskin_shotsculpt.py')), '__name__': 'diag'}
exec(compile(src, 'reskin_shotsculpt.py', 'exec'), g)
np = g['np']; Vector = g['Vector']; BVHTree = g['BVHTree']
F, TDOM, DOM, gn, RANK, LIMBV = g['F'], g['TDOM'], g['DOM'], g['gn'], g['RANK'], g['LIMBV']
CFG = json.load(open(CFGP)); out = {}
shots = [('review', 'crouch_deep')] + [('sig', f) for f in CFG.get('diag_frames', [14, 16, 22])]
for shot in shots:
    g['set_shot'](shot); P = g['ev'](); X = g['pairs_all'](P); segs = g['bone_segs']()
    N = g['vnormals'](P)
    tris = np.array(sorted({t for p in X for t in p}))
    c = P[F[tris]].mean(1); n = np.cross(P[F[tris, 1]] - P[F[tris, 0]], P[F[tris, 2]] - P[F[tris, 0]])
    outward = {}
    for j in np.unique(TDOM[tris]):
        if j not in segs: continue
        m = TDOM[tris] == j; h, t = segs[j]; ax = t - h; u = np.clip(((c[m] - h) @ ax) / ax.dot(ax), 0, 1); foot = h + u[:, None] * ax
        outward[gn[j]] = round(float((((c[m] - foot) * n[m]).sum(1) > 0).mean()), 3)
    body_t = np.nonzero(RANK[TDOM] == 0)[0]; tree = BVHTree.FromPolygons(P.tolist(), F[body_t].tolist(), all_triangles=True)
    res = {}
    for side in 'lr':
        fv = np.nonzero(np.isin(DOM, [gn.index(f'leg_f{side}_02'), gn.index(f'leg_f{side}_03')]))[0]
        ins = [vi for vi in fv if g['inside'](tree, Vector(P[vi]), g['AXES'])]
        dep = [tree.find_nearest(Vector(P[vi]))[3] * 1000 for vi in ins]
        res[side] = dict(forearm_cannon_vertices=len(fv), inside_body=len(ins), depth_mm_p50=round(float(np.percentile(dep, 50)), 1) if dep else 0, depth_mm_max=round(float(max(dep)), 1) if dep else 0,
                         inside_by_bone={b: int(sum(1 for vi in ins if gn[DOM[vi]] == b)) for b in (f'leg_f{side}_02', f'leg_f{side}_03')})
    # global orientation: does a point 1 mm along the triangle normal leave the closed body (odd parity = still inside)?
    allt = BVHTree.FromPolygons(P.tolist(), F.tolist(), all_triangles=True)
    def out_frac(ts):
        ok = 0
        for t in ts:
            cc = Vector(P[F[t]].mean(0)); nn = Vector(np.cross(P[F[t, 1]] - P[F[t, 0]], P[F[t, 2]] - P[F[t, 0]])).normalized()
            ok += 0 if g['inside'](allt, cc + nn * 0.001, g['AXES']) else 1
        return round(ok / max(len(ts), 1), 3)
    rng = np.random.default_rng(1)
    glob = {gn[j]: out_frac(tris[TDOM[tris] == j][:200]) for j in np.unique(TDOM[tris])}
    glob['random_all'] = out_frac(rng.choice(len(F), 300, replace=False))
    print('ORIENT', shot, glob, flush=True)
    out[f'{shot[0]}:{shot[1]}'] = dict(orient_parity_outward_fraction=glob, pairs=len(X), bones=g['bone_pairs'](X), crossing_tri_normals_outward_fraction=outward, forearm_inside_body=res)
    print('DIAG', shot, json.dumps(out[f'{shot[0]}:{shot[1]}']), flush=True)
json.dump(out, open(OUTP, 'w'), indent=1); print('DIAG done', flush=True)
