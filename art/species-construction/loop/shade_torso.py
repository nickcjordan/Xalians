"""Quick shaded trunk views of a body component, to read ribbing and creases before assembling.

Run with Blender (through loop_tools.py blender): --python shade_torso.py -- --scene <body.blend> --out <dir> [--tag name]
Writes front, left, back (and a front-left three-quarter) Workbench renders of the trunk, z .46 to -.30,
with a studio light, one flat colour and a second, grazing light pass (suffix -graze) that exposes bands.
Body only, no head, no tails fixes; it is a geometry check, not a critic image.
"""
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument('--scene', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--res', type=int, default=900)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x = sc.render.resolution_y = args.res
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'SINGLE'
sc.display.shading.single_color = (.75, .75, .75)
sc.display.shading.show_cavity = False
sc.render.film_transparent = False
bpy.context.scene.world.color = (1, 1, 1)
views = {'front': (0, -3, 0), 'left': (-3, 0, 0), 'back': (0, 3, 0), 'q': (-2.1, -2.1, .4)}
target = Vector((0, 0, .08))
for lightname, rot in (('', None), ('-graze', (math.radians(70), 0, math.radians(20)))):
    if rot:
        sc.display.shading.light = 'FLAT'
        sc.display.shading.light = 'MATCAP'
    for name, off in views.items():
        bpy.ops.object.camera_add(location=target+Vector(off))
        cam = bpy.context.object
        cam.data.type, cam.data.ortho_scale = 'ORTHO', .95
        cam.rotation_euler = (target-cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.camera = cam
        sc.render.filepath = str(args.out/f'{name}{lightname}.png')
        bpy.ops.render.render(write_still=True)
