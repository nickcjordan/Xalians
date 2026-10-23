"""Luceras B-sntv pass 8b: fur product check of the fold contacts (Cycles strand fur, sprite camera).

Scene build follows luceras-furmotion/pass2/work/furmotion.py (append the groom curves, lights, ground and world from
the groom into the clips file, body attributes and materials copied by index, curves parented to the rig). The groom is
luceras-groom/pass12/groom.blend; its own plume spine proxy is kept (rebound to the clip rig) because the pass 12 plume
strands are bound to it by triangle index.

Usage: blender -b --factory-startup --python furcheck.py -- GROOM ANIMDIR OUTDIR LABEL [probe]
  ANIMDIR holds work/clips.blend, work/bake.json (specs for the sprite camera framing)
Renders, for crouch_deep (review.poses, in place) and sig frames 12 14 16 18 20 22 29:
  side cell camera (pose_rig 'sidecell': az 270, 1.5 m ortho following the body, 960x640): fur and clay
  low three-quarter front (az 315, el -12, fitted to the body) for crouch_deep and f16: fur and clay
"""
import bpy, sys, json, os
import numpy as np
from pathlib import Path
from mathutils import Vector

A = sys.argv[sys.argv.index('--') + 1:]
GROOM, ANIM, OUT, LABEL = A[0], Path(A[1]), Path(A[2]), A[3]
PROBE = len(A) > 4 and A[4] == 'probe'
sys.path.insert(0, '/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/roster')
import lookdev  # noqa: E402
POSE_ORDER = 'rest,crouch,leap,landing,head_left_up,tail_side_up,foreleg_step,breath_in,crouch_deep,landing_old'.split(',')
C0 = Vector((0.0, 0.12, 0.48))
# pass 9: FC_POSES = comma list of review pose names and sig frames ('review:crouch_deep', 'sig:16');
# FC_VIEWS = default views for every pose (side, threeq, low34_front_left, back, front); FC_EXTRA = 'tag=view+view;...'
_def = 'review:crouch_deep,sig:12,sig:14,sig:16,sig:18,sig:20,sig:22,sig:29'
FRAMES = [(x.split(':')[0], x.split(':')[1]) for x in os.environ.get('FC_POSES', _def).split(',')]
FRAMES = [(k, v if k == 'review' else int(v)) for k, v in FRAMES]
VIEWS = os.environ.get('FC_VIEWS', 'side').split(',')
EXTRA = {}
for item in filter(None, os.environ.get('FC_EXTRA', 'crouch_deep=threeq;sig_f16=threeq').split(';')):
    t, v = item.split('='); EXTRA[t] = v.split('+')
OBLIQUE = {'threeq': (315.0, -12.0, 'chest'), 'low34_front_left': (45.0, -12.0, 'body'), 'low34_rear_left': (135.0, -12.0, 'body'),
           'back': (180.0, 0.0, 'body'), 'front': (0.0, 0.0, 'body')}


def arr(items, key, n=3, dt=np.float32):
    a = np.empty(len(items) * n, dt); items.foreach_get(key, a)
    return a.reshape(-1, n) if n > 1 else a


bpy.ops.wm.open_mainfile(filepath=str(ANIM / 'work' / 'clips.blend'))
s = bpy.context.scene
body = bpy.data.objects['luceras_blockout']; rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0
old_proxy = bpy.data.objects.get('luceras_plume_spine')
for o in list(s.objects):
    if o.name in ('plume_standin',) or o.name.startswith(('game_', 'whiskers_', 'shot_', 'brisket_', 'bk_w_')): o.hide_render = True
with bpy.data.libraries.load(GROOM, link=False) as (src, dst):
    names = list(src.objects)
    dst.objects = [n for n in src.objects if n.startswith(('Plume', 'Luceras', 'Pass7', 'Eyelid', 'luceras_blockout', 'lookdev_', 'luceras_plume_spine'))]
    dst.worlds = list(src.worlds)
objs = [o for o in dst.objects if o]
if PROBE:
    print('PROBE groom objects', names)
    print('PROBE imported', [(o.name, o.type, [m.type for m in getattr(o, 'modifiers', [])]) for o in objs])
    print('PROBE clip objects', [(o.name, o.type) for o in s.objects])
    print('PROBE actions', [a.name for a in bpy.data.actions])
