"""Taper the native lower inner ear web while preserving its upper cup."""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import sha, require_single_closed_mesh

parser = argparse.ArgumentParser()
parser.add_argument('--base', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.base])
bpy.ops.wm.open_mainfile(filepath=str(args.base.resolve()))
body = bpy.data.objects['cleaned_head_with_openings']
before = require_single_closed_mesh(body, args.out, 'Input lower ear web')
original = [v.co.copy() for v in body.data.vertices]


def ease(t):
    t = max(0, min(1, t))
    return t*t*(3-2*t)


group = body.vertex_groups.new(name='Lower inner ear web cleanup')
supported = set()
for vertex in body.data.vertices:
    x, y, z = vertex.co
    weight = (ease((abs(x)-.410)/.035)*ease((.575-abs(x))/.035)
              *ease((-.035-z)/.055)*ease((z+.22)/.045))
    if weight:
        group.add([vertex.index], weight, 'REPLACE')
        supported.add(vertex.index)
bpy.context.view_layer.objects.active = body
body.select_set(True)
modifier = body.modifiers.new('Remove local scan patch', 'SMOOTH')
modifier.vertex_group = group.name
modifier.factor = .6
modifier.iterations = 140
bpy.ops.object.modifier_apply(modifier=modifier.name)
for vertex in body.data.vertices:
    x, y, z = vertex.co
    if .430 < abs(x) < .574:
        weight = (math.sin(math.pi*(abs(x)-.430)/.144)**2
                  *ease((-.035-z)/.095))
        if weight:
            vertex.co.z -= .042*weight
            vertex.co.x += math.copysign(.006*weight, x)
            vertex.co.y += (.060-y)*.24*weight
            supported.add(vertex.index)
body.data.update()
after = require_single_closed_mesh(body, args.out, 'Tapered lower ear web')
outside_maximum = max((v.co-original[v.index]).length for v in body.data.vertices
                      if v.index not in supported)
inside_maximum = max((v.co-original[v.index]).length for v in body.data.vertices
                     if v.index in supported)
for polygon in body.data.polygons:
    polygon.use_smooth = True
bpy.ops.mesh.customdata_custom_splitnormals_clear()
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'lower-ear-refinement.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance,
    'sourceSha256': sha(args.base), 'before': before, 'after': after,
    'method': 'Taper existing inner web downward with a bounded smooth field',
    'taper': {'absoluteX': [.430,.574], 'zFullBelow': -.130,
              'zZeroAbove': -.035, 'downwardMaximum': .042,
              'outwardMaximum': .006, 'depthCompression': .24},
    'cleanup': {'iterations': 140, 'factor': .6},
    'maximumDisplacementInside': inside_maximum,
    'maximumDisplacementOutside': outside_maximum,
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb','.blend']}
}, indent=2)+'\n')
