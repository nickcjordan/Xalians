"""B-78vx: pose the approved Luceras rig from luceras_clips specs, bake, measure, render.

Usage (inside WSL, through the slot):
  blender -b --factory-startup --python pose_rig.py -- OUT_DIR MODE [args]
MODE
  bake        open the approved rig read-only, bake both clips onto the deform bones, save OUT/work/clips.blend,
              write OUT/work/bake.json (per-frame specs, pose checks) and OUT/work/measure.json
  keys        bake, then render key frames of the signature (fast check, Cycles small)
  render CLIP CAM SIZE [travel|inplace] [step]   render frames of a clip to OUT/frames/<clip>_<cam>_<size>/
  encode      assemble MP4s from rendered frames with Blender's own FFmpeg (no installs)

The deform rig is posed directly (its control-input constraints stay off); the two-link foot solver plants the
feet against the ground with the toe tip as the contact point.
"""
import bpy, sys, json, math, os, time
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / 'roster'))
import luceras_clips as LC
import lookdev

RIG_BLEND = os.environ.get('ANIM_RIG', '/mnt/c/dev/art-data/pipeline/codex-stream/luceras-pawintegrate/pass3/rig.blend')  # B-378v: ANIM_RIG selects the rig
ARGS = sys.argv[sys.argv.index('--') + 1:]
OUT = Path(ARGS[0]); MODE = ARGS[1]
WORK = OUT / 'work'; WORK.mkdir(parents=True, exist_ok=True)
PARAMS = OUT / 'params.json'
FPS = 30
X = Vector((1, 0, 0)); NOSE_UP = Vector((-1, 0, 0)); YAW_L = Vector((0, 0, 1)); ROLL = Vector((0, -1, 0))
C0 = Vector((0.0, 0.12, 0.48))   # body center at rest (mid spine), the pivot for body pitch
LEGS = LC.LEGS
CLIPS = ('idle', 'sig.horns-first-descent')


def jdump(path, d):
    Path(path).write_text(json.dumps(d, indent=1, default=lambda x: x.item() if isinstance(x, np.generic) else x.tolist() if isinstance(x, np.ndarray) else str(x)))


def load_params():
    if PARAMS.exists():
        return json.loads(PARAMS.read_text())
    return {'idle': {}, 'sig.horns-first-descent': {}}


def build_clips(params):
    pi, fi, ei = LC.make_idle(params.get('idle'))
    ps, fs, es, trav, times = LC.make_sig(params.get('sig.horns-first-descent'))
    return {
        'idle': dict(params=pi, fn=fi, events=ei, loop=True, duration=pi['duration_ms'], travel=None, times={}),
        'sig.horns-first-descent': dict(params=ps, fn=fs, events=es, loop=False, duration=ps['duration_ms'], travel=trav, times=times),
    }


# -- rig posing -----------------------------------------------------------------------------------------------