gbody = [o for o in objs if o.type == 'MESH' and o.name.startswith('luceras_blockout')][0]
gproxy = next((o for o in objs if o.type == 'MESH' and o.name.startswith('luceras_plume_spine')), None)
curves = [o for o in objs if o.type == 'CURVES']
rig.animation_data_create(); rig.animation_data.action = None; rig.location = (0, 0, 0); bpy.context.view_layer.update()
mw = body.matrix_world.copy()
# the groom's plume proxy follows the clip rig
if gproxy is not None:
    s.collection.objects.link(gproxy); gpmw = gproxy.matrix_world.copy(); gproxy.parent = rig; gproxy.matrix_parent_inverse = rig.matrix_world.inverted(); gproxy.matrix_world = gpmw
    for m in gproxy.modifiers:
        if m.type == 'ARMATURE': m.object = rig
    gproxy.hide_render = True
    if old_proxy is not None: old_proxy.hide_render = True
proxy = gproxy or old_proxy
assert len(gbody.data.polygons) == len(body.data.polygons) and len(gbody.data.vertices) == len(body.data.vertices), 'body topology differs'
for o in curves:
    s.collection.objects.link(o); o.parent = None; o.matrix_world = mw
    o.data.surface = proxy if o.name.startswith('Plume') else body
    for m in o.modifiers:
        if m.type == 'NODES' and m.node_group:
            for n in m.node_group.nodes:
                if n.bl_idname == 'GeometryNodeObjectInfo':
                    v = n.inputs['Object'].default_value
                    if v == gbody: n.inputs['Object'].default_value = body
for a in gbody.data.attributes:
    if a.name.startswith('.') or a.name in body.data.attributes or a.domain not in ('POINT', 'CORNER', 'FACE') or a.data_type not in ('FLOAT', 'FLOAT_COLOR', 'FLOAT_VECTOR', 'FLOAT2'):
        continue
    key = {'FLOAT_VECTOR': 'vector', 'FLOAT_COLOR': 'color', 'FLOAT2': 'vector'}.get(a.data_type, 'value'); n = {'FLOAT_VECTOR': 3, 'FLOAT_COLOR': 4, 'FLOAT2': 2}.get(a.data_type, 1)
    v = np.empty(len(a.data) * n, np.float32); a.data.foreach_get(key, v)
    body.data.attributes.new(a.name, a.data_type, a.domain).data.foreach_set(key, v)
body.data.materials.clear()
for m in gbody.data.materials: body.data.materials.append(m)
body.data.polygons.foreach_set('material_index', arr(gbody.data.polygons, 'material_index', 1, np.int32)); body.data.update()
for o in objs:
    if o.type == 'LIGHT' or o.name.startswith('lookdev_ground'):
        s.collection.objects.link(o); o.parent = None
if dst.worlds: s.world = dst.worlds[0]
for o in objs:
    if o.name not in s.objects: bpy.data.objects.remove(o)
for o in curves:
    if o.name == 'Plume spine curve': o.hide_render = True; o.hide_viewport = True   # helper, never rendered
for o in curves:
    o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted(); o.matrix_world = mw
s.render.engine = 'CYCLES'; s.cycles.device = 'CPU'; s.render.threads_mode = 'FIXED'; s.render.threads = int(os.environ.get('FUR_THREADS', '6'))
s.cycles.samples = int(os.environ.get('FUR_SAMPLES', '40')); s.cycles.use_denoising = True
try: s.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
s.view_settings.view_transform = 'Standard'
clay = bpy.data.materials.new('furcheck_clay'); clay.use_nodes = True
bs = clay.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value = (0.62, 0.62, 0.62, 1); bs.inputs['Roughness'].default_value = 0.8
skin_mats = list(body.data.materials)


def set_clay(on):
    for o in curves: o.hide_render = on or o.name == 'Plume spine curve'
    for i in range(len(body.data.materials)): body.data.materials[i] = clay if on else skin_mats[i]


bake = json.loads((ANIM / 'work' / 'bake.json').read_text()); specs = bake['specs']['sig.horns-first-descent']
roots = [sp.get('_root', 0.0) for sp in specs]


def pose(kind, f):
    rig.location = (0, 0, 0)
    if kind == 'review':
        rig.animation_data.action = bpy.data.actions['review.poses']; s.frame_set(1 + 10 * POSE_ORDER.index(f))
    else:
        rig.animation_data.action = bpy.data.actions['sig.horns-first-descent']; s.frame_set(f)
    ac = rig.animation_data.action
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    bpy.context.view_layer.update()


_gn = [x.name for x in body.vertex_groups]
_W = np.zeros((len(body.data.vertices), len(_gn)), np.float32)
for _v in body.data.vertices:
    for _g in _v.groups: _W[_v.index, _g.group] = _g.weight
_DOM = np.array(_gn)[_W.argmax(1)]
CHEST = np.isin(_DOM, ['neck_01', 'spine_05', 'leg_fl_01', 'leg_fl_02', 'leg_fr_01', 'leg_fr_02', 'scapula_l', 'scapula_r'])


