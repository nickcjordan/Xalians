"""B-sntv pass 8: armpit and lateral chest reweight (the skin lateral to the upper arm and elbow rides with the limb).

blender -b --python reskin_axilla.py -- RIG_IN.blend PARAMS.json CFG.json RIG_OUT.blend REPORT.json

In an ungulate the upper arm is enclosed in trunk skin. Here, in the rest pose, each trunk-weighted vertex on a side gets
an arm share w from how much closer it is to that side's arm (humerus, elbow and the top of the forearm) than to the
trunk axis (spine_03..05, neck_01): w = smoothstep((d_trunk - d_arm) / BLEND + 0.5), zero beyond RMAX from the arm,
zero for vertices below the chest floor line at the elbow (CFG floor_mm) toward the midline, smoothed over the surface.
The trunk weights of the vertex are scaled by (1 - w) and the removed weight goes to leg_f?_01 (1 - SCAP) and
scapula_? (SCAP). Corrective Smooth is left in place and simply re-evaluated.

Report: per check pose the largest change of the evaluated surface against the input rig (rest, breath_in,
foreleg_step, landing, crouch, leap must stay near 0 or improve), and the visibility gate (reskin_vis) before and after
on crouch_deep and the chosen signature frames.
"""
import bpy, sys, json, math, time, os
import numpy as np
from pathlib import Path

A = sys.argv[sys.argv.index('--') + 1:]
RIG_IN, PARP, CFGP, OUTB, REPP = A[:5]
CFG = json.load(open(CFGP))
_src = Path(__file__).with_name('reskin_shotsculpt.py').read_text(); _src = _src[:_src.index("SHOTS = [")]
sys.argv = ['x', '--', RIG_IN, PARP, CFGP, OUTB, REPP]
g = {'__file__': str(Path(__file__).with_name('reskin_shotsculpt.py')), '__name__': 'axilla'}
exec(compile(_src, 'reskin_shotsculpt.py', 'exec'), g)
rig, body, me, sc, vl = g['rig'], g['body'], g['me'], g['sc'], g['vl']
F, gn, NV, nbm, ev, set_shot, pairs_all, RV = g['F'], g['gn'], g['NV'], g['nbm'], g['ev'], g['set_shot'], g['pairs_all'], g['RV']
t0 = time.time()
BLEND = CFG.get('blend_mm', 25) / 1000; RMAX = CFG.get('rmax_mm', 90) / 1000; SCAP = CFG.get('scap_share', 0.25); WMAX = CFG.get('wmax', 1.0)
TRUNK = [n for n in gn if n.startswith(('spine_', 'neck_01', 'scapula_')) and not n.endswith('_aim')]
CHECK = [tuple(c) for c in CFG.get('check', [])]
GATE = [tuple(c) for c in CFG.get('gate', [])]


def shot_of(c): return (c[0], c[1] if c[0] == 'review' else int(c[1]))


def snap(shots):
    out = {}
    for c in shots:
        set_shot(shot_of(c)); out[c] = ev()
    return out


def gate(shots):
    out = {}
    for c in shots:
        set_shot(shot_of(c)); V = ev(); X = pairs_all(V)
        m = RV.measure(V, X, F, g['TDOM'], gn) if X else dict(pairs=0, visible=0, hidden_over_5mm=0, hidden_buried_max_mm=0.0, visible_bones=[])
        out[f'{c[0]}:{c[1]}'] = dict(pairs=len(X), visible=m['visible'], hidden_over_5mm=m['hidden_over_5mm'], buried_max_mm=m['hidden_buried_max_mm'], visible_bones=m['visible_bones'][:4])
        print('GATE', c, out[f'{c[0]}:{c[1]}'], flush=True)
    return out


rep = dict(config=CFG)
before = snap(CHECK)
if CFG.get('measure_only'):
    if CFG.get('dump'): np.savez_compressed(CFG['dump'], **{f'{c[0]}_{c[1]}': v.astype(np.float32) for c, v in before.items()})
    rep['gate'] = gate(GATE); Path(REPP).write_text(json.dumps(rep, indent=1, default=str)); print('AXILLA done (measure only)', flush=True); sys.exit(0)
if CFG.get('gate_before', True): rep['gate_before'] = gate(GATE)

