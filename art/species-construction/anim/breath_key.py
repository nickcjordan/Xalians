"""The breath shape key for the Akinza clips (clips pass 2): a chest and belly expansion, kept inside the chest and belly.

  python art/species-construction/anim/breath_key.py <rig dir> <rest skin npz> <out npz> [--chest-out 9] [--chest-up 13]
      [--belly-out 4]

Pass 1 breathed with bone rotations only; the blind critic measured under 1 px of chest rise at the 720 side framing
(rotations of an upright column move it mostly sideways), so the brief's fallback applies: a rest-space corrective
the clip drives by its breath value (0 empty, 1 full), added to the rest skin before the rig's own corrective keys and
dual-quaternion skinning, exactly like those keys. On a full breath the front and sides of the ribcage move out along
their horizontal normal and up (the sternum rising), the upper belly swells out a little; nothing moves outside the
chest and belly (the mask is the chest and spine skin, minus anything the arms, clavicles, neck or head own), with
smooth falloff at every edge and the field smoothed over the mesh so no ridge forms. Millimetres in rig metres.
Writes ids and delta (the ribcage key) and belly_ids and belly_delta (the belly key; int32 and float32, rig metres,
rest space) and a summary.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
import scipy.sparse as sp

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import rig_core as rc  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('rig', type=Path)
p.add_argument('rest', type=Path)
p.add_argument('out', type=Path)
p.add_argument('--chest-out', type=float, default=9.)
p.add_argument('--chest-up', type=float, default=13.)
p.add_argument('--belly-out', type=float, default=4.)
p.add_argument('--smooth', type=int, default=40)
p.add_argument('--shoulder-clear', type=float, nargs=2, default=(.11, .17), help='no swell within the first distance of a shoulder joint, full beyond the second (m)')
a = p.parse_args()

NAMES = rc.ANIM_NAMES
NI = {b: i for i, b in enumerate(NAMES)}
R = a.rig
rig = json.loads((R/'rig.json').read_text())
J = json.loads((R/'joints.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
d = np.load(a.rest)
rest = s*(d['src'].astype(np.float64)-off)
tris, edges = d['tri'].astype(np.int64), d['edges'].astype(np.int64)
wt = np.load(R/'weights.npz')
idx = wt['idx'].astype(int)
w = np.round(wt['w'].astype(np.float64)*4096)/4096
w /= w.sum(1, keepdims=True)
dense = np.zeros((len(rest), len(NAMES)))
np.put_along_axis(dense, idx, w, 1)
share = lambda bones: dense[:, [NI[b] for b in bones]].sum(1)

fn = np.cross(rest[tris[:, 1]]-rest[tris[:, 0]], rest[tris[:, 2]]-rest[tris[:, 0]])
vn = np.zeros_like(rest)
for k in range(3):
    np.add.at(vn, tris[:, k], fn)
vn /= np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-20)
hn = vn.copy()
hn[:, 2] = 0
hlen = np.linalg.norm(hn, axis=1)
hn /= np.maximum(hlen, 1e-9)[:, None]

others = share([b for b in NAMES if rc.base_of(b) in ('clavicle', 'upperarm', 'forearm', 'hand', 'neck', 'head', 'jaw')
                or b.startswith('ear_') or b.startswith('tail') or rc.base_of(b) in ('thigh', 'shin', 'foot', 'hip', 'glute')])
trunk = np.clip(share(['chest', 'spine'])-others, 0, 1)
z = rest[:, 2]
zc, zn, zw, zp = J['chest'][2], J['neck_base'][2], J['waist'][2], J['pelvis'][2]
# height bands: the ribcage (from the waist up to below the neck base) and the upper belly (waist down toward the pelvis)
rib = rc.smoothstep(z, zw-.02, zc-.04)*(1-rc.smoothstep(z, zn-.07, zn-.025))
belly = rc.smoothstep(z, zp+.03, zw-.03)*(1-rc.smoothstep(z, zc-.06, zc))
front = rc.smoothstep(-vn[:, 1], -.35, .35)        # front and sides; the back barely moves
side_ok = rc.smoothstep(hlen, .2, .6)               # only where the surface faces outward, not up or down
# keep clear of the shoulders and armpits (the crouch's forward arms fold that skin; a swell there collapses it)
dsh = np.minimum(np.linalg.norm(rest-np.array(J['shoulder.L']), axis=1), np.linalg.norm(rest-np.array(J['shoulder.R']), axis=1))
clear = rc.smoothstep(dsh, a.shoulder_clear[0], a.shoulder_clear[1])
m_rib = trunk*rib*front*side_ok*clear
m_belly = trunk*belly*front*side_ok*rc.smoothstep(-vn[:, 1], 0., .6)
delta = ((m_rib*a.chest_out)[:, None]*hn+(m_rib*a.chest_up)[:, None]*np.array([0, 0, 1.]))*.001
belly_delta = (m_belly*a.belly_out)[:, None]*hn*.001       # a key of its own, so the crouched hold can leave it out
# smooth the field over the mesh (uniform Laplacian), so the swell has no edge
n = len(rest)
A = sp.coo_matrix((np.ones(2*len(edges)), (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])), shape=(n, n)).tocsr()
A = sp.diags(1/np.maximum(np.asarray(A.sum(1)).ravel(), 1))@A
for _ in range(a.smooth):
    delta = .5*delta+.5*(A@delta)
    belly_delta = .5*belly_delta+.5*(A@belly_delta)
bmag = np.linalg.norm(belly_delta, axis=1)
belly_ids = np.flatnonzero(bmag > 1e-5)
mag = np.linalg.norm(delta+belly_delta, axis=1)
ids = np.flatnonzero(np.linalg.norm(delta, axis=1) > 1e-5)
leak = {k: round(float(mag[share(v) > .5].max())*1000, 3) for k, v in
        dict(arms=[b for b in NAMES if rc.base_of(b) in ('upperarm', 'forearm', 'hand')], head=['head'],
             legs=[b for b in NAMES if rc.base_of(b) in ('thigh', 'shin', 'foot')]).items()}
a.out.parent.mkdir(parents=True, exist_ok=True)
np.savez_compressed(a.out, ids=ids.astype(np.int32), delta=delta[ids].astype(np.float32),
                    belly_ids=belly_ids.astype(np.int32), belly_delta=belly_delta[belly_ids].astype(np.float32))
summary = dict(vertices=int(len(ids)), max_mm=round(float(mag.max())*1000, 2),
               chest_out_mm=a.chest_out, chest_up_mm=a.chest_up, belly_out_mm=a.belly_out, smooth_rounds=a.smooth,
               max_mm_on_skin_owned_by=leak, z_range_m=[round(float(rest[ids, 2].min()), 3), round(float(rest[ids, 2].max()), 3)])
a.out.with_suffix('.json').write_text(json.dumps(summary, indent=1))
print('BREATH_KEY', json.dumps(summary))
