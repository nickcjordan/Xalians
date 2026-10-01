"""Quick shaded arm and forepaw views of a body component, to read the arm before assembling.

Run through loop_tools.py blender:
  shade_arms.py --glb <body shape.glb> --out <dir> [--blend body.blend] [--side -1|1]
Writes Workbench renders (studio light, one grey, plus a grazing pass) of one arm, the character's right arm
by default (the -x side, image left in the front view): arm front, outer side, back, three-quarter, and
forepaw front, outer, inner and below. Body only, no head, no tails fixes; a geometry check, not a critic image.
"""
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument('--glb', type=Path)
p.add_argument('--blend', type=Path)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--side', type=int, default=-1)
p.add_argument('--res', type=int, default=800)
p.add_argument('--drop', action='append', default=[], help='object names to delete before rendering')
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=True)
if args.blend:
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
else:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(args.glb.resolve()))
sc = bpy.context.scene
for name in args.drop:
    bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)
for light in [o for o in sc.objects if o.type == 'LIGHT']:
    bpy.data.objects.remove(light, do_unlink=True)
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x = sc.render.resolution_y = args.res
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'SINGLE'
sc.display.shading.single_color = (.75, .75, .75)
sc.display.shading.show_cavity = False
sc.render.film_transparent = False
if sc.world is None:
    sc.world = bpy.data.worlds.new('w')
sc.world.color = (1, 1, 1)
s = args.side
arm = Vector((s*.34, -.08, .08))
paw = Vector((s*.37, -.10, -.19))
out = s    # the side camera looks at the outer face of this arm
views = [
    ('arm-front', arm, (0, -3, 0), .95), ('arm-outer', arm, (s*3, 0, 0), .95),
    ('arm-inner', arm, (-s*3, 0, 0), .95), ('arm-back', arm, (0, 3, 0), .95),
    ('arm-q', arm, (s*2.1, -2.1, .5), .95),
    ('paw-front', paw, (0, -3, 0), .26), ('paw-outer', paw, (s*3, 0, 0), .26),
    ('paw-inner', paw, (-s*3, 0, 0), .26), ('paw-below', paw, (0, -.4, -3), .26),
    ('paw-q', paw, (s*1.6, -1.6, -.5), .26),
]
for name, target, off, scale in views:
    for graze in (False, True):
        sc.display.shading.light = 'MATCAP' if graze else 'STUDIO'
        bpy.ops.object.camera_add(location=target+Vector(off))
        cam = bpy.context.object
        cam.data.type, cam.data.ortho_scale = 'ORTHO', scale
        cam.rotation_euler = (target-cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.camera = cam
        sc.render.filepath = str(args.out/f'{name}{"-graze" if graze else ""}.png')
        bpy.ops.render.render(write_still=True)
