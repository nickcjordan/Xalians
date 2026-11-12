"""Akinza rig, Blender half: armature and vertex groups on the shaved skin, the review poses, clay renders.

  run_blender.py render_board.py <log> -- <surface.blend> <rig dir> [--poses a,b] [--samples 16] [--no-save]

Opens the fur of record, drops the fur curves and the eyeliner ribbons (fur-stage parts), bakes the
re-origin and scale from rig.json into every mesh, builds the armature from joints.json (rig_core.ANIM_BONES),
writes weights.npz into vertex groups (1/4096 steps), binds claws to the hands and feet and the eyes, nose
and mouth to the head, then for each pose in poses.json: poses the armature, checks the evaluated skin
against rig_core's numpy skinning, and renders a side view and the close-ups (shoulder, hip, knee, neck, ear
root, tail fork, ankle) in the look-dev clay scene. Corrective keys with a `direction` get rig_core.key_value's
gate in their driver (the swing axis from SWING_TWIST_Y's x and z channels). Writes renders/<pose>_<view>.png, blender-check.json and
rig.blend (rest pose) into the rig dir.
"""
import argparse
import json
import math
import sys
import time
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE.parents[1]/'pipeline/roster'))
import rig_core as rc  # noqa: E402
import lookdev  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('surface')
p.add_argument('rig', type=Path)
p.add_argument('--poses')
p.add_argument('--samples', type=int, default=16)
p.add_argument('--no-save', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
t0 = time.time()
R = a.rig
(R/'renders').mkdir(exist_ok=True)
rig_info = json.loads((R/'rig.json').read_text())
J = json.loads((R/'joints.json').read_text())
poses = json.loads((R/'poses.json').read_text())
s, off = rig_info['transform']['scale'], Vector(rig_info['transform']['offset'])
wt = np.load(R/'weights.npz')
idx, w = wt['idx'].astype(int), wt['w'].astype(np.float64)
w = np.round(w*4096)/4096
w /= w.sum(1, keepdims=True)

bpy.ops.wm.open_mainfile(filepath=a.surface)
for o in list(bpy.data.objects):
    if o.type != 'MESH' or 'ribbon' in o.name or o.name.startswith('catch light'):
        bpy.data.objects.remove(o, do_unlink=True)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in meshes:
    mw = o.matrix_world.copy()
    o.parent = None
    co = np.empty(len(o.data.vertices)*3, np.float32)
    o.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)@np.array(mw)[:3, :3].T+np.array(mw)[:3, 3]
    co = s*(co-np.array(off))
    o.data.vertices.foreach_set('co', co.astype(np.float32).ravel())
    o.matrix_world = Matrix.Identity(4)
    o.data.update()
skin = bpy.data.objects['akinza_continuous_construction']
n = len(skin.data.vertices)
assert n == len(idx), (n, len(idx))

# ---- armature
arm = bpy.data.armatures.new('akinza_rig')
rig = bpy.data.objects.new('akinza_rig', arm)
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
segs = rc.segments(J, rc.ANIM_BONES)
for name, parent, _, _ in rc.ANIM_BONES:
    eb = arm.edit_bones.new(name)
    h, t = segs[name]
    eb.head, eb.tail = Vector(h), Vector(t)
    eb.use_deform = name != 'root'
for name, parent, _, _ in rc.ANIM_BONES:
    if parent:
        arm.edit_bones[name].parent = arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')


def bind(o):
    m = o.modifiers.new('Armature', 'ARMATURE')
    m.object = rig
    m.use_vertex_groups = True
    m.use_deform_preserve_volume = True     # dual quaternion skinning, matched by rig_core.skin_points_dq


for b, name in enumerate(rc.ANIM_NAMES):
    vs, ws = [], []
    for k in range(idx.shape[1]):
        hit = np.where((idx[:, k] == b) & (w[:, k] > 0))[0]
        vs.append(hit)
        ws.append(w[hit, k])
    vs, ws = np.concatenate(vs), np.concatenate(ws)
    g = skin.vertex_groups.new(name=name)
    level = np.round(ws*4096).astype(int)
    for q in np.unique(level):
        g.add(vs[level == q].tolist(), float(q)/4096, 'REPLACE')
bind(skin)
assign = {}
for o in meshes:
    if o is skin:
        continue
    nm = o.name.lower()
    side = 'L' if '+1' in nm or nm.endswith('_1') else 'R'
    if 'mouth' in nm:
        # the mouth crease lies on the lips: it takes the weights of the skin under it, so it opens with the jaw
        from mathutils.kdtree import KDTree
        if 'skin_kd' not in globals():
            skin_kd = KDTree(n)
            for i, v in enumerate(skin.data.vertices):
                skin_kd.insert(v.co, i)
            skin_kd.balance()
        groups = {}
        for v in o.data.vertices:
            near = skin_kd.find_n(v.co, 4)
            ws = np.array([1/max(dist, 1e-5) for _, _, dist in near])
            ws /= ws.sum()
            acc = {}
            for (co, i, dist), f in zip(near, ws):
                for k in range(idx.shape[1]):
                    if w[i, k] > 0:
                        acc[idx[i, k]] = acc.get(idx[i, k], 0)+f*w[i, k]
            for b, val in acc.items():
                groups.setdefault(b, []).append((v.index, val))
        for b, lst in groups.items():
            g = o.vertex_groups.new(name=rc.ANIM_NAMES[b])
            for i, val in lst:
                g.add([i], float(val), 'REPLACE')
        bind(o)
        assign[o.name] = 'skin weights under it'
        continue
    bone = f'hand.{side}' if 'fore claw' in nm else f'foot.{side}' if 'hind claw' in nm else 'head'
    g = o.vertex_groups.new(name=bone)
    g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    bind(o)
    assign[o.name] = bone
