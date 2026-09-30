"""Extract a torso/limb base and rebuild excluded anatomy for internal review."""
import argparse
import json
import math
from pathlib import Path
import shutil
import sys
import bpy
import bmesh

sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import material, mesh_stats, sha, sphere
from blender_probe import tube

parser = argparse.ArgumentParser()
parser.add_argument('--mesh', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--omit-tails', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
shutil.copyfile(__file__, args.out/'refine_source.py')
provenance_sha = snapshot(args.out, __file__, [args.mesh])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.mesh.resolve()))
body = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = body
body.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for v in body.data.vertices:
    v.co.x += .14
    v.co.y += .35
bm = bmesh.new()
bm.from_mesh(body.data)
for origin, normal, inner, outer in [((0, 0, 0), (1, 0, 0), False, True),
                                     ((0, .17, 0), (0, 1, 0), False, True),
                                     ((0, 0, .46), (0, 0, 1), False, True),
                                     ((0, 0, -.974), (0, 0, 1), True, False)]:
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                          dist=.000001, plane_co=origin, plane_no=normal,
                          clear_inner=inner, clear_outer=outer)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.x < -.395 and -.43 < v.co.z < -.11], context='VERTS')
for v in bm.verts:
    if abs(v.co.x) < .00001:
        v.co.x = 0
bm.to_mesh(body.data)
bm.free()
mirror = body.modifiers.new('Symmetric torso and limb proposal', 'MIRROR')
mirror.merge_threshold = .00001
bpy.ops.object.modifier_apply(modifier=mirror.name)
bm = bmesh.new()
bm.from_mesh(body.data)
bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(body.data)
bm.free()


def ramp(value, a, b):
    return max(0, min(1, (value-a)/(b-a)))


def smooth_region(name, weight, iterations):
    group = body.vertex_groups.new(name=name)
    for v in body.data.vertices:
        w = weight(*v.co)
        if w > 0:
            group.add([v.index], min(1, w), 'REPLACE')
    mod = body.modifiers.new(name, 'SMOOTH')
    mod.factor = .7
    mod.iterations = iterations
    mod.vertex_group = group.name
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier=mod.name)


smooth_region('Remove reconstructed chest pendants',
              lambda x, y, z: ramp(-y, .04, .10)*ramp(.24-abs(x), 0, .06)
              *ramp(z-.06, 0, .08)*ramp(.43-z, 0, .07), 180)
smooth_region('Reduce paired back grooves',
              lambda x, y, z: ramp(y, 0, .08)*ramp(.27-abs(x), 0, .07)
              *ramp(z+.30, 0, .07)*ramp(.43-z, 0, .10), 120)
smooth_region('Remove scan-scale limb decoration',
              lambda x, y, z: ramp(abs(x), .08, .2)*ramp(.44-abs(x), 0, .05)
              *ramp(.40-z, 0, .07)*ramp(z+.93, 0, .08), 65)
for v in body.data.vertices:
    x, y, z = v.co
    paired = sum(math.exp(-((x-s*.10)/.08)**2-((z-.23)/.10)**2) for s in [-1, 1])
    v.co.y += .065*paired*ramp(-y, .02, .10)
    if -.43 < z < -.225:
        weight = ramp(.105-abs(x), 0, .05)
        v.co.z = z*(1-weight)-.225*weight
pieces = [body]
claws = []
for side in [-1, 1]:
    wrist = tube('carpal_transition_'+str(side), [
        [side*.400, -.045, -.015, .030, .029],
        [side*.440, -.087, -.090, .051, .050],
        [side*.461, -.105, -.130, .056, .053],
        [side*.479, -.120, -.205, .065, .046]])
    bpy.context.view_layer.objects.active = wrist
    sub = wrist.modifiers.new('Smooth sweep before fusion', 'SUBSURF')
    sub.levels = 2
    bpy.ops.object.modifier_apply(modifier=sub.name)
    pieces.append(wrist)
    pieces.append(sphere({'id': 'animal_forepaw_'+str(side), 'center': [side*.479, -.120, -.210], 'scale': [.066, .053, .074]}))
    for i in range(4):
        dx = (i-1.5)*.029
        z = -.255+.006*abs(i-1.5)
        pieces.append(sphere({'id': f'fore_digit_{side}_{i}', 'center': [side*.479+dx, -.144, z], 'scale': [.019, .029, .035]}))
        claws.append({'id': f'fore_claw_{side}_{i}', 'center': [side*.479+dx, -.154, z-.026], 'scale': [.009, .012, .020]})