class Poser:
    def __init__(self, rig):
        self.rig = rig; self.pb = rig.pose.bones; self.vl = bpy.context.view_layer
        self.rest = {b.name: b.matrix_local.copy() for b in rig.data.bones}
        self.rest_inv = {n: m.to_3x3().inverted() for n, m in self.rest.items()}
        self.deform = [b.name for b in rig.data.bones if b.use_deform]
        bones = rig.data.bones
        self.legs = {}
        for leg in LEGS:
            a, b, c = (bones[f'leg_{leg}_{i:02d}'] for i in (1, 2, 3))
            c_rot = c.matrix_local.to_3x3()
            self.legs[leg] = dict(names=(a.name, b.name, c.name), L1=(a.tail_local - a.head_local).length, L2=(b.tail_local - b.head_local).length,
                                  W0=b.tail_local.copy(), P0=c.tail_local.copy(), c_rot=c_rot, toe_local=c_rot.inverted() @ (c.tail_local - c.head_local))
        sp = bones['spine_01']; back = sp.head_local - sp.tail_local
        self.back_angle = math.degrees(math.atan2(back.z, back.y))
        # B-378v: every tail bone the rig has (tail_07..tail_09 are the sprite-only plume bones when present)
        self.tail_names = []; self.tail_rest = []
        i = 1
        while f'tail_{i:02d}' in bones:
            t = bones[f'tail_{i:02d}']; d = t.tail_local - t.head_local
            self.tail_names.append(t.name); self.tail_rest.append(math.degrees(math.atan2(d.z, d.y))); i += 1
        # the trunk line (pelvis joint to withers), pointing back: the tail's in-line target when tail_axis == 'trunk'
        tr = sp.head_local - bones['spine_05'].tail_local
        self.trunk_angle = math.degrees(math.atan2(tr.z, tr.y))

    def reset(self):
        for p in self.pb:
            p.rotation_mode = 'QUATERNION'; p.rotation_quaternion = Quaternion(); p.location = Vector(); p.scale = (1, 1, 1)

    def rot(self, name, axis, deg):
        if abs(deg) < 1e-9: return
        p = self.pb[name]
        p.rotation_quaternion = Quaternion(self.rest_inv[name] @ axis, math.radians(deg)) @ p.rotation_quaternion

    def apply(self, s):
        self.reset()
        f, z, pitch, roll, yaw, side = s.get('body', (0, 0, 0, 0, 0, 0))
        R = Matrix.Rotation(math.radians(yaw), 4, YAW_L) @ Matrix.Rotation(math.radians(roll), 4, ROLL) @ Matrix.Rotation(math.radians(pitch), 4, NOSE_UP)
        M = Matrix.Translation(C0 + Vector((side, -f, z))) @ R @ Matrix.Translation(-C0) @ self.rest['spine_01']
        self.pb['spine_01'].matrix = M
        bend = s.get('bend', 0.0)
        for i in range(2, 6): self.rot(f'spine_{i:02d}', NOSE_UP, bend)
        br = s.get('breath', 0.0); sq = s.get('squash', 0.0)
        for n in ('spine_03', 'spine_04', 'spine_05'): self.pb[n].scale = (1 + 0.045 * br, 1.0, 1 + 0.03 * br)
        if sq:
            for n in ('spine_02', 'spine_03', 'spine_04', 'spine_05'):
                x, y, z_ = self.pb[n].scale
                self.pb[n].scale = (x * (1 + 0.06 * sq), y * (1 - 0.12 * sq), z_ * (1 + 0.06 * sq))
        n1, n2 = s.get('neck', (0, 0))
        self.rot('neck_01', NOSE_UP, n1); self.rot('neck_02', NOSE_UP, n2)
        self.rot('neck_02', YAW_L, s.get('neck_yaw', 0.0))
        self.rot('head_01', NOSE_UP, s.get('head', 0.0)); self.rot('head_01', YAW_L, s.get('head_yaw', 0.0))
        self.rot('jaw_01', Vector((1, 0, 0)), s.get('jaw', 0.0))
        for side_, sg in (('l', 1), ('r', -1)):
            back, lift = s.get('ears', {}).get(side_, (0.0, 0.0))
            for nm, k in ((f'ear_{side_}_01', 1.0), (f'ear_{side_}_02', 0.3)):
                self.rot(nm, YAW_L, sg * back * k); self.rot(nm, Vector((0, 1, 0)), -sg * lift * k)
        tail = s.get('tail', [])
        tail = tail[:len(self.tail_names)]
        if s.get('tail_mode') == 'straighten':
            prev = 0.0
            target = s.get('tail_target_deg', self.back_angle)   # B-378v: the clip may name the in-line angle (body frame, back = 0)
            for i, tv in enumerate(tail):
                A = self.tail_rest[i] + tv['s'] * (target - self.tail_rest[i]) + tv['lift']
                D = A - self.tail_rest[i]
                self.rot(self.tail_names[i], X, D - prev); prev = D
                self.rot(self.tail_names[i], YAW_L, tv.get('yaw', 0.0))
        else:
            for i, (lift, yw) in enumerate(tail):
                self.rot(self.tail_names[i], X, lift); self.rot(self.tail_names[i], YAW_L, yw)
        self.vl.update()
        w = s.get('pin', 0.0)
        if w > 0 and getattr(self, 'pin_local', None) is not None:
            cur = self.pb['head_01'].matrix @ self.pin_local
            d = (self.pin_target - cur) * w
            self.pb['spine_01'].matrix = Matrix.Translation(d) @ self.pb['spine_01'].matrix
            self.vl.update()
        self.solve_legs(s.get('legs', {}))

    def solve_legs(self, legs):
        targets = {}
        for leg, L in self.legs.items():
            spec = legs.get(leg, {'plant': 1.0})
            fk = spec.get('fk', (0, 0, 0))
            for nm, ang in zip(L['names'], fk): self.rot(nm, X, ang)
            ab = spec.get('abduct', 0.0)   # B-sntv: swing the limb out from the body wall (deg, positive = outward)
            if ab: self.rot(L['names'][0], Vector((0, 1, 0)), (-ab if leg[1] == 'l' else ab))
        self.vl.update()
        for leg, L in self.legs.items():
            spec = legs.get(leg, {'plant': 1.0})
            a, b, c = (self.pb[n] for n in L['names'])
            W = b.tail.copy(); K = a.tail.copy(); R3 = c.matrix.to_3x3().normalized()
            w = spec.get('plant', 1.0)
            df, dz = spec.get('anchor', (0.0, 0.0))
            P = L['P0'] + Vector((0, -df, dz))
            Rr = Matrix.Rotation(math.radians(spec.get('roll', 0.0)), 3, X)
            Wp = P + Rr @ (L['W0'] - L['P0']); R3p = Rr @ L['c_rot']
            Wt = W.lerp(Wp, w); R3t = R3.to_quaternion().slerp(R3p.to_quaternion(), w).to_matrix()
            toe = Wt + R3t @ L['toe_local']
            lift = max(0.0, L['P0'].z - toe.z)
            Wt = Wt + Vector((0, 0, lift))
            if w <= 1e-6 and lift <= 0: continue
            targets[leg] = (Wt, R3t, K)
        if not targets: return
        solved = {}
        for leg, (Wt, R3t, K) in targets.items():
            L = self.legs[leg]; a = self.pb[L['names'][0]]
            H = a.head.copy(); d = Wt - H; L1, L2 = L['L1'], L['L2']
            dist = max(abs(L1 - L2) + 1e-4, min(L1 + L2 - 1e-4, d.length)); n = d.normalized()
            along = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist); h = math.sqrt(max(L1 * L1 - along * along, 0.0))
            pole = (K - H); side = (pole - n * pole.dot(n))
            if side.length < 1e-6: side = Vector((0, -1, 0)) if L['names'][0].startswith('leg_f') else Vector((0, -1, 0))
            side.normalize()
            tuck = legs.get(leg, {}).get('tuck', 0.0)   # B-bafy: 0..1, turn the knee/elbow plane toward the sagittal plane
            if tuck > 0:
                sg = Vector((0.0, side.y, side.z)); sg = sg - n * sg.dot(n)
                if sg.length > 1e-6: side = side.lerp(sg.normalized(), tuck).normalized()
            Kn = H + n * along + side * h
            solved[leg] = (H, Kn, H + n * dist, R3t)
        for step in (0, 1):
            for leg, (H, K, F, R3t) in solved.items():
                p = self.pb[self.legs[leg]['names'][step]]
                start, end = (H, K) if step == 0 else (K, F)
                Mx = p.matrix.copy(); cur = Mx.col[1].xyz.normalized()
                q = cur.rotation_difference((end - start).normalized())
                p.matrix = Matrix.Translation(p.head) @ (q.to_matrix() @ Mx.to_3x3()).to_4x4()
            self.vl.update()
        for leg, (H, K, F, R3t) in solved.items():
            p = self.pb[self.legs[leg]['names'][2]]
            p.matrix = Matrix.Translation(p.head) @ R3t.to_4x4()
        self.vl.update()