rest = np.empty(n*3, np.float32)
skin.data.vertices.foreach_get('co', rest)
rest = rest.reshape(-1, 3).astype(np.float64)
# ---- corrective shape keys, each driven by its bone's swing (rig_core.driver_value)
cj = json.loads((R/'correctives.json').read_text())
KEYS = cj['keys']
cz = np.load(R/'correctives.npz')
DELTAS = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in KEYS}
skin.shape_key_add(name='Basis', from_mix=False)
for k in KEYS:
    if 'pose_space' in k:
        # (2026-11-12, pose_space_corrective.py: the neck fold and grip arm keys are driven by rotation distance in pose space,
        # which has no Blender driver here yet; they are 0 at every board pose, and rig_core.posed_skin applies them everywhere else)
        print('skipping pose-space key', k['name'], flush=True)
        continue
    sk = skin.shape_key_add(name=k['name'], from_mix=False)
    co = rest.copy()
    ids, dl = DELTAS[k['name']]
    co[ids] += dl
    sk.data.foreach_set('co', co.astype(np.float32).ravel())
    sk.slider_min, sk.slider_max = 0, 1
    fc = sk.driver_add('value')
    drv = fc.driver
    drv.type = 'SCRIPTED'
    var = drv.variables.new()
    var.name = 'a'
    var.type = 'TRANSFORMS'
    t = var.targets[0]
    t.id = rig
    t.bone_target = k['bone']
    t.transform_type = 'ROT_W'
    t.rotation_mode = 'SWING_TWIST_Y'
    t.transform_space = 'LOCAL_SPACE'
    r0, r1 = (math.radians(x) for x in k['rise'])
    expr = f'(a-{r0:.6f})/{r1-r0:.6f}'
    if k.get('fall') is not None:
        f1 = math.radians(k['fall'])
        expr = f'min({expr}, ({f1:.6f}-a)/{f1-r1:.6f})'
    expr = f'max(0.0, min(1.0, {expr}))'
    dr = k.get('direction')
    if dr:
        # rig_core.key_value's direction gate: the swing axis (u x v, unit) against the key's axis, through a smoothstep
        # over the band. SWING_TWIST_Y in local space gives the swing quaternion's x and z (ROT_X, ROT_Z; ROT_Y is the
        # twist), so the swing axis is (x, 0, z) in the bone's rest frame; turned into armature space by the bone's rest
        # matrix, its dot with the axis is (x*c0 + z*c2)/|(x, z)| with c = Bm^T axis. The gate is its own driver on a
        # custom property of the armature (a driver expression is cut at 256 characters), read by the key's driver.
        Bm = np.array(arm.bones[k['bone']].matrix_local.to_3x3())
        ax = np.asarray(dr['axis'], float)
        cvec = dr['sign']*(Bm.T@(ax/np.linalg.norm(ax)))
        prop = f"gate_{k['name']}"
        rig[prop] = 0.0
        gfc = rig.driver_add(f'["{prop}"]')
        gdrv = gfc.driver
        gdrv.type = 'SCRIPTED'
        for vn, ch in (('x', 'ROT_X'), ('z', 'ROT_Z')):
            dv = gdrv.variables.new()
            dv.name = vn
            dv.type = 'TRANSFORMS'
            dt = dv.targets[0]
            dt.id = rig
            dt.bone_target = k['bone']
            dt.transform_type = ch
            dt.rotation_mode = 'SWING_TWIST_Y'
            dt.transform_space = 'LOCAL_SPACE'
        lo, hi = dr['band']
        t = f'max(0,min(1,(({cvec[0]:.5f}*x+{cvec[2]:.5f}*z)/sqrt(x*x+z*z+1e-12)-{lo:.4f})/{hi-lo:.4f}))'
        gdrv.expression = f'{t}*{t}*(3-2*{t})'
        assert len(gdrv.expression) < 256, len(gdrv.expression)
        for mod in gfc.modifiers:
            gfc.modifiers.remove(mod)
        gv = drv.variables.new()
        gv.name = 'g'
        gv.type = 'SINGLE_PROP'
        gv.targets[0].id_type = 'OBJECT'
        gv.targets[0].id = rig
        gv.targets[0].data_path = f'["{prop}"]'
        expr = f'{expr}*g'
    assert len(expr) < 256, (k['name'], len(expr))
    drv.expression = expr
    if dr:
        print('gated driver', k['name'], 'simple expressions', drv.is_simple_expression, gdrv.is_simple_expression, flush=True)
    for mod in fc.modifiers:
        fc.modifiers.remove(mod)
