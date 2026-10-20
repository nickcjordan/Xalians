"""B-t5dc: artifact-hunting renders for a paw part preview blend: close zoom, grazing light (Cycles, low raking sun) and a
curvature map (mean curvature as vertex colour, blue = concave, amber = convex, luminance carries the sign too).

Usage: blender -b PREVIEW.blend --python paw_part_inspect.py -- PAWS.npz OUT_DIR TAG
Renders OUT_DIR/<TAG>_<paw>_<view>_<mode>.png for the left hind and fore paws. Read only: the blend is never saved.
"""
import bpy, bmesh, sys, os, numpy as np
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
D = dict(np.load(args[0])); OUT = args[1]; TAG = args[2]; os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
body = bpy.data.objects['luceras_blockout']
for o in bpy.data.objects:
    if o.type in ('CURVES', 'EMPTY', 'LIGHT', 'CAMERA') or o.name == 'lookdev_ground': o.hide_render = True
    if o.type == 'MESH' and o.name.startswith('paw_') and '_claw_' not in o.name: o.hide_render = True   # parts are welded into the body


def curvature_colors(ob):
    """Mean curvature per vertex (cotangent-free: umbrella Laplacian along the normal over mean edge length squared)."""
    me = ob.data; n = len(me.vertices)
    V = np.empty(n * 3); me.vertices.foreach_get('co', V); V = V.reshape(-1, 3)
    N = np.empty(n * 3); me.vertices.foreach_get('normal', N); N = N.reshape(-1, 3)
    E = np.empty(len(me.edges) * 2, int); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
    S = np.zeros((n, 3)); C = np.zeros(n); L = np.zeros(n)
    el = np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1)
    for a, b in ((0, 1), (1, 0)):
        np.add.at(S, E[:, a], V[E[:, b]]); np.add.at(C, E[:, a], 1); np.add.at(L, E[:, a], el)
    C = np.maximum(C, 1); lap = S / C[:, None] - V; h = L / C
    H = -(lap * N).sum(1) / np.maximum(h * h, 1e-12) * 4   # ~ 1/radius (1/m); positive convex
    Hmm = H / 1000.0   # 1/mm
    t = np.clip(Hmm / 0.35, -1, 1)
    neutral = np.array([0.62, 0.6, 0.57]); amber = np.array([0.98, 0.72, 0.18]); blue = np.array([0.08, 0.22, 0.62])
    col = np.where(t[:, None] > 0, neutral + (amber - neutral) * t[:, None], neutral + (blue - neutral) * (-t[:, None]))
    if 'curv' in me.color_attributes: me.color_attributes.remove(me.color_attributes['curv'])
    ca = me.color_attributes.new('curv', 'FLOAT_COLOR', 'POINT')
    ca.data.foreach_set('color', np.c_[col, np.ones(n)].ravel().astype(np.float32))
    me.color_attributes.active_color = ca


curvature_colors(body)
for o in bpy.data.objects:
    if o.type == 'MESH' and '_claw_' in o.name and o.name.startswith('paw_'):
        if 'curv' not in o.data.color_attributes:
            ca = o.data.color_attributes.new('curv', 'FLOAT_COLOR', 'POINT'); ca.data.foreach_set('color', np.tile([0.62, 0.6, 0.57, 1.0], len(o.data.vertices)).astype(np.float32))

gme = bpy.data.meshes.new('pi_ground'); gme.from_pydata([(-30, -30, -0.0002), (30, -30, -0.0002), (30, 30, -0.0002), (-30, 30, -0.0002)], [], [(0, 1, 2, 3)])
gro = bpy.data.objects.new('pi_ground', gme); sc.collection.objects.link(gro)
camd = bpy.data.cameras.new('picam'); cam = bpy.data.objects.new('picam', camd); sc.collection.objects.link(cam); sc.camera = cam
sund = bpy.data.lights.new('pisun', 'SUN'); sund.energy = 4.0; sund.angle = np.radians(1.5); sun = bpy.data.objects.new('pisun', sund); sc.collection.objects.link(sun)
mat = bpy.data.materials.new('piclay'); mat.use_nodes = True
bsdf = mat.node_tree.nodes.get('Principled BSDF'); bsdf.inputs['Base Color'].default_value = (0.62, 0.6, 0.57, 1); bsdf.inputs['Roughness'].default_value = 0.55
sc.world = sc.world or bpy.data.worlds.new('w'); sc.world.use_nodes = True
bg = sc.world.node_tree.nodes.get('Background'); bg.inputs[0].default_value = (0.5, 0.5, 0.5, 1); bg.inputs[1].default_value = 0.08


