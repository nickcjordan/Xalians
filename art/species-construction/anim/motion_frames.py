"""Frames for a short looping motion so a pose can be judged moving: rest to a target pose and back.

  run_blender.py motion_frames.py <log> -- <surface dir> <rig dir> <out dir> --motion ears|knee
      [--look clay|fur] [--views side,front3q,back3q,top] [--frames 24] [--size 720] [--samples 16] [--diag]

ears: rest to ears_flat_back; knee: rest to the Night Stalk crouch. Every bone turns from rest to the
target by the same eased share (quaternion slerp from rest, ease in and out), the body is re-grounded each
frame, and the skin is posed by rig_core (dual quaternions plus the corrective keys, driven by each frame's
swing angles), as in the clay board. Claws, eyes, nose and mouth follow their bones; with --look fur the
fur of record follows the skin (fur_bind). The out swing has --frames frames and the way back reuses them
in reverse, so the loop is 2*frames long and only frames+1 poses are rendered. One camera framing per view
for the whole motion. Writes <out>/<view>/<NNNN>.png and frames.json; --diag (ears, clay) also renders
the side view of the folded ears with each ear removed in turn, to tell the near ear from the far one.
"""
import argparse
import json
import math
import sys
import time
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE.parent/'surface'))
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1]/'pipeline/roster'))
import rig_core as rc  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('surface', type=Path)
p.add_argument('rig', type=Path)
p.add_argument('out', type=Path)
p.add_argument('--motion', choices=['ears', 'knee', 'crouch'], required=True)
p.add_argument('--part', choices=['legs', 'rump'], default='legs')
p.add_argument('--only', default=None, help='comma list of pose indices to render (quick checks); no loop copies')
p.add_argument('--look', choices=['clay', 'fur'], default='clay')
p.add_argument('--views', default=None)
p.add_argument('--frames', type=int, default=24)
p.add_argument('--size', type=int, default=720)
p.add_argument('--samples', type=int, default=16)
p.add_argument('--diag', action='store_true')
p.add_argument('--box', default=None, help='fixed framing box lo,hi (6 numbers, source units), the same framing as an earlier clip, so before and after frames line up')
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
t0 = time.time()
TARGET = {'ears': 'ears_flat_back', 'knee': 'night_stalk', 'crouch': 'night_stalk'}[a.motion]
VIEWS = {'side': (90, 3), 'front3q': (35, 8), 'back3q': (145, 22), 'top': (0, 89.5)}
views = (a.views or ('side,front3q,back3q,top' if a.motion == 'ears' else 'side,front3q')).split(',')
R = a.rig
rig = json.loads((R/'rig.json').read_text())
J = json.loads((R/'joints.json').read_text())
target_rec = json.loads((R/'poses.json').read_text())[TARGET]
target = target_rec['pose']
CROUCH = target_rec.get('crouch') if a.motion == 'crouch' else None
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
wt = np.load(R/'weights.npz')
idx = wt['idx'].astype(int)
w = np.round(wt['w'].astype(np.float64)*4096)/4096
w /= w.sum(1, keepdims=True)
KEYS = json.loads((R/'correctives.json').read_text())['keys']
cz = np.load(R/'correctives.npz')
DELTAS = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in KEYS}
NI = {b: i for i, b in enumerate(rc.ANIM_NAMES)}
dense = np.zeros((len(idx), len(NI)))
np.put_along_axis(dense, idx, w, 1)


def share(bones):
    return dense[:, [NI[b] for b in bones]].sum(1)


partial = rc.slerp_pose        # every bone turned the eased share f of its target rotation (slerp from rest)


def crouch_at(e):
    """Planted-feet crouch (pass 5): body bones slerped by e, the hips moved by e of the crouch's root move, the
    knees' bend direction turned from rest's toward the crouch's, the legs solved by IK so the feet stay put
    (pose_board.crouch_at, from the recipe stored in poses.json)."""
    c = CROUCH
    if 'poles' in c:          # pass 6: fixed hinge planes facing the feet's forward direction
        poles = c['poles']
    else:
        poles = {sd: (1-e)*np.array(c['polesRest'][sd])+e*np.array(c['polesCrouch'][sd]) for sd in 'LR'}
        poles = {sd: v/np.linalg.norm(v) for sd, v in poles.items()}
    lift = e*np.array(c['lift'])
    return rc.plant_legs(J, partial(c['body'], e), lift, c['feet'], poles, bones=rc.ANIM_BONES), lift


bpy.ops.wm.open_mainfile(filepath=str(a.surface/'surface.blend'))
sc = bpy.context.scene
for ob in list(bpy.data.objects):
    if ob.type in ('CAMERA', 'LIGHT'):
        bpy.data.objects.remove(ob)