tails = [
    [[0, .085, -.100, .054, .055], [.07, .15, -.080, .078, .080], [.23, .24, .045, .110, .115], [.44, .32, .145, .108, .114], [.62, .35, .120, .060, .065], [.70, .37, .075, .001, .001]],
    [[0, .09, -.128, .058, .058], [.11, .18, -.13, .085, .087], [.30, .29, -.155, .125, .132], [.53, .36, -.19, .120, .125], [.68, .40, -.260, .061, .065], [.73, .42, -.33, .001, .001]],
    [[0, .085, -.155, .055, .058], [.075, .17, -.20, .078, .080], [.21, .28, -.345, .113, .120], [.40, .37, -.480, .103, .112], [.52, .42, -.59, .055, .058], [.53, .44, -.67, .001, .001]],
]
for name, controls in zip(['upper', 'middle', 'lower'], tails):
    if args.omit_tails:
        continue
    for row in controls:
        row[2] += .07
    # The existing sweep's minimum radius is .01, so author at 10x and scale back.
    obj = tube('body_level_tail_'+name, [[value*10 for value in row] for row in controls])
    for v in obj.data.vertices:
        v.co /= 10
    bpy.context.view_layer.objects.active = obj
    sub = obj.modifiers.new('Smooth rounded tail cross-sections', 'SUBSURF')
    sub.levels = 2
    bpy.ops.object.modifier_apply(modifier=sub.name)
    pieces.append(obj)
bpy.ops.object.select_all(action='DESELECT')
for obj in pieces:
    obj.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.data.remesh_voxel_size = .0035
bpy.ops.object.voxel_remesh()
smooth = body.modifiers.new('Blend retained and rebuilt volumes', 'SMOOTH')
smooth.factor = .5
smooth.iterations = 12
bpy.ops.object.modifier_apply(modifier=smooth.name)
smooth_region('Fuse paw and pelvis transitions',
              lambda x, y, z: max(ramp(abs(x), .39, .44)*ramp(z+.33, 0, .05)*ramp(-.08-z, 0, .05),
                                   ramp(y, -.03, .09)*ramp(.20-abs(x), 0, .07)*ramp(z+.39, 0, .1)*ramp(.08-z, 0, .07)), 30)
clay = material('Construction clay', .38)
claw_mat = material('Short animal claws', .10)
body.data.materials.clear()
body.data.materials.append(clay)
for poly in body.data.polygons:
    poly.use_smooth = True
for item in claws:
    sphere(item, claw_mat)
body.name = 'reconciled_torso_limbs_paws_tails'
bpy.context.view_layer.objects.active = body
bpy.ops.mesh.customdata_custom_splitnormals_clear()
body.data.validate(clean_customdata=True)
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'body.blend'))
(args.out/'refinement.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance_sha, 'sourceSha256': sha(args.mesh), 'scriptSha256': sha(args.out/'refine_source.py'),
    'sourceTransform': {'translation': [.14, .35, 0]},
    'changes': ['Excluded original head', 'Retained negative-X half and mirrored it',
                'Removed inherited tail and extra stalk', 'Rebuilt three full body-level tails',
                'Removed human hands and rebuilt compact forepaws', 'Reduced chest and rear contour artifacts'],
    'tailControls': [] if args.omit_tails else tails, 'tailsOmitted': args.omit_tails,
    'body': mesh_stats(body),
    'unresolved': ['Whole-body comparison', 'Straight shin and ankle articulation', 'Paw construction and contact',
                   'Likeness of new tail volume and centered root', 'Chest and posterior continuity', 'Head integration'],
    'outputs': {f.name: sha(f) for f in args.out.iterdir() if f.suffix in ['.glb', '.blend']}
}, indent=2)+'\n')
