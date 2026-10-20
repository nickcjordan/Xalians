"""B-6kf7: neck proof renders for the Luceras neck seam. Read only (the blend is never saved).

Usage: blender -b --factory-startup --python neck_render.py -- CLIPS_BLEND OUT_DIR TAG MODE
MODE
  stills   rest, idle frame 45 (1.5 s) and signature frame 29 (hit), side (az 270) and three-quarter (az 315, el 12),
           each as grz (Cycles, lookdev lights off, one low sun raking along the posed neck axis) and curv (Workbench,
           mean curvature as vertex colour: blue and dark = concave, amber and light = convex).
           -> OUT_DIR/<TAG>_<pose>_<view>_<mode>.png
  video    idle clip, side, 960 x 640, EEVEE look-dev lighting (the review look Nick saw), camera fixed on the head and
           neck -> OUT_DIR/frames_<TAG>/NNNN.png
"""
import bpy, sys, math, numpy as np
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE)); sys.path.insert(0, str(HERE.parent / 'roster'))
import lookdev
import neck_lib as NL

a = sys.argv[sys.argv.index('--') + 1:]; SRC, OUT, TAG, MODE = a[0], Path(a[1]), a[2], a[3]; OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=SRC)
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0; rig.location = (0, 0, 0); rig.animation_data_create()
body = bpy.data.objects['luceras_blockout']; sc = bpy.context.scene
POSES = {'rest': (None, 0), 'idle_f45': ('idle', 45), 'sig_f29': ('sig.horns-first-descent', 29)}
VIEWS = {'side': (270.0, 4.0), 'threeq': (315.0, 12.0)}


def pose(act, f):
    if act is None:
        rig.animation_data.action = None
        for p in rig.pose.bones: p.rotation_mode = 'QUATERNION'; p.rotation_quaternion = (1, 0, 0, 0); p.location = (0, 0, 0); p.scale = (1, 1, 1)
    else:
        rig.animation_data.action = bpy.data.actions[act]
    sc.frame_set(f); bpy.context.view_layer.update()


def neck_frame():
    pb = rig.pose.bones
    h = pb['head_01'].head; n1 = pb['neck_01'].head; n2 = pb['neck_02'].head
    axis = (h - n1).normalized()
    centre = h * 0.55 + n2 * 0.45 + Vector((0, 0, 0.005))
    return centre, axis


def place(az, el, centre, half):
    cam = lookdev.place_camera('lookdev_neck', (centre - Vector((half, half, half)), centre + Vector((half, half, half))), az, el, 0.0)
    cam.data.ortho_scale = 2 * half; cam.data.shift_x = cam.data.shift_y = 0.0
    d = lookdev.camera_direction(az, el); cam.location = centre + d * 10.0
    sc.camera = cam; return cam


def curv_attr(Vp):
    me = body.data
    E = np.empty(len(me.edges) * 2, int); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
    me.calc_loop_triangles(); F = np.empty(len(me.loop_triangles) * 3, int); me.loop_triangles.foreach_get('vertices', F); F = F.reshape(-1, 3)
    H = NL.curvature(Vp, NL.vertex_normals(Vp, F), E)
    H = NL.smooth_field(H, E, 2)
    t = np.clip(H / 0.12, -1, 1)
    neutral = np.array([0.55, 0.55, 0.55]); amber = np.array([0.98, 0.78, 0.30]); blue = np.array([0.05, 0.12, 0.42])
    col = np.where(t[:, None] > 0, neutral + (amber - neutral) * t[:, None], neutral + (blue - neutral) * (-t[:, None]))
    if 'neck_curv' in me.color_attributes: me.color_attributes.remove(me.color_attributes['neck_curv'])
    ca = me.color_attributes.new('neck_curv', 'FLOAT_COLOR', 'POINT')
    ca.data.foreach_set('color', np.c_[col, np.ones(len(col))].ravel().astype(np.float32)); me.color_attributes.active_color = ca


def eval_V():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); ev.to_mesh_clear(); return x.reshape(-1, 3)


lookdev.setup_scene('CYCLES')
for o in sc.objects:
    if o.type == 'MESH':
        if o.get('body_kind') == 'sculpt': lookdev.apply_clay(o); o.hide_render = False
        elif o.get('body_kind') == 'game': o.hide_render = True

if MODE == 'stills':
    lights = [o for o in sc.objects if o.type == 'LIGHT']
    ld = bpy.data.lights.new('graze_sun', 'SUN'); ld.energy = 4.0; ld.angle = math.radians(1.0)
    sun = bpy.data.objects.new('graze_sun', ld); sc.collection.objects.link(sun)
    import os
    for pname, (act, f) in POSES.items():
        if os.environ.get('NECK_POSES') and pname not in os.environ['NECK_POSES'].split(','): continue
        pose(act, f); centre, axis = neck_frame(); Vp = eval_V(); curv_attr(Vp)
        for vname, (az, el) in VIEWS.items():
            cam = place(az, el, centre, 0.11)
            cd = lookdev.camera_direction(az, el)
            # grazing: light travels from the head down the neck (across the ring), from 30 degrees on the camera side
            ax = -axis if axis.z > 0 else axis          # always rake from the upper end of the neck downward (the head points down at the hit)
            d = (ax * math.cos(math.radians(30)) - cd * math.sin(math.radians(30))).normalized()
            sun.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
            sc.render.engine = 'CYCLES'; sc.cycles.samples = 32; sc.cycles.use_denoising = True
            for l in lights: l.hide_render = True
            sun.hide_render = False; sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.08
            sc.render.resolution_x = sc.render.resolution_y = 720; sc.render.resolution_percentage = 100
            sc.render.filepath = str(OUT / f'{TAG}_{pname}_{vname}_grz.png'); bpy.ops.render.render(write_still=True)
            sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
            sh.light = 'FLAT'; sh.color_type = 'VERTEX'; sh.show_cavity = False; sh.show_shadows = False
            sc.render.filepath = str(OUT / f'{TAG}_{pname}_{vname}_curv.png'); bpy.ops.render.render(write_still=True)
            print('STILL', pname, vname, flush=True)
elif MODE == 'video':
    sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in lookdev._engines() else 'BLENDER_EEVEE_NEXT'
    try: sc.eevee.taa_render_samples = 16
    except Exception: pass
    pose('idle', 0); centre, axis = neck_frame()
    cam = place(270.0, 0.0, centre + Vector((0, 0.03, -0.03)), 0.16)
    cam.data.ortho_scale = 0.48; sc.render.resolution_x = 960; sc.render.resolution_y = 640; sc.render.resolution_percentage = 100
    out = OUT / f'frames_{TAG}'; out.mkdir(exist_ok=True)
    rig.animation_data.action = bpy.data.actions['idle']
    for f in range(0, 90):
        sc.frame_set(f); bpy.context.view_layer.update()
        sc.render.filepath = str(out / f'{f:04d}.png'); bpy.ops.render.render(write_still=True)
    print('VIDEO frames', out, flush=True)
print('RENDER done', flush=True)