print('rig built', round(time.time()-t0), flush=True)


def set_pose(pose, lift):
    pose = rc.helper_pose(J, pose)        # pass 6: the glute helpers' rotations (half the thigh's), set explicitly
    for name in rc.ANIM_NAMES:
        pb = rig.pose.bones[name]
        pb.rotation_mode = 'QUATERNION'
        Rw = Matrix(rc.euler_matrix(*pose.get(name, (0, 0, 0))).tolist())
        Bm = arm.bones[name].matrix_local.to_3x3()
        pb.rotation_quaternion = (Bm.transposed()@Rw@Bm).to_quaternion()
        pb.location = (0, 0, 0)
    pel = rig.pose.bones['pelvis']
    pel.location = arm.bones['pelvis'].matrix_local.to_3x3().transposed()@Vector(tuple(rc.lift_vec(lift)))   # scalar lift or 3-vector root move
    bpy.context.view_layer.update()


def evaluated(o):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = o.evaluated_get(dg)
    m = ev.to_mesh()
    c = np.empty(len(m.vertices)*3, np.float32)
    m.vertices.foreach_get('co', c)
    ev.to_mesh_clear()
    return c.reshape(-1, 3)


lookdev.setup_scene('CYCLES')
sc = bpy.context.scene
sc.cycles.samples = a.samples
sc.render.threads_mode = 'AUTO'
for o in meshes:
    lookdev.apply_clay(o)
names = a.poses.split(',') if a.poses else list(poses)
# one side framing for every pose so poses compare: the union of all posed bounds (numpy, from the joints)
lo, hi = np.full(3, 9.), np.full(3, -9.)
check = {'assignments': assign, 'poses': {}}
frames = {}
for name in names:
    pz = poses[name]
    set_pose(pz['pose'], pz['lift'])
    P = evaluated(skin)
    lo, hi = np.minimum(lo, P.min(0)), np.maximum(hi, P.max(0))
    want, _, vals = rc.posed_skin(rest, idx, w, J, pz['pose'], pz['lift'], KEYS, DELTAS)
    err = np.linalg.norm(P-want, axis=1)
    got = {k.name: round(k.value, 4) for k in skin.data.shape_keys.key_blocks[1:] if k.value > 0}
    check['poses'][name] = dict(max_error_vs_numpy_m=float(err.max()), mean_error_m=float(err.mean()),
                                keys_blender=got, keys_numpy={k: round(v, 4) for k, v in vals.items() if v > 0})
    print(name, 'numpy agreement', float(err.max()), flush=True)
box = (Vector(lo-.03), Vector(hi+.03))
side_box = (Vector((lo[0]-.03, lo[1]-.03, 0.)), Vector((hi[0]+.03, hi[1]+.03, hi[2]+.03)))
CROPS = {  # view: (joint or joints averaged, azimuth, elevation, half size m)
    'shoulder': (['shoulder.L'], 55, 12, .11),
    'hip': (['hip.L'], 30, 2, .12),
    'knee': (['knee.L'], 90, 2, .12),
    'knee_front': (['knee.L'], 35, 4, .10),
    'neck': (['neck_base', 'head_base'], 65, 6, .10),
    'ear_root': (['ear0.L'], 145, 25, .11),
    'tail_fork': (['tail_fork'], 155, 18, .13),
    'ankle': (['ankle.L'], 60, 8, .08),            # the ankle keys (direction gated): front three-quarter and from behind
    'ankle_back': (['ankle.L'], 150, 10, .08),
}
for name in names:
    pz = poses[name]
    set_pose(pz['pose'], pz['lift'])
    cam = lookdev.place_camera('board_side', side_box, 90, 0, .02)
    lookdev.render(cam, R/'renders'/f'{name}_side.png', size=900)
    for view, (js, az, el, r) in CROPS.items():
        c = Vector(np.mean([pz['joints'][j] for j in js], 0))
        cam = lookdev.place_camera('board_crop', (c-Vector((r, r, r)), c+Vector((r, r, r))), az, el, 0)
        lookdev.render(cam, R/'renders'/f'{name}_{view}.png', size=420)
    if name in ('ears_flat_back', 'night_stalk', 'rest'):
        hc = Vector(pz['joints']['head_base'])
        top = Vector(pz['joints']['head_top'])
        c = (hc+top)/2
        r = .36
        for view, az, el in (('ears_side', 90, 4), ('ears_backq', 140, 22)):
            cam = lookdev.place_camera('board_ear', (c-Vector((r, r, r)), c+Vector((r, r, r))), az, el, 0)
            lookdev.render(cam, R/'renders'/f'{name}_{view}.png', size=700)
    print('rendered', name, round(time.time()-t0), flush=True)
check['seconds'] = round(time.time()-t0)
(R/'blender-check.json').write_text(json.dumps(check, indent=1))
if not a.no_save:
    set_pose({}, 0)
    bpy.ops.wm.save_as_mainfile(filepath=str(R/'rig.blend'))
print('BOARD_DONE', round(time.time()-t0))
