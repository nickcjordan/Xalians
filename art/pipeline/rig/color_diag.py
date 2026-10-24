"""Colour pass 1 (D-hrgh): diagnostic renders of the coat at rest from the side camera, one variant per run.

blender -b SCENE.blend --python color_diag.py -- OUTDIR VARIANTS [RES_SCALE] [VIEWS]
VARIANTS (comma list):
  normal   the scene as it is
  data     coat and paw strands shaded flat by their coat_color attribute alone (emission), body skin likewise:
           shows what the colour DATA is, without the hair shader's root ramp, gains or the lighting
  noramp   the hair shader with the root/tip darkening ramps and the luminance gain switched off
  skin     every strand hidden: the skin colour under the fur
  nopaw    the Pass7 paw fur hidden
VIEWS: side (default), far (az 90, the other flank), threeq_front (az 35, el 8), threeq_back (az 215, el 8)
The scene file is opened, never saved.
"""
import bpy, sys, os, math
from pathlib import Path
from mathutils import Vector

A = sys.argv[sys.argv.index('--') + 1:]
OUT = Path(A[0]); OUT.mkdir(parents=True, exist_ok=True); VARS = A[1].split(','); SC = float(A[2]) if len(A) > 2 else 1.0
VIEWS = A[3].split(',') if len(A) > 3 else ['side']
s = bpy.context.scene; vl = bpy.context.view_layer
rig = next(o for o in s.objects if o.type == 'ARMATURE' and o.name.startswith('luceras_rig'))
rig.animation_data.action = None
for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
rig.location = (0, 0, 0); vl.update()
body = s.objects['luceras_blockout']
curves = [o for o in s.objects if o.type == 'CURVES' and not o.hide_render]
coatlike = [o for o in curves if o.name.startswith(('Luceras interpolated', 'Luceras guides', 'Pass7 paw'))]
for o in s.objects:
    if o.name.startswith(('lookdev_target',)): o.hide_render = True
s.render.engine = 'CYCLES'
dev = os.environ.get('SP_DEVICE', 'CUDA')
if dev != 'CPU':
    pr = bpy.context.preferences.addons['cycles'].preferences; pr.compute_device_type = dev; pr.get_devices()
    for d in pr.devices: d.use = d.type == dev
    s.cycles.device = 'GPU'
s.cycles.samples = int(os.environ.get('SP_SAMPLES', '48')); s.cycles.use_denoising = True
s.render.film_transparent = False
cam0 = s.objects['sprite_side_camera']


def place(view):
    cam = s.objects.get('diag_cam')
    if cam is None:
        cam = bpy.data.objects.new('diag_cam', bpy.data.cameras.new('diag_cam')); s.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.clip_start = 0.01; cam.data.clip_end = 50
    # the body bounds at rest
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh()
    W = body.matrix_world; P = [W @ v.co for v in m.vertices]; e.to_mesh_clear()
    lo = Vector([min(p[i] for p in P) for i in range(3)]); hi = Vector([max(p[i] for p in P) for i in range(3)]); c = (lo + hi) / 2
    az, el = {'side': (270, 0), 'far': (90, 0), 'threeq_front': (35, 8), 'threeq_back': (215, 8)}[view]
    a, e_ = math.radians(az), math.radians(el)
    # azimuth 0 looks from the front (-Y); 270 from +X... match lookdev: camera direction from the azimuth around Z
    d = Vector((math.sin(a) * math.cos(e_), -math.cos(a) * math.cos(e_), math.sin(e_)))
    cam.location = c + d * 5.0
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    if view == 'side':
        cam.matrix_world = cam0.matrix_world.copy(); M = cam.matrix_world.copy(); M.translation = Vector((cam.matrix_world.translation.x, c.y, c.z)); cam.matrix_world = M
        cam.data.ortho_scale = 1.5; s.render.resolution_x, s.render.resolution_y = int(960 * SC), int(640 * SC)
    else:
        cam.data.ortho_scale = 1.35; s.render.resolution_x = s.render.resolution_y = int(960 * SC)
    s.camera = cam; vl.update()


saved = {}
def set_variant(v):
    for o in curves: o.hide_render = False
    for o, mats in saved.items():
        for i, m in enumerate(mats): o.data.materials[i] = m
    if v == 'skin':
        for o in curves: o.hide_render = True
    if v == 'nopaw':
        for o in curves:
            if o.name.startswith('Pass7 paw'): o.hide_render = True
    if v in ('data',):
        em = bpy.data.materials.get('diag_attr_emission')
        if em is None:
            em = bpy.data.materials.new('diag_attr_emission'); em.use_nodes = True; nt = em.node_tree; nt.nodes.clear()
            at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'coat_color'; at.attribute_type = 'GEOMETRY'
            es = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial')
            nt.links.new(at.outputs['Color'], es.inputs['Color']); nt.links.new(es.outputs[0], out.inputs['Surface'])
        for o in coatlike + [body]:
            if o not in saved: saved[o] = list(o.data.materials)
            for i in range(len(o.data.materials)): o.data.materials[i] = em
    if v == 'noramp':
        for o in coatlike:
            if o not in saved: saved[o] = list(o.data.materials)
        cm = bpy.data.materials.get('diag_noramp')
        if cm is None:
            cm = bpy.data.materials['Luceras fine wiry Chiang storm coat'].copy(); cm.name = 'diag_noramp'; nt = cm.node_tree
            for n in nt.nodes:
                if n.name in ('Mix (Legacy).004',): n.inputs['Factor'].default_value = 0.0   # skip the root ramp / paw branch
                if n.name in ('Mix (Legacy).003',): n.inputs['Factor'].default_value = 0.0   # skip the luminance gain
        for o in coatlike:
            if o.name.startswith('Luceras'):
                for i in range(len(o.data.materials)): o.data.materials[i] = cm


for view in VIEWS:
    place(view)
    for v in VARS:
        set_variant(v); s.render.filepath = str(OUT / f'{view}_{v}.png'); bpy.ops.render.render(write_still=True); print('DIAG', view, v, flush=True)
print('DIAG done', flush=True)
