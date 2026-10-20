"""B-9cvs: Luceras paws built from a skeleton outward (pass 5 of the paw part).

Each digit is one bone chain: the phalanges (pass 4's toe curve from the claw tip up to the knuckle and the joint just
behind it) continue without a break into a metatarsal that runs back over the foot and up the front of the shin,
converging toward the ankle. The skin is one implicit field: a smooth union of tapered capsules around every chain,
a soft foot mass that fills between the metatarsals (its top held a little below the ridge tops, so the bones show as
ridges with shallow valleys), the leg (sculpt surface at the join, elliptic tube below it), the arch and toe pads,
the main pad, the toe grooves, the heel lift and the flat sole. The leg tube shrinks a little below the join so the
bones carry the top of the foot; at the join it is the sculpt's round leg section.

This script evaluates the field on a dense grid and writes GRID.npz (field, origin, voxel size) plus the paw frames and
claws. paw_part_vdb.py then meshes the field once with OpenVDB inside Blender (FloatGrid.convertToQuads) and hands the
mesh to paw_part_blend.py (voxel remesh to about 1 mm edges, weld ring, clay renders).

Usage: python paw_part_skel.py BASE.npz PARAMS.json OUT_GRID.npz
"""
import sys, json, numpy as np
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import paw_part_build as PB
from paw_part_build import smin, smax, sstep, catmull, tube, ellipsoid_d, claw_frame, rot_between

MM = 0.001


