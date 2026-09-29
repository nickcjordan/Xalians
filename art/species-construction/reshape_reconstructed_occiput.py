"""Restore bounded posterior cranial curvature without changing facial geometry."""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import sha, require_single_closed_mesh
from surface_math import profile

parser = argparse.ArgumentParser()
parser.add_argument('--base', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.base])
bpy.ops.wm.open_mainfile(filepath=str(args.base.resolve()))
body = bpy.data.objects['cleaned_head_with_openings']
before = require_single_closed_mesh(body, args.out, 'Input occipital surface')
original = [v.co.copy() for v in body.data.vertices]


def ease(t):
    t = max(0, min(1, t))
    return t*t*(3-2*t)


def measurements():
    tree = BVHTree.FromPolygons([v.co for v in body.data.vertices],
                               [list(p.vertices) for p in body.data.polygons])
    rows = []
    for z in [.36,.30,.24,.18,.12,.06,0,-.06,-.12,-.18,-.22,-.26,-.30,-.34,-.38]:
        values = []
        for x in [0,.05,.1,.15,.2,.25,.3,.35,.4]:
            hit, _, _, _ = tree.ray_cast(Vector((x,2,z)), Vector((0,-1,0)))
            values.append(round(hit.y,6) if hit else None)
        rows.append({'z': z, 'posteriorY': values})
    return {'x': [0,.05,.1,.15,.2,.25,.3,.35,.4], 'rows': rows}


measured_before = measurements()
# Measured neck depth is .135, not the shallow ear-root plane. These guide
# sections remove the local patch while retaining the neck's actual depth.
lower_profile = [
    [-.40,.134,3.5],[-.34,.140,3.1],[-.30,.148,2.5],
    [-.26,.159,1.7],[-.22,.180,.9],[-.18,.200,.6],
]
changed = set()
for vertex in body.data.vertices:
    x, y, z = original[vertex.index]
    posterior = ease((y-.025)/.075)
    delta = 0.0
    if abs(x) < .40 and -.24 < z < .36:
        delta = (.054 * math.cos(math.pi*x/.80)**2
                 * math.sin(math.pi*(z+.24)/.60)**2 * posterior)
    lower_weight = (ease((.21-abs(x))/.07) * ease((z+.38)/.05)
                    * ease((-.18-z)/.04) * ease((y-.055)/.060))
    if lower_weight:
        center, curvature = profile(lower_profile, z)
        target = center-curvature*x*x
        delta += (target-y)*lower_weight
    if abs(delta) > 1e-12:
        vertex.co.y += delta
        changed.add(vertex.index)
body.data.update()
after = require_single_closed_mesh(body, args.out, 'Reshaped occipital surface')
measured_after = measurements()
outside_maximum = max((v.co-original[v.index]).length for v in body.data.vertices
                      if v.index not in changed)
inside_maximum = max((v.co-original[v.index]).length for v in body.data.vertices
                     if v.index in changed)
for polygon in body.data.polygons:
    polygon.use_smooth = True
bpy.context.view_layer.objects.active = body
body.select_set(True)
bpy.ops.mesh.customdata_custom_splitnormals_clear()
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'occiput-refinement.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance,
    'sourceSha256': sha(args.base), 'before': before, 'after': after,
    'method': 'Bounded posterior depth displacement plus measured lower cranial guide',
    'bulge': {'maximumDepth': .054, 'xSupport': [-.40,.40],
              'zSupport': [-.24,.36], 'posteriorYFade': [.025,.100]},
    'lowerProfile': lower_profile, 'lowerSupport': {'absoluteX': .21, 'z': [-.38,-.18]},
    'measurementsBefore': measured_before, 'measurementsAfter': measured_after,
    'changedVertices': len(changed), 'maximumDisplacementInside': inside_maximum,
    'maximumDisplacementOutside': outside_maximum,
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb','.blend']}
}, indent=2)+'\n')
