"""Read-only pixel and curve-contract probes before the last allowed build."""
import sys
import json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

before, out = map(Path, sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(before/'surface.blend'))
cu = bpy.data.objects['Akinza fur'].data
properties = {}
for prop in cu.curves[0].bl_rna.properties:
    if prop.identifier != 'rna_type' and prop.type in ('ENUM', 'INT', 'BOOLEAN', 'FLOAT'):
        value = getattr(cu.curves[0], prop.identifier)
        properties[prop.identifier] = list(value) if prop.is_array else value
angle = np.deg2rad(2.)
toward = Vector((0, -np.cos(angle), np.sin(angle)))
up = Vector((0, np.sin(angle), np.cos(angle)))
objects = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name.startswith('head_eye_globe_') or len(o.data.vertices)>500000)]
trees = [(o, BVHTree.FromObject(o, bpy.context.evaluated_depsgraph_get())) for o in objects]
probes = []
for x, y in [(550, 850), (550, 860), (550, 868), (550, 878), (550, 888)]:
    origin = Vector((.084, -.15, .650))+Vector(((x+.5-500)*.0002, 0, 0))+up*((500-y-.5)*.0002)+toward*2
    hits = []
    for ob, tree in trees:
        hit = tree.ray_cast(origin, -toward, 4)
        if hit[0] is not None:
            hits.append((hit[3], ob.name, int(hit[2])))
    probes.append(dict(pixel=[x, y], hits=sorted(hits)))
result = dict(attributes=[dict(name=a.name, type=a.data_type, domain=a.domain) for a in cu.attributes],
              curveProperties=properties, curveRnaProperties=[p.identifier for p in cu.curves[0].bl_rna.properties], probes=probes)
types = np.empty(len(cu.curves), np.int32)
cu.attributes['curve_type'].data.foreach_get('value', types)
keys, counts = np.unique(types, return_counts=True)
result['curveTypes'] = dict(zip(map(str, keys), map(int, counts)))
points = np.empty(len(cu.points)*3, np.float32)
cu.attributes['position'].data.foreach_get('vector', points)
points = points.reshape(-1, 3)
starts = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', starts)
lo, hi = np.minimum.reduceat(points, starts), np.maximum.reduceat(points, starts)
bpy.ops.wm.open_mainfile(filepath=str(out/'surface.blend'))
candidate = np.zeros(len(types), bool)
for ribbon in [o for o in bpy.data.objects if o.name.startswith('Akinza G1 ribbon ')]:
    box = np.array([v.co[:] for v in ribbon.data.vertices])
    candidate |= (hi >= box.min(0)-.005).all(1) & (lo <= box.max(0)+.005).all(1)
keys, counts = np.unique(types[candidate], return_counts=True)
result['curveTypesNearRibbons'] = dict(zip(map(str, keys), map(int, counts)))
(out/'diagnostics.json').write_text(json.dumps(result, indent=2))
print('EYELINER_DIAGNOSTICS', result, flush=True)
