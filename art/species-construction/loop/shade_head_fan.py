"""Shaded head views for the ear-fan inner loop (geometry check, not a critic image).

Run with Blender (through loop_tools.py blender): --python shade_head_fan.py -- --scene <head.blend> --out <dir>
Workbench renders in head-local coordinates with the materials' viewport colours (so the pale inner-ear coat shows),
a studio light, and a second grazing pass (suffix -graze). Views: front (whole fan), front-left and front-right
closeups, left profile, top, back.
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
p.add_argument('--res', type=int, default=1100)
p.add_argument('--mark-pale', action='store_true', help='colour the pale inner-ear material red to see which faces carry it')
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
sc = bpy.context.scene
if args.mark_pale:
    for m in bpy.data.materials:
        if m.name.startswith('Pale inner-ear'):
            m.diffuse_color = (1, .15, .15, 1)
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x = args.res
sc.render.resolution_y = int(args.res*.62)
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'MATERIAL'
sc.display.shading.show_cavity = False
sc.render.film_transparent = False
if sc.world is None:
    sc.world = bpy.data.worlds.new('w')
sc.world.color = (1, 1, 1)
views = {
    'front': ((0, -4, .30), 2.45, (0, -4, 0)),
    'front-L': ((.62, -4, .26), 1.25, (0, -4, 0)),
    'front-R': ((-.62, -4, .26), 1.25, (0, -4, 0)),
    'q-L': ((.55, -3, .26), 1.5, (-2.2, -2.6, .5)),
    'left': ((0, 0, .18), 1.4, (4, 0, 0)),
    'top': ((0, 0, 0), 2.45, (0, 0, 4)),
    'above-L': ((.62, -.1, .42), 1.3, (0, -3, 2.6)),
    'side-L-low': ((.6, 0, .18), 1.3, (4, -1.5, 0)),
    'back': ((0, 0, .30), 2.45, (0, 4, 0)),
}
for lightname, mode in (('', 'STUDIO'), ('-graze', 'MATCAP')):
    for name, (target, scale, off) in views.items():
        target = Vector(target)
        bpy.ops.object.camera_add(location=target+Vector(off))
        cam = bpy.context.object
        cam.data.type, cam.data.ortho_scale = 'ORTHO', scale
        cam.data.clip_end = 100
        cam.rotation_euler = (target-cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.camera = cam
        sc.render.filepath = str(args.out/f'{name}{lightname}.png')
        if lightname:
            sc.display.shading.light = 'FLAT'
        else:
            sc.display.shading.light = 'STUDIO'
        bpy.ops.render.render(write_still=True)
