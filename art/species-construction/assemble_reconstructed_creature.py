"""Join corrected construction studies and retain separate ocular/claw objects."""
import argparse
import json
import math
from pathlib import Path
import shutil
import sys
import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import material, mesh_stats, sha, sphere, require_single_closed_mesh, remove_voxel_specks

parser = argparse.ArgumentParser()
parser.add_argument('--body', type=Path, required=True)
parser.add_argument('--head', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--tail-record', type=Path)
parser.add_argument('--head-scale', type=float, default=.60)
parser.add_argument('--jaw-anchor-z', type=float, default=.538)
parser.add_argument('--head-depth-offset', type=float, default=-.045)
# Where the body is cut for the neck bridge. loop_tools raises it with the jaw anchor when a body was
# retargeted with a different neck length (retarget.json headShiftZ).
parser.add_argument('--body-trim', type=float, default=.425)
# Largest removable remesh flake above the neck, in voxels. Removed pieces are
# recorded with their bounds; anything larger still fails the closed-solid gate.
parser.add_argument('--fragment-voxels', type=float, default=4)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
shutil.copyfile(__file__, args.out/'assembly_source.py')
provenance_sha = snapshot(args.out, __file__, [args.body,args.head]+([args.tail_record] if args.tail_record else []))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def load(path, label, scale=1, offset=(0, 0, 0)):
    prior = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path.resolve()))
    objects = [o for o in bpy.data.objects if o not in prior and o.type == 'MESH']
    for obj in objects:
        transform = obj.matrix_world.copy()
        for v in obj.data.vertices:
            v.co = (transform @ v.co)*scale+Vector(offset)
        obj.parent = None
        obj.matrix_world = Matrix.Identity(4)
        obj.name = label+'_'+obj.name
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
        bm.to_mesh(obj.data)
        bm.free()
    return max(objects, key=lambda o: len(o.data.vertices)), objects


body, body_objects = load(args.body, 'body')
require_single_closed_mesh(body, args.out, 'Imported body after seam welding')
head_offset = (0, args.head_depth_offset, args.jaw_anchor_z+.27*args.head_scale)
head, head_objects = load(args.head, 'head', args.head_scale, head_offset)
require_single_closed_mesh(head, args.out, 'Imported head after seam welding')
head_materials = list(head.data.materials)
head_material_indices = [p.material_index for p in head.data.polygons]
head_surface = BVHTree.FromPolygons([v.co for v in head.data.vertices],
                                   [list(p.vertices) for p in head.data.polygons])
nose_material_indices = {i for i, mat in enumerate(head_materials) if 'nose' in mat.name.lower()}
# A head may carry a pale inner-ear coat (author_fan_front_spec_field.py); it is transferred like the nose material.
pale_material_indices = {i for i, mat in enumerate(head_materials) if 'pale inner-ear' in mat.name.lower()}
separate_noses = [obj.name for obj in head_objects if obj != head
                  and any('nose' in mat.name.lower() for mat in obj.data.materials)]
if not nose_material_indices and not separate_noses:
    raise ValueError('Imported head does not identify its nose material')


def horizontal_section(obj, height, segments=128):
    """Sample the actual closed neck outline in a horizontal cutting plane."""
    vertices = np.empty(len(obj.data.vertices)*3, dtype=np.float32)
    obj.data.vertices.foreach_get('co', vertices)
    vertices = vertices.reshape(-1, 3)
    edges = np.empty(len(obj.data.edges)*2, dtype=np.int32)
    obj.data.edges.foreach_get('vertices', edges)
    edges = edges.reshape(-1, 2)
    a, b = vertices[edges[:, 0]], vertices[edges[:, 1]]
    mask = ((a[:, 2] < height) & (b[:, 2] >= height)) | ((b[:, 2] < height) & (a[:, 2] >= height))
    a, b = a[mask], b[mask]
    if len(a) < 32:
        raise ValueError(f'Insufficient native neck section at z={height}')
    points = a+(b-a)*((height-a[:, 2])/(b[:, 2]-a[:, 2]))[:, None]
    center = (points[:, :2].min(axis=0)+points[:, :2].max(axis=0))/2
    relative = points[:, :2]-center
    angles = np.arctan2(relative[:, 1], relative[:, 0])
    radii = np.linalg.norm(relative, axis=1)
    order = np.argsort(angles)
    samples = np.linspace(-math.pi, math.pi, segments, endpoint=False)
    sampled = np.interp(samples, angles[order], radii[order], period=math.tau)
    outline = center+np.stack([np.cos(samples), np.sin(samples)], axis=1)*sampled[:, None]
    return outline, {'height': height, 'intersectionCount': len(points),
                     'minimumXY': points[:, :2].min(axis=0).tolist(),
                     'maximumXY': points[:, :2].max(axis=0).tolist()}


