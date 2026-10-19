"""B-4cj4: clay (Workbench) paw views for the paw profile pass. Optionally replaces body coords from an npz (key new_world).
Usage: blender -b IN.blend --python pawprofile_clay.py -- OUT_DIR PREFIX [NEW.npz]
Views per paw (left fore, left hind): side (outside), front (low, from ahead), tq (three-quarter front-outside),
top (top-down), back_tq (low three-quarter from behind-outside); plus 'all_front' (low front view of all four paws)."""
import bpy, numpy as np, sys, math
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]; out, pre = args[0], args[1]; npz = args[2] if len(args) > 2 else None
body = bpy.data.objects['luceras_blockout']
if npz:
    d = np.load(npz); nw = d['new_world']; mw = np.array(body.matrix_world); inv = np.linalg.inv(mw)
    body.data.vertices.foreach_set('co', (nw @ inv[:3, :3].T + inv[:3, 3]).ravel().astype(np.float32)); body.data.update()
    for k in d.files:
        if k.startswith('clawM_'):
            o = bpy.data.objects[k[6:]]; o.matrix_world = __import__('mathutils').Matrix(d[k].tolist()) @ o.matrix_world
for o in bpy.data.objects:
    if o.type in ('CURVES', 'EMPTY', 'LIGHT', 'CAMERA'): o.hide_render = True
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'
sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'SINGLE'; sh.single_color = (0.62, 0.6, 0.57)
sh.show_cavity = True; sh.cavity_type = 'BOTH'; sh.cavity_ridge_factor = 1.0; sh.cavity_valley_factor = 1.2; sh.show_shadows = True; sh.shadow_intensity = 0.35
sc.display.light_direction = (0.35, -0.45, 0.82)
sc.render.resolution_x = sc.render.resolution_y = 640; sc.render.film_transparent = False
sc.world = sc.world or bpy.data.worlds.new('w'); sc.world.color = (0.85, 0.85, 0.85)
bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, -0.0002)); bpy.context.object.name = 'pp_ground'
cam_data = bpy.data.cameras.new('ppcam'); cam = bpy.data.objects.new('ppcam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
PAWS = {'hind': Vector((0.120, 0.135, 0.022)), 'fore': Vector((0.037, -0.135, 0.022))}
VIEWS = {  # direction from target to camera (x outward for left paws), ortho scale
    'side': ((1, 0, 0.08), 0.16), 'front': ((0.0, -1, 0.12), 0.14), 'tq': ((0.75, -0.75, 0.42), 0.15),
    'top': ((0.0, -0.0001, 1), 0.15), 'back_tq': ((0.8, 0.8, 0.22), 0.15)}
def shoot(target, dirv, scale, name, res=(640, 640)):
    dv = Vector(dirv).normalized(); cam.location = target + dv * 1.0
    cam.rotation_euler = (-dv).to_track_quat('-Z', 'Y').to_euler(); cam_data.type = 'ORTHO'; cam_data.ortho_scale = scale
    cam_data.clip_start = 0.93 if name.endswith('top') else 0.01
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.filepath = f'{out}/{pre}_{name}.png'; bpy.ops.render.render(write_still=True)
for paw, t in PAWS.items():
    for v, (dv, s) in VIEWS.items(): shoot(t, dv, s, f'{paw}_{v}')
shoot(Vector((0, 0.0, 0.03)), (0, -1, 0.10), 0.46, 'all_front', (1280, 400))
print('CLAY done')
