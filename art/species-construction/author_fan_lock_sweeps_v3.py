"""Layered lock sweeps for the ear fan front (R03, loop v3 round 22): the front coat locks and the pale tuft as separate closed
swept solids over a recessed backing, joined to the head in a root band, with the cup authored as a bowl.

Run with Blender (through loop_tools.py blender, or as a recipe step):
  blender -b --factory-startup --python author_fan_lock_sweeps_v3.py --
    --scene <head.blend> --out <new dir> --table specs/r03_clumps.json --envelope specs/r03_envelope.npz --spec specs/r03_sweeps_v3.json
    [--p section.spine=.3 ...] [--sides L,R] [--bandwidth 12]

The construction, the frames and the default of every lever are in fan_lock_sweeps_v3.py (numpy only). This file is the Blender and
OpenVDB wrapper: it opens the head scene, converts the skin to a level set, copies a dense crop around each wing, runs
fan_lock_sweeps_v3.build_wing on it (each lock solid is voxelized here with OpenVDB createLevelSetFromPolygons), writes the crops
back, meshes the level set once, keeps one closed component and paints the faces next to the pale tuft sweeps with the
`Pale inner-ear coat` material (assignment only; the skin stays one mesh). Nothing outside the two wing crops is edited.

Interface
  --scene     head.blend of the step this one follows (H35)
  --table     the clump table (art/species-construction/specs/r03_clumps.json, made from specs/R03.md section 2 by loop/r03_clump_table.py)
  --envelope  the sheet fan envelope (art/species-construction/specs/r03_envelope.npz, loop/r03_envelope.py)
  --spec      one JSON document of levers, merged over fan_lock_sweeps_v3.DEFAULTS (a recipe set/sweep edits it as spec:<dotted.path>):
      voxel     grid size in head-local units (default .0025, that is .00067 figure heights)
      strip     {u, yBlend, ramp, rampIn, bottom, maxDepth, depthRamp, midBlur}  the old front coat stripped down to the backing
      backing   {shift, depthBehindDeepest, minThickness, blur}                   the surface the locks stand off
      layers    [{name, ids (fnmatch on clump names), layer, standoff, standoffFrom, standoffTo, undercut, lengthScale, widthScale,
                  thickScale}]                                                      layer 1 is set back `standoff` toward the tips
      section   {p, spine, twistDeg, widthScale, thickScale, camber, lowerRow, lowerScale, rings, around}
      tips      {minHalfWidth, minHalfThick, length, taperScale, thickTaperScale}
      union     {rootBand, rootRamp, rootBlend, rootCap, rearMargin, rearClip, seamBlur, seamStripReach, seamCupReach, seamFade,
                 ceilingBlend}
      cup       {polygons, yawDeg, floorStart, floorMax, bowl, dish, fillet, skullRamp, shift}
      tuft      {ids, standoff, liftFrom, widthScale, thickScale, tipHalfWidth, rootBand, rootBlend, floorBlend, twistDeg}
      pale      {tol, gray, smooth}  the pale material: face distance to a tuft solid (figure heights), base colour value, majority passes
      clumps    per-clump edits of the table rows, {"LP5": {"tip": [x, y, df], "widthMid": .05}, "?S*": {"standoff": .014}}
      addClumps v2: whole clump rows appended to the table (the v2 spec re-fans the pale tuft as eight narrow blades per side)
      skip      comma list of clump names (or names without the side letter) to leave out
  --p key.sub=value   a lever as a dotted path and a python literal, repeatable (replaces the spec's value)
  Outputs: head.blend, shape.glb, fan-sweeps.json (resolved levers, per lock length, tip radius, tip standoff, joined voxels, backing,
  tip clearance, envelope missing and extra, cup yaw, pale area front and side, skinTopZ, components, nonManifoldEdges, hashes),
  source-snapshot/. One closed component; skinTopZ at or below the baseline plus .0004.
"""
import argparse
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
import fan_lock_sweeps_v3 as fls  # noqa: E402
import fan_clumps_fast_common as fc  # noqa: E402
from blender_blockout import material, sha  # noqa: E402
from study_provenance import snapshot  # noqa: E402

T_START = time.time()
LOCKS = []
SECTIONS = {}
S = fls.S
BOXES = {'L': ([.22, -.42, -.32], [1.12, .50, .62]), 'R': ([-1.12, -.42, -.32], [-.22, .50, .62])}


def tick(msg):
    print(f'[{time.time()-T_START:7.1f}s] {msg}', flush=True)


parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--table', type=Path, default=HERE/'specs/r03_clumps.json')
parser.add_argument('--envelope', type=Path, default=HERE/'specs/r03_envelope.npz')
parser.add_argument('--spec', type=Path, default=HERE/'specs/r03_sweeps_v3.json')
parser.add_argument('--p', action='append', help='a lever as a dotted path and a python literal, e.g. section.spine=.3')
parser.add_argument('--sides', default='L,R')
parser.add_argument('--bandwidth', type=int, default=12)
parser.add_argument('--ceiling', type=float, default=.0004, help='nothing rises above the baseline skin top plus this (head-local)')
parser.add_argument('--max-island', type=int, default=5000)
parser.add_argument('--debug-owner', action='store_true', help='debug: paint faces within a voxel of a layer 1 solid red and of a layer 2 solid blue (materials 1 and 2 of the head)')
parser.add_argument('--export-locks', type=Path, default=None, help='debug: also write every lock solid as its own mesh object to this .blend (head-local, the head placement is the clay renderer placement)')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])


def trilinear(arr, origin, vs, pts, band):
    """Sample a dense block (origin = voxel index of arr[0, 0, 0]) at head-local points; band outside the block."""
    f = pts/vs-origin
    i0 = np.floor(f).astype(int)
    fr = f-i0
    ok = np.all((i0 >= 0) & (i0 < np.array(arr.shape)-1), axis=1)
    i0 = np.clip(i0, 0, np.array(arr.shape)-2)
    v = np.zeros(len(pts))
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (fr[:, 0] if dx else 1-fr[:, 0])*(fr[:, 1] if dy else 1-fr[:, 1])*(fr[:, 2] if dz else 1-fr[:, 2])
                v += w*arr[i0[:, 0]+dx, i0[:, 1]+dy, i0[:, 2]+dz]
    return np.where(ok, v, band)


