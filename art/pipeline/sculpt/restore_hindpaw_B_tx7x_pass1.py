"""B-tx7x pass 1: coordinate-only hind paw restoration plus searched claw seating.

Body: same verified route as pass 0 (ordered local edge correspondence to the generated hind paws, left taken
directly, right taken from the mirrored left generated surface, smoothstep falloff 65 mm to 120 mm).
Claws: each existing hind claw is moved rigidly (mesh and scale untouched) so its pointed end emerges from the
front of its restored toe. Exit height, pitch and yaw are searched per toe on the left so that only the tip
region lies outside the skin; the right side uses the mirrored left parameters.

blender -b --factory-startup --python restore_hindpaw_B_tx7x_pass1.py -- [--exposed MM] [--out DIR]
"""
import bpy, sys, json, hashlib, math, numpy as np
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default):
    return type(default)(ARGS[ARGS.index(name) + 1]) if name in ARGS else default
EXPOSED = arg('--exposed', 7.0) / 1000.0
PITCHES = [4, 8, 12, 16]
ROOT = Path('/mnt/c/dev/art-data/pipeline/codex-stream')
OUT = Path(arg('--out', str(ROOT / 'luceras-hindpaw/pass1')))
BASE = ROOT / 'luceras-merge/revert-forelegs/luceras_sculpt.blend'
GEN = ROOT / 'luceras-compare/generated.blend'

def co(o):
    p = np.empty(len(o.data.vertices) * 3, dtype=np.float64); o.data.vertices.foreach_get('co', p); return p.reshape(-1, 3)
def edges(o): return np.array([e.vertices[:] for e in o.data.edges], dtype=np.int32)
def topology(o):
    h = hashlib.sha256(); h.update(np.array([len(o.data.vertices)], dtype='<i8').tobytes())
    for prop, attr in [(o.data.edges, 'vertices'), (o.data.loops, 'vertex_index'), (o.data.polygons, 'loop_total')]:
        n = len(prop) * (2 if attr == 'vertices' else 1); a = np.empty(n, dtype='<i4'); prop.foreach_get(attr, a); h.update(a.tobytes())
    return h.hexdigest()
def reg(p, s=0): return ((p[:, 0] * s > .04) if s else (abs(p[:, 0]) > .04)) & (p[:, 1] > .025) & (p[:, 1] < .34) & (p[:, 2] < .13)
def ss(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)

# ---------- body ----------
bpy.ops.wm.open_mainfile(filepath=str(GEN)); g = bpy.data.objects['luceras_blockout']; G = co(g); GE = edges(g)
gtree = BVHTree.FromPolygons(G.tolist(), [p.vertices[:] for p in g.data.polygons])
bpy.ops.wm.open_mainfile(filepath=str(BASE)); o = bpy.data.objects['luceras_blockout']; P = co(o); Q = P.copy(); E = edges(o); before = topology(o)
correspondence = {}
for sign in [1, -1]:
    ai = np.flatnonzero(reg(P, sign)); gi = np.flatnonzero(reg(G, sign)); assert len(ai) == len(gi)
    am = np.full(len(P), -1); gm = np.full(len(G), -1); am[ai] = np.arange(len(ai)); gm[gi] = np.arange(len(gi))
    ae = am[E]; ge = gm[GE]
    sa = set(map(tuple, np.sort(ae[(ae >= 0).all(1)], axis=1))); sg = set(map(tuple, np.sort(ge[(ge >= 0).all(1)], axis=1))); assert sa == sg
    target = G[gi].copy()
    if sign < 0:  # symmetric: right follows the mirrored left generated surface
        for k, p in enumerate(target): target[k] = np.array(gtree.find_nearest(Vector((-p[0], p[1], p[2])))[0]) * [-1, 1, 1]
    w = ss((.12 - P[ai, 2]) / .055)
    Q[ai] = P[ai] + w[:, None] * (target - P[ai])
    correspondence[str(sign)] = {'vertices': int(len(ai)), 'edges': len(sa), 'local_edge_connectivity_exact': True}
o.data.vertices.foreach_set('co', Q.ravel()); o.data.update(); Q = co(o)
assert before == topology(o)
bpy.context.view_layer.update()
o.data.calc_loop_triangles()
TRI = [t.vertices[:] for t in o.data.loop_triangles]
body = BVHTree.FromPolygons(Q.tolist(), TRI, all_triangles=True)

