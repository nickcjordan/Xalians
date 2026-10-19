"""Step 16: replace the step 15 cone fan with Nick's D1 half-circle fan.

Hair paths come from plan_ear_fan_16.py (the painter's rules in ears-front
pixels). Each point is cast onto the skin along that camera's rays and lifted
along the surface normal, which turns the painted axis and 180-degree spread
into directions in the ear's tangent plane. Everything else in s12-15fix (blue
refill, leftover-strand removal, eyeliner, every native strand) is held.

  blender -b --python build_ear_fan_16.py -- <15fix surface dir> <plan.npz> <out dir>
"""
import sys
import json
import math
import hashlib
import shutil
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

before, plan_path, out = map(Path, sys.argv[sys.argv.index('--') + 1:])
assert not (out / 'surface.blend').exists(), 'Never overwrite an existing design build'
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
rng = np.random.default_rng(16101901)
skin = bpy.data.objects[info['skin']]
assert np.allclose(np.array(skin.matrix_world), np.eye(4))
bvh = BVHTree.FromObject(skin, bpy.context.evaluated_depsgraph_get())

old = bpy.data.objects['Akinza ear fan 15']
old_cu = old.data
NPTS = 24
assert len(old_cu.points) == len(old_cu.curves) * NPTS
material = old_cu.materials[0]
assert material.name == 'Akinza hair'
# Constant shading attributes of the step 15 fan (cheek white, cupm 0, ear-white flag).
const = {}
for a in old_cu.attributes:
    if a.name.startswith('.') or a.name in ('position', 'radius', 'strlen', 'nrm'):
        continue
    width = 3 if a.data_type == 'FLOAT_VECTOR' else 1
    if a.data_type not in ('FLOAT', 'FLOAT_VECTOR'):
        continue
    v = np.empty(len(a.data) * width, np.float32)
    a.data.foreach_get('vector' if width == 3 else 'value', v)
    v = v.reshape(len(a.data), width)
    const[a.name] = (a.domain, a.data_type, v[:NPTS].copy() if a.domain == 'POINT' else v[:1].copy())
domains = {a.name: a.domain for a in old_cu.attributes}
print('FAN_ATTRS', {k: (d, t, val.ravel()[:3].tolist()) for k, (d, t, val) in const.items()}, flush=True)
for name in ('Akinza ear fan 15', 'Akinza ear fan guides 15'):
    bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)

cam_target = Vector((0, -.02, .74))
el = math.radians(3)
forward = -Vector((0, -math.cos(el), math.sin(el)))
right = forward.cross(Vector((0, 0, 1))).normalized()
up = right.cross(forward).normalized()
S = 1.35 / 1024


def cast(px, py):
    origin = cam_target + right * ((px - 512) * S) + up * ((333.5 - py) * S) - forward * 3
    hit = bvh.ray_cast(origin, forward, 6)
    if hit[0] is None:
        return None
    n = np.array(hit[1])
    if np.dot(n, np.array(forward)) > 0:
        n = -n
    return np.array(hit[0]), n


def collision(path):
    for a, b in zip(path[:-1], path[1:]):
        delta = b - a
        length = np.linalg.norm(delta)
        if length > 1e-7:
            eps = min(.0002, length * .15)
            if bvh.ray_cast(Vector(a + delta / length * eps), Vector(delta / length), max(0, length - 2 * eps))[0] is not None:
                return True
        for q in (b, (a + b) * .5):
            hit = bvh.find_nearest(Vector(q))
            if np.dot(q - np.array(hit[0]), np.array(hit[1])) < -.0001:
                return True
    return False


def smooth(q):
    q = np.clip(q, 0, 1)
    return q * q * (3 - 2 * q)


plan = np.load(plan_path)
T = np.linspace(0, 1, NPTS)
children, radii, keep = [], [], []
dropped = lifted = 0
for k, pix in enumerate(plan['paths']):
    top = rng.uniform(.0035, .0055)
    clear = (.0008 + (top - .0008) * smooth(T / .25)) * (1 - .3 * smooth((T - .7) / .3))
    pts = []
    for (x, y), c in zip(pix, clear):
        hit = cast(x, y)
        if hit is None:
            break
        pts.append(hit[0] + hit[1] * c)
    if len(pts) < NPTS:
        dropped += 1
        continue
    path = np.array(pts)
    for attempt in range(8):
        if not collision(path):
            break
        for j in range(1, NPTS):
            path[j] += np.array(bvh.find_nearest(Vector(path[j]))[1]) * .0005
    else:
        dropped += 1
        continue
    lifted += attempt > 0
    children.append(path)
    r0 = rng.uniform(.00045, .00070)
    radii.append(r0 * (1 - T) ** 1.2 + .000001)
    keep.append(k)
