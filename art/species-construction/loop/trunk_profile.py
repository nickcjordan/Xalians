"""Print the trunk's front and back surface y at chosen x, per z, for two body.blend files and their difference.

Run with Blender: --python trunk_profile.py -- --a <body.blend> --b <body.blend> --out <json> [--x 0 0.1] [--z0 .4 --z1 -.4 --step .01]
Ray casts along y against the largest mesh; used to find steps in a displacement (a sharp step between neighbouring z rows).
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument('--a', required=True); p.add_argument('--b', required=True); p.add_argument('--out', required=True)
p.add_argument('--x', type=float, nargs='*', default=[0, .08])
p.add_argument('--z0', type=float, default=.40); p.add_argument('--z1', type=float, default=-.40)
p.add_argument('--step', type=float, default=.01)
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])


def profile(path):
    bpy.ops.wm.open_mainfile(filepath=str(Path(path).resolve()))
    ob = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    dg = bpy.context.evaluated_depsgraph_get()
    out = {}
    for x in a.x:
        rows = []
        z = a.z0
        while z >= a.z1:
            hits = []
            o = Vector((x, -2, z))
            for _ in range(8):
                ok, loc, n, i = ob.ray_cast(o, Vector((0, 1, 0)))
                if not ok:
                    break
                hits.append(loc.y); o = loc+Vector((0, 1e-5, 0))
            rows.append([round(z, 4), hits[0] if hits else None, hits[-1] if hits else None])
            z -= a.step
        out[str(x)] = rows
    return out
pa, pb = profile(a.a), profile(a.b)
res = {'a': pa, 'b': pb}
Path(a.out).write_text(json.dumps(res))
