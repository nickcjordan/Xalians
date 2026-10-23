"""B-sntv pass 7: pose-driven brisket corrective (narrow and lift the brisket and lower neck between folded forelegs).

blender -b --python reskin_brisket.py -- RIG_IN.blend PARAMS.json CFG.json RIG_OUT.blend REPORT.json

When the forelegs fold against the chest (crouch_deep, the airborne tuck) the proximal forearm sits 10 to 38 mm inside
the brisket and lower neck. A goat's chest there reads as a narrow keel between the forearms, so the body skin is moved
medially (toward the body's midplane, in the withers frame) until it clears the forearm and cannon (capsules fitted to
their own skin), and lifted by a share of that, as one wide smooth field per pose group, capped at CAP mm.

Per group (CFG groups: name -> {"train": [[kind, val], ...], "center": [kind, val], "frac": kernel width}):
  * required medial move per body vertex = max over the group's training poses of the distance along the medial
    direction that takes it past the capsule (only when the capsule is met within REACH mm)
  * the vector field is smoothed wide (rings), rescaled so the required vertices are still met (90th percentile), lifted
    by LIFT x its size, capped at CAP, and stored in the withers frame (attribute 'bk_<group>')
Playback: a Geometry Nodes modifier 'BrisketCorr' (after the angle correctives, before ShotSculpt) rotates each field
by the withers frame (an empty bone-parented to spine_05) and scales it by the group's weight (location x of an empty
driven by a joint-angle kernel on both elbows and shoulders: 1 at the group's centre pose, 0 at rest and at the
training angle away), then adds them.
Checks: pairs per training pose before and after (live stack), and the largest vertex move in rest, breath_in and
foreleg_step (must stay at 0).
"""
import bpy, sys, json, math, time, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reskin_vis as RV
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix

A = sys.argv[sys.argv.index('--') + 1:]
RIG_IN, PARP, CFGP, OUTB, REPP = A[:5]
CFG = json.load(open(CFGP))
# reuse the shot sculpt helpers (definitions only)
_src = Path(__file__).with_name('reskin_shotsculpt.py').read_text()
_src = _src[:_src.index("SHOTS = [")]
sys.argv = ['x', '--', RIG_IN, PARP, CFGP, OUTB, REPP]
g = {'__file__': str(Path(__file__).with_name('reskin_shotsculpt.py')), '__name__': 'brisket'}
exec(compile(_src, 'reskin_shotsculpt.py', 'exec'), g)
rig, body, me, sc, vl = g['rig'], g['body'], g['me'], g['sc'], g['vl']
F, DOM, TDOM, gn, RANK, HEADM, NV = g['F'], g['DOM'], g['TDOM'], g['gn'], g['RANK'], g['HEADM'], g['NV']
grow, nbm, ev, set_shot, pairs_all, capsule, capsule_carve, bone_segs, bone_pairs = (g[k] for k in (
    'grow', 'nbm', 'ev', 'set_shot', 'pairs_all', 'capsule', 'capsule_carve', 'bone_segs', 'bone_pairs'))
CAP = CFG.get('cap_mm', 40) / 1000; REACH = CFG.get('reach_mm', 30) / 1000; LIFT = CFG.get('lift', 0.35)
REVIEW = CFG['pose_order']
t0 = time.time()

# withers frame empty (bone-parented to spine_05) and the frame's rotation relative to the body
fr = bpy.data.objects.get('brisket_frame') or bpy.data.objects.new('brisket_frame', None)
if fr.name not in sc.collection.objects: sc.collection.objects.link(fr)
fr.parent = rig; fr.parent_type = 'BONE'; fr.parent_bone = 'spine_05'; fr.hide_render = True; fr.hide_viewport = True
rig.animation_data.action = None; g['poser'].reset(); vl.update()
pbm = rig.matrix_world @ rig.pose.bones['spine_05'].matrix
fr.matrix_world = pbm; vl.update()
fr['role'] = 'B-sntv pass 7 brisket corrective frame (withers)'


def frame_rot():
    vl.update(); R = (body.matrix_world.inverted() @ fr.matrix_world).to_3x3().normalized(); return np.array(R)


def frame_axes():
    M = body.matrix_world.inverted() @ rig.matrix_world @ rig.pose.bones['spine_05'].matrix
    lat = np.array(M.col[0][:3]); lat /= np.linalg.norm(lat); org = np.array(M.col[3][:3])
    up = np.array(M.col[2][:3]); up /= np.linalg.norm(up)
    return lat, up, org


