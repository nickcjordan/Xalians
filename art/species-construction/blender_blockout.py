"""Build a provisional whole-creature study, with real orthographic views.

Uses the existing probe sweep implementation. No image generation or API calls.
Run in Blender with -- --spec <json> --out <fresh-directory>.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_probe import aim, tube


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def material(name, gray):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (gray, gray, gray, 1)
    result.use_nodes = True
    node = result.node_tree.nodes['Principled BSDF']
    node.inputs['Base Color'].default_value = (gray, gray, gray, 1)
    node.inputs['Roughness'].default_value = .7
    return result


def sphere(item, mat=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, location=item['center'])
    obj = bpy.context.object
    obj.name = item['id']
    obj.scale = item['scale']
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def ear(side, spec):
    """Closed cupped shell with smooth tissue rim; hair is a separate later layer."""
    verts, faces = [], []
    rings, count = 12, 64
    for back in (False, True):
        for ring in range(rings + 1):
            radius = max(.001, ring / rings)
            for index in range(count):
                angle = 2 * math.pi * index / count
                u = radius * math.cos(angle)
                v = radius * math.sin(angle)
                x = spec['center'][0] + spec['width'] * u
                z = spec['center'][2] + spec['height'] * v + spec['tilt'] * u
                y = spec['center'][1] + spec['cup'] * (1-radius*radius) + (.10 if back else 0)
                verts.append((side*x, y, z))
    stride = (rings+1)*count
    for back in (0, 1):
        for ring in range(rings):
            for i in range(count):
                a = back*stride + ring*count+i
                b = back*stride + ring*count+(i+1)%count
                face = (a, b, b+count, a+count)
                faces.append(face if back else tuple(reversed(face)))
        cap = tuple(back*stride+i for i in range(count))
        faces.append(cap if back else tuple(reversed(cap)))
    for i in range(count):
        a, b = rings*count+i, rings*count+(i+1)%count
        faces.append((a, b, b+stride, a+stride))
    mesh = bpy.data.meshes.new('ear shell')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(f'ear-{side}', mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    return obj


def mesh_stats(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    unseen, components = set(bm.verts), 0
    while unseen:
        components += 1
        queue = [unseen.pop()]
        while queue:
            for edge in queue.pop().link_edges:
                for vertex in edge.verts:
                    if vertex in unseen:
                        unseen.remove(vertex)
                        queue.append(vertex)
    result = {'components': components, 'nonManifoldEdges': sum(not e.is_manifold for e in bm.edges),
              'vertices': len(bm.verts)}
    bm.free()
    return result


def remove_voxel_specks(obj):
    """Remove only isolated sub-voxel debris, never a disconnected body part."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    unseen, removed = set(bm.verts), []
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
        extent = max(max(v.co[i] for v in group)-min(v.co[i] for v in group) for i in range(3))
        if len(group) <= 16 and extent <= obj.data.remesh_voxel_size:
            removed.append({'vertices': len(group), 'maxExtent': extent})
            bmesh.ops.delete(bm, geom=list(group), context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()
    return removed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--spec', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    args.out.mkdir(parents=True, exist_ok=False)
    spec = json.loads(args.spec.read_text())
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    mats = {key: material(key, val) for key, val in spec['materials'].items()}
    pieces = [sphere(v) for v in spec['volumes']]
    pieces += [tube(s['id'], s['controls']) for s in spec['sweeps']]
    pieces += [ear(side, spec['ear']) for side in (-1, 1)]
    bpy.ops.object.select_all(action='DESELECT')
    for obj in pieces:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = 'provisional_continuous_body_ears_limbs_paws_tails'
    body.data.remesh_voxel_size = spec['voxelSize']
    bpy.ops.object.voxel_remesh()
    smooth = body.modifiers.new('Organic continuity', 'SMOOTH')
    smooth.factor, smooth.iterations = .65, spec.get('smoothIterations', 4)
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    body.data.materials.clear()
    body.data.materials.append(mats['clay'])
    for face in body.data.polygons:
        face.use_smooth = True
    specks = remove_voxel_specks(body)
    stats = mesh_stats(body)
    stats['removedSubVoxelDebris'] = specks
    for part in spec['surfaceParts']:
        sphere(part, mats[part['material']])
    for part in spec['claws']:
        obj = tube(part['id'], part['controls'])
        obj.data.materials.append(mats['claw'])
        for face in obj.data.polygons:
            face.use_smooth = True
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = spec['resolution']
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.film_transparent = True
    scene.world.color = (.6,.6,.6)
    scene.view_settings.view_transform = 'Standard'
    for position, energy in [((-5,-7,9), 1000), ((6,-2,7), 700), ((0,6,8), 1000)]:
        bpy.ops.object.light_add(type='AREA', location=position)
        lamp = bpy.context.object
        lamp.data.energy, lamp.data.size = energy, 7
        aim(lamp, spec['target'])
    cameras = []
    views = [(name, angle, 0) for name, angle in [('front',0), ('front-left',45), ('left',90),
             ('back',180), ('right',270), ('front-right',315)]]
    views += [(f'turn-{angle:03}', angle, 2.5) for angle in range(0,360,45)]
    for name, angle, elevation in views:
        radians = math.radians(angle)
        target = Vector(spec['target'])
        offset = Vector((10*math.sin(radians), -10*math.cos(radians), elevation))
        bpy.ops.object.camera_add(location=target+offset)
        camera = bpy.context.object
        camera.name = name
        scale = spec.get('turntableOrthoScale', spec['orthoScale']) if elevation else spec['orthoScale']
        camera.data.type, camera.data.ortho_scale = 'ORTHO', scale
        aim(camera, target)
        scene.camera = camera
        bpy.context.view_layer.update()
        cameras.append({'name': name, 'angle': angle, 'elevationOffset': elevation,
                        'projection': 'orthographic', 'orthoScale': scale,
                        'matrixWorld': [list(row) for row in camera.matrix_world],
                        'resolution': [spec['resolution']]*2, 'image': name+'.png'})
        scene.render.filepath = str(args.out / (name+'.png'))
        bpy.ops.render.render(write_still=True)
    scene.camera = bpy.data.objects['front-left']
    bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'blockout.blend'))
    report = {'scope': 'Provisional whole-creature reconciliation, no fur, rig or production topology',
              'approval': None, 'body': stats, 'surfaceParts': len(spec['surfaceParts']),
              'claws': len(spec['claws']), 'separateSurfaces': 'Eye surfaces, nose and claws intentionally separate from continuous body',
              'status': 'technical-pass' if stats['components']==1 and stats['nonManifoldEdges']==0 else 'technical-fail',
              'specSha256': sha(args.spec), 'builderSha256': sha(__file__),
              'sweepBuilderSha256': sha(Path(__file__).with_name('blender_probe.py')),
              'blenderVersion': bpy.app.version_string, 'cameras': cameras,
              'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ('.png','.blend')}}
    (args.out/'geometry.json').write_text(json.dumps(report, indent=2)+'\n')
    if report['status']!='technical-pass':
        raise RuntimeError('Continuous body failed topology checks')


if __name__ == '__main__':
    main()
