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
           'back': (180.0, 0.0, 'body'), 'front': (0.0, 0.0, 'body'), 'head': (35.0, 4.0, 'head'), 'head_front': (0.0, 4.0, 'head'), 'head_side': (270.0, 4.0, 'head'), 'face': (35.0, 4.0, 'face'), 'face_front': (0.0, 4.0, 'face'), 'face_side': (270.0, 4.0, 'face')}


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
            TBs = np.array([np.mean(TB[[(i + j) % nph for j in range(-2, 3)]]) for i in range(nph)])
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
        EYEOPEN[side] = (c2, r, a, upv, rtv, TE)
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
    EYEOPEN = {}; BUILD = {}
    def hide_strands_in_openings():
        """Strands whose points reach into the visible eye opening (deeper than lid_fur_margin_m past the lid edge) get
        zero radius, so fur may lie over the lid edge but never hangs in front of the iris. Whiskers are left alone."""
        out = {}; mg = g('lid_fur_margin_m', 0.0015)
        for o_ in objs:
            if o_.type != 'CURVES' or 'whisker' in o_.name.lower() or o_.name.startswith('Plume'): continue
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
    if EYEOPEN and g('hide_opening_fur', 1): log['strands_hidden_in_eye_openings'] = hide_strands_in_openings()
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
            q = [on_skin(tip[0] + sx * mw_ * u, zm - md_ * math.sin(u * math.pi * 0.75)) for u in np.linspace(0, 1, 9)]
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
clay = bpy.data.materials.new('furcheck_clay'); clay.use_nodes = True
bs = clay.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value = (0.62, 0.62, 0.62, 1); bs.inputs['Roughness'].default_value = 0.8
skin_mats = list(body.data.materials)


def set_clay(on):
    for o in curves: o.hide_render = on or o.name == 'Plume spine curve'
    for i in range(len(body.data.materials)): body.data.materials[i] = clay if on else skin_mats[i]


bake = json.loads((ANIM / 'work' / 'bake.json').read_text()); specs = bake['specs']['sig.horns-first-descent']
roots = [sp.get('_root', 0.0) for sp in specs]


def pose(kind, f):
    rig.location = (0, 0, 0)
    if kind == 'review':
        rig.animation_data.action = bpy.data.actions['review.poses']; s.frame_set(1 + 10 * POSE_ORDER.index(f))
    else:
        rig.animation_data.action = bpy.data.actions['sig.horns-first-descent']; s.frame_set(f)
    ac = rig.animation_data.action
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
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


def cam_oblique(view):
    # oblique and front/back views: fitted to the body (or to the chest), ground hidden when the camera is below it
    az, el, what = OBLIQUE[view]
    for o in GROUND: o.hide_render = el < 0
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
    tag = f if kind == 'review' else f'sig_f{f:02d}'
    pose(kind, f)
    if PLUME_CHECK: print('PLUME', tag, plume_root_error(), flush=True)
    vlist = VIEWS + [v for v in EXTRA.get(tag, []) if v not in VIEWS]
    for vname in vlist:
        if vname == 'side': cam_side('side', f, kind)
        else: cam_oblique(vname)
        for clay_on in (False, True):
            set_clay(clay_on); bpy.context.view_layer.update()
            p = OUT / f'{LABEL}_{tag}_{vname}_{"clay" if clay_on else "fur"}.png'
            s.render.filepath = str(p); bpy.ops.render.render(write_still=True); done[str(p.name)] = True
            print('RENDER', p.name, flush=True)
        set_clay(False)
json.dump(done, open(OUT / f'{LABEL}_renders.json', 'w'), indent=1); print('FURCHECK done', LABEL, len(done), flush=True)
