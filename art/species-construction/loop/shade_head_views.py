"""Custom-camera shaded head views (geometry check, not a critic image).

Run through loop_tools.py blender: shade_head_views.py --scene <head.blend> --out <dir> --view name:tx,ty,tz:scale:ox,oy,oz ...
Orthographic Workbench renders in head-local coordinates, studio light and a flat-lit pass. Built for R04, where
the ear fan's rear, top and profile need oblique looks the fixed set in shade_head_fan.py does not give.
"""
import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument('--scene', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--res', type=int, default=1000)
p.add_argument('--view', action='append', required=True)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x = sc.render.resolution_y = args.res
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'MATERIAL'
sc.render.film_transparent = False
if sc.world is None:
    sc.world = bpy.data.worlds.new('w')
sc.world.color = (1, 1, 1)
for spec in args.view:
    name, target, scale, off = spec.split(':')
    target = Vector([float(v) for v in target.split(',')])
    off = Vector([float(v) for v in off.split(',')])
    bpy.ops.object.camera_add(location=target+off)
    cam = bpy.context.object
    cam.data.type, cam.data.ortho_scale, cam.data.clip_end = 'ORTHO', float(scale), 100
    cam.rotation_euler = (target-cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    sc.render.filepath = str(args.out/f'{name}.png')
    bpy.ops.render.render(write_still=True)
