"""Build the Akinza armature in Blender, skin the assembled model, pose it, render it.

Runs through loop_tools.py (slot lock):

  loop_tools.py blender --log NAME art/species-construction/rig_akinza.py \
      --glb A/akinza.glb --joints J.json --weights W.npz --pose P.json --out DIR [--rest]

joints/weights/pose come from `loop_tools.py posed` (rig_core.py derives the
joints and weights from the mesh; rig_fit.py searches the pose). Skinning is the
armature modifier over vertex groups written from the weight table, so what
Blender deforms equals rig_core.skin_points (checked and logged). Writes into
DIR: masks front/left/back .png (flat alpha, the quick_silhouette cameras),
shaded-front/left/back .png, geometry.json, rigged.blend and check.json.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import rig_core as rc  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('--glb', type=Path, required=True)
p.add_argument('--joints', type=Path, required=True)
p.add_argument('--weights', type=Path, required=True)
p.add_argument('--pose', type=Path)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--rest', action='store_true', help='render the rigged model without the pose')
p.add_argument('--shade-width', type=int, default=1200)
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
a.out.mkdir(parents=True, exist_ok=True)
joints = rc.load_json(a.joints)
table = np.load(a.weights)
pose_file = rc.load_json(a.pose) if a.pose and not a.rest else {'pose': {}, 'root': [0, 0, 0]}

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(a.glb.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in meshes:                       # bake world transforms so everything is in world space
    m = o.matrix_world.copy()
    for v in o.data.vertices:
        v.co = m@v.co
    o.parent = None
    o.matrix_world = Matrix.Identity(4)
skin = max(meshes, key=lambda o: len(o.data.vertices))
others = [o for o in meshes if o is not skin]

# ---- armature
arm_data = bpy.data.armatures.new('akinza_rig')
rig = bpy.data.objects.new('akinza_rig', arm_data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
segs = rc.segments(joints)
for name, parent, _, _ in rc.BONES:
    eb = arm_data.edit_bones.new(name)
    head, tail = segs[name]
    if np.linalg.norm(tail-head) < 1e-3:
        tail = head+np.array([0, 0, .01])
    eb.head, eb.tail = Vector(head), Vector(tail)
for name, parent, _, _ in rc.BONES:
    if parent:
        arm_data.edit_bones[name].parent = arm_data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')


def skin_with_armature(obj):
    mod = obj.modifiers.new('Armature', 'ARMATURE')
    mod.object = rig
    mod.use_vertex_groups = True


# ---- skin weights from the table (quantized to 1/64 so each bone needs few calls)
idx, w = table['idx'].astype(int), table['w']
n = len(skin.data.vertices)
assert len(idx) == n, (len(idx), n)
for b, name in enumerate(rc.BONE_NAMES):
    sel_v, sel_w = [], []
    for k in range(idx.shape[1]):
        hit = np.where((idx[:, k] == b) & (w[:, k] > .004))[0]
        sel_v.append(hit)
        sel_w.append(w[hit, k])
    sel_v, sel_w = np.concatenate(sel_v), np.concatenate(sel_w)
    if not len(sel_v):
        continue
    group = skin.vertex_groups.new(name=name)
    level = np.clip(np.round(sel_w*64), 1, 64).astype(int)
    for q in np.unique(level):
        group.add([int(i) for i in sel_v[level == q]], float(q)/64, 'REPLACE')
skin_with_armature(skin)

# ---- claws and eyes: rigid on one bone each, chosen by name then by side
assignments = {}
for o in others:
    c = np.mean([tuple(v.co) for v in o.data.vertices], axis=0)
    side = 'L' if c[0] > 0 else 'R'
    nm = o.name.lower()
    if 'fore claw' in nm:
        bone = f'hand.{side}'
    elif 'hind claw' in nm:
        bone = f'foot.{side}'
    elif 'head' in nm or 'eye' in nm or 'nose' in nm or 'mouth' in nm:
        bone = 'head'
    else:
        dists = {bn: float(np.linalg.norm(c-(segs[bn][0]+segs[bn][1])/2)) for bn in rc.BONE_NAMES}
        bone = min(dists, key=dists.get)
    group = o.vertex_groups.new(name=bone)
    group.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    skin_with_armature(o)
    assignments[o.name] = bone

# ---- pose
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')
for name in rc.BONE_NAMES:
    pb = rig.pose.bones[name]
    pb.rotation_mode = 'QUATERNION'
    rx, ry, rz = pose_file['pose'].get(name, (0, 0, 0))
    Rw = Matrix(rc.euler_matrix(rx, ry, rz).tolist())
    B = arm_data.bones[name].matrix_local.to_3x3()
    pb.rotation_quaternion = (B.transposed()@Rw@B).to_quaternion()
root = Vector(pose_file.get('root', [0, 0, 0]))
pelvis = rig.pose.bones['pelvis']
pelvis.location = arm_data.bones['pelvis'].matrix_local.to_3x3().transposed()@root
bpy.ops.object.mode_set(mode='OBJECT')
bpy.context.view_layer.update()

# ---- check against the numpy skinning
dg = bpy.context.evaluated_depsgraph_get()
ev = skin.evaluated_get(dg).to_mesh()
got = np.empty(len(ev.vertices)*3, np.float32)
ev.vertices.foreach_get('co', got)
got = got.reshape(-1, 3)
rest = np.empty(n*3, np.float32)
skin.data.vertices.foreach_get('co', rest)
rest = rest.reshape(-1, 3).astype(np.float64)
T = rc.bone_transforms(joints, pose_file['pose'], root_translate=tuple(pose_file.get('root', [0, 0, 0])))
want = rc.skin_points(rest, idx, w, T)
err = np.linalg.norm(got-want, axis=1)
check = {'vertices': n, 'maxErrorVsNumpy': float(err.max()), 'meanErrorVsNumpy': float(err.mean()),
         'assignments': assignments}
print('skinning check', check['meanErrorVsNumpy'], check['maxErrorVsNumpy'])

# ---- renders: the quick_silhouette cameras
scene = bpy.context.scene
ORTHO_SCALE = 3.2094
CENTER = Vector((0.0, .175, -.0267))
angles = {'front': 0, 'left': 90, 'back': 180}
for o in scene.objects:
    if o.type == 'MESH':
        for poly in o.data.polygons:
            poly.use_smooth = True
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.resolution_percentage = 100
cameras = []


def shoot(kind, width):
    scene.render.resolution_x = width
    scene.render.resolution_y = round(width*2/3)
    sh = scene.display.shading
    if kind == 'mask':
        sh.light, sh.color_type, sh.single_color = 'FLAT', 'SINGLE', (.2, .2, .2)
    else:
        sh.light, sh.color_type = 'STUDIO', 'MATERIAL'
        sh.show_cavity = False
    for view, ang in angles.items():
        ar = math.radians(ang)
        bpy.ops.object.camera_add(location=CENTER+Vector((10*math.sin(ar), -10*math.cos(ar), 0)))
        cam = bpy.context.object
        cam.data.type = 'ORTHO'
        cam.data.ortho_scale = ORTHO_SCALE
        cam.rotation_euler = (CENTER-cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.camera = cam
        scene.render.filepath = str(a.out/(f'{view}.png' if kind == 'mask' else f'shaded-{view}.png'))
        bpy.ops.render.render(write_still=True)
        if kind == 'mask':
            cameras.append({'name': view, 'angle': ang, 'projection': 'orthographic',
                            'resolution': [scene.render.resolution_x, scene.render.resolution_y],
                            'orthoScale': ORTHO_SCALE, 'matrixWorld': [list(r) for r in cam.matrix_world]})
        bpy.data.objects.remove(cam)


shoot('mask', 900)
shoot('shaded', a.shade_width)
(a.out/'geometry.json').write_text(json.dumps({'scope': 'Posed rig masks, quick_silhouette cameras', 'cameras': cameras}, indent=1)+'\n')
(a.out/'check.json').write_text(json.dumps(check, indent=1)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(a.out/'rigged.blend'))
