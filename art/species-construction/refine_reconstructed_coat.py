"""Reduce inferred rear-scalp ridges without changing the face or ear fringe."""
import argparse
import json
from pathlib import Path
import sys
import numpy as np
import bpy
import bmesh
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import sha, require_single_closed_mesh

parser = argparse.ArgumentParser()
parser.add_argument('--mesh', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.mesh])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.mesh.resolve()))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for obj in objects:
    transform = obj.matrix_world.copy()
    for vertex in obj.data.vertices:
        vertex.co = transform @ vertex.co
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
    bm.to_mesh(obj.data)
    bm.free()
skin = max(objects, key=lambda o: len(o.data.vertices))
before = require_single_closed_mesh(skin, args.out, 'Imported head skin')


def ease(value, lo, hi):
    t = max(0, min(1, (value-lo)/(hi-lo)))
    return t*t*(3-2*t)


original = [v.co.copy() for v in skin.data.vertices]
original_bounds = [[min(v[i] for v in original) for i in range(3)],
                   [max(v[i] for v in original) for i in range(3)]]
# Fit one low-order posterior envelope to a broad measured volume. The fit
# cannot reproduce repeated lock rows, unlike local smoothing of those rows.
target = skin.copy()
target.data = skin.data.copy()
bpy.context.collection.objects.link(target)
bpy.ops.object.select_all(action='DESELECT')
target.select_set(True)
bpy.context.view_layer.objects.active = target
target.data.remesh_voxel_size = .025
bpy.ops.object.voxel_remesh()
mod = target.modifiers.new('Measured broad scalp substrate', 'SMOOTH')
mod.iterations = 55
mod.factor = .65
bpy.ops.object.modifier_apply(modifier=mod.name)
target_tree = BVHTree.FromPolygons([v.co for v in target.data.vertices],
                                  [list(p.vertices) for p in target.data.polygons])


def basis(x, z):
    u, v = x/.64, z/.40
    return np.array([1, v, v*v, v**3, v**4, u*u, u*u*v, u*u*v*v, u**4])


samples, depths = [], []
for z in np.linspace(-.25, .42, 55):
    for x in np.linspace(0, .64, 45):
        paired = []
        for side in [-1, 1]:
            hit, _, _, _ = target_tree.ray_cast(Vector((float(side*x), 2, float(z))), Vector((0, -1, 0)))
            if hit is not None and hit.y > .015:
                paired.append(hit.y)
        if len(paired) == 2:
            samples.append(basis(x, z))
            depths.append(sum(paired)/2)
fit_matrix = np.array(samples)
coefficients = np.linalg.lstsq(fit_matrix, np.array(depths), rcond=None)[0]
fit_rmse = float(np.sqrt(np.mean((fit_matrix @ coefficients-np.array(depths))**2)))
maximum_displacement = 0
for vertex in skin.data.vertices:
    original_point = vertex.co.copy()
    x, y, z = original_point
    root_weight = (ease(y, .015, .075)*ease(.60-abs(x), 0, .17)
                   *ease(z+.48, 0, .10)*ease(.50-z, 0, .12))
    if root_weight > 0:
        nearest, _, _, _ = target_tree.find_nearest(original_point)
        vertex.co = original_point.lerp(nearest, root_weight*.97)
    x, y, z = vertex.co
    cranial_weight = (ease(y, .06, .13)*ease(.38-abs(x), 0, .12)
                      *ease(z+.30, 0, .10)*ease(.43-z, 0, .10))
    if cranial_weight > 0:
        envelope = float(basis(x, z) @ coefficients)
        vertex.co.y += (envelope-y)*cranial_weight*.95
    maximum_displacement = max(maximum_displacement, (vertex.co-original_point).length)
bpy.data.objects.remove(target, do_unlink=True)
bpy.context.view_layer.objects.active = skin
material_tree = BVHTree.FromPolygons([v.co for v in skin.data.vertices],
                                    [list(p.vertices) for p in skin.data.polygons])
