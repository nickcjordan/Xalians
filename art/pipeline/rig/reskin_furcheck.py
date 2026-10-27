"""Luceras B-sntv pass 8b: fur product check of the fold contacts (Cycles strand fur, sprite camera).

Scene build follows luceras-furmotion/pass2/work/furmotion.py (append the groom curves, lights, ground and world from
the groom into the clips file, body attributes and materials copied by index, curves parented to the rig). The groom is
luceras-groom/pass12/groom.blend; its own plume spine proxy is kept (rebound to the clip rig) because the pass 12 plume
strands are bound to it by triangle index.

Usage: blender -b --factory-startup --python furcheck.py -- GROOM ANIMDIR OUTDIR LABEL [probe]
  ANIMDIR holds work/clips.blend, work/bake.json (specs for the sprite camera framing)
Renders, for crouch_deep (review.poses, in place) and sig frames 12 14 16 18 20 22 29:
  side cell camera (pose_rig 'sidecell': az 270, 1.5 m ortho following the body, 960x640): fur and clay
  low three-quarter front (az 315, el -12, fitted to the body) for crouch_deep and f16: fur and clay
"""
import bpy, sys, json, os, math
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix

A = sys.argv[sys.argv.index('--') + 1:]
GROOM, ANIM, OUT, LABEL = A[0], Path(A[1]), Path(A[2]), A[3]
PROBE = len(A) > 4 and A[4] == 'probe'
sys.path.insert(0, '/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/roster')
import lookdev  # noqa: E402
POSE_ORDER = 'rest,crouch,leap,landing,head_left_up,tail_side_up,foreleg_step,breath_in,crouch_deep,landing_old'.split(',')
C0 = Vector((0.0, 0.12, 0.48))
# pass 9: FC_POSES = comma list of review pose names and sig frames ('review:crouch_deep', 'sig:16');
# FC_VIEWS = default views for every pose (side, threeq, low34_front_left, back, front); FC_EXTRA = 'tag=view+view;...'
_def = 'review:crouch_deep,sig:12,sig:14,sig:16,sig:18,sig:20,sig:22,sig:29'
FRAMES = [(x.split(':')[0], x.split(':')[1]) for x in os.environ.get('FC_POSES', _def).split(',')]
FRAMES = [(k, v if k == 'review' else int(v)) for k, v in FRAMES]
VIEWS = os.environ.get('FC_VIEWS', 'side').split(',')
EXTRA = {}
for item in filter(None, os.environ.get('FC_EXTRA', 'crouch_deep=threeq;sig_f16=threeq').split(';')):
    t, v = item.split('='); EXTRA[t] = v.split('+')
OBLIQUE = {'threeq': (315.0, -12.0, 'chest'), 'low34_front_left': (45.0, -12.0, 'body'), 'low34_rear_left': (135.0, -12.0, 'body'),
           'back': (180.0, 0.0, 'body'), 'front': (0.0, 0.0, 'body'), 'head': (35.0, 4.0, 'head'), 'head_front': (0.0, 4.0, 'head'), 'head_side': (270.0, 4.0, 'head'), 'face': (35.0, 4.0, 'face'), 'face_front': (0.0, 4.0, 'face'), 'face_side': (270.0, 4.0, 'face'), 'q_front': (305.0, 8.0, 'body'), 'q_back': (235.0, 8.0, 'body')}


def arr(items, key, n=3, dt=np.float32):
    a = np.empty(len(items) * n, dt); items.foreach_get(key, a)
    return a.reshape(-1, n) if n > 1 else a


bpy.ops.wm.open_mainfile(filepath=str(ANIM / 'work' / 'clips.blend'))
s = bpy.context.scene
body = bpy.data.objects['luceras_blockout']; rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0
old_proxy = bpy.data.objects.get('luceras_plume_spine')
for o in list(s.objects):
    if o.name in ('plume_standin',) or o.name.startswith(('game_', 'whiskers_', 'shot_', 'brisket_', 'bk_w_')): o.hide_render = True
