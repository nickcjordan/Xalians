"""Measure the trunk of a body.blend by ray casts, in loop fit units (fractions of figure height), per fit row.

Run with Blender (through loop_tools.py blender):  --python trunk_measure.py -- <body.blend> <out.json> [--y0 .24 --y1 .62 --step .01]
Per row: front and back edge at x=0 (the first entry and the first exit along +y; the exit is only meaningful
above about .485, where the tail root has not merged), and the left half width (rays along -x from inside the trunk
at several y, outermost first exit) and the right half width. stripFront/stripBack are the y extent of the vertices in the tail-free strip x -.09 to -.06 (world), which stays valid
below .49 where the tail root merges at x=0. Used to write dense 'model' tables for
reshape_torso_field.py specs from the live body instead of from a stale measurement.
"""
import json
import sys

import bpy
import numpy as np
from mathutils import Vector

H, F, O = 1.8605, -.957, -.0191
argv = sys.argv[sys.argv.index('--')+1:]
path, out = argv[0], argv[1]
y0 = float(argv[argv.index('--y0')+1]) if '--y0' in argv else .24
y1 = float(argv[argv.index('--y1')+1]) if '--y1' in argv else .62
step = float(argv[argv.index('--step')+1]) if '--step' in argv else .01
bpy.ops.wm.open_mainfile(filepath=path)
ob = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))


def cast(origin, direction):
    ok, loc, n, i = ob.ray_cast(Vector(origin), Vector(direction))
    return loc if ok else None


rows = []
for fy in np.round(np.arange(y0, y1+1e-9, step), 4):
    z = F+H*(1-fy)
    hits, o = [], (0, -1.5, z)
    for _ in range(6):
        loc = cast(o, (0, 1, 0))
        if loc is None:
            break
        hits.append(loc.y)
        o = (0, loc.y+1e-4, z)
    front = hits[0] if hits else None
    back = hits[1] if len(hits) > 1 else None
    hw = {}
    for side, sx in (('left', -1), ('right', 1)):
        best = None
        if front is not None and back is not None:
            for yy in np.linspace(front+.03, back-.03, 7):
                loc = cast((0, yy, z), (sx, 0, 0))
                if loc is not None and (best is None or abs(loc.x) > best):
                    best = abs(loc.x)
        hw[side] = best
    strip = [v.co for v in ob.data.vertices if -.09 < v.co.x < -.06 and abs(v.co.z-z) < .003]
    sb = max((c.y for c in strip), default=None)
    sf = min((c.y for c in strip), default=None)
    rows.append({'stripFront': None if sf is None else round((sf-O)/H, 4), 'stripBack': None if sb is None else round((sb-O)/H, 4), 'y': round(float(fy), 3), 'front': None if front is None else round((front-O)/H, 4),
                 'back': None if back is None else round((back-O)/H, 4),
                 'halfLeft': None if hw['left'] is None else round(hw['left']/H, 4),
                 'halfRight': None if hw['right'] is None else round(hw['right']/H, 4)})
json.dump(rows, open(out, 'w'), indent=0)
print('wrote', out)
for r in rows:
    print(r)
