"""Carry per-polygon materials from an earlier head onto a rebuilt one (loop round 11, R04).

Run with Blender (through loop_tools.py blender):
  --python carry_materials_field.py -- --scene <rebuilt head.blend> --source <earlier head.blend> --out <new-dir>

A field-space stage (author_rear_lock_table_field.py, shape_*_field.py) meshes the skin again, and the new mesh has every
polygon on material slot 0. Anything the earlier head carried per polygon is lost: the pale inner-ear coat the fan front
lock system (R03) paints on its tufts, for example. Rounds 8 and 9 rebuilt the rear and the front tufts went mid grey.
This script gives every polygon of the rebuilt skin the material of the nearest polygon of the earlier skin, matching
slots by material name and adding any the rebuilt head lacks. Geometry is not touched: the vertex positions are exactly
those of the input, so only material indices, the glTF and the .blend are new.
"""
import argparse
import json
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import material, mesh_stats, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.source])


def skin(blend):
    bpy.ops.wm.open_mainfile(filepath=str(blend.resolve()))
    obj = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    return obj


src = skin(args.source)
M = src.matrix_world.copy()
src_pts = [tuple(float(c) for c in (M @ v.co)) for v in src.data.vertices]
src.data.calc_loop_triangles()
tris = np.empty(len(src.data.loop_triangles)*3, dtype=np.int32)
src.data.loop_triangles.foreach_get('vertices', tris)
poly_of_tri = np.empty(len(src.data.loop_triangles), dtype=np.int32)
src.data.loop_triangles.foreach_get('polygon_index', poly_of_tri)
poly_mat = np.empty(len(src.data.polygons), dtype=np.int32)
src.data.polygons.foreach_get('material_index', poly_mat)
src_names = [m.name if m else None for m in src.data.materials]
src_grays = [float(m.diffuse_color[0]) if m else .5 for m in src.data.materials]
tree = BVHTree.FromPolygons(src_pts, tris.reshape(-1, 3).tolist())
counts_before = {src_names[i] if i < len(src_names) else str(i): int((poly_mat == i).sum()) for i in range(len(src_names))}

head = skin(args.scene)
M2 = head.matrix_world.copy()
mesh = head.data
names = [m.name if m else None for m in mesh.materials]
slot_of = {}
for idx, (name, gray) in enumerate(zip(src_names, src_grays)):
    if name not in names:
        mesh.materials.append(material(name, gray))
        names.append(name)
    slot_of[idx] = names.index(name)
for polygon in mesh.polygons:
    _, _, tri_index, _ = tree.find_nearest(tuple(float(c) for c in (M2 @ polygon.center)))
    polygon.material_index = slot_of.get(int(poly_mat[poly_of_tri[tri_index]]), 0)
counts_after = {}
for polygon in mesh.polygons:
    nm = names[polygon.material_index] if polygon.material_index < len(names) else str(polygon.material_index)
    counts_after[nm] = counts_after.get(nm, 0)+1
require_single_closed_mesh(head, args.out, 'Head skin with carried materials')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'carry-materials.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sceneSha256': sha(args.scene), 'sourceSha256': sha(args.source),
    'scope': 'R04 round 11: per-polygon materials of the earlier head copied by nearest polygon; geometry unchanged',
    'sourcePolygonsByMaterial': counts_before, 'carriedPolygonsByMaterial': counts_after, 'skin': mesh_stats(head),
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
