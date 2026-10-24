"""Packet renderer (runs inside Blender, launched by packet.py through runner.py blender).

    packet_render.py --scene <assembly .blend> --cameras <cameras json> --out <dir> [--only id,id] [--samples N]
        [--look clay|grazing|curvature]

Opens the assembly, gives the skin a neutral clay material (the pale inner-ear coat, eyes, irises, nose,
mouth and claws keep their own materials), gives every object that carries a material tag (the custom property
"material" that blockout.py writes on separate objects) the studio material for that tag (MATERIALS below;
an unknown or empty tag gets the clay), lights it with one fixed rig that never moves with a camera,
and renders every camera of the cameras file to <out>/<id>.png as RGBA (transparent background; packet.py
composites). Fixed seed, fixed samples, CPU device: two runs of the same scene give the same pixels.

Looks (alignment with the creature pipeline's review rules, 2026-10-23): `clay` is the standard look; `grazing` drops
the fixed rig and lights each camera with one hard light raking across the surface from the camera's left at a low
angle, so lumps, ripples, steps and seams cast long shadows; `curvature` replaces every material with an unlit
color from each vertex's relief against a smoothed copy of the surface (crease blue, flat gray, ridge amber, full
color at 1.2 mm), which shows creases, grafts and pinches that shading hides (lesson 43: part joins need a
curvature check).
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
p.add_argument('--samples', type=int, default=0, help='override the cameras file sample count (quick previews); denoising is forced on')
p.add_argument('--look', default='clay', choices=['clay', 'grazing', 'curvature'])
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


def eye_material(obj):
    """Cartoon eye for clay reviews, procedural from the object's local coordinates (origin at the ball center,
    unrotated) and its gaze, no UVs. By the angle from the gaze: a very dark pupil, a warm amber iris (deep brown
    at the top to amber at the bottom, the sheet's eyes), a thin dark rim at the iris edge, and dark brown past
    it, so no white sclera shows. A clear coat of very low roughness gives a real catch light from the key lamp.
    Angles (degrees from the gaze) can be set per object with the custom property shading, a JSON object with
    pupilDeg, irisDeg (where the dark rim starts) and rimDeg."""
    shade = {'pupilDeg': 30.0, 'irisDeg': 58.0, 'rimDeg': 66.0}
    if 'shading' in obj.keys():
        shade.update(json.loads(obj['shading']))
    gaze = Vector(obj['gaze']).normalized() if 'gaze' in obj.keys() else Vector((0, -1, 0))
    mat = bpy.data.materials.new(f'packet eye {obj.name}')
    mat.use_nodes = True
    nt = mat.node_tree
    N, L = nt.nodes, nt.links
    bsdf = next(n for n in N if n.type == 'BSDF_PRINCIPLED')
    tc = N.new('ShaderNodeTexCoord')
    norm = N.new('ShaderNodeVectorMath')
    norm.operation = 'NORMALIZE'
    L.new(tc.outputs['Object'], norm.inputs[0])
    dot = N.new('ShaderNodeVectorMath')
    dot.operation = 'DOT_PRODUCT'
    L.new(norm.outputs['Vector'], dot.inputs[0])
    dot.inputs[1].default_value = gaze
    acos = N.new('ShaderNodeMath')
    acos.operation = 'ARCCOSINE'
    L.new(dot.outputs['Value'], acos.inputs[0])
    deg = N.new('ShaderNodeMath')                     # angle from the gaze over 90 degrees, 0..2
    deg.operation = 'MULTIPLY'
    deg.inputs[1].default_value = 2/3.141592653589793
    L.new(acos.outputs[0], deg.inputs[0])
    # iris mask by angle: 0 pupil, 1 iris, back to 0 at the rim
    mask = N.new('ShaderNodeValToRGB')
    L.new(deg.outputs[0], mask.inputs['Fac'])
    els = mask.color_ramp.elements
    p, i, r = shade['pupilDeg']/90, shade['irisDeg']/90, shade['rimDeg']/90
    els[0].position, els[0].color = 0.0, (0, 0, 0, 1)
    els[1].position, els[1].color = p, (0, 0, 0, 1)
    for pos, v in ((p+0.035, 1.0), (i, 1.0), (min(i+0.04, r), 0.0)):
        e = els.new(pos)
        e.color = (v, v, v, 1)
    # iris color by height across the eye: deep brown at the top to warm amber at the bottom
    sep = N.new('ShaderNodeSeparateXYZ')
    L.new(norm.outputs['Vector'], sep.inputs[0])
    up = N.new('ShaderNodeMapRange')
    up.inputs['From Min'].default_value, up.inputs['From Max'].default_value = -0.7, 0.7
    L.new(sep.outputs['Z'], up.inputs['Value'])
    iris = N.new('ShaderNodeValToRGB')
    L.new(up.outputs['Result'], iris.inputs['Fac'])
    ie = iris.color_ramp.elements
    ie[0].position, ie[0].color = 0.15, (0.50, 0.17, 0.025, 1)     # amber (sheet swatch about 181, 101, 29)
    ie[1].position, ie[1].color = 0.9, (0.16, 0.050, 0.012, 1)     # deep brown under the upper lid
    mix = N.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    L.new(mask.outputs['Color'], mix.inputs[0])
    mix.inputs[6].default_value = (0.006, 0.004, 0.003, 1)         # pupil and rim: near black, warm
    L.new(iris.outputs['Color'], mix.inputs[7])
    # past the rim (the ball under the lids, seen only from the side): deep brown, never white
    outer = N.new('ShaderNodeMapRange')
    outer.inputs['From Min'].default_value, outer.inputs['From Max'].default_value = r+0.01, r+0.05
    L.new(deg.outputs[0], outer.inputs['Value'])
    mix2 = N.new('ShaderNodeMix')
    mix2.data_type = 'RGBA'
    L.new(outer.outputs['Result'], mix2.inputs[0])
    L.new(mix.outputs[2], mix2.inputs[6])
    mix2.inputs[7].default_value = (0.045, 0.016, 0.006, 1)
    L.new(mix2.outputs[2], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.5
    bsdf.inputs['Specular IOR Level'].default_value = 0.25           # the base adds little sheen; the coat glints
    bsdf.inputs['Coat Weight'].default_value = 1.0
    bsdf.inputs['Coat Roughness'].default_value = 0.02
    bsdf.inputs['Coat IOR'].default_value = 1.35
    return mat


MATERIALS = {'eye': eye_material}

for obj in sc.objects:
    if obj.type != 'MESH':
        continue
    if 'material' in obj.keys():
        tag = obj['material']
        mat = MATERIALS[tag](obj) if tag in MATERIALS else clay
        for slot in obj.material_slots:
            slot.material = mat
        continue
    for slot in obj.material_slots:
        if slot.material and 'clay' in slot.material.name.lower() and 'crease' not in slot.material.name.lower():
            slot.material = clay

sc.render.engine = 'CYCLES'
sc.cycles.device = cfg.get('device', 'CPU')
sc.cycles.samples = args.samples or cfg['samples']
sc.cycles.seed = cfg['seed']
sc.cycles.use_animated_seed = False
sc.cycles.use_denoising = True if args.samples else cfg['denoise']
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

def relief(mesh, iterations=40):
    """Signed relief per vertex at a scale of a few millimeters: how far each vertex stands out along its normal
    from a Laplacian-smoothed copy of the surface (positive on ridges and bumps, negative in creases and steps).
    Cycles' pointiness measures the angle at single edges, which is near flat everywhere on a dense voxel mesh."""
    import numpy as np
    n = len(mesh.vertices)
    co = np.empty(n*3)
    mesh.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    nor = np.empty(n*3)
    mesh.vertex_normals.foreach_get('vector', nor)
    nor = nor.reshape(-1, 3)
    ed = np.empty(len(mesh.edges)*2, dtype=np.int64)
    mesh.edges.foreach_get('vertices', ed)
    a, b = ed[0::2], ed[1::2]
    deg = np.bincount(a, minlength=n)+np.bincount(b, minlength=n)
    deg = np.maximum(deg, 1)[:, None]
    sm = co.copy()
    for _ in range(iterations):
        nb = np.stack([np.bincount(a, weights=sm[b, k], minlength=n)+np.bincount(b, weights=sm[a, k], minlength=n)
                       for k in range(3)], axis=1)
        sm = 0.5*sm+0.5*nb/deg
    return ((co-sm)*nor).sum(axis=1)


def curvature_material():
    """Unlit color from the 'relief' attribute: 1.2 mm into a crease is full blue, 1.2 mm out on a ridge is full
    amber, flat is gray."""
    mat = bpy.data.materials.new('packet curvature')
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL':
            nt.nodes.remove(n)
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    attr = nt.nodes.new('ShaderNodeAttribute')
    attr.attribute_name = 'relief'
    rng = nt.nodes.new('ShaderNodeMapRange')
    rng.inputs['From Min'].default_value, rng.inputs['From Max'].default_value = -0.0012, 0.0012
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.0, (0.03, 0.16, 0.85, 1)        # crease: blue
    els[1].position, els[1].color = 1.0, (0.95, 0.52, 0.03, 1)        # ridge: amber
    mid = els.new(0.5)
    mid.color = (0.6, 0.6, 0.6, 1)
    emit = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(attr.outputs['Fac'], rng.inputs['Value'])
    nt.links.new(rng.outputs['Result'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], emit.inputs['Color'])
    nt.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat


if args.look == 'curvature':
    cmat = curvature_material()
    for obj in sc.objects:
        if obj.type == 'MESH':
            values = relief(obj.data)
            at = obj.data.attributes.get('relief') or obj.data.attributes.new('relief', 'FLOAT', 'POINT')
            at.data.foreach_set('value', values)
            obj.data.materials.clear()
            obj.data.materials.append(cmat)
    bg.inputs['Strength'].default_value = 0.0

rig = spec['lightRig']
aim = Vector(rig['aim'])
for lamp_spec in (rig['lamps'] if args.look == 'clay' else []):
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
    rake = None
    if args.look == 'grazing':
        view = (target-cam.location).normalized()
        left = view.cross(Vector((0, 0, 1)))
        if left.length < 1e-6:
            left = Vector((1, 0, 0))
        left.normalize()
        direction = (left*0.9-view*0.3+Vector((0, 0, 0.25))).normalized()   # source on the camera's left, low
        bpy.ops.object.light_add(type='SUN', location=target)
        rake = bpy.context.object
        rake.data.energy, rake.data.angle = 4.0, 0.02
        rake.rotation_euler = (-direction).to_track_quat('-Z', 'Y').to_euler()
        bg.inputs['Strength'].default_value = 0.22
    sc.render.filepath = str(args.out/f"{cam_spec['id']}.png")
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)
    if rake is not None:
        bpy.data.objects.remove(rake)
print('PACKET RENDER DONE')
