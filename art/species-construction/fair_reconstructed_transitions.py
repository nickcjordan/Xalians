"""Fair the narrow posterior root collars after broad skull reconstruction."""
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
before = require_single_closed_mesh(body, args.out, 'Input transition surface')
original = [v.co.copy() for v in body.data.vertices]
supported = set()
bpy.context.view_layer.objects.active = body
body.select_set(True)


def ease(t):
    t = max(0, min(1, t))
    return t*t*(3-2*t)


def fair(name, weight_function, iterations):
    group = body.vertex_groups.new(name=name)
    for vertex in body.data.vertices:
        weight = weight_function(*vertex.co)
        if weight > 0:
            group.add([vertex.index], weight, 'REPLACE')
            supported.add(vertex.index)
    modifier = body.modifiers.new(name, 'SMOOTH')
    modifier.vertex_group = group.name
    modifier.factor = .6
    modifier.iterations = iterations
    bpy.ops.object.modifier_apply(modifier=modifier.name)


fair('Inner ear root collar',
     lambda x, y, z: ease((abs(x)-.32)/.09)*ease((.67-abs(x))/.10)
     *ease((y-.015)/.040)*ease((z+.25)/.08)*ease((.45-z)/.10), 400)
fair('Lower posterior bump',
     lambda x, y, z: ease((.19-abs(x))/.07)*ease((y-.005)/.055)
     *ease((z+.36)/.045)*ease((-.18-z)/.045)
     *math.exp(-((z+.268)/.046)**2), 180)
after = require_single_closed_mesh(body, args.out, 'Faired transition surface')
outside_maximum = max((v.co-original[v.index]).length for v in body.data.vertices
                      if v.index not in supported)
inside_maximum = max((v.co-original[v.index]).length for v in body.data.vertices
                     if v.index in supported)
for polygon in body.data.polygons:
    polygon.use_smooth = True
bpy.ops.mesh.customdata_custom_splitnormals_clear()
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'transition-fairing.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance,
    'sourceSha256': sha(args.base), 'before': before, 'after': after,
    'rootCollar': {'absoluteX': [.32,.67], 'z': [-.25,.45],
                   'minimumY': .015, 'iterations': 400, 'factor': .6},
    'lowerBump': {'absoluteXMaximum': .19, 'z': [-.36,-.18],
                  'minimumY': .005, 'iterations': 180, 'factor': .6},
    'maximumDisplacementInside': inside_maximum,
    'maximumDisplacementOutside': outside_maximum,
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb','.blend']}
}, indent=2)+'\n')