def set_mode(mode):
    if mode == 'grz':
        sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = True
        sc.view_settings.view_transform = 'Standard'; sun.hide_render = False
        for o in bpy.data.objects:
            if o.type == 'MESH':
                o['_mats'] = [s.material.name if s.material else '' for s in o.material_slots]
                if o.data.materials: o.data.materials.clear()
                o.data.materials.append(mat)
    else:
        sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
        sh.light = 'STUDIO'; sh.color_type = 'VERTEX' if mode == 'curv' else 'SINGLE'; sh.single_color = (0.62, 0.6, 0.57)
        sh.show_cavity = mode == 'cav'; sh.cavity_type = 'BOTH'; sh.cavity_ridge_factor = 2.0; sh.cavity_valley_factor = 2.0
        sh.show_shadows = False; sc.display.light_direction = (0.35, -0.45, 0.82)


def shoot(t, dv, scale, light, path, res=(900, 900)):
    dv = Vector(dv).normalized(); cam.location = Vector(t) + dv * 1.0; cam.rotation_euler = (-dv).to_track_quat('-Z', 'Y').to_euler()
    camd.type = 'ORTHO'; camd.ortho_scale = scale; camd.clip_start = 0.93 if dv.z > 0.99 else 0.01
    sun.rotation_euler = (-Vector(light).normalized()).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.filepath = path; bpy.ops.render.render(write_still=True)


def views():
    out = []
    for kind, back, zt, s in (('hind', 0.030, 0.018, 0.085), ('fore', 0.020, 0.016, 0.068)):
        O = Vector(D[f'{kind}_O']); f = Vector(D[f'{kind}_f']); l = Vector(D[f'{kind}_l']); z = Vector((0, 0, 1))
        t = O - f * back + z * zt; cut = Vector(D[f'{kind}_cut']); a = Vector(D[f'{kind}_axis'])
        tl = cut + a * 0.02   # 20 mm below the join along the leg: the hand-over band
        V = {'top': (t, z + f * 0.0001, s, l * 1.0 + z * 0.22 - f * 0.3),
             'tq': (t, f * 0.75 + l * 0.75 + z * 0.42, s, -l + z * 0.25 + f * 0.2),
             'side': (t, l + z * 0.06, s, f * 1.0 + z * 0.2),
             'front': (t, f + z * 0.12, s * 0.8, l + z * 0.18),
             'back_tq': (t, -f * 0.8 + l * 0.8 + z * 0.22, s, f - l * 0.3 + z * 0.25),
             'leg': (tl, l + z * 0.06, s * 0.9, z + f * 0.15),
             'legback': (tl, -f + l * 0.4 + z * 0.1, s * 0.9, z + l * 0.25),
             'sole': (t, -z + f * 0.0001, s, -z + l * 0.3)}
        for v, (tt, dv, scl, li) in V.items(): out.append((f'{kind}_{v}', tt, dv, scl, li))
    return out


VIEWS = views()
for mode in ('curv', 'cav', 'grz'):
    set_mode(mode)
    for name, t, dv, s, li in VIEWS:
        sole = name.endswith('_sole'); gro.hide_render = sole
        if sole: camd.clip_start = 0.95
        shoot(t, dv, s, li, f'{OUT}/{TAG}_{name}_{mode}.png')
        gro.hide_render = False
print('INSPECT done')