# rest geometry in body space
M = body.matrix_world.inverted() @ rig.matrix_world
X0 = np.array([v.co[:] for v in me.vertices])
def seg(n):
    b = rig.data.bones[n]; return np.array(M @ b.head_local), np.array(M @ b.tail_local)
def dseg(P, h, t):
    ax = t - h; u = np.clip(((P - h) @ ax) / max(ax @ ax, 1e-12), 0, 1); return np.linalg.norm(P - (h + u[:, None] * ax), axis=1)

W = {n: np.zeros(NV) for n in gn}
for vg in body.vertex_groups:
    pass
for v in me.vertices:
    for gg in v.groups: W[gn[gg.group]][v.index] = gg.weight
trunk_sum = sum(W[n] for n in TRUNK)
d_trunk = np.min([dseg(X0, *seg(n)) for n in CFG.get('trunk_axis', ['spine_03', 'spine_04', 'spine_05', 'neck_01']) if n in rig.data.bones], axis=0)
share = {}
for s in 'lr':
    h1, t1 = seg(f'leg_f{s}_01'); h2, t2 = seg(f'leg_f{s}_02')
    h1 = h1 + CFG.get('humerus_from', 0.0) * (t1 - h1)   # the shoulder end can stay with the trunk
    tip = h2 + CFG.get('prox_forearm', 0.35) * (t2 - h2)
    d_arm = np.minimum(dseg(X0, h1, t1), dseg(X0, h2, tip))
    side = np.sign(X0[:, 0]) == (1 if s == 'l' else -1)
    x = np.clip((d_trunk - d_arm) / BLEND + 0.5, 0, 1); w = x * x * (3 - 2 * x)
    w *= (d_arm < RMAX) & side & (trunk_sum > 1e-4)
    # the ventral midline (sternum) stays with the trunk: fade out toward x = 0 below the elbow line
    mid = CFG.get('midline_mm', 25) / 1000
    w *= np.clip((np.abs(X0[:, 0]) - mid) / max(mid, 1e-6), 0, 1)
    for _ in range(CFG.get('smooth', 10)): w = 0.5 * w + 0.5 * nbm(w)
    w = np.clip(w * WMAX, 0, 1) * side
    share[s] = w
rep['moved_share'] = {s: dict(vertices_over_0p1=int((w > 0.1).sum()), vertices_over_0p5=int((w > 0.5).sum()), max=round(float(w.max()), 3)) for s, w in share.items()}
print('SHARE', rep['moved_share'], flush=True)
for s, w in share.items():
    take = w * trunk_sum
    for n in TRUNK: W[n] = W[n] * (1 - w)
    W[f'leg_f{s}_01'] += take * (1 - SCAP); W[f'scapula_{s}'] += take * SCAP
# write back (normalised)
tot = sum(W[n] for n in gn if rig.data.bones.get(n) and rig.data.bones[n].use_deform)
for vg in body.vertex_groups:
    n = vg.name
    if not (rig.data.bones.get(n) and rig.data.bones[n].use_deform): continue
    w = W[n] / np.maximum(tot, 1e-9)
    nz = np.nonzero(w > 1e-4)[0]; zz = np.nonzero((w <= 1e-4))[0]
    if len(zz): vg.remove(zz.tolist())
    q = np.round(w[nz] * 4096).astype(int)
    for val in np.unique(q):
        idx = nz[q == val]; vg.add(idx.tolist(), val / 4096.0, 'REPLACE')
vl.update()
after = snap(CHECK)
rep['check_change_mm'] = {}
for c in CHECK:
    d = np.linalg.norm(after[c] - before[c], axis=1) * 1000
    rep['check_change_mm'][f'{c[0]}:{c[1]}'] = dict(max=round(float(d.max()), 2), p99=round(float(np.percentile(d, 99)), 2), over_2mm=int((d > 2).sum()))
    print('CHANGE', c, rep['check_change_mm'][f'{c[0]}:{c[1]}'], flush=True)
rep['gate_after'] = gate(GATE)
set_shot(('sig', 0)); g['poser'].reset(); rig.animation_data.action = None; vl.update()
bpy.ops.wm.save_as_mainfile(filepath=OUTB)
Path(REPP).write_text(json.dumps(rep, indent=1, default=str)); print('AXILLA done', round(time.time() - t0), flush=True)
