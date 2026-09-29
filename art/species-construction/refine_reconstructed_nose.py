"""Add a closed rounded nose while preserving the reconstructed facial skin."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import material, mesh_stats, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--relax-native-relief', action='store_true')
# plane: the historical 0127 cap built on a fitted plane and pushed forward
# for clearance, which projected a wedge from the convex muzzle in profile.
# conformal: a dome over a smooth fit of the actual skin, seated with a buried back.
parser.add_argument('--method', choices=['plane', 'conformal'], default='plane')
parser.add_argument('--dome-height', type=float, default=.009)
parser.add_argument('--rim-height', type=float, default=.003)
parser.add_argument('--buried-depth', type=float, default=.008)
# Ease the forward skin knob under the nose back by up to this depth before the
# conformal pad is fitted; the support stays above the side mouth lines.
parser.add_argument('--recess-muzzle', type=float, default=0.0)
# Raise the triangle's lower point so it stops wrapping under the muzzle tip.
parser.add_argument('--lower-point-z', type=float, default=-.153)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene])
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
if any(obj.name == 'nose_finish' for obj in bpy.context.scene.objects):
    raise ValueError('Source already contains a finished nose; do not stack finish stages')
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'),
           key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Input head for nose finish')
before = mesh_stats(head)
skin_coordinates = np.empty(len(head.data.vertices)*3, dtype=np.float32)
head.data.vertices.foreach_get('co', skin_coordinates)
skin_hash = hashlib.sha256(skin_coordinates.tobytes()).hexdigest()
outside_indices = []
relief_record = None
if args.relax_native_relief:
    group = head.vertex_groups.new(name='Old nasal relief only')
    for vertex in head.data.vertices:
        x,y,z = vertex.co
        radius = math.hypot(x/.053,(z+.130)/.049)
        if radius < 1 and y < -.29:
            weight = (1-radius*radius)**3
            group.add([vertex.index],weight,'REPLACE')
        else:
            outside_indices.append(vertex.index)
    before_outside = skin_coordinates.reshape(-1,3)[outside_indices].copy()
    bpy.context.view_layer.objects.active = head
    modifier = head.modifiers.new('Relax old nasal relief','SMOOTH')
    modifier.vertex_group = group.name
    modifier.factor = .65
    modifier.iterations = 650
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    relaxed = np.empty_like(skin_coordinates)
    head.data.vertices.foreach_get('co',relaxed)
    if not np.array_equal(before_outside,relaxed.reshape(-1,3)[outside_indices]):
        raise ValueError('Nasal relief changed geometry outside its bounded mask')
    relief_record = {'centerXZ':[0,-.130],'radiiXZ':[.053,.049],
                     'outsideVerticesUnchanged':len(outside_indices),
                     'maximumDisplacement':float(np.max(np.linalg.norm(
                         (relaxed-skin_coordinates).reshape(-1,3),axis=1)))}
recess_record = None
if args.recess_muzzle:
    moved, largest = 0, 0.0
    for vertex in head.data.vertices:
        x, y, z = vertex.co
        radius2 = (x/.060)**2+((z+.128)/.040)**2
        if radius2 < 1 and y < -.29:
            shift = args.recess_muzzle*(1-radius2)**2
            vertex.co.y += shift
            moved += 1
            largest = max(largest, shift)
    head.data.update()
    recess_record = {'centerXZ': [0, -.128], 'radiiXZ': [.060, .040], 'maximumDepth': args.recess_muzzle,
                     'movedVertices': moved, 'largestShift': largest}
nose_indices = {i for i, mat in enumerate(head.data.materials) if 'nose' in mat.name.lower()}
if not nose_indices:
    raise ValueError('Source head has no identified nose material')
clay_index = next(i for i in range(len(head.data.materials)) if i not in nose_indices)
tree = BVHTree.FromPolygons([v.co for v in head.data.vertices],
                            [list(p.vertices) for p in head.data.polygons])
if args.relax_native_relief:
    old_philtrum = bpy.data.objects.get('closed_mouth_2')
    if old_philtrum is None:
        raise ValueError('Missing central mouth crease for nasal-relief correction')
    crease_material = old_philtrum.data.materials[0]
    bpy.data.objects.remove(old_philtrum,do_unlink=True)
    curve = bpy.data.curves.new('Reseated central mouth crease','CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = .0013
    curve.bevel_resolution = 3
    curve.use_fill_caps = True
    spline = curve.splines.new('POLY')
    spline.points.add(24)
    for index,point in enumerate(spline.points):
        z = -.151+(-.196+.151)*index/24
        hit,_,_,_ = tree.ray_cast(Vector((0,-1,z)),Vector((0,1,0)))
        if hit is None:
            raise ValueError('Central mouth crease missed corrected skin')
        point.co = (0,hit.y-.0003,z,1)
    crease = bpy.data.objects.new('closed_mouth_2',curve)
    bpy.context.collection.objects.link(crease)
    crease.data.materials.append(crease_material)
    bpy.ops.object.select_all(action='DESELECT')
    crease.select_set(True)
    bpy.context.view_layer.objects.active = crease
    bpy.ops.object.convert(target='MESH')
    bm = bmesh.new();bm.from_mesh(crease.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(crease.data);bm.free()
    require_single_closed_mesh(crease,args.out,'Reseated central mouth crease')

# Fit the mounting plane from skin outside the old narrow nasal relief.
center_z = -.129
samples, values = [], []
sample_xz = [(-.055,-.11),(.055,-.11),(-.055,-.15),(.055,-.15),(0,-.100),(0,-.162)]
for x, z in sample_xz:
    hit, _, _, _ = tree.ray_cast(Vector((x,-1,z)), Vector((0,1,0)))
    if hit is None:
        raise ValueError('Nose mounting-plane sample missed the head')
    samples.append([1, z-center_z])
    values.append(hit.y)
plane = np.linalg.lstsq(np.array(samples), np.array(values), rcond=None)[0]

# Cubic boundary gives a broad soft top and a short rounded lower point.
low = args.lower_point_z
curves = [
    [(-.040,-.109),(-.018,-.106),(.018,-.106),(.040,-.109)],
    [(.040,-.109),(.063,-.109),(.035,low+.010),(.006,low)],
    [(.006,low),(-.001,low-.0025),(.001,low-.0025),(-.006,low)],
    [(-.006,low),(-.035,low+.010),(-.063,-.109),(-.040,-.109)],
]
boundary = []
for controls in curves:
    a,b,c,d = (np.array(p) for p in controls)
    for j in range(32):
        t = j/32
        boundary.append((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d)
segments, rings = len(boundary), 48
conformal_record = None


def skin_hit(x, z):
    hit, normal, _, _ = tree.ray_cast(Vector((x,-1,z)), Vector((0,1,0)))
    if hit is None:
        raise ValueError(f'Nose footprint sample missed the skin at {(x, z)}')
    return hit.y, normal


def conformal_vertices():
    """Dome over a quadratic fit of the actual skin; the back hemisphere is buried."""
    xs = [x for x, _ in boundary]
    zs = [z for _, z in boundary]
    rows, depths, normals = [], [], []
    for x in np.linspace(min(xs)*1.1, max(xs)*1.1, 23):
        for z in np.linspace(min(zs)-.004, max(zs)+.004, 19):
            y, normal = skin_hit(float(x), float(z))
            dz = z-center_z
            rows.append([1, x, dz, x*x, x*dz, dz*dz])
            depths.append(y)
            normals.append(normal)
    rows, depths = np.array(rows), np.array(depths)
    coef = np.linalg.lstsq(rows, depths, rcond=None)[0]
    residual = depths-rows@coef
    mean_normal = sum(normals, Vector()).normalized()
    if mean_normal.y > -.5:
        raise ValueError('Nose footprint normal does not face forward')

    def fitted(x, z):
        dz = z-center_z
        return float(coef@np.array([1, x, dz, x*x, x*dz, dz*dz]))

    used_actual = 0
    out = []

    def point(x, z, angle):
        nonlocal used_actual
        actual, _ = skin_hit(x, z)
        base = fitted(x, z)
        if actual < base:
            used_actual += 1
            base = actual
        if angle <= math.pi/2:
            offset = args.rim_height+args.dome_height*math.cos(angle)
        else:
            offset = args.rim_height+(args.rim_height+args.buried_depth)*math.cos(angle)
        p = Vector((x, base, z))+mean_normal*offset
        return (float(p.x), float(p.y), float(p.z))

    out.append(point(0.0, center_z, 0.0))
    for j in range(1, rings):
        angle = math.pi*j/rings
        radius = math.sin(angle)
        for x, z in boundary:
            out.append(point(float(x*radius), float(center_z+(z-center_z)*radius), angle))
    out.append(point(0.0, center_z, math.pi))
    front_clearance = []
    for index in [0]+list(range(1, 1+(rings//2)*segments)):
        x, y, z = out[index]
        actual, _ = skin_hit(x, z)
        front_clearance.append(actual-y)
    back_depth = []
    for index in range(1+(rings//2+2)*segments, len(out)):
        x, y, z = out[index]
        actual, _ = skin_hit(x, z)
        back_depth.append(y-actual)
    record = {'fitResidualRange': [float(residual.min()), float(residual.max())],
              'fitSamples': len(depths), 'meanNormal': list(mean_normal),
              'samplesUsingActualSkin': used_actual,
              'domeHeight': args.dome_height, 'rimHeight': args.rim_height,
              'buriedDepth': args.buried_depth,
              'minimumFrontClearance': min(front_clearance),
              'minimumBackBurial': min(back_depth)}
    if record['minimumFrontClearance'] < .5*min(.0015, args.rim_height):
        raise ValueError('Conformal nose front does not clear the skin')
    return out, record


if args.method == 'plane':
    vertices = [(0, float(plane[0]-.026), center_z)]
    for j in range(1, rings):
        angle = math.pi*j/rings
        radius = math.sin(angle)
        for x, z in boundary:
            px, pz = float(x*radius), float(center_z+(z-center_z)*radius)
            py = float(plane[0]+plane[1]*(pz-center_z)-.006-.020*math.cos(angle))
            vertices.append((px,py,pz))
    back_index = len(vertices)
    vertices.append((0, float(plane[0]+.014), center_z))
    front_indices = [0]+list(range(1, 1+(rings//2)*segments))
    clearances = []
    for index in front_indices:
        x,y,z = vertices[index]
        hit, _, _, _ = tree.ray_cast(Vector((x,-1,z)), Vector((0,1,0)))
        if hit is None:
            raise ValueError('Finished nose front missed underlying skin')
        clearances.append(hit.y-y)
    center_shift = max(.003,.002-clearances[0])
    def radial_weight(index):
        if index in [0,back_index]:
            return 0.0
        ring = (index-1)//segments+1
        radius = math.sin(math.pi*ring/rings)
        return (1-math.exp(-3*radius*radius))/(1-math.exp(-3))
    outer_shift = max([0.0]+[(.002-clearance-center_shift)/radial_weight(index)
                              for index,clearance in zip(front_indices,clearances) if index])
    forward_clearance_shift = center_shift+outer_shift
    # Fit clearance across the cap. A single worst-point translation unnecessarily
    # projects the nose center when the limiting relief lies near its boundary.
    front_shifts = [center_shift+outer_shift*radial_weight(index) for index in front_indices]
    for index, (x,y,z) in enumerate(vertices):
        if index == back_index:
            weight = 0
        elif index == 0:
            weight = 1
        else:
            ring = (index-1)//segments+1
            angle = math.pi*ring/rings
            weight = 1 if ring <= rings//2 else math.sin(angle)**2
        shift = center_shift+outer_shift*radial_weight(index)
        vertices[index] = (x,y-shift*weight,z)
    clearance_record = {'sampleCount':len(clearances),'minimumBefore':min(clearances),
                        'maximumFrontShift':forward_clearance_shift,'centerShift':center_shift,
                        'mode':'Smooth radial clearance with buried rear taper',
                        'minimumAfter':min(a+b for a,b in zip(clearances,front_shifts))}
else:
    vertices, conformal_record = conformal_vertices()
    back_index = len(vertices)-1
    clearance_record = None
faces = []
for i in range(segments):
    k = (i+1) % segments
    faces.append((0,1+k,1+i))
    for j in range(rings-2):
        a,b = 1+j*segments, 1+(j+1)*segments
        faces.append((a+i,a+k,b+k,b+i))
    a = 1+(rings-2)*segments
    faces.append((a+i,a+k,back_index))
mesh = bpy.data.meshes.new('Smooth rounded triangular nose')
mesh.from_pydata(vertices, [], faces)
mesh.update()
nose = bpy.data.objects.new('nose_finish',mesh)
bpy.context.collection.objects.link(nose)
bm = bmesh.new(); bm.from_mesh(mesh)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh); bm.free()
nose_material = material('Rounded animal nose', .045)
nose_material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .32
nose.data.materials.append(nose_material)
for poly in nose.data.polygons:
    poly.use_smooth = True
for poly in head.data.polygons:
    if poly.material_index in nose_indices:
        poly.material_index = clay_index
require_single_closed_mesh(nose, args.out, 'Finished separate nose')
require_single_closed_mesh(head, args.out, 'Closed facial skin after nose finish')
head.data.vertices.foreach_get('co', skin_coordinates)
after_skin_hash = hashlib.sha256(skin_coordinates.tobytes()).hexdigest()
if not args.relax_native_relief and not args.recess_muzzle and after_skin_hash != skin_hash:
    raise ValueError('Nose finish unexpectedly changed facial skin coordinates')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'nose-refinement.json').write_text(json.dumps({
    'approval':None, 'stageProvenanceSha256':provenance,
    'scope':('Separate rounded nose with bounded native relief relaxation and reseated central mouth crease; surrounding skin and other features preserved'
             if args.relax_native_relief else 'Separate rounded nose, preserving skin, eyes, muzzle pads and mouth geometry'),
    'skinBefore':before, 'skinAfter':mesh_stats(head), 'nose':mesh_stats(nose),
    'skinVertexSha256Before':skin_hash, 'skinVertexSha256After':after_skin_hash,
    'nativeReliefRelaxation':relief_record, 'muzzleRecess':recess_record,
    'mountingPlane':plane.tolist(), 'mountingSamples':{'xz':sample_xz,'depths':values},
    'boundaryControlsXZ':curves,
    'frontCapDepth':.020 if args.method == 'plane' else None,
    'mountingOffset':-.006 if args.method == 'plane' else None,
    'method':args.method,
    'nativeSkinClearance':clearance_record,
    'conformalSeat':conformal_record,
    'noseBounds':[[min(v.co[i] for v in nose.data.vertices),max(v.co[i] for v in nose.data.vertices)] for i in range(3)],
    'outputs':{p.name:sha(p) for p in args.out.iterdir() if p.suffix in ['.glb','.blend']},
},indent=2)+'\n')