body_trim, head_trim = args.body_trim, args.jaw_anchor_z-.048
if head_trim-body_trim < .015:
    raise ValueError('Jaw anchor leaves insufficient space for the measured neck transition')
lower_inner, lower_inner_record = horizontal_section(body, body_trim-.010)
lower, lower_record = horizontal_section(body, body_trim)
upper, upper_record = horizontal_section(head, head_trim)
upper_inner, upper_inner_record = horizontal_section(head, head_trim+.010)
length = head_trim-body_trim
slope = (upper-lower)/length
start_tangent = (lower-lower_inner)/.010
end_tangent = (upper_inner-upper)/.010
# Bound endpoint tangents componentwise so interpolation cannot bulge past the
# measured outlines. The former tilted sweep projected in front of the jaw.
for tangent in [start_tangent, end_tangent]:
    tangent[:] = np.where(tangent*slope <= 0, 0,
                          np.sign(slope)*np.minimum(np.abs(tangent), 3*np.abs(slope)))
bridge_rings = []
for outline, height in [(lower_inner, body_trim-.010), (lower, body_trim)]:
    bridge_rings.append([(float(x), float(y), height) for x, y in outline])
for t in np.linspace(0, 1, 33)[1:-1]:
    outline = ((2*t**3-3*t*t+1)*lower+(t**3-2*t*t+t)*length*start_tangent
               +(-2*t**3+3*t*t)*upper+(t**3-t*t)*length*end_tangent)
    bridge_rings.append([(float(x), float(y), body_trim+t*length) for x, y in outline])
for outline, height in [(upper, head_trim), (upper_inner, head_trim+.010)]:
    bridge_rings.append([(float(x), float(y), height) for x, y in outline])
bridge_vertices = [point for ring in bridge_rings for point in ring]
count = len(lower)
bridge_faces = []
for ring in range(len(bridge_rings)-1):
    for i in range(count):
        j = (i+1) % count
        bridge_faces.append((ring*count+i, ring*count+j, (ring+1)*count+j, (ring+1)*count+i))
bridge_faces.extend([tuple(reversed(range(count))),
                     tuple((len(bridge_rings)-1)*count+i for i in range(count))])
bridge_mesh = bpy.data.meshes.new('Measured horizontal neck loft')
bridge_mesh.from_pydata(bridge_vertices, [], bridge_faces)
bridge_mesh.update()
bridge = bpy.data.objects.new('Measured neck bridge', bridge_mesh)
bpy.context.collection.objects.link(bridge)
bm = bmesh.new(); bm.from_mesh(bridge_mesh)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(bridge_mesh); bm.free()
require_single_closed_mesh(bridge, args.out, 'Measured neck bridge before fusion')
bm = bmesh.new()
bm.from_mesh(head.data)
bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                      dist=.000001, plane_co=(0, 0, head_trim), plane_no=(0, 0, 1), clear_inner=True)
bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(head.data)
bm.free()
bm = bmesh.new()
bm.from_mesh(body.data)
bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                      dist=.000001, plane_co=(0, 0, body_trim), plane_no=(0, 0, 1), clear_outer=True)
bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(body.data)
bm.free()
require_single_closed_mesh(body, args.out, 'Body neck plane trim')
require_single_closed_mesh(head, args.out, 'Head neck plane trim')
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
head.select_set(True)
bridge.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.data.remesh_voxel_size = .0028
bpy.ops.object.voxel_remesh()
neck = body.vertex_groups.new(name='Neck fusion')
def fade(value, low, high):
    t = max(0, min(1, (value-low)/(high-low)))
    return t*t*(3-2*t)

for v in body.data.vertices:
    x, y, z = v.co
    weight = (fade(.16-abs(x), 0, .045)*fade(y+.15, 0, .035)
              *fade(.15-y, 0, .035)*fade(z-(body_trim-.03), 0, .025)*fade(head_trim+.025-z, 0, .025))
    if weight > 0:
        neck.add([v.index], weight, 'REPLACE')