# ---------- toes (left; right mirrors) ----------
SPLAY = [-8.0, -3.0, 3.0, 8.0]  # degrees toward +X on the left, medial toe first
WINDOWS = [(.120, .1465), (.1465, .1725), (.1725, .1865), (.1865, .212)]
L = Q[(Q[:, 0] > .1) & (Q[:, 1] > .02) & (Q[:, 1] < .13) & (Q[:, 2] < .045)]
toes = []
for lo, hi in WINDOWS:
    s = L[(L[:, 0] >= lo) & (L[:, 0] < hi)]
    tip = s[s[:, 1].argmin()]
    sl = s[(s[:, 1] > tip[1] + .012) & (s[:, 1] < tip[1] + .020)]
    cx = sl[:, 0].mean()
    d = np.array([tip[0] - cx, -( .016), 0.0]); d /= np.linalg.norm(d)
    yaw = math.degrees(math.atan2(d[0], -d[1]))  # + means toward +X (outward on the left)
    yaw = float(SPLAY[len(toes)])  # measured lobe yaw is unreliable on the merged middle toes; use a fixed splay prior
    toes.append({'window_x': (lo, hi), 'tip': tip.tolist(), 'lobe_center_x_behind_tip': float(cx), 'toe_yaw_deg': yaw,
                 'top_z_8mm_behind_tip': float(s[(abs(s[:, 1] - tip[1] - .008) < .002)][:, 2].max())})

def signed(pts):
    out = np.empty(len(pts))
    for k, p in enumerate(pts):
        h, n, _, _ = body.find_nearest(Vector(p)); out[k] = (Vector(p) - h).dot(n)
    return out

def claw_frame(c):
    """World verts, unit axis base->tip, tip point (pointed extreme)."""
    C = np.array([c.matrix_world @ v.co for v in c.data.vertices]); m = C.mean(0)
    vals, vec = np.linalg.eigh(np.cov((C - m).T)); ax = vec[:, -1]; t = (C - m) @ ax
    rp = np.linalg.norm((C - m) - np.outer(t, ax), axis=1)
    if rp[t > t.max() - .002].mean() > rp[t < t.min() + .002].mean(): ax = -ax; t = -t
    return C, ax, m + ax * t.max()

def direction(pitch, yaw, side):
    # forward is -Y; yaw toward +X on the left (mirrored on the right); pitch downward
    y, p = math.radians(yaw), math.radians(pitch)
    return np.array([side * math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), -math.sin(p)])

TOE_X = [.140, .168, .182, .197]  # toe centerlines on the left, from the front profile and the top-view tips

def place(C, ax, tip, toe, pitch, yawoff, ze, side, dx=0.0):
    """Exit point sits on the toe's own centerline at height ze (found with a straight forward ray);
    the claw then points along (pitch, yaw) and its pointed end lies EXPOSED beyond that exit."""
    D = direction(pitch, toe['toe_yaw_deg'] + yawoff, side)
    k = WINDOWS.index(tuple(toe['window_x']))
    tx, ty = (TOE_X[k] + dx) * side, toe['tip'][1]
    hit = body.ray_cast(Vector((tx, ty + .018, ze)), Vector((0, -1, 0)))[0]
    if hit is None: return None
    newtip = np.array(hit) + D * EXPOSED
    R = np.array(Vector(ax).rotation_difference(Vector(D)).to_matrix())
    newC = (R @ (C - tip).T).T + newtip
    return D, R, newtip, np.array(hit), newC

claw_report = []; chosen = {}
for j in range(1, 5):
    c = bpy.data.objects[f'hind_claw_l_{j}']; C, ax, tip = claw_frame(c); toe = toes[j - 1]
    sub = slice(None, None, 2)
    best = None; perpitch = {}
    for pitch in PITCHES:
        for yawoff in ([-10, 0, 10, 15, 20, 25, 30, 35, 40] if j == 4 else [-16, -12, -8, -4, 0, 4, 8, 12, 16]):
            for ze in [.006, .008, .010, .012, .014, .016, .018]:
                for dx in ([-.002, -.001, 0, .001, .002] if j >= 3 else [-.001, 0, .001]):
                    r = place(C, ax, tip, toe, pitch, yawoff, ze, 1, dx)
                    if r is None: continue
                    D, R, newtip, hit, newC = r
                    if newC[:, 2].min() < .002: continue
                    sd = signed(newC[sub]); s_back = (newtip - newC[sub]) @ D
                    far = s_back > EXPOSED + .002
                    stray = int(((sd > 0) & far).sum()); smax = float(max(0.0, sd[far].max())) if far.any() else 0.0
                    cost = stray + 4000 * smax + .05 * abs(yawoff) + 150 * abs(ze - .010) + 300 * abs(dx) + .1 * abs(pitch - 10)
                    if best is None or cost < best[0]: best = (cost, pitch, yawoff, ze, stray, dx, smax)
                    bp = perpitch.get(pitch)
                    if bp is None or cost < bp[0]: perpitch[pitch] = (round(cost, 2), stray, round(smax, 5), yawoff, ze, dx)
    print('PERPITCH', j, perpitch, flush=True)
    chosen[j] = best
    print('CLAW_SEARCH', j, best, flush=True)

