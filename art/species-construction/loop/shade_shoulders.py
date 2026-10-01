"""Quick shaded neck and shoulder views of a body component (and optional head), to read caps, ledges and pockets.

Run through loop_tools.py blender:
  shade_shoulders.py --glb <body shape.glb> --out <dir> [--head <head shape.glb>]
Writes Workbench renders (studio light, one grey, plus a grazing matcap pass) of the neck base and shoulders:
shoulders-front, shoulders-back, shoulders-left, shoulders-q (rear three-quarter), neck-rear, neck-profile.
Body only unless --head is given (then placed as the assembly does, no bridge); a geometry check, not a critic image.
"""
import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

p = argparse.ArgumentParser()
p.add_argument('--glb', type=Path, required=True)
p.add_argument('--head', type=Path)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--res', type=int, default=800)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.glb.resolve()))
for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('Curved')]:
    bpy.data.objects.remove(o, do_unlink=True)
if args.head:
    prior = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(args.head.resolve()))
    for o in [o for o in bpy.data.objects if o not in prior and o.type == 'MESH']:
        t = o.matrix_world.copy()
        for v in o.data.vertices:
            v.co = (t @ v.co)*.5+Vector((0, -.02, .635))
        o.parent = None
        o.matrix_world = Matrix.Identity(4)
sc = bpy.context.scene
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
neck = Vector((0, -.035, .40))
sh = Vector((0, -.035, .33))
views = [
    ('shoulders-front', sh, (0, -6, 0), .75), ('shoulders-back', sh, (0, 6, 0), .75),
    ('shoulders-left', sh, (-6, 0, 0), .75), ('shoulders-q', sh, (4.2, 4.2, 1.0), .75),
    ('neck-rear', neck, (0, 6, 0), .42), ('neck-profile', neck, (-6, 0, 0), .42),
    ('neck-q', neck, (3, 3, .8), .42),
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