class SkelPaw(PB.Paw):
    def __init__(s, kind, P, base):
        super().__init__(kind, P, base)
        s.bones = s.make_bones()

    def leg_axis_at_z(s, z):
        """Point on the leg axis at height z."""
        t = (z - s.cut[2]) / s.a[2]; return s.cut + t * s.a

    def make_bones(s):
        """One chain per digit: phalanges (pass 4 toe curve points 0..joint) then metatarsal control points.
        Metatarsal params (p['meta']):
          joint: index of the digit curve point that is the metatarsophalangeal joint (under the back of the knuckle dome)
          flat: [[u_mm_behind_tip, top_mm, r_mm, sq], ...] points over the foot: top of the bone at top_mm, lateral position
                v = v_joint * sq + (1 - sq) * v_leg (v_leg = lateral of the leg axis at the ground)
          shin: [[z_mm, r_mm, bump_mm, sq], ...] points up the front of the shin: lateral offset w = v_joint * sq from the
                leg axis, bone surface bump_mm proud of the leg tube (negative = buried, the round ankle)
        Radii in mm (not scaled); u and top are scaled by the paw size like the pass 4 tables."""
        p = s.p; m = p['meta']; dg = p['digits']; S = s.S; out = []
        vleg = (s.heel - s.O) @ s.l
        # lateral axis across the shin front and the forward normal of the shin (perpendicular to the leg axis, in the f-z plane mostly)
        nf = s.f - (s.f @ s.a) * s.a; nf /= np.linalg.norm(nf)
        el = np.cross(s.a, nf); el /= np.linalg.norm(el)
        if el @ s.l < 0: el = -el
        Rt = 0.5 * (s.sec_a + s.sec_b)
        for i, D in enumerate(s.digits):
            sc = dg['scale'][i] * S; v0 = D['v']; spl = np.radians(dg['splay_deg'][i]); f2 = D['f']
            def W(uu, zz): return D['tip'] + f2 * (uu * sc * MM) + np.array([0, 0, 1.0]) * (zz * sc * MM)
            cv = dg['curve'][:m['joint'] + 1]
            pts = [W(u, z) for u, z, r in cv]; rad = [r * sc * MM for u, z, r in cv]
            rad[-1] *= m.get('joint_r_scale', 1.0)   # the joint behind the knuckle dome is narrower than the dome
            # lateral of this digit's joint, measured in the paw frame
            vj = (pts[-1] - s.O) @ s.l
            osc = m.get('outer_r_scale', 1.0) if i in (0, 3) else 1.0
            oz = m.get('outer_top_drop', 0.0) if i in (0, 3) else 0.0
            for u, top, r, sq in m['flat']:
                v = vj * sq + (1 - sq) * vleg; rr = r * osc * MM
                if i in (1, 2): v += np.sign(vj) * m.get('mid_spread_mm', 0.0) * MM   # keep the middle pair from fusing into one crease
                c = s.O + s.f * (u * S * MM) + s.l * v + np.array([0, 0, top * S * MM - oz * MM - rr])
                pts.append(c); rad.append(rr)
            for z, r, bump, sq in m['shin']:
                A = s.leg_axis_at_z(z * MM); w = vj * sq * el
                rr = r * osc * MM; d = Rt * (1 + p['leg_flare'] * 0.0) - rr + bump * MM
                fw = np.sqrt(max(d * d - (vj * sq) ** 2, 1e-8))
                pts.append(A + w + nf * fw); rad.append(rr)
            C = catmull(pts, 8); R = np.interp(np.linspace(0, len(pts) - 1, len(C)), np.arange(len(pts)), rad)
            out.append(dict(ctrl=np.array(pts), ctrl_r=np.array(rad), C=C, R=R, njoint=m['joint']))
        # B-9cvs: valley carvers between neighbouring metatarsals, following the mid line of the two bone chains from
        # the joint back over the foot (the toe grooves continue as the valleys between the foot bones)
        mg = m.get('valley'); s.vgrooves = []
        if mg:
            from scipy.spatial import cKDTree
            js = mg.get('start', m['joint']); j0 = js * 8
            dep_ctrl = list(mg.get('depth_toe', [])) + [mg['depth_joint']] + list(mg['depth_flat']) + [0.0] * len(m['shin'])
            assert len(dep_ctrl) == len(out[0]['ctrl']) - js
            for i in range(3):
                A, Bc = out[i], out[i + 1]; Mc = 0.5 * (A['C'] + Bc['C'])[j0:]
                H = 0.5 * ((A['C'][:, 2] + A['R']) + (Bc['C'][:, 2] + Bc['R']))[j0:]
                dep = np.interp(np.linspace(0, len(dep_ctrl) - 1, len(Mc)), np.arange(len(dep_ctrl)), dep_ctrl) * MM
                tg = np.gradient(Mc, axis=0); n = np.stack([-tg[:, 1], tg[:, 0], 0 * tg[:, 0]], 1); n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
                ang_ctrl = mg.get('angle_ctrl', [mg['half_angle_deg']] * len(dep_ctrl))
                ta = np.tan(np.radians(np.interp(np.linspace(0, len(ang_ctrl) - 1, len(Mc)), np.arange(len(ang_ctrl)), ang_ctrl)))
                keep = dep > 1e-5
                s.vgrooves.append(dict(M=Mc[keep], H=H[keep], dep=dep[keep], n=n[keep], ta=ta[keep], tree=cKDTree(Mc[keep][:, :2])))
        return out

    def axis_d(s, q, i, aw):
        """Distance to digit i's bone chain with its radii scaled by (1 - aw), same lateral stretch as bone_d."""
        B = s.bones[i]; D = s.digits[i]; ls = s.p['digits'].get('lat_scale', 1.0); qq = q
        if ls != 1.0:
            back = -((q - D['tip']) @ D['f']) / MM; k = (1 - 1 / ls) * (1 - sstep(25, 45, back))
            qq = q - k[:, None] * (((q - D['tip']) @ D['l2'])[:, None] * D['l2'][None, :])
        n = (B['njoint'] + 3) * 8   # phalanges and the start of the metatarsal: the clefts never reach further back
        return tube(qq, B['C'][:n], B['R'][:n] * (1 - aw))

    def groove_u(s, q, bd):
        """B-pzrq: rounded U toe clefts on the bisector. For each toe pair the groove's lateral coordinate is half the
        difference of the two digits' own skin distances, so its centre line is the surface equidistant from both toes and
        it meets both symmetrically (the old V blade sat on the plane through the mean tip and rode up over fore toe 2).
        Profile across the groove: a wedge of half_angle_deg from vertical, offset by floor_r, so the floor is a round
        of radius floor_r whose bottom sits on the old floor table (depth held); the lips fade into the toes through the
        smax blend radius k. Same floor table and back/front fades as mode v."""
        g = s.p['groove']; S = s.S; d = None
        R = g['floor_r'] * MM; a = np.radians(g['half_angle_deg']); sa, ca = np.sin(a), np.cos(a)
        bu = np.array(g['floor_u'], float); o = np.argsort(bu)
        for i in range(3):
            A, B = s.digits[i], s.digits[i + 1]
            fm = A['f'] + B['f']; fm /= np.linalg.norm(fm); pm = 0.5 * (A['tip'] + B['tip'])
            um = (q - pm) @ fm
            aw = g.get('axis_w', 0.0)   # 0: equidistant from the two toe skins; 1: equidistant from the two toe axes
            if aw > 0: dm = 0.5 * (s.axis_d(q, i, aw) - s.axis_d(q, i + 1, aw))
            else: dm = 0.5 * (bd[i] - bd[i + 1])
            fl = np.interp(-um / (S * MM), bu[o], np.array(g['floor_z'], float)[o]) * S * MM + g.get('floor_dz', 0.0) * MM
            x = np.abs(dm); y = q[:, 2] - fl - R
            pr = x * sa + y * ca
            dw = np.where(pr < 0, np.sqrt(x * x + y * y), x * ca - y * sa)
            mask = 1 - sstep(g['back'] * S * MM - g['fade'] * S * MM, g['back'] * S * MM, -um)
            mask = mask * (1 - sstep(g.get('front', 0) * S * MM, (g.get('front', 0) + g.get('front_fade', 4)) * S * MM, um))
            dd = dw - R * mask + 8 * MM * (1 - mask)
            d = dd if d is None else np.minimum(d, dd)
        return d

    def valley_d(s, q):
        mg = s.p['meta'].get('valley')
        if not mg or not s.vgrooves: return None
        ta = np.tan(np.radians(mg['half_angle_deg'])); d = None
        for G in s.vgrooves:
            dist, j = G['tree'].query(q[:, :2]); dm = ((q - G['M'][j]) * G['n'][j]).sum(1)
            fl = G['H'][j] - G['dep'][j] - mg.get('floor_extra', 0.0) * MM; hz = q[:, 2] - fl
            hw = mg.get('w0', 0.4) * MM + G['ta'][j] * np.maximum(hz, 0) + np.minimum(hz, 0) * mg.get('below_close', 1.5)
            mask = sstep(0.0, mg.get('dep_ramp', 1.0) * MM, G['dep'][j]) * (1 - sstep(4 * MM, 10 * MM, dist - 0.0))
            rf = mg.get('floor_round', 0.0) * MM   # rounded (U) valley floor instead of a sharp V
            adm = np.sqrt(dm * dm + rf * rf) - rf if rf > 0 else np.abs(dm)
            dd = adm - hw * mask + 8 * MM * (1 - mask)
            d = dd if d is None else np.minimum(d, dd)
        return d

    def leg_d(s, q):
        d = super().leg_d(q); sh = s.p['meta'].get('leg_shrink')
        if sh:   # the tube recedes below the join so the bones carry the top; zero at the join (weld ring unchanged)
            t = (q - s.cut) @ s.a; d = d + sh[0] * MM * sstep(sh[1] * MM, sh[2] * MM, t)
        return d

    def foot_d(s, q):
        """Pass 4 foot mass with its top lowered by the valley depth, so the metatarsal ridges stand above it."""
        p = s.p['foot']; S = s.S; u, v, z = s.local(q); u_mm = u / MM / S
        U = np.array(p['u'], float); o = np.argsort(U); U = U[o]; uc = np.clip(u_mm, U[0], U[-1])
        g = lambda k, dflt=0.0: np.interp(uc, U, np.array(p.get(k, [dflt] * len(U)), float)[o])
        hw = g('half_width') * MM * S; top = (g('top') * S - g('valley')) * MM; vc = g('v_center') * MM * S
        bot = -p['below'] * MM; zc = 0.5 * (top + bot); hh = 0.5 * (top - bot)
        e = PB.ellipse_d(v - vc, z - zc, hw, hh); du = (u_mm - uc) * MM * S
        return np.where(np.abs(du) > 0, np.sqrt(np.maximum(e, 0) ** 2 + du ** 2) + np.minimum(e, 0), e)

    def bone_d(s, q, i):
        B = s.bones[i]; D = s.digits[i]; ls = s.p['digits'].get('lat_scale', 1.0)
        # lateral stretch near the toe only (as pass 4); fades out along the metatarsal
        qq = q
        if ls != 1.0:
            back = -((q - D['tip']) @ D['f']) / MM
            k = (1 - 1 / ls) * (1 - sstep(25, 45, back))
            qq = q - k[:, None] * (((q - D['tip']) @ D['l2'])[:, None] * D['l2'][None, :])
        d = tube(qq, B['C'], B['R'])
        dp = tube(qq, D['pad'], D['padR']); d = smin(d, dp, s.p['k_pad'] * MM)
        if D['tpad'] is not None:
            d = smin(d, ellipsoid_d(q, D['tpad']['c'], D['tpad']['ax'], D['tpad']['R']), s.p['digits']['toe_pad'].get('k', 1.5) * MM)
        return d

    def bbox(s):
        lo, hi = super().bbox(); return lo - 0.004, hi + 0.004

    def sdf(s, q):
        p = s.p; m = p['meta']; out = np.empty(len(q))
        for i0 in range(0, len(q), 400000):
            x = q[i0:i0 + 400000]
            body = smin(s.leg_d(x), s.foot_d(x), p['k_leg_foot'] * MM)
            bones = None; bd = []
            for i in range(4):
                dd = s.bone_d(x, i); bd.append(dd); bones = dd if bones is None else smin(bones, dd, m['k_bone_bone'] * MM)
            f = smin(body, bones, m['k_bone_body'] * MM)
            pd = s.pads_d(x)
            if pd is not None: f = smin(f, pd, p['main_pad'].get('k', 1.5) * MM)
            gd = s.groove_u(x, bd) if p.get('groove', {}).get('mode') == 'u' else s.groove_d(x)
            if gd is not None: f = smax(f, -gd, p['groove'].get('k', 1.0) * MM)
            vd = s.valley_d(x)
            if vd is not None: f = smax(f, -vd, m['valley'].get('k', 3.0) * MM)
            hl = p.get('heel_lift')
            if hl:
                u = (x - s.O) @ s.f; sl = np.tan(np.radians(hl['deg']))
                hp = (hl['z0'] * MM + sl * (-u - hl['u0'] * s.S * MM) - x[:, 2]) / np.sqrt(1 + sl * sl)
                f = smax(f, hp, hl.get('k', 4) * MM)
            f = smax(f, -x[:, 2], p['k_sole'] * MM)
            t = (x - s.cut) @ s.a; f = np.maximum(f, -t)
            out[i0:i0 + 400000] = f
        return out


