"""Step 15: remove the 13g tuft, refill the ear-base patch with native blue fur,
and grow a separate white fan of fine hairs built to the painted target.

The fan is designed in the ears-front camera's image plane (the painting's
frame), then every point is cast onto the skin along that camera's rays and
lifted along the surface normal, so the projected fan matches the picture.

  blender -b --python build_ear_fan_15.py -- <13i surface dir> <13g patch-evidence.npz> <out dir>
"""
import sys
import json
import math
import hashlib
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from refine_ear_root_12b2 import values

before, tuft_evidence, out = map(Path, sys.argv[sys.argv.index('--') + 1:])
assert not (out / 'surface.blend').exists(), 'Never overwrite an existing design build'
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
rng = np.random.default_rng(15101801)

skin = bpy.data.objects[info['skin']]
assert np.allclose(np.array(skin.matrix_world), np.eye(4))
depsgraph = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(skin, depsgraph)
co = values(skin.data, 'position', 'vector', 3)
skin_normal = np.empty(co.size, np.float32)
skin.data.vertex_normals.foreach_get('vector', skin_normal)
skin_normal = skin_normal.reshape(-1, 3)
earw = values(skin.data, 'earw')
tree = KDTree(len(co))
for i, q in enumerate(co):
    tree.insert(Vector(q), i)
tree.balance()

# ---- 1. remove the 13g tuft and its hidden guides -------------------------
removed = []
for name in ('Akinza canal tuft 13g', 'Akinza canal guides 13g'):
    ob = bpy.data.objects.get(name)
    if ob is not None:
        removed.append(dict(name=name, curves=len(ob.data.curves)))
        bpy.data.objects.remove(ob, do_unlink=True)
assert [r['name'] for r in removed] == ['Akinza canal tuft 13g', 'Akinza canal guides 13g'], removed
for ob in bpy.data.objects:
    if ob.type == 'CURVES' and ob.name != 'Akinza fur':
        print('OTHER_CURVES_OBJECT', ob.name, len(ob.data.curves), ob.hide_render, flush=True)

fur_ob = bpy.data.objects['Akinza fur']
assert np.allclose(np.array(fur_ob.matrix_world), np.eye(4))
print('FUR_MODIFIERS', [m.type for m in fur_ob.modifiers], flush=True)
cu = fur_ob.data
starts = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', starts)
points = values(cu, 'position', 'vector', 3)
original = points.copy()
counts = np.diff(np.r_[starts, len(points)])
roots = points[starts].copy()
radius = values(cu, 'radius')
radius13i = radius.copy()
active = np.maximum.reduceat(radius, starts) > 0
nrm = values(cu, 'nrm', 'vector', 3)
nearest = np.array([tree.find(Vector(q))[1] for q in roots])

# Which attributes the coat shader reads.
hair_mat = bpy.data.materials['Akinza hair']
shader_attrs = sorted({n.attribute_name for n in hair_mat.node_tree.nodes
                       if n.bl_idname == 'ShaderNodeAttribute'})
print('SHADER_ATTRS', shader_attrs, flush=True)
fur_attrs = {a.name: (a.domain, a.data_type) for a in cu.attributes if not a.name.startswith('.')}
print('FUR_ATTRS', fur_attrs, flush=True)


def read(name):
    a = cu.attributes[name]
    width = 3 if a.data_type == 'FLOAT_VECTOR' else 1
    prop = 'vector' if width == 3 else 'value'
    arr = np.empty(len(a.data) * width, np.float32)
    a.data.foreach_get(prop, arr)
    return arr.reshape(-1, width) if width == 3 else arr


def write(name, arr):
    a = cu.attributes[name]
    a.data.foreach_set('vector' if a.data_type == 'FLOAT_VECTOR' else 'value', np.asarray(arr, np.float32).ravel())


copy_names = [n for n in sorted(set(shader_attrs) | {'radius', 'strlen', 'fur_guided', 'cupm', 'pale', 'fur_tone'})
              if n in fur_attrs and fur_attrs[n][1] in ('FLOAT', 'FLOAT_VECTOR') and n not in ('position', 'nrm')]
attrs = {n: read(n) for n in copy_names}
assert 'radius' in attrs
old_attrs = {n: v.copy() for n, v in attrs.items()}
print('COPY_ATTRS', copy_names, flush=True)


def per_curve(name):
    v = old_attrs[name]
    return v[starts] if fur_attrs[name][0] == 'POINT' else v


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


