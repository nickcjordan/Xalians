"""B-yqgg pass 2: put the band-fixed sculpt (pass2/luceras_sculpt.blend) on the pass 1 refit rig.

Usage: blender -b --factory-startup --python pawint_rig2.py -- PASS1_DIR PASS2_DIR
Unchanged vertices (exact position match to pass 1) copy their pass 1 weights and corrective offsets. Touched band vertices
get nearest surface interpolation of the pass 1 rig weights on the pass 1 body surface (same method as pass 1) and zero
corrective offset (asserted: pass 1 keys are zero there). Claws, skeleton, controls, actions and game mesh are kept.
Also writes PASS2_DIR/work/sculpt_map.npz and weights.npz in the layout pawint_rig.py verify/render expect.
"""
import bpy, sys, json, numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).parent))
import pass2 as p
r = p.r
a = sys.argv[sys.argv.index('--') + 1:]; P1, P2 = Path(a[0]), Path(a[1]); W2 = P2 / 'work'; LAB = 4 if (a[2] if len(a) > 2 else 'r') == 'r' else 3
BM = np.load(W2 / 'band_map.npz'); src1 = BM['src1']; touched = BM['touched']
M1 = np.load(P1 / 'work/sculpt_map.npz'); WT1 = np.load(P1 / 'work/weights.npz', allow_pickle=True)
rig = p.openfile(P1 / 'rig.blend'); names = [b.name for b in rig.data.bones]
o = bpy.data.objects['luceras_blockout']; game_before = {g.name: r.fingerprint(g)['geometry_sha256'] for g in r.meshes('game')}
A1 = r.weights(o, names); V1old = np.array([v.co[:] for v in o.data.vertices])
k = o.data.shape_keys; base = np.array([v.co[:] for v in k.key_blocks['Basis'].data]); kn = []; kd = []
for kb in k.key_blocks[1:]:
    x = np.empty(len(kb.data) * 3); kb.data.foreach_get('co', x); kn.append(kb.name); kd.append(x.reshape(-1, 3) - base)
drv = []
for fc in k.animation_data.drivers:
    d = fc.driver; drv.append((fc.data_path, d.type, d.expression, [(v.name, v.type, v.targets[0].bone_target, v.targets[0].transform_type, v.targets[0].transform_space, v.targets[0].rotation_mode) for v in d.variables]))
mats = list(o.data.materials); oldname = o.data.name
with bpy.data.libraries.load(str(P2 / 'luceras_sculpt.blend'), link=False) as (s, d):
    d.objects = ['luceras_blockout']
nob = d.objects[0]; nm = nob.data
for ob in list(bpy.data.objects):
    if ob.name.startswith('luceras_rig.') or ob is nob: bpy.data.objects.remove(ob, do_unlink=True)
for arm in list(bpy.data.armatures):
    if arm.users == 0: bpy.data.armatures.remove(arm)
V2 = np.array([v.co[:] for v in nm.vertices]); assert np.allclose(V2, BM['V1'])
keep = ~touched
A2 = np.zeros((len(V2), len(names))); A2[keep] = A1[src1[keep]]
o.data.calc_loop_triangles(); T1 = np.array([t.vertices[:] for t in o.data.loop_triangles]); bvh = BVHTree.FromPolygons(V1old.tolist(), T1.tolist(), all_triangles=True)
ds = []
for i in np.flatnonzero(touched):
    hit, nrm, fi, dd = bvh.find_nearest(Vector(V2[i])); t = T1[fi]; Q = V1old[t]
    u = Q[1] - Q[0]; v = Q[2] - Q[0]; w = np.array(hit) - Q[0]; uu, uv, vv, wu, wv = u @ u, u @ v, v @ v, w @ u, w @ v; den = uu * vv - uv * uv
    bc = np.array([1., 0, 0]) if abs(den) < 1e-20 else np.clip([1 - (vv * wu - uv * wv) / den - (uu * wv - uv * wu) / den, (vv * wu - uv * wv) / den, (uu * wv - uv * wu) / den], 0, 1)
    A2[i] = (bc / bc.sum()) @ A1[t]; ds.append(dd)
# corrective offsets on the pass 1 vertices that were touched must be zero
removed1 = np.ones(len(V1old), bool); removed1[src1[keep]] = False
key_lost = {n: float(np.linalg.norm(kd[i][removed1], axis=1).max()) for i, n in enumerate(kn)}
near_touched = {n: float(np.linalg.norm(kd[i][np.unique(T1[[bvh.find_nearest(Vector(V2[j]))[2] for j in np.flatnonzero(touched)]].ravel())], axis=1).max()) for i, n in enumerate(kn)}
assert max(key_lost.values()) == 0.0 and max(near_touched.values()) == 0.0, (key_lost, near_touched)
o.data = nm
om = bpy.data.meshes.get(oldname)
if om is not None and om is not nm and om.users == 0: bpy.data.meshes.remove(om)
nm.name = 'luceras_blockout'; nm.materials.clear()
for m in mats: nm.materials.append(m)
for poly in nm.polygons: poly.material_index = 0
A2 = r.setweights(o, A2, names, limit=None)
o.shape_key_add(name='Basis', from_mix=False)
for i, n in enumerate(kn):
    kb = o.shape_key_add(name=n, from_mix=False); dl = np.zeros_like(V2); dl[keep] = kd[i][src1[keep]]; kb.data.foreach_set('co', (V2 + dl).ravel()); kb.value = 0
for path, typ, expr, vars_ in drv:
    fc = o.data.shape_keys.driver_add(path); dd = fc.driver; dd.type = typ
    for nme, vt, bone, tt, ts, rm in vars_:
        var = dd.variables.new(); var.name = nme; var.type = vt; t = var.targets[0]; t.id = rig; t.bone_target = bone; t.transform_type = tt; t.transform_space = ts; t.rotation_mode = rm
    dd.expression = expr
    for mod in list(fc.modifiers): fc.modifiers.remove(mod)
o['sculpt_source'] = str(P2 / 'luceras_sculpt.blend'); rig['pawintegrate_build_id'] = 'B-yqgg ' + P2.name
game_after = {g.name: r.fingerprint(g)['geometry_sha256'] for g in r.meshes('game')}
bpy.ops.wm.save_as_mainfile(filepath=str(P2 / 'rig.blend'))
# maps for pawint_rig.py verify/render (src relative to the base sculpt, paw labels, smoothing mask)
src0 = np.full(len(V2), -1); src0[keep] = M1['src'][src1[keep]]
lab = np.zeros(len(V2), np.int8); lab[keep] = M1['paw_label'][src1[keep]]; lab[touched] = LAB
mask = np.ones(len(V2)); mask[keep] = WT1['mask'][src1[keep]]
ring = np.zeros(len(V2), bool); ring[keep] = M1['ring'][src1[keep]]
np.savez_compressed(W2 / 'sculpt_map.npz', src=src0, paw_label=lab, ring=ring, new_world=V2, base_world=M1['base_world'])
np.savez_compressed(W2 / 'weights.npz', a_new=A2, mask=mask, names=np.array(names))
(W2 / 'rig2_build.json').write_text(json.dumps(dict(touched=int(touched.sum()), kept=int(keep.sum()), interp_surface_distance_mm_max=float(1000 * max(ds)),
    corrective_offset_on_touched_or_removed_m=dict(removed=key_lost, nearby=near_touched), weight_change_on_touched_max=None,
    game_unchanged=game_before == game_after), indent=1))
print('RIG2 saved', int(touched.sum()), game_before == game_after)