def main(basep, paramsp, outp):
    base = dict(np.load(basep)); P = json.loads(open(paramsp).read()); out = {}; info = {}
    for kind in ('hind', 'fore'):
        pw = SkelPaw(kind, P, base); lo, hi = pw.bbox(); h = P['grid_mm'] * MM
        n = np.ceil((hi - lo) / h).astype(int) + 3; X0 = lo - h
        gx = [X0[i] + h * np.arange(n[i]) for i in range(3)]
        # narrow band: exact field within 3 mm of the surface, trilinear from a 3x coarser grid elsewhere
        from scipy.ndimage import map_coordinates
        gc = [X0[i] + 3 * h * np.arange(n[i] // 3 + 2) for i in range(3)]
        Fc = pw.sdf(np.stack(np.meshgrid(*gc, indexing='ij'), -1).reshape(-1, 3)).reshape([len(x) for x in gc])
        I = np.stack(np.meshgrid(*[np.arange(n[i]) / 3.0 for i in range(3)], indexing='ij'), 0).reshape(3, -1)
        F = map_coordinates(Fc, I, order=1, mode='nearest')
        band = np.abs(F) < 3 * h * 1.8
        G = np.stack(np.meshgrid(*gx, indexing='ij'), -1).reshape(-1, 3)
        F[band] = pw.sdf(G[band]); F = F.reshape(n).astype(np.float32)
        out[f'{kind}_F'] = F; out[f'{kind}_X0'] = X0; out[f'{kind}_h'] = np.array(h)
        cv = base[P[kind]['claw_source']]; cb, ce, _ = claw_frame(cv); cpar = P[kind]['claw']
        for i, D in enumerate(pw.digits):
            pitch = np.radians(cpar['pitch_deg']); tgt = D['f'] * np.cos(pitch) - np.array([0, 0, 1.0]) * np.sin(pitch)
            Rm = rot_between(ce, tgt); seat = D['tip'] + D['f'] * (cpar['base_u'] * MM * pw.S) + np.array([0, 0, cpar['base_z'] * MM * pw.S])
            nvx = (cv - cb) @ Rm.T + seat
            if nvx[:, 2].min() < cpar['min_z'] * MM: nvx[:, 2] += cpar['min_z'] * MM - nvx[:, 2].min()
            out[f'{kind}_claw_{i + 1}'] = nvx
        out[f'{kind}_cut'] = pw.cut; out[f'{kind}_axis'] = pw.a; out[f'{kind}_O'] = pw.O
        out[f'{kind}_f'] = pw.f; out[f'{kind}_l'] = pw.l; out[f'{kind}_heel'] = pw.heel
        out[f'{kind}_tips'] = np.array([D['tip'] for D in pw.digits]); out[f'{kind}_secpts'] = pw.sec_pts
        for i, B in enumerate(pw.bones):
            out[f'{kind}_bone_{i + 1}'] = B['ctrl']; out[f'{kind}_bone_r_{i + 1}'] = B['ctrl_r']; out[f'{kind}_bone_C_{i + 1}'] = B['C']
        info[kind] = dict(grid=n.tolist(), voxel_mm=P['grid_mm'], cut_center_mm=(pw.cut / MM).round(1).tolist(), leg_axis=pw.a.round(4).tolist(),
                          section_half_axes_mm=[pw.sec_a / MM, pw.sec_b / MM], section_width_mm=float(2 * pw.sec_a / MM),
                          heel_mm=(pw.heel / MM).round(1).tolist(), O_mm=(pw.O / MM).round(1).tolist(),
                          skeleton_mm=[dict(digit=i + 1, joint_index=B['njoint'], ctrl=(B['ctrl'] / MM).round(1).tolist(), r=(B['ctrl_r'] / MM).round(1).tolist()) for i, B in enumerate(pw.bones)])
        print(kind, 'grid', n.tolist(), 'inside', int((F < 0).sum()))
    np.savez_compressed(outp, **out); open(outp + '.json', 'w').write(json.dumps(info, indent=1))


if __name__ == '__main__':
    main(*sys.argv[1:4])
