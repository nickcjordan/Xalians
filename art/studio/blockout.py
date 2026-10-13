"""Blockout builder (runs inside Blender: python art/studio/runner.py blender art/studio/blockout.py -- ...)

    blockout.py --spec <spec.json> --out <dir>

Reads a blockout spec

    {"creature": "<key>", "voxel": 0.004, "parts": [
        {"part": "<part key>", "kind": "mass|sweep|shell", "params": {...}, "mirror": "x"|null, "blend": 0.03}, ...]}

evaluates every instance on a sparse grid around its bounds (art/studio/parts), combines them with a polynomial
smooth union (each instance's own blend radius), meshes the zero level set once with Blender's bundled OpenVDB,
and writes to <dir>:

    blockout.blend   one closed skin object "skin" with the integer point attribute part_id (index into
                     record.json partKeys) and the float point attribute part_weight
    blockout.glb     the same mesh; glTF custom attributes must start with an underscore, so they appear
                     there as _part_id and _part_weight
    blockout.npz     vertices (float32), part_id, part_weight, partKeys: the same data for tools outside Blender
    record.json      spec sha256, vertex and face counts, connected components, non-manifold edge count,
                     bounds, minutes

Separate instances ("separate": true, for eyeballs and anything a rig must move on its own) are not unioned into
the skin. Each is meshed alone as a closed object at its own world position and written to blockout.blend and
blockout.glb as its own object (named by parts.separate_objects: "name", or "<part>-<n>"; a mirrored instance
gives two objects). The object's origin is its pivot (default the mass center), so a rig can rotate it in place,
and it carries custom properties material (its tag, for example "eye"), shading (the instance's optional
"shading" numbers for that tag's review shader, as JSON), part, pivot and gaze (world space; glTF
extras in the glb). Its material slot is named after the tag ("clay" when untagged). Carves apply to the skin
only. blockout.npz holds the skin alone; record.json lists the separate objects under "separate".

It refuses (exit status 2, record.json written with ok false and the reasons, no blend or glb) when the skin is
not a single closed manifold component, or when any separate object is not one closed manifold component.
"""
import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import parts  # noqa: E402


def mesh_level_set(origin, field, voxel):
    import openvdb as vdb
    band = 3.0*voxel
    arr = np.ascontiguousarray(np.clip(field, -band, band).astype(np.float32))
    grid = vdb.FloatGrid()
    grid.background = band
    grid.transform = vdb.createLinearTransform(voxelSize=voxel)
    grid.copyFromArray(arr)
    grid.gridClass = vdb.GridClass.LEVEL_SET
    points, tris, quads = grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
    points = np.asarray(points, float)+origin
    faces = [tuple(int(i) for i in f) for f in np.asarray(tris)] + [tuple(int(i) for i in f) for f in np.asarray(quads)]
    return points, faces


def analyse(bm):
    """Connected components over vertices that belong to faces, plus non-manifold and boundary edges."""
    import bmesh
    seen, comps = set(), 0
    for v in bm.verts:
        if v.index in seen:
            continue
        comps += 1
        stack = [v]
        seen.add(v.index)
        while stack:
            cur = stack.pop()
            for e in cur.link_edges:
                o = e.other_vert(cur)
                if o.index not in seen:
                    seen.add(o.index)
                    stack.append(o)
    nonmanifold = sum(1 for e in bm.edges if len(e.link_faces) != 2)
    boundary = sum(1 for e in bm.edges if len(e.link_faces) == 1)
    return comps, nonmanifold, boundary


def mesh_separate(obj_spec, voxel):
    """Mesh one separate object on its own: (points relative to its pivot, faces). A reflected object is the
    authored side's mesh reflected through x = 0 with its faces reversed, so both sides are exact mirrors."""
    solo = obj_spec['instance']
    origin, field, _ = parts.build_field([solo], voxel)
    points, faces = mesh_level_set(origin, field, voxel)
    points = parts.project_to_surface([solo], points, h=voxel*0.25, max_step=voxel)
    if obj_spec['mirrored']:
        points = points*np.array([-1.0, 1.0, 1.0])
        faces = [tuple(reversed(f)) for f in faces]
    return points-obj_spec['pivot'], faces


