"""Blender and OpenVDB wrapper of fan_clumps_front.py (R03, loop v3 round 18). Called by author_fan_clumps_field.py --part front.

Opens the head scene, converts the skin to an OpenVDB level set, copies a dense crop around each ear wing, edits it with
fan_clumps_front.build_wing, writes the crops back, meshes the whole level set once, keeps one closed component, and paints the
faces next to the pale tuft clumps with the `Pale inner-ear coat` material (assignment only; the skin stays one mesh).
Nothing outside the two wing crops is edited (the strip, core and clumps all fade to nothing at the crop edges).
Every parameter is recorded in fan-clumps-front.json.

Interface (through author_fan_clumps_field.py --part front):
  --scene <head.blend> --out <new dir> --front-table <clump table json> --envelope <envelope npz> --spec <spec json>
  [--p key=value ...] [--sides L,R] [--voxel .0025] [--ceiling .0004]
  --front-table  art/species-construction/specs/r03_clumps.json, made from the clump tables of specs/R03.md by loop/r03_clump_table.py
  --envelope     art/species-construction/specs/r03_envelope.npz, the sheet fan outline as signed distance fields (loop/r03_envelope.py)
  --spec         the levers, one JSON document (a recipe `set`/`sweep` edits it as spec:<dotted.path>):
      params   every fan_clumps_front.DEFAULTS key (strip, core, blend radii, section, scales, cup floor, tuft); values here
               replace the defaults. A --p key=value on the command line replaces both.
      cups     {"L": [[x, y], ...], "R": [...]} cup polygons in the fit frame (front view x, y down from the crown)
      clumps   per-clump edits applied to the table rows: {"LP5": {"tip": [x, y, df], "widthMid": .05}, "*S": {"thick": .02}}.
               A key is a clump name or an fnmatch pattern ("L*", "*P5", "*T*"); the fields are those of the table rows (root, tip,
               curl, widthRoot, widthMid, thick, taper, layer, family). Patterns apply first (in file order), then exact names.
      pale     {"tol": .0015, "gray": .58, "smooth": 3}: the pale tuft material (face distance to a tuft field, base colour value,
               majority-vote passes)
      voxel    grid size in head-local units (default .0025)
  Outputs: head.blend, shape.glb, fan-clumps-front.json (resolved parameters, per clump stats, plan and coat cover, cup floor,
  skinTopZ, skinAfter, paleFaces, hashes), source-snapshot/. One closed component; skinTopZ at or below the baseline plus .0004.
"""
import ast
import hashlib
import json
from pathlib import Path
import shutil
import sys

import bpy
import bmesh
import numpy as np
import openvdb as vdb

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fan_clumps_front as fcf  # noqa: E402
from blender_blockout import material, mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha  # noqa: E402
from study_provenance import snapshot  # noqa: E402

S = fcf.S
BOXES = {'L': ([.22, -.42, -.32], [1.12, .50, .62]), 'R': ([-1.12, -.42, -.32], [-.22, .50, .62])}


def trilinear(arr, lo, vs, pts):
    """Sample a dense crop (lo = voxel index of arr[0, 0, 0]) at head-local points; BAND outside the crop."""
    f = pts/vs-lo
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
    return np.where(ok, v, fcf.BAND)


def apply_clump_edits(table, edits):
    """Per-clump edits of the spec: patterns first (file order), then exact names. Returns new rows; the table file is not touched."""
    import fnmatch
    rows = [dict(c) for c in table]
    names = {c['name'] for c in rows}
    for pattern, change in edits.items():
        if pattern in names:
            continue
        hit = [c for c in rows if fnmatch.fnmatchcase(c['name'], pattern)]
        if not hit:
            raise SystemExit(f'spec clumps: {pattern} matches no clump')
        for c in hit:
            c.update(change)
    for name, change in edits.items():
        if name in names:
            next(c for c in rows if c['name'] == name).update(change)
    return rows