# ---- 2. refill the bare ear-base patch with the surrounding blue coat ------
tuft = np.load(tuft_evidence)['tuft']
assert len(tuft) <= len(starts)
tuft = np.r_[tuft, np.zeros(len(starts) - len(tuft), bool)]
assert not (tuft & active).any(), 'Expected the replaced canal strands to be inactive in 13i'
assert (counts[tuft] == 9).all()
earw_root = earw[nearest]
# Older standing tuft strands (13c-fix restore and earlier) outside every
# recorded tuft mask: front-facing ear-base strands standing off the skin.
held_13i = np.load(before / 'patch-evidence.npz')
native = np.arange(len(starts)) < 420420
box = (active & native & ~tuft & (np.abs(roots[:, 0]) > .15) & (np.abs(roots[:, 0]) < .26)
       & (roots[:, 2] > .64) & (roots[:, 2] < .74) & (nrm[:, 1] < -.3))
box[:len(held_13i['changed'])] &= ~held_13i['changed']
standoff = np.zeros(len(starts), np.float32)
for i in np.where(box)[0]:
    standoff[i] = max(bvh.find_nearest(Vector(q))[3] for q in points[starts[i]:starts[i] + counts[i]])
leftover = box & (standoff > .012)
print('LEFTOVER', int(leftover.sum()), flush=True)
assert 700 < leftover.sum() < 1200, int(leftover.sum())
recorded_tuft = tuft.copy()
for i in np.where(leftover)[0]:
    radius[starts[i]:starts[i] + counts[i]] = 0
    attrs['radius'][starts[i]:starts[i] + counts[i]] = 0
active = np.maximum.reduceat(radius, starts) > 0
tuft = tuft | leftover


def skin_region(v):
    x, z = abs(co[v, 0]), co[v, 2]
    r = 0
    if z > .36: r = 1
    if z > .48: r = 2
    if z > .65 and x > .14: r = 3
    return r


def transfers(i, path):
    rv = nearest[i]
    tv = tree.find(Vector(path[-1]))[1]
    return (skin_region(rv) != skin_region(tv) and np.linalg.norm(co[tv] - roots[i]) > .025
            and np.linalg.norm(path[-1] - co[tv]) < .018)
cupm_curve = per_curve('cupm')
tuft_ids = np.where(tuft)[0]
tuft_tree = KDTree(len(tuft_ids))
for j, i in enumerate(tuft_ids):
    tuft_tree.insert(Vector(roots[i]), j)
tuft_tree.balance()
gap = np.array([tuft_tree.find(Vector(q))[2] for q in roots])
donor_mask = (active & ~tuft & (np.arange(len(starts)) < 420420) & (nrm[:, 1] < -.15)
              & (earw_root > .95) & (cupm_curve > .5) & (gap > .002) & (gap < .030))
donor_mask[:len(held_13i['changed'])] &= ~held_13i['changed']
donors = np.where(donor_mask)[0]
print('DONOR_POOL', len(donors), flush=True)
assert len(donors) > 1000
donor_tree = KDTree(len(donors))
for j, i in enumerate(donors):
    donor_tree.insert(Vector(roots[i]), j)
donor_tree.balance()
print('TUFT_ATTR_VS_DONOR', {n: [float(np.median(per_curve(n)[tuft] if per_curve(n).ndim == 1 else 0)),
                                 float(np.median(per_curve(n)[donors] if per_curve(n).ndim == 1 else 0))]
                             for n in copy_names}, flush=True)
