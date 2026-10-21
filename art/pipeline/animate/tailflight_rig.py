"""B-378v: plume bones for Luceras (tail_07..tail_09) and the plume spine tube on the clip rig.

Usage (inside WSL, through the slot):
  blender -b --factory-startup --python tailflight_rig.py -- rig   RIG_IN GROOM OUT_RIG REPORT_JSON
  blender -b --factory-startup --python tailflight_rig.py -- proxy CLIPS_IN GROOM OUT_BLEND REPORT_JSON

rig    Opens the approved rig read-only, adds three sprite-only bones that continue the tail chain along the
       plume spine extension (the 0.36 m of the pass 9 spine past the tail_06 tip, split into equal arcs), appends
       the hidden plume spine tube from the groom and reweights its extension along tail_06..tail_09, adds a clay
       plume stand-in (review only, same rings and weights as the tube, wider), and saves OUT_RIG.
proxy  Appends the tube and the stand-in with the pass 9 weights (extension rigid to tail_06 with the tail_05 share)
       to an existing clips file, for the "before" renders. Saves OUT_BLEND.

Inputs are never written. The tube keeps its vertex order (ring i = vertices i*10..i*10+9, then the tip vertex), so
the plume strands, bound by triangle index, follow the reweighted tube unchanged.
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:]
MODE = ARGS[0]
K = 10
NEW_BONES = ('tail_07', 'tail_08', 'tail_09')
STANDIN_HALF_WIDTH_M = 0.032     # clay plume stand-in: radius added over the plume (review only)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)


def spine_data(groom):
    sp = np.load(str(Path(groom).parent / 'plume_spine.npz'))
    b = json.loads((Path(groom).parent / 'plume_build.json').read_text())['spine']
    return sp['S'], sp['a'], sp['R'], b


def append_tube(groom):
    with bpy.data.libraries.load(groom, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n == 'luceras_plume_spine']
    o = dst.objects[0]; bpy.context.scene.collection.objects.link(o)
    return o


def arc_of_vertex(n_rings, a):
    """Arc length of every tube vertex (ring order, then the tip vertex)."""
    return np.r_[np.repeat(a, K), a[-1]]


def weights_of(o):
    gi = {g.index: g.name for g in o.vertex_groups}
    return [{gi[g.group]: g.weight for g in v.groups if g.weight > 0} for v in o.data.vertices]


def set_weights(o, W):
    for g in list(o.vertex_groups): o.vertex_groups.remove(g)
    groups = {}
    for i, w in enumerate(W):
        for k, x in w.items():
            if x <= 1e-6: continue
            if k not in groups: groups[k] = o.vertex_groups.new(name=k)
            groups[k].add([i], float(x), 'REPLACE')


def attach(o, rig):
    o.parent = rig; o.parent_type = 'OBJECT'; o.matrix_parent_inverse.identity(); o.matrix_world.identity()
    mods = [m for m in o.modifiers if m.type == 'ARMATURE']
    if not mods:
        m = o.modifiers.new('Tail chain', 'ARMATURE'); mods = [m]
    for m in mods: m.object = rig


def make_standin(tube, S, a, R, plume_start, W):
    """Clay plume stand-in: the tube rings with a wider radius over the plume, same weights by vertex index."""
    T = np.gradient(S, axis=0); T /= np.linalg.norm(T, axis=1)[:, None]
    X = np.tile([1., 0, 0], (len(S), 1)); X -= T * (X * T).sum(1)[:, None]; X /= np.linalg.norm(X, axis=1)[:, None]
    F = np.cross(X, T); F /= np.linalg.norm(F, axis=1)[:, None]
    u = np.clip((a - plume_start) / (a[-1] - plume_start), 0, 1)
    Rw = R + STANDIN_HALF_WIDTH_M * np.sin(np.pi * u) ** 0.6 * (u > 0)
    ang = np.linspace(0, 2 * np.pi, K, endpoint=False)
    V = (S[:, None, :] + Rw[:, None, None] * (np.cos(ang)[None, :, None] * F[:, None, :] + np.sin(ang)[None, :, None] * X[:, None, :])).reshape(-1, 3)
    V = np.vstack([V, S[-1] + T[-1] * .001])
    me = bpy.data.meshes.new('plume_standin'); me.from_pydata(V.tolist(), [], [tuple(p.vertices) for p in tube.data.polygons]); me.update()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new('plume_standin', me); bpy.context.scene.collection.objects.link(o)
    o['body_kind'] = 'plume_standin'
    o['role'] = 'Review-only clay stand-in for the furred plume (B-378v): the plume spine tube rings, widened, same weights by vertex index. Not shipped.'
    set_weights(o, W); return o


def chain_weights(W0, va, mids, mesh_arc):
    """Extension past the sculpt tail tip: linear blend between consecutive bone midpoints along the arc
    (tail_06 alone up to its midpoint, tail_09 alone past its midpoint). The sculpt part keeps its weights."""
    names = ('tail_06',) + NEW_BONES
    W = []
    for w, x in zip(W0, va):
        if x <= mesh_arc:
            W.append(dict(w)); continue
        if x <= mids[0]: W.append({'tail_06': 1.0}); continue
        if x >= mids[-1]: W.append({names[-1]: 1.0}); continue
        k = int(np.searchsorted(mids, x)) - 1; u = (x - mids[k]) / (mids[k + 1] - mids[k])
        W.append({names[k]: 1.0 - u, names[k + 1]: u})
    return W


def do_rig(rig_in, groom, out_rig, report):
    bpy.ops.wm.open_mainfile(filepath=rig_in)
    rig = bpy.data.objects['luceras_rig']
    S, a, R, spb = spine_data(groom)
    bones = rig.data.bones
    t6_tail = np.array(bones['tail_06'].tail_local); t6_head = np.array(bones['tail_06'].head_local)
    i0 = int(np.argmin(np.linalg.norm(S - t6_tail, axis=1))); a0 = a[i0]
    ext_len = a[-1] - a0
    cuts = [a0 + ext_len * k / 3 for k in range(4)]
    pts = [np.array([np.interp(c, a, S[:, j]) for j in range(3)]) for c in cuts]
    pts[0] = t6_tail   # connect exactly to the tail_06 tip
    bpy.context.view_layer.objects.active = rig; rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = rig.data.edit_bones; parent = eb['tail_06']
    for k, name in enumerate(NEW_BONES):
        b = eb.new(name); b.head = Vector(pts[k].tolist()); b.tail = Vector(pts[k + 1].tolist())
        y = (b.tail - b.head).normalized(); b.align_roll(Vector((1, 0, 0)).cross(y))
        b.parent = parent; b.use_connect = True; b.use_deform = True; b.inherit_scale = parent.inherit_scale
        parent = b
    bpy.ops.object.mode_set(mode='OBJECT')
    for name in NEW_BONES:
        bones[name]['sprite_only'] = True
        bones[name]['role'] = 'Plume bone (B-378v): sprite renders only; the parked game mesh has no weights on it and keeps its 40 joints.'
    rig['sprite_only_bones'] = list(NEW_BONES)
    # the tube, reweighted along the chain
    tube = append_tube(groom); attach(tube, rig)
    W0 = weights_of(tube); va = arc_of_vertex(len(S), a)
    a6_head = float(a[int(np.argmin(np.linalg.norm(S - t6_head, axis=1)))])
    mids = [0.5 * (h + t) for h, t in [(a6_head, a0)] + [(cuts[k], cuts[k + 1]) for k in range(3)]]
    W = chain_weights(W0, va, mids, spb['on_sculpt_m'])
    set_weights(tube, W)
    tube['role'] = 'Hidden plume spine proxy (pass 9 groom), B-378v: extension reweighted along tail_06..tail_09 (linear between bone midpoints along the arc); sculpt part unchanged'
    sd = make_standin(tube, S, a, R, spb['plume_start_arc_m'], W); attach(sd, rig)
    for o in (tube, sd):
        o.hide_render = o is tube
    bpy.ops.wm.save_as_mainfile(filepath=out_rig)
    rep = dict(rig_in=rig_in, groom=groom, out=out_rig, bones={}, extension_arc_m=float(ext_len), extension_start_arc_m=float(a0),
               bone_mid_arcs_m=[float(m) for m in mids], weight_scheme='sculpt part: unchanged (nearest tail vertex weights); past the sculpt tail tip (arc > %.4f m): tail_06 alone up to its midpoint, then linear between consecutive bone midpoints, tail_09 alone past its midpoint' % spb['on_sculpt_m'],
               tube_vertices=len(tube.data.vertices), weights_before_sample={}, weights_after_sample={})
    for name in NEW_BONES:
        b = rig.data.bones[name]
        rep['bones'][name] = dict(head=[round(x, 4) for x in b.head_local], tail=[round(x, 4) for x in b.tail_local], length_m=round(b.length, 4),
                                  parent=b.parent.name, deform=b.use_deform, sprite_only=True)
    for idx in (int(np.searchsorted(a, x)) for x in np.linspace(spb['on_sculpt_m'], a[-1], 8)):
        v = min(idx, len(a) - 1) * K
        rep['weights_before_sample'][f'{a[min(idx, len(a) - 1)]:.3f}'] = {k: round(x, 3) for k, x in W0[v].items()}
        rep['weights_after_sample'][f'{a[min(idx, len(a) - 1)]:.3f}'] = {k: round(x, 3) for k, x in W[v].items()}
    Path(report).write_text(json.dumps(rep, indent=1))
    print('RIG done', json.dumps(rep['bones']), flush=True)


def do_proxy(clips_in, groom, out_blend, report):
    bpy.ops.wm.open_mainfile(filepath=clips_in)
    rig = bpy.data.objects['luceras_rig']
    S, a, R, spb = spine_data(groom)
    tube = append_tube(groom); attach(tube, rig); tube.hide_render = True
    sd = make_standin(tube, S, a, R, spb['plume_start_arc_m'], weights_of(tube)); attach(sd, rig)
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)
    Path(report).write_text(json.dumps(dict(clips_in=clips_in, groom=groom, out=out_blend, weights='pass 9 as built (extension tail_06 with tail_05 share)'), indent=1))
    print('PROXY done', flush=True)


if __name__ == '__main__':
    if MODE == 'rig':
        do_rig(*ARGS[1:5])
    elif MODE == 'proxy':
        do_proxy(*ARGS[1:5])
