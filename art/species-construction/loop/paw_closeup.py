"""Shaded clay closeups of one hind paw of a body component (front, left, back, front three-quarter, underside).

Run with Blender through loop_tools:  python loop_tools.py blender art/species-construction/loop/paw_closeup.py \
    --glb <body-dir>/shape.glb --out <png-prefix> [--side 1]
Workbench studio light, orthographic cameras aimed at the paw of the +x (side 1) or -x (side -1) leg, claws included.
"""
import argparse
import sys

import bpy
from mathutils import Vector

ap = argparse.ArgumentParser()
ap.add_argument('--glb', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--side', type=int, default=1)
ap.add_argument('--center', default='.36,-.03,-.90')
ap.add_argument('--scale', type=float, default=.42)
args = ap.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args.glb)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'SINGLE'
scene.display.shading.single_color = (.72, .72, .72)
scene.display.shading.show_cavity = False
scene.render.resolution_x = 640
scene.render.resolution_y = 560
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'
world = bpy.data.worlds.new('w'); scene.world = world
world.color = (.2, .2, .2)
c = Vector([float(v) for v in args.center.split(',')])
c.x *= args.side
s = args.side
views = {'front': (0, -1, 0), 'left': (s, 0, 0), 'back': (0, 1, 0), 'q': (.8*s, -.6, .25),
         'under': (0, -.25, -1)}
cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'; cam_data.ortho_scale = args.scale
cam = bpy.data.objects.new('cam', cam_data); scene.collection.objects.link(cam); scene.camera = cam
for name, d in views.items():
    d = Vector(d).normalized()
    cam.location = c+d*4
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{args.out}-{name}.png'
    bpy.ops.render.render(write_still=True)
