"""Furred pose test: the fur of record follows the posed skin, rendered in the approved fur look (T7).

  run_blender.py fur_pose_test.py <log> -- <surface dir> <rig dir> <out dir> [--poses night_stalk,leg_reach]
      [--samples 32] [--sprite 192]

Binding (plan step 2, decision 3): every strand's root is bound to its nearest skin triangle (barycentric
coordinates) and every point of the strand is stored in that triangle's rest frame (edge, normal,
bitangent); for a pose the skin is posed by rig_core (dual quaternions plus the corrective keys of the rig
dir), and each strand is rebuilt from its posed triangle. Strand order is never changed (the 29c culls are
index based). The coat pattern reads the curves' stored `rest` attribute, so it stays on the body.
Eyes, nose, mouth and eyeliner ribbons follow the head bone, claws the hand and foot bones. Renders the
fur stage's side camera (render_surface.VIEWS['side'] angles) framed to the pose, at full size and at
sprite height. Also renders the left knee close up from the side and the front three-quarter. Writes <pose>_side.png,
<pose>_sprite.png, <pose>_knee_side.png, <pose>_knee_front.png and index.json into the out dir.
"""
import argparse
import json
import sys
import time
from pathlib import Path

import bpy
import numpy as np
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE.parent/'surface'))
import rig_core as rc  # noqa: E402
import render_surface as render  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('surface', type=Path)
p.add_argument('rig', type=Path)
p.add_argument('out', type=Path)
p.add_argument('--poses', default='rest,night_stalk,leg_reach')
p.add_argument('--samples', type=int, default=32)
p.add_argument('--sprite', type=int, default=192)
p.add_argument('--palette', default='T7')
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
a.out.mkdir(parents=True, exist_ok=True)
t0 = time.time()
R = a.rig
rig = json.loads((R/'rig.json').read_text())
J = json.loads((R/'joints.json').read_text())
poses = json.loads((R/'poses.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
wt = np.load(R/'weights.npz')
idx = wt['idx'].astype(int)
w = np.round(wt['w'].astype(np.float64)*4096)/4096
w /= w.sum(1, keepdims=True)
cj = json.loads((R/'correctives.json').read_text())
KEYS = cj['keys']
cz = np.load(R/'correctives.npz')
DELTAS = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in KEYS}

bpy.ops.wm.open_mainfile(filepath=str(a.surface/'surface.blend'))
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = a.samples
sc.cycles.use_denoising = True
sc.cycles.max_bounces, sc.cycles.diffuse_bounces, sc.cycles.glossy_bounces = 64, 16, 48
sc.cycles.transmission_bounces, sc.cycles.transparent_max_bounces = 48, 64
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGB'
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
for ob in list(bpy.data.objects):
    if ob.type in ('CAMERA', 'LIGHT'):
        bpy.data.objects.remove(ob)
pals = json.loads((HERE.parent/'surface'/'akinza-palettes.json').read_text())
render.apply_palette(pals[a.palette], pals[a.palette].get('skinFactor', pals['skinFactor']))
from eyeliner_styles import configured  # noqa: E402
configured(None)
render.setup_world(sc)
lights = render.make_rig()
cam = bpy.data.objects.new('fur test camera', bpy.data.cameras.new('fur test camera'))
sc.collection.objects.link(cam)
sc.camera = cam


def world_co(o):
    c = np.empty(len(o.data.vertices)*3, np.float32)
    o.data.vertices.foreach_get('co', c)
    m = np.array(o.matrix_world)
    return c.reshape(-1, 3).astype(np.float64)@m[:3, :3].T+m[:3, 3]


def set_world_co(o, X):
    mi = np.linalg.inv(np.array(o.matrix_world))
    o.data.vertices.foreach_set('co', (X@mi[:3, :3].T+mi[:3, 3]).astype(np.float32).ravel())
    o.data.update()


skin = bpy.data.objects['akinza_continuous_construction']
fur = bpy.data.objects['Akinza fur']
for o in bpy.data.objects:
    if o.type == 'CURVES' and o is not fur:
        o.hide_render = True
skin_rest = world_co(skin)
skin.data.calc_loop_triangles()
tri = np.empty(len(skin.data.loop_triangles)*3, np.int32)
skin.data.loop_triangles.foreach_get('vertices', tri)
tri = tri.reshape(-1, 3)
others = {o.name: world_co(o) for o in bpy.data.objects if o.type == 'MESH' and o is not skin}
info = {'skinHasRestAttribute': 'rest' in skin.data.attributes}

# ---- bind the fur
fm = np.array(fur.matrix_world)
pos_attr = fur.data.attributes['position']
pts = np.empty(len(fur.data.points)*3, np.float32)
pos_attr.data.foreach_get('vector', pts)
pts = pts.reshape(-1, 3).astype(np.float64)@fm[:3, :3].T+fm[:3, 3]
offs = np.empty(len(fur.data.curves)+1, np.int32)
fur.data.curve_offset_data.foreach_get('value', offs)
roots = pts[offs[:-1]]
bvh = BVHTree.FromPolygons(skin_rest.tolist(), tri.tolist(), all_triangles=True)
tri_of = np.empty(len(roots), np.int64)
for i, r in enumerate(roots):
    _, _, k, _ = bvh.find_nearest(r)
    tri_of[i] = k
print('bound roots', len(roots), round(time.time()-t0), flush=True)


def frames(X, T, roots_xyz):
    v0, v1, v2 = X[T[:, 0]], X[T[:, 1]], X[T[:, 2]]
    e1 = v1-v0
    e1 /= np.linalg.norm(e1, axis=1, keepdims=True)
    nrm = np.cross(v1-v0, v2-v0)
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
    return np.stack([e1, np.cross(nrm, e1), nrm], 2)       # columns: edge, bitangent, normal


def bary(X, T, P):
    v0, v1, v2 = X[T[:, 0]], X[T[:, 1]], X[T[:, 2]]
    e0, e1_, d = v1-v0, v2-v0, P-v0
    d00, d01, d11 = (e0*e0).sum(1), (e0*e1_).sum(1), (e1_*e1_).sum(1)
    d20, d21 = (d*e0).sum(1), (d*e1_).sum(1)
    den = d00*d11-d01*d01
    b1 = (d11*d20-d01*d21)/den
    b2 = (d00*d21-d01*d20)/den
    return np.stack([1-b1-b2, b1, b2], 1)


Tr = tri[tri_of]
B = bary(skin_rest, Tr, roots)
anchor = (B[:, :, None]*skin_rest[Tr]).sum(1)
F0 = frames(skin_rest, Tr, roots)
curve_of = np.repeat(np.arange(len(roots)), np.diff(offs))
local = np.einsum('nji,nj->ni', F0[curve_of], pts-anchor[curve_of])     # F^T (p - anchor)
print('fur in triangle frames', round(time.time()-t0), flush=True)
fur_rest_world = pts.copy()


def to_m(X):
    return s*(X-off)


def from_m(X):
    return X/s+off


records = []
for name in a.poses.split(','):
    pz = poses[name]
    Pm, Rv, vals = rc.posed_skin(to_m(skin_rest), idx, w, J, pz['pose'], pz['lift'], KEYS, DELTAS)
    Px = from_m(Pm)
    set_world_co(skin, Px)
    T = rc.bone_transforms(J, pz['pose'], bones=rc.ANIM_BONES, root_translate=(0, 0, pz['lift']))
    for o in bpy.data.objects:
        if o.type != 'MESH' or o is skin:
            continue
        nm = o.name.lower()
        side = 'L' if '+1' in nm else 'R'
        bone = f'hand.{side}' if 'fore claw' in nm else f'foot.{side}' if 'hind claw' in nm else 'head'
        Rb, tb = T[bone]
        set_world_co(o, from_m(to_m(others[o.name])@Rb.T+tb))
    F1 = frames(Px, Tr, None)
    anc = (B[:, :, None]*Px[Tr]).sum(1)
    newp = anc[curve_of]+np.einsum('nij,nj->ni', F1[curve_of], local)
    loc = (newp-fm[:3, 3])@np.linalg.inv(fm[:3, :3]).T
    pos_attr.data.foreach_set('vector', loc.astype(np.float32).ravel())
    fur.data.update_tag()
    bpy.context.view_layer.update()
    # the fur stage's side camera (azimuth 90, elevation 4), framed to this pose: skin and fur bounds in y-z
    allp = np.vstack([Px, newp])
    lo, hi = allp.min(0), allp.max(0)
    from mathutils import Vector
    az, el, _t, _sc, wd, ht = render.VIEWS['side']
    view = (az, el, Vector(((lo[0]+hi[0])/2, (lo[1]+hi[1])/2, (lo[2]+hi[2])/2)),
            max((hi[2]-lo[2]), (hi[1]-lo[1])*ht/wd)*1.06, wd, ht)
    for label, height in (('side', None), ('sprite', a.sprite)):
        render.place(cam, lights, view)
        if height:
            sc.render.resolution_x, sc.render.resolution_y = round(wd*height/ht), height
        sc.render.filepath = str(a.out/f'{name}_{label}.png')
        t1 = time.time()
        bpy.ops.render.render(write_still=True)
        records.append(dict(pose=name, view=label, seconds=round(time.time()-t1, 1),
                            resolution=[sc.render.resolution_x, sc.render.resolution_y], keys={k: v for k, v in vals.items() if v > 0}))
        print('rendered', name, label, records[-1]['seconds'], flush=True)
    # knee close-ups, furred: the left knee from the side and from the front three-quarter
    kn = from_m(np.array(pz['joints']['knee.L']))
    for label, azk in (('knee_side', 90), ('knee_front', 35)):
        render.place(cam, lights, (azk, 4, Vector(tuple(kn)), .34, 700, 700))
        sc.render.filepath = str(a.out/f'{name}_{label}.png')
        t1 = time.time()
        bpy.ops.render.render(write_still=True)
        records.append(dict(pose=name, view=label, seconds=round(time.time()-t1, 1), resolution=[700, 700]))
        print('rendered', name, label, records[-1]['seconds'], flush=True)
    pos_attr.data.foreach_set('vector', ((fur_rest_world-fm[:3, 3])@np.linalg.inv(fm[:3, :3]).T).astype(np.float32).ravel())
info.update(strands=len(roots), points=len(pts), images=records, seconds=round(time.time()-t0))
(a.out/'index.json').write_text(json.dumps(info, indent=1))
print('FUR_TEST_DONE', round(time.time()-t0))
