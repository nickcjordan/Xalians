"""Build a provisional whole-creature study, with real orthographic views.

Uses the existing probe sweep implementation. No image generation or API calls.
Run in Blender with -- --spec <json> --out <fresh-directory>.
"""
import argparse
import hashlib
import json
import math
import shutil
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_probe import aim, tube
from authored_surfaces import head_surface, ear_surface, eye_surface, section_surface, coat_lock, orbital_surface, front_surface, facial_relief


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
                if 'outline' in spec:
                    # A smooth closed shell, independent of the overlying coat tufts.
                    outline = spec['outline']
                    segment = index / count * len(outline)
                    k, t = int(segment), segment % 1
                    points = [Vector(outline[(k+n) % len(outline)]) for n in (-1,0,1,2)]
                    a,b,c,d = points
                    boundary = .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
                    x = spec['center'][0] + radius*(boundary[0]-spec['center'][0])
                    z = spec['center'][2] + radius*(boundary[1]-spec['center'][2])
                else:
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


def face_patch(part, head, mat):
    """Conform an oval eye surface to the head, with small modeled relief."""
    verts, faces = [], []
    rings, count = 12, 64
    cx,cy,cz = head['center']
    rx,ry,rz = head['scale']
    for ring in range(rings+1):
        r = max(.001, ring/rings)
        for j in range(count):
            angle = 2*math.pi*j/count
            x = part['center'][0]+part['scale'][0]*r*math.cos(angle)
            z = part['center'][2]+part['scale'][2]*r*math.sin(angle)
            y = cy-ry*math.sqrt(max(.02,1-((x-cx)/rx)**2-((z-cz)/rz)**2))
            y -= part['relief'] + part.get('bulge',0)*(1-r*r)
            verts.append((x,y,z))
        if ring:
            for j in range(count):
                a=(ring-1)*count+j;b=(ring-1)*count+(j+1)%count
                faces.append((a,a+count,b+count,b))
    faces.append(tuple(reversed(range(count))))
    mesh=bpy.data.meshes.new(part['id'])
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(part['id'],mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for face in mesh.polygons:
        face.use_smooth=True
    return obj


def mesh_stats(obj, weld_distance=None):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    if weld_distance is not None:
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=weld_distance)
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


def require_single_closed_mesh(obj, out, stage):
    """Reject a broken solid before a later remesh can disguise its origin."""
    stats = mesh_stats(obj)
    if stats['components'] != 1 or stats['nonManifoldEdges'] != 0:
        failure = {'approval': None, 'stage': stage, 'object': obj.name,
                   'expected': {'components': 1, 'nonManifoldEdges': 0}, 'actual': stats}
        (Path(out) / 'geometry-failure.json').write_text(json.dumps(failure, indent=2)+'\n')
        bpy.ops.wm.save_as_mainfile(filepath=str(Path(out) / 'geometry-failure.blend'))
        raise ValueError(f'{stage}: expected one closed solid, got {stats}')
    return stats


