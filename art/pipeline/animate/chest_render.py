"""B-bafy: chest/belly proof crops behind the left foreleg (read only; the blend is never saved).

blender -b --factory-startup --python chest_render.py -- CLIPS OUT_DIR TAG [frames]
Poses: rest and signature frames (default 7, 8, 9: the deepest crouch). Views: side from the creature's left (az 90,
el 4, Nick's view) and low three-quarter (az 55, el -12). Each as grz (Cycles, look-dev lights off, one low sun
raking from behind and above along the body) and curv (Workbench, mean curvature as vertex colour: dark blue =
concave, amber/light = convex). Crop centred on the chest point behind the elbow (vertex CHEST_VERTEX, posed).
Also a full-body side frame in the review look (EEVEE look-dev) for context.
"""
import bpy, sys, math, os, numpy as np
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'rig')); sys.path.insert(0, str(HERE.parent / 'roster'))
import lookdev
import neck_lib as NL

a = sys.argv[sys.argv.index('--') + 1:]; SRC, OUT, TAG = a[0], Path(a[1]), a[2]
FR = [int(x) for x in a[3].split(',')] if len(a) > 3 else [7, 8, 9]
OUT.mkdir(parents=True, exist_ok=True)
CHEST_VERTEX = int(os.environ.get('CHEST_VERTEX', '32720'))
bpy.ops.wm.open_mainfile(filepath=SRC)
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0; rig.location = (0, 0, 0); rig.animation_data_create()
body = bpy.data.objects['luceras_blockout']; sc = bpy.context.scene
me = body.data
E = np.empty(len(me.edges) * 2, int); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
me.calc_loop_triangles(); F = np.empty(len(me.loop_triangles) * 3, int); me.loop_triangles.foreach_get('vertices', F); F = F.reshape(-1, 3)
VIEWS = {'side': (90.0, 4.0), 'lowthreeq': (55.0, 6.0)}
if os.environ.get('CHEST_VIEWS'):   # name:az:el,...
    VIEWS = {v.split(':')[0]: (float(v.split(':')[1]), float(v.split(':')[2])) for v in os.environ['CHEST_VIEWS'].split(',')}


def pose(act, f):
    if act is None:
        rig.animation_data.action = None
        for p in rig.pose.bones: p.rotation_mode = 'QUATERNION'; p.rotation_quaternion = (1, 0, 0, 0); p.location = (0, 0, 0); p.scale = (1, 1, 1)
    else:
        ac = bpy.data.actions[act]; rig.animation_data.action = ac
        if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    sc.frame_set(f); bpy.context.view_layer.update()


def eval_V():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); ev.to_mesh_clear(); return x.reshape(-1, 3)


def curv_attr(Vp):
    H = NL.smooth_field(NL.curvature(Vp, NL.vertex_normals(Vp, F), E), E, 2)
    t = np.clip(H / 0.12, -1, 1)
    neutral = np.array([0.55, 0.55, 0.55]); amber = np.array([0.98, 0.78, 0.30]); blue = np.array([0.05, 0.12, 0.42])
    col = np.where(t[:, None] > 0, neutral + (amber - neutral) * t[:, None], neutral + (blue - neutral) * (-t[:, None]))
    if 'chest_curv' in me.color_attributes: me.color_attributes.remove(me.color_attributes['chest_curv'])
    ca = me.color_attributes.new('chest_curv', 'FLOAT_COLOR', 'POINT')
    ca.data.foreach_set('color', np.c_[col, np.ones(len(col))].ravel().astype(np.float32)); me.color_attributes.active_color = ca


def place(az, el, centre, half):
    cam = lookdev.place_camera('lookdev_chest', (centre - Vector((half,) * 3), centre + Vector((half,) * 3)), az, el, 0.0)
    cam.data.ortho_scale = 2 * half; cam.data.shift_x = cam.data.shift_y = 0.0
    d = lookdev.camera_direction(az, el); cam.location = centre + d * 10.0; sc.camera = cam; return cam


lookdev.setup_scene('CYCLES')
for o in sc.objects:
    if o.type == 'MESH':
        if o.get('body_kind') == 'sculpt': lookdev.apply_clay(o); o.hide_render = False
        elif o.get('body_kind') in ('game', 'plume_standin'): o.hide_render = True
lights = [o for o in sc.objects if o.type == 'LIGHT']
ld = bpy.data.lights.new('graze_sun', 'SUN'); ld.energy = 4.0; ld.angle = math.radians(1.0)
sun = bpy.data.objects.new('graze_sun', ld); sc.collection.objects.link(sun)
bg = sc.world.node_tree.nodes['Background'].inputs['Strength']; bg0 = bg.default_value
poses = [('rest', None, 0)] + [(f'f{f:02d}', 'sig.horns-first-descent', f) for f in FR]
for pname, act, f in poses:
    pose(act, f); Vp = eval_V(); curv_attr(Vp)
    centre = Vector(Vp[CHEST_VERTEX].tolist())
    if os.environ.get('CHEST_CENTER') == 'elbow':
        centre = rig.pose.bones['leg_fl_02'].head.copy() + Vector([float(x) for x in os.environ.get('CHEST_OFFSET', '0,0.03,0.03').split(',')])
    HALF = float(os.environ.get('CHEST_HALF', '0.085'))
    for vname, (az, el) in VIEWS.items():
        place(az, el, centre, HALF)
        cd = lookdev.camera_direction(az, el)
        # rake from behind (+Y) and above, 25 deg off the surface plane on the camera side
        d = (Vector((0, 0.75, -0.55)).normalized() * math.cos(math.radians(25)) - cd * math.sin(math.radians(25))).normalized()
        sun.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        sc.render.engine = 'CYCLES'; sc.cycles.samples = 32; sc.cycles.use_denoising = True
        for l in lights: l.hide_render = True
        sun.hide_render = False; bg.default_value = 0.08
        sc.render.resolution_x = sc.render.resolution_y = 720; sc.render.resolution_percentage = 100
        sc.render.filepath = str(OUT / f'{TAG}_{pname}_{vname}_grz.png'); bpy.ops.render.render(write_still=True)
        sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
        sh.light = 'FLAT'; sh.color_type = 'VERTEX'; sh.show_cavity = False; sh.show_shadows = False
        sc.render.filepath = str(OUT / f'{TAG}_{pname}_{vname}_curv.png'); bpy.ops.render.render(write_still=True)
        # the review look (look-dev lights, EEVEE), same crop
        for l in lights: l.hide_render = False
        sun.hide_render = True; bg.default_value = bg0
        sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in lookdev._engines() else 'BLENDER_EEVEE_NEXT'
        sc.render.filepath = str(OUT / f'{TAG}_{pname}_{vname}_review.png'); bpy.ops.render.render(write_still=True)
        print('STILL', pname, vname, flush=True)
    # context: full body, review look (look-dev lights, EEVEE), from the left like Nick's screenshot
    for l in lights: l.hide_render = False
    sun.hide_render = True; bg.default_value = bg0
    sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in lookdev._engines() else 'BLENDER_EEVEE_NEXT'
    try: sc.eevee.taa_render_samples = 32
    except Exception: pass
    place(90.0, 4.0, Vector((0, 0.05, 0.42)) + Vector((0, 0, Vp[:, 2].min())), 0.62)
    sc.render.resolution_x = 900; sc.render.resolution_y = 900
    sc.render.filepath = str(OUT / f'{TAG}_{pname}_body_review.png'); bpy.ops.render.render(write_still=True)
print('RENDER done', flush=True)
