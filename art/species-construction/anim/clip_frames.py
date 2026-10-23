"""Render baked clip frames (akinza_clips.py) on the rig of record: clay or the fur of record, side and sprite views.

  run_blender.py clip_frames.py <log> -- <surface dir> <rig dir> <bake dir> <out dir> --clips idle,stalk
      [--look clay|fur] [--views side,sprite] [--size 720] [--sprite 192] [--samples 16]
      --box lo,hi --sprite-box lo,hi [--only 0,1] [--fur-checks] [--deep stalk:16]

Every frame's pose (bone rotations plus root move, legs already solved by the planted-feet IK) poses the skin
through rig_core (dual quaternions plus the corrective keys driven by that frame's swing angles), exactly as the
clay board and the crouch clips (motion_frames.py). Claws, eyes, nose and mouth follow their bones; with
--look fur the fur of record follows the skin (fur_bind). The root never moves, so there is no re-grounding.

Views, one fixed framing each for every frame of every clip:
  side    the clip's review camera (azimuth 90, elevation 3, as motion_frames.py), fitted to --box, square
          --size px;
  sprite  the look-dev `sprite` camera: side_left (azimuth 90, elevation 0) framed by lookdev.place_camera to
          --sprite-box (6 percent margin), --sprite px square.
Writes <out>/<clip>/<view>/NNNN.png and <out>/<clip>/frames.json (render seconds per frame and view).

--fur-checks (fur look): per frame, the root error through fur_bind (each rebuilt root against its barycentric
point on the posed skin triangle, and against the nearest point of the posed skin surface), and the largest strand
length change; at frame 0 of the first clip and at each --deep clip:frame, the strands with a point more than
0.5 mm inside the posed skin (nearest surface point, signed by its normal). Writes <out>/fur-checks.json.
"""
import argparse
import json
import math
import sys
import time
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE.parent/'surface'))
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1]/'pipeline/roster'))
import rig_core as rc  # noqa: E402
import akinza_clips as ac  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('surface', type=Path)
p.add_argument('rig', type=Path)
p.add_argument('bake', type=Path)
p.add_argument('out', type=Path)
p.add_argument('--clips', default='idle,stalk')
p.add_argument('--look', choices=['clay', 'fur'], default='clay')
p.add_argument('--views', default='side,sprite')
p.add_argument('--size', type=int, default=720)
p.add_argument('--sprite', type=int, default=192)
p.add_argument('--samples', type=int, default=16)
p.add_argument('--box', required=True)
p.add_argument('--sprite-box', required=True)
p.add_argument('--only', default=None, help='clip:frame list (e.g. idle:0,stalk:16) to render only those frames')
p.add_argument('--fur-checks', action='store_true')
p.add_argument('--deep', default='stalk:16')
p.add_argument('--no-render', action='store_true', help='checks only')
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
t0 = time.time()
R = a.rig
rig = json.loads((R/'rig.json').read_text())
J = json.loads((R/'joints.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
wt = np.load(R/'weights.npz')
idx = wt['idx'].astype(int)
w = np.round(wt['w'].astype(np.float64)*4096)/4096
w /= w.sum(1, keepdims=True)
KEYS = json.loads((R/'correctives.json').read_text())['keys']
cz = np.load(R/'correctives.npz')
DELTAS = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in KEYS}
views = a.views.split(',')
clips = a.clips.split(',')
box = np.array([float(v) for v in a.box.split(',')])
sbox = np.array([float(v) for v in a.sprite_box.split(',')])
ONLY = None
if a.only:
    ONLY = {(x.split(':')[0], int(x.split(':')[1])) for x in a.only.split(',')}
DEEP = {(x.split(':')[0], int(x.split(':')[1])) for x in a.deep.split(',')} if a.deep else set()

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
            o.hide_render = True               # as motion_frames.py: the clay reads on the plain dark world
    lights = None
else:
    import lookdev
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
cam = bpy.data.objects.new('clip camera', bpy.data.cameras.new('clip camera'))
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
    offs = np.empty(len(fur.data.curves)+1, np.int32)
    fur.data.curve_offset_data.foreach_get('value', offs)
    root_ix = offs[:-1]
    rest_len = None
    print('fur bound', len(root_ix), round(time.time()-t0), flush=True)
to_m = lambda X: s*(X-off)
from_m = lambda X: X/s+off
REST_M = to_m(skin_rest)
SHAPES = ac.load_shapes(a.bake)          # pass 2: the breath key, driven by each frame's shapes['breath']


def strand_lengths(pts):
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    seg[offs[1:-1]-1] = 0                     # no segment between one strand's tip and the next strand's root
    return np.add.reduceat(np.r_[seg, 0.], offs[:-1])


def frame_camera(view):
    if view == 'side':
        az, el = 90., 3.
        lo, hi = box[:3], box[3:]
        center = (lo+hi)/2
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
        size = a.size
    else:
        import lookdev
        az, el = lookdev.CAMERAS['side_left']
        lo, hi = sbox[:3], sbox[3:]
        c = Vector(tuple((lo+hi)/2))
        lc = lookdev.place_camera('lookdev_cam_sprite', (Vector(tuple(lo)), Vector(tuple(hi))), az, el)
        cam.location, cam.rotation_euler = lc.location.copy(), lc.rotation_euler.copy()
        cam.data.type = 'ORTHO'
        cam.data.ortho_scale = lc.data.ortho_scale
        xs = ys = None
        size = a.sprite
    cam.data.clip_end = 100
    sc.camera = cam
    sc.render.resolution_x = sc.render.resolution_y = size
    if a.look == 'fur':
        sh = (cam.data.shift_x, cam.data.shift_y)
        loc, rot_e, osc = cam.location.copy(), cam.rotation_euler.copy(), cam.data.ortho_scale
        render.place(cam, lights, (az, el, c, osc, size, size))
        cam.location, cam.rotation_euler = loc, rot_e            # place() aims at c; keep the framing's own aim
    if view == 'side':
        cam.data.shift_x = (max(xs)+min(xs))/2/cam.data.ortho_scale
        cam.data.shift_y = (max(ys)+min(ys))/2/cam.data.ortho_scale
    else:
        lc = bpy.data.objects['lookdev_cam_sprite']
        cam.data.shift_x, cam.data.shift_y = lc.data.shift_x, lc.data.shift_y
    bpy.context.view_layer.update()


fur_rows = []


def inside_strands(Px, pts):
    bvh = BVHTree.FromPolygons(Px.tolist(), tri.tolist(), all_triangles=True)
    keep = np.ones(len(pts), bool)
    keep[root_ix] = False
    bad = np.zeros(len(pts), bool)
    for i in np.flatnonzero(keep):
        q = Vector(pts[i])
        loc, nrm, _, dist = bvh.find_nearest(q, .05)
        if loc is not None and (q-loc).dot(nrm) < -.0005/s:
            bad[i] = True
    curve_of = binding['curve_of']
    return int(len(np.unique(curve_of[bad]))), int(bad.sum())


def apply(fr, clip):
    global rest_len
    pose, lift = fr['pose'], fr['lift']
    Pm, _, vals = rc.posed_skin(ac.apply_shapes(REST_M, fr, SHAPES), idx, w, J, pose, lift, KEYS, DELTAS)
    Px = from_m(Pm)
    set_world_co(skin, Px)
    T = rc.bone_transforms(J, pose, bones=rc.ANIM_BONES, root_translate=tuple(rc.lift_vec(lift)))
    for o in bpy.data.objects:
        if o.type != 'MESH' or o is skin or o.name not in others:
            continue
        nm = o.name.lower()
        side = 'L' if '+1' in nm else 'R'
        bone = f'hand.{side}' if 'fore claw' in nm else f'foot.{side}' if 'hind claw' in nm else 'head'
        Rb, tb = T[bone]
        set_world_co(o, from_m(to_m(others[o.name])@Rb.T+tb))
    if binding is not None:
        pts = fur_bind.rebuild(binding, Px)
        fur_bind.write(binding, pts)
        if a.fur_checks:
            t1 = time.time()
            Tr, Bc = binding['Tr'], binding['B']
            anchor = (Bc[:, :, None]*Px[Tr]).sum(1)
            err = np.linalg.norm(pts[root_ix]-anchor, axis=1)*s*1000
            bvh = BVHTree.FromPolygons(Px.tolist(), tri.tolist(), all_triangles=True)
            surf = np.array([bvh.find_nearest(Vector(r))[3] for r in pts[root_ix]])*s*1000
            L = strand_lengths(pts)
            if rest_len is None:
                rest_len = strand_lengths(binding['rest'])
            live = rest_len > 1e-6                # culled strands of the fur of record are zero length
            dl = np.abs(L[live]/rest_len[live]-1)*100
            row = dict(clip=clip, frame=fr['frame'], root_error_max_mm=round(float(err.max()), 4),
                       root_to_surface_max_mm=round(float(surf.max()), 4), root_to_surface_p99_mm=round(float(np.quantile(surf, .99)), 4),
                       length_change_max_pct=round(float(dl.max()), 4), nonfinite=int((~np.isfinite(pts)).sum()))
            if (clip, fr['frame']) in DEEP or (clip == clips[0] and fr['frame'] == 0):
                row['strands_inside_skin'], row['points_inside_skin'] = inside_strands(Px, pts)
            row['seconds'] = round(time.time()-t1, 1)
            fur_rows.append(row)
            print('fur check', row, flush=True)
    bpy.context.view_layer.update()
    return vals


log = dict(look=a.look, views=views, size=a.size, sprite=a.sprite, samples=a.samples, box=box.tolist(), spriteBox=sbox.tolist(),
           renderSeconds={})
for clip in clips:
    frames = json.loads((a.bake/clip/'poses.json').read_text())
    if clip == 'idle':
        frames = [f for f in frames if f['frame'] < 90]          # frame 90 is the seam copy of frame 0
    for v in views:
        (a.out/clip/v).mkdir(parents=True, exist_ok=True)
    for fr in frames:
        if ONLY is not None and (clip, fr['frame']) not in ONLY:
            continue
        apply(fr, clip)
        if a.no_render:
            continue
        for v in views:
            frame_camera(v)
            t1 = time.time()
            sc.render.filepath = str(a.out/clip/v/f"{fr['frame']:04d}.png")
            bpy.ops.render.render(write_still=True)
            log['renderSeconds'].setdefault(f'{clip}/{v}', []).append(round(time.time()-t1, 2))
        print('frame', clip, fr['frame'], {k: v[-1] for k, v in log['renderSeconds'].items()}, round(time.time()-t0), flush=True)
log['seconds'] = round(time.time()-t0)
a.out.mkdir(parents=True, exist_ok=True)
(a.out/f'frames-{a.look}.json').write_text(json.dumps(log, indent=1))
if fur_rows:
    (a.out/'fur-checks.json').write_text(json.dumps(fur_rows, indent=1))
print('CLIP_FRAMES_DONE', log['seconds'])
