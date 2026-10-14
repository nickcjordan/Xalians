"""Turn a reconstruction (shape.glb) into a studio scene the packet renderer can open (runs inside Blender).

    runner.py blender art/studio/recon/recon_scene.py -- --glb <shape.glb> --out <scene.blend>
        [--height 0.658] [--center-y 0.005] [--transform <json>]

The glTF importer turns the model's y-up frame into Blender's z-up one; the reconstruction faces the input
camera (+z in glTF), which becomes -y, the studio's forward. The mesh is scaled so its height matches --height
(the v5 blockout's ground to horn tip, 0.658 m), set on the ground at its lowest point, centered in x, and
centered in y on --center-y. --transform instead gives an explicit {"scale": s, "offset": [x, y, z]} applied
after the import (for a head-only reconstruction aligned by landmarks). The skin gets a material named
"construction clay" so packet_render.py gives it the studio clay. Experiment X29.
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument('--glb', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--height', type=float, default=0.658)
p.add_argument('--center-y', type=float, default=0.005)
p.add_argument('--transform', type=Path)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(args.glb.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if len(meshes) != 1:
    sys.exit(f'expected one mesh in {args.glb}, found {len(meshes)}')
obj = meshes[0]
obj.name = 'skin'
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
if obj.parent:
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
vs = [v.co for v in obj.data.vertices]
lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
if args.transform:
    t = json.loads(args.transform.read_text(encoding='utf-8'))
    s, off = t['scale'], Vector(t['offset'])
else:
    s = args.height/(hi.z-lo.z)
    off = Vector((-(lo.x+hi.x)/2*s, args.center_y-(lo.y+hi.y)/2*s, -lo.z*s))
for v in obj.data.vertices:
    v.co = v.co*s+off
obj.data.update()
mat = bpy.data.materials.new('construction clay')
obj.data.materials.clear()
obj.data.materials.append(mat)
for poly in obj.data.polygons:
    poly.use_smooth = True
args.out.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(args.out.resolve()))
print(json.dumps({'scale': s, 'offset': list(off), 'boundsBefore': [list(lo), list(hi)]}))