skin = bpy.data.objects['akinza_continuous_construction']
fur = bpy.data.objects.get('Akinza fur')
if a.look == 'clay':
    import lookdev
    for o in list(bpy.data.objects):
        if o.type == 'CURVES' or 'ribbon' in o.name or o.name.startswith('catch light'):
            bpy.data.objects.remove(o, do_unlink=True)
    lookdev.setup_scene('CYCLES')
    sc.cycles.samples = a.samples
    for o in bpy.data.objects:
        if o.type == 'MESH':
            lookdev.apply_clay(o)
    for o in bpy.data.objects:
        if o.name == 'lookdev_ground':
            o.hide_render = True               # the dark world reads better behind clay from above and behind
else:
    import render_surface as render
    from eyeliner_styles import configured
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = a.samples
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces, sc.cycles.diffuse_bounces, sc.cycles.glossy_bounces = 64, 16, 48
    sc.cycles.transmission_bounces, sc.cycles.transparent_max_bounces = 48, 64
    sc.view_settings.view_transform = 'Standard'
    pals = json.loads((HERE.parent/'surface'/'akinza-palettes.json').read_text())
    render.apply_palette(pals['T7'], pals['T7'].get('skinFactor', pals['skinFactor']))
    configured(None)
    render.setup_world(sc)
    lights = render.make_rig()
    for o in bpy.data.objects:
        if o.type == 'CURVES' and o is not fur:
            o.hide_render = True
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGB'
cam = bpy.data.objects.new('motion camera', bpy.data.cameras.new('motion camera'))
sc.collection.objects.link(cam)
sc.camera = cam


def world_co(o):
    c = np.empty(len(o.data.vertices)*3, np.float32)
    o.data.vertices.foreach_get('co', c)
    m = np.array(o.matrix_world)
    return c.reshape(-1, 3).astype(np.float64)@m[:3, :3].T+m[:3, 3]


def set_world_co(o, X):
    mi = np.linalg.inv(np.array(o.matrix_world))
    o.data.vertices.foreach_set('co', (X@mi[:3, :3].T+mi[:3, 3]).astype(np.float32).ravel())
    o.data.update()


skin_rest = world_co(skin)
others = {o.name: world_co(o) for o in bpy.data.objects if o.type == 'MESH' and o is not skin}
skin.data.calc_loop_triangles()
tri = np.empty(len(skin.data.loop_triangles)*3, np.int32)
skin.data.loop_triangles.foreach_get('vertices', tri)
tri = tri.reshape(-1, 3)
binding = None
if a.look == 'fur':
    import fur_bind
    binding = fur_bind.bind(skin_rest, tri, fur)
    print('fur bound', round(time.time()-t0), flush=True)
to_m = lambda X: s*(X-off)
from_m = lambda X: X/s+off
# ---- the poses (frames+1 of them, rest to target, eased)
poses = []
for f in range(a.frames+1):
    e = .5-.5*math.cos(math.pi*f/a.frames)
    if CROUCH:
        pz, lift = crouch_at(e)
        Pm, _, vals = rc.posed_skin(to_m(skin_rest), idx, w, J, pz, lift, KEYS, DELTAS)
    else:
        pz = partial(target, e)
        Pm, _, vals = rc.posed_skin(to_m(skin_rest), idx, w, J, pz, 0., KEYS, DELTAS)
        lift = -float(Pm[:, 2].min()) if a.motion == 'knee' else 0.
        Pm[:, 2] += lift
    poses.append((pz, lift, from_m(Pm), vals))
print('posed', len(poses), round(time.time()-t0), flush=True)
# ---- one framing per view, over the whole motion
if a.motion == 'ears':
    part = (share(['head']+[f'ear_{k}.{sd}' for k in range(1, rc.EAR_BONES+1) for sd in 'LR']) > .5) & (skin_rest[:, 2] > .35)
elif a.part == 'rump':
    part = (share(['pelvis', 'tail_root']+[f'tail_{t}{k}' for t in rc.TAILS for k in (1, 2)]+['thigh.L', 'thigh.R']) > .5)         & (skin_rest[:, 2] > float(np.percentile(skin_rest[:, 2], 30)))
else:
    part = share([f'{b}.L' for b in ('thigh', 'shin', 'foot', 'hip')]) > .5
lo = np.min([P[part].min(0) for _, _, P, _ in poses], 0)-.04
hi = np.max([P[part].max(0) for _, _, P, _ in poses], 0)+.04
if a.box:
    bx = np.array([float(v) for v in a.box.split(',')])
    lo, hi = bx[:3], bx[3:]