# -- scene ----------------------------------------------------------------------------------------------------

def open_rig():
    bpy.ops.wm.open_mainfile(filepath=RIG_BLEND)
    rig = bpy.data.objects['luceras_rig']
    rig['controls_enabled'] = 0.0; rig.update_tag()
    rig.animation_data_create(); rig.animation_data.action = None
    rig.location = (0, 0, 0)
    return rig


def sculpt_meshes():
    return [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.get('body_kind') == 'sculpt']


def set_deform_mods(on):
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            for m in o.modifiers:
                if m.type == 'ARMATURE': m.show_viewport = on


def frames_of(clip):
    n = clip['duration'] * FPS / 1000
    assert abs(n - round(n)) < 1e-6, clip['duration']
    return int(round(n))


def bake(rig, poser, name, clip):
    """Pose every frame from the spec, then key every deform bone. Returns per-frame specs."""
    n = frames_of(clip); store = []; specs = []
    for f in range(n + 1):
        t = f * 1000.0 / FPS
        if clip['loop'] and f == n: t = 0.0
        s = clip['fn'](t); specs.append(s)
        poser.apply(s)
        store.append({nm: (tuple(rig.pose.bones[nm].location), tuple(rig.pose.bones[nm].rotation_quaternion), tuple(rig.pose.bones[nm].scale)) for nm in poser.deform})
    old = bpy.data.actions.get(name)
    if old: bpy.data.actions.remove(old)
    act = bpy.data.actions.new(name); act.use_fake_user = True
    rig.animation_data.action = act
    for f, st in enumerate(store):
        for nm, (loc, q, sc) in st.items():
            p = rig.pose.bones[nm]; p.location = loc; p.rotation_quaternion = q; p.scale = sc
            for prop in ('location', 'rotation_quaternion', 'scale'): p.keyframe_insert(prop, frame=f, group=nm)
    act.frame_range = (0, n)
    try: act.use_frame_range = True
    except Exception: pass
    return act, specs, store


