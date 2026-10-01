"""Render the packet's arm and forepaw closeups for a candidate body without assembling (R07 look check).

Run through loop_tools.py blender:
  render_arm_swap.py --study <assembly>/render/study.blend --body <body shape.glb> --out <dir> --spec <camera json> [--spec ...]

Opens the baseline assembly's study scene (its lights, materials and renderer), replaces the continuous skin and
the forepaw claws by the candidate body's, and renders the named camera sets exactly as render_details.py does.
The head and the hind claws stay the baseline's, the neck bridge is not rebuilt, so judge arms and paws only.
Not a packet image: the assembly's own render is what the critic sees.
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from blender_probe import aim

p = argparse.ArgumentParser()
p.add_argument('--study', type=Path, required=True)
p.add_argument('--body', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--spec', type=Path, action='append', required=True)
p.add_argument('--only', action='append', default=[], help='render only these view names')
args = p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(args.study.resolve()))
scene = bpy.context.scene
old_skin = bpy.data.objects['akinza_continuous_construction']
skin_material = old_skin.data.materials[0] if old_skin.data.materials else None
for o in list(scene.objects):
    if o == old_skin or 'fore claw' in o.name.lower():
        bpy.data.objects.remove(o, do_unlink=True)
before = set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(args.body.resolve()))
new = [o for o in scene.objects if o not in before and o.type == 'MESH']
skin = max(new, key=lambda o: len(o.data.vertices))
for o in new:
    mat = o.data.materials[0] if o.data.materials else None
    if o == skin and skin_material is not None:
        o.data.materials.clear()
        o.data.materials.append(skin_material)
    for poly in o.data.polygons:
        poly.use_smooth = True
scene.render.resolution_percentage = 100
for spec_path in args.spec:
    spec = json.loads(spec_path.read_text())
    scene.render.resolution_x = scene.render.resolution_y = spec['resolution']
    for view in spec['views']:
        if args.only and view['name'] not in args.only:
            continue
        target = Vector(view['target'])
        bpy.ops.object.camera_add(location=target+Vector(view['offset']))
        camera = bpy.context.object
        camera.data.type, camera.data.ortho_scale = 'ORTHO', view['orthoScale']
        aim(camera, target)
        scene.camera = camera
        bpy.context.view_layer.update()
        scene.render.filepath = str(args.out/(view['name']+'.png'))
        bpy.ops.render.render(write_still=True)
print('rendered', args.out)
