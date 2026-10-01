"""Shaded clay closeups of the hind legs of a body component (front, left, back and a three-quarter view).

Run with Blender through loop_tools:  python loop_tools.py blender art/species-construction/loop/leg_closeup.py \
    --glb <body-dir>/shape.glb --out <png-prefix>
Uses Workbench with a matcap-like studio light so a builder can inspect calf, knee and ankle surfaces without an
assembly. Cameras are orthographic and aimed at the +x leg (the character's left leg in front and back views).
"""
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ap = argparse.ArgumentParser()
ap.add_argument('--glb', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--center', default='.27,.0,-.62')
ap.add_argument('--scale', type=float, default=.95)
args = ap.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args.glb)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'SINGLE'
scene.display.shading.single_color = (.72, .72, .72)
scene.display.shading.show_cavity = False
scene.render.resolution_x = 700
scene.render.resolution_y = 900
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'
world = bpy.data.worlds.new('w'); scene.world = world
world.color = (.2, .2, .2)
c = Vector([float(v) for v in args.center.split(',')])
views = {'front': (0, -1, 0), 'left': (1, 0, 0), 'back': (0, 1, 0), 'q': (.8, -.6, .15)}
cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'; cam_data.ortho_scale = args.scale
cam = bpy.data.objects.new('cam', cam_data); scene.collection.objects.link(cam); scene.camera = cam
for name, d in views.items():
    d = Vector(d).normalized()
    cam.location = c+d*4
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{args.out}-{name}.png'
    bpy.ops.render.render(write_still=True)
