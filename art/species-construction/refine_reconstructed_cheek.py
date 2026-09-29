"""Taper existing cheek coat groups and remove shallow temple scan residue."""
import argparse
import json
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import mesh_stats, sha, require_single_closed_mesh

parser = argparse.ArgumentParser()
parser.add_argument('--base', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.base])
bpy.ops.wm.open_mainfile(filepath=str(args.base.resolve()))
body = bpy.data.objects['cleaned_head_with_openings']
before = require_single_closed_mesh(body, args.out, 'Input cheek construction')


def ease(t):
    t = max(0, min(1, t))
    return t*t*(3-2*t)


axes = [
    {'root': [.335, -.050], 'tip': [.440, -.130], 'bend': .010},
    {'root': [.310, -.155], 'tip': [.407, -.190], 'bend': .018},
    {'root': [.265, -.205], 'tip': [.320, -.224], 'bend': .010},
]


def axis_coordinates(x, z, axis):
    root, tip = Vector(axis['root']), Vector(axis['tip'])
    direction = tip-root
    position = Vector((abs(x), z))
    t = (position-root).dot(direction)/direction.length_squared
    center = root+direction*t
    distance = (position-center).length
    return t, center, distance


# Derive each distal lock's depth center from the actual native vertices.
for axis in axes:
    values = []
    for vertex in body.data.vertices:
        x, y, z = vertex.co
        if .25 < abs(x) < .47 and -.30 < z < .02 and -.18 < y < .045:
            t, _, distance = axis_coordinates(x, z, axis)
            if .72 < t < 1.10 and distance < .024:
                values.append(y)
    if not values:
        raise ValueError('Distal cheek lock measurement found no vertices')
    axis['depthBounds'] = [min(values), max(values)]
    axis['depthCenter'] = (min(values)+max(values))/2

changed = 0
maximum_displacement = 0
group = body.vertex_groups.new(name='Cheek coat transition')
for vertex in body.data.vertices:
    original = vertex.co.copy()
    x, y, z = original
    if not (.25 < abs(x) < .47 and -.30 < z < .02 and -.20 < y < .06):
        continue
    choices = []
    for axis in axes:
        t, center, distance = axis_coordinates(x, z, axis)
        strength = (ease((t-.52)/.40)*ease((1.22-t)/.20)
                    *ease((.055-distance)/.030)*ease((.06-y)/.045))
        choices.append((strength, t, center, axis))
    strength, t, center, axis = max(choices, key=lambda item: item[0])
    if strength <= 0:
        continue
    position = Vector((abs(x), z))
    tapered = position.lerp(center, .45*strength)
    tapered.y -= axis['bend']*strength
    vertex.co.x = tapered.x if x > 0 else -tapered.x
    vertex.co.z = tapered.y
    vertex.co.y = y+(axis['depthCenter']-y)*.35*strength
    group.add([vertex.index], strength, 'REPLACE')
    changed += 1
    maximum_displacement = max(maximum_displacement, (vertex.co-original).length)

bpy.context.view_layer.objects.active = body
body.select_set(True)
modifier = body.modifiers.new('Round tapered native coat tips', 'SMOOTH')
modifier.factor = .55
modifier.iterations = 35
modifier.vertex_group = group.name
bpy.ops.object.modifier_apply(modifier=modifier.name)

temple = body.vertex_groups.new(name='Temple scan residue')
for vertex in body.data.vertices:
    x, y, z = vertex.co
    weight = (ease((abs(x)-.325)/.020)*ease((.405-abs(x))/.030)
              *ease((z+.030)/.050)*ease((.24-z)/.060)*ease((.025-y)/.080))
    if weight > 0:
        temple.add([vertex.index], weight, 'REPLACE')
modifier = body.modifiers.new('Fair shallow temple scan bumps', 'SMOOTH')
modifier.factor = .6
modifier.iterations = 180
modifier.vertex_group = temple.name
bpy.ops.object.modifier_apply(modifier=modifier.name)
after = require_single_closed_mesh(body, args.out, 'Tapered cheek construction')
for polygon in body.data.polygons:
    polygon.use_smooth = True
bpy.ops.mesh.customdata_custom_splitnormals_clear()
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'cheek-refinement.json').write_text(json.dumps({
    'approval': None,
    'stageProvenanceSha256': provenance,
    'baseSha256': sha(args.base),
    'scope': 'Existing cheek coat groups only; no new locks, eyes or ears',
    'axes': axes,
    'changedVertices': changed,
    'maximumDisplacementBeforeFairing': maximum_displacement,
    'tipFairing': {'iterations': 35, 'factor': .55},
    'templeFairing': {'iterations': 180, 'factor': .6},
    'before': before, 'after': after,
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}
}, indent=2)+'\n')