set_shot(('review', 'rest')) if 'rest' in REVIEW else None
lat0, up0, _ = frame_axes(); UPSIGN = 1.0 if up0[2] > 0 else -1.0   # make 'up' point up at rest
cand_bones = [gn.index(n) for n in CFG.get('body_bones', ['neck_01', 'neck_02', 'spine_05', 'spine_04', 'spine_03']) if n in gn]
CAND = np.isin(DOM, cand_bones) & ~HEADM
fore = [j for j, n in enumerate(gn) if n.startswith('leg_f') and RANK[j] >= 2]
rep = dict(config=CFG, groups={})
fields = {}
for gname, gc in CFG['groups'].items():
    best = np.zeros((NV, 3)); bestm = np.zeros(NV)
    for kind, val in gc['train']:
        shot = (kind, val if kind == 'review' else int(val)); set_shot(shot); P = ev(); segs = bone_segs()
        lat, up, org = frame_axes(); R = frame_rot()
        ci = np.nonzero(CAND)[0]
        side = np.sign((P[ci] - org) @ lat); side[side == 0] = 1
        dirs = -side[:, None] * lat[None, :]
        req = np.zeros(len(ci))
        for jb in fore:
            if jb not in segs: continue
            cap = capsule(P, jb, segs[jb]); dep = capsule_carve(P[ci], dirs, cap, REACH)
            req = np.maximum(req, np.where(dep > 0, dep + g['MARGIN'], 0.0))
        vec = req[:, None] * dirs
        loc = vec @ R          # body space -> frame space (R columns are the frame axes in body space)
        upd = req > bestm[ci]; bestm[ci[upd]] = req[upd]; best[ci[upd]] = loc[upd]
        rep['groups'].setdefault(gname, {}).setdefault('train', {})[f'{kind}:{val}'] = dict(required_vertices=int((req > 0).sum()), required_max_mm=round(float(req.max()) * 1000, 1))
        print('REQ', gname, shot, int((req > 0).sum()), round(float(req.max()) * 1000, 1), flush=True)
    need = bestm > 0
    if not need.any(): continue
    wide = grow(need, CFG.get('rings', 30)) & CAND
    f = best.copy()
    for _ in range(CFG.get('smooth', 80)):
        f = np.where(wide[:, None], 0.5 * f + 0.5 * nbm(f), 0.0)
    m = np.linalg.norm(f, axis=1); ratio = bestm[need] / np.maximum(m[need], 1e-9)
    k = float(np.percentile(ratio, CFG.get('pct', 90))); f *= k
    # lift: up in the frame (frame axis z, signed to point up at rest), a share of the medial size
    upl = np.array([0.0, 0.0, UPSIGN]); f += LIFT * np.linalg.norm(f, axis=1)[:, None] * upl[None, :]
    m = np.linalg.norm(f, axis=1); f *= np.minimum(1.0, CAP / np.maximum(m, 1e-12))[:, None]
    fields[gname] = f
    rep['groups'][gname].update(field_vertices=int((np.linalg.norm(f, axis=1) > 1e-4).sum()), field_max_mm=round(float(np.linalg.norm(f, axis=1).max()) * 1000, 1), rescale=round(k, 2))
    print('FIELD', gname, rep['groups'][gname], round(time.time() - t0), flush=True)

# storage
for nm in [a.name for a in me.attributes if a.name.startswith('bk_')]: me.attributes.remove(me.attributes[nm])
for gname, f in fields.items():
    at = me.attributes.new(f'bk_{gname}', 'FLOAT_VECTOR', 'POINT'); at.data.foreach_set('vector', f.astype(np.float32).ravel())

# weights: kernel on both elbows and shoulders, as the location x of an empty
def kernel_driver(obj, center, frac, bones):
    shot = (center[0], center[1] if center[0] == 'review' else int(center[1])); set_shot(shot)
    fc = obj.driver_add('location', 0); dr = fc.driver; dr.type = 'SCRIPTED'
    for v in list(dr.variables): dr.variables.remove(v)
    terms = []; letters = 'abcdefghijklmnop'; used = []
    for bi, n in enumerate(bones):
        q = rig.pose.bones[n].rotation_quaternion; ang = 2 * math.degrees(math.acos(min(1.0, abs(q.w))))
        if ang < 3: continue
        parts = []
        for k in range(4):
            if abs(q[k]) < 5e-3: continue
            nm = letters[len(used) * 4 + k]; v = dr.variables.new(); v.name = nm; v.type = 'SINGLE_PROP'
            v.targets[0].id = rig; v.targets[0].data_path = f'pose.bones["{n}"].rotation_quaternion[{k}]'; parts.append(f'{nm}*{q[k]:.3f}')
        d0 = math.cos(math.radians(frac * ang) / 2)
        terms.append(f'max(0,min(1,(abs({"+".join(parts)})-{d0:.4f})/{1 - d0:.4f}))'.replace('+-', '-')); used.append((n, round(ang, 1)))
    dr.expression = '*'.join(terms) or '0'
    for m_ in list(fc.modifiers): fc.modifiers.remove(m_)
    assert len(dr.expression) < 256, (len(dr.expression), dr.expression)
    return dr.expression, used