for side, sign in [('l', 1), ('r', -1)]:
    for j in range(1, 5):
        c = bpy.data.objects[f'hind_claw_{side}_{j}']; old = c.matrix_world.copy(); C, ax, tip = claw_frame(c)
        cost, pitch, yawoff, ze, _, dx, _ = chosen[j]
        D, R, newtip, hit, newC = place(C, ax, tip, toes[j - 1], pitch, yawoff, ze, sign, dx)
        M = Matrix.Translation(Vector(newtip)) @ Matrix(R.tolist()).to_4x4() @ Matrix.Translation(Vector(-tip))
        c.matrix_world = M @ old; bpy.context.view_layer.update()
        W = np.array([c.matrix_world @ v.co for v in c.data.vertices]); sd = signed(W); sb = (newtip - W) @ D
        claw_report.append({'object': c.name, 'toe': j, 'base_matrix_world': [list(r) for r in old], 'new_matrix_world': [list(r) for r in c.matrix_world],
                            'pitch_down_deg': pitch, 'yaw_deg': toes[j - 1]['toe_yaw_deg'] + yawoff, 'exit_height_m': ze, 'exit_x_shift_m': dx, 'skin_exit_point_m': hit.tolist(),
                            'tip_m': W[np.argmax(W @ D)].tolist(), 'target_exposed_m': EXPOSED,
                            'measured_exposed_along_axis_m': float(sb[sd > 0].max()) if (sd > 0).any() else 0.0,
                            'stray_outside_vertices_beyond_tip_region': int(((sd > .0003) & (sb > EXPOSED + .002)).sum()),
                            'stray_max_outside_m': float(sd[(sb > EXPOSED + .002)].max()) if (sb > EXPOSED + .002).any() else 0.0,
                            'stray_s_back_m': [float(x) for x in np.quantile(sb[(sd > 0) & (sb > EXPOSED + .002)], [0, .5, 1])] if ((sd > 0) & (sb > EXPOSED + .002)).any() else [],
                            'stray_centroid_minus_exit_m': (W[(sd > 0) & (sb > EXPOSED + .002)].mean(0) - hit).tolist() if ((sd > 0) & (sb > EXPOSED + .002)).any() else [],
                            'vertices_outside_skin': int((sd > 0).sum()), 'vertices': len(W), 'min_z_m': float(W[:, 2].min()),
                            'mesh_sha256': hashlib.sha256(co(c).tobytes()).hexdigest()})

d = np.linalg.norm(Q - P, axis=1); moved = np.flatnonzero(d > 0); allowed = reg(P)
np.savez_compressed(OUT / 'hindpaw_region_delta.npz', base_co=P[moved], new_co=Q[moved], vertex_indices=moved)
meta = {'body_object': o.name, 'count': int(len(moved)), 'buildId': 'B-tx7x', 'defectId': 'D-qkpg', 'coordinate_space': 'body local meters', 'topology_sha256': before,
        'region': {'abs_x_gt': .04, 'y_open_interval': [.025, .34], 'z_lt': .13, 'full_strength_below_z': .065, 'falloff_zero_at_z': .12}}
(OUT / 'hindpaw_region_delta.json').write_text(json.dumps(meta, indent=2))
(OUT / 'hind_claw_transforms.json').write_text(json.dumps({'toes_left': toes, 'search': {str(k): v for k, v in chosen.items()}, 'claws': claw_report}, indent=2))
metrics = {'buildId': 'B-tx7x', 'vertex_count': len(P), 'face_count': len(o.data.polygons), 'moved_vertex_count': int(len(moved)), 'maximum_displacement_m': float(d.max()),
           'mean_moved_displacement_m': float(d[moved].mean()), 'mean_all_displacement_m': float(d.mean()), 'outside_region_vertex_count': int((~allowed).sum()),
           'outside_region_max_displacement_m': float(d[~allowed].max()), 'at_or_above_falloff_max_displacement_m': float(d[P[:, 2] >= .12].max()),
           'fore_paws_max_displacement_m': float(d[P[:, 1] <= .025].max()), 'topology_before_sha256': before, 'topology_after_sha256': topology(o),
           'correspondence': correspondence, 'claw_count': len(claw_report)}
(OUT / 'measurements.json').write_text(json.dumps(metrics, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'luceras_sculpt.blend'), compress=True)
print('REPAIR', json.dumps(metrics), flush=True)
for r in claw_report: print('CLAW', r['object'], r['pitch_down_deg'], r['yaw_deg'], r['exit_height_m'], 'exp', round(r['measured_exposed_along_axis_m'], 4), 'dx', r['exit_x_shift_m'], 'stray', r['stray_outside_vertices_beyond_tip_region'], 'straymax', round(r['stray_max_outside_m'], 4), 'minz', round(r['min_z_m'], 4), 'sback', [round(x,4) for x in r['stray_s_back_m']], 'cen', [round(x,4) for x in r['stray_centroid_minus_exit_m']], flush=True)
