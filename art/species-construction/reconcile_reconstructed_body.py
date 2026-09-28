"""Correct audited medium forms on the retained reconstruction, with provenance."""
import argparse
import json
import math
from pathlib import Path
import shutil
import sys
import bpy
import bmesh
from mathutils import Matrix
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import mesh_stats, sha
from blender_probe import tube

parser = argparse.ArgumentParser()
parser.add_argument('--mesh', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
shutil.copyfile(__file__, args.out/'reconcile_source.py')
provenance_sha = snapshot(args.out, __file__, [args.mesh])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.mesh.resolve()))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
body = max(objects, key=lambda o: len(o.data.vertices))
for obj in objects:
    matrix = obj.matrix_world.copy()
    for v in obj.data.vertices:
        v.co = matrix @ v.co
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


def ramp(v, a, b):
    t = max(0, min(1, (v-a)/(b-a)))
    return t*t*(3-2*t)


def smooth(name, weight, iterations):
    group = body.vertex_groups.new(name=name)
    for v in body.data.vertices:
        w = weight(*v.co)
        if w > 0:
            group.add([v.index], w, 'REPLACE')
    mod = body.modifiers.new(name, 'SMOOTH')
    mod.vertex_group = group.name
    mod.factor = .7
    mod.iterations = iterations
    bpy.ops.object.modifier_apply(modifier=mod.name)


# A coarse intermediate mesh lets local relaxation remove scan-scale relief.
# Keep the native torso and attachment topology; prior replacement tests failed.
body.data.remesh_voxel_size = .0055
bpy.ops.object.voxel_remesh()
smooth('Remove limb scan dents', lambda x,y,z: ramp(abs(x), .16, .22)*ramp(.48-abs(x),0,.08)
       *ramp(.38-z,0,.07)*ramp(z+.90,0,.07)*ramp(.17-y,0,.08), 95)
smooth('Relax paired torso relief',lambda x,y,z:ramp(.26-abs(x),0,.10)
       *ramp(z+.24,0,.10)*ramp(.41-z,0,.10)*ramp(.175-y,0,.04),400)
smooth('Crotch saddle transition',lambda x,y,z:ramp(.16-abs(x),0,.06)*ramp(z+.34,0,.06)
       *ramp(-.10-z,0,.09),180)
smooth('Remove wrist ledges',lambda x,y,z:ramp(abs(x),.385,.43)*ramp(.10-y,0,.08)
       *ramp(z+.24,0,.05)*ramp(-.015-z,0,.07),160)
for v in body.data.vertices:
    x,y,z = v.co
    if -.08 < z < .23 and abs(x) > .29 and y < .14:
        cx=float(np.interp(z,[-.08,0,.12,.23],[.44,.41,.355,.30]))
        cy=float(np.interp(z,[-.08,0,.12,.23],[-.10,-.07,-.025,.005]))
        w=ramp(z+.08,0,.06)*ramp(.23-z,0,.08)
        v.co.x=math.copysign(cx,x)+(x-math.copysign(cx,x))*(1-.12*w)
        v.co.y=cy+(y-cy)*(1-.12*w)
body.data.remesh_voxel_size=.0035
bpy.ops.object.voxel_remesh()
smooth('Final local resampling cleanup',lambda x,y,z:ramp(.175-y,0,.04),8)
bpy.ops.mesh.customdata_custom_splitnormals_clear()
body.data.validate(clean_customdata=True)
for poly in body.data.polygons:
    poly.use_smooth = True
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'),export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'body.blend'))
(args.out/'reconciliation.json').write_text(json.dumps({
    'approval':None,'stageProvenanceSha256':provenance_sha,'sourceSha256':sha(args.mesh),'scriptSha256':sha(args.out/'reconcile_source.py'),
    'changes':['Native torso retained with coarse-scale local relaxation','Slimmer forearms',
               'Relaxed wrist ledges','Rounded crotch saddle','Masked limb scan cleanup'],
    'body':mesh_stats(body),'outputs':{f.name:sha(f) for f in args.out.iterdir() if f.suffix in ['.glb','.blend']}
},indent=2)+'\n')
