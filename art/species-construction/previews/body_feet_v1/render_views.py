"""Clay renders of an assembled Akinza for the body B v1 and feet v1 steps, optionally as a displacement heat map.

Usage: as below, plus an optional 6th argument <ref.npz> (array 'v': skin coordinates of the step's input, same vertex order)
and 7th <max> (world units for the top of the ramp): the skin is then painted by its displacement from ref, grey at 0 through
blue to amber at max (luminance rises with the displacement, so it reads without hue). Copied from feet_body/preview_render.py.

Run: python art/species-construction/loop/loop_tools.py blender preview_render.py -- <akinza.blend> <deform.npz|none> <out-dir> <views,comma> [samples]
deform.npz holds 'skin' (new world coordinates of the largest mesh, same vertex order) and optionally
'claw::<object name>' arrays for the claw objects. The blend file is opened read-only in memory and never saved.
Lighting is render_surface.py's rig, as in the earlier head-redesign clay views.
"""
import sys, time
from pathlib import Path
sys.path.insert(0, r'C:\dev\src\xalians-akinza-loop\art\species-construction\surface')
import bpy, numpy as np
from mathutils import Vector
import render_surface as rs

FX, FY, FZ = 0.36, -0.04, -0.87   # hind foot close-up target (x sign picks the foot)
V = {
    # full-body cameras (same as the tails-v3 full-body sheets)
    'bfront': (0, 4, Vector((0.0, 0.16, -0.03)), 2.05, 768, 1024),
    'bside': (90, 4, Vector((0.0, 0.16, -0.03)), 2.05, 768, 1024),
    'bback': (180, 4, Vector((0.0, 0.16, -0.03)), 2.05, 768, 1024),
    'bq': (38, 8, Vector((0.0, 0.16, -0.03)), 2.05, 768, 1024),
    'brq': (218, 8, Vector((0.0, 0.16, -0.03)), 2.05, 768, 1024),
    # both hind feet, lower legs
    'lfront': (0, 4, Vector((0.0, -0.02, -0.78)), 1.15, 1024, 640),
    'lback': (180, 4, Vector((0.0, -0.02, -0.78)), 1.15, 1024, 640),
    'lq': (38, 8, Vector((0.0, -0.02, -0.78)), 1.15, 1024, 640),
    'lrq': (218, 8, Vector((0.0, -0.02, -0.78)), 1.15, 1024, 640),
    'lside': (270, 4, Vector((0.0, -0.02, -0.78)), 1.15, 1024, 640),
    # one hind foot (the -x foot) close up
    'ffront': (0, 4, Vector((-FX, FY, FZ)), 0.40, 800, 800),
    'fside': (270, 4, Vector((-FX, FY, FZ)), 0.40, 800, 800),
    'fback': (180, 4, Vector((-FX, FY, FZ)), 0.40, 800, 800),
    'fq': (322, 8, Vector((-FX, FY, FZ)), 0.40, 800, 800),
    'frq': (218, 8, Vector((-FX, FY, FZ)), 0.40, 800, 800),
    'ftop': (0, 80, Vector((-FX, FY, FZ)), 0.40, 800, 800),
    'fsole': (0, -80, Vector((-FX, FY, FZ)), 0.40, 800, 800),
    # the +x foot from the full-body three-quarter side
    'fqR': (38, 8, Vector((FX, FY, FZ)), 0.40, 800, 800),
    # body crops
    'hipback': (180, 8, Vector((0.0, 0.05, -0.22)), 0.55, 900, 900),
    'hipq': (322, 8, Vector((-0.08, 0.0, -0.22)), 0.55, 900, 900),
    'hipside': (270, 4, Vector((-0.1, 0.0, -0.25)), 0.55, 900, 900),
    'neckq': (322, 8, Vector((0.0, 0.0, 0.34)), 0.45, 900, 900),
    'neckback': (180, 8, Vector((0.0, 0.0, 0.34)), 0.45, 900, 900),
    'tfront': (0, 4, Vector((0.0, 0.0, 0.05)), 0.95, 900, 900),
    'tback': (180, 4, Vector((0.0, 0.0, 0.05)), 0.95, 900, 900),
    'tq': (38, 8, Vector((0.0, 0.0, 0.05)), 0.95, 900, 900),
    'tside': (270, 4, Vector((0.0, 0.0, 0.05)), 0.95, 900, 900),
    'shoulderq': (322, 12, Vector((-0.22, 0.0, 0.26)), 0.45, 900, 900),
    'shoulderfront': (0, 4, Vector((-0.2, 0.0, 0.26)), 0.45, 900, 900),
    'tailroot': (200, 12, Vector((0.05, 0.08, -0.15)), 0.55, 900, 900),
    'tailrootside': (90, 4, Vector((0.1, 0.05, -0.15)), 0.55, 900, 900),
    'ankleq': (322, 8, Vector((-FX, 0.0, -0.80)), 0.45, 800, 800),
    'ankleback': (180, 4, Vector((-FX, 0.0, -0.80)), 0.45, 800, 800),
}
a = sys.argv[sys.argv.index('--')+1:]
blend, deform, out = Path(a[0]), a[1], Path(a[2])
views = a[3].split(',')
samples = int(a[4]) if len(a) > 4 else 48
heat_ref = a[5] if len(a) > 5 and a[5] != 'none' else None
heat_max = float(a[6]) if len(a) > 6 else 0.03
bpy.ops.wm.open_mainfile(filepath=str(blend))
out.mkdir(parents=True, exist_ok=True)
skin = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
if deform != 'none':
    D = np.load(deform)
    co = D['skin'].astype(np.float64)
    assert co.shape == (len(skin.data.vertices), 3)
    skin.data.vertices.foreach_set('co', co.ravel()); skin.data.update()
    for k in D.files:
        if k.startswith('claw::'):
            ob = bpy.data.objects[k[6:]]
            c = D[k].astype(np.float64); assert c.shape == (len(ob.data.vertices), 3)
            ob.data.vertices.foreach_set('co', c.ravel()); ob.data.update()
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 4; sc.cycles.diffuse_bounces = 2; sc.cycles.glossy_bounces = 2
sc.render.resolution_percentage = 100; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.render.film_transparent = False
for ob in list(bpy.data.objects):
    if ob.type in ('CAMERA', 'LIGHT'):
        bpy.data.objects.remove(ob)