def pose_matrices(rig):
    return {p.name: np.array(p.matrix) for p in rig.pose.bones}


def eval_coords(o):
    dg = bpy.context.evaluated_depsgraph_get(); ev = o.evaluated_get(dg); m = ev.to_mesh()
    a = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', a); ev.to_mesh_clear()
    a = a.reshape(-1, 3); W = np.array(o.matrix_world)
    return a @ W[:3, :3].T + W[:3, 3]


def measure(rig, poser, clips, specs_all):
    """Per-frame checks on the evaluated meshes (in place: the rig object never moves here)."""
    set_deform_mods(True)
    sc = bpy.context.scene; names = [b.name for b in rig.data.bones]
    body = bpy.data.objects['luceras_blockout']
    horns = [bpy.data.objects['horn_l'], bpy.data.objects['horn_r']]
    claws = [o for o in sculpt_meshes() if 'claw' in o.name]
    others = [o for o in sculpt_meshes() if o not in horns]
    # body vertices that belong to the head (excluded from the horn-to-body distance)
    gi = {g.index: g.name for g in body.vertex_groups}
    headw = np.zeros(len(body.data.vertices)); tailw = np.zeros(len(body.data.vertices)); rootw = np.zeros(len(body.data.vertices))
    for v in body.data.vertices:
        for g in v.groups:
            gn = gi.get(g.group, '')
            if gn in ('head_01', 'jaw_01', 'ear_l_01', 'ear_l_02', 'ear_r_01', 'ear_r_02', 'neck_02'): headw[v.index] += g.weight
            if gn.startswith('tail_') and gn != 'tail_01': tailw[v.index] += g.weight
            if gn in ('tail_01', 'spine_01'): rootw[v.index] += g.weight
    notHead = headw < 0.5
    # B-378v tail clearance: tail skin past tail_01 (and the plume stand-in) against everything that is not tail or pelvis
    tail_idx = np.where(tailw > 0.6)[0][::3]; far_idx = np.where(tailw + rootw < 0.02)[0][::2]
    standin = bpy.data.objects.get('plume_standin')
    # horn tips at rest: the 40 vertices farthest from each horn base
    rig.animation_data.action = None; poser.reset(); bpy.context.view_layer.update()
    tips = {}
    for h in horns:
        base = np.array(rig.data.bones['horn_l_01' if h.name.endswith('_l') else 'horn_r_01'].head_local)
        P = eval_coords(h); d = np.linalg.norm(P - base, axis=1); tips[h.name] = np.argsort(-d)[:40]
    claw_rest = {}
    for c in claws:
        P = eval_coords(c); e = np.array([ed.vertices[:] for ed in c.data.edges]); claw_rest[c.name] = (e, np.linalg.norm(P[e[:, 0]] - P[e[:, 1]], axis=1))
    rest_toes = {leg: np.array(poser.legs[leg]['P0']) for leg in LEGS}
    out = {}
    for name, clip in clips.items():
        rig.animation_data.action = bpy.data.actions[name]
        n = frames_of(clip); specs = specs_all[name]
        rows = []; prev_toes = None
        for f in range(n + 1):
            sc.frame_set(f); bpy.context.view_layer.update()
            s = specs[f]
            rec = dict(frame=f, ms=round(f * 1000 / FPS, 2))
            B = eval_coords(body); H = {h.name: eval_coords(h) for h in horns}
            allz = [B[:, 2].min()] + [eval_coords(o)[:, 2].min() for o in others if o is not body]
            rec['min_z_mm'] = 1000 * float(min(allz))
            toes = {leg: np.array(rig.pose.bones[f'leg_{leg}_03'].tail) for leg in LEGS}
            rec['plant'] = {leg: round(s['legs'].get(leg, {}).get('plant', 1.0), 3) for leg in LEGS}
            rec['toe_z_mm'] = {leg: 1000 * float(toes[leg][2]) for leg in LEGS}
            root = s.get('_root', 0.0)
            if prev_toes is not None:
                rec['planted_slide_mm'] = {leg: 1000 * float(np.linalg.norm((toes[leg] + [0, -root, 0]) - (prev_toes[0][leg] + [0, -prev_toes[1], 0])))
                                           for leg in LEGS if rec['plant'][leg] >= 0.999 and prev_toes[2][leg] >= 0.999}
            prev_toes = (toes, root, rec['plant'])
            # horn tips to the body (not head)
            tipd = []
            for h in horns:
                T = H[h.name][tips[h.name]]
                Bn = B[notHead]
                dd = np.sqrt(((Bn[None, :, :] - T[::4, None, :]) ** 2).sum(-1)).min()
                tipd.append(dd)
            rec['horn_tip_to_body_mm'] = 1000 * float(min(tipd))
            # lead vertex along the body's forward axis and along the dive direction
            if name != 'idle':
                p = math.radians(s['body'][2])
                fwd = np.array([0.0, -math.cos(p), math.sin(p)])
                hornmax = max(float((H[h.name] @ fwd).max()) for h in horns)
                othermax = max([float((B @ fwd).max())] + [float((eval_coords(o) @ fwd).max()) for o in others if o is not body])
                rec['horn_lead_margin_mm'] = 1000 * (hornmax - othermax)
            # dive straightness: angle between the back line (pelvis to withers) and the neck line (withers to skull base)
            pbn = rig.pose.bones
            back = pbn['spine_05'].tail - pbn['spine_01'].head; neck = pbn['head_01'].head - pbn['spine_05'].tail
            rec['back_neck_angle_deg'] = math.degrees(back.angle(neck))
            # B-378v: tail and plume clearance to the body and legs, plume direction, tail bone directions
            Tp = B[tail_idx]
            if standin is not None: Tp = np.vstack([Tp, eval_coords(standin)[::2]])
            Fp = B[far_idx]; lo_, hi_ = Tp.min(0) - 0.08, Tp.max(0) + 0.08
            Fp = Fp[np.all((Fp > lo_) & (Fp < hi_), axis=1)]
            dmin = 1e9
            for c0 in range(0, len(Tp), 400):
                if len(Fp): dmin = min(dmin, float(np.sqrt(((Tp[c0:c0 + 400, None, :] - Fp[None, :, :]) ** 2).sum(-1)).min()))
            rec['tail_clearance_mm'] = 1000 * dmin
            tn = [b.name for b in rig.data.bones if b.name.startswith('tail_')]
            rec['tail_dirs'] = [list((pbn[n].tail - pbn[n].head).normalized()) for n in tn]
            if 'tail_09' in pbn:
                v = pbn['tail_09'].tail - pbn['tail_07'].head; v9 = pbn['tail_09'].tail - pbn['tail_09'].head
                rec['plume_elev_deg'] = math.degrees(math.atan2(v.z, v.y))      # 0 straight back, 90 straight up, >90 leaning forward
                rec['plume_tip_elev_deg'] = math.degrees(math.atan2(v9.z, v9.y))
            v6 = pbn['tail_06'].tail - pbn['tail_01'].head
            rec['tail_elev_deg'] = math.degrees(math.atan2(v6.z, v6.y))
            # correctives
            kb = body.data.shape_keys.key_blocks if body.data.shape_keys else []   # B-sntv: the re-skin may carry no keys
            rec['correctives'] = {k.name: round(float(k.value), 4) for k in list(kb)[1:]}
            # claws rigid
            cm = 0.0
            for c in claws:
                P = eval_coords(c); e, L0 = claw_rest[c.name]
                cm = max(cm, float(np.abs(np.linalg.norm(P[e[:, 0]] - P[e[:, 1]], axis=1) - L0).max()))
            rec['claw_edge_change_um'] = 1e6 * cm
            # bounds in place
            allP = np.vstack([B] + list(H.values()) + ([eval_coords(standin)] if standin is not None else []))   # B-378v: plume stand-in framed too
            rec['bounds'] = [allP.min(0).tolist(), allP.max(0).tolist()]
            rows.append(rec)
            print('MEASURE', name, f, flush=True)
        out[name] = rows
    # hit geometry: horn contact point (the horn vertex leading along the dive direction)
    clip = clips['sig.horns-first-descent']; hf = round(clip['times']['hit'] * FPS / 1000)
    rig.animation_data.action = bpy.data.actions['sig.horns-first-descent']; sc.frame_set(hf); bpy.context.view_layer.update()
    s = specs_all['sig.horns-first-descent'][hf]; p = math.radians(s['body'][2])
    dvec = np.array([0.0, -math.cos(p), math.sin(p)])
    best = None
    for h in horns:
        P = eval_coords(h); i = int(np.argmax(P @ dvec))
        if best is None or P[i] @ dvec > best[1] @ dvec: best = (h.name, P[i])
    tipsat = {h.name: eval_coords(h)[tips[h.name][0]].tolist() for h in horns}
    hobj = bpy.data.objects[best[0]]; Ph = eval_coords(hobj); vi = int(np.argmin(np.linalg.norm(Ph - best[1], axis=1)))
    hold = clip['params'].get('hold_ms', 0); drift = []
    for f in range(hf, hf + int(round(hold * FPS / 1000)) + 1):
        sc.frame_set(f); bpy.context.view_layer.update()
        drift.append(1000 * float(np.linalg.norm(eval_coords(hobj)[vi] - best[1])))
    sc.frame_set(hf); bpy.context.view_layer.update()
    out['hit'] = dict(frame=hf, contact_inplace=best[1].tolist(), contact_horn=best[0], reach_m=float(-best[1][1]), contact_height_m=float(best[1][2]),
                      dive_dir=dvec.tolist(), horn_tips_inplace=tipsat, hold_contact_drift_mm=drift, root_at_hit_m=clip['travel']['distanceM'])
    return out


