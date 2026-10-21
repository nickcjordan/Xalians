"""B-bafy: is the open ring at the top of the fore paw (pass 8 paw-part top view) a gap in the model? Read only.

blender -b --factory-startup --python forepaw_ring_check.py -- RIG_BLEND PAWS_BLEND OUT_DIR
1. Integrated sculpt (luceras_blockout in RIG_BLEND): boundary and non-manifold edges, overall and within 6 cm of
   each fore paw join ring height; n-gon count.
2. Pass 8 paw part (paw_fore_l in PAWS_BLEND): its n-gons (the flat cap over the join ring), their size and height.
3. Renders of the integrated sculpt at rest, Cycles clay: straight down with clip start 1 mm (nothing clipped; the
   head is above the paws), the same view with the pass 8 preview's camera clip (clip start 0.93 from 1 m), a high
   three-quarter (el 60) and a low three-quarter of the wrist, both unclipped.
"""
import bpy, bmesh, sys, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'roster'))
import lookdev

RIG, PAWS, OUT = sys.argv[sys.argv.index('--') + 1:][:3]; OUT = Path(OUT); OUT.mkdir(parents=True, exist_ok=True)
rep = {}


def edge_stats(o, region=None):
    bm = bmesh.new(); bm.from_mesh(o.data)
    bnd = [e for e in bm.edges if e.is_boundary]; nm = [e for e in bm.edges if not e.is_manifold]
    ng = [f for f in bm.faces if len(f.verts) > 4]
    def inreg(e):
        if region is None: return True
        c = (e.verts[0].co + e.verts[1].co) / 2; return region(c)
    out = {'vertices': len(bm.verts), 'faces': len(bm.faces), 'boundary_edges': len(bnd), 'nonmanifold_edges': len(nm), 'ngons': len(ng),
           'ngon_sizes': sorted([len(f.verts) for f in ng], reverse=True)[:5],
           'ngon_centres': [[round(x, 4) for x in f.calc_center_median()] for f in sorted(ng, key=lambda f: -len(f.verts))[:4]]}
    if region is not None:
        out['boundary_edges_in_region'] = sum(inreg(e) for e in bnd); out['nonmanifold_edges_in_region'] = sum(inreg(e) for e in nm)
        out['boundary_edge_sample'] = [[round(x, 4) for x in ((e.verts[0].co + e.verts[1].co) / 2)] for e in bnd[:10]]
    bm.free(); return out


def top_render(objs, centre, name, half=0.07, az=None, el=90.0, dist=3.0, clip=0.001):
    sc = bpy.context.scene
    cd = bpy.data.cameras.new('cam_' + name); cd.type = 'ORTHO'; cd.ortho_scale = 2 * half; cd.clip_start = clip; cd.clip_end = 100
    cam = bpy.data.objects.new(cd.name, cd); sc.collection.objects.link(cam)
    d = lookdev.camera_direction(az if az is not None else 0.0, el)
    cam.location = centre + d * dist; cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = (-d).to_track_quat('-Z', 'Y' if el < 89 else 'Y')
    sc.camera = cam; sc.render.resolution_x = sc.render.resolution_y = 800; sc.render.filepath = str(OUT / name)
    bpy.ops.render.render(write_still=True); print('RENDERED', name, flush=True)


# 1. integrated sculpt
bpy.ops.wm.open_mainfile(filepath=RIG)
rig = bpy.data.objects['luceras_rig']; rig.animation_data_create(); rig.animation_data.action = None
for p in rig.pose.bones: p.rotation_mode = 'QUATERNION'; p.rotation_quaternion = (1, 0, 0, 0); p.location = (0, 0, 0); p.scale = (1, 1, 1)
body = bpy.data.objects['luceras_blockout']
b3 = {s: rig.data.bones[f'leg_f{s}_03'] for s in 'lr'}
foot = {s: Vector(b3[s].head_local) for s in 'lr'}
rep['integrated'] = edge_stats(body, region=lambda c: any((c - foot[s]).length < 0.09 for s in 'lr'))
rep['integrated']['region'] = 'within 9 cm of either fore ankle joint (leg_f*_03 head), which covers the paw, the wrist and the join ring'
lookdev.setup_scene('CYCLES'); sc = bpy.context.scene; sc.cycles.samples = 48; sc.cycles.use_denoising = True
for o in sc.objects:
    if o.type == 'MESH':
        if o.get('body_kind') == 'sculpt': lookdev.apply_clay(o); o.hide_render = False
        else: o.hide_render = True
paw_c = Vector((foot['l'].x, foot['l'].y - 0.04, 0.03))
top_render(None, paw_c, 'top_integrated_noclip.png', half=0.0525)
# the pass 8 paw-part preview's top view (paw_part_blend.py shoot): ortho 0.105, camera 1.0 m above the target,
# clip_start 0.93, i.e. everything more than 7 cm above the target is cut away by the camera
top_render(None, paw_c, 'top_integrated_clip093_like_pass8_preview.png', half=0.0525, dist=1.0, clip=0.93)
top_render(None, paw_c, 'high_tq_integrated_noclip.png', half=0.07, az=60.0, el=60.0)
top_render(None, Vector((foot['l'].x, foot['l'].y - 0.01, 0.06)), 'wrist_integrated_tq.png', half=0.08, az=60.0, el=20.0)

# 2. pass 8 paw part alone
bpy.ops.wm.read_factory_settings(use_empty=True)
with bpy.data.libraries.load(PAWS, link=False) as (src, dst):
    dst.objects = [n for n in src.objects if n.startswith(('paw_fore_l', 'fore_claw_l'))]
sc = bpy.context.scene
for o in dst.objects:
    if o: sc.collection.objects.link(o)
part = [o for o in dst.objects if o and o.name.startswith('paw_fore_l')][0]
rep['pawpart_fore_l'] = edge_stats(part)
rep['pawpart_fore_l']['note'] = 'as stored in paws.blend (not rendered here)'
(OUT / 'forepaw_ring.json').write_text(json.dumps(rep, indent=1))
print('RING', json.dumps(rep), flush=True)
