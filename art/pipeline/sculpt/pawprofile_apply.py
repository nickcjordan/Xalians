"""B-4cj4: apply the paw profile result (npz from pawprofile_build.py) to the sculpt and to the base groom, and write the
region delta and checks.

Usage: blender -b --python pawprofile_apply.py -- --sculpt IN.blend --result RESULT.npz --out-blend OUT.blend --out-dir DIR
       [--groom-in base_groom.blend --groom-out groom.blend]
Vertex moves only: the vertex count, order and faces are unchanged (topology hash checked). Claws get the rigid matrices
from the result (rotation about z through the claw base plus the base displacement), at their current size.
"""
import bpy, numpy as np, sys, json, argparse, hashlib
from pathlib import Path
from mathutils import Matrix, Vector

ap = argparse.ArgumentParser()
for k in ('sculpt', 'result', 'out_blend', 'out_dir', 'groom_in', 'groom_out'): ap.add_argument('--' + k.replace('_', '-'), dest=k)
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:])
R = np.load(a.result); NEW = R['new_world']; OUT = Path(a.out_dir); OUT.mkdir(parents=True, exist_ok=True)


def topo(body):
    vi = np.empty(len(body.data.loops), np.int32); body.data.loops.foreach_get('vertex_index', vi); return hashlib.sha256(vi.tobytes()).hexdigest()


def apply_scene():
    body = bpy.data.objects['luceras_blockout']; mw = np.array(body.matrix_world); inv = np.linalg.inv(mw)
    co = np.empty(len(body.data.vertices) * 3); body.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    h0 = topo(body); assert len(co) == len(NEW)
    newco = NEW @ inv[:3, :3].T + inv[:3, 3]
    body.data.vertices.foreach_set('co', newco.ravel().astype(np.float32)); body.data.update()
    claws = {}
    for k in R.files:
        if not k.startswith('clawM_'): continue
        o = bpy.data.objects[k[6:]]; M = Matrix(R[k].tolist()); o.matrix_world = M @ o.matrix_world
        claws[o.name] = R[k].tolist()
    return body, co, newco, mw, h0, topo(body), claws


bpy.ops.wm.open_mainfile(filepath=a.sculpt)
body, co, newco, mw, h0, h1, claws = apply_scene()
co32 = np.empty(len(co) * 3, np.float32); body.data.vertices.foreach_get('co', co32); newco = co32.reshape(-1, 3).astype(np.float64)
bpy.ops.wm.save_as_mainfile(filepath=a.out_blend, compress=True)
moved = np.linalg.norm(newco - co, axis=1) > 1e-7
np.savez_compressed(OUT / 'pawprofile_region_delta.npz', index=np.where(moved)[0], base_co=co[moved], new_co=newco[moved])
w = co @ mw[:3, :3].T + mw[:3, 3]; new = newco @ mw[:3, :3].T + mw[:3, 3]; d = np.linalg.norm(new - w, axis=1)
(OUT / 'pawprofile_region_delta.json').write_text(json.dumps({'buildId': 'B-4cj4', 'body_object': 'luceras_blockout', 'count': int(moved.sum()),
    'coordinate_space': 'body local meters', 'index': 'vertex indices of the moved vertices (also matched by base coordinates in art/pipeline/sculpt/apply_region_delta.py)',
    'topology_sha256': h1, 'claw_world_matrices_premultiplied': claws, 'reverse': 'swap base_co and new_co; premultiply each claw by the inverse matrix'}, indent=1))
mesh = body.data; mesh.calc_loop_triangles(); tris = np.array([t.vertices[:] for t in mesh.loop_triangles])
def nrm(p): x = p[tris]; return np.cross(x[:, 1] - x[:, 0], x[:, 2] - x[:, 0])
n0, n1 = nrm(w), nrm(new); dots = (n0 * n1).sum(1) / np.maximum(np.linalg.norm(n0, axis=1) * np.linalg.norm(n1, axis=1), 1e-20)
mv = moved[tris].any(1)
from mathutils.bvhtree import BVHTree
bv1 = BVHTree.FromPolygons(new.tolist(), tris.tolist()); seat = {}
for o in bpy.data.objects:
    if o.type != 'MESH' or 'claw' not in o.name.lower(): continue
    vw = np.array([o.matrix_world @ p.co for p in o.data.vertices]); inside = 0
    for p in vw[::6]:
        loc, nor, _, dist = bv1.find_nearest(Vector(p))
        if loc is not None and (Vector(p) - loc).dot(nor) < 0: inside += 1
    seat[o.name] = {'embedded_fraction': inside / len(vw[::6]), 'min_z_m': float(vw[:, 2].min())}
fore = w[:, 1] < 0
chk = {'vertices': len(w), 'topology_sha256_base': h0, 'topology_sha256_new': h1, 'topology_equal': h0 == h1,
       'moved_vertices': int(moved.sum()), 'max_displacement_m': float(d.max()),
       'leg_check': {'fore_max_displacement_at_or_above_z_0.080_m': float(d[fore & (w[:, 2] >= 0.080)].max()),
                     'hind_max_displacement_at_or_above_z_0.100_m': float(d[~fore & (w[:, 2] >= 0.100)].max()),
                     'max_displacement_abs_x_lt_0.004_m': float(d[np.abs(w[:, 0]) < 0.004].max()),
                     'highest_moved_vertex_z_fore_m': float(w[moved & fore, 2].max()), 'highest_moved_vertex_z_hind_m': float(w[moved & ~fore, 2].max())},
       'triangles_turned_over_90deg_in_moved_region': int((dots[mv] < 0).sum()), 'triangles_turned_over_60deg_in_moved_region': int((dots[mv] < 0.5).sum()),
       'min_z_before_m': float(w[:, 2].min()), 'min_z_after_m': float(new[:, 2].min()),
       'sole_vertices_below_1mm_before': int((w[:, 2] < 0.001).sum()), 'sole_vertices_below_1mm_after': int((new[:, 2] < 0.001).sum()), 'claws': seat}
(OUT / 'pawprofile_sculpt_checks.json').write_text(json.dumps(chk, indent=1))
print('CHECK', json.dumps({k: v for k, v in chk.items() if k != 'claws'}))
if a.groom_in:
    bpy.ops.wm.open_mainfile(filepath=a.groom_in)
    b2 = bpy.data.objects['luceras_blockout']; c2 = np.empty(len(b2.data.vertices) * 3); b2.data.vertices.foreach_get('co', c2)
    assert np.allclose(c2.reshape(-1, 3), co, atol=1e-6), 'groom body differs from the base sculpt'
    apply_scene(); Path(a.groom_out).parent.mkdir(parents=True, exist_ok=True); bpy.ops.wm.save_as_mainfile(filepath=a.groom_out)
    print('GROOM saved', a.groom_out)
