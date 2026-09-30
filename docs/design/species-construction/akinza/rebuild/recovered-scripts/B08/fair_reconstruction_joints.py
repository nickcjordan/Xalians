"""Remove local splice curvature artifacts without adding overlapping solids."""
import argparse
import json
import math
from pathlib import Path
import sys
import bpy
import bmesh
from mathutils import Matrix

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, sha, sphere, require_single_closed_mesh
from study_provenance import snapshot
from blender_probe import tube

parser = argparse.ArgumentParser()
parser.add_argument('--mesh', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--tail-free-input', action='store_true', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.mesh])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.mesh.resolve()))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
body = max(objects, key=lambda o: len(o.data.vertices))
skin_material = body.data.materials[0] if body.data.materials else None
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
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active = body
require_single_closed_mesh(body,args.out,'Imported body before joint fairing')
paw_supports = []
for side in [-1, 1]:
    # Support the heel attachment instead of burying the toes below a second pad.
    paw = sphere({'id': 'Continuous hind heel support '+str(side),
                  'center': [side*.357, -.030, -.886], 'scale': [.078, .067, .045]})
    paw_supports.append(paw)
bpy.ops.object.select_all(action='DESELECT')
for paw in paw_supports:
    paw.select_set(True)
bpy.context.view_layer.objects.active = body
body.select_set(True)
bpy.ops.object.join()


def ease(value, low, high):
    t = max(0, min(1, (value-low)/(high-low)))
    return t*t*(3-2*t)


# Rebuild the three sweeps rather than deforming only one side of their sections.
tails = [
 [[0,.085,-.03,.054,.055],[.07,.15,-.01,.078,.080],[.23,.24,.115,.110,.115],[.44,.32,.215,.108,.114],[.62,.35,.190,.060,.065],[.70,.37,.145,.001,.001]],
 [[0,.09,-.058,.058,.058],[.11,.18,-.06,.085,.087],[.30,.29,-.085,.125,.132],[.53,.36,-.12,.120,.125],[.68,.40,-.190,.061,.065],[.73,.42,-.26,.001,.001]],
 [[0,.085,-.085,.055,.058],[.075,.17,-.13,.078,.080],[.21,.28,-.275,.113,.120],[.40,.37,-.410,.103,.112],[.52,.42,-.52,.055,.058],[.53,.44,-.60,.001,.001]]]
parts=[]
for index, controls in enumerate(tails):
    for i, row in enumerate(controls):
        if i == 0: continue
        x,y,z,rx,ry=row
        angle=-.20
        dz=z+.058
        row[:]=[.93*(math.cos(angle)*x-math.sin(angle)*dz), y,
                -.058+.93*(math.sin(angle)*x+math.cos(angle)*dz), rx*.96,ry*.96]
    obj=tube('Rebalanced rounded tail '+str(index),[[n*10 for n in row] for row in controls])
    for v in obj.data.vertices:v.co/=10
    bpy.context.view_layer.objects.active=obj
    sub=obj.modifiers.new('Round tail sections','SUBSURF');sub.levels=2
    bpy.ops.object.modifier_apply(modifier=sub.name)
    parts.append(obj)
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
for obj in parts:obj.select_set(True)
bpy.context.view_layer.objects.active=body
bpy.ops.object.join()
body.data.remesh_voxel_size = .0045
bpy.ops.object.voxel_remesh()
require_single_closed_mesh(body,args.out,'Joint fairing after solid fusion')


def fair(name, weight, iterations):
    group = body.vertex_groups.new(name=name)
    for v in body.data.vertices:
        w = weight(*v.co)
        if w > .00001:
            group.add([v.index], w, 'REPLACE')
    modifier = body.modifiers.new(name, 'SMOOTH')
    modifier.vertex_group = group.name
    modifier.factor = .65
    modifier.iterations = iterations
    bpy.ops.object.modifier_apply(modifier=modifier.name)


# Smooth falloff removes the displaced/fixed boundary of the old box masks.
fair('Continuous shoulder root', lambda x,y,z:
     math.exp(-((abs(x)-.207)/.105)**2-((z-.405)/.100)**2-(y/.18)**2), 220)
fair('Inner arm scan residue', lambda x,y,z:
     math.exp(-((abs(x)-.30)/.075)**2-((z-.13)/.085)**2)*ease(.10-y,0,.08), 160)
fair('Forearm longitudinal scan dents', lambda x,y,z:
     math.exp(-((abs(x)-.345)/.075)**2-((z-.025)/.125)**2)
     *ease(.10-y,0,.08)*ease(z,-.16,-.10), 900)
fair('Lower thigh anterior scan dents', lambda x,y,z:
     math.exp(-((abs(x)-.155)/.060)**2-((z+.355)/.085)**2)*ease(-y,.10,.16), 1000)
for vertex in body.data.vertices:
    x,y,z=vertex.co
    weight=math.exp(-((abs(x)-.235)/.065)**2-((z+.55)/.070)**2)*ease(.10-y,0,.06)
    vertex.co.y-=.015*weight
fair('Anterior knee transition', lambda x,y,z:
     math.exp(-((abs(x)-.235)/.085)**2-((z+.55)/.105)**2)*ease(.10-y,0,.06), 400)
fair('Continuous shin to ankle curvature', lambda x,y,z:
     math.exp(-((abs(x)-.318)/.12)**2-((z+.760)/.075)**2), 190)
fair('Body-level tail fusion', lambda x,y,z:
     ease(y,.02,.12)*math.exp(-(x/.19)**2-((z+.09)/.15)**2), 30)
fair('Continuous ankle and paw roof', lambda x,y,z:
     math.exp(-((abs(x)-.357)/.115)**2-((z+.878)/.065)**2-((y+.030)/.10)**2)
     *ease(y,-.18,-.13), 180)
body.data.remesh_voxel_size = .0028
bpy.ops.object.voxel_remesh()
# The measured central pad extended .004 below the toes and rocked on its
# rounded center. Compress only the last .01 of sole height into a common
# planted contact, with a C2 transition back to the unchanged perimeter.
contact_floor = -.957
contact_blend = .010
contact_vertices = 0
for vertex in body.data.vertices:
    x, y, z = vertex.co
    if abs(x) > .25 and z < contact_floor + contact_blend:
        t = max(0, min(1, (z-contact_floor)/contact_blend))
        vertex.co.z = contact_floor + contact_blend*(6*t**3-8*t**4+3*t**5)
        contact_vertices += 1
if skin_material is not None:
    body.data.materials.clear()
    body.data.materials.append(skin_material)
for poly in body.data.polygons:
    poly.use_smooth = True
    poly.material_index = 0
bpy.ops.mesh.customdata_custom_splitnormals_clear()
body.data.validate(clean_customdata=True)
require_single_closed_mesh(body,args.out,'Completed joint fairing')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'body.blend'))
(args.out/'fairing.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance,
    'scope': 'Internal joint curvature, paw support and tail fan correction',
    'body': mesh_stats(body), 'tailControls': tails,
    'groundContact': {'floorZ': contact_floor, 'blendHeight': contact_blend,
                      'affectedVertices': contact_vertices},
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb','.blend']}
}, indent=2)+'\n')
