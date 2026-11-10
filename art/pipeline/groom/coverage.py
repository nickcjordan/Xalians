"""Bare-skin coverage by holdout render (Luceras nape, B-ewzn).

Every skin region is painted an emission colour (nape red, control green, junction ring blue, other skin black), every
strand and every other mesh is black emission. Two renders per frame and view: with fur, and with every curves object
hidden. For a region, visible bare share = (its colour summed with fur) / (its colour summed without fur): the share of
that region's camera-visible skin that the fur does not cover (partial strand coverage counts partially).

blender -b SCENE --python coverage.py -- SPEC.json OUT.json
SPEC: {"cell": cell.json, "regions": {"nape": vertex-id .npy, "control": .npy, "ring": .npy}, "scale": 2,
       "jobs": [{"view": "side", "clip": "idle", "frames": [0, 89]}, {"view": "head", "clip": "sig.horns-first-descent", "frames": [29, 29]}, ...]}
view 'side' is the sprite camera from the cell; any other view is an orbit camera round the head-neck junction
('az<deg>_el<deg>') or the reskin_furcheck head camera ('head': az 35, el 4, head bounds plus 90 mm).
"""
import bpy, sys, json, math, time, os
import numpy as np
from pathlib import Path
from mathutils import Vector

A = sys.argv[sys.argv.index('--') + 1:]
SPEC = json.loads(Path(A[0]).read_text()); OUT = Path(A[1])
s = bpy.context.scene; vl = bpy.context.view_layer; body = s.objects['luceras_blockout']; rig = s.objects['luceras_rig']
cell = json.loads(Path(SPEC['cell']).read_text())
NV = len(body.data.vertices)
col = np.zeros((NV, 4), np.float32); col[:, 3] = 1
REG = SPEC['regions'] if isinstance(SPEC['regions'], list) else [[k, SPEC['regions'][k]] for k in ('nape', 'control', 'ring') if k in SPEC['regions']]
assert len(REG) <= 3
for ch in reversed(range(len(REG))):          # earlier regions win where regions overlap
    ids = np.load(REG[ch][1]); col[ids, :3] = 0; col[ids, ch] = 1
at = body.data.color_attributes.get('cov_regions') or body.data.color_attributes.new('cov_regions', 'FLOAT_COLOR', 'POINT')
at.data.foreach_set('color', col.ravel())


