"""B-ykwq: scale all four Luceras paws (vertex moves only) about a pivot at the ankle on the sole line.

Usage: blender -b --python pawsize_scale.py -- --sculpt IN.blend --measure measure_A.json --option B --scales JSON
       --out-blend OUT.blend --out-dir DIR [--groom-in base_groom.blend --groom-out groom.blend]
scales JSON: {"fore": [width, length, height], "hind": [width, length, height]}
The field is computed once from the left paws and mirrored for the right paws, so left and right are symmetric.
Weight is 1 below the paw top and falls off (smoothstep) to 0 just above the wrist or hock. Claw objects (and
dewclaws) are translated by the field at their centroid, at their current size. Writes a region delta (npz + meta).
"""
import bpy, numpy as np, sys, json, argparse, hashlib
from pathlib import Path
from mathutils import Vector

ap = argparse.ArgumentParser()
for k in ('sculpt', 'measure', 'option', 'scales', 'out_blend', 'out_dir', 'groom_in', 'groom_out'): ap.add_argument('--' + k.replace('_', '-'), dest=k)
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:])
M = json.loads(Path(a.measure).read_text())['paws']; S = json.loads(a.scales); OUT = Path(a.out_dir); OUT.mkdir(parents=True, exist_ok=True)
# paw top (full strength below) and falloff end (zero above), meters
ZONE = {'fore': (0.030, M['fore_l']['joint_m'][2] + 0.012), 'hind': (0.040, M['hind_l']['joint_m'][2] + 0.010)}
# width falls off sooner (zero at the narrowest leg section above the paw), so the ankle keeps its width
WZONE = {'fore': (0.030, 0.050), 'hind': (0.040, 0.065)}


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)


def params(kind, side):
    p = M[kind + '_l']
    ax = np.array(p['paw_axis_xy']); legc_z = p['ankle_z_m']
    # pivot: centre of the narrowest leg section above the paw, dropped to the sole line (z = 0)
    piv = np.array(p['pivot_xy_m'])
    if side < 0: ax = ax * [-1, 1]; piv = piv * [-1, 1]
    perp = np.array([-ax[1], ax[0]])
    return piv, ax, perp


def field(w, kind, side):
    """New positions for world points w (n,3) belonging to the given paw."""
    piv, ax, perp = params(kind, side); sw, sl, sz = S[kind]; z0, z1 = ZONE[kind]
    f = 1 - smooth(z0, z1, w[:, 2]); fw = 1 - smooth(*WZONE[kind], w[:, 2])
    rel = w[:, :2] - piv; u = rel @ ax; v = rel @ perp
    u2 = u * (1 + (sl - 1) * f); v2 = v * (1 + (sw - 1) * fw)
    out = w.copy(); out[:, :2] = piv + u2[:, None] * ax + v2[:, None] * perp
    out[:, 2] = w[:, 2] * (1 + (sz - 1) * f)
    return out, f


def members(w):
    """(kind, side) masks: paw regions are the legs below the falloff end, split by side and fore/hind half."""
    res = {}
    for kind in ('fore', 'hind'):
        for side in (1, -1):
            m = (np.sign(w[:, 0]) == side) & (np.abs(w[:, 0]) > 0.004) & (w[:, 2] < ZONE[kind][1]) & ((w[:, 1] < 0) if kind == 'fore' else (w[:, 1] > 0))
            res[(kind, side)] = m
    return res


def apply_scene():
    body = bpy.data.objects['luceras_blockout']; mw = np.array(body.matrix_world); inv = np.linalg.inv(mw)
    co = np.empty(len(body.data.vertices) * 3); body.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    w = co @ mw[:3, :3].T + mw[:3, 3]; new = w.copy(); weight = np.zeros(len(w))
    for (kind, side), m in members(w).items():
        new[m], weight[m] = field(w[m], kind, side)
    newco = new @ inv[:3, :3].T + inv[:3, 3]
    vi = np.empty(len(body.data.loops), np.int32); body.data.loops.foreach_get('vertex_index', vi)
    body.data.vertices.foreach_set('co', newco.ravel().astype(np.float32)); body.data.update()
    claws = {}
    for o in bpy.data.objects:
        if o.type != 'MESH' or 'claw' not in o.name.lower(): continue
        cw = np.array(o.matrix_world); v = np.array([p.co[:] for p in o.data.vertices]); vw = v @ cw[:3, :3].T + cw[:3, 3]; c = vw.mean(0)
        kind = 'fore' if o.name.startswith('fore') else 'hind'; side = 1 if '_l' in o.name else -1
        nc, f = field(c[None], kind, side); d = nc[0] - c
        o.matrix_world = __import__('mathutils').Matrix.Translation(Vector(d)) @ o.matrix_world
        claws[o.name] = {'translation_m': d.tolist(), 'weight': float(f[0])}
    return body, co, newco, w, new, weight, vi, claws


