"""B-6kf7: apply the neck region delta (and optional band weights) to a rig or clips blend, keeping exact topology.

Usage: blender -b --factory-startup --python neck_apply.py -- SRC_BLEND DELTA_NPZ OUT_BLEND OUT_JSON [WEIGHTS_NPZ]
DELTA_NPZ: index (moved vertex indices), base_co, new_co (rest coordinates). The body mesh and every shape key get the
same per-vertex offset, so corrective offsets (key minus Basis) are unchanged everywhere. WEIGHTS_NPZ (optional): index,
names, w (rows of new weights for those bone groups on those vertices; other groups untouched).
Refuses if the body's base coordinates at the given indices do not match base_co exactly.
"""
import bpy, sys, json, hashlib, numpy as np
from pathlib import Path

a = sys.argv[sys.argv.index('--') + 1:]; SRC, DELTA, OUTB, OUTJ = a[0], a[1], a[2], a[3]; WTS = a[4] if len(a) > 4 else None
bpy.ops.wm.open_mainfile(filepath=SRC)
o = bpy.data.objects['luceras_blockout']; me = o.data
z = np.load(DELTA); idx = z['index']; base = z['base_co']; new = z['new_co']


def topo(m):
    h = hashlib.sha256()
    for coll, prop in ((m.loops, 'vertex_index'), (m.polygons, 'loop_start'), (m.polygons, 'loop_total'), (m.edges, 'vertices')):
        x = np.empty(len(coll) * (2 if prop == 'vertices' else 1), np.int32); coll.foreach_get(prop, x); h.update(x.tobytes())
    return h.hexdigest()


def co(seq):
    x = np.empty(len(seq) * 3); seq.foreach_get('co', x); return x.reshape(-1, 3)


t0 = topo(me); V = co(me.vertices)
err = float(np.abs(V[idx] - base).max())
assert err == 0.0, f'base mismatch {err}'
D = new - base
V[idx] += D; me.vertices.foreach_set('co', V.ravel())
keys = {}
if me.shape_keys:
    kb0 = me.shape_keys.key_blocks
    B0 = co(kb0[0].data)
    off0 = {k.name: co(k.data) - B0 for k in kb0[1:]}
    for k in kb0:
        K = co(k.data); K[idx] += D; k.data.foreach_set('co', K.ravel())
    B1 = co(kb0[0].data)
    keys = {k.name: float(np.abs((co(k.data) - B1) - off0[k.name]).max()) for k in kb0[1:]}
    keys['basis_equals_mesh'] = float(np.abs(B1 - V).max())
me.update()
wrep = None
if WTS:
    w = np.load(WTS, allow_pickle=True); wi = w['index']; wn = [str(x) for x in w['names']]; W = w['w']
    for j, nm in enumerate(wn):
        g = o.vertex_groups[nm]
        for i, val in zip(wi.tolist(), W[:, j].tolist()):
            if val > 1e-6: g.add([int(i)], float(val), 'REPLACE')
            else: g.remove([int(i)])
    wrep = dict(vertices=int(len(wi)), groups=wn)
t1 = topo(me)
assert t0 == t1
o['neck_build_id'] = 'B-6kf7 pass1'
bpy.ops.wm.save_as_mainfile(filepath=OUTB)
Path(OUTJ).write_text(json.dumps(dict(src=SRC, out=OUTB, moved=int(len(idx)), max_move_mm=float(1000 * np.linalg.norm(D, axis=1).max()),
                                       topology_sha256_before=t0, topology_sha256_after=t1, corrective_offset_change_max_m=keys, weights=wrep), indent=1))
print('APPLY done', OUTB, flush=True)
