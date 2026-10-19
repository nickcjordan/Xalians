"""Step 18 (Nick: "all I want is a little white poof of hair ... it just didn't
blend in with the rest of the hair"). Replace the halfway fan with native coat:

* the separate fan system is deleted;
* poof hairs are new strands of the native 'Akinza fur' system itself (same
  material, shader, thickness profile, taper, waviness and clumping), each
  copied from a native ear strand at its root, turned gently outward from the
  D1 origin, a little longer and lifted, colored with the head-coat white
  (cupm 0, nothing else);
* around the poof, native ear strands blend toward it over a short band:
  progressively whiter and slightly longer, so there is no edge;
* poof strands that stand out of their native neighbors' envelope (the
  unchanged rogue long and straight-stray rules, neighbors from every active
  strand) are culled.
No lights, emission or material changes.

  blender -b --python build_ear_poof_18.py -- <16half surface dir> <out dir>
"""
import sys
import json
import math
import hashlib
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

before, out = map(Path, sys.argv[sys.argv.index('--') + 1:])
assert not (out / 'surface.blend').exists()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
rng = np.random.default_rng(18101901)
skin = bpy.data.objects[info['skin']]
bvh = BVHTree.FromObject(skin, bpy.context.evaluated_depsgraph_get())

removed = []
for name in ('Akinza ear fan 16 halfway', 'Akinza ear fan guides 16 halfway'):
    ob = bpy.data.objects[name]
    removed.append(dict(name=name, curves=len(ob.data.curves)))
    bpy.data.objects.remove(ob, do_unlink=True)

fur = bpy.data.objects['Akinza fur']
cu = fur.data
NATIVE = len(cu.curves)
assert NATIVE == 420420
starts = np.empty(NATIVE, np.int32)
cu.curves.foreach_get('first_point_index', starts)
P = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', P)
P = P.reshape(-1, 3)
original = P.copy()
counts = np.diff(np.r_[starts, len(P)])
roots = P[starts].copy()


def read(a):
    width = 3 if a.data_type == 'FLOAT_VECTOR' else 1
    v = np.empty(len(a.data) * width, np.float32)
    a.data.foreach_get('vector' if width == 3 else 'value', v)
    return v.reshape(len(a.data), width)


attrs = {}
for a in cu.attributes:
    if a.name.startswith('.') or a.name == 'position' or a.data_type not in ('FLOAT', 'FLOAT_VECTOR'):
        continue
    attrs[a.name] = (a.domain, a.data_type, read(a))
print('NATIVE_ATTRS', {k: (d, t) for k, (d, t, _) in attrs.items()}, flush=True)
radius = attrs['radius'][2][:, 0]
active = np.maximum.reduceat(radius, starts) > 0
nrm = attrs['nrm'][2]
assert attrs['nrm'][0] == 'CURVE' and attrs['cupm'][0] == 'CURVE'
cupm = attrs['cupm'][2][:, 0].copy()

# ears-front camera; D1 origins and axes in the 15-target-base framing
cam_target = Vector((0, -.02, .74))
el = math.radians(3)
fwd = Vector((0, math.cos(el), -math.sin(el)))
right = fwd.cross(Vector((0, 0, 1))).normalized()
up = right.cross(fwd).normalized()
S = 1.35 / 1024
R_np, U_np, T_np = np.array(right), np.array(up), np.array(cam_target)
q = roots - T_np
px = 512 + q @ R_np / S
py = 333.5 - q @ U_np / S - 2
EARS = [dict(origin=(375, 362), axis=-149), dict(origin=(649, 361), axis=-31)]
CORE, BAND = 50.0, 16.0          # poof radius in px, then the blend band


def smooth(v):
    v = np.clip(v, 0, 1)
    return v * v * (3 - 2 * v)


def cast(x, y):
    o = cam_target + right * ((x - 512) * S) + up * ((333.5 - (y + 2)) * S) - fwd * 3
    hit = bvh.ray_cast(o, fwd, 6)
    return np.array(hit[0])


core = np.zeros(NATIVE)        # 1 inside the poof
band = np.zeros(NATIVE)        # 1 inside core, fading to 0 across the band
ear_of = np.zeros(NATIVE, np.int8)
for k, e in enumerate(EARS):
    ox, oy = e['origin']
    a = math.radians(e['axis'])
    dx, dy = px - ox, py - oy
    r = np.hypot(dx, dy)
    along = dx * math.cos(a) + dy * math.sin(a)
    half = smooth((along + 14) / 14)
    c = smooth((CORE - r) / 8 + .5) * half
    b = smooth((CORE + BAND - r) / BAND) * half
    sel = b > band
    band[sel] = b[sel]
    core = np.maximum(core, c)
    ear_of[sel] = k + 1