bpy.ops.wm.open_mainfile(filepath=a.sculpt)
body, co, newco, w, new, weight, vi, claws = apply_scene()
moved = np.linalg.norm(newco - co, axis=1) > 0
bpy.ops.wm.save_as_mainfile(filepath=a.out_blend, compress=True)
# region delta (body local coordinates, matched by base coordinates in apply_region_delta.py)
np.savez_compressed(OUT / f'pawsize_{a.option}_region_delta.npz', base_co=co[moved], new_co=newco[moved])
(OUT / f'pawsize_{a.option}_region_delta.json').write_text(json.dumps({'body_object': 'luceras_blockout', 'count': int(moved.sum()), 'buildId': 'B-ykwq', 'option': a.option,
    'coordinate_space': 'body local meters', 'topology_sha256': hashlib.sha256(vi.tobytes()).hexdigest(), 'scales_width_length_height': S, 'zones_full_below_zero_above_m': ZONE, 'width_zones_m': WZONE,
    'claw_translations': claws, 'reverse': 'swap base_co and new_co'}, indent=1))
# checks
d = np.linalg.norm(new - w, axis=1)
mesh = body.data; mesh.calc_loop_triangles(); tris = np.array([t.vertices[:] for t in mesh.loop_triangles])
def nrm(p): x = p[tris]; return np.cross(x[:, 1] - x[:, 0], x[:, 2] - x[:, 0])
n0, n1 = nrm(w), nrm(new); dots = (n0 * n1).sum(1) / np.maximum(np.linalg.norm(n0, axis=1) * np.linalg.norm(n1, axis=1), 1e-20)
flips = int((dots[weight[tris].max(1) > 0] < 0.5).sum())
# claw seating: distance from claw vertices to the skin, before and after (nearest body vertex)
from mathutils.bvhtree import BVHTree
bv0 = BVHTree.FromPolygons(w.tolist(), tris.tolist()); bv1 = BVHTree.FromPolygons(new.tolist(), tris.tolist())
seat = {}
for o in bpy.data.objects:
    if o.type != 'MESH' or 'claw' not in o.name.lower(): continue
    vw = np.array([o.matrix_world @ p.co for p in o.data.vertices]); t = claws[o.name]['translation_m']; v0 = vw - np.array(t)
    def inside_frac(bv, pts):
        c = 0
        for p in pts[::8]:
            loc, nor, _, dist = bv.find_nearest(Vector(p))
            if loc is not None and (Vector(p) - loc).dot(nor) < 0: c += 1
        return c / len(pts[::8])
    def gap(bv, pts): return float(min(bv.find_nearest(Vector(p))[3] for p in pts[::8]))
    seat[o.name] = {'embedded_fraction_before': inside_frac(bv0, v0), 'embedded_fraction_after': inside_frac(bv1, vw), 'min_gap_before_m': gap(bv0, v0), 'min_gap_after_m': gap(bv1, vw), 'min_z_after_m': float(vw[:, 2].min())}
L = w[:, 0] > 0.004; R = w[:, 0] < -0.004
chk = {'option': a.option, 'scales': S, 'vertices': len(w), 'moved_vertices': int(moved.sum()), 'max_displacement_m': float(d.max()),
       'topology_sha256': hashlib.sha256(vi.tobytes()).hexdigest(),
       'max_displacement_where_weight_zero_m': float(d[weight == 0].max()),
       'max_displacement_above_falloff_end_fore_m': float(d[(w[:, 1] < 0) & (w[:, 2] >= ZONE['fore'][1])].max()),
       'max_displacement_above_falloff_end_hind_m': float(d[(w[:, 1] > 0) & (w[:, 2] >= ZONE['hind'][1])].max()),
       'max_displacement_near_midline_abs_x_lt_0.03_m': float(d[np.abs(w[:, 0]) < 0.03].max()),
       'triangles_turned_over_60deg_in_moved_region': flips,
       'min_z_before_m': float(w[:, 2].min()), 'min_z_after_m': float(new[:, 2].min()),
       'sole_vertices_below_1mm_before': int((w[:, 2] < 0.001).sum()), 'sole_vertices_below_1mm_after': int((new[:, 2] < 0.001).sum()),
       'claws': seat}
(OUT / f'pawsize_{a.option}_sculpt_checks.json').write_text(json.dumps(chk, indent=1))
print('CHECK', json.dumps({k: v for k, v in chk.items() if k != 'claws'}))
for k, v in seat.items(): print('CLAW', k, {x: round(y, 4) for x, y in v.items()})

if a.groom_in:
    bpy.ops.wm.open_mainfile(filepath=a.groom_in)
    b2 = bpy.data.objects['luceras_blockout']; c2 = np.empty(len(b2.data.vertices) * 3); b2.data.vertices.foreach_get('co', c2)
    assert np.allclose(c2.reshape(-1, 3), co, atol=1e-7), 'groom body differs from sculpt A'
    apply_scene(); bpy.ops.wm.save_as_mainfile(filepath=a.groom_out)
    print('GROOM saved', a.groom_out)
