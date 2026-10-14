"""Akinza fore paws refine v1: the skin's triangles inside each fore paw subdivided (flat, conforming) so the toes, pads and
nail-bed folds of the hands step can be resolved; nothing moves.

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), appended after P-earroot2 and before the
hands step. Anatomy review 2026-10-13, finding 8. Hands v2 (coordinator review, 2026-10-13) showed that the paw's vertex
spacing (median edge .00246) is too coarse for toes, nail-bed folds and pad edges: a fold only four edges across folded the
mesh, and toes and pads printed lumpy edges. The coordinator asked for a local refinement to about .0007 inside the paw
box, blended into the wrist with no seam.

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python paws_refine_v1_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/paws-refine-v1.json

Method: for each level in the spec, every edge of the skin whose two ends lie inside the level's region (|x| above xMin,
y in [yMin, yMax], z in [zMin, zMax]) is cut once at its midpoint (bmesh subdivide_edges, grid fill, `smooth` from the spec: 1 places each new vertex on the curve through its edge's ends instead of on the flat chord, so shading shows no facets). The faces at the
region's edge are split by bmesh's fill patterns, so the result is conforming (no T-junctions) and stays one closed
component. Only n-gons the fill patterns leave are triangulated; the skin's own quads stay. Old vertices do not move; with smooth 0 new vertices lie on the old faces (chord sag about .00002 at this edge length),
so there is no seam into the wrist: the hands step reshapes the paw afterwards. Every new face keeps its material index. Level 1 covers the paw below the wrist, level 2 the
toes and pads. By position, never by vertex index; the vertex count changes (as the tails remesh does; nothing downstream
depends on it). Record: paws-refine-v1.json.
"""
import argparse
import json
import sys
import time
from pathlib import Path

import bpy
import bmesh
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, sha

T0 = time.time()


def tick(message):
    print(f'[{time.time()-T0:7.1f}s] {message}', flush=True)


p = argparse.ArgumentParser()
p.add_argument('--asm', type=Path, default=None)
p.add_argument('--out', type=Path, default=None)
p.add_argument('--spec', type=Path, required=True)
p.add_argument('--dry', action='store_true')
p.add_argument('--blend', type=Path, default=None)
p.add_argument('--saveas', type=Path, default=None, help='development: save the refined blend here (with --dry)')
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
spec = json.loads(args.spec.read_text(encoding='utf-8'))

bpy.ops.wm.open_mainfile(filepath=str(Path(args.blend if args.dry else args.out/'akinza.blend').resolve()))
skin = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
if not np.allclose(np.array(skin.matrix_world), np.eye(4)):
    raise SystemExit('the skin object is expected at the identity transform')
me = skin.data
nv0, nf0 = len(me.vertices), len(me.polygons)
co = np.empty(nv0*3)
me.vertices.foreach_get('co', co)
V0 = co.reshape(-1, 3).copy()
mats0 = np.empty(nf0, np.int32)
me.polygons.foreach_get('material_index', mats0)
tick(f'skin {skin.name}: {nv0} vertices, {nf0} faces, materials {np.unique(mats0).tolist()}')

bm = bmesh.new()
bm.from_mesh(me)
levels = []
for lv in spec['levels']:
    bm.verts.ensure_lookup_table()
    bm.edges.ensure_lookup_table()

    def inside(v):
        x, y, z = v.co
        return abs(x) > lv['xMin'] and lv['yMin'] < y < lv['yMax'] and lv['zMin'] < z < lv['zMax']
    edges = [e for e in bm.edges if inside(e.verts[0]) and inside(e.verts[1])]
    lens = np.array([e.calc_length() for e in edges])
    bmesh.ops.subdivide_edges(bm, edges=edges, cuts=1, smooth=float(spec.get('smooth', 0.0)), use_grid_fill=True, use_single_edge=False)
    levels.append({'region': lv, 'edgesCut': len(edges), 'edgeMedianBefore': float(np.median(lens)) if len(lens) else None})
    tick(f'level: cut {len(edges)} edges (median length {levels[-1]["edgeMedianBefore"]:.5f})')
ngons = [f for f in bm.faces if len(f.verts) > 4]
if ngons:
    bmesh.ops.triangulate(bm, faces=ngons)
tick(f'triangulated {len(ngons)} n-gons left by the fill patterns')
bm.to_mesh(me)
bm.free()
me.update()

nv1, nf1 = len(me.vertices), len(me.polygons)
co = np.empty(nv1*3)
me.vertices.foreach_get('co', co)
V1 = co.reshape(-1, 3)
mats1 = np.empty(nf1, np.int32)
me.polygons.foreach_get('material_index', mats1)
# the old vertices keep their positions (bmesh keeps the original vertices first; float32 noise only)
moved_old = float(np.abs(V1[:nv0]-V0).max())
me.calc_loop_triangles()
tris = np.empty(len(me.loop_triangles)*3, np.int32)
me.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
cen = V1[tris].mean(1)
L = levels[-1]['region']
inner = (np.abs(cen[:, 0]) > L['xMin']+.005) & (cen[:, 1] > L['yMin']) & (cen[:, 1] < L['yMax']) & (cen[:, 2] < L['zMax']-.005) & (cen[:, 2] > L['zMin']+.005)
el = np.concatenate([np.linalg.norm(V1[tris[inner][:, i]]-V1[tris[inner][:, (i+1) % 3]], axis=1) for i in range(3)])
# distance of every new vertex from the old surface (flat subdivision: 0 up to rounding)
st = mesh_stats(skin)
stats = {'verticesBefore': nv0, 'verticesAfter': nv1, 'facesBefore': nf0, 'facesAfter': nf1, 'oldVerticesMovedMax': moved_old,
         'materialsBefore': np.unique(mats0).tolist(), 'materialsAfter': np.unique(mats1).tolist(),
         'edgeMedianInnerAfter': float(np.median(el)), 'edgeP90InnerAfter': float(np.percentile(el, 90)), 'levels': levels,
         'newVertexBounds': [V1[nv0:].min(0).round(4).tolist(), V1[nv0:].max(0).round(4).tolist()] if nv1 > nv0 else None}
tick(json.dumps(stats))
if moved_old > 1e-6:
    raise SystemExit('an existing vertex moved')
if st['components'] != 1 or st['nonManifoldEdges'] != 0:
    raise SystemExit(f'refined skin is not one closed component: {st}')
if args.dry:
    if args.saveas:
        bpy.ops.wm.save_as_mainfile(filepath=str(args.saveas))
    tick('dry run: nothing saved to an assembly')
    raise SystemExit(0)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
asm_record = json.loads((args.out/'assembly.json').read_text(encoding='utf-8'))
asm_record['objects'][skin.name] = {'components': st['components'], 'nonManifoldEdges': st['nonManifoldEdges'], 'vertices': st['vertices']}
asm_record['outputs'] = {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']}
(args.out/'assembly.json').write_text(json.dumps(asm_record, indent=1)+'\n', encoding='utf-8')
record = {'approval': None, 'step': 'fore paws refine v1 (post-assembly)', 'input': str(args.asm), 'spec': spec,
          'specSha256': sha(args.spec), 'scriptSha256': sha(Path(__file__)), 'stats': stats, 'skinAfter': st,
          'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'paws-refine-v1.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
tick(f'done: {st}')
