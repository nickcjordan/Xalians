"""Luceras sprites pass 1: measure and render the side-facing furred sprite clips from the scene of record.

blender -b SCENE.blend --python sprite_render.py -- OUTDIR MODE [args]
  MODE measure            per-frame side-view bounds (camera space, metres) of everything rendered (body, horns, eyes,
                          claws, head parts, every visible strand), the rest-pose body height, root offsets, the head
                          part / skin gap series and the plume series for the pop checks -> OUTDIR/measure.json
  MODE render CELL CLIP F0 F1   render frames F0..F1 of CLIP in place with the fixed camera from CELL (cell.json),
                          film transparent, at cell.json's master scale -> OUTDIR/master/CLIP/####.png

The scene file is opened, never saved. Clips play in place (rig at the origin); the signature's travel is the bake's
per-frame root offset, reported in the atlas instead of being rendered into the cell.
"""
import bpy, sys, json, math, os, time
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

A = sys.argv[sys.argv.index('--') + 1:]
OUT = Path(A[0]); MODE = A[1]; OUT.mkdir(parents=True, exist_ok=True)
s = bpy.context.scene; vl = bpy.context.view_layer
rig = next(o for o in s.objects if o.type == 'ARMATURE' and o.name.startswith('luceras_rig'))
body = s.objects['luceras_blockout']
CLIPS = {'idle': 90, 'sig.horns-first-descent': 60}
HIDE = ('lookdev_ground', 'lookdev_target', 'Plume spine curve')


def arr(items, key, n=3, dt=np.float32):
    x = np.empty(len(items) * n, dt); items.foreach_get(key, x); return x.reshape(-1, n) if n > 1 else x


def set_clip(clip, f):
    rig.animation_data.action = bpy.data.actions[clip]; ac = rig.animation_data.action
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    rig.location = (0, 0, 0); s.frame_set(f); vl.update()


def side_camera():
    src = s.objects.get('sprite_side_camera')
    cam = bpy.data.objects.get('sprite_cell_camera')
    if cam is None:
        cd = bpy.data.cameras.new('sprite_cell_camera'); cam = bpy.data.objects.new('sprite_cell_camera', cd); s.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.matrix_world = src.matrix_world.copy(); cam.data.clip_start = 0.01; cam.data.clip_end = 100.0
    vl.update(); return cam


def rendered_objects():
    for o in s.objects:
        if o.hide_render or o.name.startswith(HIDE) or o.type not in ('MESH', 'CURVES'): continue
        yield o


def points_world(o, dg):
    e = o.evaluated_get(dg); W = np.array(e.matrix_world)
    if o.type == 'MESH':
        m = e.to_mesh(); P = arr(m.vertices, 'co'); e.to_mesh_clear()
    else:
        d = e.data; P = arr(d.attributes['position'].data, 'vector')
        if 'radius' in d.attributes:
            r = arr(d.attributes['radius'].data, 'value', 1); P = P[r > 0]
    return P @ W[:3, :3].T + W[:3, 3]