def main():
    import bpy
    import bmesh

    t0 = time.time()
    ap = argparse.ArgumentParser()
    ap.add_argument('--spec', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args(sys.argv[sys.argv.index('--')+1:])
    raw = args.spec.read_bytes()
    spec = json.loads(raw.decode('utf-8'))
    args.out.mkdir(parents=True, exist_ok=True)
    voxel = float(spec.get('voxel', 0.004))
    insts = parts.instances(spec)
    keys = parts.part_keys(spec)
    separates = parts.separate_objects(insts)

    origin, field, info = parts.build_field(insts, voxel)
    t_field = time.time()
    points, faces = mesh_level_set(origin, field, voxel)
    del field
    points = parts.project_to_surface(insts, points, h=voxel*0.25, max_step=voxel)

    for o in list(bpy.data.objects):                    # the factory scene's cube, light and camera
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.lights, bpy.data.cameras, bpy.data.materials):
        for item in list(coll):
            coll.remove(item)

    mesh = bpy.data.meshes.new('skin')
    mesh.from_pydata([tuple(p) for p in points], [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.verts.ensure_lookup_table()
    comps, nonmanifold, boundary = analyse(bm)
    bm.to_mesh(mesh)
    bm.free()

    sep_records, sep_objects = [], []
    for o in separates:
        pts, fcs = mesh_separate(o, voxel)
        m = bpy.data.meshes.new(o['name'])
        m.from_pydata([tuple(p) for p in pts], [], fcs)
        m.update()
        b = bmesh.new()
        b.from_mesh(m)
        bmesh.ops.recalc_face_normals(b, faces=b.faces)
        b.verts.ensure_lookup_table()
        c, nm, bd = analyse(b)
        b.to_mesh(m)
        b.free()
        m.shade_smooth()
        sep_objects.append((o, m))
        sep_records.append({'name': o['name'], 'part': o['part'], 'material': o['material'],
                            'pivot': [round(float(x), 5) for x in o['pivot']],
                            'gaze': None if o['gaze'] is None else [round(float(x), 5) for x in o['gaze']],
                            'mirrored': o['mirrored'], 'vertices': len(m.vertices), 'faces': len(m.polygons),
                            'components': c, 'nonManifoldEdges': nm, 'boundaryEdges': bd})

    record = {'creature': spec.get('creature'), 'specSha256': hashlib.sha256(raw).hexdigest(), 'voxel': voxel,
              'partKeys': keys, 'vertices': len(mesh.vertices), 'faces': len(mesh.polygons),
              'components': comps, 'nonManifoldEdges': nonmanifold, 'boundaryEdges': boundary,
              'grid': info, 'separate': sep_records}
    problems = []
    if comps != 1:
        problems.append(f'{comps} connected components (a creature skin must be exactly one)')
    if nonmanifold:
        problems.append(f'{nonmanifold} non-manifold edges ({boundary} open boundary edges)')
    if not len(mesh.polygons):
        problems.append('empty mesh')
    for r in sep_records:
        if r['components'] != 1 or r['nonManifoldEdges'] or not r['faces']:
            problems.append(f"separate object {r['name']}: {r['components']} components, "
                            f"{r['nonManifoldEdges']} non-manifold edges (each must be one closed component)")
    if problems:
        record.update(ok=False, problems=problems, minutes=round((time.time()-t0)/60, 3))
        (args.out/'record.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
        print('BLOCKOUT REFUSED: ' + '; '.join(problems))
        sys.exit(2)

    co = np.empty(len(mesh.vertices)*3, np.float32)
    mesh.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3).astype(float)
    part_id, weight = parts.ownership(insts, keys, co)
    pid = mesh.attributes.new('part_id', 'INT', 'POINT')
    pid.data.foreach_set('value', part_id.astype(np.int32))
    pw = mesh.attributes.new('part_weight', 'FLOAT', 'POINT')
    pw.data.foreach_set('value', weight)
    mesh.shade_smooth()

    obj = bpy.data.objects.new('skin', mesh)
    bpy.context.scene.collection.objects.link(obj)
    clay = bpy.data.materials.new('clay')
    clay.use_nodes = True
    obj.data.materials.append(clay)
    obj['partKeys'] = json.dumps(keys)
    obj['creature'] = spec.get('creature') or ''
    exported = [obj]
    tag_materials = {}
    for o, m in sep_objects:
        tag = o['material'] or 'clay'
        if tag not in tag_materials:
            mat = bpy.data.materials.new(tag)
            mat.use_nodes = True
            tag_materials[tag] = mat
        m.materials.append(tag_materials[tag])
        so = bpy.data.objects.new(o['name'], m)
        so.location = tuple(float(x) for x in o['pivot'])
        bpy.context.scene.collection.objects.link(so)
        so['material'] = o['material'] or ''
        so['part'] = o['part']
        so['pivot'] = [float(x) for x in o['pivot']]
        if o['gaze'] is not None:
            so['gaze'] = [float(x) for x in o['gaze']]
        so['creature'] = spec.get('creature') or ''
        if o['shading']:
            so['shading'] = json.dumps(o['shading'])
        exported.append(so)

    record.update(ok=True, bounds={'min': [round(float(x), 5) for x in co.min(axis=0)],
                                   'max': [round(float(x), 5) for x in co.max(axis=0)]},
                  vertsPerPart={k: int((part_id == i).sum()) for i, k in enumerate(keys)})
    bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'blockout.blend'))
    np.savez_compressed(args.out/'blockout.npz', vertices=co.astype(np.float32), part_id=part_id.astype(np.int32),
                        part_weight=weight, partKeys=np.array(keys))

    pid.name, pw.name = '_part_id', '_part_weight'      # glTF custom attributes start with an underscore
    bpy.ops.object.select_all(action='DESELECT')
    for o in exported:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(filepath=str(args.out/'blockout.glb'), export_format='GLB', use_selection=True,
                              export_attributes=True, export_apply=False, export_extras=True)
    record['minutes'] = round((time.time()-t0)/60, 3)
    record['fieldMinutes'] = round((t_field-t0)/60, 3)
    (args.out/'record.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
    print('BLOCKOUT DONE', json.dumps({k: record[k] for k in ('vertices', 'faces', 'components', 'nonManifoldEdges', 'minutes')}),
          'separate:', ', '.join(f"{r['name']} ({r['material'] or 'clay'}, {r['vertices']} vertices)" for r in sep_records) or 'none')


main()
