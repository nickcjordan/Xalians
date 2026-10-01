"""Cycles clay views of a head component, lit like the packet's m04 head views (geometry check, not a critic image).

Run through loop_tools.py blender: render_head_clay.py --scene <head.blend> --out <dir> [--views head-front,front-L,...]
The head is placed as the assembly places it (scale .5, offset (0, -.02, .635)); the three area lamps and the studio-fill world
are those of render_shape_study.py aimed at the whole-creature bounds centre of the Akinza assemblies. Materials of the head
blend are kept, so the pale inner-ear coat shows. Fixed views are in world coordinates.
"""
import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument('--scene', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--views', default='head-front,head-side,head-top,head-back,front-L,q-L')
p.add_argument('--samples', type=int, default=48)
p.add_argument('--res', type=int, default=800)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
sc = bpy.context.scene
root = bpy.data.objects.new('placement', None)
sc.collection.objects.link(root)
root.scale = (.5, .5, .5)
root.location = (0, -.02, .635)
for obj in list(sc.objects):
    if obj.type == 'MESH' and obj.parent is None:
        obj.parent = root
sc.render.engine = 'CYCLES'
sc.cycles.samples = args.samples
sc.cycles.use_denoising = True
sc.render.resolution_x = args.res
sc.render.resolution_y = args.res
sc.render.image_settings.file_format = 'PNG'
sc.render.film_transparent = True
if sc.world is None:
    sc.world = bpy.data.worlds.new('w')
sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (.60, .60, .60, 1)
bg.inputs['Strength'].default_value = .5
sc.view_settings.view_transform = 'Standard'
center = Vector((.0229, .1643, -.0266))
for pos, power, size in [((-3, -5, 7), 650, 4), ((4, -2, 4), 300, 4), ((1, 4, 6), 550, 3)]:
    bpy.ops.object.light_add(type='AREA', location=center+Vector(pos))
    lamp = bpy.context.object
    lamp.data.energy, lamp.data.size = power, size
    lamp.rotation_euler = (center-lamp.location).to_track_quat('-Z', 'Y').to_euler()
VIEWS = {
    'head-front': ((0, -.02, .66), (0, -6, 0), .9),
    'head-back': ((0, -.02, .66), (0, 6, 0), .9),
    'head-top': ((0, -.02, .66), (0, -.001, 6), .9),
    'head-side': ((0, -.02, .66), (6, 0, 0), .9),
    'front-L': ((.24, -.02, .72), (0, -6, 0), .56),
    'front-R': ((-.24, -.02, .72), (0, -6, 0), .56),
    'q-L': ((.24, -.02, .72), (-3.2, -4.6, 1.8), .6),
    'q-R': ((-.24, -.02, .72), (3.2, -4.6, 1.8), .6),
    'cup-L': ((.27, -.02, .72), (0, -6, 0), .30),
    'cup-R': ((-.27, -.02, .72), (0, -6, 0), .30),
    'side-L': ((.12, -.02, .72), (6, -.5, 0), .5),
    'outer-R': ((-.40, -.02, .79), (0, -6, 0), .3),
    'outer-L': ((.40, -.02, .79), (0, -6, 0), .3),
    'above-L': ((.15, -.02, .72), (-.5, -2.6, 5), .55),
}
for name in args.views.split(','):
    target, off, scale = VIEWS[name]
    target, off = Vector(target), Vector(off)
    bpy.ops.object.camera_add(location=target+off)
    cam = bpy.context.object
    cam.data.type, cam.data.ortho_scale, cam.data.clip_end = 'ORTHO', scale, 100
    cam.rotation_euler = (target-cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    sc.render.filepath = str(args.out/f'{name}.png')
    bpy.ops.render.render(write_still=True)