def recover_frame(rig, clip_name, start_frame, n):
    """First frame after start where every deform joint is within 5 degrees of rest and the pelvis within 15 mm."""
    sc = bpy.context.scene; rig.animation_data.action = bpy.data.actions[clip_name]
    rest = {b.name: b.matrix_local for b in rig.data.bones}
    for f in range(start_frame, n + 1):
        sc.frame_set(f)
        worst = 0.0
        for p in rig.pose.bones:
            if not p.bone.use_deform or p.name.startswith('tail'): continue
            q = (rest[p.name].to_3x3().inverted() @ p.matrix.to_3x3()).to_quaternion()
            worst = max(worst, math.degrees(q.angle))
        d = (rig.pose.bones['spine_01'].head - rest['spine_01'].translation).length
        if worst < 5.0 and d < 0.015:
            return f, worst, d
    return n, worst, d


def hit_contact(rig, poser, clip):
    """Pose the hit frame and return the leading horn point along the dive direction (in place)."""
    set_deform_mods(True)
    hf = round(clip['times']['hit'] * FPS / 1000); s = clip['fn'](hf * 1000.0 / FPS)
    rig.animation_data.action = None; poser.pin_local = None; poser.apply(s)
    p = math.radians(s['body'][2]); dvec = np.array([0.0, -math.cos(p), math.sin(p)])
    pts = np.vstack([eval_coords(bpy.data.objects[h]) for h in ('horn_l', 'horn_r')])
    set_deform_mods(False)
    c = pts[int(np.argmax(pts @ dvec))]
    poser.pin_target = Vector(c.tolist()); poser.pin_local = rig.pose.bones['head_01'].matrix.inverted() @ poser.pin_target
    return c


