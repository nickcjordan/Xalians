"""Render an imported shape as untextured clay from fixed orthographic views."""
import argparse
import json
import math
from pathlib import Path
import shutil
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import material, mesh_stats, sha
from blender_probe import aim

parser = argparse.ArgumentParser()
parser.add_argument('--mesh', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--preserve-materials', action='store_true')
parser.add_argument('--turntable', action='store_true')
parser.add_argument('--studio-fill', action='store_true')
# A fixed frame (target point and orthographic scale) instead of one fitted to this mesh's bounds, so a change
# to one part cannot rescale or shift the pixels of the others. The mesh must stay inside the frame.
parser.add_argument('--frame-center', help='x,y,z the cameras aim at')
parser.add_argument('--frame-scale', type=float, help='orthographic scale of every camera')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
shutil.copyfile(__file__, args.out / 'render_source.py')
provenance_sha = snapshot(args.out, __file__, [args.mesh])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.mesh.resolve()))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
clay = material('Neutral untextured clay', .38)
for obj in objects:
    if not args.preserve_materials:
        obj.data.materials.clear()
        obj.data.materials.append(clay)
    for poly in obj.data.polygons:
        poly.use_smooth = True
points = [obj.matrix_world @ Vector(v) for obj in objects for v in obj.bound_box]
low = Vector([min(p[i] for p in points) for i in range(3)])
high = Vector([max(p[i] for p in points) for i in range(3)])
target = (low + high) / 2
extent = high - low
if args.frame_center:
    target = Vector([float(v) for v in args.frame_center.split(',')])
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = True
scene.world.color = (.55, .55, .55)
if args.studio_fill:
    scene.world.use_nodes = True
    background = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
    background.inputs['Color'].default_value = (.60,.60,.60,1)
    background.inputs['Strength'].default_value = .5
scene.view_settings.view_transform = 'Standard'
scale = max(extent.x, extent.y, extent.z * 1.5) * 1.15
if args.frame_scale:
    scale = args.frame_scale
    # the views are 1200 by 800: half the scale reaches sideways, two thirds of that half reaches up and down
    half, vertical = scale / 2, scale * 800 / 1200 / 2
    if (max(abs(low.x - target.x), abs(high.x - target.x), abs(low.y - target.y), abs(high.y - target.y)) > half
            or max(abs(low.z - target.z), abs(high.z - target.z)) > vertical):
        raise ValueError('The mesh leaves the fixed render frame; change frame.render in the species config on purpose')
for pos, power, size in [((-3, -5, 7), 650, 4), ((4, -2, 4), 300, 4), ((1, 4, 6), 550, 3)]:
    bpy.ops.object.light_add(type='AREA', location=target + Vector(pos))
    lamp = bpy.context.object
    lamp.data.energy = power
    lamp.data.size = size
    aim(lamp, target)
cameras = []
views = [('front', 0, 0), ('front-left', 45, 0),
                               ('left', 90, 0), ('back', 180, 0),
                               ('right', 270, 0), ('front-right', 315, 0), ('rear-oblique', 135, 2)]
if args.turntable:
    views += [(f'turn-{angle:03}',angle,1.4) for angle in range(0,360,45)]
for name, angle, elevation in views:
    a = math.radians(angle)
    bpy.ops.object.camera_add(location=target + Vector((10 * math.sin(a), -10 * math.cos(a), elevation)))
    camera = bpy.context.object
    camera.name = name
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = scale
    aim(camera, target)
    scene.camera = camera
    scene.render.filepath = str(args.out / (name + '.png'))
    bpy.ops.render.render(write_still=True)
    cameras.append({'name': name, 'angle': angle, 'elevation': elevation,
                    'projection': 'orthographic', 'elevationOffset': elevation,
                    'resolution': [1200,800], 'image': name+'.png',
                    'orthoScale': scale, 'matrixWorld': [list(r) for r in camera.matrix_world]})
scene.camera = bpy.data.objects['front-left']
bpy.ops.wm.save_as_mainfile(filepath=str(args.out / 'study.blend'))
record = {'scope': 'Actual imported geometry, no texture',
          'studioFill': args.studio_fill,
          'worldBackground': [{'color':list(n.inputs['Color'].default_value),
                               'strength':n.inputs['Strength'].default_value}
                              for n in scene.world.node_tree.nodes if n.type=='BACKGROUND'],
          'preserveMaterials': args.preserve_materials,
          'approval': None, 'stageProvenanceSha256': provenance_sha, 'source': str(args.mesh.resolve()), 'sourceSha256': sha(args.mesh),
          'objects': {obj.name: mesh_stats(obj, weld_distance=.000001) for obj in objects},
          'rawImportedTopology': {obj.name: mesh_stats(obj) for obj in objects},
          'topologyMeasurement': 'objects uses a temporary BMesh with coincident seams welded at .000001 local units; rendered meshes are unchanged',
          'bounds': [list(low), list(high)], 'cameras': cameras,
          'outputs': {f.name: sha(f) for f in args.out.iterdir() if f.suffix in ['.png', '.blend']},
          'scriptSha256': sha(args.out / 'render_source.py')}
(args.out / 'geometry.json').write_text(json.dumps(record, indent=2) + '\n')