if MODE == 'measure':
    cam = side_camera(); Ci = np.array(cam.matrix_world.inverted())
    bake = json.loads(Path(os.environ['SP_BAKE']).read_text())
    proxy = next((o for o in s.objects if o.name.startswith('luceras_plume_spine')), None)
    parts = [o for o in s.objects if o.name.startswith(('head_nose_pad', 'head_lid_rim_', 'head_upper_lid_', 'head_lip_'))]
    rec = dict(camera=dict(matrix=[list(r) for r in cam.matrix_world]), clips={})
    # rest pose body height (camera vertical), the scale reference: 192 px at 1x
    rig.animation_data.action = None
    for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    rig.location = (0, 0, 0); vl.update(); dg = bpy.context.evaluated_depsgraph_get()
    Pb = points_world(body, dg) @ Ci[:3, :3].T + Ci[:3, 3]
    rec['rest_body'] = dict(height_m=float(Pb[:, 1].max() - Pb[:, 1].min()), width_m=float(Pb[:, 0].max() - Pb[:, 0].min()), bottom_m=float(Pb[:, 1].min()))
    t0 = time.time()
    for clip, n in CLIPS.items():
        rows = []; specs = bake['specs'][clip]
        for f in range(0, n + 1):
            set_clip(clip, f); dg = bpy.context.evaluated_depsgraph_get(); row = dict(frame=f, root_m=float(specs[f].get('_root', 0.0)) if f < len(specs) else None)
            lo = np.array([1e9, 1e9]); hi = -lo; cats = {}
            for o in rendered_objects():
                Q = points_world(o, dg) @ Ci[:3, :3].T + Ci[:3, 3]
                if not len(Q): continue
                l_, h_ = Q[:, :2].min(0), Q[:, :2].max(0); lo = np.minimum(lo, l_); hi = np.maximum(hi, h_)
                k = 'plume' if o.name.startswith('Plume') else 'horn' if o.name.startswith('horn_') else 'body' if o.name == 'luceras_blockout' else 'other'
                c0 = cats.get(k, (l_, h_)); cats[k] = (np.minimum(c0[0], l_), np.maximum(c0[1], h_))
            row['bounds'] = [lo.tolist(), hi.tolist()]; row['cats'] = {k: [v[0].tolist(), v[1].tolist()] for k, v in cats.items()}
            # head parts against the skin: closest skin distance from each rigid part's vertices (median) per frame
            eb = body.evaluated_get(dg); m = eb.to_mesh(); Wb = np.array(eb.matrix_world)
            BV = arr(m.vertices, 'co') @ Wb[:3, :3].T + Wb[:3, 3]; BP = [list(p.vertices) for p in m.polygons]; eb.to_mesh_clear()
            bt = BVHTree.FromPolygons([Vector(v) for v in BV.tolist()], BP)
            gaps = {}
            for o in parts:
                P = points_world(o, dg); idx = np.linspace(0, len(P) - 1, min(len(P), 120)).astype(int)
                d = [bt.find_nearest(Vector(P[i].tolist()))[3] for i in idx]; gaps[o.name] = [round(float(np.median(d)) * 1000, 3), round(float(np.min(d)) * 1000, 3)]
            hb = rig.pose.bones['head_01']; Hm = np.array(rig.matrix_world @ hb.matrix); row['head_origin'] = Hm[:3, 3].tolist()
            row['part_skin_gap_mm'] = gaps
            if proxy is not None:
                pe = proxy.evaluated_get(dg); Wp = np.array(pe.matrix_world); pv = arr(pe.data.vertices, 'co') @ Wp[:3, :3].T + Wp[:3, 3]
                nr = (len(pv) - 1) // 10; rc = pv[:nr * 10].reshape(nr, 10, 3).mean(1); row['plume_rings'] = rc[::max(1, nr // 8)].tolist() + [rc[-1].tolist()]
            rows.append(row); print('MEASURE', clip, f, [round(x, 3) for x in lo.tolist() + hi.tolist()], round(time.time() - t0, 1), flush=True)
        rec['clips'][clip] = rows
    (OUT / 'measure.json').write_text(json.dumps(rec)); print('MEASURE done', round(time.time() - t0, 1), flush=True)
    sys.exit(0)

if MODE == 'render':
    cell = json.loads(Path(A[2]).read_text()); clip = A[3]; f0, f1 = int(A[4]), int(A[5])
    cam = side_camera(); s.camera = cam
    sc = cell['master_scale']; W_, H_ = cell['cell_px'][0] * sc, cell['cell_px'][1] * sc
    cam.data.ortho_scale = cell['ortho_scale_m']; cam.data.sensor_fit = 'HORIZONTAL'
    # centre the window: move the camera along its own right and up axes to the cell centre (camera space metres)
    M = cam.matrix_world.copy(); cx, cy = cell['center_cam_m']; M.translation = M @ Vector((cx, cy, 0.0)); cam.matrix_world = M
    s.render.resolution_x = W_; s.render.resolution_y = H_; s.render.resolution_percentage = 100
    s.render.film_transparent = True; s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_mode = 'RGBA'; s.render.image_settings.color_depth = '8'
    for o in s.objects:
        if o.name.startswith(HIDE): o.hide_render = True
    s.render.engine = 'CYCLES'; dev = os.environ.get('SP_DEVICE', 'CPU')
    if dev != 'CPU':
        pr = bpy.context.preferences.addons['cycles'].preferences; pr.compute_device_type = dev; pr.get_devices()
        for d in pr.devices: d.use = d.type == dev
        s.cycles.device = 'GPU'
    else:
        s.cycles.device = 'CPU'; s.render.threads_mode = 'FIXED'; s.render.threads = int(os.environ.get('SP_THREADS', '20'))
    s.cycles.samples = int(os.environ.get('SP_SAMPLES', '48')); s.cycles.use_denoising = True
    s.render.filter_size = 1.5; s.view_settings.view_transform = 'Standard'
    out = OUT / 'master' / clip; out.mkdir(parents=True, exist_ok=True); times = {}
    for f in range(f0, f1 + 1):
        p = out / f'{f:04d}.png'
        if p.exists() and os.environ.get('SP_RESUME', '1') == '1': continue
        t = time.time(); set_clip(clip, f); s.render.filepath = str(p); bpy.ops.render.render(write_still=True)
        times[f] = round(time.time() - t, 1); print('RENDER', clip, f, times[f], flush=True)
    jp = out / 'render_times.json'; old = json.loads(jp.read_text()) if jp.exists() else {}
    old.update({str(k): v for k, v in times.items()}); jp.write_text(json.dumps(old, indent=1)); print('RENDER done', clip, f0, f1, flush=True)
    sys.exit(0)