def main():
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=False)
    spec = json.loads(Path(args.spec).read_text())
    provenance = snapshot(out, __file__, [args.scene, args.table, args.envelope, args.spec])
    for name in ('fan_lock_sweeps_v3.py', 'fan_clumps_front_fast_v2.py', 'fan_clumps_fast_common.py'):
        shutil.copyfile(HERE/name, out/'source-snapshot'/name)
    P = fls.merge(fls.DEFAULTS, spec)
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
    table = fls.apply_clump_edits(table, P['clumps'])+[dict(c) for c in P.get('addClumps', [])]
    env = dict(np.load(args.envelope))

    bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
    head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    before = fc.require_single_closed(head, out, 'Head skin before fan lock sweeps')
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

    infos, tufts = {}, {}
    lo_of = {}
    for side in args.sides.split(','):
        a, b = BOXES[side]
        lo = np.floor(np.array(a)/VS).astype(int)
        hi = np.ceil(np.array(b)/VS).astype(int)
        shape = np.array([int(v) for v in hi-lo+1])
        lo_of[side] = lo
        crop = np.empty(tuple(shape), dtype=np.float32)
        grid.copyToArray(crop, ijk=tuple(int(v) for v in lo))

        def voxelize(verts, tri, lo=lo, shape=shape):
            LOCKS.append((verts, tri))
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

        new, tuft_list, info = fls.build_wing(crop, lo, VS, side, table, env, P, voxelize, band)
        del crop
        grid.copyFromArray(new, ijk=tuple(int(v) for v in lo))
        sec_ = info.pop('_sections')
        SECTIONS.update(sec_)
        SECTIONS[f'{side}_origin'] = np.array(info.pop('_origin'))
        infos[side] = info
        tufts[side] = [(sl, d, lo) for sl, d in tuft_list]
        del new
        tick(f'wing {side} done')
    if args.export_locks:
        lock_meshes = []
        for k, (v_, t_) in enumerate(LOCKS):
            m_ = bpy.data.meshes.new(f'lock{k}')
            m_.from_pydata(v_.tolist(), [], t_.tolist())
            m_.update()
            lock_meshes.append(m_)
    vertices, tri_out, quads = grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
    vertices = vertices.astype(np.float64)
    if np.abs(vertices).max() > 5*np.abs(points).max():
        vertices = vertices*VS                      # the mesher returned index space
    tick('meshed')
    materials = list(head.data.materials)
    mesh = fc.build_mesh(bpy, 'Head skin with front lock sweeps', vertices, tri_out, quads)
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
    names = [m.name if m else None for m in mesh.materials]
    if 'Pale inner-ear coat' in names:
        pale_index = names.index('Pale inner-ear coat')
    else:
        mesh.materials.append(material('Pale inner-ear coat', P['pale']['gray']))
        pale_index = len(mesh.materials)-1
    fc.set_all_smooth(mesh)
    fc.transform_vertices(mesh, M.inverted())
    bpy.data.meshes.remove(old)
    removed_flecks, removed_islands, after = fc.clean_and_check(head, 6*VS, args.max_island, out, 'Head skin with front lock sweeps')
    removed_islands = [{'vertices': r['vertices']} for r in removed_islands]
    tick('mesh cleaned')

    # pale material: faces whose centre lies within pale.tol of a tuft solid
    count = len(head.data.polygons)
    centers = np.empty(count*3, dtype=np.float32)
    head.data.polygons.foreach_get('center', centers)
    world = centers.reshape(-1, 3).astype(np.float64)@np.array(M)[:3, :3].T+np.array(M)[:3, 3]
    marked = np.zeros(count, dtype=bool)
    for side, lst in tufts.items():
        near = (world[:, 0] > 0) if side == 'L' else (world[:, 0] < 0)
        ids = np.nonzero(near)[0]
        for sl, d, lo in lst:
            origin = lo+np.array([s_.start for s_ in sl])
            v = trilinear(d, origin, VS, world[ids], band)
            marked[ids[v <= P['pale']['tol']*S]] = True
    if P['pale']['smooth'] > 0:
        mesh_ = head.data
        loop_total = np.empty(count, dtype=np.int32)
        mesh_.polygons.foreach_get('loop_total', loop_total)
        edge_index = np.empty(len(mesh_.loops), dtype=np.int32)
        mesh_.loops.foreach_get('edge_index', edge_index)
        face_of = np.repeat(np.arange(count), loop_total)
        order = np.argsort(edge_index, kind='stable')
        ei_s, fl_s = edge_index[order], face_of[order]
        same = ei_s[1:] == ei_s[:-1]
        fa, fb = fl_s[:-1][same], fl_s[1:][same]
        deg = np.bincount(fa, minlength=count)+np.bincount(fb, minlength=count)
        for _ in range(P['pale']['smooth']):
            nearc = np.bincount(fa, weights=marked[fb], minlength=count)+np.bincount(fb, weights=marked[fa], minlength=count)
            marked = np.where(nearc*2 > deg, True, np.where(nearc*2 < deg, False, marked))
    mats = np.zeros(count, dtype=np.int32)
    mats[marked] = pale_index
    if args.debug_owner:
        colors = {1: material('Debug layer 1', .15), 2: material('Debug layer 2', .85)}
        idx = {}
        for lay, mat in colors.items():
            mesh.materials.append(mat)
            idx[lay] = len(mesh.materials)-1
        for side_, lay, sl, d in fls.OWNERS:
            if lay not in idx:
                continue
            near = (world[:, 0] > 0) if side_ == 'L' else (world[:, 0] < 0)
            ids = np.nonzero(near)[0]
            origin = lo_of[side_]+np.array([s_.start for s_ in sl])
            v = trilinear(d, origin, VS, world[ids], band)
            mats[ids[(v <= 1.2*VS) & (mats[ids] == 0)]] = idx[lay]
    head.data.polygons.foreach_set('material_index', mats)
    head.data.update()
    zs = np.empty(len(head.data.vertices)*3, dtype=np.float32)
    head.data.vertices.foreach_get('co', zs)
    top_after = float((zs.reshape(-1, 3).astype(np.float64)@np.array(M)[2, :3]+np.array(M)[2, 3]).max())
    bpy.ops.export_scene.gltf(filepath=str(out/'shape.glb'), export_format='GLB')
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'head.blend'))
    tick('saved')
    np.savez_compressed(out/'sections.npz', voxel=VS, **SECTIONS)
    if args.export_locks:
        for m_ in lock_meshes:
            o_ = bpy.data.objects.new(m_.name, m_)
            bpy.context.scene.collection.objects.link(o_)
        head.hide_render = True
        bpy.ops.wm.save_as_mainfile(filepath=str(args.export_locks))
    record = {
        'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
        'tableSha256': sha(args.table), 'envelopeSha256': sha(args.envelope), 'specSha256': sha(args.spec),
        'moduleSha256': {n: hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in ('fan_lock_sweeps_v3.py', 'fan_clumps_front_fast_v2.py', 'fan_clumps_fast_common.py')},
        'scope': 'R03: ear fan front stripped to a backing and regrown as layered lock sweeps (coat P, S, D; tuft T), cup bowl, field space; rear half and face untouched',
        'levers': {k: v for k, v in P.items() if k != 'clumps'}, 'clumpEdits': P['clumps'],
        'arguments': {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items()},
        'wings': infos, 'skinTopZ': {'ceiling': ztop, 'after': top_after}, 'paleFaces': int(marked.sum()), 'paleMaterialIndex': pale_index,
        'removedFlecks': removed_flecks, 'removedIslands': removed_islands, 'skinBefore': before, 'skinAfter': after,
        'outputs': {q.name: sha(q) for q in out.iterdir() if q.suffix in ['.glb', '.blend']},
    }
    (out/'fan-sweeps.json').write_text(json.dumps(record, indent=2, default=str)+'\n')
    print('fan lock sweeps ok', json.dumps({'before': before, 'after': after, 'pale': int(marked.sum())}))


main()