front = nrm[:, 1] < -.15
band[~front | ~active] = 0
core[~front | ~active] = 0
print('ZONE', dict(core=int((core > .5).sum()), band=int((band > .02).sum())), flush=True)


def collision(path):
    for a, b in zip(path[:-1], path[1:]):
        delta = b - a
        ln = np.linalg.norm(delta)
        if ln > 1e-7:
            eps = min(.0002, ln * .15)
            if bvh.ray_cast(Vector(a + delta / ln * eps), Vector(delta / ln), max(0, ln - 2 * eps))[0] is not None:
                return True
        for qq in (b, (a + b) * .5):
            hit = bvh.find_nearest(Vector(qq))
            if np.dot(qq - np.array(hit[0]), np.array(hit[1])) < -.0001:
                return True
    return False


# 1. blend band: native ear strands whiter and slightly longer toward the poof.
lengthened = 0
changed = np.zeros(NATIVE, bool)
for i in np.where(band > .02)[0]:
    cupm[i] *= 1 - band[i]
    sl = slice(starts[i], starts[i] + counts[i])
    off = original[sl] - roots[i]
    for f in (1 + .45 * band[i], 1 + .25 * band[i], 1 + .1 * band[i]):
        path = roots[i] + off * f
        if not collision(path):
            P[sl] = path
            lengthened += int(f > 1.001)
            break
    changed[i] = True
print('BLEND', dict(recolored=int(changed.sum()), lengthened=lengthened), flush=True)

# 2. poof strands, copied from native strands under them.
origins3 = [cast(*e['origin']) for e in EARS]
anchors = np.where(core > .3)[0]
prob = core[anchors] ** 2
prob /= prob.sum()
N_NEW = int(1.2 * len(anchors))
new_paths, new_src = [], []
tries = fails = 0
while len(new_paths) < N_NEW and tries < N_NEW * 4:
    tries += 1
    j = int(rng.choice(anchors, p=prob))
    n = nrm[j] / np.linalg.norm(nrm[j])
    sl = slice(starts[j], starts[j] + counts[j])
    off = original[sl] - roots[j]
    o3 = origins3[ear_of[j] - 1]
    radial = roots[j] - o3
    radial -= n * np.dot(radial, n)
    tip = off[-1] - n * np.dot(off[-1], n)
    if np.linalg.norm(radial) < 1e-4 or np.linalg.norm(tip) < 1e-5:
        continue
    radial /= np.linalg.norm(radial)
    tip /= np.linalg.norm(tip)
    want = tip * .35 + radial * .65
    want /= np.linalg.norm(want)
    ang = math.atan2(np.dot(np.cross(tip, want), n), np.dot(tip, want)) + rng.normal(0, math.radians(18))
    rot = np.array(Matrix.Rotation(ang, 3, Vector(n)))
    shaped = off @ rot.T
    L0 = np.linalg.norm(np.diff(off, axis=0), axis=1).sum()
    dist = np.linalg.norm(roots[j] - o3)
    scale = rng.uniform(1.7, 2.4) * (1 - .35 * smooth(dist / .06))
    t = np.linspace(0, 1, len(off))[:, None]
    lift = n * (rng.uniform(.10, .22) * L0 * scale) * np.sin(t * np.pi * .6)
    jitter = rng.normal(0, .0012, 3)
    jitter -= n * np.dot(jitter, n)
    root = np.array(bvh.find_nearest(Vector(roots[j] + jitter))[0])
    path = None
    for extra in (0, .002, .004):
        cand = root + shaped * scale + lift + n * extra * np.sin(t * np.pi * .6)
        if not collision(cand):
            path = cand
            break
    if path is None:
        fails += 1
        continue
    new_paths.append(path.astype(np.float32))
    new_src.append(j)
new_paths = np.array(new_paths)
new_src = np.array(new_src)
print('POOF', dict(made=len(new_paths), tries=tries, collisionFails=fails, anchors=len(anchors)), flush=True)

# 3. envelope cull against all active neighbors (rogue long / straight rules).
all_roots = np.r_[roots[active], new_paths[:, 0]]
all_tip = np.r_[P[starts + counts - 1][active] - roots[active], new_paths[:, -1] - new_paths[:, 0]]
seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
seg = np.r_[seg, 0]
seg[starts + counts - 1] = 0
nat_len = np.add.reduceat(seg, starts)
all_len = np.r_[nat_len[active], np.linalg.norm(np.diff(new_paths, axis=1), axis=2).sum(1)]
all_n = np.r_[nrm[active], nrm[new_src]]
all_n /= np.linalg.norm(all_n, axis=1, keepdims=True)
box = (np.abs(all_roots[:, 0]) > .12) & (all_roots[:, 2] > .6)
idx_box = np.where(box)[0]
kd = KDTree(len(idx_box))
for k2, i in enumerate(idx_box):
    kd.insert(Vector(all_roots[i]), k2)