def do_bake():
    params = load_params(); clips = build_clips(params)
    rig = open_rig(); poser = Poser(rig)
    # solve the hit body height so the leading horn surface meets the target at hit_contact_height_m
    sp = params.setdefault('sig.horns-first-descent', {}); solve = []
    for it in range(3):
        P = clips['sig.horns-first-descent']['params']
        c = hit_contact(rig, poser, clips['sig.horns-first-descent'])
        err = P['hit_contact_height_m'] - float(c[2]); solve.append(dict(center=P['hit_center_height_m'], contact_z=float(c[2])))
        if abs(err) < 0.002: break
        sp['hit_center_height_m'] = P['hit_center_height_m'] + err; clips = build_clips(params)
    set_deform_mods(False)
    specs_all = {}; info = {}
    for name, clip in clips.items():
        t0 = time.time(); act, specs, store = bake(rig, poser, name, clip); specs_all[name] = specs
        # bake check: evaluated action reproduces the posed values
        n = frames_of(clip); err = 0.0
        rig.animation_data.action = act
        for f in range(0, n + 1, 3):
            bpy.context.scene.frame_set(f)
            for nm, (loc, q, scl) in store[f].items():
                pq = rig.pose.bones[nm].rotation_quaternion
                err = max(err, abs(Quaternion(q).rotation_difference(pq).angle))
        info[name] = dict(frames=n, bake_seconds=time.time() - t0, max_key_rotation_error_rad=err)
    set_deform_mods(True)
    m = measure(rig, poser, clips, specs_all)
    sig = clips['sig.horns-first-descent']; hl = round(sig['times']['hind_land'] * FPS / 1000)
    rf, worst, d = recover_frame(rig, 'sig.horns-first-descent', hl, frames_of(sig))
    m['recover'] = dict(frame=rf, ms=rf * 1000 / FPS, worst_joint_deg=worst, pelvis_mm=1000 * d)
    # idle seam: pose jump across the seam vs the largest jump inside the loop
    rig.animation_data.action = bpy.data.actions['idle']; n = frames_of(clips['idle']); mats = []
    for f in range(n + 1):
        bpy.context.scene.frame_set(f); mats.append(pose_matrices(rig))
    jumps = [max(float(np.abs(mats[f + 1][k] - mats[f][k]).max()) for k in mats[0]) for f in range(n)]
    seam = max(float(np.abs(mats[1][k] - mats[0][k]).max()) for k in mats[0])
    m['idle_seam'] = dict(first_equals_last=max(float(np.abs(mats[n][k] - mats[0][k]).max()) for k in mats[0]),
                          step_after_seam=seam, step_before_seam=jumps[-1], max_step=max(jumps), mean_step=float(np.mean(jumps)))
    rig.animation_data.action = None; poser.reset()
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK / 'clips.blend'))
    clean = {k: [{kk: vv for kk, vv in s.items() if kk != 'legs'} | {'legs': s.get('legs')} for s in v] for k, v in specs_all.items()}
    jdump(WORK / 'bake.json', dict(info=info, hit_solve=solve, specs=clean, travel=sig['travel'], times=sig['times'], events=sig['events'],
                                   params={k: c['params'] for k, c in clips.items()}))
    jdump(WORK / 'measure.json', m)
    print('BAKE done', info, flush=True)


