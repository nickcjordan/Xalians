"""Trunk side-profile edges from horizontal sections of the assembled skin, for the loop's trunk criteria.

torso_sections.py keeps only the width and depth of the torso loop, and its loop can include a hanging arm
that touches the trunk, so it cannot say where the front edge and the back edge are. This script cuts the
skin at fixed fit rows and, in the loop that holds the body centerline, records the front edge (smallest y)
and back edge (largest y) of the TRUNK ITSELF: only the cut points inside a lateral window around the
centerline count, so an arm that merges at the flank and a tail root that overlaps in x are both excluded.
The window is the narrowest trunk half width (.0655 at the waist) plus a margin, in figure heights.

  blender -b --factory-startup --python trunk_edge_sections.py -- --mesh akinza.glb --out trunk-profile.json

Values are world units (y forward is negative); loop_tools.trunk_profile converts them to fit units with the
species centerline. Rows are fit fractions of the fixed figure height, as in torso_sections.py.
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
# Rows .26 to .50 every .02 are the sheet's stations. Below about .50 the tail roots touch the trunk inside the
# window, so the back edge is not the trunk's; the front edge stays valid.
parser.add_argument('--y0', type=float, default=.26)
parser.add_argument('--y1', type=float, default=.56)
parser.add_argument('--step', type=float, default=.02)
parser.add_argument('--window', type=float, default=.07, help='lateral half window about world x 0, figure heights')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
FLOOR_Z, FIXED_HEIGHT = -.957, 1.8605

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.mesh.resolve()))
skin = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
source = bmesh.new()
source.from_mesh(skin.data)
source.transform(skin.matrix_world.copy())
window = args.window*FIXED_HEIGHT


def loops_at(z):
    bm = source.copy()
    cut = bmesh.ops.bisect_plane(bm, geom=bm.verts[:]+bm.edges[:]+bm.faces[:], plane_co=Vector((0, 0, z)),
                                 plane_no=Vector((0, 0, 1)))
    adjacency = {}
    for e in cut['geom_cut']:
        if isinstance(e, bmesh.types.BMEdge):
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
fraction = args.y0
while fraction <= args.y1+1e-9:
    z = FLOOR_Z+FIXED_HEIGHT*(1-fraction)
    loops = [p for p in loops_at(z) if min(q[0] for q in p) <= 0 <= max(q[0] for q in p)]
    row = {'at': round(fraction, 4), 'z': round(z, 4), 'loops': len(loops), 'front': None, 'back': None}
    if loops:
        # The trunk loop is the one reaching furthest forward (a tail root crosses x 0 behind it).
        points = min(loops, key=lambda p: min(q[1] for q in p))
        inside = [q for q in points if abs(q[0]) <= window]
        if inside:
            row['front'] = round(min(q[1] for q in inside), 5)
            row['back'] = round(max(q[1] for q in inside), 5)
            row['halfWidth'] = round((max(q[0] for q in points)-min(q[0] for q in points))/2, 5)
    rows.append(row)
    fraction += args.step
args.out.write_text(json.dumps({'scope': 'Trunk front and back edge y (world) per fit row, from horizontal sections of the skin, '
                                'inside a lateral window about world x 0 so arms and tails are excluded',
                                'windowFit': args.window, 'rows': rows}, indent=1)+'\n')
print('trunk edge sections', args.out)