def body_bounds(mask=None):
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh(); V = arr(m.vertices, 'co'); e.to_mesh_clear()
    W = np.array(body.matrix_world); V = V @ W[:3, :3].T + W[:3, 3]
    if mask is not None: V = V[mask]
    return V.min(0), V.max(0)


cams = {}
def cam_side(name, f, kind):
    cam = cams.get('side') or lookdev.place_camera('furcheck_side', (Vector((-0.2, -0.6, 0.0)), Vector((0.2, 0.6, 0.9))), 270.0, 0.0, 0.05); cams['side'] = cam
    cam.data.ortho_scale = 1.5; cam.data.shift_x = cam.data.shift_y = 0.0
    s.render.resolution_x = 960; s.render.resolution_y = 640; s.render.resolution_percentage = 100; s.camera = cam
    # the rig plays in place here, so the cell camera centres on the posed body (the sprite cell follows the body)
    for o in GROUND: o.hide_render = False
    lo, hi = body_bounds(); cam.location = (cam.location.x, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2)
    # the sprite cell is 1.5 m; widen only when the posed body (plus 10 percent) would not fit the 3:2 frame
    cam.data.ortho_scale = max(1.5, (hi[1] - lo[1]) * 1.1, (hi[2] - lo[2]) * 1.1 * 1.5)
    bpy.context.view_layer.update(); return cam


GROUND = [o for o in s.objects if o.name.startswith('lookdev_ground')]


def cam_oblique(view):
    # oblique and front/back views: fitted to the body (or to the chest), ground hidden when the camera is below it
    az, el, what = OBLIQUE[view]
    for o in GROUND: o.hide_render = el < 0
    lo, hi = body_bounds(CHEST if what == 'chest' else None); pad = 0.06 if what == 'chest' else 0.03
    cam = lookdev.place_camera('furcheck_' + view, (Vector((lo - pad).tolist()), Vector((hi + pad).tolist())), az, el, 0.05)
    s.render.resolution_x = 960; s.render.resolution_y = 960; s.camera = cam; bpy.context.view_layer.update(); return cam


PLUME_CHECK = os.environ.get('FC_PLUME_CHECK', '1') == '1'


def plume_root_error():
    # plume strand roots against the proxy triangles they are bound to (furmotion pass 2 check), world space, mm
    dg = bpy.context.evaluated_depsgraph_get(); pe = proxy.evaluated_get(dg); W = np.array(pe.matrix_world)
    pv = arr(pe.data.vertices, 'co') @ W[:3, :3].T + W[:3, 3]; out = {}
    for o in curves:
        if not o.name.startswith('Plume') or 'bind_ia' not in o.data.attributes: continue
        ev_ = o.evaluated_get(dg); Wc = np.array(ev_.matrix_world)
        pos = arr(ev_.data.attributes['position'].data, 'vector') @ Wc[:3, :3].T + Wc[:3, 3]
        offs = arr(o.data.curves, 'first_point_index', 1, np.int32)
        if len(pos) != len(arr(o.data.attributes['position'].data, 'vector')): continue
        ids = np.stack([arr(o.data.attributes['bind_i' + c].data, 'value', 1, np.int32) for c in 'abc'], 1)
        bar = np.stack([arr(o.data.attributes['bind_' + c].data, 'value', 1) for c in 'abc'], 1)
        err = np.linalg.norm(pos[offs] - np.einsum('ij,ijk->ik', bar, pv[ids]), axis=1); out[o.name] = round(float(err.max() * 1000), 2)
    return out


# ---- clip mode (pass 9): fur clips with the furmotion pass 2 cameras (side: fixed, fitted to the travel bounds, with the
# opponent post; sidetrack: 2.6 m following the body; idle: side camera in place). FC_CLIP=CLIP:CAM:SIZE:F0:F1:travel|inplace
CLIPCAMS = {'side': (270.0, 0.0), 'sidetrack': (270.0, 0.0)}


