"""Retarget a measured donor muzzle into an existing head without replacing it."""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import material, mesh_stats, sha

parser = argparse.ArgumentParser()
parser.add_argument('--base', type=Path, required=True)
parser.add_argument('--donor', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance_sha = snapshot(args.out, __file__, [args.base, args.donor])
bpy.ops.wm.open_mainfile(filepath=str(args.base.resolve()))
body = bpy.data.objects['cleaned_head_with_openings']
before = mesh_stats(body)


def tree_for(obj):
    return BVHTree.FromPolygons([obj.matrix_world @ v.co for v in obj.data.vertices],
                               [list(p.vertices) for p in obj.data.polygons])


def front(tree, x, z):
    hit, _, _, _ = tree.ray_cast(Vector((x, -2, z)), Vector((0, 1, 0)))
    if hit is None:
        raise ValueError(f'Front surface missed at {(x, z)}')
    return hit.y


def ease(t):
    t = max(0, min(1, t))
    return t*t*t*(10+t*(-15+6*t))


native_tree = tree_for(body)
existing = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(args.donor.resolve()))
imported = set(bpy.context.scene.objects) - existing
donor = max((o for o in imported if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
donor_tree = tree_for(donor)
donor_points = [donor.matrix_world @ v.co for v in donor.data.vertices]
source_nose = min((v for v in donor_points if abs(v.x) < .04 and -.4 < v.z < .1), key=lambda v: v.y).copy()
target_nose = min((v.co for v in body.data.vertices if abs(v.co.x) < .04 and -.20 < v.co.z < -.08), key=lambda v: v.y).copy()
scale = .60
translation = Vector((-source_nose.x*scale,
                      target_nose.y-source_nose.y*scale,
                      target_nose.z-source_nose.z*scale))


def donor_front(x, z):
    source_z = (z-translation.z)/scale
    source_x = x/scale
    # Symmetrize about the measured donor nose rather than the crop midpoint.
    y = (front(donor_tree, source_nose.x+source_x, source_z)
         + front(donor_tree, source_nose.x-source_x, source_z))/2
    return y*scale+translation.y


def support(x, z):
    lateral = ease((.205-abs(x))/.085)
    upper = ease((-.112-z)/.048)
    lower = ease((z+.280)/.060)
    nose = ease((.045-abs(x))/.015)*ease((z+.170)/.018)
    lower_center = ease((.055-abs(x))/.035)*ease((-.205-z)/.045)
    return lateral*upper*lower*(1-nose)*(1-lower_center)


changed = 0
maximum_displacement = 0
for vertex in body.data.vertices:
    x, y, z = vertex.co
    weight = support(x, z)
    if weight <= 0 or y > -.12:
        continue
    native_y = front(native_tree, x, z)
    if y > native_y+.006:
        continue
    displacement = weight*(donor_front(x, z)-native_y)
    vertex.co.y += displacement
    changed += 1
    maximum_displacement = max(maximum_displacement, abs(displacement))
body.data.update()

for obj in imported:
    bpy.data.objects.remove(obj, do_unlink=True)

# Fair the narrow attachment collar and residual scan folds while retaining
# the central crowns that provide the donor's useful rounded pad volumes.
group = body.vertex_groups.new(name='Native pad collar cleanup')
for vertex in body.data.vertices:
    x, y, z = vertex.co
    if y > -.18:
        continue
    collar = max(ease((abs(x)-.045)/.065), ease((-.205-z)/.040))
    weight = support(x, z)*collar
    if weight > 0:
        group.add([vertex.index], weight, 'REPLACE')
bpy.context.view_layer.objects.active = body
body.select_set(True)
modifier = body.modifiers.new('Native pad collar cleanup', 'SMOOTH')
modifier.factor = .6
modifier.iterations = 100
modifier.vertex_group = group.name
bpy.ops.object.modifier_apply(modifier=modifier.name)

# The crease follows the transplanted volume. It stays a separate capped mesh
# so this step does not cut an open cavity or add a thick lip to the surface.
for obj in list(bpy.context.scene.objects):
    if obj.name.startswith('closed_mouth_'):
        bpy.data.objects.remove(obj, do_unlink=True)
mouth_tree = tree_for(body)
mouth_mat = material('Transplanted closed mouth crease', .105)
paths = []
for side in [-1, 1]:
    paths.append([(side*.105*i/64, -.196-.024*math.sin(math.pi*i/64)-.006*i/64)
                  for i in range(65)])
paths.append([(0, -.151+(-.196+.151)*i/24) for i in range(25)])
for index, path in enumerate(paths):
    curve = bpy.data.curves.new('Native pad mouth path '+str(index), 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = .0013
    curve.bevel_resolution = 3
    curve.use_fill_caps = True
    spline = curve.splines.new('POLY')
    spline.points.add(len(path)-1)
    for point, (x, z) in zip(spline.points, path):
        point.co = (x, front(mouth_tree, x, z)-.0003, z, 1)
    mouth = bpy.data.objects.new('closed_mouth_'+str(index), curve)
    bpy.context.collection.objects.link(mouth)
    mouth.data.materials.append(mouth_mat)

bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = body
bpy.ops.object.convert(target='MESH')
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        if obj.name.startswith('closed_mouth_'):
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
            bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
            bm.to_mesh(obj.data)
            bm.free()
        for poly in obj.data.polygons:
            poly.use_smooth = True
body.data.validate(clean_customdata=True)
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'transplant.json').write_text(json.dumps({
    'approval': None,
    'stageProvenanceSha256': provenance_sha,
    'baseSha256': sha(args.base),
    'donorSha256': sha(args.donor),
    'sourceNose': list(source_nose),
    'targetNose': list(target_nose),
    'scale': scale,
    'translation': list(translation),
    'support': {'maximumAbsX': .205, 'fullLateralWeightInside': .120,
                'upperZ': -.112, 'fullUpperWeightBelow': -.160,
                'lowerZ': -.280, 'fullLowerWeightAbove': -.220,
                'preserveNativeNose': True,
                'centralLowerBumpExcludedBelow': [-.205, -.250]},
    'collarFairing': {'iterations': 100, 'factor': .6, 'retainsCentralPadCrowns': True},
    'changedVertices': changed,
    'maximumDisplacement': maximum_displacement,
    'before': before,
    'after': mesh_stats(body),
    'objects': {o.name: mesh_stats(o) for o in bpy.context.scene.objects if o.type == 'MESH'},
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}
}, indent=2)+'\n')