clay = bpy.data.materials.new('preview clay'); clay.use_nodes = True
bs = clay.node_tree.nodes.get('Principled BSDF')
bs.inputs['Base Color'].default_value = (0.35, 0.35, 0.35, 1); bs.inputs['Roughness'].default_value = 0.7
for i in range(len(skin.data.materials)):
    skin.data.materials[i] = clay
if heat_ref:
    ref = np.load(heat_ref)['v'].astype(np.float64)
    cur = np.empty(len(skin.data.vertices)*3); skin.data.vertices.foreach_get('co', cur); cur = cur.reshape(-1, 3)
    assert ref.shape == cur.shape
    t = np.clip(np.linalg.norm(cur-ref, axis=1)/heat_max, 0, 1)
    stops = np.array([[0, .35, .35, .35], [1e-4, .20, .30, .65], [.5, .35, .65, .95], [1, 1.0, .75, .15]])
    col = np.stack([np.interp(t, stops[:, 0], stops[:, c]) for c in (1, 2, 3)], 1)
    col[t == 0] = .35
    # one material per displacement bin, assigned per face (robust in Cycles; a colour attribute rendered black here)
    nb = 12
    mats = []
    for i in range(nb):
        tt = 0.0 if i == 0 else (i-0.5)/(nb-1)
        c = [.35, .35, .35] if i == 0 else [float(np.interp(tt, stops[:, 0], stops[:, k])) for k in (1, 2, 3)]
        m = bpy.data.materials.new(f'heat {i}'); m.use_nodes = True
        b2 = m.node_tree.nodes.get('Principled BSDF'); b2.inputs['Base Color'].default_value = (*c, 1); b2.inputs['Roughness'].default_value = 0.7
        mats.append(m)
    skin.data.materials.clear()
    for m in mats:
        skin.data.materials.append(m)
    loops = np.empty(len(skin.data.loops), np.int32); skin.data.loops.foreach_get('vertex_index', loops)
    starts = np.empty(len(skin.data.polygons), np.int32); skin.data.polygons.foreach_get('loop_start', starts)
    ft = np.maximum.reduceat(t[loops], starts)
    idx = np.where(ft <= 0, 0, 1+np.minimum((ft*(nb-1)).astype(int), nb-2))
    skin.data.polygons.foreach_set('material_index', idx.astype(np.int32))
    print('HEAT bins', np.bincount(idx, minlength=nb).tolist())
for p in skin.data.polygons:
    p.use_smooth = True
rs.setup_world(sc); rig = rs.make_rig()
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
for n in views:
    rs.place(cam, rig, V[n]); bpy.context.view_layer.update()
    sc.render.filepath = str(out/f'{n}{"-heat" if heat_ref else ""}.png'); t = time.time(); bpy.ops.render.render(write_still=True)
    print('rendered', n, round(time.time()-t, 1))