# -- rendering ------------------------------------------------------------------------------------------------

CAMS = {'side': (270.0, 0.0), 'threeq': (315.0, 12.0), 'sidetrack': (270.0, 0.0), 'sidecell': (270.0, 0.0)}
# sidetrack: follows the body (2.6 m frame, ground kept in view when the body is low; review). sidecell: follows the body in both axes
# with a creature-sized window (the 192 px game cell, in place).


def setup_render(engine, samples):
    lookdev.setup_scene(engine)
    sc = bpy.context.scene
    if engine == 'CYCLES':
        sc.cycles.samples = samples; sc.cycles.use_denoising = True
        try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
        except Exception: pass
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            if o.get('body_kind') == 'sculpt': lookdev.apply_clay(o); o.hide_render = False
            elif o.get('body_kind') == 'game': o.hide_render = True
            elif o.get('body_kind') == 'plume_standin':   # B-378v: review-only plume stand-in, lighter clay so it reads against the body and the dark ground
                o.data.materials.clear(); o.data.materials.append(lookdev._material('lookdev_plume_standin', (0.82, 0.80, 0.74), 0.8)); o.hide_render = False
    sc.render.fps = FPS
    return sc


def add_target(contact, dive):
    """Opponent stand-in: a plain post whose top front edge is the hit point (review only)."""
    h = max(0.05, contact[2]); w = 0.14
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    o = bpy.context.active_object; o.name = 'lookdev_target'
    o.scale = (0.22, w, h); o.location = (0.0, contact[1] - w / 2, h / 2)
    o.data.materials.append(lookdev._material('lookdev_target_mat', (0.30, 0.30, 0.30), 0.9))
    return o


def render(clip_name, cam_name, size, mode='travel', step=1, engine='CYCLES', samples=16, aspect=1.5, only=None):
    bpy.ops.wm.open_mainfile(filepath=str(WORK / 'clips.blend'))
    bake_info = json.loads((WORK / 'bake.json').read_text()); meas = json.loads((WORK / 'measure.json').read_text())
    rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0
    rig.animation_data_create(); rig.animation_data.action = bpy.data.actions[clip_name]
    sc = setup_render(engine, samples)
    specs = bake_info['specs'][clip_name]; rows = meas[clip_name]
    travel = mode == 'travel' and clip_name != 'idle'
    roots = [s.get('_root', 0.0) for s in specs]
    lo = np.array([1e9] * 3); hi = -lo
    for r, s in zip(rows, specs):
        b0 = np.array(r['bounds'][0]); b1 = np.array(r['bounds'][1])
        if travel: b0[1] -= s.get('_root', 0.0); b1[1] -= s.get('_root', 0.0)
        lo = np.minimum(lo, b0); hi = np.maximum(hi, b1)
    lo[2] = 0.0
    if clip_name != 'idle' and mode == 'travel':
        c = meas['hit']['contact_inplace']; root_hit = meas['hit']['root_at_hit_m']
        add_target((c[0], c[1] - root_hit, c[2]), None)
    az, el = CAMS[cam_name]
    cam = lookdev.place_camera('lookdev_anim_' + cam_name, (Vector(lo), Vector(hi)), az, el, 0.05)
    # widen to the requested aspect without cropping
    sc.render.resolution_x = size; sc.render.resolution_y = int(round(size / aspect / 2) * 2)
    sc.render.resolution_percentage = 100; sc.camera = cam
    cam.data.sensor_fit = 'AUTO'
    inv = cam.matrix_world.inverted(); xs = []; ys = []
    for i in range(8):
        p = inv @ Vector((hi[0] if i & 1 else lo[0], hi[1] if i & 2 else lo[1], hi[2] if i & 4 else lo[2])); xs.append(p.x); ys.append(p.y)
    w = (max(xs) - min(xs)) * 1.1; h = (max(ys) - min(ys)) * 1.1
    cam.data.ortho_scale = max(w, h * aspect)
    cam.data.shift_x = ((max(xs) + min(xs)) / 2) / cam.data.ortho_scale
    cam.data.shift_y = ((max(ys) + min(ys)) / 2) / cam.data.ortho_scale
    out = OUT / 'frames' / f'{clip_name}_{cam_name}_{size}_{mode}'; out.mkdir(parents=True, exist_ok=True)
    track = cam_name in ('sidetrack', 'sidecell')
    if track:
        cam.data.shift_x = cam.data.shift_y = 0.0
        if cam_name == 'sidetrack':
            cam.data.ortho_scale = 2.6   # creature about half the frame width
            half_h = cam.data.ortho_scale / aspect / 2
        else:
            cam.data.ortho_scale = float(os.environ.get('ANIM_CELL_M', '1.5'))
    n = len(specs) - 1
    last = n - 1 if clip_name == 'idle' else n   # the loop's last frame equals its first
    fr = only if only is not None else range(0, last + 1, step)
    for f in fr:
        sc.frame_set(f)
        rig.location = (0, -roots[f] if travel else 0.0, 0)
        if track:
            wf, wz = specs[f].get('_world_body', (specs[f]['body'][0], specs[f]['body'][1]))
            bf = wf if travel else specs[f]['body'][0]
            yc = C0.y - bf - 0.06          # body center, nudged toward the head
            z = max(half_h - 0.06, C0.z + wz + 0.1) if cam_name == 'sidetrack' else C0.z + wz + 0.02   # sidetrack keeps the ground in view when low
            cam.location = (cam.location.x, yc, z)
        bpy.context.view_layer.update()
        sc.render.filepath = str(out / f'{f:04d}.png')
        bpy.ops.render.render(write_still=True)
        print('RENDER', clip_name, cam_name, f, flush=True)
    jdump(out / 'camera.json', dict(az=az, el=el, ortho_scale=cam.data.ortho_scale, bounds=[lo.tolist(), hi.tolist()], frames=list(fr), mode=mode))