box = (Vector(lo), Vector(hi))
center = (lo+hi)/2
span = float((hi-lo).max())
print('box', lo.round(3), hi.round(3), int(part.sum()), flush=True)


def frame_camera(view):
    """Orthographic camera at the view's angles, fitted to the motion's bounding box projected on the image
    plane (both looks use the same framing)."""
    az, el = VIEWS[view]
    ar, er = math.radians(az), math.radians(el)
    d = Vector((math.sin(ar)*math.cos(er), -math.cos(ar)*math.cos(er), math.sin(er)))
    c = Vector(tuple(center))
    cam.location = c+d*10
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    xs, ys = [], []
    for k in range(8):
        q = inv@Vector((hi[0] if k & 1 else lo[0], hi[1] if k & 2 else lo[1], hi[2] if k & 4 else lo[2]))
        xs.append(q.x)
        ys.append(q.y)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = max(max(xs)-min(xs), max(ys)-min(ys))*1.08
    cam.data.shift_x = (max(xs)+min(xs))/2/cam.data.ortho_scale
    cam.data.shift_y = (max(ys)+min(ys))/2/cam.data.ortho_scale
    cam.data.clip_end = 100
    sc.camera = cam
    sc.render.resolution_x = sc.render.resolution_y = a.size
    if a.look == 'fur':
        render.place(cam, lights, (az, el, c, cam.data.ortho_scale, a.size, a.size))
        cam.data.shift_x = (max(xs)+min(xs))/2/cam.data.ortho_scale
        cam.data.shift_y = (max(ys)+min(ys))/2/cam.data.ortho_scale


def apply(i):
    pz, lift, Px, vals = poses[i]
    set_world_co(skin, Px)
    T = rc.bone_transforms(J, pz, bones=rc.ANIM_BONES, root_translate=tuple(rc.lift_vec(lift)))
    for o in bpy.data.objects:
        if o.type != 'MESH' or o is skin or o.name not in others:
            continue
        nm = o.name.lower()
        side = 'L' if '+1' in nm else 'R'
        bone = f'hand.{side}' if 'fore claw' in nm else f'foot.{side}' if 'hind claw' in nm else 'head'
        Rb, tb = T[bone]
        set_world_co(o, from_m(to_m(others[o.name])@Rb.T+tb))
    if binding is not None:
        fur_bind.write(binding, fur_bind.rebuild(binding, Px))
    bpy.context.view_layer.update()


log = {'box': [list(map(float, lo)), list(map(float, hi))], 'motion': a.motion, 'look': a.look, 'target': TARGET, 'framesOut': a.frames, 'loopFrames': 2*a.frames,
       'fps': 24, 'views': views, 'size': a.size, 'samples': a.samples, 'renderSeconds': {}}
for v in views:
    (a.out/v).mkdir(parents=True, exist_ok=True)
ONLY = [int(x) for x in a.only.split(',')] if a.only else None
for i in range(len(poses)):
    if ONLY is not None and i not in ONLY:
        continue
    apply(i)
    for v in views:
        frame_camera(v)
        t1 = time.time()
        sc.render.filepath = str(a.out/v/f'{i:04d}.png')
        bpy.ops.render.render(write_still=True)
        log['renderSeconds'].setdefault(v, []).append(round(time.time()-t1, 2))
    print('frame', i, round(time.time()-t0), flush=True)
# the way back: frames frames+1 .. 2*frames-1 are copies of frames-1 .. 1
import shutil
for v in (views if ONLY is None else []):
    for k in range(1, a.frames):
        shutil.copyfile(a.out/v/f'{a.frames-k:04d}.png', a.out/v/f'{a.frames+k:04d}.png')
if a.diag and a.motion == 'ears' and a.look == 'clay':
    apply(len(poses)-1)
    frame_camera('side')
    full = skin.data.copy()
    for sd in ('R', 'L'):
        keep = share([f'ear_{k}.{sd}' for k in range(1, rc.EAR_BONES+1)]) > .5
        bm = bmesh.new()
        bm.from_mesh(full)
        bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[bm.verts[i] for i in np.flatnonzero(keep)], context='VERTS')
        cut = bpy.data.meshes.new('diag')
        bm.to_mesh(cut)
        bm.free()
        skin.data = cut
        sc.render.filepath = str(a.out/f'diag_side_without_{sd}_ear.png')
        bpy.ops.render.render(write_still=True)
        skin.data = full
    log['diag'] = ['diag_side_without_R_ear.png', 'diag_side_without_L_ear.png']
log['seconds'] = round(time.time()-t0)
(a.out/'frames.json').write_text(json.dumps(log, indent=1))
print('MOTION_DONE', log['seconds'])
