"""Fast silhouette preview of a head and body pair, for the builder's inner loop.

Imports both components, places the head exactly as the assembly does, and
renders flat masks from fixed orthographic cameras. The cameras never reframe,
so pixel rows map to fixed world heights and `loop_tools.py fit` can compare
any preview with the reference sheet. No union, fairing or neck bridge is
built; the neck band is approximate. This is a preview, not a candidate.

  blender -b --factory-startup --python quick_silhouette.py -- --head H.glb --body B.glb --out DIR
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

parser = argparse.ArgumentParser()
parser.add_argument('--head', type=Path, required=True)
parser.add_argument('--body', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--views', default='front,left,back')
parser.add_argument('--width', type=int, default=900)
# Placement matches loop_tools.PLACEMENT and assemble_reconstructed_creature.py.
parser.add_argument('--head-scale', type=float, default=.50)
parser.add_argument('--jaw-anchor-z', type=float, default=.500)
parser.add_argument('--head-depth-offset', type=float, default=-.020)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=True)

# Fixed framing, taken from the loop-start render (assembled-0156): the same
# ortho scale and centre for every preview, so previews are comparable.
ORTHO_SCALE = 3.2094
CENTER = Vector((0.0, .175, -.0267))
BODY_TRIM, HEAD_TRIM = .425, args.jaw_anchor_z-.048
OVERLAP = .03

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def load(path, scale, offset, keep):
    prior = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path.resolve()))
    objects = [o for o in bpy.data.objects if o not in prior and o.type == 'MESH']
    for obj in objects:
        transform = obj.matrix_world.copy()
        for v in obj.data.vertices:
            v.co = (transform @ v.co)*scale+Vector(offset)
        obj.parent = None
        obj.matrix_world = Matrix.Identity(4)
        drop = [v.index for v in obj.data.vertices if not keep(v.co.z)]
        if drop:
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bm.verts.ensure_lookup_table()
            bmesh.ops.delete(bm, geom=[bm.verts[i] for i in drop], context='VERTS')
            bm.to_mesh(obj.data)
            bm.free()
    return objects


load(args.body, 1, (0, 0, 0), lambda z: z <= BODY_TRIM+OVERLAP)
load(args.head, args.head_scale, (0, args.head_depth_offset, args.jaw_anchor_z+.27*args.head_scale),
     lambda z: z >= HEAD_TRIM-OVERLAP)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'FLAT'
scene.display.shading.color_type = 'SINGLE'
scene.display.shading.single_color = (.2, .2, .2)
scene.render.resolution_x = args.width
scene.render.resolution_y = round(args.width*2/3)
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
angles = {'front': 0, 'front-left': 45, 'left': 90, 'back': 180, 'right': 270, 'front-right': 315}
cameras = []
for name in args.views.split(','):
    a = math.radians(angles[name])
    bpy.ops.object.camera_add(location=CENTER+Vector((10*math.sin(a), -10*math.cos(a), 0)))
    camera = bpy.context.object
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = ORTHO_SCALE
    camera.rotation_euler = (CENTER-camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    scene.render.filepath = str(args.out/f'{name}.png')
    bpy.ops.render.render(write_still=True)
    cameras.append({'name': name, 'angle': angles[name], 'projection': 'orthographic',
                    'resolution': [scene.render.resolution_x, scene.render.resolution_y],
                    'orthoScale': ORTHO_SCALE, 'matrixWorld': [list(r) for r in camera.matrix_world]})
(args.out/'geometry.json').write_text(json.dumps({
    'scope': 'Quick silhouette preview: components placed as in assembly, no union or neck bridge',
    'head': str(args.head.resolve()), 'body': str(args.body.resolve()), 'cameras': cameras}, indent=1)+'\n')
