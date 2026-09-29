"""Bounded paw-volume finishing on a retained closed reconstruction."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, require_single_closed_mesh, sha, sphere
from blender_probe import aim
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--tail-record', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.tail_record])
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
body = max(objects, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(body, args.out, 'Retained body before bounded paw finishing')
before = [v.co.copy() for v in body.data.vertices]


def ease(t, low, high):
    t = min(1, max(0, (t-low)/(high-low)))
    return t*t*(3-2*t)


def hind_weight(x, y, z):
    return ease(abs(x), .24, .28)*(1-ease(z, -.84, -.77))


def fore_weight(x, y, z):
    return (ease(abs(x), .39, .42)*ease(z, -.36, -.33)
            *(1-ease(z, -.23, -.18))*(1-ease(y,-.04,0)))


def domain(co):
    x, y, z = co
    return hind_weight(x,y,z)>0 or fore_weight(x,y,z)>0


def fair(name, weight, iterations):
    group = body.vertex_groups.new(name=name)
    for v in body.data.vertices:
        w = weight(*v.co)
        if w > 0:
            group.add([v.index], w, 'REPLACE')
    bpy.context.view_layer.objects.active = body
    modifier = body.modifiers.new(name, 'SMOOTH')
    modifier.vertex_group = group.name
    modifier.factor = .6
    modifier.iterations = iterations
    bpy.ops.object.modifier_apply(modifier=modifier.name)


# Relax the horizontal roof ridge and squared heel transition locally. The
# planted sole is excluded so smoothing cannot round away physical contact.
fair('Paw roof ridge into ankle', lambda x,y,z: hind_weight(x,y,z)
     *ease(z,-.955,-.935)*math.exp(-((y+.075)/.080)**2)*ease(y,-.13,-.105), 340)
fair('Hind heel side support', lambda x,y,z: hind_weight(x,y,z)
     *ease(z,-.955,-.935)*math.exp(-((y+.012)/.075)**2)*ease(y,-.13,-.105), 240)


def deform(co):
    x, y, z = co
    f = fore_weight(x,y,z)
    if f:
        # Move the distal pads toward the palm instead of leaving a front shelf.
        co.y += .011*f*(1-ease(z,-.285,-.245))


def boolean(other, operation, stage):
    bpy.context.view_layer.objects.active = body
    modifier = body.modifiers.new(stage, 'BOOLEAN')
    modifier.operation, modifier.solver, modifier.object = operation, 'EXACT', other
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(other, do_unlink=True)
    require_single_closed_mesh(body, args.out, stage)


for side in [-1,1]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(side*.37,-.25,-.97))
    cutter=bpy.context.object
    cutter.scale=(.26,.21,.22)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    boolean(cutter,'DIFFERENCE','Closed distal paw excision '+str(side))
    for i,cx in enumerate([.302,.350,.398,.446]):
        center_y = -.155-(.006 if i in [1,2] else 0)
        pad=sphere({'id':'Rounded hind pad '+str(side)+' '+str(i),
                    'center':[side*cx,center_y,-.915],
                    'scale':[.033,.057,.045]}, body.data.materials[0])
        boolean(pad,'UNION','Closed round pad union '+str(side)+' '+str(i))
fair('Bounded rounded pad root collars', lambda x,y,z: hind_weight(x,y,z)
     *ease(z,-.95,-.935)*math.exp(-((y+.118)/.019)**2), 45)


for obj in objects:
    if obj == body:
        for vertex in obj.data.vertices:
            deform(vertex.co)
    else:
        center = sum((v.co for v in obj.data.vertices), Vector())/len(obj.data.vertices)
        moved = center.copy()
        deform(moved)
        if center.z < -.80:
            moved.y -= .026
            moved.z += .016
        for vertex in obj.data.vertices:
            vertex.co += moved-center
        if center.z < -.80:
            # Seat the reconstructed claw collar inside the restored digit.
            # Preserve a short curved point while reducing its broad cap width.
            top = max(v.co.z for v in obj.data.vertices)
            bottom = min(v.co.z for v in obj.data.vertices)
            stretch = min(1.60, (top+.954)/(top-bottom))
            for vertex in obj.data.vertices:
                vertex.co.x = moved.x+(vertex.co.x-moved.x)*.85
                vertex.co.z = top+(vertex.co.z-top)*stretch
fair('Forepaw pad to palm continuity', lambda x,y,z: fore_weight(x,y,z)
     *math.exp(-((z+.256)/.032)**2), 90)

# Boolean operations change vertex ordering only in the bounded paw domains.
# Verify coordinate multisets outside them instead of relying on old indices.
outside = [co for co in before if not domain(co)]
floor = -.957
for vertex in body.data.vertices:
    x,y,z=vertex.co
    if hind_weight(x,y,z) and z < floor+.007:
        t=max(0,min(1,(z-floor)/.007))
        vertex.co.z=floor+.007*(6*t**3-8*t**4+3*t**5)
contact_before = [co for co in before if co.z < floor+.00002]
contact_after = [v.index for v in body.data.vertices if v.co.z < floor+.00002]
bm=bmesh.new()
bm.from_mesh(body.data)
local_edges=[edge for edge in bm.edges if all(domain(v.co) for v in edge.verts)]
bmesh.ops.dissolve_degenerate(bm,edges=local_edges,dist=.000001)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.to_mesh(body.data)
bm.free()
body.data.update()
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'geometry-checkpoint.blend'))
require_single_closed_mesh(body, args.out, 'Bounded paw finishing result')


def digest(coords):
    value = hashlib.sha256()
    for co in sorted(tuple(co) for co in coords):
        value.update(struct.pack('<3f', *co))
    return value.hexdigest()


before_hash = digest(outside)
after_hash = digest(v.co for v in body.data.vertices if not domain(v.co))
assert before_hash == after_hash
tail_vertices = [co for co in before if co.y > .04 and -.71 < co.z < .08]
tail_before_hash = digest(tail_vertices)
tail_after_hash = digest(v.co for v in body.data.vertices if v.co.y > .04 and -.71 < v.co.z < .08)
assert tail_before_hash == tail_after_hash
collapsed_edges = sum((body.data.vertices[e.vertices[0]].co-body.data.vertices[e.vertices[1]].co).length < 1e-8
                      for e in body.data.edges)
collapsed_faces = sum(p.area < 1e-12 for p in body.data.polygons)
if collapsed_edges or collapsed_faces:
    (args.out/'degenerate-failure.json').write_text(json.dumps({
        'collapsedEdges':collapsed_edges,'collapsedFaces':collapsed_faces},indent=2)+'\n')
    bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'degenerate-failure.blend'))
    raise ValueError('Degenerate paw faces or edges remain after local Boolean cleanup')
assert min(v.co.z for v in body.data.vertices) >= floor-.00002
claw_contact = [{'name':obj.name,'minimumZ':min(v.co.z for v in obj.data.vertices)}
                for obj in objects if obj != body]
assert all(item['minimumZ'] >= floor-.00002 for item in claw_contact)
for obj in objects:
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')

# Save an inspectable scene with the same physical area-light arrangement used
# for the retained body's closeups. No texture or painted highlight is added.
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'Standard'
for obj in list(scene.objects):
    if obj.type in ['LIGHT','CAMERA']:
        bpy.data.objects.remove(obj, do_unlink=True)
target = Vector((0,0,-.25))
for pos, power, size in [((-3,-5,7),650,4),((4,-2,4),300,4),((1,4,6),550,3)]:
    bpy.ops.object.light_add(type='AREA', location=target+Vector(pos))
    lamp = bpy.context.object
    lamp.data.energy, lamp.data.size = power, size
    aim(lamp,target)
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'body.blend'))
record = json.loads(args.tail_record.read_text())
record.update({
    'approval': None, 'stageProvenanceSha256': provenance,
    'scope': 'Bounded hind digit volume, paw roof and fore digit attachment finishing',
    'body': mesh_stats(body),
    'unchangedOutsideRegion': {'vertexCount':len(outside), 'beforeSha256':before_hash,
                               'afterSha256':after_hash, 'exactlyUnchanged':True},
    'physicalContact': {'floorZ':floor,'originalContactVertices':len(contact_before),
                        'currentContactVertices':len(contact_after),
                        'contactPolicy':'Separate rounded pad contacts after bounded closed Boolean toe construction',
                        'minimumZ':min(v.co.z for v in body.data.vertices),
                        'collapsedEdges':collapsed_edges,'collapsedFaces':collapsed_faces,
                        'clawMinimums':claw_contact},
    'sourceTailRecordSha256':sha(args.tail_record),
    'unchangedTailRegion': {'vertexCount':len(tail_vertices),
                            'beforeSha256':tail_before_hash,'afterSha256':tail_after_hash,
                            'exactlyUnchanged':True},
    'outputs':{p.name:sha(p) for p in args.out.iterdir() if p.suffix in ['.blend','.glb']}})
(args.out/'paw-refinement.json').write_text(json.dumps(record,indent=2)+'\n')
(args.out/'fairing.json').write_text(json.dumps(record,indent=2)+'\n')