def emis_mat(name, color=None, attr=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 1.0
    if attr:
        a = nt.nodes.new('ShaderNodeAttribute'); a.attribute_name = attr; a.attribute_type = 'GEOMETRY'; nt.links.new(a.outputs['Color'], e.inputs['Color'])
    else: e.inputs['Color'].default_value = color
    nt.links.new(e.outputs[0], o.inputs['Surface']); return m


skin = emis_mat('cov_skin', attr='cov_regions'); black = emis_mat('cov_black', color=(0, 0, 0, 1))
for i in range(len(body.data.materials)): body.data.materials[i] = skin
curves = []
for o in s.objects:
    if o.hide_render: continue
    if o.name.startswith(('lookdev', 'game_', 'sprite_')) or o.type not in ('MESH', 'CURVES'):
        if o.type in ('MESH', 'CURVES', 'LIGHT'): o.hide_render = True
        continue
    if o == body: continue
    if o.type == 'CURVES':
        if o.name.startswith(tuple(SPEC.get('hide_curves', ('Pass7 paw',)))): o.hide_render = True; continue
        curves.append(o)
    for i in range(len(o.data.materials)): o.data.materials[i] = black
    if o.type == 'MESH' and not len(o.data.materials): o.data.materials.append(black)
for o in s.objects:
    if o.type == 'LIGHT': o.hide_render = True
w = bpy.data.worlds.new('cov_world'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0, 0, 0, 1); s.world = w
s.render.engine = 'CYCLES'; s.cycles.device = 'CPU'; s.render.threads_mode = 'FIXED'; s.render.threads = int(os.environ.get('COV_THREADS', '20'))
s.cycles.samples = int(SPEC.get('samples', 16)); s.cycles.use_denoising = False; s.cycles.max_bounces = 0
s.render.film_transparent = False; s.view_settings.view_transform = 'Standard'; s.view_settings.look = 'None'; s.view_settings.exposure = 0; s.view_settings.gamma = 1
s.render.image_settings.file_format = 'OPEN_EXR'; s.render.image_settings.color_depth = '32'; s.render.filter_size = 1.5
cam = bpy.data.objects.new('cov_cam', bpy.data.cameras.new('cov_cam')); s.collection.objects.link(cam); s.camera = cam; cam.data.type = 'ORTHO'; cam.data.clip_start = 0.01; cam.data.clip_end = 100
tmp = Path(SPEC.get('tmp', str(OUT.parent / 'cov_tmp'))); tmp.mkdir(parents=True, exist_ok=True)


def set_clip(clip, f):
    rig.animation_data.action = bpy.data.actions[clip]; ac = rig.animation_data.action
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    rig.location = (0, 0, 0); s.frame_set(f); vl.update()


def region_pts():
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh(); V = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', V); e.to_mesh_clear()
    V = V.reshape(-1, 3) @ np.array(body.matrix_world)[:3, :3].T + np.array(body.matrix_world)[:3, 3]
    return V[(col[:, :3].sum(1) > 0)]


def place(view):
    if view == 'side':
        src = s.objects['sprite_side_camera']; M = src.matrix_world.copy(); cx, cy = cell['center_cam_m']; M.translation = M @ Vector((cx, cy, 0.0)); cam.matrix_world = M
        cam.data.ortho_scale = cell['ortho_scale_m']; sc = SPEC.get('scale', 2); s.render.resolution_x = cell['cell_px'][0] * sc; s.render.resolution_y = cell['cell_px'][1] * sc
    else:
        P = region_pts(); c = (P.min(0) + P.max(0)) / 2; r = float(np.linalg.norm(P.max(0) - P.min(0))) / 2
        if view == 'head': az, el = 35.0, 4.0
        else: az, el = [float(x[2:]) for x in view.split('_')]
        a, e_ = math.radians(az), math.radians(el)
        d = Vector((math.sin(a) * math.cos(e_), -math.cos(a) * math.cos(e_), math.sin(e_)))   # az 0 = front (-Y), 90 = +X side
        cam.location = Vector(c.tolist()) + d * 3.0; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler(); cam.data.ortho_scale = r * 2.6
        s.render.resolution_x = s.render.resolution_y = 600
    s.render.resolution_percentage = 100; vl.update()
    # border: the regions' projected box plus 10 percent (only the regions matter)
    P = region_pts(); Mi = np.array(cam.matrix_world.inverted()); q = P @ Mi[:3, :3].T + Mi[:3, 3]
    W_, H_ = s.render.resolution_x, s.render.resolution_y; osz = cam.data.ortho_scale; asp = H_ / W_
    u = q[:, 0] / osz + 0.5; v = q[:, 1] / (osz * asp) + 0.5
    bx = [max(0.0, u.min() - 0.05), min(1.0, u.max() + 0.05)]; by = [max(0.0, v.min() - 0.05), min(1.0, v.max() + 0.05)]
    s.render.use_border = True; s.render.use_crop_to_border = True
    s.render.border_min_x, s.render.border_max_x, s.render.border_min_y, s.render.border_max_y = bx[0], bx[1], by[0], by[1]


def shoot(tag):
    p = tmp / f'{tag}.exr'; s.render.filepath = str(p); bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(str(p)); px = np.empty(im.size[0] * im.size[1] * 4, np.float32); im.pixels.foreach_get(px); bpy.data.images.remove(im)
    if SPEC.get('png'):
        w_, h_ = im_size = (s.render.resolution_x * (s.render.border_max_x - s.render.border_min_x), s.render.resolution_y * (s.render.border_max_y - s.render.border_min_y))
        q = bpy.data.images.load(str(p)); W2, H2 = q.size; arr_ = np.empty(W2 * H2 * 4, np.float32); q.pixels.foreach_get(arr_); bpy.data.images.remove(q)
        o_ = bpy.data.images.new(tag + '_png', W2, H2); o_.pixels.foreach_set(np.clip(arr_, 0, 1)); o_.filepath_raw = str(tmp / f'{tag}_{SPEC["png"]}.png'); o_.file_format = 'PNG'; o_.save(); bpy.data.images.remove(o_)
    px = px.reshape(-1, 4)[:, :3]; return px.sum(0), px


res = []; t0 = time.time()
for job in SPEC['jobs']:
    clip = job['clip']; f0, f1 = job['frames']
    for f in range(f0, f1 + 1, job.get('step', 1)):
        set_clip(clip, f); place(job['view'])
        for o in curves: o.hide_render = False
        sf, pxf = shoot('fur')
        for o in curves: o.hide_render = True
        sb, pxb = shoot('bare')
        for o in curves: o.hide_render = False
        row = dict(view=job['view'], clip=clip, frame=f)
        for ch, (key, _) in enumerate(REG):
            row[key + '_bare_share'] = round(float(sf[ch] / sb[ch]), 4) if sb[ch] > 1 else None; row[key + '_visible_px'] = round(float(sb[ch]), 1)
        res.append(row); print('COV', json.dumps(row), round(time.time() - t0, 1), flush=True)
OUT.write_text(json.dumps(res, indent=1)); print('COV done', OUT, flush=True)