def do_encode():
    sc = bpy.context.scene
    for d in sorted((OUT / 'frames').iterdir()):
        if not d.is_dir() or not d.name.endswith('_960_travel') and not d.name.endswith('_960_inplace'): continue
        files = sorted(d.glob('*.png'))
        if not files: continue
        bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
        sc.sequence_editor_create(); se = sc.sequence_editor
        coll = se.strips if hasattr(se, 'strips') else se.sequences
        loops = 1  # one pass; the review page loops the video
        start = 1
        for k in range(loops):
            st = coll.new_image(name=f'f{k}', filepath=str(files[0]), channel=1 + (k % 2), frame_start=start)
            for fl in files[1:]: st.elements.append(fl.name)
            start += len(files)
        import struct
        with open(files[0], 'rb') as fh: hdr = fh.read(24)
        wpx, hpx = struct.unpack('>II', hdr[16:24])
        sc.render.resolution_x = wpx; sc.render.resolution_y = hpx; sc.render.resolution_percentage = 100
        sc.frame_start = 1; sc.frame_end = start - 1; sc.render.fps = FPS
        if hasattr(sc.render.image_settings, 'media_type'): sc.render.image_settings.media_type = 'VIDEO'  # Blender 5
        sc.render.image_settings.file_format = 'FFMPEG'
        sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'
        sc.render.ffmpeg.constant_rate_factor = 'HIGH'; sc.render.ffmpeg.ffmpeg_preset = 'GOOD'
        sc.render.ffmpeg.gopsize = 15
        sc.view_settings.view_transform = 'Standard'
        name = d.name.replace('_960_travel', '').replace('_960_inplace', '')
        dst = OUT / 'video' / f'{name}.mp4'; dst.parent.mkdir(exist_ok=True)
        sc.render.filepath = str(dst)
        sc.render.use_file_extension = False
        bpy.ops.render.render(animation=True)
        print('ENCODED', dst, flush=True)


if __name__ == '__main__':
    if MODE == 'bake':
        do_bake()
    elif MODE == 'render':
        clip, cam, size = ARGS[2], ARGS[3], int(ARGS[4])
        mode = ARGS[5] if len(ARGS) > 5 else 'travel'; step = int(ARGS[6]) if len(ARGS) > 6 else 1
        engine = os.environ.get('ANIM_ENGINE', 'CYCLES'); samples = int(os.environ.get('ANIM_SAMPLES', '16'))
        only = [int(x) for x in os.environ['ANIM_FRAMES'].split(',')] if os.environ.get('ANIM_FRAMES') else None
        render(clip, cam, size, mode, step, engine, samples, aspect=float(os.environ.get('ANIM_ASPECT', '1.5')), only=only)
    elif MODE == 'encode':
        do_encode()