def run(args):
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=False)
    table_path = Path(args.front_table).resolve()
    env_path = Path(args.envelope).resolve()
    provenance = snapshot(out, Path(args.entry), [args.scene, table_path, env_path] + ([Path(args.spec)] if getattr(args, 'spec', None) else []))
    for name in ('fan_clumps_front.py', 'fan_clumps_front_run.py'):
        shutil.copyfile(HERE/name, out/'source-snapshot'/name)
    spec = json.loads(Path(args.spec).read_text()) if getattr(args, 'spec', None) else {}
    unknown = sorted(set(spec) - {'params', 'cups', 'clumps', 'pale', 'voxel', 'note', 'schemaVersion'})
    if unknown:
        raise SystemExit(f'unknown spec keys {unknown}')
    params = dict(spec.get('params', {}))
    if spec.get('cups'):
        params['cups'] = {k: [tuple(pt) for pt in v] for k, v in spec['cups'].items()}
    if 'voxel' in spec:
        args.voxel = spec['voxel']
    for k, v in spec.get('pale', {}).items():
        setattr(args, 'pale_' + k, v)
    for item in args.p or []:
        k, v = item.split('=', 1)
        params[k] = ast.literal_eval(v)
    table = json.loads(table_path.read_text())['clumps']
    table = apply_clump_edits(table, spec.get('clumps', {}))
    env = dict(np.load(env_path))

    bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
    head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    require_single_closed_mesh(head, out, 'Head skin before fan clumps (front)')
    before = mesh_stats(head)
    VS = args.voxel
    M = head.matrix_world.copy()
    points = np.array([M @ v.co for v in head.data.vertices], dtype=np.float32)
    ztop = float(points[:, 2].max())+args.ceiling
    head.data.calc_loop_triangles()
    tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
    head.data.loop_triangles.foreach_get('vertices', tris)
    tris = tris.reshape(-1, 3)
    grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris, transform=vdb.createLinearTransform(voxelSize=VS),
                                                    halfWidth=args.bandwidth)
    p = dict(fcf.DEFAULTS)
    p['voxel'] = VS
    p['ceiling'] = ztop
    p.update(params)
    infos, tufts = {}, {}
    for side in args.sides.split(','):
        a, b = BOXES[side]
        lo = np.floor(np.array(a)/VS).astype(int)
        hi = np.ceil(np.array(b)/VS).astype(int)
        shape = tuple(int(v) for v in hi-lo+1)
        crop = np.empty(shape, dtype=np.float32)
        grid.copyToArray(crop, ijk=tuple(int(v) for v in lo))
        new, tuft, info = fcf.build_wing(crop, lo, VS, side, table, env, p)
        del crop
        grid.copyFromArray(new, ijk=tuple(int(v) for v in lo))
        infos[side] = info
        if tuft is not None:
            tufts[side] = (tuft, lo)
        del new
        print('wing', side, 'done', flush=True)
    vertices, tri_out, quads = grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
    vertices = vertices.astype(np.float64)
    if np.abs(vertices).max() > 5*np.abs(points).max():
        vertices = vertices*VS                      # the mesher returned index space
    faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
    materials = list(head.data.materials)
    mesh = bpy.data.meshes.new('Head skin with front fan clumps')
    mesh.from_pydata(vertices.tolist(), [], faces)
    mesh.update()
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
        mesh.materials.append(material('Pale inner-ear coat', args.pale_gray))
        pale_index = len(mesh.materials)-1
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    inverse = M.inverted()
    for vertex in mesh.vertices:
        vertex.co = inverse @ vertex.co
    bpy.data.meshes.remove(old)
    removed_flecks = remove_voxel_specks(head, max_extent=6*VS)
    removed_islands = []
    if args.max_island:
        bmi = bmesh.new()
        bmi.from_mesh(head.data)
        unseen, groups = set(bmi.verts), []
        while unseen:
            queue = [unseen.pop()]
            group = set(queue)
            while queue:
                for edge in queue.pop().link_edges:
                    for vertex in edge.verts:
                        if vertex in unseen:
                            unseen.remove(vertex)
                            group.add(vertex)
                            queue.append(vertex)
            groups.append(group)
        biggest = max(groups, key=len)
        for group in groups:
            if group is not biggest and len(group) <= args.max_island:
                removed_islands.append({'vertices': len(group)})
                bmesh.ops.delete(bmi, geom=list(group), context='VERTS')
        bmi.to_mesh(head.data)
        bmi.free()

    # pale material: faces whose centre lies within pale_tol of a tuft clump's own field
    count = len(head.data.polygons)
    centers = np.empty(count*3, dtype=np.float32)
    head.data.polygons.foreach_get('center', centers)
    world = centers.reshape(-1, 3).astype(np.float64)@np.array(M)[:3, :3].T+np.array(M)[:3, 3]
    marked = np.zeros(count, dtype=bool)
    for side, (tuft, lo) in tufts.items():
        near = (world[:, 0] > 0) if side == 'L' else (world[:, 0] < 0)
        ids = np.nonzero(near)[0]
        v = trilinear(tuft, lo, VS, world[ids])
        marked[ids[v <= args.pale_tol*S]] = True
    if args.pale_smooth > 0:
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
        for _ in range(args.pale_smooth):
            nearc = np.bincount(fa, weights=marked[fb], minlength=count)+np.bincount(fb, weights=marked[fa], minlength=count)
            marked = np.where(nearc*2 > deg, True, np.where(nearc*2 < deg, False, marked))
    mats = np.zeros(count, dtype=np.int32)
    mats[marked] = pale_index
    head.data.polygons.foreach_set('material_index', mats)
    head.data.update()
    require_single_closed_mesh(head, out, 'Head skin with front fan clumps')
    after = mesh_stats(head)
    top_after = float(max((M @ v.co).z for v in head.data.vertices))
    bpy.ops.export_scene.gltf(filepath=str(out/'shape.glb'), export_format='GLB')
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'head.blend'))
    record = {
        'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
        'tableSha256': sha(table_path), 'envelopeSha256': sha(env_path), 'spec': spec or None,
        'specSha256': sha(Path(args.spec)) if getattr(args, 'spec', None) else None,
        'moduleSha256': {n: hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in ('fan_clumps_front.py', 'fan_clumps_front_run.py')},
        'scope': 'R03: ear fan front stripped in front of its mid-surface and regrown as a clump volume (coat P, S, D; tuft T), cup carved, field space; rear half and face untouched',
        'parameters': {**{k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items()}, 'resolved': {k: v for k, v in p.items()}},
        'wings': infos, 'skinTopZ': {'ceiling': ztop, 'after': top_after}, 'paleFaces': int(marked.sum()), 'paleMaterialIndex': pale_index,
        'removedFlecks': removed_flecks, 'removedIslands': removed_islands, 'skinBefore': before, 'skinAfter': after,
        'outputs': {q.name: sha(q) for q in out.iterdir() if q.suffix in ['.glb', '.blend']},
    }
    (out/'fan-clumps-front.json').write_text(json.dumps(record, indent=2, default=str)+'\n')
    print('fan clumps front ok', json.dumps({'before': before, 'after': after, 'pale': int(marked.sum())}))
