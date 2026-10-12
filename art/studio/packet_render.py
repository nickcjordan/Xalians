"""Packet renderer (runs inside Blender, launched by packet.py through loop_tools.py blender).

    packet_render.py --scene <assembly .blend> --cameras <cameras json> --out <dir> [--only id,id]

Opens the assembly, gives the skin a neutral clay material (the pale inner-ear coat, eyes, irises, nose,
mouth and claws keep their own materials), lights it with one fixed rig that never moves with a camera,
and renders every camera of the cameras file to <out>/<id>.png as RGBA (transparent background; packet.py
composites). Fixed seed, fixed samples, CPU device: two runs of the same scene give the same pixels.
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument('--scene', type=Path, required=True)
p.add_argument('--cameras', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--only', default='')
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
spec = json.loads(args.cameras.read_text(encoding='utf-8'))
cfg = spec['render']
args.out.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
sc = bpy.context.scene

# Neutral clay on every material that is the skin's construction clay; everything else is kept.
clay = bpy.data.materials.new('packet clay')
clay.use_nodes = True
bsdf = next(n for n in clay.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
bsdf.inputs['Base Color'].default_value = (*cfg['clay']['color'], 1)
bsdf.inputs['Roughness'].default_value = cfg['clay']['roughness']
for obj in sc.objects:
    if obj.type != 'MESH':
        continue
    for slot in obj.material_slots:
        if slot.material and 'clay' in slot.material.name.lower() and 'crease' not in slot.material.name.lower():
            slot.material = clay

sc.render.engine = 'CYCLES'
sc.cycles.device = cfg.get('device', 'CPU')
sc.cycles.samples = cfg['samples']
sc.cycles.seed = cfg['seed']
sc.cycles.use_animated_seed = False
sc.cycles.use_denoising = cfg['denoise']
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.render.film_transparent = True
sc.view_settings.view_transform = cfg['viewTransform']
sc.render.resolution_percentage = 100
if sc.world is None:
    sc.world = bpy.data.worlds.new('w')
sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (*cfg['world']['color'], 1)
bg.inputs['Strength'].default_value = cfg['world']['strength']

rig = spec['lightRig']
aim = Vector(rig['aim'])
for lamp_spec in rig['lamps']:
    bpy.ops.object.light_add(type='AREA', location=aim+Vector(lamp_spec['offset']))
    lamp = bpy.context.object
    lamp.data.energy, lamp.data.size = lamp_spec['power'], lamp_spec['size']
    lamp.rotation_euler = (aim-lamp.location).to_track_quat('-Z', 'Y').to_euler()

only = {c for c in args.only.split(',') if c}
for cam_spec in spec['cameras']:
    if only and cam_spec['id'] not in only:
        continue
    target, offset = Vector(cam_spec['target']), Vector(cam_spec['offset'])
    bpy.ops.object.camera_add(location=target+offset)
    cam = bpy.context.object
    cam.data.type, cam.data.ortho_scale, cam.data.clip_end = 'ORTHO', cam_spec['orthoScale'], 100
    cam.rotation_euler = (target-cam.location).to_track_quat('-Z', 'Y').to_euler()
    res = cam_spec.get('resolution', spec['resolution'])
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.camera = cam
    sc.render.filepath = str(args.out/f"{cam_spec['id']}.png")
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)
print('PACKET RENDER DONE')
