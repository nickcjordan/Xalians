"""Match measured iris coverage and lid emphasis without moving the globes."""
import argparse
from array import array
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import material, sha, mesh_stats, require_single_closed_mesh

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene])
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))


def has_material(obj, name):
    return obj.type == 'MESH' and any(name in m.name for m in obj.data.materials if m)


def vertex_digest(obj):
    coordinates = array('f', [0])* (3*len(obj.data.vertices))
    obj.data.vertices.foreach_get('co', coordinates)
    return hashlib.sha256(coordinates.tobytes()).hexdigest()


skin = max((o for o in bpy.context.scene.objects if o.type=='MESH'), key=lambda o:len(o.data.vertices))
skin_before = vertex_digest(skin)
globes = [o for o in bpy.context.scene.objects if has_material(o, 'Ocular white')]
old_irises = [o for o in bpy.context.scene.objects if has_material(o, 'Pupil')]
old_lids = [o for o in bpy.context.scene.objects if has_material(o, 'Eyelid edge')]
if len(globes) != 2 or len(old_irises) != 2 or len(old_lids) != 2:
    raise ValueError('Expected exactly two globes, dark lenses and eyelid edges')
globe_before = {o.name: vertex_digest(o) for o in globes}
iris_material = material('Charcoal iris and black pupil', 1)
lid_material = material('Upper emphasized eyelid', .018)
for mat, roughness in [(iris_material,.12),(lid_material,.40)]:
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = roughness
iris_shader = iris_material.node_tree.nodes['Principled BSDF']
iris_shader.inputs['Coat Weight'].default_value = .35
iris_shader.inputs['Coat Roughness'].default_value = .10
color_node = iris_material.node_tree.nodes.new('ShaderNodeVertexColor')
color_node.layer_name = 'IrisColor'
iris_material.node_tree.links.new(color_node.outputs['Color'],iris_shader.inputs['Base Color'])
records = []
for globe in globes:
    points = [globe.matrix_world @ v.co for v in globe.data.vertices]
    cx = (min(v.x for v in points)+max(v.x for v in points))/2
    cz = (min(v.z for v in points)+max(v.z for v in points))/2
    rx = (max(v.x for v in points)-min(v.x for v in points))/2
    rz = (max(v.z for v in points)-min(v.z for v in points))/2
    side = -1 if cx < 0 else 1
    old = min(old_irises, key=lambda o:abs(sum((o.matrix_world@v.co).x for v in o.data.vertices)/len(o.data.vertices)-cx))
    old_points = [old.matrix_world @ v.co for v in old.data.vertices]
    iris_cx = (min(v.x for v in old_points)+max(v.x for v in old_points))/2
    iris_cz = (min(v.z for v in old_points)+max(v.z for v in old_points))/2
    tree = BVHTree.FromPolygons(points, [list(p.vertices) for p in globe.data.polygons])

    def front_y(x,z):
        hit,_,_,_ = tree.ray_cast(Vector((x,-2,z)),Vector((0,1,0)))
        if hit is None:
            raise ValueError(f'Eye surface ray missed at {(x,z)}')
        return hit.y

    for mat in globe.data.materials:
        mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .35
    bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=96, radius=1)
    iris = bpy.context.object
    iris.name = f'iris_and_pupil_{side}'
    for vertex in iris.data.vertices:
        x,y,z = vertex.co.copy()
        px,pz = iris_cx+.062*x,iris_cz+.100*z
        vertex.co = (px,front_y(px,pz)-.001+.018*y,pz)
    iris.data.materials.append(iris_material)
    iris.data.update()
    colors = iris.data.color_attributes.new(name='IrisColor',type='FLOAT_COLOR',domain='CORNER')
    for loop in iris.data.loops:
        x,y,z = iris.data.vertices[loop.vertex_index].co
        pupil_radius = math.hypot((x-iris_cx)/.034,(z-iris_cz)/.046)
        t = max(0,min(1,(pupil_radius-.96)/.08))
        blend = t*t*(3-2*t)
        radial = min(1,((x-iris_cx)/.062)**2+((z-iris_cz)/.100)**2)
        charcoal = .004+.011*(1-radial)
        gray = .0007*(1-blend)+charcoal*blend
        colors.data[loop.index].color = (gray,gray,gray,1)
    for poly in iris.data.polygons:
        poly.use_smooth = True
    require_single_closed_mesh(iris,args.out,f'Closed iris lens {side}')
    bpy.data.objects.remove(old,do_unlink=True)
    old_irises.remove(old)
    curve = bpy.data.curves.new(f'Variable upper lid {side}','CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = .0028
    curve.bevel_resolution = 4
    spline = curve.splines.new('POLY')
    spline.points.add(255)
    for i,point in enumerate(spline.points):
        angle = math.tau*i/256
        x,z = cx+rx*.998*math.cos(angle),cz+rz*.998*math.sin(angle)
        point.co = (x,front_y(x,z)-.001,z,1)
        upper = max(0,math.sin(angle))
        point.radius = 1+1.05*upper*upper*(3-2*upper)
    spline.use_cyclic_u = True
    lid = bpy.data.objects.new(f'upper_emphasized_lid_{side}',curve)
    bpy.context.collection.objects.link(lid)
    lid.data.materials.append(lid_material)
    records.append({'side':side,'apertureRadii':[rx,rz],
                    'irisCenterXZ':[iris_cx,iris_cz],'irisRadii':[.062,.100],
                    'pupilRadii':[.034,.046],'lensHalfThickness':.018,
                    'upperLidRadius':.0028*2.05,'lowerLidRadius':.0028,
                    'iris':mesh_stats(iris)})
for lid in old_lids:
    bpy.data.objects.remove(lid,do_unlink=True)
if vertex_digest(skin)!=skin_before or any(vertex_digest(o)!=globe_before[o.name] for o in globes):
    raise ValueError('Eye finish unexpectedly moved the skin or globe geometry')
require_single_closed_mesh(skin,args.out,'Retained head skin after eye finish')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.convert(target='MESH')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'),export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'eye-refinement.json').write_text(json.dumps({
    'approval':None,'stageProvenanceSha256':provenance,'sourceSha256':sha(args.scene),
    'scope':'Measured iris coverage, centered pupil and upper-lid emphasis; globe placement unchanged',
    'skinCoordinatesUnchanged':True,'globeCoordinatesUnchanged':True,
    'ocularWhiteRoughness':.35,'eyes':records,
    'irisFinish': 'One closed conformal lens, smooth vertex-color pupil boundary, radial charcoal iris and continuous physical clearcoat',
    'outputs':{p.name:sha(p) for p in args.out.iterdir() if p.suffix in ['.glb','.blend']}
},indent=2)+'\n')