donor_of = np.full(len(starts), -1, np.int32)
lifted = 0
failed = []
for i in tuft_ids:
    hit = bvh.find_nearest(Vector(roots[i]))
    norm = np.array(hit[1])
    if np.dot(norm, nrm[i]) < 0:
        norm = -norm
    candidates = [donors[v[1]] for v in donor_tree.find_n(Vector(roots[i]), 10)
                  if np.dot(nrm[donors[v[1]]], nrm[i]) > .6 and np.sign(roots[donors[v[1]], 0]) == np.sign(roots[i, 0])]
    rng.shuffle(candidates)
    candidates += [donors[v[1]] for v in donor_tree.find_n(Vector(roots[i]), 40)
                   if np.dot(nrm[donors[v[1]]], nrm[i]) > .6 and np.sign(roots[donors[v[1]], 0]) == np.sign(roots[i, 0])][10:]
    placed = False
    for j in candidates:
        ds = slice(starts[j], starts[j] + counts[j])
        offsets = original[ds] - roots[j]
        rot = np.array(Vector(nrm[j]).rotation_difference(Vector(norm)).to_matrix())
        offsets = offsets @ rot.T
        t = np.linspace(0, 1, counts[j])
        for attempt in range(8):
            path = roots[i] + offsets + norm * (attempt * .0004 * np.sin(t * np.pi * .75))[:, None]
            if not collision(path):
                break
        else:
            continue
        if transfers(i, path):
            continue
        lifted += attempt > 0
        sl = slice(starts[i], starts[i] + counts[i])
        points[sl] = path
        for n in copy_names:
            if fur_attrs[n][0] == 'POINT':
                attrs[n][sl] = old_attrs[n][ds]
            else:
                attrs[n][i] = old_attrs[n][j]
        if 'strlen' in attrs:
            length = float(np.linalg.norm(np.diff(path, axis=0), axis=1).sum())
            if fur_attrs['strlen'][0] == 'POINT':
                attrs['strlen'][sl] = length
            else:
                attrs['strlen'][i] = length
        donor_of[i] = j
        placed = True
        break
    if not placed:
        failed.append(int(i))
print('REFILL', dict(restored=int((donor_of >= 0).sum()), failed=len(failed), lifted=int(lifted)), flush=True)
assert len(failed) < 60, failed
cu.points.foreach_set('position', points.ravel())
for n, v in attrs.items():
    write(n, v)
assert np.array_equal(points[starts], roots), 'Native roots moved'
changed_native = (donor_of >= 0) | leftover
unchanged = ~changed_native
rep = np.repeat(unchanged, counts)
assert np.array_equal(points[rep], original[rep]), 'Untouched native strands moved'

# ---- 3. the white fan ------------------------------------------------------
cam_target = Vector((0, -.02, .74))
el = math.radians(3)
cam_dir = Vector((0, -math.cos(el), math.sin(el)))
forward = -cam_dir
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


def to_pixel(p):
    q = Vector(p) - cam_target
    return 512 + q.dot(right) / S, 333.5 - q.dot(up) / S


# Painted target, measured on the right ear (+x) and mirrored for the left.
ORIGIN = np.array([665., 381.])
ARC_DIR = math.radians(100)
ARC_HALF = 12.
CENTER = 43.5
SPREAD = 27.5        # half of the 55-degree fan
BEND = 10.           # slight outward curve toward the ear tip
NPTS = 24
GUIDES = 15
CHILDREN = 2600
CAP3D = 1.0          # fan exempt from the .20 ear cap (coordinator, step 15 fix)
T = np.linspace(0, 1, NPTS)


def root_px(s):
    th0 = math.radians(CENTER)
    return (ORIGIN + ARC_HALF * s * np.array([math.cos(ARC_DIR), -math.sin(ARC_DIR)])
            - 3 * s * s * np.array([math.cos(th0), -math.sin(th0)]))


def guide_px(s, length):
    ang = np.radians(CENTER + SPREAD * s - BEND * T)
    d = np.c_[np.cos(ang), -np.sin(ang)]
    steps = (d[1:] + d[:-1]) * .5 / (NPTS - 1)
    return root_px(s) + length * np.r_[[[0, 0]], np.cumsum(steps, axis=0)]


def mirror(p, side):
    p = np.array(p, float)
    if side < 0:
        p[..., 0] = 1024 - p[..., 0]
    return p


def surface_path(pix, clearance):
    pts = []
    for (x, y), c in zip(pix, clearance):
        hit = cast(x, y)
        if hit is None:
            return None
        pts.append(hit[0] + hit[1] * c)
    return np.array(pts)


def path_len(p):
    return float(np.linalg.norm(np.diff(p, axis=0), axis=1).sum())


def smooth(q):
    q = np.clip(q, 0, 1)
    return q * q * (3 - 2 * q)


guide_s = np.linspace(-1, 1, GUIDES)
base_clear = .0008 + .0034 * smooth(T / .3)
lmax = {}
guides_px = {}
guides_3d = []
for side in (1, -1):
    L = 150.  # painting's middle hair length
    for _ in range(4):
        g3 = [surface_path(mirror(guide_px(s, L * (1 - .15 * s * s)), side), base_clear) for s in guide_s]
        assert all(g is not None for g in g3), 'Guide left the skin'
        longest = max(path_len(g) for g in g3)
        if longest <= CAP3D:
            break
        L *= CAP3D / longest * .995
    lmax[side] = L
    guides_px[side] = np.array([mirror(guide_px(s, L * (1 - .15 * s * s)), side) for s in guide_s])
    guides_3d.extend(g3)
    for s, g in zip(guide_s, g3):
        r = g[0]
        v = tree.find(Vector(r))[1]
        assert earw[v] > .9 and co[v, 2] > .655 and abs(co[v, 0]) > .14, ('Root off the ear', side, s, co[v], earw[v])
