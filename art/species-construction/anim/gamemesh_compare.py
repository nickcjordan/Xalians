"""Akinza game mesh pass 1, Blender stage 2: region masks for the silhouette check and the comparison renders.

  run_blender.py gamemesh_compare.py <log> -- <surface dir> <rig dir> <bake dir> <work dir> <out dir>
      [--correctives FILE] [--samples 24]

Two poses: rest (the bind pose, no clip) and the deepest Night Stalk frame (lowest hips). The source is the skin of
record with its eyes, iris, nose and claws, posed exactly as the sprites pose it (rig_core.posed_skin: breath keys,
correctives, dual quaternions; parts on their bones, clip_frames.py). The game mesh (gamemesh.npz) is posed as the
glb plays it: linear skinning of its rest plus the morph targets at that frame's weights (gamemesh_glb.py).

Writes into <out dir>:
  masks/<pose>-<source|game>.png  side camera (the clips' 720 px review camera: azimuth 90, elevation 3, the clips4
       box), Workbench flat colors, no antialiasing, one color per region (ears, head, arms, legs, feet, tails, trunk;
       background black) -> gamemesh_checks.py measures the outlines;
  shots/<pose>-<view>-<source-clay|game-clay|game-look>.png at 720 px, views side (as above) and three_quarter
       (look-dev three_quarter_left, azimuth 45, elevation 12), Cycles, look-dev lights, clay or the baked maps.
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

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1]/'pipeline/roster'))
import rig_core as rc  # noqa: E402
import akinza_clips as ac  # noqa: E402
import gamemesh_common as gm  # noqa: E402
import gamemesh_glb as gg  # noqa: E402
import lookdev  # noqa: E402

p = argparse.ArgumentParser()
for k in ('surface', 'rig', 'bake', 'work', 'out'):
    p.add_argument(k, type=Path)
p.add_argument('--correctives', type=Path, default=None)
p.add_argument('--samples', type=int, default=24)
p.add_argument('--size', type=int, default=720)
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
t0 = time.time()
BOX = np.array([-0.5375, -0.5567, -0.987, 0.6738, 0.7639, 0.932])
REGION_RGB = dict(ears=(1, 0, 0), head=(0, 1, 0), arms=(0, 0, 1), legs=(1, 1, 0), feet=(1, 0, 1), tails=(0, 1, 1), trunk=(1, 1, 1))

bpy.ops.wm.open_mainfile(filepath=str(a.surface/'surface.blend'))
for o in list(bpy.data.objects):
    if o.type in ('CAMERA', 'LIGHT', 'CURVES') or 'ribbon' in o.name or o.name.startswith('catch light') or 'closed_mouth' in o.name:
        bpy.data.objects.remove(o, do_unlink=True)
sc = bpy.context.scene
rig, J, s, off = gg.load_rig(a.rig)
to_m = lambda X: s*(np.asarray(X, float)-off)
from_m = lambda X: np.asarray(X)/s+off
wt = np.load(a.rig/'weights.npz')
idx = wt['idx'].astype(int)
w = np.round(wt['w'].astype(np.float64)*4096)/4096
w /= w.sum(1, keepdims=True)
KEYS = json.loads((a.rig/'correctives.json').read_text())['keys']
cz = np.load(a.rig/'correctives.npz')
DELTAS = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in KEYS}
SH = ac.load_shapes(a.bake)
frames = gg.clip_frames(a.bake)
stalk = frames['sig.night-stalk']
deep = int(np.argmin([rc.lift_vec(f['lift'])[2] for f in stalk[:45]]))
POSES = {'rest': dict(frame=dict(pose={}, lift=0., shapes={}), clip=None, k=None),
         'crouch': dict(frame=stalk[deep], clip='sig.night-stalk', k=deep)}

skin = bpy.data.objects[gm.SKIN]
src_parts = [o for o in bpy.data.objects if o.type == 'MESH' and o is not skin]
REST = gm.world_co(skin)
REST_M = to_m(REST)
others = {o.name: gm.world_co(o) for o in src_parts}
NAMES = rc.ANIM_NAMES
REG = {}
for b in NAMES:
    bb = rc.base_of(b)
    REG[b] = ('ears' if b.startswith('ear_') else 'head' if bb in ('head', 'jaw', 'neck') else
              'arms' if bb in ('clavicle', 'upperarm', 'forearm', 'hand') else 'legs' if bb in ('thigh', 'shin', 'hip', 'glute') else
              'feet' if bb == 'foot' else 'tails' if b.startswith('tail_') and b != 'tail_root' else 'trunk')


def part_bone(name):
    nm = name.lower()
    sd = 'L' if '+1' in nm else 'R'
    return f'hand.{sd}' if 'fore claw' in nm else f'foot.{sd}' if 'hind claw' in nm else 'head'


# ---- game mesh object from the npz
G = np.load(a.work/'gamemesh.npz', allow_pickle=True)
corr = np.load(a.correctives, allow_pickle=True) if a.correctives else None
corr_names = [str(x) for x in corr['names']] if corr is not None else []
game_objs = {}
for pr in [str(x) for x in G['prims']]:
    V = G[pr+'_pos'].astype(np.float64)
    F = G[pr+'_idx'].astype(np.int64)
    me = bpy.data.meshes.new('game_'+pr)
    me.from_pydata(V.tolist(), [], F.tolist())
    me.update()
    uvl = me.uv_layers.new(name='UVMap')
    lv = np.empty(len(me.loops), np.int32)
    me.loops.foreach_get('vertex_index', lv)
    uvl.data.foreach_set('uv', G[pr+'_uv'][lv].astype(np.float32).ravel())
    for poly in me.polygons:
        poly.use_smooth = True
    ob = bpy.data.objects.new('game_'+pr, me)
    sc.collection.objects.link(ob)
    morph = [G[pr+'_breath'], G[pr+'_breath_belly']]+[corr[f'{pr}__{n}'] for n in corr_names]
    game_objs[pr] = dict(obj=ob, pos=to_m(V), wj=G[pr+'_wj'].astype(int), ww=G[pr+'_ww'].astype(float), morph=[np.asarray(m, float) for m in morph])
for d in game_objs.values():
    d['ww'] = d['ww']/d['ww'].sum(1, keepdims=True)


def pose_all(name):
    P = POSES[name]
    fr = P['frame']
    T = gg.frame_T(J, fr)
    base = ac.apply_shapes(REST_M, fr, SH)
    X = rc.posed_skin(base, idx, w, J, fr['pose'], fr['lift'], KEYS, DELTAS, rc.ANIM_BONES)[0]
    gm.set_world_co(skin, from_m(X))
    for o in src_parts:
        Rb, tb = T[part_bone(o.name)]
        gm.set_world_co(o, from_m(to_m(others[o.name])@Rb.T+tb))
    sh = fr.get('shapes', {})
    cw = corr[f"weights__{P['clip']}"][P['k']] if (corr is not None and P['clip']) else np.zeros(len(corr_names))
    for pr, d in game_objs.items():
        x = d['pos']+sh.get('breath', 0.)*d['morph'][0]+sh.get('breath_belly', 0.)*d['morph'][1]
        for j in range(len(corr_names)):
            x = x+cw[j]*d['morph'][2+j]
        gm.set_world_co(d['obj'], from_m(rc.skin_points(x, d['wj'], d['ww'], T, rc.ANIM_BONES)))
    bpy.context.view_layer.update()


# ---- region materials
def flat_mat(name, rgb):
    m = bpy.data.materials.new('region_'+name)
    m.diffuse_color = (*rgb, 1.)
    return m


RMAT = {r: flat_mat(r, c) for r, c in REGION_RGB.items()}
RORDER = list(REGION_RGB)


def set_region_materials(ob, vert_region):
    me = ob.data
    me.materials.clear()
    for r in RORDER:
        me.materials.append(RMAT[r])
    me.calc_loop_triangles()
    pv = [poly.vertices[0] for poly in me.polygons]
    ri = np.array([RORDER.index(vert_region[v]) for v in pv], np.int32)
    me.polygons.foreach_set('material_index', ri)


def region_setup():
    set_region_materials(skin, np.array([REG[NAMES[i]] for i in idx[:, 0]]))
    for o in src_parts:
        r = REG[part_bone(o.name)]
        set_region_materials(o, np.array([r]*len(o.data.vertices)))
    for pr, d in game_objs.items():
        dom = d['wj'][np.arange(len(d['wj'])), np.argmax(d['ww'], 1)]
        set_region_materials(d['obj'], np.array([REG[NAMES[i]] for i in dom]))


cam = bpy.data.objects.new('gm camera', bpy.data.cameras.new('gm camera'))
sc.collection.objects.link(cam)
sc.camera = cam


def side_camera():
    az, el = 90., 3.
    lo, hi = BOX[:3], BOX[3:]
    center = (lo+hi)/2
    ar, er = math.radians(az), math.radians(el)
    dvec = Vector((math.sin(ar)*math.cos(er), -math.cos(ar)*math.cos(er), math.sin(er)))
    cam.location = Vector(tuple(center))+dvec*10
    cam.rotation_euler = (-dvec).to_track_quat('-Z', 'Y').to_euler()
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


def tq_camera():
    az, el = lookdev.CAMERAS['three_quarter_left']
    lc = lookdev.place_camera('gm_tq', (Vector(tuple(BOX[:3])), Vector(tuple(BOX[3:]))), az, el)
    cam.location, cam.rotation_euler = lc.location.copy(), lc.rotation_euler.copy()
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = lc.data.ortho_scale
    cam.data.shift_x, cam.data.shift_y = lc.data.shift_x, lc.data.shift_y
    cam.data.clip_end = 100


def show(which):
    for o in [skin]+src_parts:
        o.hide_render = which != 'source'
    for d in game_objs.values():
        d['obj'].hide_render = which != 'game'


sc.render.resolution_x = sc.render.resolution_y = a.size
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGB'
(a.out/'masks').mkdir(parents=True, exist_ok=True)
(a.out/'shots').mkdir(parents=True, exist_ok=True)
info = dict(deepFrame=deep, poses=list(POSES), renderSeconds={})

# ---- masks (Workbench, flat, no AA)
region_setup()
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.render_aa = 'OFF'
sc.display.shading.light = 'FLAT'
sc.display.shading.color_type = 'MATERIAL'
sc.display.shading.background_type = 'VIEWPORT'
sc.display.shading.background_color = (0, 0, 0)
sc.view_settings.view_transform = 'Standard'
sc.render.film_transparent = True
sc.render.image_settings.color_mode = 'RGBA'
sc.render.dither_intensity = 0.
try:
    sc.display.shading.show_object_outline = False
    sc.display.shading.show_cavity = False
    sc.display.shading.show_shadows = False
except AttributeError:
    pass
side_camera()
for pose in POSES:
    pose_all(pose)
    for which in ('source', 'game'):
        show(which)
        sc.render.filepath = str(a.out/'masks'/f'{pose}-{which}.png')
        bpy.ops.render.render(write_still=True)
info['maskCamera'] = dict(orthoScale=cam.data.ortho_scale, shift=[cam.data.shift_x, cam.data.shift_y], size=a.size, box=BOX.tolist())

# ---- comparison renders (Cycles, look-dev lights)
lookdev.setup_scene('CYCLES')
sc.render.image_settings.color_mode = 'RGB'
sc.render.film_transparent = False
sc.cycles.samples = a.samples
for o in bpy.data.objects:
    if o.name == 'lookdev_ground':
        o.hide_render = True
clay = lookdev._material('lookdev_clay', lookdev.CLAY_RGB, .85)
look = bpy.data.materials.new('game_look')
look.use_nodes = True
nt = look.node_tree
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
bsdf.inputs['Roughness'].default_value = .9
uvn = nt.nodes.new('ShaderNodeUVMap')
uvn.uv_map = 'UVMap'
tex = {}
for nm, cs in (('color', 'sRGB'), ('normal', 'Non-Color'), ('ao', 'Non-Color')):
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = bpy.data.images.load(str(a.work/f'{nm}.png'))
    t.image.colorspace_settings.name = cs
    nt.links.new(uvn.outputs[0], t.inputs['Vector'])
    tex[nm] = t
mul = nt.nodes.new('ShaderNodeMix')
mul.data_type = 'RGBA'
mul.blend_type = 'MULTIPLY'
mul.inputs[0].default_value = 1.
nt.links.new(tex['color'].outputs['Color'], mul.inputs[6])
nt.links.new(tex['ao'].outputs['Color'], mul.inputs[7])
nt.links.new(mul.outputs[2], bsdf.inputs['Base Color'])
nm_node = nt.nodes.new('ShaderNodeNormalMap')
nm_node.uv_map = 'UVMap'
nt.links.new(tex['normal'].outputs['Color'], nm_node.inputs['Color'])
nt.links.new(nm_node.outputs['Normal'], bsdf.inputs['Normal'])


def set_mat(objs, m):
    for o in objs:
        o.data.materials.clear()
        o.data.materials.append(m)
        o.data.polygons.foreach_set('material_index', np.zeros(len(o.data.polygons), np.int32))


for pose in POSES:
    pose_all(pose)
    for view, cam_fn in (('side', side_camera), ('three_quarter', tq_camera)):
        cam_fn()
        for variant in ('source-clay', 'game-clay', 'game-look'):
            if variant == 'source-clay':
                show('source')
                set_mat([skin]+src_parts, clay)
            else:
                show('game')
                set_mat([d['obj'] for d in game_objs.values()], clay if variant == 'game-clay' else look)
            t1 = time.time()
            sc.render.filepath = str(a.out/'shots'/f'{pose}-{view}-{variant}.png')
            bpy.ops.render.render(write_still=True)
            info['renderSeconds'][f'{pose}-{view}-{variant}'] = round(time.time()-t1, 1)
            print('render', pose, view, variant, round(time.time()-t1, 1), flush=True)
info['seconds'] = round(time.time()-t0, 1)
(a.out/'compare.json').write_text(json.dumps(info, indent=1))
print('COMPARE_DONE', json.dumps(info), flush=True)
