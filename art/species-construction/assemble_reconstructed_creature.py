"""Join corrected construction studies and retain separate ocular/claw objects."""
import argparse
import json
from pathlib import Path
import shutil
import sys
import bpy
import bmesh
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import material, mesh_stats, sha, sphere
from blender_probe import tube

parser = argparse.ArgumentParser()
parser.add_argument('--body', type=Path, required=True)
parser.add_argument('--head', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
shutil.copyfile(__file__, args.out/'assembly_source.py')
provenance_sha = snapshot(args.out, __file__, [args.body,args.head])
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
head, head_objects = load(args.head, 'head', .60, (0, -.045, .70))
bm = bmesh.new()
bm.from_mesh(head.data)
bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                      dist=.000001, plane_co=(0, 0, .49), plane_no=(0, 0, 1), clear_inner=True)
bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(head.data)
bm.free()
bm = bmesh.new()
bm.from_mesh(body.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if abs(v.co.x)<.135 and v.co.z>.405], context='VERTS')
bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(body.data)
bm.free()
bridge = tube('Neck bridge', [
    [0, .006, .35, .16, .108], [0, -.01, .388, .12, .101],
    [0, -.037, .43, .087, .077], [0, -.061, .468, .079, .067],
    [0, -.085, .507, .094, .080], [0, -.096, .524, .099, .088]])
bpy.context.view_layer.objects.active = bridge
sub = bridge.modifiers.new('Round neck sections', 'SUBSURF')
sub.levels = 2
bpy.ops.object.modifier_apply(modifier=sub.name)
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
    weight = (fade(.34-abs(x), 0, .12)*fade(y+.23, 0, .08)
              *fade(.21-y, 0, .08)*fade(z-.28, 0, .10)*fade(.55-z, 0, .08))
    if weight > 0:
        neck.add([v.index], weight, 'REPLACE')
mod = body.modifiers.new('Blend head and neck', 'SMOOTH')
mod.vertex_group = neck.name
mod.iterations = 160
mod.factor = .6
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.mesh.customdata_custom_splitnormals_clear()
body.data.validate(clean_customdata=True)
body.data.materials.clear()
body.data.materials.append(material('Continuous construction clay', .38))
body.data.materials.append(material('Retained dark nose', .075))
body.data.update()
for poly in body.data.polygons:
    poly.use_smooth = True
    x, y, z = (poly.center-Vector((0, -.045, .70)))/.60
    width = .041*max(.20, 1+.8*(z+.082)/.05)
    if abs(x) < width and -.132 < z < -.079 and y < -.477:
        poly.material_index = 1
body.name = 'akinza_continuous_construction'
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
(args.out/'assembly.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance_sha, 'scope': 'Internal whole-creature reconciliation, not animation topology',
    'inputs': {str(args.head): sha(args.head), str(args.body): sha(args.body)},
    'headTransform': {'scale': .60, 'translation': [0, -.045, .70], 'neckTrimZ': .49},
    'neck': 'Both cutoff regions removed, new continuous bridge fused and locally relaxed',
    'seamWeldDistance': .000001,
    'scriptSha256': sha(args.out/'assembly_source.py'),
    'objects': {o.name: mesh_stats(o) for o in bpy.context.scene.objects if o.type == 'MESH'},
    'outputs': {f.name: sha(f) for f in args.out.iterdir() if f.suffix in ['.blend', '.glb']}
}, indent=2)+'\n')