print('FAN_LMAX_PX', lmax, flush=True)

# Cheek strands give the fan the coat shader's exact white.
cheek = (active & (np.arange(len(starts)) < 420420) & (np.abs(roots[:, 0]) > .09) & (np.abs(roots[:, 0]) < .15)
         & (roots[:, 2] > .50) & (roots[:, 2] < .57) & (nrm[:, 1] < -.6) & (earw_root < .02) & (cupm_curve < .02))
cheek_ids = np.where(cheek)[0]
assert len(cheek_ids) > 50, len(cheek_ids)
pale = per_curve('pale') if 'pale' in fur_attrs else np.zeros(len(starts))
cheek_donor = int(cheek_ids[np.argmin(np.abs(pale[cheek_ids] - np.median(pale[cheek_ids])))])
print('CHEEK_DONOR', cheek_donor, roots[cheek_donor].tolist(),
      {n: (old_attrs[n][starts[cheek_donor]] if fur_attrs[n][0] == 'POINT' else old_attrs[n][cheek_donor]).tolist()
       for n in copy_names if n not in ('radius',)}, flush=True)

children = []
radii = []
meta = []
lift_count = 0
dropped = 0
for side in (1, -1):
    G = guides_px[side]
    made = 0
    while made < CHILDREN:
        s = rng.uniform(-1, 1)
        k = min(GUIDES - 2, int((s + 1) / 2 * (GUIDES - 1)))
        f = (s - guide_s[k]) / (guide_s[k + 1] - guide_s[k])
        pix = (1 - f) * G[k] + f * G[k + 1]
        root = pix[0].copy()
        # Separate hairs: small root scatter, angle and waviness per hair.
        th = math.radians(CENTER + SPREAD * s) if side > 0 else math.radians(180 - CENTER - SPREAD * s)
        along = np.array([math.cos(th), -math.sin(th)])
        perp = np.array([-along[1], along[0]])
        rel = pix - root
        a = math.radians(rng.normal(0, 1.6))
        rot = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])
        rel = rel @ rot.T
        rank = rng.random()
        if rank < .32:
            e = rng.uniform(.84, 1.0)
        elif rank < .72:
            e = rng.uniform(.52, .84)
        else:
            e = rng.uniform(.18, .52)
        arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(rel, axis=0), axis=1))]
        sample = np.linspace(0, arc[-1] * e, NPTS)
        rel = np.column_stack([np.interp(sample, arc, rel[:, j]) for j in range(2)])
        tt = sample / arc[-1]
        wave = rng.uniform(.3, 1.1) * np.sin(np.pi * T) * np.sin(2 * np.pi * T * rng.uniform(.8, 1.4) + rng.uniform(0, 2 * np.pi))
        start = root + along * rng.normal(0, 1.2) + perp * rng.normal(0, .5)
        pix_c = start + rel + perp * wave[:, None]
        top = rng.uniform(.0030, .0048)
        clear = (.0008 + (top - .0008) * smooth(tt / .3)) * (1 - .25 * smooth((tt - .7) / .3))
        path = surface_path(pix_c, clear)
        if path is None:
            dropped += 1
            continue
        for attempt in range(8):
            if not collision(path):
                break
            path = path + 0  # lift along local normals
            for j in range(1, NPTS):
                hit = bvh.find_nearest(Vector(path[j]))
                path[j] += np.array(hit[1]) * .0005
        else:
            dropped += 1
            continue
        lift_count += attempt > 0
        if path_len(path) > CAP3D:
            dropped += 1
            continue
        children.append(path)
        r0 = rng.uniform(.00052, .00080)
        radii.append(r0 * (1 - T) ** 1.3 + .000001)
        meta.append((side, s, e))
        made += 1
print('FAN_CHILDREN', dict(made=len(children), dropped=dropped, lifted=lift_count), flush=True)
children = np.array(children, np.float32)
radii = np.array(radii, np.float32)