def remove_voxel_specks(obj, max_extent=None, min_z=None):
    """Remove explicitly bounded tiny remesh fragments, recording their bounds."""
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
        bounds = [[min(v.co[i] for v in group) for i in range(3)],
                  [max(v.co[i] for v in group) for i in range(3)]]
        extent = max(bounds[1][i]-bounds[0][i] for i in range(3))
        limit = obj.data.remesh_voxel_size if max_extent is None else max_extent
        if len(group) <= 16 and extent <= limit and (min_z is None or bounds[0][2] >= min_z):
            removed.append({'vertices': len(group), 'maxExtent': extent, 'bounds': bounds})
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
    # Snapshot code at build start. Later edits must not change a run's provenance.
    inputs=args.out/'inputs'
    inputs.mkdir()
    source_paths=[Path(__file__),Path(__file__).with_name('blender_probe.py'),
                  Path(__file__).with_name('authored_surfaces.py'),Path(__file__).with_name('surface_math.py')]
    source_hashes={p.name:sha(p) for p in source_paths}
    for p in source_paths: shutil.copyfile(p,inputs/p.name)
    shutil.copyfile(args.spec,inputs/'spec.json')
    source_hashes['spec.json']=sha(args.spec)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    mats = {key: material(key, val) for key, val in spec['materials'].items()}
    for key in ('white','pupil','nose'):
        mats[key].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.22
    if spec.get('eyeReflection'):
        pupil=mats['pupil'].node_tree.nodes['Principled BSDF']
        pupil.inputs['Roughness'].default_value=spec['eyeReflection']['roughness']
        pupil.inputs['Specular IOR Level'].default_value=spec['eyeReflection']['strength']
    pieces = [sphere(v) for v in spec['volumes'] if not (v['id']=='head' and spec.get('headSurface'))]
    if spec.get('headSurface'):
        pieces.append(head_surface(spec['headSurface']))
    pieces += [tube(s['id'], s['controls']) for s in spec['sweeps']]
    pieces += [section_surface(s) for s in spec.get('sectionSurfaces',[])]
    pieces += [coat_lock(s) for s in spec.get('coatMasses',[])]
    if not spec.get('integratedEarCup'):
        pieces += [(ear_surface(side,spec['earSurface']) if spec.get('earSurface') else ear(side,spec['ear'])) for side in (-1,1)]
    if spec.get('earCoatSurface'):
        pieces += [ear_surface(side,spec['earCoatSurface']) for side in (-1,1)]
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
    local_smoothing=[]
    for region in spec.get('localSmoothing',[]):
        group=body.vertex_groups.new(name=region['id'])
        selected=0
        for vertex in body.data.vertices:
            world=body.matrix_world@vertex.co
            radius=sum(((world[i]-region['center'][i])/region['radii'][i])**2 for i in range(3))
            if radius<1:
                group.add([vertex.index],(1-radius)**2,'REPLACE')
                selected+=1
        modifier=body.modifiers.new(region['id'],'SMOOTH')
        modifier.vertex_group=group.name
        modifier.factor=region['factor']
        modifier.iterations=region['iterations']
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        local_smoothing.append({**region,'selectedVertices':selected})
    body.data.materials.clear()
    body.data.materials.append(mats['clay'])
    for face in body.data.polygons:
        face.use_smooth = True
    specks = remove_voxel_specks(body)
    stats = mesh_stats(body)
    stats['removedSubVoxelDebris'] = specks
    stats['localSmoothing']=local_smoothing
    head = next(v for v in spec['volumes'] if v['id']=='head')
    for part in spec.get('orbits',[]):
        orbital_surface(part,spec['headSurface'],mats)
    for part in spec.get('detailSurfaces',[]):
        obj=section_surface(part)
        obj.data.materials.append(mats[part['material']])
    for part in spec['surfaceParts']:
        if part.get('conformToHead'):
            if spec.get('headSurface'):
                eye_surface(part,spec['headSurface'],mats[part['material']])
            else:
                face_patch(part, head, mats[part['material']])
        else:
            sphere(part, mats[part['material']])
    for part in spec.get('facialStrokes',[]):
        # Author fine creases above the sweep's minimum radius, then scale them back.
        factor=part.get('precisionScale',1)
        controls=[list(row) for row in part['controls']]
        if part.get('conformToHead'):
            for row in controls:
                row[1]=front_surface(spec['headSurface']['sections'],row[0],row[2])-facial_relief(spec['headSurface'],row[0],row[2])-.001
        controls=[[v*factor for v in row] for row in controls]
        obj=tube(part['id'],controls)
        if factor!=1:
            for vertex in obj.data.vertices: vertex.co/=factor
        obj.data.materials.append(mats[part['material']])
        for face in obj.data.polygons:
            face.use_smooth=True
    for part in spec['claws']:
        factor=part.get('precisionScale',1)
        obj = tube(part['id'], [[v*factor for v in row] for row in part['controls']])
        if factor!=1:
            for vertex in obj.data.vertices: vertex.co/=factor
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
              'specSha256': source_hashes['spec.json'], 'builderSha256': source_hashes['blender_blockout.py'],
              'sweepBuilderSha256': source_hashes['blender_probe.py'],
              'surfaceBuilderSha256': source_hashes['authored_surfaces.py'],
              'surfaceMathSha256': source_hashes['surface_math.py'],
              'blenderVersion': bpy.app.version_string, 'cameras': cameras,
              'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ('.png','.blend')}}
    (args.out/'geometry.json').write_text(json.dumps(report, indent=2)+'\n')
    if report['status']!='technical-pass':
        raise RuntimeError('Continuous body failed topology checks')


if __name__ == '__main__':
    main()
