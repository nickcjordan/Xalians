"""Quick shaded trunk views of a body component, to read bands, ledges and chest or waist volume (R06).

Run through loop_tools.py blender:
  shade_trunk.py --glb <body shape.glb> --out <dir> [--res 700] [--cavity]
Writes Workbench renders of the trunk (rib cage to hips) as front, left and front three-quarter, each in studio light and
in a grazing matcap pass: trunk-front, trunk-left, trunk-q (+ -graze). Body only, claws removed; a geometry check, not a critic image.
"""
import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument('--glb', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--res', type=int, default=700)
p.add_argument('--cavity', action='store_true')
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.glb.resolve()))
for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('Curved')]:
    bpy.data.objects.remove(o, do_unlink=True)
sc = bpy.context.scene
for light in [o for o in sc.objects if o.type == 'LIGHT']:
    bpy.data.objects.remove(light, do_unlink=True)
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x = sc.render.resolution_y = args.res
sc.display.shading.color_type = 'SINGLE'
sc.display.shading.single_color = (.75, .75, .75)
sc.display.shading.show_cavity = args.cavity
if args.cavity:
    sc.display.shading.cavity_type = 'BOTH'
    sc.display.shading.cavity_ridge_factor = 1.2
    sc.display.shading.cavity_valley_factor = 1.2
sc.render.film_transparent = False
if sc.world is None:
    sc.world = bpy.data.worlds.new('w')
sc.world.color = (1, 1, 1)
target = Vector((0, -.035, .12))
views = [('trunk-front', (0, -6, 0)), ('trunk-left', (-6, 0, 0)), ('trunk-q', (-3.6, -4.8, 1.0))]
for name, off in views:
    for graze in (False, True):
        sc.display.shading.light = 'MATCAP' if graze else 'STUDIO'
        bpy.ops.object.camera_add(location=target+Vector(off))
        cam = bpy.context.object
        cam.data.type, cam.data.ortho_scale = 'ORTHO', .95
        cam.rotation_euler = (target-cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.camera = cam
        sc.render.filepath = str(args.out/f'{name}{"-graze" if graze else ""}.png')
        bpy.ops.render.render(write_still=True)