hair = bpy.data.hair_curves.new('Akinza ear fan 15')
hair.add_curves([NPTS] * len(children))
hair.points.foreach_set('position', children.ravel())
hair.attributes.new('radius', 'FLOAT', 'POINT').data.foreach_set('value', radii.ravel())
for n in copy_names:
    if n in ('radius',):
        continue
    domain, dtype = fur_attrs[n]
    width = 3 if dtype == 'FLOAT_VECTOR' else 1
    if domain == 'POINT':
        src = old_attrs[n][starts[cheek_donor]:starts[cheek_donor] + counts[cheek_donor]]
        src = src.reshape(len(src), -1)
        tc = np.linspace(0, 1, len(src))
        prof = np.column_stack([np.interp(T, tc, src[:, j]) for j in range(width)])
        val = np.tile(prof, (len(children), 1))
    else:
        src = np.asarray(old_attrs[n][cheek_donor]).reshape(-1)
        val = np.tile(src, (len(children), 1))
    if n == 'cupm':
        val[:] = 0
    if n == 'fur_guided':
        val[:] = 1  # the ear and crown white treatment (earLift) used by the native ear fur
    if n == 'strlen':
        lengths = np.array([path_len(p) for p in children])
        val = np.repeat(lengths, NPTS)[:, None] if domain == 'POINT' else lengths[:, None]
    a = hair.attributes.new(n, dtype, domain)
    a.data.foreach_set('vector' if width == 3 else 'value', np.asarray(val, np.float32).ravel())
# per-curve normal from the skin under each root, for the shader and sweeps
child_nrm = np.array([np.array(bvh.find_nearest(Vector(p[0]))[1]) for p in children], np.float32)
if 'nrm' in fur_attrs:
    a = hair.attributes.new('nrm', 'FLOAT_VECTOR', fur_attrs['nrm'][0])
    a.data.foreach_set('vector', (np.repeat(child_nrm, NPTS, axis=0) if fur_attrs['nrm'][0] == 'POINT' else child_nrm).ravel())
hair.materials.append(hair_mat)
fan_ob = bpy.data.objects.new('Akinza ear fan 15', hair)
bpy.context.scene.collection.objects.link(fan_ob)
fan_ob.matrix_world = fur_ob.matrix_world
guide_curves = bpy.data.hair_curves.new('Akinza ear fan guides 15')
guide_curves.add_curves([NPTS] * len(guides_3d))
guide_curves.points.foreach_set('position', np.array(guides_3d, np.float32).ravel())
guide_curves.attributes.new('radius', 'FLOAT', 'POINT').data.foreach_set('value', np.full(len(guides_3d) * NPTS, .0001, np.float32))
guide_ob = bpy.data.objects.new('Akinza ear fan guides 15', guide_curves)
bpy.context.scene.collection.objects.link(guide_ob)
guide_ob.hide_render = guide_ob.hide_viewport = True

info.pop('earGuides13g', None)
info.update(parent=str(before), additionalFurObjects=[fan_ob.name],
            strands=len(starts) + len(children), strandPoints=len(points) + len(children) * NPTS)
info['earFan15Fix'] = dict(
    sourceSha256=hashlib.sha256((before / 'surface.blend').read_bytes()).hexdigest(),
    removed=removed, refilledNative=int(changed_native.sum()), refillFailed=len(failed), refillLifted=int(lifted),
    donorPool=int(len(donors)), guidesPerEar=GUIDES, childrenPerEar=CHILDREN, points=NPTS,
    originPx=ORIGIN.tolist(), arcHalfPx=ARC_HALF, centerDeg=CENTER, spreadDeg=2 * SPREAD, bendDeg=BEND,
    longestPx=lmax, cap3d=CAP3D, rootRadius=[.00052, .00080], leftoverZeroedRefilled=int(leftover.sum()), refillTransferGuard=True, cheekDonor=cheek_donor,
    material='Akinza hair with cheek strand attributes, cupm 0, fur_guided 1',
    method='image-plane designed guides from the painted target, cast onto the skin along ears-front rays, interpolated children')
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
np.savez_compressed(out / 'patch-evidence.npz', changed=changed_native, tuft=tuft, leftover=leftover, recordedTuft=recorded_tuft, donor=donor_of,
                    children=children, radii=radii, meta=np.array(meta), guides=np.array(guides_3d),
                    guidesPx=np.r_[guides_px[1], guides_px[-1]])
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('EAR_FAN_15FIX_SAVED', info['earFan15Fix'], flush=True)
