"""Graft a rebuilt face into a later head (loop round 10, R02).

Run with Blender: -b --factory-startup --python graft_face_field.py --
  --base <later head.blend> --donor <face-rebuilt head.blend> --out <new-dir> [--spec <window.json>]

The face script (rebuild_face_features_field.py) must run on the head it was written for (the one with the original eye
pocket), but later stages (rear locks, fan front locks) were built on top of its first output. This script avoids
replaying them: it makes OpenVDB level sets of both skins on one grid, blends the donor field into the base field inside
a smooth-edged face window, and meshes once. Outside the window the base head is untouched (the window must stay clear
of anything the later stages changed: measured, 0281 -> 0333 differ by under .002 for |x| < .34 and z < .30 in front).
The donor's other objects (eyes, iris, nose pad, mouth curves) are kept, because they were built for the donor's face.

Window (head-local, all optional): {"x": [full, zero], "z": [lo, hi], "zfade": f, "y": [full, zero]}, defaults
x [.30, .335], z [-.30, .30] fade .02, y [.02, .06] (full weight in front of the first y, zero behind the second).
"""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
import numpy as np
import openvdb as vdb

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import material, mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--base', type=Path, required=True)
parser.add_argument('--donor', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--spec', type=Path)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
cfg = json.loads(args.spec.read_text()) if args.spec else {}
VS = cfg.get('voxel', .0025)
HALF = 12
BAND = HALF*VS
WX = cfg.get('x', [.30, .335])
WZ = cfg.get('z', [-.30, .30])
ZF = cfg.get('zfade', .02)
WY = cfg.get('y', [.02, .06])
provenance = snapshot(args.out, __file__, [args.base, args.donor] + ([args.spec] if args.spec else []))


def skin_points(blend):
    bpy.ops.wm.open_mainfile(filepath=str(blend.resolve()))
    obj = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    require_single_closed_mesh(obj, args.out, f'skin of {blend.parent.name}')
    M = obj.matrix_world.copy()
    pts = np.array([M @ v.co for v in obj.data.vertices], dtype=np.float32)
    obj.data.calc_loop_triangles()
    tris = np.empty(len(obj.data.loop_triangles)*3, dtype=np.int32)
    obj.data.loop_triangles.foreach_get('vertices', tris)
    poly_index = np.empty(len(obj.data.loop_triangles), dtype=np.int32)
    obj.data.loop_triangles.foreach_get('polygon_index', poly_index)
    poly_mat = np.empty(len(obj.data.polygons), dtype=np.int32)
    obj.data.polygons.foreach_get('material_index', poly_mat)
    names = [m.name if m else None for m in obj.data.materials]
    grays = [float(m.diffuse_color[0]) if m else .5 for m in obj.data.materials]
    skin_info.append({'tri_material': poly_mat[poly_index], 'names': names, 'grays': grays})
    return pts, tris.reshape(-1, 3)


skin_info = []
base_pts, base_tris = skin_points(args.base)
donor_pts, donor_tris = skin_points(args.donor)
lo = np.floor(np.minimum(base_pts.min(axis=0), donor_pts.min(axis=0))/VS).astype(int)-30
hi = np.ceil(np.maximum(base_pts.max(axis=0), donor_pts.max(axis=0))/VS).astype(int)+30
shape = tuple(int(v) for v in hi-lo+1)


def field_of(pts, tris):
    grid = vdb.FloatGrid.createLevelSetFromPolygons(pts, triangles=tris, transform=vdb.createLinearTransform(voxelSize=VS),
                                                    halfWidth=HALF)
    arr = np.empty(shape, dtype=np.float32)
    grid.copyToArray(arr, ijk=tuple(int(v) for v in lo))
    return arr


base = field_of(base_pts, base_tris)
donor = field_of(donor_pts, donor_tris)


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


# window box in index space
xmax = WX[1]
a = np.floor(np.array([-xmax, -.6, WZ[0]-ZF])/VS).astype(int)-lo
b = np.ceil(np.array([xmax, WY[1]+.01, WZ[1]+ZF])/VS).astype(int)-lo+1
a = np.clip(a, 0, np.array(shape)-1)
b = np.clip(b, 0, np.array(shape))
sl = tuple(slice(int(i), int(j)) for i, j in zip(a, b))
axes = [(lo[i]+np.arange(s.start, s.stop))*VS for i, s in enumerate(sl)]
X, Y, Z = np.meshgrid(*axes, indexing='ij')
w = (smoothstep((WX[1]-np.abs(X))/(WX[1]-WX[0]))
     * smoothstep((Z-WZ[0])/ZF)*smoothstep((WZ[1]-Z)/ZF)
     * smoothstep((WY[1]-Y)/(WY[1]-WY[0]))).astype(np.float32)
before = base[sl].copy()
base[sl] = before+w*(donor[sl]-before)
change = float(np.abs(base[sl]-before).max())
agree = float(np.abs((donor[sl]-before)*(w < 1e-6)).max())
del donor

out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(base, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]

# Work in the donor scene: its eyes, nose and mouth curves belong to the donor face.
bpy.ops.wm.open_mainfile(filepath=str(args.donor.resolve()))
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
M = head.matrix_world.copy()
materials = list(head.data.materials)
before_stats = mesh_stats(head)
import bmesh
mesh = bpy.data.meshes.new('Head skin grafted face')
mesh.from_pydata(vertices.tolist(), [], faces)
mesh.update()
bm = bmesh.new(); bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh); bm.free()
old = head.data
head.data = mesh
for existing in materials:
    mesh.materials.append(existing)
# Per-polygon material assignment (for example the pale inner-ear coat) belongs to the base head: carry it over by
# nearest base triangle, adding any base material the donor lacks.
from mathutils.bvhtree import BVHTree
info = skin_info[0]
donor_names = [m.name if m else None for m in mesh.materials]
slot_of = {}
for idx, (name, gray) in enumerate(zip(info['names'], info['grays'])):
    if name in donor_names:
        slot_of[idx] = donor_names.index(name)
    else:
        mesh.materials.append(material(name, gray))
        donor_names.append(name)
        slot_of[idx] = len(donor_names)-1
btree = BVHTree.FromPolygons([tuple(float(c) for c in q) for q in base_pts], base_tris.tolist())
for polygon in mesh.polygons:
    polygon.use_smooth = True
    _, _, tri_index, _ = btree.find_nearest(tuple(polygon.center))   # still in world coordinates here
    polygon.material_index = slot_of.get(int(info['tri_material'][tri_index]), 0)
inverse = M.inverted()
for vertex in mesh.vertices:
    vertex.co = inverse @ vertex.co
bpy.data.meshes.remove(old)
removed = remove_voxel_specks(head, max_extent=6*VS)
require_single_closed_mesh(head, args.out, 'Head skin after face graft')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'graft.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'baseSha256': sha(args.base), 'donorSha256': sha(args.donor),
    'window': {'x': WX, 'z': WZ, 'zfade': ZF, 'y': WY}, 'maxFieldChangeInWindow': change,
    'donorMinusBaseOutsideWeight': agree, 'removedFlecks': removed, 'skinBefore': before_stats, 'skinAfter': mesh_stats(head),
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