kd.balance()
flow = all_tip / np.maximum(np.linalg.norm(all_tip, axis=1, keepdims=True), 1e-9)
straight = np.linalg.norm(all_tip, axis=1) / np.maximum(all_len, 1e-9)
base = int(active.sum())
cull = np.zeros(len(new_paths), bool)
for m in range(len(new_paths)):
    i = base + m
    nb = [idx_box[k2] for _, k2, d in kd.find_n(Vector(all_roots[i]), 97)
          if idx_box[k2] != i and d < .018 and np.dot(all_n[idx_box[k2]], all_n[i]) > .65]
    if len(nb) < 8:
        continue
    nb = np.array(nb)
    qq = np.percentile(all_len[nb], 70)
    env = np.percentile(all_tip[nb] @ flow[i], 85)
    excess = np.linalg.norm(all_tip[i]) - env
    ls = np.median(straight[nb])
    long = all_len[i] > max(qq * 1.8, qq + .012) and excess > .009
    s1 = straight[i] > .985 and all_len[i] > max(qq * 1.40, qq + .009) and excess > .008
    s2 = straight[i] > max(.94, ls + .06) and all_len[i] > .018 and excess > max(.009, .20 * qq)
    cull[m] = long or s1 or s2
new_paths, new_src = new_paths[~cull], new_src[~cull]
print('ENVELOPE_CULL', dict(culled=int(cull.sum()), kept=len(new_paths)), flush=True)

# 4. write: native edits, then append poof strands to the native system.
cu.points.foreach_set('position', P.ravel())
attrs['cupm'][2][:, 0] = cupm
seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
seg = np.r_[seg, 0]
seg[starts + counts - 1] = 0
if 'strlen' in attrs:
    if attrs['strlen'][0] == 'CURVE':
        attrs['strlen'][2][changed, 0] = np.add.reduceat(seg, starts)[changed]
for name, (domain, dtype, v) in attrs.items():
    cu.attributes[name].data.foreach_set('vector' if dtype == 'FLOAT_VECTOR' else 'value', v.ravel())
NP = new_paths.shape[1]
assert (counts[new_src] == NP).all()
cu.add_curves([NP] * len(new_paths))
starts2 = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', starts2)
assert np.array_equal(starts2[:NATIVE], starts)
P2 = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', P2)
P2 = P2.reshape(-1, 3)
P2[len(P):] = new_paths.reshape(-1, 3)
cu.points.foreach_set('position', P2.ravel())
newlen = np.linalg.norm(np.diff(new_paths, axis=1), axis=2).sum(1)
for name, (domain, dtype, v) in attrs.items():
    a = cu.attributes[name]
    full = read(a)
    if domain == 'POINT':
        src = np.concatenate([np.arange(starts[j], starts[j] + NP) for j in new_src])
        full[len(P):] = v[src]
    else:
        full[NATIVE:] = v[new_src]
        if name == 'cupm':
            full[NATIVE:] = 0
        if name == 'strlen':
            full[NATIVE:, 0] = newlen
        if name == 'nrm':
            full[NATIVE:] = nrm[new_src]
    a.data.foreach_set('vector' if dtype == 'FLOAT_VECTOR' else 'value', full.ravel())
assert np.array_equal(P2[starts], roots), 'Native roots moved'
untouched = np.repeat(~changed, counts)
assert np.array_equal(P2[:len(P)][untouched], original[untouched])

info.pop('earFan16Halfway', None)
info.update(parent=str(before), additionalFurObjects=[], strands=len(cu.curves), strandPoints=len(cu.points))
info['earPoof18'] = dict(sourceSha256=hashlib.sha256((before / 'surface.blend').read_bytes()).hexdigest(),
                         removed=removed, corePx=CORE, bandPx=BAND, origins=[e['origin'] for e in EARS],
                         axesDeg=[e['axis'] for e in EARS], nativeBlended=int(changed.sum()), nativeLengthened=lengthened,
                         poofStrands=len(new_paths), envelopeCulled=int(cull.sum()),
                         method='poof = native-system strands copied from the native ear strand at each root, turned outward, 1.7-2.4x longer, lifted, cupm 0; band blends native strands whiter and up to 1.45x longer',
                         nickRuling='all I want is a little white poof of hair ... it just didnt blend in with the rest of the hair')
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
prior = dict(np.load(before / 'patch-evidence.npz'))
np.savez_compressed(out / 'patch-evidence.npz', changed=changed, leftover=prior['leftover'], band=band, core=core,
                    poofSource=new_src, poof=new_paths)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('EAR_POOF_18_SAVED', info['earPoof18'], flush=True)