material_indices = [p.material_index for p in skin.data.polygons]
# Projection can fold existing lock undersides onto the new envelope. Resolve
# that actual volume before judging its normals or presenting it as a scalp.
bpy.ops.object.select_all(action='DESELECT')
skin.select_set(True)
bpy.context.view_layer.objects.active = skin
skin.data.remesh_voxel_size = .0025
bpy.ops.object.voxel_remesh()
group = skin.vertex_groups.new(name='Posterior resampling cleanup')
for vertex in skin.data.vertices:
    x,y,z = vertex.co
    weight = ease(y,.025,.08)*ease(.58-abs(x),0,.14)*ease(z+.43,0,.10)*ease(.48-z,0,.10)
    if weight > 0:
        group.add([vertex.index],weight,'REPLACE')
mod = skin.modifiers.new('Blend resolved rear envelope','SMOOTH')
mod.vertex_group = group.name
mod.iterations = 35
mod.factor = .65
bpy.ops.object.modifier_apply(modifier=mod.name)
skin.data.update()
for polygon in skin.data.polygons:
    _,_,face_index,distance = material_tree.find_nearest(polygon.center)
    polygon.material_index = material_indices[face_index] if face_index is not None and distance < .0075 else 0
# Remove only measured sub-voxel debris produced by the volume resampling.
bm = bmesh.new()
bm.from_mesh(skin.data)
unseen = set(bm.verts)
components = []
while unseen:
    first = unseen.pop()
    component = {first}
    stack = [first]
    while stack:
        vertex = stack.pop()
        for edge in vertex.link_edges:
            other = edge.other_vert(vertex)
            if other in unseen:
                unseen.remove(other)
                component.add(other)
                stack.append(other)
    components.append(component)
largest = max(components, key=len)
debris = []
for component in components:
    if component is largest:
        continue
    bounds = [[min(v.co[i] for v in component) for i in range(3)],
              [max(v.co[i] for v in component) for i in range(3)]]
    extent = max(bounds[1][i]-bounds[0][i] for i in range(3))
    volume = None
    if len(component) <= 32 and extent < .012:
        small = bmesh.new()
        mapping = {v: small.verts.new(v.co) for v in component}
        for face in {f for v in component for f in v.link_faces}:
            small.faces.new([mapping[v] for v in face.verts])
        volume = abs(small.calc_volume())
        small.free()
    if volume is not None and volume < .0025**3:
        debris.append({'vertices': len(component), 'bounds': bounds, 'volume': volume})
        bmesh.ops.delete(bm, geom=list(component), context='VERTS')
bm.to_mesh(skin.data)
bm.free()
final_tree = BVHTree.FromPolygons([v.co for v in skin.data.vertices],
                                 [list(p.vertices) for p in skin.data.polygons])
retained_distances = []
for point in original[::100]:
    if point.y < .015 or abs(point.x) > .72 or point.z > .48:
        _, _, _, distance = final_tree.find_nearest(point)
        retained_distances.append(distance)
after = require_single_closed_mesh(skin, args.out, 'Smoothed rear scalp')
for polygon in skin.data.polygons:
    polygon.use_smooth = True
bpy.ops.mesh.customdata_custom_splitnormals_clear()
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'coat-refinement.json').write_text(json.dumps({
    'approval': None, 'scope': 'Internal rear-scalp ridge test; no new surface texture',
    'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.mesh),
    'before': before, 'after': after,
    'target': {'voxelSize': .025, 'smoothIterations': 55},
    'posteriorEnvelope': {'basis': ['1','z','z2','z3','z4','x2','x2z','x2z2','x4'],
                          'normalizationXZ': [.64,.40], 'coefficients': coefficients.tolist(),
                          'sampleCount': len(depths), 'fitRmse': fit_rmse,
                          'maximumDisplacement': maximum_displacement,
                          'cranialMaximumAbsX': .38, 'rootMaximumAbsX': .60,
                          'rootMethod': 'Nearest broad volume, not planar extrapolation'},
    'finalResampling': {'voxelSize': .0025, 'posteriorSmoothIterations': 35},
    'removedSubVoxelDebris': debris,
    'retainedSurfaceDeviation': {'sampleCount': len(retained_distances),
                                 'maximum': max(retained_distances),
                                 'mean': sum(retained_distances)/len(retained_distances)},
    'originalBounds': original_bounds,
    'finalBounds': [[min(v.co[i] for v in skin.data.vertices) for i in range(3)],
                    [max(v.co[i] for v in skin.data.vertices) for i in range(3)]],
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}
}, indent=2)+'\n')