mod = body.modifiers.new('Blend head and neck', 'SMOOTH')
mod.vertex_group = neck.name
mod.iterations = 90
mod.factor = .6
bpy.ops.object.modifier_apply(modifier=mod.name)
tip_corrections=[]
contact_correction=None
if args.tail_record:
    tail_record=json.loads(args.tail_record.read_text())
    if tail_record['outputs']['shape.glb'] != sha(args.body):
        raise ValueError('Tail controls do not belong to the supplied body')
    for controls in tail_record['tailControls']:
        tip=Vector(controls[-1][:3]);prior=Vector(controls[-2][:3])
        direction=(tip-prior).normalized()
        selected=[v for v in body.data.vertices if (v.co-tip).length<.06]
        if not selected:raise ValueError('No mesh vertices near recorded tail tip')
        maximum=max((v.co-tip).dot(direction) for v in selected)
        for vertex in selected:
            delta=vertex.co-tip;along=delta.dot(direction)
            t=max(0,min(1,(along+.055)/(maximum+.055)))
            radial=delta-direction*along
            vertex.co=tip+direction*(along-maximum*t*t)+radial*(1-t**3)
        tip_corrections.append({'endpoint':list(tip),'beforeMaximumOffset':maximum,'vertices':len(selected)})
    bm=bmesh.new();bm.from_mesh(body.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free()
    if 'groundContact' in tail_record:
        floor=tail_record['groundContact']['floorZ']
        blend=tail_record['groundContact']['blendHeight']
        count=0
        for vertex in body.data.vertices:
            x,y,z=vertex.co
            if abs(x)>.25 and z<floor+blend:
                t=max(0,min(1,(z-floor)/blend))
                vertex.co.z=floor+blend*(6*t**3-8*t**4+3*t**5)
                count+=1
        contact_correction={'floorZ':floor,'blendHeight':blend,'affectedVertices':count}
bpy.ops.mesh.customdata_custom_splitnormals_clear()
body.data.validate(clean_customdata=True)
body.data.materials.clear()
body.data.materials.append(material('Continuous construction clay', .38))
if nose_material_indices:
    body.data.materials.append(head_materials[min(nose_material_indices)])
pale_slot = None
if pale_material_indices:
    body.data.materials.append(head_materials[min(pale_material_indices)])
    pale_slot = len(body.data.materials)-1
pale_faces = 0
body.data.update()
for poly in body.data.polygons:
    poly.use_smooth = True
    if nose_material_indices and poly.center.z > .49:
        _, _, face_index, distance = head_surface.find_nearest(poly.center)
        if (face_index is not None and distance < .0075
                and head_material_indices[face_index] in nose_material_indices):
            poly.material_index = 1
    if pale_slot is not None and poly.center.z > .60 and abs(poly.center.x) > .17:
        _, _, face_index, distance = head_surface.find_nearest(poly.center)
        if (face_index is not None and distance < .006
                and head_material_indices[face_index] in pale_material_indices):
            poly.material_index = pale_slot
            pale_faces += 1
body.name = 'akinza_continuous_construction'
fragment_limit = args.fragment_voxels*body.data.remesh_voxel_size
removed_fragments = remove_voxel_specks(body, max_extent=fragment_limit, min_z=.49)
require_single_closed_mesh(body, args.out, 'Final assembly including corrected tail tips')
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
(args.out/'assembly.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance_sha, 'scope': 'Internal whole-creature reconciliation, not animation topology',
    'inputs': {str(args.head): sha(args.head), str(args.body): sha(args.body)},
    'headTransform': {'scale': args.head_scale, 'translation': list(head_offset), 'neckTrimZ': head_trim,
                      'jawAnchor': {'headLocalZ': -.27, 'worldZ': args.jaw_anchor_z}},
    'neck': 'Native horizontal sections joined by bounded Hermite loft and locally relaxed',
    'neckSections': [lower_inner_record, lower_record, upper_record, upper_inner_record],
    'seamWeldDistance': .000001,
    'noseMaterialTransfer': 'Nearest imported head polygon within .0075 world units after remesh',
    'paleMaterialTransfer': {'slot': pale_slot, 'faces': pale_faces, 'rule': 'nearest imported head polygon within .006 world units, |x| above .17, z above .60'},
    'separateNoseObjectsPreserved': separate_noses,
    'tipCorrectionsAfterFinalRemesh': tip_corrections,
    'groundContactAfterFinalRemesh': contact_correction,
    'removedTinyHeadFragments': removed_fragments,
    'tinyHeadFragmentLimit': {'vertices':16,'extent':fragment_limit,'minimumZ':.49},
    'scriptSha256': sha(args.out/'assembly_source.py'),
    'objects': {o.name: mesh_stats(o) for o in bpy.context.scene.objects if o.type == 'MESH'},
    'outputs': {f.name: sha(f) for f in args.out.iterdir() if f.suffix in ['.blend', '.glb']}
}, indent=2)+'\n')
