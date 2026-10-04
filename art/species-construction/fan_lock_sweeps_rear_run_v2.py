"""Blender and OpenVDB wrapper of fan_lock_sweeps_rear_v2.py (R04, loop v3 round 25). Called by author_fan_lock_sweeps_v5.py --part rear.

It opens the head scene (the H33 head), converts the skin to a level set, copies a dense crop around each wing (the left crop also
holds the crown tuft and the crown line across the centerline), runs fan_lock_sweeps_rear_v2.build_wing_rear on it (each lock solid is
voxelized here with OpenVDB createLevelSetFromPolygons), writes the crops back, meshes the level set once, keeps one closed component
and saves head.blend, shape.glb and fan-sweeps.json. The face is outside both crops' edits (the strip and backing act only behind the
rear plan and outside the crease).
"""
import ast
import hashlib
import json
from pathlib import Path
import shutil
import sys
import time

import bpy
import bmesh
import numpy as np
import openvdb as vdb

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fan_lock_sweeps_rear_v2 as flr  # noqa: E402
import fan_clumps_fast_common as fc  # noqa: E402
from blender_blockout import sha  # noqa: E402
from study_provenance import snapshot  # noqa: E402

S = flr.S
T_START = time.time()
# head-local boxes of the two crops. The left wing is head-local +x; the left crop reaches across the centerline to x -.20 for the
# crown tuft (all six clumps are built with it) and the crown line; the right crop reaches to +.20 and sees the left crop's result.
BOXES = {'L': ([-.20, -.42, -.32], [1.12, .50, .62]), 'R': ([-1.12, -.42, -.32], [.20, .50, .62])}
MODULES = ('fan_lock_sweeps_rear_v2.py', 'fan_lock_sweeps_v3.py', 'fan_clumps_front_fast_v2.py', 'fan_clumps_fast_common.py')


def tick(msg):
    print(f'[{time.time()-T_START:7.1f}s] {msg}', flush=True)