def head_detail():
    """Head detail pass 1 (scene side): seat the eyes, build lids with a dark rim, attach a nose pad with nostrils and a
    split lip, and give the horn material wavy irregular ridges with bronze crest glints. Rig at rest when called."""
    log = {}; HP = json.loads(os.environ.get('FC_HEAD_PARAMS', '{}'))
    def g(k, d): return HP.get(k, d)
    pb = rig.pose.bones
    hh = np.array(rig.matrix_world @ pb['head_01'].head); ht = np.array(rig.matrix_world @ pb['head_01'].tail)
    def axis_foot(p):
        a_ = ht - hh; u_ = np.clip((p - hh) @ a_ / (a_ @ a_), 0, 1); return hh + u_ * a_
    def mat(name, rgb, rough, metal=0.0):
        m_ = bpy.data.materials.get(name) or bpy.data.materials.new(name); m_.use_nodes = True
        b_ = m_.node_tree.nodes.get('Principled BSDF'); b_.inputs['Base Color'].default_value = list(rgb) + [1.0]
        b_.inputs['Roughness'].default_value = rough; b_.inputs['Metallic'].default_value = metal; return m_
    def add_obj(name, verts, faces, m_):
        me_ = bpy.data.meshes.new(name); me_.from_pydata([[float(x) for x in v] for v in verts], [], faces); me_.update()
        for p_ in me_.polygons: p_.use_smooth = True
        o_ = bpy.data.objects.new(name, me_); s.collection.objects.link(o_); me_.materials.append(m_)
        o_.parent = rig; o_.parent_type = 'BONE'; o_.parent_bone = 'head_01'; bpy.context.view_layer.update()
        o_.matrix_world = Matrix.Identity(4); return o_
    def ellipsoid(c, ax3, radii, nu=24, nv=12, keep=None):
        V_, F_, idx = [], [], {}
        for i in range(nv + 1):
            th = math.pi * i / nv
            for j in range(nu):
                ph = 2 * math.pi * j / nu
                l_ = np.array([math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)])
                idx[(i, j)] = len(V_); V_.append(c + ax3 @ (l_ * radii))
        for i in range(nv):
            for j in range(nu):
                q = [idx[(i, j)], idx[(i, (j + 1) % nu)], idx[(i + 1, (j + 1) % nu)], idx[(i + 1, j)]]
                if keep is None or all(keep(V_[k]) for k in q): F_.append(q)
        return V_, F_
    def tube(path, rad_a, rad_b, side_a, side_b, closed, nseg=8):
        """Elliptic tube along a polyline: semi-axis rad_a along side_a[i], rad_b along side_b[i]."""
        Vt, Ft = [], []; n_ = len(path)
        for i in range(n_):
            for j in range(nseg):
                ps = 2 * math.pi * j / nseg; Vt.append(path[i] + side_a[i] * math.cos(ps) * rad_a + side_b[i] * math.sin(ps) * rad_b)
        for i in range(n_ if closed else n_ - 1):
            for j in range(nseg):
                i2 = (i + 1) % n_; Ft.append([i * nseg + j, i * nseg + (j + 1) % nseg, i2 * nseg + (j + 1) % nseg, i2 * nseg + j])
        if not closed:
            Ft.append(list(range(nseg))[::-1]); Ft.append([(n_ - 1) * nseg + j for j in range(nseg)])
        return Vt, Ft
    # ---- appeal study (creature-appeal.md floor): local head edits before the eyes are seated and the lids built.
    # Topology and every groom binding are unchanged; strands follow the moved skin through their triangle frames.
    APLOG = {}
    def appeal_scale():
        """Appeal face 1: uniform head scale about the head joint (eased over the neck_02 span, horns keep their size and
        ride on the skull), then a length-biased ear scale about each ear root. Vertex moves only; every shape key moves by
        the same delta; strands follow their triangles."""
        hs = g('ap_head_scale', 1.0); es_l, es_w = g('ap_ear_len', 1.0), g('ap_ear_wid', 1.0)
        if hs == 1.0 and es_l == 1.0 and es_w == 1.0: return
        me_ = body.data; Mw = np.array(body.matrix_world); Mi = np.linalg.inv(Mw); Rw_ = np.array(rig.matrix_world)
        BV0 = np.array([v.co[:] for v in me_.vertices]); BV = BV0 @ Mw[:3, :3].T + Mw[:3, 3]; NV = len(BV)
        gi_ = {x.name: x.index for x in body.vertex_groups}; W_ = {}
        for nme in ('head_01', 'jaw_01', 'ear_l_01', 'ear_l_02', 'ear_r_01', 'ear_r_02', 'neck_02'):
            W_[nme] = np.zeros(NV)
        for v in me_.vertices:
            for gg in v.groups:
                nm_ = body.vertex_groups[gg.group].name
                if nm_ in W_: W_[nm_][v.index] = gg.weight
        def bw(nme, end='head_local'): return (Rw_ @ np.r_[getattr(rig.data.bones[nme], end), 1])[:3]
        J = bw('head_01'); N0 = bw('neck_02')
        def sst(e0, e1, x): t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
        ax_ = J - N0; u = ((BV - N0) @ ax_) / (ax_ @ ax_)
        whead = np.clip(W_['head_01'] + W_['jaw_01'] + W_['ear_l_01'] + W_['ear_l_02'] + W_['ear_r_01'] + W_['ear_r_02'], 0, 1)
        # the neck eases in along neck_02 (0 at its root, 1 at the head joint); the head itself is fully scaled
        wn = sst(0.0, 1.0, u) * np.clip(W_['neck_02'] + whead, 0, 1)
        w = np.maximum(whead, wn) * (u > -0.05)
        NB = J + (BV - J) * (1 + (hs - 1) * w)[:, None]
        # the skin round each horn base moves rigidly with the horn (the horn is not scaled, so its socket must not grow)
        for hn in (() if g('ap_horn_with_head', 0) else ('horn_l', 'horn_r')):
            ho = bpy.data.objects.get(hn)
            if ho is None: continue
            Mo = np.array(ho.matrix_world); HP_ = np.array([v.co[:] for v in ho.data.vertices]) @ Mo[:3, :3].T + Mo[:3, 3]
            base = HP_[np.argmin(np.linalg.norm(HP_ - J, axis=1))]
            near = HP_[np.linalg.norm(HP_ - base, axis=1) < g('ap_horn_base_r', 0.035)]; bc = near.mean(0); br = float(np.linalg.norm(near - bc, axis=1).max())
            t_ = (base - J) * (hs - 1); dv = np.linalg.norm(BV - bc, axis=1)
            wh = (1 - sst(br * 1.05, br * g('ap_horn_soft', 1.8), dv)) * (w > 0)
            NB = NB * (1 - wh[:, None]) + (BV + t_) * wh[:, None]
            APLOG.setdefault('horn_base_rigid_vertices', {})[hn] = int((wh > 0.5).sum())
        # eyes and corneas scale with the head; horns ride on the skull without scaling (translated by their base's move)
        for on in ('eye_l', 'eye_r', 'surface_cornea_eye_l', 'surface_cornea_eye_r', 'horn_l', 'horn_r'):
            ob = bpy.data.objects.get(on)
            if ob is None: continue
            Mo = np.array(ob.matrix_world); P_ = np.array([v.co[:] for v in ob.data.vertices]) @ Mo[:3, :3].T + Mo[:3, 3]
            if on.startswith('horn'):
                if g('ap_horn_with_head', 0): P_ = J + (P_ - J) * hs; hs_t = 1.0
                base = P_[np.argmin(np.linalg.norm(P_ - J, axis=1))]
                hsc = g('ap_horn_scale', 1.0); sw = math.radians(g('ap_horn_sweep_deg', 0.0))
                if hsc != 1.0 or sw:
                    # the root ring keeps its size and angle (it fits the skin socket); scale and sweep grow along the horn
                    # the root ring is where the horn meets the skin: scale and sweep pivot on its centre and grow from
                    # one ring radius out, so the ring keeps fitting its socket; buried vertices never move
                    if 'SKBVH' not in APLOG:
                        from mathutils.bvhtree import BVHTree as _B
                        APLOG['SKBVH'] = _B.FromPolygons([Vector(v) for v in NB.tolist()], [list(pp.vertices) for pp in me_.polygons])
                    bt_ = APLOG['SKBVH']; dep = np.zeros(len(P_))
                    for k_, pp in enumerate(P_):
                        loc, nrm_, _, _ = bt_.find_nearest(Vector(pp.tolist()))
                        if loc is not None: dep[k_] = (pp - np.array(loc[:])) @ np.array(nrm_[:])
                    ring = P_[np.abs(dep) < g('ap_horn_ring_m', 0.003)]
                    if len(ring) > 8: base = ring.mean(0)
                    r0 = float(np.linalg.norm(ring - base, axis=1).max()) if len(ring) > 8 else 0.02
                    dd_ = np.linalg.norm(P_ - base, axis=1); tt = sst(r0 * g('ap_horn_ring_from', 1.1), r0 * g('ap_horn_ring_to', 2.5), dd_) * sst(-0.002, 0.004, dep)
                    APLOG.setdefault('horn_ring', {})[on] = dict(ring_vertices=int(len(ring)), ring_radius_mm=round(r0 * 1000, 1))
                    sc_v = 1 + (hsc - 1) * tt; ang = sw * tt
                    q_ = (P_ - base) * sc_v[:, None]; cs_, sn_ = np.cos(ang), np.sin(ang)
                    # sweep back: rotate about the left-right (X) axis; the creature faces -Y, so tips go toward +Y
                    q_ = np.stack([q_[:, 0], q_[:, 1] * cs_ + q_[:, 2] * sn_, -q_[:, 1] * sn_ + q_[:, 2] * cs_], 1); P_ = base + q_
                if not g('ap_horn_with_head', 0): P_ = P_ + (base - J) * (hs - 1)
            else:
                P_ = J + (P_ - J) * hs
            Pl = (P_ - Mo[:3, 3]) @ np.linalg.inv(Mo[:3, :3]).T
            for v, x in zip(ob.data.vertices, Pl): v.co = x.tolist()
        # ears: about the (scaled) root, es_l along the ear, es_w across, weighted by the ear groups
        for side in ('l', 'r'):
            R0 = J + (bw(f'ear_{side}_01') - J) * hs; T0 = J + (bw(f'ear_{side}_02', 'tail_local') - J) * hs
            A_ = (T0 - R0) / np.linalg.norm(T0 - R0); we = np.clip(W_[f'ear_{side}_01'] + W_[f'ear_{side}_02'], 0, 1)
            q = NB - R0; qa = np.outer(q @ A_, A_); qp = q - qa
            tl_ = np.clip((q @ A_) / max(np.linalg.norm(T0 - R0), 1e-9), 0, 1.2); tip_ = g('ap_ear_tip_w', 1.0)
            taper = 1 - (1 - tip_) * sst(0.45, 1.0, tl_)
            NB = np.where((we > 0)[:, None], R0 + qa * (1 + (es_l - 1) * we)[:, None] + qp * ((1 + (es_w - 1) * we) * (1 - (1 - taper) * we))[:, None], NB)
        for side in ('l', 'r'):
            for bi, gk in (('02', 'ap_fore_girth_02'), ('03', 'ap_fore_girth_03')):
                gf = g(gk, 1.0)
                if gf == 1.0: continue
                bn = f'leg_f{side}_{bi}'; gidx = body.vertex_groups.get(bn)
                if gidx is None: continue
                wv = np.zeros(NV)
                for v in me_.vertices:
                    for gg in v.groups:
                        if gg.group == gidx.index: wv[v.index] = gg.weight
                h_ = bw(bn); t_ = bw(bn, 'tail_local'); ax2 = t_ - h_; uu = ((NB - h_) @ ax2) / (ax2 @ ax2)
                ease = sst(0.0, 0.25, uu) * (1 - sst(0.75, 1.0, uu)); wf = wv * ease
                foot = h_ + np.clip(uu, 0, 1)[:, None] * ax2; NB = foot + (NB - foot) * (1 + (gf - 1) * wf)[:, None]
                APLOG.setdefault('fore_girth', {})[bn] = dict(factor=gf, vertices=int((wf > 0.05).sum()))
        dl = (NB - BV) @ Mi[:3, :3].T
        if me_.shape_keys:
            for kb in me_.shape_keys.key_blocks:
                kc = np.array([d_.co[:] for d_ in kb.data]) + dl
                for d_, c_ in zip(kb.data, kc): d_.co = c_.tolist()
        for v_, c_ in zip(me_.vertices, BV0 + dl): v_.co = c_.tolist()
        me_.update(); bpy.context.view_layer.update()
        APLOG['scale'] = dict(head=hs, ear_len=es_l, ear_wid=es_w, head_vertices=int((w > 0.99).sum()), neck_blend_vertices=int(((w > 0.01) & (w < 0.99)).sum()))

    def appeal_face_fur(NB, newc, dom):
        """Brow fur (existing strands above each eye: longer, tilted up and out, a little darker), pale inner ears (skin and
        strands), and the soft light ring weighted below and behind the eye."""
        co_ = next((o for o in objs if o.type == 'CURVES' and o.name.startswith('Luceras interpolated')), None)
        if co_ is None: return
        d_ = co_.data; ids_ = np.stack([arr(d_.attributes['bind_i' + c].data, 'value', 1, np.int32) for c in 'abc'], 1)
        bar_ = np.stack([arr(d_.attributes['bind_' + c].data, 'value', 1) for c in 'abc'], 1)
        rp = (NB[ids_] * bar_[:, :, None]).sum(1); col = arr(d_.attributes['coat_color'].data, 'color', 4)
        offs = arr(d_.curves, 'first_point_index', 1, np.int32); cnt = arr(d_.curves, 'points_length', 1, np.int32)
        def sst(e0, e1, x): t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
        bl = g('ap_brow_len', 1.0)
        if bl != 1.0 and newc:
            H_ = arr(d_.attributes['bind_height'].data, 'value', 1); X_ = arr(d_.attributes['bind_offset_x'].data, 'value', 1); Y_ = arr(d_.attributes['bind_offset_y'].data, 'value', 1)
            sel = np.zeros(len(rp), bool)
            for side, (c2, r2, th, piv) in newc.items():
                q = rp - c2; top = r2 * g('ap_brow_top_frac', 0.75)
                m_ = (q[:, 2] > top + g('ap_brow_from_m', 0.004)) & (q[:, 2] < top + g('ap_brow_to_m', 0.014)) & (np.linalg.norm(q[:, :2], axis=1) < r2 * 1.3)
                sel |= m_
            si = np.where(sel)[0]
            if len(si):
                tri = NB[ids_[si]]; e_ = tri[:, 1] - tri[:, 0]; f_ = tri[:, 2] - tri[:, 0]
                nrm = np.cross(e_, f_); nrm /= np.linalg.norm(nrm, axis=1, keepdims=True); tan = e_ / np.linalg.norm(e_, axis=1, keepdims=True); bit = np.cross(nrm, tan)
                upo = np.array([0.0, 0.0, 1.0])[None, :] + np.c_[np.sign(rp[si, 0]) * 0.4, np.zeros(len(si)), np.zeros(len(si))]
                tl = math.tan(math.radians(g('ap_brow_tilt_deg', 20.0)))
                for k, ci in enumerate(si):
                    a0, n_ = offs[ci], cnt[ci]; sl = slice(a0, a0 + n_)
                    P = np.c_[H_[sl], X_[sl], Y_[sl]] * bl                                  # frame-local, longer
                    L_ = np.linalg.norm(P[-1]); s_ = np.linspace(0, 1, n_)
                    du = np.array([upo[k] @ nrm[k], upo[k] @ tan[k], upo[k] @ bit[k]]); du /= max(np.linalg.norm(du), 1e-9)
                    P = P + np.outer(s_, du) * L_ * tl
                    H_[sl], X_[sl], Y_[sl] = P[:, 0], P[:, 1], P[:, 2]
                for nme, v in (('bind_height', H_), ('bind_offset_x', X_), ('bind_offset_y', Y_)): d_.attributes[nme].data.foreach_set('value', v.astype(np.float32))
                col[si, :3] *= g('ap_brow_dark', 0.9)
            APLOG['brow_strands'] = int(len(si))
        esk = g('ap_eye_skin', 0.0)
        if esk and newc:
            sa_ = gbody.data.attributes.get('coat_color')
            if sa_ is not None and sa_.domain == 'POINT':
                sc_ = arr(sa_.data, 'color', 4); tg_ = np.array(g('ap_eye_skin_rgb', g('ap_ring_rgb', [0.3, 0.3, 0.3])), np.float32); wmax = np.zeros(len(NB))
                for side, (c2, r2, th, piv) in newc.items():
                    dd = np.linalg.norm(NB - c2, axis=1); wmax = np.maximum(wmax, 1 - sst(r2 * g('ap_eye_skin_in', 1.3), r2 * g('ap_eye_skin_out', 2.0), dd))
                wmax *= esk; sc_[:, :3] = sc_[:, :3] * (1 - wmax[:, None]) + tg_[None, :] * wmax[:, None]
                sa_.data.foreach_set('color', sc_.astype(np.float32).ravel()); APLOG['eye_skin_vertices'] = int((wmax > 0.05).sum())
        # pale inner ears: strands and skin on the ear's forward-facing (inner) side
        ep = g('ap_ear_pale', 0.0)
        if ep:
            me_ = body.data; Mw = np.array(body.matrix_world)
            N_ = np.array([v.normal[:] for v in me_.vertices]) @ Mw[:3, :3].T; N_ /= np.maximum(np.linalg.norm(N_, axis=1), 1e-9)[:, None]
            earv = np.char.startswith(dom.astype(str), 'ear_')
            inner = earv * sst(g('ap_ear_in_lo', 0.0), g('ap_ear_in_hi', 0.5), -N_[:, 1])  # faces forward (the creature faces -Y)
            APLOG['ear_inner_vertices'] = int((inner > 0.5).sum()); APLOG['ear_vertices'] = int(earv.sum())
            pale = np.array(g('ap_ear_rgb', [0.55, 0.52, 0.50]), np.float32)
            ws_ = (inner[ids_] * bar_).sum(1) * ep
            col[:, :3] = col[:, :3] * (1 - ws_[:, None]) + pale[None, :] * ws_[:, None]
            # the scene body takes its colour attributes from the groom body after this step, so edit the groom body's
            sa = gbody.data.attributes.get('coat_color')
            if sa is not None and sa.domain == 'POINT':
                sc_ = arr(sa.data, 'color', 4); wv_ = inner * ep; sc_[:, :3] = sc_[:, :3] * (1 - wv_[:, None]) + pale[None, :] * wv_[:, None]
                sa.data.foreach_set('color', sc_.astype(np.float32).ravel())
            sg = gbody.data.attributes.get('skin_gain')
            if sg is not None and sg.domain == 'POINT' and g('ap_ear_skin_gain', None) is not None:
                gv = arr(sg.data, 'value', 1); APLOG['skin_gain_range'] = [round(float(gv.min()), 3), round(float(np.median(gv)), 3), round(float(gv.max()), 3)]
                gv = gv * (1 - inner * ep) + g('ap_ear_skin_gain', 1.0) * inner * ep; sg.data.foreach_set('value', gv.astype(np.float32))
            APLOG['ear_pale_strands'] = int((ws_ > 0.1).sum())
            etl = g('ap_ear_tuft_len', 1.0)
            if etl != 1.0:
                H_ = arr(d_.attributes['bind_height'].data, 'value', 1); X_ = arr(d_.attributes['bind_offset_x'].data, 'value', 1); Y_ = arr(d_.attributes['bind_offset_y'].data, 'value', 1)
                si = np.where(ws_ > 0.3 * ep)[0]
                for ci in si:
                    sl = slice(offs[ci], offs[ci] + cnt[ci]); H_[sl] *= etl; X_[sl] *= etl; Y_[sl] *= etl
                for nme, v in (('bind_height', H_), ('bind_offset_x', X_), ('bind_offset_y', Y_)): d_.attributes[nme].data.foreach_set('value', v.astype(np.float32))
                APLOG['ear_tuft_strands'] = int(len(si))
        rfl = g('ap_ring_fur_len', 1.0)
        if rfl != 1.0 and newc:
            H_ = arr(d_.attributes['bind_height'].data, 'value', 1); X_ = arr(d_.attributes['bind_offset_x'].data, 'value', 1); Y_ = arr(d_.attributes['bind_offset_y'].data, 'value', 1)
            wr = np.zeros(len(rp))
            for side, (c2, r2, th, piv) in newc.items():
                dd = np.linalg.norm(rp - c2, axis=1) / r2; wr = np.maximum(wr, (1 - sst(1.6, 2.2, dd)) * (dd > 0.9))
            si = np.where(wr > 0.02)[0]
            for ci in si:
                f_ = 1 + (rfl - 1) * wr[ci]; sl = slice(offs[ci], offs[ci] + cnt[ci]); H_[sl] *= f_ * g('ap_ring_fur_lift', 0.7); X_[sl] *= f_; Y_[sl] *= f_
            for nme, v in (('bind_height', H_), ('bind_offset_x', X_), ('bind_offset_y', Y_)): d_.attributes[nme].data.foreach_set('value', v.astype(np.float32))
            APLOG['ring_fur_strands'] = int(len(si))
        for key, mult in (('ap_cheek_fur', 'cheek'), ('ap_ruff_fur', 'ruff')):
            fl = g(key, 1.0)
            if fl == 1.0 or not newc: continue
            ey = np.mean([v[0][1] for v in newc.values()]); ez = np.mean([v[0][2] for v in newc.values()]); ex = np.mean([abs(v[0][0]) for v in newc.values()])
            sd = dom[ids_[np.arange(len(ids_)), bar_.argmax(1)]]
            if mult == 'cheek':
                m_ = np.isin(sd, ['head_01', 'jaw_01']) & (np.abs(rp[:, 0]) > ex * 0.7) & (rp[:, 2] < ez - 0.005) & (rp[:, 1] > ey - 0.02)
            else:
                lum_ = col[:, :3] @ np.array([0.2126, 0.7152, 0.0722]); sds = sd.astype(str)
                m_ = ~np.isin(sd, ['head_01', 'ear_l_01', 'ear_l_02', 'ear_r_01', 'ear_r_02']) & ~np.char.startswith(sds, 'leg_') & ~np.char.startswith(sds, 'tail_')                      & (lum_ > 0.3) & (rp[:, 2] < ez - 0.03) & (rp[:, 2] > g('ap_ruff_zmin', 0.3)) & (rp[:, 1] < g('ap_ruff_ymax', -0.08))
            si = np.where(m_)[0]
            if not len(si): continue
            H_ = arr(d_.attributes['bind_height'].data, 'value', 1); X_ = arr(d_.attributes['bind_offset_x'].data, 'value', 1); Y_ = arr(d_.attributes['bind_offset_y'].data, 'value', 1)
            for ci in si:
                sl = slice(offs[ci], offs[ci] + cnt[ci]); H_[sl] *= fl; X_[sl] *= fl; Y_[sl] *= fl
            for nme, v in (('bind_height', H_), ('bind_offset_x', X_), ('bind_offset_y', Y_)): d_.attributes[nme].data.foreach_set('value', v.astype(np.float32))
            APLOG[mult + '_fur_strands'] = int(len(si))
        d_.attributes['coat_color'].data.foreach_set('color', col.astype(np.float32).ravel())
    def appeal_edits():
        if not g('appeal', 0): return
        me_ = body.data; Mw = np.array(body.matrix_world); Mi = np.linalg.inv(Mw)
        BV0 = np.array([v.co[:] for v in me_.vertices]); BV = BV0 @ Mw[:3, :3].T + Mw[:3, 3]; NV = len(BV)
        gn_ = [x.name for x in body.vertex_groups]; Wt_ = np.zeros((NV, len(gn_)), np.float32)
        for v in me_.vertices:
            for gg in v.groups: Wt_[v.index, gg.group] = gg.weight
        dom = np.array(gn_)[Wt_.argmax(1)]; headm = np.isin(dom, ['head_01', 'jaw_01'])
        def sst(e0, e1, x): t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
        NB = BV.copy()
        eyes = {}
        for side in ('l', 'r'):
            eo = bpy.data.objects.get('eye_' + side)
            if eo is None: continue
            Me = np.array(eo.matrix_world); EV = np.array([v.co[:] for v in eo.data.vertices]) @ Me[:3, :3].T + Me[:3, 3]
            c = EV.mean(0); r = float(np.linalg.norm(EV - c, axis=1).mean()); eyes[side] = (c, r)
        def rotz(p, piv, th):
            q = p - piv; cs, sn = math.cos(th), math.sin(th)
            return piv + np.stack([q[..., 0] * cs - q[..., 1] * sn, q[..., 0] * sn + q[..., 1] * cs, q[..., 2]], -1)
        turn = math.radians(g('ap_turn_deg', 0.0)); sc = g('ap_eye_scale', 1.0); lift = g('ap_eye_drop_m', 0.0)
        newc = {}
        for side, (c, r) in eyes.items():
            th = -math.copysign(turn, c[0]); piv = np.array([0.0, c[1] + g('ap_pivot_back_m', 0.0), c[2]])
            d = np.linalg.norm(BV - c, axis=1); wv = (1 - sst(r * g('ap_in', 1.25), r * g('ap_out', 2.6), d)) * headm
            R_ = rotz(BV, piv, th); c2 = rotz(c, piv, th) + np.array([0, 0, -lift])
            moved = BV + (R_ - BV) * wv[:, None] + np.array([0, 0, -lift]) * wv[:, None]
            # scale within the face surface only: the component along the eye's outward axis is left alone, so the
            # face does not swell round the larger eye (axis = the opening's horizontal direction after the turn)
            if g('ap_scale_planar', 1):
                a0 = math.radians(g('ap_axis0_deg', 43.0)) - abs(th)
                o_ = np.array([math.copysign(math.sin(a0), c2[0]), -math.cos(a0), 0.0])
                q_ = moved - c2; qn = q_ - np.outer(q_ @ o_, o_)
                moved = moved + qn * ((sc - 1) * wv)[:, None]
            else:
                moved = moved + (moved - c2) * ((sc - 1) * wv)[:, None]
            NB = NB + (moved - BV) * (wv > 0)[:, None]
            newc[side] = (c2, r * sc, th, piv)
            for on in ('eye_' + side, 'surface_cornea_eye_' + side):
                ob = bpy.data.objects.get(on)
                if ob is None: continue
                Mo = np.array(ob.matrix_world); P_ = np.array([v.co[:] for v in ob.data.vertices]) @ Mo[:3, :3].T + Mo[:3, 3]
                P_ = rotz(P_, piv, th) + np.array([0, 0, -lift]); P_ = c2 + (P_ - c2) * sc
                Pl = (P_ - Mo[:3, 3]) @ np.linalg.inv(Mo[:3, :3]).T
                for v, x in zip(ob.data.vertices, Pl): v.co = x.tolist()
        ey = np.mean([v[0][1] for v in newc.values()]) if newc else None; ez = np.mean([v[0][2] for v in newc.values()]) if newc else None
        # muzzle: everything ahead of the eyes slides back toward the eye plane by (1 - k) of its distance
        k = g('ap_muzzle_k', 1.0)
        if k != 1.0 and ey is not None:
            ahead = headm & (NB[:, 1] < ey); wz = 1 - sst(ez - g('ap_muzzle_z_lo', 0.01), ez + g('ap_muzzle_z_hi', 0.012), NB[:, 2])   # the muzzle only, not the forehead
            NB[ahead, 1] = NB[ahead, 1] + (1 - k) * (ey - NB[ahead, 1]) * wz[ahead]
        # forehead dome: the brow between and above the eyes swells along the vertex normal
        dm = g('ap_dome_m', 0.0)
        if dm and ez is not None:
            N_ = np.array([v.normal[:] for v in me_.vertices]) @ Mw[:3, :3].T; N_ /= np.maximum(np.linalg.norm(N_, axis=1), 1e-9)[:, None]
            crown = BV[headm, 2].max(); cen = np.array([0.0, ey + g('ap_dome_back_m', 0.02), (ez + crown) / 2])
            dd = np.linalg.norm((NB - cen) * np.array([1.0, 1.0, 1.3]), axis=1); wdm = (1 - sst(0.0, g('ap_dome_r_m', 0.05), dd)) * headm * (N_[:, 2] > -0.2)
            NB = NB + N_ * (dm * wdm)[:, None]
        ck = g('ap_cheek_m', 0.0)
        if ck and newc:
            N_ = np.array([v.normal[:] for v in me_.vertices]) @ Mw[:3, :3].T; N_ /= np.maximum(np.linalg.norm(N_, axis=1), 1e-9)[:, None]
            for side, (c2, r2, th, piv) in newc.items():
                for off, rad_ in ((np.array([math.copysign(0.004, c2[0]), -0.012, -0.03]), 0.028), (np.array([-c2[0] * 0.6, -0.045, -0.035]), 0.018)):
                    cc = c2 + off; dd = np.linalg.norm(NB - cc, axis=1); wck = (1 - sst(0.0, rad_, dd)) * headm
                    NB = NB + N_ * (ck * wck)[:, None]
        dl = (NB - BV) @ Mi[:3, :3].T
        if me_.shape_keys:
            for kb in me_.shape_keys.key_blocks:
                kc = np.array([d_.co[:] for d_ in kb.data]) + dl
                for d_, c_ in zip(kb.data, kc): d_.co = c_.tolist()
        for v_, c_ in zip(me_.vertices, BV0 + dl): v_.co = c_.tolist()
        me_.update(); bpy.context.view_layer.update()
        APLOG['edits'] = dict(turn_deg=g('ap_turn_deg', 0.0), eye_scale=sc, muzzle_k=k, dome_m=dm, moved_vertices=int((np.linalg.norm(NB - BV, axis=1) > 1e-5).sum()),
                              eye_centres={s: v[0].round(4).tolist() for s, v in newc.items()})
        # light eye area: coat strands rooted round each eye opening blend toward a light grey
        lr = g('ap_light_ring', 0.0)
        if lr:
            for o_ in objs:
                if o_.type != 'CURVES' or not o_.name.startswith('Luceras interpolated') or 'coat_color' not in o_.data.attributes: continue
                d_ = o_.data; ia = arr(d_.attributes['bind_ia'].data, 'value', 1, np.int32); rp = NB[ia]
                col = arr(d_.attributes['coat_color'].data, 'color', 4); wsum = np.zeros(len(ia))
                for side, (c2, r2, th, piv) in newc.items():
                    dd = np.linalg.norm(rp - c2, axis=1); qz = (rp[:, 2] - c2[2]) / max(r2, 1e-9)
                    wsum = np.maximum(wsum, (1 - sst(r2 * g('ap_ring_in', 1.0), r2 * g('ap_ring_out', 1.9), dd)) * (1 - g('ap_ring_top_cut', 0.0) * np.clip(qz, 0, 1)))
                tgt = np.array(g('ap_ring_rgb', [0.32, 0.31, 0.31]), np.float32)
                col[:, :3] = col[:, :3] * (1 - lr * wsum[:, None]) + tgt[None, :] * (lr * wsum[:, None])
                d_.attributes['coat_color'].data.foreach_set('color', col.astype(np.float32).ravel()); APLOG['light_ring_strands'] = int((wsum > 0.05).sum())
        appeal_face_fur(NB, newc, dom)

    def appeal_eye_material():
        """Round pupil with a highlight, iris ring all round: a procedural iris in the space of an empty that looks
        down each eye's opening axis (bone-parented, so it follows the head)."""
        if not g('ap_round_pupil', 0): return
        for side, (c2, r, a, upv, rtv, TE) in EYEOPEN.items():
            eo = bpy.data.objects.get('eye_' + side)
            if eo is None: continue
            em = bpy.data.objects.new('ap_eye_frame_' + side, None); s.collection.objects.link(em)
            em.parent = rig; em.parent_type = 'BONE'; em.parent_bone = 'head_01'; bpy.context.view_layer.update()
            aim = a.copy()
            if g('ap_aim_fwd', 0.0):    # aim the iris a little toward the snout line
                fw = np.array([0.0, -1.0, 0.0]); aim = aim + fw * g('ap_aim_fwd', 0.0); aim /= np.linalg.norm(aim)
            if g('ap_aim_up', 0.0): aim = aim + np.array([0.0, 0.0, g('ap_aim_up', 0.0)]); aim /= np.linalg.norm(aim)
            z_ = aim; y_ = np.array([0.0, 0.0, 1.0]) - z_ * z_[2]; y_ /= np.linalg.norm(y_); x_ = np.cross(y_, z_)
            M4 = Matrix(((x_[0], y_[0], z_[0], c2[0]), (x_[1], y_[1], z_[1], c2[1]), (x_[2], y_[2], z_[2], c2[2]), (0, 0, 0, 1)))
            em.matrix_world = M4
            m_ = bpy.data.materials.new('Appeal round eye ' + side); m_.use_nodes = True; nt = m_.node_tree; N = nt.nodes; L_ = nt.links
            bs_ = N.get('Principled BSDF'); bs_.inputs['Roughness'].default_value = 0.6
            try: bs_.inputs['Specular IOR Level'].default_value = g('ap_iris_spec', 0.0)   # the cornea carries the gloss, not the iris
            except Exception: pass
            tc = N.new('ShaderNodeTexCoord'); tc.object = em
            nrm = N.new('ShaderNodeVectorMath'); nrm.operation = 'NORMALIZE'; L_.new(tc.outputs['Object'], nrm.inputs[0])
            sep = N.new('ShaderNodeSeparateXYZ'); L_.new(nrm.outputs['Vector'], sep.inputs[0])
            ac = N.new('ShaderNodeMath'); ac.operation = 'ARCCOSINE'; L_.new(sep.outputs['Z'], ac.inputs[0])
            ti = math.radians(g('ap_iris_deg', 34.0)); tp = ti * g('ap_pupil_frac', 0.42)
            def mr(fmin, fmax, tmin, tmax, src):
                n_ = N.new('ShaderNodeMapRange'); n_.clamp = True; n_.inputs['From Min'].default_value = fmin; n_.inputs['From Max'].default_value = fmax
                n_.inputs['To Min'].default_value = tmin; n_.inputs['To Max'].default_value = tmax; L_.new(src, n_.inputs['Value']); return n_.outputs['Result']
            pupil = mr(tp - 0.015, tp + 0.015, 1.0, 0.0, ac.outputs[0])            # 1 inside the pupil
            rad = mr(tp, ti, 0.0, 1.0, ac.outputs[0])                              # 0 at the pupil edge, 1 at the iris edge
            limb = mr(ti - 0.09, ti - 0.01, 0.0, 1.0, ac.outputs[0])               # limbal ring
            # radial iris fibres: noise stretched along the radius (angle round the axis x 14, polar angle x 2)
            phi = N.new('ShaderNodeMath'); phi.operation = 'ARCTAN2'; L_.new(sep.outputs['Y'], phi.inputs[0]); L_.new(sep.outputs['X'], phi.inputs[1])
            cxyz = N.new('ShaderNodeCombineXYZ')
            m1 = N.new('ShaderNodeMath'); m1.operation = 'MULTIPLY'; m1.inputs[1].default_value = g('ap_fibre_ang', 14.0); L_.new(phi.outputs[0], m1.inputs[0]); L_.new(m1.outputs[0], cxyz.inputs['X'])
            m2 = N.new('ShaderNodeMath'); m2.operation = 'MULTIPLY'; m2.inputs[1].default_value = g('ap_fibre_rad', 2.0); L_.new(ac.outputs[0], m2.inputs[0]); L_.new(m2.outputs[0], cxyz.inputs['Y'])
            nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = g('ap_fibre_scale', 3.0); nz.inputs['Detail'].default_value = 6.0; nz.inputs['Roughness'].default_value = 0.65
            L_.new(cxyz.outputs['Vector'], nz.inputs['Vector'])
            ramp = N.new('ShaderNodeValToRGB'); cr = ramp.color_ramp
            cr.elements[0].position = 0.0; cr.elements[0].color = tuple(g('ap_iris_inner', [0.16, 0.07, 0.015])) + (1,)
            cr.elements[1].position = 1.0; cr.elements[1].color = tuple(g('ap_iris_outer', [0.30, 0.15, 0.04])) + (1,)
            e2 = cr.elements.new(0.55); e2.color = tuple(g('ap_iris_mid', [0.36, 0.19, 0.05])) + (1,)
            mixf = N.new('ShaderNodeMath'); mixf.operation = 'MULTIPLY_ADD'; L_.new(nz.outputs['Fac'], mixf.inputs[0]); mixf.inputs[1].default_value = g('ap_fibre_amt', 0.6); L_.new(rad, mixf.inputs[2])
            L_.new(mixf.outputs[0], ramp.inputs['Fac'])
            dark = N.new('ShaderNodeMixRGB'); L_.new(limb, dark.inputs['Fac']); L_.new(ramp.outputs['Color'], dark.inputs['Color1']); dark.inputs['Color2'].default_value = (0.05, 0.025, 0.01, 1)
            pm = N.new('ShaderNodeMixRGB'); L_.new(pupil, pm.inputs['Fac']); L_.new(dark.outputs['Color'], pm.inputs['Color1']); pm.inputs['Color2'].default_value = (0.004, 0.004, 0.005, 1)
            L_.new(pm.outputs['Color'], bs_.inputs['Base Color'])
            # highlight: a small bright spot up and toward the front of the iris, emissive so it reads in every render
            # one small crisp highlight at the viewer's upper left (front camera looks along +Y, its left is -X)
            hw = z_ * g('ap_hl_axis_mix', 0.0) + np.array([0.0, -1.0, 0.0]) * g('ap_hl_fwd', 0.85) + np.array([0.0, 0.0, g('ap_hl_up', 0.4)]) + np.array([-g('ap_hl_left', 0.25), 0.0, 0.0]); hw /= np.linalg.norm(hw)   # same world direction for both eyes (toward a light at the front, upper left)
            hd = np.array([hw @ x_, hw @ y_, hw @ z_])
            dp = N.new('ShaderNodeVectorMath'); dp.operation = 'DOT_PRODUCT'; L_.new(nrm.outputs['Vector'], dp.inputs[0]); dp.inputs[1].default_value = hd.tolist()
            hl = mr(math.cos(math.radians(g('ap_hl_deg', 5.0))), math.cos(math.radians(g('ap_hl_deg', 5.0) * g('ap_hl_edge', 0.6))), 0.0, g('ap_hl_gain', 1.0), dp.outputs['Value'])
            bs_.inputs['Emission Color'].default_value = (1, 1, 1, 1); L_.new(hl, bs_.inputs['Emission Strength'])
            eo.data.materials.clear(); eo.data.materials.append(m_)
            if g('ap_clear_cornea', 0):
                co2 = bpy.data.objects.get('surface_cornea_eye_' + side)
                for cm in (co2.data.materials if co2 else []):
                    if cm is None or not cm.use_nodes: continue
                    APLOG.setdefault('cornea_nodes', {})[cm.name] = sorted({n_.bl_idname for n_ in cm.node_tree.nodes})
                    for n_ in cm.node_tree.nodes:
                        if n_.bl_idname in ('ShaderNodeBsdfGlass', 'ShaderNodeBsdfGlossy', 'ShaderNodeBsdfAnisotropic') and 'Roughness' in n_.inputs:
                            n_.inputs['Roughness'].default_value = g('ap_cornea_rough', 0.02)
                        if n_.bl_idname == 'ShaderNodeBsdfPrincipled':
                            n_.inputs['Roughness'].default_value = g('ap_cornea_rough', 0.02)
                            try: n_.inputs['Specular IOR Level'].default_value = g('ap_cornea_spec', 0.3)
                            except Exception: pass
                            try: n_.inputs['Coat Weight'].default_value = 0.0
                            except Exception: pass
        APLOG['round_pupil'] = dict(iris_deg=g('ap_iris_deg', 34.0), pupil_frac_of_iris=g('ap_pupil_frac', 0.42), highlight_deg=g('ap_hl_deg', 5.0))

    def appeal_measure():
        """creature-appeal.md floor items 1, 2, 3, 5 (geometry) at rest; items 4, 6, 7, 8 are read on the renders."""
        me_ = body.data; dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh(); Wb = np.array(e.matrix_world)
        BV = np.array([v.co[:] for v in m.vertices]) @ Wb[:3, :3].T + Wb[:3, 3]; e.to_mesh_clear()
        gn_ = [x.name for x in body.vertex_groups]; dom = np.empty(len(BV), object)
        best = np.full(len(BV), -1.0)
        for v in me_.vertices:
            bw = -1; bn = ''
            for gg in v.groups:
                if gg.weight > bw: bw = gg.weight; bn = gn_[gg.group]
            dom[v.index] = bn
        hm = np.isin(dom, ['head_01', 'jaw_01']); H = BV[hm]
        crown, jaw = float(H[:, 2].max()), float(H[:, 2].min()); hh = crown - jaw; tip = H[np.argmin(H[:, 1])]
        out = dict(head_height_mm=round(hh * 1000, 1), crown_z=round(crown, 4), jaw_z=round(jaw, 4))
        for side, (c2, r, a, upv, rtv, TE) in EYEOPEN.items():
            rim = np.array(RIMPATH.get(side, [])); oh = float(rim[:, 2].max() - rim[:, 2].min()) if len(rim) else None
            ax = math.degrees(math.acos(max(-1, min(1, -a[1] / max(1e-9, math.hypot(a[0], a[1]))))))
            ec = rim.mean(0) if len(rim) else c2
            out['eye_' + side] = dict(opening_height_mm=round(oh * 1000, 1) if oh else None, item1_eye_pct_of_head=round(100 * oh / hh, 1) if oh else None,
                                      item2_axis_off_snout_deg=round(ax, 1), item3_eye_height_frac=round(float((ec[2] - jaw) / hh), 3),
                                      item5_snout_mm=round(float(np.linalg.norm(ec - tip)) * 1000, 1), item5_eye_to_crown_mm=round((crown - float(ec[2])) * 1000, 1),
                                      item5_ratio=round(float(np.linalg.norm(ec - tip)) / max(1e-9, crown - float(ec[2])), 2))
        APLOG['measure'] = out
    appeal_scale(); appeal_edits()
    from mathutils.bvhtree import BVHTree
    dg_ = bpy.context.evaluated_depsgraph_get(); BTH = [BVHTree.FromObject(body, dg_)]
    Mbw = np.array(body.matrix_world); Mbi = np.linalg.inv(Mbw)
    def body_ray(p, d, dist=0.05):
        """Ray cast against the evaluated body in world space: (hit point, normal) or (None, None)."""
        pl = Mbi[:3, :3] @ p + Mbi[:3, 3]; dl = Mbi[:3, :3] @ d; dl = dl / np.linalg.norm(dl)
        h_, n_, i_, dd = BTH[0].ray_cast(Vector(pl.tolist()), Vector(dl.tolist()), dist)
        if h_ is None: return None, None
        nw = Mbw[:3, :3] @ np.array(n_[:]); return Mbw[:3, :3] @ np.array(h_[:]) + Mbw[:3, 3], nw / np.linalg.norm(nw)
    def covered(p, d):
        """True when a point on the eye lies under the skin: the outward ray leaves the body (exit normal along d)."""
        h_, n_ = body_ray(p, d, 0.3); return h_ is not None and float(n_ @ d) > 0
    def eye_lids_ray(side, c2, r, cornea):
        """Find the skin opening over the seated eye by ray casting, then build (1) a dark elliptic rim along the whole
        opening edge and (2) an upper lid shell from under the skin down over the top of the iris by lid_overlap_deg,
        with the rim on its lower edge. Shell colour runs from the dark margin to the coat grey under the brow fur."""
        CV = None
        if cornea is not None:
            Mc = np.array(cornea.matrix_world); CV = np.array([v.co[:] for v in cornea.data.vertices]) @ Mc[:3, :3].T + Mc[:3, 3]
        def shell_r(d):
            if CV is None: return r
            q = CV - c2; nq = np.linalg.norm(q, axis=1); m_ = (q @ d) / nq > math.cos(math.radians(6))
            return max(r, float(nq[m_].max()) if m_.any() else r)
        def opening():
            # opening axis: mean of uncovered sphere directions (Fibonacci sample)
            nS = 900; k_ = np.arange(nS) + 0.5; th_ = np.arccos(1 - 2 * k_ / nS); ph_ = math.pi * (1 + 5 ** 0.5) * k_
            D = np.c_[np.sin(th_) * np.cos(ph_), np.sin(th_) * np.sin(ph_), np.cos(th_)]
            ex_ = np.array([not covered(c2 + d * r * 1.02, d) for d in D])
            a = D[ex_].mean(0); a /= np.linalg.norm(a)
            upv = np.array([0.0, 0.0, 1.0]) - a * a[2]; upv /= np.linalg.norm(upv); rtv = np.cross(upv, a)
            nph = 72; PH = np.linspace(0, 2 * math.pi, nph, endpoint=False); TB = np.zeros(nph)
            for i, ph in enumerate(PH):
                pd = rtv * math.cos(ph) + upv * math.sin(ph); tb = math.radians(110)
                for tdeg in np.arange(0, 110, 0.5):
                    t = math.radians(tdeg); d = a * math.cos(t) + pd * math.sin(t)
                    if covered(c2 + d * r * 1.02, d): tb = t; break
                TB[i] = tb
            _sw = int(g('lid_edge_smooth', 2)); TBs = np.array([np.mean(TB[[(i + j) % nph for j in range(-_sw, _sw + 1)]]) for i in range(nph)])
            return ex_, a, upv, rtv, nph, PH, TBs
        ex_, a, upv, rtv, nph, PH, TBs = opening()
        bo = g('lid_build_out_m', 0.0); BUILD[side] = 0
        if bo > 0:
            # build the lids out: skin vertices outside the opening edge move along the opening axis by bo at the edge,
            # easing to zero lid_build_falloff_m beyond it, so the cornea sits flush with the lids (local vertex edit;
            # topology, triangle bindings and every shape key's delta are unchanged)
            Mbw_ = np.array(body.matrix_world); Mbi_ = np.linalg.inv(Mbw_); me_ = body.data
            BV_ = np.array([v.co[:] for v in me_.vertices]) @ Mbw_[:3, :3].T + Mbw_[:3, 3]
            q = BV_ - c2; nq = np.linalg.norm(q, axis=1); u = q / np.maximum(nq[:, None], 1e-9)
            th = np.arccos(np.clip(u @ a, -1, 1)); ph = np.mod(np.arctan2(u @ upv, u @ rtv), 2 * math.pi)
            tb = TBs[np.round(ph / (2 * math.pi) * nph).astype(int) % nph]
            sarc = (th - tb) * r; fo = g('lid_build_falloff_m', 0.009)
            x = np.clip(sarc / fo, 0, 1); w = 1 - x * x * (3 - 2 * x)
            msk = (th >= tb) & (sarc < fo) & (nq < r + g('lid_build_reach_m', 0.012)) & (nq > r * 0.8)
            dw = np.zeros_like(BV_); dw[msk] = a[None, :] * (bo * w[msk])[:, None]
            dl = dw @ Mbi_[:3, :3].T
            if me_.shape_keys:
                for kb in me_.shape_keys.key_blocks:
                    kc = np.array([d_.co[:] for d_ in kb.data]) + dl
                    for d_, c_ in zip(kb.data, kc): d_.co = c_.tolist()
            for v_, c_ in zip(me_.vertices, np.array([v.co[:] for v in me_.vertices]) + dl): v_.co = c_.tolist()
            me_.update(); bpy.context.view_layer.update()
            BTH[0] = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get()); BUILD[side] = int(msk.sum())
            ex_, a, upv, rtv, nph, PH, TBs = opening()
        a_pre = a.copy()
        lpu, lpl, lpc = math.radians(g('lid_pull_up_deg', 0.0)), math.radians(g('lid_pull_low_deg', 0.0)), math.radians(g('lid_pull_corner_deg', 0.0))
        if lpu or lpl or lpc:
            # furred lids: the skin round the opening slides over the eye (along the eye sphere, toward its axis), so
            # the coat runs right to the lid line instead of a bare lid shell; strands follow their triangles
            Mbw_ = np.array(body.matrix_world); Mbi_ = np.linalg.inv(Mbw_); me_ = body.data
            BV0_ = np.array([v.co[:] for v in me_.vertices]); BV_ = BV0_ @ Mbw_[:3, :3].T + Mbw_[:3, 3]
            q = BV_ - c2; nq = np.linalg.norm(q, axis=1); u = q / np.maximum(nq[:, None], 1e-9)
            th = np.arccos(np.clip(u @ a, -1, 1)); ph = np.mod(np.arctan2(u @ upv, u @ rtv), 2 * math.pi)
            tb = TBs[np.round(ph / (2 * math.pi) * nph).astype(int) % nph]
            band = math.radians(g('lid_pull_band_deg', 14.0))
            sp = np.sin(ph); cp = np.abs(np.cos(ph))
            pull = lpu * np.clip(sp, 0, 1) ** 1.2 + lpl * np.clip(-sp, 0, 1) ** 1.2 + lpc * cp ** 4
            x = np.clip((th - tb) / band, 0, 1); wgt = (1 - x * x * (3 - 2 * x)) * (th >= tb - math.radians(1.0)) * (nq < r * 1.45) * (nq > r * 0.85)
            dth = pull * wgt
            perp = u - np.outer(u @ a, a); perp /= np.maximum(np.linalg.norm(perp, axis=1, keepdims=True), 1e-9)
            th2 = np.maximum(th - dth, 0.0)
            if g('lid_clean_edge', 0):
                # one smooth lid edge: the target edge angle is interpolated (not indexed) round the opening and
                # smoothed, and no pulled vertex may cross it, so the skin ends on a clean curve instead of a sawtooth
                PHx = np.r_[PH - 2 * math.pi, PH, PH + 2 * math.pi]; pull_e = lpu * np.clip(np.sin(PH), 0, 1) ** 1.2 + lpl * np.clip(-np.sin(PH), 0, 1) ** 1.2 + lpc * np.abs(np.cos(PH)) ** 4
                E_ = TBs - pull_e; k_ = int(g('lid_clean_smooth', 6)); E_ = np.array([np.mean(E_[[(i + j) % nph for j in range(-k_, k_ + 1)]]) for i in range(nph)])
                edge = np.interp(ph, PHx, np.r_[E_, E_, E_])
                th2 = np.where(dth > 1e-4, np.maximum(th2, edge), th2)
            u2 = np.outer(np.cos(th2), a) + perp * np.sin(th2)[:, None]
            rr_ = np.where(dth > 1e-4, np.maximum(nq, r * 1.0 + g('lid_pull_lift_m', 0.0012)), nq)
            NBp = np.where((dth > 1e-4)[:, None], c2 + u2 * rr_[:, None], BV_)
            if g('lid_clean_edge', 0) and g('lid_clean_relax', 3):
                # relax the moved ring along the eye sphere (tangential Laplacian), then re-clamp to the edge
                Ed = np.array([e.vertices[:] for e in me_.edges]); mv = dth > 1e-4; cnt_ = np.bincount(Ed.ravel(), minlength=len(BV_)).astype(float)
                for _ in range(int(g('lid_clean_relax', 3))):
                    sm = np.zeros_like(NBp); np.add.at(sm, Ed[:, 0], NBp[Ed[:, 1]]); np.add.at(sm, Ed[:, 1], NBp[Ed[:, 0]])
                    avg = sm / np.maximum(cnt_, 1)[:, None]; NBp = np.where(mv[:, None], 0.5 * NBp + 0.5 * avg, NBp)
                    q2 = NBp - c2; n2 = np.linalg.norm(q2, axis=1); u3 = q2 / np.maximum(n2[:, None], 1e-9)
                    t3 = np.arccos(np.clip(u3 @ a, -1, 1)); p3 = u3 - np.outer(u3 @ a, a); p3 /= np.maximum(np.linalg.norm(p3, axis=1, keepdims=True), 1e-9)
                    t3 = np.where(mv, np.maximum(t3, edge), t3); r3 = np.where(mv, np.maximum(n2, r + g('lid_pull_lift_m', 0.0012)), n2)
                    NBp = np.where(mv[:, None], c2 + (np.outer(np.cos(t3), a) + p3 * np.sin(t3)[:, None]) * r3[:, None], NBp)
            dl = (NBp - BV_) @ Mbi_[:3, :3].T
            if me_.shape_keys:
                for kb in me_.shape_keys.key_blocks:
                    kc = np.array([d_.co[:] for d_ in kb.data]) + dl
                    for d_, c_ in zip(kb.data, kc): d_.co = c_.tolist()
            for v_, c_ in zip(me_.vertices, BV0_ + dl): v_.co = c_.tolist()
            me_.update(); bpy.context.view_layer.update()
            BTH[0] = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
            ex_, a, upv, rtv, nph, PH, TBs = opening()
            APLOG.setdefault('lid_pull_vertices', {})[side] = int((dth > 1e-4).sum())
        ov = math.radians(g('lid_overlap_deg', 9.0)); ovl = math.radians(g('lower_lid_overlap_deg', 1.5))
        wup = np.clip(np.sin(PH), 0, 1) ** g('lid_overlap_pow', 1.4); wlo = np.clip(-np.sin(PH), 0, 1) ** 1.4
        TE = TBs - ov * wup - ovl * wlo
        asp = g('lid_aspect', 0.0)
        if asp > 0:
            hz = np.abs(np.cos(PH)) > 0.9; thx = float(np.median(TBs[hz])) * g('lid_width_frac', 1.0); thy = thx * asp
            tilt = math.radians(g('lid_tilt_deg', 0.0)); pp = PH - tilt
            the = 1.0 / np.sqrt((np.cos(pp) / thx) ** 2 + (np.sin(pp) / thy) ** 2)
            TE = np.minimum(TE, the)
        def dir_(t, ph):
            return a * math.cos(t) + (rtv * math.cos(ph) + upv * math.sin(ph)) * math.sin(t)
        # rim: elliptic tube on the edge, wide along the eye surface, thin off it
        rw = g('rim_width_m', 0.0017); rh = g('rim_height_m', 0.0008)
        bos = bo if BUILD.get(side) else 0.0   # with built-out lids the rim covers the margin wall up to the lid surface
        path, sa, sb = [], [], []
        for i, ph in enumerate(PH):
            d = dir_(TE[i], ph); rs = shell_r(d) + g('lid_gap_m', 0.0003)
            dth = dir_(TE[i] + 0.02, ph) - d; dth /= np.linalg.norm(dth)
            path.append(c2 + d * (rs + rh * 0.35 + bos / 2)); sa.append(dth); sb.append(d)
        Vt, Ft = tube(path, rw, rh + bos / 2, sa, sb, True, 10); add_obj('head_lid_rim_' + side, Vt, Ft, lidm)
        bw_ = g('lid_band_m', 0.0)
        if bw_:
            # lid band: a soft coat-grey lid that covers the ragged skin edge round the opening, outside the thin line
            bm_ = bpy.data.materials.get('Head lid band') or bpy.data.materials.new('Head lid band'); bm_.use_nodes = True
            bb_ = bm_.node_tree.nodes.get('Principled BSDF'); bb_.inputs['Base Color'].default_value = list(g('lid_band_rgb', [0.12, 0.115, 0.11])) + [1]; bb_.inputs['Roughness'].default_value = 0.85
            try: bb_.inputs['Specular IOR Level'].default_value = 0.2
            except Exception: pass
            pb_, sa2, sb2 = [], [], []
            for i, ph in enumerate(PH):
                t_ = TE[i] + (bw_ * 0.5 - g('lid_band_overlap_m', 0.0006)) / r; d = dir_(t_, ph); dth = dir_(t_ + 0.02, ph) - d; dth /= np.linalg.norm(dth)
                pb_.append(c2 + d * (shell_r(d) + g('lid_band_lift_m', 0.0008) + bos)); sa2.append(dth); sb2.append(d)
            Vt2, Ft2 = tube(pb_, bw_ * 0.5, g('lid_band_h_m', 0.0012), sa2, sb2, True, 10); add_obj('head_lid_band_' + side, Vt2, Ft2, bm_)
        RIMPATH[side] = [np.array(p_) for p_ in path]
        rim_top = float(np.median([(p_ - c2) @ a + (rh + bos / 2) * math.cos(t_) for p_, t_ in zip(path, TE)]))
        # upper lid shell: rows from under the skin (TB + tuck) to the rim (TE), only where the lid overlaps
        sel = np.where((TBs - TE) > math.radians(0.8))[0]; rows = 6; Vs, Fs, Cs = [], [], []
        tuck = math.radians(g('lid_tuck_deg', 6.0))
        for ii, i in enumerate(sel):
            for k2 in range(rows):
                u2 = k2 / (rows - 1); t = TE[i] + (TBs[i] + tuck - TE[i]) * u2; d = dir_(t, PH[i])
                Vs.append(c2 + d * (shell_r(d) + g('lid_gap_m', 0.0003) + rh * 0.2 + bos * (1 - g('lid_dive', 0.0) * u2))); Cs.append(u2)
        for ii in range(len(sel) - 1):
            if sel[ii + 1] != sel[ii] + 1: continue
            for k2 in range(rows - 1):
                Fs.append([ii * rows + k2, ii * rows + k2 + 1, (ii + 1) * rows + k2 + 1, (ii + 1) * rows + k2])
        if len(sel) > 2 and sel[0] == 0 and sel[-1] == nph - 1:
            ii = len(sel) - 1
            for k2 in range(rows - 1): Fs.append([ii * rows + k2, ii * rows + k2 + 1, k2 + 1, k2])
        if Fs:
            ob_ = add_obj('head_upper_lid_' + side, Vs, Fs, lidskin)
            at_ = ob_.data.attributes.new('lid_u', 'FLOAT', 'POINT'); at_.data.foreach_set('value', np.array(Cs, np.float32))
        top = int(np.argmax(np.sin(PH)))
        EYEOPEN[side] = (c2, r, a_pre if g('ap_iris_axis_prepull', 0) else a, upv, rtv, TE)
        # cornea apex against the surrounding skin, along the opening axis (positive = the eye stands proud of the skin)
        skin_h = []
        for i in range(0, nph, 3):
            d = dir_(TBs[i] + math.radians(g('skin_ring_deg', 10.0)), PH[i]); h_, n_ = body_ray(c2 + d * r * 2.5, -d, r * 2.5)
            if h_ is not None: skin_h.append(float((h_ - c2) @ a))
        apex = float(((CV - c2) @ a).max()) if CV is not None else r
        prot = dict(cornea_apex_mm=round(apex * 1000, 2), skin_ring_mm=round(float(np.median(skin_h)) * 1000, 2) if skin_h else None,
                    proud_of_skin_mm=round((apex - float(np.median(skin_h))) * 1000, 2) if skin_h else None,
                    rim_top_mm=round(rim_top * 1000, 2), proud_of_rim_mm=round((apex - rim_top) * 1000, 2))
        return dict(**prot, lid_build_out_vertices=BUILD.get(side, 0), opening_axis=a.round(3).tolist(), exposed_frac=round(float(ex_.mean()), 3),
                    edge_deg_top=round(math.degrees(TBs[top]), 1), lid_edge_deg_top=round(math.degrees(TE[top]), 1),
                    edge_deg_min=round(math.degrees(TBs.min()), 1), edge_deg_max=round(math.degrees(TBs.max()), 1))
    EYEOPEN = {}; BUILD = {}; RIMPATH = {}
    def hide_strands_in_openings():
        """Strands whose points reach into the visible eye opening (deeper than lid_fur_margin_m past the lid edge) get
        zero radius, so fur may lie over the lid edge but never hangs in front of the iris. Whiskers are left alone."""
        out = {}; mg = g('lid_fur_margin_m', 0.0015)
        for o_ in objs:
            if o_.type != 'CURVES' or 'whisker' in o_.name.lower() or o_.name.startswith('Plume'): continue
            if g('ap_hide_eyelid_fur', 0) and o_.name.startswith('Eyelid'):
                rr = arr(o_.data.attributes['radius'].data, 'value', 1); o_.data.attributes['radius'].data.foreach_set('value', np.zeros_like(rr)); out[o_.name] = 'all'; continue
            d_ = o_.data; P_ = arr(d_.attributes['position'].data, 'vector', 3); W_ = np.array(body.matrix_world)
            # judge the strands where the scene puts them: evaluate the surface-frame deformation on this scene's body
            # (the strands follow the head-detail vertex edits), with the curve-deleting modifiers switched off so the
            # evaluated points line up with the original ones; the object is unlinked again afterwards
            try:
                for m in o_.modifiers:
                    if m.type == 'NODES' and m.node_group:
                        for n in m.node_group.nodes:
                            if n.bl_idname == 'GeometryNodeObjectInfo' and n.inputs['Object'].default_value == gbody: n.inputs['Object'].default_value = body
                vis = [(m, m.show_viewport) for m in o_.modifiers]
                for m, _ in vis:
                    if not m.name.startswith('Follow'): m.show_viewport = False
                s.collection.objects.link(o_); o_.parent = None; o_.matrix_world = body.matrix_world.copy(); bpy.context.view_layer.update()
                ev_ = o_.evaluated_get(bpy.context.evaluated_depsgraph_get()); PE = arr(ev_.data.attributes['position'].data, 'vector', 3)
                if len(PE) == len(P_): P_ = PE
                s.collection.objects.unlink(o_)
                for m, v_ in vis: m.show_viewport = v_
            except Exception as ex:
                print('HEAD hide: evaluation failed for', o_.name, ex, flush=True)
            Pw = P_ @ W_[:3, :3].T + W_[:3, 3]; hit = np.zeros(len(P_), bool)
            for side, (c2, r, a, upv, rtv, TE) in EYEOPEN.items():
                q = Pw - c2; nq = np.linalg.norm(q, axis=1); m_ = np.where(nq < r * 1.35)[0]
                if not len(m_): continue
                qm = q[m_] / nq[m_, None]; th = np.arccos(np.clip(qm @ a, -1, 1)); ph = np.mod(np.arctan2(qm @ upv, qm @ rtv), 2 * math.pi)
                k = np.round(ph / (2 * math.pi) * len(TE)).astype(int) % len(TE)
                hit[m_] |= (th < TE[k] - mg / r) & (nq[m_] > r * 0.85)
                lowh = (qm @ upv) < g('hover_up_max', 0.3)
                hit[m_] |= lowh & (th < TE[k] + math.radians(1.5)) & (nq[m_] > r + g('hover_m', 0.0025))
            if not hit.any(): continue
            offs = arr(d_.curves, 'first_point_index', 1, np.int32); cid = np.repeat(np.arange(len(offs)), arr(d_.curves, 'points_length', 1, np.int32))
            bad = np.unique(cid[hit]); rad = arr(d_.attributes['radius'].data, 'value', 1); rad[np.isin(cid, bad)] = 0.0
            d_.attributes['radius'].data.foreach_set('value', rad.astype(np.float32)); out[o_.name] = int(len(bad))
        return out
    # ---- eyes: seat the eyeball and cornea deeper, add upper and lower lid shells and a dark rim ring
    lidm = mat('Head p1 dark lid rim', g('lid_rgb', (0.022, 0.020, 0.019)), g('lid_rough', 0.62))
    try: lidm.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value = g('lid_spec', 0.5)
    except Exception: pass
    lidskin = bpy.data.materials.new('Head p1 upper lid'); lidskin.use_nodes = True
    nt_l = lidskin.node_tree; bsl = nt_l.nodes.get('Principled BSDF'); bsl.inputs['Roughness'].default_value = 0.75
    atl = nt_l.nodes.new('ShaderNodeAttribute'); atl.attribute_name = 'lid_u'; atl.attribute_type = 'GEOMETRY'
    rpl = nt_l.nodes.new('ShaderNodeMapRange'); rpl.inputs['From Min'].default_value = 0.0; rpl.inputs['From Max'].default_value = g('lid_dark_frac', 0.45)
    nt_l.links.new(atl.outputs['Fac'], rpl.inputs['Value'])
    mxl = nt_l.nodes.new('ShaderNodeMixRGB'); mxl.inputs['Color1'].default_value = list(g('lid_rgb', (0.022, 0.020, 0.019))) + [1.0]
    mxl.inputs['Color2'].default_value = list(g('lid_skin_rgb', (0.075, 0.072, 0.07))) + [1.0]
    nt_l.links.new(rpl.outputs['Result'], mxl.inputs['Fac']); nt_l.links.new(mxl.outputs['Color'], bsl.inputs['Base Color'])
    for side in ('l', 'r'):
        eo = bpy.data.objects.get('eye_' + side); co_ = bpy.data.objects.get('surface_cornea_eye_' + side)
        if eo is None: continue
        Me = np.array(eo.matrix_world); EV = np.array([v.co[:] for v in eo.data.vertices]) @ Me[:3, :3].T + Me[:3, 3]
        c = EV.mean(0); r = float(np.linalg.norm(EV - c, axis=1).mean())
        o = c - axis_foot(c); o[2] *= 0.3; o /= np.linalg.norm(o)
        up = np.array([0.0, 0.0, 1.0]) - o * o[2]; up /= np.linalg.norm(up); rt = np.cross(up, o)
        depth = g('eye_seat_frac', 0.35) * r
        for ob in (eo, co_):
            if ob is None: continue
            Mi = np.linalg.inv(np.array(ob.matrix_world)[:3, :3]); dl = Mi @ (-o * depth)
            for v in ob.data.vertices: v.co = (np.array(v.co[:]) + dl).tolist()
        c2 = c - o * depth; R = r * g('lid_r_frac', 1.12); A3 = np.stack([rt, up, o], 1)
        if g('lid_mode', 'ray') == 'ray':
            log['eye_' + side] = dict(radius_mm=round(r * 1000, 2), seated_mm=round(depth * 1000, 2), **eye_lids_ray(side, c2, r, co_))
            continue
        hu = g('upper_lid_h', 0.32); hl = g('lower_lid_h', -0.62); fr = g('lid_front', -0.15)
        def keep(p, hu=hu, hl=hl, fr=fr, c2=c2, up=up, o=o, R=R):
            q = p - c2; return (q @ o > fr * R) and ((q @ up > hu * R) or (q @ up < hl * R))
        V_, F_ = ellipsoid(c2, A3, np.array([R, R, R]), 32, 16, keep)
        add_obj('head_lid_' + side, V_, F_, lidm)
        Vr, Fr = [], []; nu = 40; nvr = 8; rr = g('rim_tube_m', 0.0012)
        ring_r = R * g('rim_r_frac', 0.93); ringc = c2 + o * (R * g('rim_front', 0.35))
        for i in range(nu):
            ph = 2 * math.pi * i / nu; radial = rt * math.cos(ph) + up * math.sin(ph); cen = ringc + radial * ring_r
            for j in range(nvr):
                ps = 2 * math.pi * j / nvr; Vr.append(cen + (radial * math.cos(ps) + o * math.sin(ps)) * rr)
        for i in range(nu):
            for j in range(nvr):
                Fr.append([i * nvr + j, i * nvr + (j + 1) % nvr, ((i + 1) % nu) * nvr + (j + 1) % nvr, ((i + 1) % nu) * nvr + j])
        add_obj('head_lid_rim_' + side, Vr, Fr, lidm)
        log['eye_' + side] = dict(radius_mm=round(r * 1000, 2), seated_mm=round(depth * 1000, 2))
    if g('ap_eyelid_coat_match', 0):
        # the eyelid fur ring (Eyelid short rim / ring guides) takes the coat's own strand attributes and material, so it
        # restores the face-fur density round the eye without the dark lash fringe its slate rim material made
        from mathutils.kdtree import KDTree as _KD
        co_ = next(o for o in objs if o.type == 'CURVES' and o.name.startswith('Luceras interpolated'))
        cd_ = co_.data; Mw_ = np.array(body.matrix_world); BV_ = np.array([v.co[:] for v in body.data.vertices]) @ Mw_[:3, :3].T + Mw_[:3, 3]
        def roots(d_):
            ids_ = np.stack([arr(d_.attributes['bind_i' + c].data, 'value', 1, np.int32) for c in 'abc'], 1); bar_ = np.stack([arr(d_.attributes['bind_' + c].data, 'value', 1) for c in 'abc'], 1)
            return (BV_[ids_] * bar_[:, :, None]).sum(1)
        cr = roots(cd_); near = np.where(np.min(np.stack([np.linalg.norm(cr - EYEOPEN[s_][0], axis=1) for s_ in EYEOPEN]), 0) < 0.08)[0]
        kd = _KD(len(near))
        for j, i in enumerate(near): kd.insert(cr[i].tolist(), j)
        kd.balance(); n_done = 0
        for o_ in objs:
            if o_.type != 'CURVES' or not o_.name.startswith('Eyelid'): continue
            d_ = o_.data; er = roots(d_); src = np.array([near[kd.find(p_.tolist())[1]] for p_ in er])
            for a_ in cd_.attributes:
                if a_.name.startswith('.') or a_.domain != 'CURVE' or a_.name.startswith('bind_'): continue
                k_ = {'FLOAT_COLOR': 'color', 'FLOAT_VECTOR': 'vector'}.get(a_.data_type, 'value'); w_ = {'FLOAT_COLOR': 4, 'FLOAT_VECTOR': 3}.get(a_.data_type, 1)
                if a_.data_type not in ('FLOAT', 'FLOAT_COLOR', 'FLOAT_VECTOR'): continue
                v_ = arr(a_.data, k_, w_)[src]
                dst = d_.attributes.get(a_.name)
                if dst is not None and (dst.domain != 'CURVE' or dst.data_type != a_.data_type): d_.attributes.remove(dst); dst = None
                if dst is None: dst = d_.attributes.new(a_.name, a_.data_type, 'CURVE')
                dst.data.foreach_set(k_, v_.astype(np.float32).ravel())
            d_.materials.clear(); [d_.materials.append(m_) for m_ in cd_.materials]
            ls = g('ap_eyelid_len', 1.0)
            if ls != 1.0:
                for nme in ('bind_height', 'bind_offset_x', 'bind_offset_y'):
                    if nme in d_.attributes:
                        v_ = arr(d_.attributes[nme].data, 'value', 1) * ls; d_.attributes[nme].data.foreach_set('value', v_.astype(np.float32))
            n_done += len(er)
        log['eyelid_coat_match_strands'] = n_done
    if EYEOPEN and g('hide_opening_fur', 1): log['strands_hidden_in_eye_openings'] = hide_strands_in_openings()
    def fur_density():
        """Visible strand roots per cm2 of skin: rings round each eye (radial distance from the eye centre in eye radii)
        and a cheek patch, per curve object, at rest. Roots come from each strand's bound triangle on the current body."""
        me_ = body.data; Mw = np.array(body.matrix_world); BV = np.array([v.co[:] for v in me_.vertices]) @ Mw[:3, :3].T + Mw[:3, 3]
        me_.calc_loop_triangles(); LT = np.array([t.vertices[:] for t in me_.loop_triangles]); T = BV[LT]
        area = np.linalg.norm(np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]), axis=1) / 2; cen = T.mean(1)
        res = {}
        for side, (c2, r, a_, upv, rtv, TE) in EYEOPEN.items():
            bands = {'1.0-1.3r': (1.0, 1.3), '1.3-1.6r': (1.3, 1.6), '1.6-2.0r': (1.6, 2.0)}
            ck = c2 + np.array([0.0, 0.015, -r * 2.6]); dc = np.linalg.norm(cen - ck, axis=1); dci = np.linalg.norm(cen - c2, axis=1)
            regs = {k: (dci >= lo * r) & (dci < hi * r) for k, (lo, hi) in bands.items()}; regs['cheek'] = dc < r * 0.8
            out = {k: dict(area_cm2=round(float(area[m].sum()) * 1e4, 2)) for k, m in regs.items()}
            for o_ in objs:
                if o_.type != 'CURVES' or o_.name.startswith('Plume') or 'bind_ia' not in o_.data.attributes or 'whisker' in o_.name.lower(): continue
                d_ = o_.data; ids_ = np.stack([arr(d_.attributes['bind_i' + c].data, 'value', 1, np.int32) for c in 'abc'], 1)
                bar_ = np.stack([arr(d_.attributes['bind_' + c].data, 'value', 1) for c in 'abc'], 1); rp = (BV[ids_] * bar_[:, :, None]).sum(1)
                offs = arr(d_.curves, 'first_point_index', 1, np.int32); rad = arr(d_.attributes['radius'].data, 'value', 1)[offs] if 'radius' in d_.attributes else np.ones(len(offs))
                vis = (rad > 0) & (not o_.hide_render); ln = None
                for k in regs:
                    if k == 'cheek': m = np.linalg.norm(rp - ck, axis=1) < r * 0.8
                    else:
                        lo, hi = bands[k]; dd = np.linalg.norm(rp - c2, axis=1); m = (dd >= lo * r) & (dd < hi * r)
                    n_vis = int((m & vis).sum()); n_all = int(m.sum())
                    if n_all: out[k][o_.name] = dict(visible=n_vis, all=n_all)
            for k in out:
                tv = sum(v['visible'] for kk, v in out[k].items() if isinstance(v, dict)); out[k]['visible_per_cm2'] = round(tv / max(out[k]['area_cm2'], 1e-6), 1)
            res[side] = out
        return res
    if os.environ.get('FC_FURDENS'): print('FURDENS', json.dumps(fur_density()), flush=True)
    ig = g('iris_gain', 1.0)
    if ig != 1.0:
        # iris value: the sheet's amber iris is about 1.8x brighter (sRGB) than the groom eye material renders; scale
        # the eye base colour (hue kept, pupil stays near black)
        done_ = set()
        for en in ('eye_l', 'eye_r'):
            eo_ = bpy.data.objects.get(en)
            for m_ in (eo_.data.materials if eo_ else []):
                if m_ is None or m_.name in done_ or not m_.use_nodes: continue
                done_.add(m_.name); nt_ = m_.node_tree
                if 'head p1 iris gain' in nt_.nodes: continue
                for bs_ in [n for n in nt_.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled']:
                    inp = bs_.inputs['Base Color']
                    if inp.links:
                        src_ = inp.links[0].from_socket; sc = nt_.nodes.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'; sc.name = 'head p1 iris gain'
                        sc.inputs['Scale'].default_value = ig; nt_.links.new(src_, sc.inputs[0]); nt_.links.new(sc.outputs['Vector'], inp)
                    else:
                        inp.default_value = [min(1.0, x * ig) for x in inp.default_value[:3]] + [1.0]
        log['iris_gain'] = dict(gain=ig, materials=sorted(done_))
    # ---- nose pad, nostrils, split lip (separate rigid parts on head_01; the body topology is untouched)
    Mb_ = np.array(body.matrix_world); BV = np.array([v.co[:] for v in body.data.vertices]) @ Mb_[:3, :3].T + Mb_[:3, 3]
    a_ = ht - hh; u_ = np.clip(((BV - hh) @ a_) / (a_ @ a_), 0, 1); dhb = np.linalg.norm(BV - (hh + u_[:, None] * a_), axis=1)
    HV = BV[dhb < 0.07]; tip = HV[np.argmin(HV[:, 1])]
    blk = HV[HV[:, 1] < tip[1] + g('block_depth_m', 0.006)]
    ex = (blk[:, 0].max() - blk[:, 0].min()) / 2; ez = (blk[:, 2].max() - blk[:, 2].min()) / 2; cz = (blk[:, 2].max() + blk[:, 2].min()) / 2
    padm = mat('Head p1 nose pad', g('nose_rgb', (0.16, 0.085, 0.082)), 0.42)
    nm = mat('Head p1 nostril', (0.012, 0.009, 0.009), 0.6)
    pc = np.array([tip[0], tip[1] + g('pad_back_m', 0.0022), cz + g('pad_up_m', 0.0)])
    prad = np.array([ex * g('pad_w', 1.08), g('pad_depth_m', 0.0055), ez * g('pad_h', 1.0)])
    V_, F_ = ellipsoid(pc, np.eye(3), prad, 32, 16)
    # cat-nose shape: wider at the top, narrowing to a rounded point at the bottom (tri_k), top edge flattened
    tk = g('pad_tri_k', 0.0); fl = g('pad_flat_top', 0.0); V2 = []
    for v_ in V_:
        q = v_ - pc; uz = q[2] / prad[2]
        q[0] *= (1 + tk * uz) / (1 + tk * 0.3)
        if uz > 0: q[2] *= 1 - fl * uz ** 2
        else: q[2] *= 1 + 0.5 * tk * (-uz) ** 2
        V2.append(pc + q)
    add_obj('head_nose_pad', V2, F_, padm)
    for sx in (-1, 1):
        nc = pc + np.array([sx * prad[0] * g('nostril_x', 0.42), -prad[1] * 0.9, -prad[2] * g('nostril_z', 0.25)])
        if g('nostril_on_surface', 0):
            # sit the nostril on the (warped) pad surface so only a shallow dark slit shows, not a bead
            uz_ = -g('nostril_z', 0.25); wx_ = (1 + tk * uz_) / (1 + tk * 0.3); xu_ = g('nostril_x', 0.42) / max(wx_, 1e-3)
            nc[1] = pc[1] - prad[1] * math.sqrt(max(0.0, 1 - xu_ ** 2 - uz_ ** 2))
        ang = math.radians(sx * g('nostril_tilt_deg', 28))
        Rz = np.array([[math.cos(ang), 0, -math.sin(ang)], [0, 1, 0], [math.sin(ang), 0, math.cos(ang)]])
        V_, F_ = ellipsoid(nc, Rz, np.array([prad[0] * g('nostril_w', 0.26), g('nostril_depth_m', 0.0012), prad[2] * g('nostril_h', 0.16)]), 16, 8)
        # comma: bend the nostril so its lower end curls outward
        cb = g('nostril_curl', 0.0); V3 = []
        for v_ in V_:
            q = v_ - nc; lz = (Rz.T @ q)[2] / (prad[2] * g('nostril_h', 0.16) + 1e-9)
            V3.append(v_ + np.array([sx * cb * prad[0] * 0.15 * max(0.0, -lz) ** 2, 0, 0]))
        add_obj('head_nostril_' + ('l' if sx > 0 else 'r'), V3, F_, nm)
    if g('lip_mode', 'skin') == 'skin':
        # philtrum and the two upper-lip curves, laid on the skin by ray casting from the front
        zb = pc[2] - prad[2] * (1 + 0.5 * tk) * 0.92; zm = cz - ez * g('mouth_z_frac', 0.9)
        def on_skin(x, z):
            h_, n_ = body_ray(np.array([x, tip[1] - 0.04, z]), np.array([0.0, 1.0, 0.0]), 0.12)
            return None if h_ is None else h_ + n_ * g('lip_lift_m', 0.0002)
        ph_pts = [on_skin(tip[0], zb + (zm - zb) * t) for t in np.linspace(0, 1, 7)]
        ph_pts = [p for p in ph_pts if p is not None]
        lines = [ph_pts]
        mw_ = g('mouth_w_m', 0.009); md_ = g('mouth_drop_m', 0.0025)
        for sx in (-1, 1):
            q = [on_skin(tip[0] + sx * mw_ * u, zm - md_ * math.sin(u * math.pi * 0.75) + g('mouth_up_m', 0.0) * u ** 2) for u in np.linspace(0, 1, 9)]
            lines.append([p for p in q if p is not None])
        for li, pts in enumerate(lines):
            if len(pts) < 2: continue
            pts = [np.array(p) for p in pts]; sa, sb = [], []
            for i in range(len(pts)):
                t_ = pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]; t_ /= np.linalg.norm(t_)
                ref = np.array([0.0, -1.0, 0.0]); s1 = np.cross(t_, ref); s1 /= np.linalg.norm(s1); s2 = np.cross(s1, t_)
                sa.append(s1); sb.append(s2)
            Vt, Ft = tube(pts, g('lip_r_m', 0.00045), g('lip_r_m', 0.00045) * 0.6, sa, sb, False, 8)
            add_obj('head_lip_' + ('split', 'r', 'l')[li], Vt, Ft, nm)
        log['lip'] = dict(philtrum_pts=len(ph_pts), philtrum_mm=round(abs(zb - zm) * 1000, 1))
    else:
        l0 = pc + np.array([0, -prad[1] * 0.6, -prad[2]]); l1 = l0 + np.array([0, g('lip_back_m', 0.002), -g('lip_len_m', 0.007)])
        Vc = []; nseg = 8
        for t_ in (0.0, 1.0):
            cc = l0 + (l1 - l0) * t_
            for j in range(nseg):
                ps = 2 * math.pi * j / nseg; Vc.append(cc + np.array([math.cos(ps) * 0.0006, math.sin(ps) * 0.0006, 0.0]))
        Fc = [[j, (j + 1) % nseg, nseg + (j + 1) % nseg, nseg + j] for j in range(nseg)]
        add_obj('head_lip_split', Vc, Fc, nm)
    log['nose'] = dict(tip=tip.round(4).tolist(), pad_radii_mm=(prad * 1000).round(1).tolist())
    # ---- horns: wavy irregular ridges (bump on the shading normal) and bronze crest glints; geometry untouched
    for hn in ('horn_l', 'horn_r'):
        ho = bpy.data.objects.get(hn)
        if ho is None or 'horn_tip' not in ho.data.attributes: continue
        for m_ in ho.data.materials:
            nt_ = m_.node_tree
            if 'head p1 ridge' in nt_.nodes: continue
            bs_ = next(n for n in nt_.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
            tipa = nt_.nodes.new('ShaderNodeAttribute'); tipa.attribute_name = 'horn_tip'; tipa.attribute_type = 'GEOMETRY'
            cra = nt_.nodes.new('ShaderNodeAttribute'); cra.attribute_name = 'horn_crest'; cra.attribute_type = 'GEOMETRY'
            tc = nt_.nodes.new('ShaderNodeTexCoord'); nz = nt_.nodes.new('ShaderNodeTexNoise')
            nz.inputs['Scale'].default_value = g('ridge_noise_scale', 14.0); nz.inputs['Detail'].default_value = 3.0
            nt_.links.new(tc.outputs['Generated'], nz.inputs['Vector'])
            m1 = nt_.nodes.new('ShaderNodeMath'); m1.operation = 'MULTIPLY'; m1.inputs[1].default_value = g('ridge_freq', 70.0)
            nt_.links.new(tipa.outputs['Fac'], m1.inputs[0])
            m2 = nt_.nodes.new('ShaderNodeMath'); m2.operation = 'MULTIPLY_ADD'; m2.inputs[1].default_value = g('ridge_wave', 2.2)
            nt_.links.new(nz.outputs['Fac'], m2.inputs[0]); nt_.links.new(m1.outputs[0], m2.inputs[2])
            m3 = nt_.nodes.new('ShaderNodeMath'); m3.operation = 'MULTIPLY'; m3.inputs[1].default_value = 2 * math.pi
            nt_.links.new(m2.outputs[0], m3.inputs[0])
            sn = nt_.nodes.new('ShaderNodeMath'); sn.operation = 'SINE'; nt_.links.new(m3.outputs[0], sn.inputs[0])
            rg = nt_.nodes.new('ShaderNodeMapRange'); rg.name = 'head p1 ridge'
            rg.inputs['From Min'].default_value = -1.0; rg.inputs['From Max'].default_value = 1.0
            nt_.links.new(sn.outputs[0], rg.inputs['Value'])
            bmp = nt_.nodes.new('ShaderNodeBump'); bmp.inputs['Strength'].default_value = g('ridge_bump', 0.45); bmp.inputs['Distance'].default_value = 0.0015
            hgt = nt_.nodes.new('ShaderNodeMath'); hgt.operation = 'ADD'
            nt_.links.new(rg.outputs['Result'], hgt.inputs[0]); nt_.links.new(cra.outputs['Fac'], hgt.inputs[1])
            nt_.links.new(hgt.outputs[0], bmp.inputs['Height']); nt_.links.new(bmp.outputs['Normal'], bs_.inputs['Normal'])
            gl = nt_.nodes.new('ShaderNodeMath'); gl.operation = 'MULTIPLY'
            nt_.links.new(rg.outputs['Result'], gl.inputs[0]); nt_.links.new(cra.outputs['Fac'], gl.inputs[1])
            if g('glint_break', 0.0) > 0:
                # broken glints: a second, finer noise lets the bronze catch only in patches along each crest
                nb2 = nt_.nodes.new('ShaderNodeTexNoise'); nb2.inputs['Scale'].default_value = g('glint_break_scale', 45.0); nb2.inputs['Detail'].default_value = 2.0
                nt_.links.new(tc.outputs['Generated'], nb2.inputs['Vector'])
                br = nt_.nodes.new('ShaderNodeMapRange'); br.inputs['From Min'].default_value = 0.5 - g('glint_break', 0.5) * 0.12
                br.inputs['From Max'].default_value = 0.5 + g('glint_break', 0.5) * 0.12
                nt_.links.new(nb2.outputs['Fac'], br.inputs['Value'])
                gl2 = nt_.nodes.new('ShaderNodeMath'); gl2.operation = 'MULTIPLY'
                nt_.links.new(gl.outputs[0], gl2.inputs[0]); nt_.links.new(br.outputs['Result'], gl2.inputs[1]); gl = gl2
            gm = nt_.nodes.new('ShaderNodeMapRange'); gm.inputs['From Min'].default_value = g('glint_from', 0.45); gm.inputs['From Max'].default_value = 1.0
            gm.inputs['To Min'].default_value = 0.0; gm.inputs['To Max'].default_value = g('glint_mix', 0.7)
            nt_.links.new(gl.outputs[0], gm.inputs['Value'])
            src_ = bs_.inputs['Base Color'].links[0].from_socket
            mx = nt_.nodes.new('ShaderNodeMixRGB'); mx.blend_type = 'MIX'; mx.inputs['Color2'].default_value = list(g('bronze_rgb', (0.30, 0.17, 0.07))) + [1.0]
            nt_.links.new(gm.outputs['Result'], mx.inputs['Fac']); nt_.links.new(src_, mx.inputs['Color1']); nt_.links.new(mx.outputs['Color'], bs_.inputs['Base Color'])
            mt = nt_.nodes.new('ShaderNodeMath'); mt.operation = 'MULTIPLY_ADD'; mt.inputs[1].default_value = 0.55; mt.inputs[2].default_value = 0.16
            nt_.links.new(gm.outputs['Result'], mt.inputs[0]); nt_.links.new(mt.outputs[0], bs_.inputs['Metallic'])
        log['horn_' + hn] = 'ridges and glints'
    APLOG.pop('SKBVH', None); appeal_eye_material(); appeal_measure(); log['appeal'] = APLOG
    print('APPEAL', json.dumps(APLOG), flush=True)
    print('HEAD detail', json.dumps(log), flush=True)


with bpy.data.libraries.load(GROOM, link=False) as (src, dst):
    names = list(src.objects)
    SURF = os.environ.get('FC_SURFACE', '0') == '1'
    keep = ('Plume', 'Luceras', 'Pass7', 'Eyelid', 'luceras_blockout', 'lookdev_', 'luceras_plume_spine') + (('horn_', 'eye_', 'groom_cornea', 'fore_claw', 'hind_claw', 'fore_dewclaw') if SURF else ())
    dst.objects = [n for n in src.objects if n.startswith(keep)]
    dst.worlds = list(src.worlds)
objs = [o for o in dst.objects if o]
if PROBE:
    print('PROBE groom objects', names)
    print('PROBE imported', [(o.name, o.type, [m.type for m in getattr(o, 'modifiers', [])]) for o in objs])
    print('PROBE clip objects', [(o.name, o.type) for o in s.objects])
    print('PROBE actions', [a.name for a in bpy.data.actions])
gbody = [o for o in objs if o.type == 'MESH' and o.name.startswith('luceras_blockout')][0]
SURFLOG = {}
if SURF:
    # surface pass (fur 1): the clip's horns, eyes and claws carry clay materials; give them the groom's approved
    # materials (dark ridged horn, amber eye, dark claws) and add the groom's clear cornea over each eye
    for p_ in rig.pose.bones: p_.rotation_quaternion = (1, 0, 0, 0); p_.location = (0, 0, 0); p_.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    gsurf = {o.name.split('.')[0]: o for o in objs if o.type == 'MESH' and o.name.startswith(('horn_', 'eye_', 'groom_cornea', 'fore_claw', 'hind_claw', 'fore_dewclaw'))}
    for nm, go_ in gsurf.items():
        if nm.startswith('groom_cornea'):
            ce = bpy.data.objects.get(nm.replace('groom_cornea_', ''))
            if ce is None: continue
            co = ce.copy(); co.data = ce.data.copy(); co.name = 'surface_cornea_' + ce.name; s.collection.objects.link(co)
            ge = gsurf.get(nm.replace('groom_cornea_', ''))   # the groom's own eye shares the cornea's parent bone
            Mi = (ge.matrix_world.inverted() @ go_.matrix_world) if ge is not None else (ce.matrix_world.inverted() @ go_.matrix_world)
            gv = [Mi @ v.co for v in go_.data.vertices]
            if len(gv) == len(co.data.vertices):
                for v, c_ in zip(co.data.vertices, gv): v.co = c_
            co.data.materials.clear(); [co.data.materials.append(m_) for m_ in go_.data.materials]
            SURFLOG[co.name] = [m_.name for m_ in go_.data.materials]; continue
        tgt = bpy.data.objects.get(nm)
        if tgt is None or tgt is go_: continue
        tgt.data.materials.clear(); [tgt.data.materials.append(m_) for m_ in go_.data.materials]
        for k_ in [a_.name for a_ in go_.data.attributes if not a_.name.startswith('.') and a_.name not in tgt.data.attributes and a_.domain == 'POINT' and len(a_.data) == len(tgt.data.vertices) and a_.data_type == 'FLOAT']:
            v_ = np.empty(len(tgt.data.vertices), np.float32); go_.data.attributes[k_].data.foreach_get('value', v_); tgt.data.attributes.new(k_, 'FLOAT', 'POINT').data.foreach_set('value', v_)
        SURFLOG[nm] = [m_.name for m_ in go_.data.materials]
    # fur 2: larger eyes (eye and cornea scaled about the eyeball centre) and darker horn tips
    esc = float(os.environ.get('FC_EYE_SCALE', '1.0'))
    if esc != 1.0:
        for nm in ('eye_l', 'eye_r'):
            for on in (nm, 'surface_cornea_' + nm):
                o_ = bpy.data.objects.get(on)
                if o_ is None: continue
                V_ = np.array([v.co[:] for v in o_.data.vertices]); c_ = np.array([v.co[:] for v in bpy.data.objects[nm].data.vertices]).mean(0)
                V_ = c_ + (V_ - c_) * esc
                for v, x in zip(o_.data.vertices, V_): v.co = x.tolist()
        SURFLOG['eye_scale'] = esc
    htd = float(os.environ.get('FC_HORN_TIP_DARK', '1.0'))
    if htd != 1.0:
        hb = np.array(rig.matrix_world @ rig.pose.bones['head_01'].head)
        for nm in ('horn_l', 'horn_r'):
            o_ = bpy.data.objects.get(nm)
            if o_ is None: continue
            Mo = np.array(o_.matrix_world); V_ = np.array([v.co[:] for v in o_.data.vertices]) @ Mo[:3, :3].T + Mo[:3, 3]
            base = V_[np.argmin(np.linalg.norm(V_ - hb, axis=1))]; dd_ = np.linalg.norm(V_ - base, axis=1); t_ = (dd_ / dd_.max()).astype(np.float32)
            if 'horn_tip' in o_.data.attributes: o_.data.attributes.remove(o_.data.attributes['horn_tip'])
            o_.data.attributes.new('horn_tip', 'FLOAT', 'POINT').data.foreach_set('value', t_)
            for m_ in o_.data.materials:
                nt_ = m_.node_tree; bs_ = next(n for n in nt_.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
                if 'horn tip dark' in nt_.nodes: continue
                src_ = bs_.inputs['Base Color'].links[0].from_socket
                at_ = nt_.nodes.new('ShaderNodeAttribute'); at_.attribute_name = 'horn_tip'; at_.attribute_type = 'GEOMETRY'
                mr_ = nt_.nodes.new('ShaderNodeMapRange'); mr_.inputs['From Min'].default_value = 0.55; mr_.inputs['From Max'].default_value = 1.0
                mr_.inputs['To Min'].default_value = 1.0; mr_.inputs['To Max'].default_value = htd
                mx_ = nt_.nodes.new('ShaderNodeVectorMath'); mx_.operation = 'SCALE'; mx_.name = 'horn tip dark'
                nt_.links.new(at_.outputs['Fac'], mr_.inputs['Value']); nt_.links.new(src_, mx_.inputs[0]); nt_.links.new(mr_.outputs['Result'], mx_.inputs['Scale'])
                nt_.links.new(mx_.outputs['Vector'], bs_.inputs['Base Color'])
        SURFLOG['horn_tip_dark'] = htd
    print('SURFACE materials', json.dumps(SURFLOG), flush=True)
    if os.environ.get('FC_HEAD', '0') == '1':
        head_detail()
gproxy = next((o for o in objs if o.type == 'MESH' and o.name.startswith('luceras_plume_spine')), None)
curves = [o for o in objs if o.type == 'CURVES']
rig.animation_data_create(); rig.animation_data.action = None; rig.location = (0, 0, 0); bpy.context.view_layer.update()
mw = body.matrix_world.copy()
# the groom's plume proxy follows the clip rig
if gproxy is not None:
    s.collection.objects.link(gproxy); gpmw = gproxy.matrix_world.copy(); gproxy.parent = rig; gproxy.matrix_parent_inverse = rig.matrix_world.inverted(); gproxy.matrix_world = gpmw
    for m in gproxy.modifiers:
        if m.type == 'ARMATURE': m.object = rig
    gproxy.hide_render = True
    if old_proxy is not None: old_proxy.hide_render = True
proxy = gproxy or old_proxy
# pass 10b (D-2mcv): the pass 12 groom rebuilt the plume spine proxy and weighted its extension rigidly to tail_06
# (with a tail_05 share), so the plume follows tail_06 and its own rest curl instead of the posed plume bones
# tail_07..tail_09. FC_PLUME_CHAIN=1 reweights the extension along tail_06..tail_09 the way tailflight_rig.py did for
# the pass 9 tube (linear between bone midpoints along the arc; the sculpt part keeps its weights). Bone midpoints are
# found on the pass 12 spine by nearest point, so the rest look (rest pose = no deformation) is unchanged.
PLUME_CHAIN = os.environ.get('FC_PLUME_CHAIN', '0') == '1'
_sp = np.load(str(Path(GROOM).parent / 'plume_spine.npz')); SP_S, SP_A = _sp['S'], _sp['a']
_pb = json.loads((Path(GROOM).parent / 'plume_build.json').read_text())['spine']
K_RING = 10


def ring_arc():
    return np.r_[np.repeat(SP_A, K_RING), SP_A[-1]]


def arc_of_point(p):
    return float(SP_A[int(np.argmin(np.linalg.norm(SP_S - np.array(p), axis=1)))])


if gproxy is not None and PLUME_CHAIN and all(f'tail_0{i}' in rig.data.bones for i in (6, 7, 8, 9)):
    M = np.array(gproxy.matrix_world.inverted() @ rig.matrix_world)
    def loc(v): return (M[:3, :3] @ np.array(v) + M[:3, 3]).tolist()
    bones_ = rig.data.bones; names = ('tail_06', 'tail_07', 'tail_08', 'tail_09')
    mids = [arc_of_point(loc((np.array(bones_[n].head_local) + np.array(bones_[n].tail_local)) / 2)) for n in names]
    va = ring_arc(); gi = {g.index: g.name for g in gproxy.vertex_groups}
    W0 = [{gi[g.group]: g.weight for g in v.groups if g.weight > 0} for v in gproxy.data.vertices]
    mesh_arc = _pb['on_sculpt_m']; W = []
    for w, x in zip(W0, va):
        if x <= mesh_arc: W.append(dict(w)); continue
        if x <= mids[0]: W.append({'tail_06': 1.0}); continue
        if x >= mids[-1]: W.append({names[-1]: 1.0}); continue
        k = int(np.searchsorted(mids, x)) - 1; u = (x - mids[k]) / (mids[k + 1] - mids[k]); W.append({names[k]: 1.0 - u, names[k + 1]: u})
    for g in list(gproxy.vertex_groups): gproxy.vertex_groups.remove(g)
    vg = {}
    for i, w in enumerate(W):
        for k_, x in w.items():
            if x <= 1e-6: continue
            if k_ not in vg: vg[k_] = gproxy.vertex_groups.new(name=k_)
            vg[k_].add([i], float(x), 'REPLACE')
    print('PLUMECHAIN mids', [round(m, 3) for m in mids], 'sculpt arc', round(mesh_arc, 3), 'tip arc', round(float(SP_A[-1]), 3), flush=True)


def plume_axis_angle():
    """Angle (deg) between the plume's central axis and the posed tail_07..tail_09 chain (tail_07 head to tail_09 tail).
    Axis: centre of the proxy ring at the tail_06 tip (where the plume bones begin) to the centre of the last ring
    (the strand bundle's root line, which every plume strand is bound to); also the whole plume from its first strand
    ring (plume start arc). World space, evaluated."""
    dg = bpy.context.evaluated_depsgraph_get(); pe = proxy.evaluated_get(dg); W_ = np.array(pe.matrix_world)
    pv = arr(pe.data.vertices, 'co') @ W_[:3, :3].T + W_[:3, 3]
    nr = (len(pv) - 1) // K_RING; rc = pv[:nr * K_RING].reshape(nr, K_RING, 3).mean(1)
    Rw = rig.matrix_world; pbn = rig.pose.bones
    h7 = np.array(Rw @ pbn['tail_07'].head); t9 = np.array(Rw @ pbn['tail_09'].tail); ch = t9 - h7
    Mi = np.array(proxy.matrix_world.inverted() @ rig.matrix_world)
    t6 = arc_of_point((Mi[:3, :3] @ np.array(rig.data.bones['tail_06'].tail_local) + Mi[:3, 3]).tolist())
    i6 = int(np.argmin(np.abs(SP_A[:nr] - t6))); i0 = int(np.argmin(np.abs(SP_A[:nr] - _pb['plume_start_arc_m'])))
    def a(u, v): return round(math.degrees(math.acos(max(-1, min(1, float(u @ v / (np.linalg.norm(u) * np.linalg.norm(v))))))), 1)
    return dict(extension=a(rc[-1] - rc[i6], ch), whole=a(rc[-1] - rc[i0], ch), tip=[round(float(x), 5) for x in rc[-1]], mid=[round(float(x), 5) for x in rc[(i6 + nr) // 2]])
assert len(gbody.data.polygons) == len(body.data.polygons) and len(gbody.data.vertices) == len(body.data.vertices), 'body topology differs'
for o in curves:
    s.collection.objects.link(o); o.parent = None; o.matrix_world = mw
    o.data.surface = proxy if o.name.startswith('Plume') else body
    for m in o.modifiers:
        if m.type == 'NODES' and m.node_group:
            for n in m.node_group.nodes:
                if n.bl_idname == 'GeometryNodeObjectInfo':
                    v = n.inputs['Object'].default_value
                    if v == gbody: n.inputs['Object'].default_value = body
for a in gbody.data.attributes:
    if a.name.startswith('.') or a.name in body.data.attributes or a.domain not in ('POINT', 'CORNER', 'FACE') or a.data_type not in ('FLOAT', 'FLOAT_COLOR', 'FLOAT_VECTOR', 'FLOAT2'):
        continue
    key = {'FLOAT_VECTOR': 'vector', 'FLOAT_COLOR': 'color', 'FLOAT2': 'vector'}.get(a.data_type, 'value'); n = {'FLOAT_VECTOR': 3, 'FLOAT_COLOR': 4, 'FLOAT2': 2}.get(a.data_type, 1)
    v = np.empty(len(a.data) * n, np.float32); a.data.foreach_get(key, v)
    body.data.attributes.new(a.name, a.data_type, a.domain).data.foreach_set(key, v)
body.data.materials.clear()
for m in gbody.data.materials: body.data.materials.append(m)
body.data.polygons.foreach_set('material_index', arr(gbody.data.polygons, 'material_index', 1, np.int32)); body.data.update()
for o in objs:
    if o.type == 'LIGHT' or o.name.startswith('lookdev_ground'):
        s.collection.objects.link(o); o.parent = None
if dst.worlds: s.world = dst.worlds[0]
for o in objs:
    if o.name not in s.objects: bpy.data.objects.remove(o)
for o in curves:
    if o.name == 'Plume spine curve': o.hide_render = True; o.hide_viewport = True   # helper, never rendered
for o in curves:
    o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted(); o.matrix_world = mw
s.render.engine = 'CYCLES'; s.cycles.device = 'CPU'; s.render.threads_mode = 'FIXED'; s.render.threads = int(os.environ.get('FUR_THREADS', '6'))
s.cycles.samples = int(os.environ.get('FUR_SAMPLES', '40')); s.cycles.use_denoising = True
try: s.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
s.view_settings.view_transform = 'Standard'
if os.environ.get('FC_STUDIO'):
    # N-vf3n shared studio light (art/pipeline/render/studio_light.py); the side camera sits on the creature's -X side
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'render')); import studio_light
    _sl = studio_light.apply(s, creature_center=(0.0, -0.1, 0.42), facing=(0.0, -1.0, 0.0), camera_side=(-1.0, 0.0, 0.0), overrides=json.loads(os.environ['FC_STUDIO']))
    print('STUDIO', json.dumps(_sl), flush=True)
for _hp in filter(None, os.environ.get('FC_HIDE', '').split(',')):
    for o in s.objects:
        if o.name.startswith(_hp): o.hide_render = True
clay = bpy.data.materials.new('furcheck_clay'); clay.use_nodes = True
bs = clay.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value = (0.62, 0.62, 0.62, 1); bs.inputs['Roughness'].default_value = 0.8
skin_mats = list(body.data.materials)


def set_clay(on):
    for o in curves: o.hide_render = on or o.name == 'Plume spine curve' or o.name.startswith(tuple(filter(None, os.environ.get('FC_HIDE', '').split(','))) or ('__nohide__',))
    for i in range(len(body.data.materials)): body.data.materials[i] = clay if on else skin_mats[i]


bake = json.loads((ANIM / 'work' / 'bake.json').read_text()); specs = bake['specs']['sig.horns-first-descent']
roots = [sp.get('_root', 0.0) for sp in specs]


def pose(kind, f):
    rig.location = (0, 0, 0); rig.rotation_euler = (0, 0, 0)
    # clear every pose channel first: offsets added on top of a pose (carriage, root pitch) must not accumulate on
    # channels the action does not key
    for pb_ in rig.pose.bones:
        pb_.rotation_mode = 'QUATERNION'; pb_.rotation_quaternion = (1, 0, 0, 0); pb_.location = (0, 0, 0); pb_.scale = (1, 1, 1)
    if kind == 'review':
        rig.animation_data.action = bpy.data.actions['review.poses']; s.frame_set(1 + 10 * POSE_ORDER.index(f))
    elif kind in ('tin', 'tout'):
        rig.animation_data.action = bpy.data.actions['sig.horns-first-descent']; s.frame_set(0 if kind == 'tin' else 59)
    else:
        rig.animation_data.action = bpy.data.actions['idle' if kind == 'idle' else 'sig.horns-first-descent']; s.frame_set(f)
    ac = rig.animation_data.action
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    bpy.context.view_layer.update()
    if kind in ('tin', 'tout'): apply_carriage(kind, f, trans_weight(kind, f))
    else: apply_carriage(kind, f)
    if os.environ.get('FC_DEBUG_FEET'):
        W_ = rig.matrix_world
        dg_ = bpy.context.evaluated_depsgraph_get(); mins = {}
        for o_ in s.objects:
            if o_.type in ('MESH', 'CURVES') and not o_.hide_render and not o_.name.startswith(('lookdev', 'Plume spine')):
                e_ = o_.evaluated_get(dg_)
                try:
                    P_ = np.array([e_.matrix_world @ Vector(c) for c in e_.bound_box]); mins[o_.name] = round(float(P_[:, 2].min()), 4)
                except Exception: pass
        eb_ = body.evaluated_get(dg_); m_ = eb_.to_mesh(); Wb_ = np.array(eb_.matrix_world); BVv = np.array([v.co[:] for v in m_.vertices]) @ Wb_[:3, :3].T + Wb_[:3, 3]; eb_.to_mesh_clear()
        print('FEETV', {k: round(float(BVv[np.char.startswith(_DOM.astype(str), k), 2].min()), 4) for k in ('leg_fl', 'leg_fr', 'leg_hl', 'leg_hr')}, flush=True)
        print('FEET', kind, f, {bn: [round(x, 4) for x in (W_ @ rig.pose.bones[bn].tail)] for bn in ('leg_fl_03', 'leg_hl_03', 'leg_hl_02')}, [round(x, 3) for x in rig.matrix_world.to_euler()], flush=True)
    if kind == 'sig':
        # appeal build: the larger head lowers the horn at the hit; a root height offset on the contact frames restores
        # the approved horn-to-target contact (render-time, reported, not baked into the clip)
        dz = (json.loads(os.environ.get('FC_HEAD_PARAMS', '{}')).get('sig_root_dz') or {}).get(str(f), 0.0)
        if dz: rig.location = (rig.location[0], rig.location[1], rig.location[2] + dz); bpy.context.view_layer.update()


TRANS_N = 7


def trans_weight(kind, f):
    """Idle-to-signature transition (appeal build 4): 'tin' frames 0..TRANS_N ease the idle carriage out onto the
    signature's first frame; 'tout' frames 0..TRANS_N ease it back in from the signature's last frame. Returns the share
    of the idle carriage (1 = full idle carriage, 0 = the approved signature pose)."""
    t = min(max(f / TRANS_N, 0.0), 1.0); sm = t * t * (3 - 2 * t)
    return 1.0 - sm if kind == 'tin' else sm


def apply_carriage(kind, f, scale=None):
    # appeal build: rest and idle head and neck carriage as local pitch offsets (bone X axis) on top of the pose
    hp = json.loads(os.environ.get('FC_HEAD_PARAMS', '{}')); car = hp.get('carriage') or {}
    if not car: return
    if scale is None:
        if not ((kind == 'review' and f == 'rest') or kind == 'idle'): return
        scale = 1.0
    from mathutils import Quaternion
    sp = hp.get('stance_pitch_deg', 0.0) * scale
    if sp:
        # pitch the whole pose about the hind paws through the root pose bone (not the object: the fur is placed in
        # object space from the deformed body, so an object rotation would be applied to the strands twice)
        pv = Vector(hp['stance_pivot']); R_ = Matrix.Rotation(math.radians(sp), 4, 'X'); T_ = Matrix.Translation(pv) @ R_ @ Matrix.Translation(-pv)
        Ri = rig.matrix_world.inverted(); Ta = Ri @ T_ @ rig.matrix_world
        pr = rig.pose.bones['root']; pr.matrix = Ta @ pr.matrix; bpy.context.view_layer.update()
    for bn, deg in car.items():
        pb = rig.pose.bones.get(bn)
        if pb is None: continue
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = pb.rotation_quaternion @ Quaternion((1, 0, 0), math.radians(deg * scale))
    bpy.context.view_layer.update()


_gn = [x.name for x in body.vertex_groups]
_W = np.zeros((len(body.data.vertices), len(_gn)), np.float32)
for _v in body.data.vertices:
    for _g in _v.groups: _W[_v.index, _g.group] = _g.weight
_DOM = np.array(_gn)[_W.argmax(1)]
CHEST = np.isin(_DOM, ['neck_01', 'spine_05', 'leg_fl_01', 'leg_fl_02', 'leg_fr_01', 'leg_fr_02', 'scapula_l', 'scapula_r'])
HEADM = np.isin(_DOM, ['head_01', 'jaw_01', 'ear_l_01', 'ear_r_01', 'ear_l_02', 'ear_r_02'])


def body_bounds(mask=None):
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh(); V = arr(m.vertices, 'co'); e.to_mesh_clear()
    W = np.array(body.matrix_world); V = V @ W[:3, :3].T + W[:3, 3]
    if mask is not None: V = V[mask]
    return V.min(0), V.max(0)


cams = {}
def cam_side(name, f, kind):
    cam = cams.get('side') or lookdev.place_camera('furcheck_side', (Vector((-0.2, -0.6, 0.0)), Vector((0.2, 0.6, 0.9))), 270.0, 0.0, 0.05); cams['side'] = cam
    cam.data.ortho_scale = 1.5; cam.data.shift_x = cam.data.shift_y = 0.0
    s.render.resolution_x = 960; s.render.resolution_y = 640; s.render.resolution_percentage = 100; s.camera = cam
    # the rig plays in place here, so the cell camera centres on the posed body (the sprite cell follows the body)
    for o in GROUND: o.hide_render = False
    lo, hi = body_bounds(); cam.location = (cam.location.x, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2)
    # the sprite cell is 1.5 m; widen only when the posed body (plus 10 percent) would not fit the 3:2 frame
    cam.data.ortho_scale = max(1.5, (hi[1] - lo[1]) * 1.1, (hi[2] - lo[2]) * 1.1 * 1.5)
    bpy.context.view_layer.update(); return cam


GROUND = [o for o in s.objects if o.name.startswith('lookdev_ground')]
STUDIO_NO_GROUND = bool(os.environ.get('FC_STUDIO')) and bool(_sl['settings'].get('hide_ground')) if os.environ.get('FC_STUDIO') else False


def cam_oblique(view):
    # oblique and front/back views: fitted to the body (or to the chest), ground hidden when the camera is below it
    az, el, what = OBLIQUE[view]
    for o in GROUND: o.hide_render = el < 0 and not STUDIO_NO_GROUND
    lo, hi = body_bounds(CHEST if what == 'chest' else HEADM if what in ('head', 'face') else None); pad = 0.06 if what == 'chest' else 0.09 if what == 'head' else 0.004 if what == 'face' else 0.03
    cam = lookdev.place_camera('furcheck_' + view, (Vector((lo - pad).tolist()), Vector((hi + pad).tolist())), az, el, 0.05)
    s.render.resolution_x = 960; s.render.resolution_y = 960; s.camera = cam; bpy.context.view_layer.update(); return cam


PLUME_CHECK = os.environ.get('FC_PLUME_CHECK', '1') == '1'


def plume_root_error():
    # plume strand roots against the proxy triangles they are bound to (furmotion pass 2 check), world space, mm
    dg = bpy.context.evaluated_depsgraph_get(); pe = proxy.evaluated_get(dg); W = np.array(pe.matrix_world)
    pv = arr(pe.data.vertices, 'co') @ W[:3, :3].T + W[:3, 3]; out = {}
    for o in curves:
        if not o.name.startswith('Plume') or 'bind_ia' not in o.data.attributes: continue
        ev_ = o.evaluated_get(dg); Wc = np.array(ev_.matrix_world)
        pos = arr(ev_.data.attributes['position'].data, 'vector') @ Wc[:3, :3].T + Wc[:3, 3]
        offs = arr(o.data.curves, 'first_point_index', 1, np.int32)
        if len(pos) != len(arr(o.data.attributes['position'].data, 'vector')): continue
        ids = np.stack([arr(o.data.attributes['bind_i' + c].data, 'value', 1, np.int32) for c in 'abc'], 1)
        bar = np.stack([arr(o.data.attributes['bind_' + c].data, 'value', 1) for c in 'abc'], 1)
        err = np.linalg.norm(pos[offs] - np.einsum('ij,ijk->ik', bar, pv[ids]), axis=1); out[o.name] = round(float(err.max() * 1000), 2)
    return out


# ---- clip mode (pass 9): fur clips with the furmotion pass 2 cameras (side: fixed, fitted to the travel bounds, with the
# opponent post; sidetrack: 2.6 m following the body; idle: side camera in place). FC_CLIP=CLIP:CAM:SIZE:F0:F1:travel|inplace
CLIPCAMS = {'side': (270.0, 0.0), 'sidetrack': (270.0, 0.0)}


def clip_render(spec):
    clip, cam_name, size, f0, f1, mode = spec.split(':'); size = int(size); f0 = int(f0); f1 = int(f1); travel = mode == 'travel'
    meas = json.loads((ANIM / 'work' / 'measure.json').read_text()); cspecs = bake['specs'][clip]; rows = meas[clip]
    lo = np.array([1e9] * 3); hi = -lo
    for r, sp in zip(rows, cspecs):
        b0 = np.array(r['bounds'][0]); b1 = np.array(r['bounds'][1])
        if travel: b0[1] -= sp.get('_root', 0.0); b1[1] -= sp.get('_root', 0.0)
        lo = np.minimum(lo, b0); hi = np.maximum(hi, b1)
    lo[2] = 0.0
    if travel:
        c = meas['hit']['contact_inplace']; root_hit = meas['hit']['root_at_hit_m']; h = max(0.05, c[2]); w = 0.14
        bpy.ops.mesh.primitive_cube_add(size=1.0); o = bpy.context.active_object; o.name = 'lookdev_target'
        o.scale = (0.22, w, h); o.location = (0.0, c[1] - root_hit - w / 2, h / 2)
        o.data.materials.append(lookdev._material('lookdev_target_mat', (0.30, 0.30, 0.30), 0.9))
    az, el = CLIPCAMS[cam_name]; aspect = 1.5
    cam = lookdev.place_camera('furclip_' + cam_name, (Vector(lo), Vector(hi)), az, el, 0.05)
    s.render.resolution_x = size; s.render.resolution_y = int(round(size / aspect / 2) * 2); s.render.resolution_percentage = 100; s.camera = cam
    cam.data.sensor_fit = 'AUTO'; inv = cam.matrix_world.inverted(); xs = []; ys = []
    for i in range(8):
        q = inv @ Vector((hi[0] if i & 1 else lo[0], hi[1] if i & 2 else lo[1], hi[2] if i & 4 else lo[2])); xs.append(q.x); ys.append(q.y)
    w_ = (max(xs) - min(xs)) * 1.1; h_ = (max(ys) - min(ys)) * 1.1
    cam.data.ortho_scale = max(w_, h_ * aspect); cam.data.shift_x = ((max(xs) + min(xs)) / 2) / cam.data.ortho_scale; cam.data.shift_y = ((max(ys) + min(ys)) / 2) / cam.data.ortho_scale
    half_h = None
    if cam_name == 'sidetrack':
        cam.data.shift_x = cam.data.shift_y = 0.0; cam.data.ortho_scale = 2.6; half_h = cam.data.ortho_scale / aspect / 2
    for o in GROUND: o.hide_render = False
    out = OUT / 'frames' / f'{clip}_{cam_name}_{size}_{mode}'; out.mkdir(parents=True, exist_ok=True)
    rig.animation_data.action = bpy.data.actions[clip]
    ac = rig.animation_data.action
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    roots = [sp.get('_root', 0.0) for sp in cspecs]; perr = {}
    for f in range(f0, f1 + 1):
        s.frame_set(f); rig.location = (0, -roots[f] if travel else 0.0, 0)
        if cam_name == 'sidetrack':
            wf, wz = cspecs[f].get('_world_body', (cspecs[f]['body'][0], cspecs[f]['body'][1])); bf = wf if travel else cspecs[f]['body'][0]
            cam.location = (cam.location.x, C0.y - bf - 0.06, max(half_h - 0.06, C0.z + wz + 0.1))
        bpy.context.view_layer.update()
        if f % 5 == 0: perr[f] = plume_root_error()
        s.render.filepath = str(out / f'{f:04d}.png'); bpy.ops.render.render(write_still=True); print('CLIP', clip, cam_name, f, flush=True)
    json.dump(dict(camera=dict(az=az, el=el, ortho_scale=cam.data.ortho_scale), plume_root_error_mm=perr, frames=[f0, f1]), open(out / 'camera.json', 'w'), indent=1)
    print('CLIP done', clip, cam_name, flush=True)


if os.environ.get('FC_SAVE'):
    # the scene of record: clip rig and actions, groom fur and materials, plume chain, lights and the sprite camera
    rig.animation_data.action = bpy.data.actions['sig.horns-first-descent']; s.frame_set(0); rig.location = (0, 0, 0)
    cam_ = lookdev.place_camera('sprite_side_camera', (Vector((-0.2, -0.75, 0.0)), Vector((0.2, 0.75, 1.0))), 270.0, 0.0, 0.05)
    cam_.data.ortho_scale = 1.5; s.camera = cam_; s.render.resolution_x = 960; s.render.resolution_y = 640
    s['scene_of_record'] = 'Luceras sprites: h1 rig with the pass 10 clips, groom ' + GROOM + ', surface fur 1 materials, plume chain (tail_06..tail_09); sprite_side_camera is the 1.5 m side cell (re-centre on the body per frame as reskin_furcheck.py cam_side does)'
    bpy.ops.wm.save_as_mainfile(filepath=os.environ['FC_SAVE'], compress=True); print('SAVED', os.environ['FC_SAVE'], flush=True); sys.exit(0)


if os.environ.get('FC_MEASURE'):
    out = {}
    for clip, n in (('sig.horns-first-descent', 60), ('idle', 89)):
        rig.animation_data.action = bpy.data.actions[clip]; ac = rig.animation_data.action
        if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
        rig.location = (0, 0, 0); out[clip] = {}
        for f in range(0, n + 1):
            s.frame_set(f); bpy.context.view_layer.update(); r = plume_axis_angle(); r['root_err_mm'] = max([v for k_, v in plume_root_error().items() if k_ != 'Plume spine curve'] or [0]); out[clip][f] = r
            print('AXIS', clip, f, r, flush=True)
    rig.animation_data.action = None; g_ = None
    for pbn in rig.pose.bones: pbn.rotation_quaternion = (1, 0, 0, 0); pbn.location = (0, 0, 0); pbn.scale = (1, 1, 1)
    bpy.context.view_layer.update(); out['rest'] = plume_axis_angle(); print('AXIS rest', out['rest'], flush=True)
    OUT.mkdir(parents=True, exist_ok=True); json.dump(out, open(OUT / f'axis_{LABEL}.json', 'w'), indent=1); print('MEASURE done', flush=True); sys.exit(0)


if os.environ.get('FC_CLIP'):
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in os.environ['FC_CLIP'].split(','): clip_render(spec)
    sys.exit(0)


OUT.mkdir(parents=True, exist_ok=True); done = {}
if PROBE:
    pose('sig', 16); print('PROBE bounds f16', [x.tolist() for x in body_bounds()]); print('PROBE curves', [(o.name, len(o.data.curves)) for o in curves]); sys.exit(0)
for kind, f in FRAMES:
    tag = f if kind == 'review' else f'{kind}_f{f:02d}'
    pose(kind, f)
    if PLUME_CHECK: print('PLUME', tag, plume_root_error(), flush=True)
    vlist = VIEWS + [v for v in EXTRA.get(tag, []) if v not in VIEWS]
    for vname in vlist:
        if vname == 'side':
            cam_side('side', f, kind)
            if os.environ.get('FC_DEBUG_FEET'): print('CAM', s.camera.name, s.camera.parent, [round(x, 4) for x in s.camera.matrix_world.to_euler()], s.camera.data.ortho_scale, flush=True)
        else: cam_oblique(vname)
        for clay_on in ((False,) if os.environ.get('FC_NOCLAY') == '1' else (False, True)):
            set_clay(clay_on); bpy.context.view_layer.update()
            p = OUT / f'{LABEL}_{tag}_{vname}_{"clay" if clay_on else "fur"}.png'
            s.render.filepath = str(p); bpy.ops.render.render(write_still=True); done[str(p.name)] = True
            print('RENDER', p.name, flush=True)
        set_clay(False)
json.dump(done, open(OUT / f'{LABEL}_renders.json', 'w'), indent=1); print('FURCHECK done', LABEL, len(done), flush=True)
