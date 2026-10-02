"""Dump the head skin's level-set field around each ear wing to .npy files, for developing the R03 clump volume without Blender.

Run: loop_tools.py blender art/species-construction/loop/r03_dump_field.py -- --scene <head.blend> --out <dir>
Writes <dir>/fieldL.npy, fieldR.npy (float32, voxel .0025, narrow band 12 voxels) and wings.json (lo indices, voxel, boxes).
Head-local frame; the wing boxes are in head-local units.
"""
import argparse
import json
from pathlib import Path
import sys

import bpy
import numpy as np
import openvdb as vdb

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--bandwidth', type=int, default=12)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
M = head.matrix_world.copy()
print('matrix', [list(r) for r in M])
points = np.array([M @ v.co for v in head.data.vertices], dtype=np.float32)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
VS = args.voxel
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris, transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=args.bandwidth)
boxes = {'L': ([.22, -.42, -.32], [1.12, .50, .62]), 'R': ([-1.12, -.42, -.32], [-.22, .50, .62])}
info = {'voxel': VS, 'bandwidth': args.bandwidth}
for side, (a, b) in boxes.items():
    lo = np.floor(np.array(a)/VS).astype(int)
    hi = np.ceil(np.array(b)/VS).astype(int)
    shape = tuple(int(v) for v in hi-lo+1)
    arr = np.empty(shape, dtype=np.float32)
    grid.copyToArray(arr, ijk=tuple(int(v) for v in lo))
    np.save(args.out/f'field{side}.npy', arr)
    info[side] = {'lo': [int(v) for v in lo], 'shape': list(shape)}
    print(side, shape, float(arr.min()), float(arr.max()))
(args.out/'wings.json').write_text(json.dumps(info, indent=1))