def clip_render(spec):
    clip, cam_name, size, f0, f1, mode = spec.split(':'); size = int(size); f0 = int(f0); f1 = int(f1); travel = mode == 'travel'
    meas = json.loads((ANIM / 'work' / 'measure.json').read_text()); cspecs = bake['specs'][clip]; rows = meas[clip]
    lo = np.array([1e9] * 3); hi = -lo
    for r, sp in zip(rows, cspecs):
        b0 = np.array(r['bounds'][0]); b1 = np.array(r['bounds'][1])
        if travel: b0[1] -= sp.get('_root', 0.0); b1[1] -= sp.get('_root', 0.0)
        lo = np.minimum(lo, b0); hi = np.maximum(hi, b1)
    lo[2] = 0.0
    if travel:
        c = meas['hit']['contact_inplace']; root_hit = meas['hit']['root_at_hit_m']; h = max(0.05, c[2]); w = 0.14
        bpy.ops.mesh.primitive_cube_add(size=1.0); o = bpy.context.active_object; o.name = 'lookdev_target'
        o.scale = (0.22, w, h); o.location = (0.0, c[1] - root_hit - w / 2, h / 2)
        o.data.materials.append(lookdev._material('lookdev_target_mat', (0.30, 0.30, 0.30), 0.9))
    az, el = CLIPCAMS[cam_name]; aspect = 1.5
    cam = lookdev.place_camera('furclip_' + cam_name, (Vector(lo), Vector(hi)), az, el, 0.05)
    s.render.resolution_x = size; s.render.resolution_y = int(round(size / aspect / 2) * 2); s.render.resolution_percentage = 100; s.camera = cam
    cam.data.sensor_fit = 'AUTO'; inv = cam.matrix_world.inverted(); xs = []; ys = []
    for i in range(8):
        q = inv @ Vector((hi[0] if i & 1 else lo[0], hi[1] if i & 2 else lo[1], hi[2] if i & 4 else lo[2])); xs.append(q.x); ys.append(q.y)
    w_ = (max(xs) - min(xs)) * 1.1; h_ = (max(ys) - min(ys)) * 1.1
    cam.data.ortho_scale = max(w_, h_ * aspect); cam.data.shift_x = ((max(xs) + min(xs)) / 2) / cam.data.ortho_scale; cam.data.shift_y = ((max(ys) + min(ys)) / 2) / cam.data.ortho_scale
    half_h = None
    if cam_name == 'sidetrack':
        cam.data.shift_x = cam.data.shift_y = 0.0; cam.data.ortho_scale = 2.6; half_h = cam.data.ortho_scale / aspect / 2
    for o in GROUND: o.hide_render = False
    out = OUT / 'frames' / f'{clip}_{cam_name}_{size}_{mode}'; out.mkdir(parents=True, exist_ok=True)
    rig.animation_data.action = bpy.data.actions[clip]
    ac = rig.animation_data.action
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    roots = [sp.get('_root', 0.0) for sp in cspecs]; perr = {}
    for f in range(f0, f1 + 1):
        s.frame_set(f); rig.location = (0, -roots[f] if travel else 0.0, 0)
        if cam_name == 'sidetrack':
            wf, wz = cspecs[f].get('_world_body', (cspecs[f]['body'][0], cspecs[f]['body'][1])); bf = wf if travel else cspecs[f]['body'][0]
            cam.location = (cam.location.x, C0.y - bf - 0.06, max(half_h - 0.06, C0.z + wz + 0.1))
        bpy.context.view_layer.update()
        if f % 5 == 0: perr[f] = plume_root_error()
        s.render.filepath = str(out / f'{f:04d}.png'); bpy.ops.render.render(write_still=True); print('CLIP', clip, cam_name, f, flush=True)
    json.dump(dict(camera=dict(az=az, el=el, ortho_scale=cam.data.ortho_scale), plume_root_error_mm=perr, frames=[f0, f1]), open(out / 'camera.json', 'w'), indent=1)
    print('CLIP done', clip, cam_name, flush=True)


if os.environ.get('FC_CLIP'):
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in os.environ['FC_CLIP'].split(','): clip_render(spec)
    sys.exit(0)


OUT.mkdir(parents=True, exist_ok=True); done = {}
if PROBE:
    pose('sig', 16); print('PROBE bounds f16', [x.tolist() for x in body_bounds()]); print('PROBE curves', [(o.name, len(o.data.curves)) for o in curves]); sys.exit(0)
for kind, f in FRAMES:
    tag = f if kind == 'review' else f'sig_f{f:02d}'
    pose(kind, f)
    if PLUME_CHECK: print('PLUME', tag, plume_root_error(), flush=True)
    vlist = VIEWS + [v for v in EXTRA.get(tag, []) if v not in VIEWS]
    for vname in vlist:
        if vname == 'side': cam_side('side', f, kind)
        else: cam_oblique(vname)
        for clay_on in (False, True):
            set_clay(clay_on); bpy.context.view_layer.update()
            p = OUT / f'{LABEL}_{tag}_{vname}_{"clay" if clay_on else "fur"}.png'
            s.render.filepath = str(p); bpy.ops.render.render(write_still=True); done[str(p.name)] = True
            print('RENDER', p.name, flush=True)
        set_clay(False)
json.dump(done, open(OUT / f'{LABEL}_renders.json', 'w'), indent=1); print('FURCHECK done', LABEL, len(done), flush=True)