children = np.array(children, np.float32)
radii = np.array(radii, np.float32)
lengths = np.linalg.norm(np.diff(children, axis=1), axis=2).sum(1)
print('FAN16', dict(made=len(children), dropped=dropped, lifted=lifted,
                    length3d=np.percentile(lengths, [5, 50, 95, 100]).round(4).tolist()), flush=True)

hair = bpy.data.hair_curves.new('Akinza ear fan 16')
hair.add_curves([NPTS] * len(children))
hair.points.foreach_set('position', children.ravel())
hair.attributes.new('radius', 'FLOAT', 'POINT').data.foreach_set('value', radii.ravel())
for name, (domain, dtype, val) in const.items():
    tiled = np.tile(val, (len(children), 1))
    a = hair.attributes.new(name, dtype, domain)
    a.data.foreach_set('vector' if dtype == 'FLOAT_VECTOR' else 'value', tiled.astype(np.float32).ravel())
if 'strlen' in domains:
    v = np.repeat(lengths, NPTS) if domains['strlen'] == 'POINT' else lengths
    hair.attributes.new('strlen', 'FLOAT', domains['strlen']).data.foreach_set('value', v.astype(np.float32))
nrm = np.array([np.array(bvh.find_nearest(Vector(p[0]))[1]) for p in children], np.float32)
if 'nrm' in domains:
    v = np.repeat(nrm, NPTS, axis=0) if domains['nrm'] == 'POINT' else nrm
    hair.attributes.new('nrm', 'FLOAT_VECTOR', domains['nrm']).data.foreach_set('vector', v.ravel())
hair.materials.append(material)
fan = bpy.data.objects.new('Akinza ear fan 16', hair)
bpy.context.scene.collection.objects.link(fan)

# Guides: the fan's noiseless envelope, 19 directions per ear, kept hidden for the record.
guides = []
for side, (ox, oy), c in ((-1, (375, 364), math.radians(-149)), (1, (649, 363), math.radians(-31))):
    for u in np.linspace(-1, 1, 19):
        ang = c + u * math.pi / 2
        L = 85 * (0.45 + 0.55 * (1 - abs(u) ** 1.6))
        sel = (plan['side'] == side) & (np.abs(plan['u'] - u) < .06)
        L = min(L, float(np.percentile(plan['lengthPx'][sel], 90)) if sel.any() else L)
        pix = np.c_[ox + np.cos(ang) * L * T, oy + np.sin(ang) * L * T]
        g = [cast(x, y) for x, y in pix]
        if all(h is not None for h in g):
            guides.append(np.array([h[0] + h[1] * .003 for h in g]))
gc = bpy.data.hair_curves.new('Akinza ear fan guides 16')
gc.add_curves([NPTS] * len(guides))
gc.points.foreach_set('position', np.array(guides, np.float32).ravel())
gc.attributes.new('radius', 'FLOAT', 'POINT').data.foreach_set('value', np.full(len(guides) * NPTS, .0001, np.float32))
gob = bpy.data.objects.new('Akinza ear fan guides 16', gc)
bpy.context.scene.collection.objects.link(gob)
gob.hide_render = gob.hide_viewport = True

info.update(parent=str(before), additionalFurObjects=[fan.name],
            strands=info['strands'] - 5200 + len(children), strandPoints=info['strandPoints'] - 5200 * NPTS + len(children) * NPTS)
info['earFan16'] = dict(
    sourceSha256=hashlib.sha256((before / 'surface.blend').read_bytes()).hexdigest(),
    replaced='Akinza ear fan 15 (5200 cone hairs)', target='briefs/16-target-D1.png (painter rules from briefs/16-target-painter.py)',
    origins=dict(left=[375, 362], right=[649, 361]), axisDeg=dict(left=-149, right=-31), spreadDeg=180,
    middleLengthPx=85, reachCap=.8, rootSpreadPx=9, hairs=len(children), dropped=dropped, lifted=int(lifted),
    rootRadius=[.00045, .00070], guides=len(guides), material='Akinza hair, step 15 fan attributes (cheek white, cupm 0, fur_guided 1)')
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
prior = dict(np.load(before / 'patch-evidence.npz'))
np.savez_compressed(out / 'patch-evidence.npz', changed=prior['changed'], leftover=prior['leftover'],
                    children=children, radii=radii, planIndex=np.array(keep), guides=np.array(guides))
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('EAR_FAN_16_SAVED', info['earFan16'], flush=True)
