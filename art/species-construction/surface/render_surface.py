"""Render the furred Akinza scene from a fixed set of views with a fixed neutral three-point rig.

  python art/species-construction/loop/loop_tools.py blender art/species-construction/surface/render_surface.py \
      --log surface-render -- --surface <dir with surface.blend> --out <image dir> [--samples 32] [--views front,side]

The rig turns with the camera (key left and above, fill right, rim behind) so every view is lit the same way.
Writes one PNG per view plus index.json (images, strand count, per-view and total seconds).
"""
import argparse
import json
import math
import sys
import time
from pathlib import Path

import bpy
from mathutils import Vector

CENTER = Vector((0.0, 0.16, -0.03))
VIEWS = {
    # name: (azimuth degrees from the front toward +x, elevation degrees, target, ortho scale (tall side), width, height)
    'front': (0, 4, Vector((0.0, 0.16, -0.03)), 2.05, 768, 1024),
    'threequarter': (38, 8, Vector((0.0, 0.16, -0.03)), 2.05, 768, 1024),
    'side': (90, 4, Vector((0.0, 0.16, -0.03)), 2.05, 768, 1024),
    'back': (180, 4, Vector((0.0, 0.16, -0.03)), 2.05, 768, 1024),
    'head': (0, 3, Vector((0.0, -0.05, 0.6)), 1.3, 1024, 1024),
    'face': (0, 2, Vector((0.0, -0.15, 0.62)), 0.5, 1024, 1024),
}


def setup_world(scene):
    world = bpy.data.worlds.new('surface world')
    scene.world = world
    tree = world.node_tree
    tree.nodes.clear()
    light = tree.nodes.new('ShaderNodeBackground')
    light.inputs['Color'].default_value = (0.5, 0.5, 0.5, 1)
    light.inputs['Strength'].default_value = 0.6
    plain = tree.nodes.new('ShaderNodeBackground')
    plain.inputs['Color'].default_value = (0.93, 0.93, 0.93, 1)
    plain.inputs['Strength'].default_value = 1.0
    lp = tree.nodes.new('ShaderNodeLightPath')
    mix = tree.nodes.new('ShaderNodeMixShader')
    out = tree.nodes.new('ShaderNodeOutputWorld')
    tree.links.new(lp.outputs['Is Camera Ray'], mix.inputs[0])
    tree.links.new(light.outputs['Background'], mix.inputs[1])
    tree.links.new(plain.outputs['Background'], mix.inputs[2])
    tree.links.new(mix.outputs['Shader'], out.inputs['Surface'])


def make_rig():
    rig = []
    for name, energy, size in (('key', 3.2, 6), ('fill', 1.1, 6), ('rim', 2.4, 4)):
        data = bpy.data.lights.new(name, 'SUN')
        data.energy = energy
        data.angle = math.radians(size)
        obj = bpy.data.objects.new(name, data)
        bpy.context.scene.collection.objects.link(obj)
        rig.append(obj)
    return rig


def aim(obj, target):
    direction = target-obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


def place(camera, rig, view):
    az, el, target, scale, w, h = view
    a, e = math.radians(az), math.radians(el)
    cam_dir = Vector((math.sin(a)*math.cos(e), -math.cos(a)*math.cos(e), math.sin(e)))
    camera.location = target+cam_dir*8.0
    aim(camera, target)
    camera.data.type, camera.data.ortho_scale = 'ORTHO', scale
    # basis: right and up as seen from the camera
    forward = (target-camera.location).normalized()
    right = forward.cross(Vector((0, 0, 1))).normalized()
    up = right.cross(forward).normalized()
    toward_camera = -forward
    spots = {
        'key': (toward_camera*0.8-right*0.9+up*0.9),
        'fill': (toward_camera*0.9+right*1.0+up*0.15),
        'rim': (-toward_camera*0.9+right*0.4+up*1.0),
    }
    for obj in rig:
        obj.location = target+spots[obj.name].normalized()*6.0
        aim(obj, target)
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = w, h


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--surface', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--samples', type=int, default=32)
    parser.add_argument('--views', default=','.join(VIEWS))
    parser.add_argument('--device', default='CPU')
    parser.add_argument('--hide-fur', action='store_true')
    parser.add_argument('--debug-attr', default=None, help='show this skin attribute as emission, fur hidden')
    args = parser.parse_args(sys.argv[len(sys.argv)-sys.argv[::-1].index('--'):])
    t_all = time.time()
    bpy.ops.wm.open_mainfile(filepath=str(args.surface/'surface.blend'))
    args.out.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 4
    scene.cycles.diffuse_bounces = 2
    scene.cycles.glossy_bounces = 2
    scene.cycles.transmission_bounces = 2
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.render.film_transparent = False
    for ob in list(bpy.data.objects):
        if ob.type in ('CAMERA', 'LIGHT'):
            bpy.data.objects.remove(ob)
    if args.hide_fur:
        for ob in bpy.data.objects:
            if ob.name == 'Akinza fur':
                ob.hide_render = True
    if args.debug_attr:
        for ob in bpy.data.objects:
            if ob.name == 'Akinza fur':
                ob.hide_render = True
            if ob.type == 'MESH' and len(ob.data.vertices) > 500000:
                for mat in ob.data.materials:
                    t = mat.node_tree
                    t.nodes.clear()
                    a = t.nodes.new('ShaderNodeAttribute')
                    a.attribute_name = args.debug_attr
                    e = t.nodes.new('ShaderNodeEmission')
                    o = t.nodes.new('ShaderNodeOutputMaterial')
                    t.links.new(a.outputs['Fac'], e.inputs['Color'])
                    t.links.new(e.outputs['Emission'], o.inputs['Surface'])
        scene.view_settings.view_transform = 'Standard'
    setup_world(scene)
    rig = make_rig()
    cam_data = bpy.data.cameras.new('surface camera')
    camera = bpy.data.objects.new('surface camera', cam_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    info_path = args.surface/'surface-info.json'
    info = json.loads(info_path.read_text()) if info_path.is_file() else {}
    records = []
    for name in args.views.split(','):
        place(camera, rig, VIEWS[name])
        bpy.context.view_layer.update()
        scene.render.filepath = str(args.out/f'{name}.png')
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        seconds = round(time.time()-t0, 1)
        print(f'rendered {name} in {seconds}s')
        records.append({'view': name, 'image': f'{name}.png', 'seconds': seconds,
                        'resolution': [scene.render.resolution_x, scene.render.resolution_y]})
    total = round(time.time()-t_all, 1)
    (args.out/'index.json').write_text(json.dumps({
        'strands': info.get('strands'), 'strandPoints': info.get('strandPoints'), 'samples': args.samples,
        'engine': 'CYCLES CPU with denoise', 'images': records, 'renderSecondsTotal': round(sum(r['seconds'] for r in records), 1),
        'wallSecondsIncludingLoad': total}, indent=2))


if __name__ == '__main__':
    main()