wobj = {}
for gname in fields:
    o = bpy.data.objects.get(f'bk_w_{gname}') or bpy.data.objects.new(f'bk_w_{gname}', None)
    if o.name not in sc.collection.objects: sc.collection.objects.link(o)
    o.hide_render = True; o.hide_viewport = True; o.animation_data_clear()
    gc = CFG['groups'][gname]
    expr, used = kernel_driver(o, gc['center'], gc.get('frac', 1.0), CFG.get('driver_bones', ['leg_fl_02', 'leg_fr_02', 'leg_fl_01']))
    wobj[gname] = o; rep['groups'][gname].update(driver=expr, driver_bones=used)

# Geometry Nodes playback
ng = bpy.data.node_groups.new('BrisketCorr', 'GeometryNodeTree')
ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
gi = ng.nodes.new('NodeGroupInput'); go = ng.nodes.new('NodeGroupOutput'); sp = ng.nodes.new('GeometryNodeSetPosition')
fi = ng.nodes.new('GeometryNodeObjectInfo'); fi.transform_space = 'RELATIVE'; fi.inputs['Object'].default_value = fr
acc = None
for gname, o in wobj.items():
    na = ng.nodes.new('GeometryNodeInputNamedAttribute'); na.data_type = 'FLOAT_VECTOR'; na.inputs['Name'].default_value = f'bk_{gname}'
    rv = ng.nodes.new('FunctionNodeRotateVector'); ng.links.new(na.outputs['Attribute'], rv.inputs['Vector']); ng.links.new(fi.outputs['Rotation'], rv.inputs['Rotation'])
    wi = ng.nodes.new('GeometryNodeObjectInfo'); wi.transform_space = 'ORIGINAL'; wi.inputs['Object'].default_value = o
    sx = ng.nodes.new('ShaderNodeSeparateXYZ'); ng.links.new(wi.outputs['Location'], sx.inputs[0])
    sm = ng.nodes.new('ShaderNodeVectorMath'); sm.operation = 'SCALE'; ng.links.new(rv.outputs[0], sm.inputs[0]); ng.links.new(sx.outputs['X'], sm.inputs['Scale'])
    if acc is None: acc = sm.outputs[0]
    else:
        ad = ng.nodes.new('ShaderNodeVectorMath'); ad.operation = 'ADD'; ng.links.new(acc, ad.inputs[0]); ng.links.new(sm.outputs[0], ad.inputs[1]); acc = ad.outputs[0]
ng.links.new(gi.outputs['Geometry'], sp.inputs['Geometry']); ng.links.new(acc, sp.inputs['Offset']); ng.links.new(sp.outputs['Geometry'], go.inputs['Geometry'])
md = body.modifiers.new('BrisketCorr', 'NODES'); md.node_group = ng
ss = body.modifiers.find('ShotSculpt')
body.modifiers.move(body.modifiers.find('BrisketCorr'), ss if ss >= 0 else len(body.modifiers) - 1)

# checks through the live stack
def live(shot, on):
    md.show_viewport = on; set_shot(shot); vl.update(); return ev()
chk = {}
for shot in [tuple(x) for x in CFG.get('check', [])]:
    shot = (shot[0], shot[1] if shot[0] == 'review' else int(shot[1]))
    V1 = live(shot, True); X1 = pairs_all(V1); V0 = live(shot, False); X0 = pairs_all(V0); md.show_viewport = True
    w = {gname: round(o.evaluated_get(bpy.context.evaluated_depsgraph_get()).location[0], 3) for gname, o in wobj.items()}
    m0 = RV.measure(V0, X0, F, TDOM, gn) if X0 else dict(visible=0, hidden_over_5mm=0, hidden_buried_max_mm=0)
    m1 = RV.measure(V1, X1, F, TDOM, gn) if X1 else dict(visible=0, hidden_over_5mm=0, hidden_buried_max_mm=0)
    chk[f'{shot[0]}:{shot[1]}'] = dict(gate_before=(m0['visible'], m0['hidden_over_5mm'], m0['hidden_buried_max_mm']), gate_after=(m1['visible'], m1['hidden_over_5mm'], m1['hidden_buried_max_mm']), pairs_before=len(X0), pairs_after=len(X1), weights=w, max_move_mm=round(float(np.linalg.norm(V1 - V0, axis=1).max()) * 1000, 2), bones_after=bone_pairs(X1)[:4])
    print('CHECK', shot, chk[f'{shot[0]}:{shot[1]}'], flush=True)
rep['check'] = chk
set_shot(('sig', 0)); g['poser'].reset(); rig.animation_data.action = None; sc.frame_set(1); vl.update()
bpy.ops.wm.save_as_mainfile(filepath=OUTB)
Path(REPP).write_text(json.dumps(rep, indent=1)); print('BRISKET done', round(time.time() - t0), flush=True)
