"""Torso widths from horizontal sections of the assembled skin, for loop measurements.

Silhouette rows merge the torso with an arm or a tail whenever one of them shows
through a gap; that made a round-16 waist read 1.28x the sheet when the torso was
1.07x. A horizontal section separates them: at each height the skin cuts into
closed loops, and the torso is the loop around the body axis.

  blender -b --factory-startup --python torso_sections.py -- --mesh akinza.glb --out torso.json
"""
import argparse
import json
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--mesh', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
# Rows as fractions of the fixed figure height from the top, matching loop_tools.
parser.add_argument('--rows', default='.18,.20,.22,.24,.26,.28,.30,.32,.34,.36,.38,.40,.42,.44,.46,.48,.50,.52,.54,.56')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
FLOOR_Z, FIXED_HEIGHT = -.957, 1.8605

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.mesh.resolve()))
skin = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
world = skin.matrix_world.copy()
source = bmesh.new()
source.from_mesh(skin.data)
source.transform(world)
xs = [v.co.x for v in source.verts]
axis_x = (min(xs)+max(xs))/2


def loops_at(z):
    bm = source.copy()
    geom = bm.verts[:]+bm.edges[:]+bm.faces[:]
    cut = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector((0, 0, z)), plane_no=Vector((0, 0, 1)))
    edges = [e for e in cut['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
    # Group cut edges into connected loops.
    adjacency = {}
    for e in edges:
        a, b = e.verts
        adjacency.setdefault(a, []).append(b)
        adjacency.setdefault(b, []).append(a)
    seen, loops = set(), []
    for start in adjacency:
        if start in seen:
            continue
        stack, points = [start], []
        while stack:
            v = stack.pop()
            if v in seen:
                continue
            seen.add(v)
            points.append((v.co.x, v.co.y))
            stack.extend(adjacency[v])
        if len(points) >= 8:
            loops.append(points)
    bm.free()
    return loops


rows = []
for fraction in [float(f) for f in args.rows.split(',')]:
    z = FLOOR_Z+FIXED_HEIGHT*(1-fraction)
    loops = loops_at(z)
    best = None
    for points in loops:
        px = [p[0] for p in points]
        py = [p[1] for p in points]
        # The torso loop spans the body axis; pick the widest loop that contains it.
        if min(px) <= axis_x <= max(px):
            width = max(px)-min(px)
            if not best or width > best['width']:
                best = {'width': width, 'depth': max(py)-min(py), 'loops': len(loops)}
    rows.append({'at': fraction, 'z': round(z, 4),
                 'width': round(best['width']/FIXED_HEIGHT, 4) if best else None,
                 'depth': round(best['depth']/FIXED_HEIGHT, 4) if best else None,
                 'loopsAtHeight': len(loops)})
args.out.write_text(json.dumps({'scope': 'Torso loop widths (x) and depths (y) from horizontal sections of the skin, as fractions of the fixed figure height 1.8605',
                                'axisX': axis_x, 'rows': rows}, indent=1)+'\n')
print('torso sections', args.out)