def run(args):
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=False)
    spec = json.loads(Path(args.spec).read_text())
    provenance = snapshot(out, args.entry, [args.scene, args.table, args.envelope, args.spec])
    for name in MODULES + ('fan_lock_sweeps_rear_run_v2.py',):
        shutil.copyfile(HERE/name, out/'source-snapshot'/name)
    P = flr.merge(flr.DEFAULTS, spec)
    for item in args.p or []:
        key, val = item.split('=', 1)
        path = key.split('.')
        node = P
        for part in path[:-1]:
            node = node[part]
        if path[-1] not in node:
            raise SystemExit(f'unknown lever {key}')
        node[path[-1]] = ast.literal_eval(val)
    table = json.loads(Path(args.table).read_text())['clumps']
    table = flr.fls.apply_clump_edits(table, P['clumps'])
    env = flr.Envelope(json.loads(Path(args.envelope).read_text()))

    bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
    head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    before = fc.require_single_closed(head, out, 'Head skin before fan rear lock sweeps')
    VS = P['voxel']
    M = head.matrix_world.copy()
    points = np.empty(len(head.data.vertices)*3, dtype=np.float32)
    head.data.vertices.foreach_get('co', points)
    points = (points.reshape(-1, 3).astype(np.float64)@np.array(M)[:3, :3].T+np.array(M)[:3, 3]).astype(np.float32)
    ztop = float(points[:, 2].max())+args.ceiling
    P['ceiling'] = ztop
    head.data.calc_loop_triangles()
    tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
    head.data.loop_triangles.foreach_get('vertices', tris)
    tris = tris.reshape(-1, 3)
    HALF = args.bandwidth
    band = HALF*VS
    transform = vdb.createLinearTransform(voxelSize=VS)
    grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris, transform=transform, halfWidth=HALF)
    tick('skin level set')

    infos = {}
    locks = []
    for side in args.sides.split(','):
        a, b = BOXES[side]
        lo = np.floor(np.array(a)/VS).astype(int)
        hi = np.ceil(np.array(b)/VS).astype(int)
        shape = np.array([int(v) for v in hi-lo+1])
        crop = np.empty(tuple(shape), dtype=np.float32)
        grid.copyToArray(crop, ijk=tuple(int(v) for v in lo))

        def voxelize(verts, tri, lo=lo, shape=shape):
            locks.append((verts, tri))
            g = vdb.FloatGrid.createLevelSetFromPolygons(verts.astype(np.float32), triangles=tri.astype(np.int32), transform=transform,
                                                         halfWidth=HALF)
            bb = g.evalActiveVoxelBoundingBox()
            if not bb:
                return None
            mn, mx = np.array(bb[0]), np.array(bb[1])
            a_ = np.maximum(mn-lo, 0)
            z_ = np.minimum(mx-lo+1, shape)
            if np.any(z_ <= a_):
                return None
            sub = np.empty(tuple(int(v) for v in z_-a_), dtype=np.float32)
            g.copyToArray(sub, ijk=tuple(int(v) for v in a_+lo))
            return tuple(slice(int(i), int(j)) for i, j in zip(a_, z_)), sub

        new, info = flr.build_wing_rear(crop, lo, VS, side, table, env, P, voxelize, band)
        del crop
        grid.copyFromArray(new, ijk=tuple(int(v) for v in lo))
        infos[side] = info
        del new
        tick(f'wing {side} done')
    vertices, tri_out, quads = grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
    vertices = vertices.astype(np.float64)
    if np.abs(vertices).max() > 5*np.abs(points).max():
        vertices = vertices*VS                      # the mesher returned index space
    tick('meshed')
    materials = list(head.data.materials)
    mesh = fc.build_mesh(bpy, 'Head skin with rear lock sweeps', vertices, tri_out, quads)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    old = head.data
    head.data = mesh
    for mat in materials:
        mesh.materials.append(mat)
    fc.set_all_smooth(mesh)
    fc.transform_vertices(mesh, M.inverted())
    bpy.data.meshes.remove(old)
    removed_flecks, removed_islands, after = fc.clean_and_check(head, 6*VS, args.max_island, out, 'Head skin with rear lock sweeps')
    removed_islands = [{'vertices': r['vertices']} for r in removed_islands]
    tick('mesh cleaned')
    zs = np.empty(len(head.data.vertices)*3, dtype=np.float32)
    head.data.vertices.foreach_get('co', zs)
    top_after = float((zs.reshape(-1, 3).astype(np.float64)@np.array(M)[2, :3]+np.array(M)[2, 3]).max())
    bpy.ops.export_scene.gltf(filepath=str(out/'shape.glb'), export_format='GLB')
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'head.blend'))
    tick('saved')
    top_y = (flr.Z0-top_after)/S
    for side, info in infos.items():
        info['crownTuftClearanceBelowTop'] = (round(info['crownTuftTipMinY']-top_y, 4) if info.get('crownTuftTipMinY') is not None else None)
    record = {
        'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
        'tableSha256': sha(args.table), 'envelopeSha256': sha(args.envelope), 'specSha256': sha(args.spec),
        'moduleSha256': {n: hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in MODULES},
        'scope': 'R04: ear fan rear stripped behind the mid-surface, a rear backing slab, and every rear lock (K, I, M, T, E) and crown tuft clump (C) as its own closed swept solid, field space; face and front untouched',
        'levers': {k: v for k, v in P.items() if k != 'clumps'}, 'clumpEdits': P['clumps'],
        'arguments': {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items()},
        'wings': infos, 'skinTopZ': {'ceiling': ztop, 'after': top_after}, 'topRowY': round(top_y, 5),
        'removedFlecks': removed_flecks, 'removedIslands': removed_islands, 'skinBefore': before, 'skinAfter': after,
        'outputs': {q.name: sha(q) for q in out.iterdir() if q.suffix in ['.glb', '.blend']},
    }
    (out/'fan-sweeps.json').write_text(json.dumps(record, indent=2, default=str)+'\n')
    print('fan rear lock sweeps ok', json.dumps({'before': before, 'after': after, 'locks': len(locks)}))
