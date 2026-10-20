"""B-6kf7 pass 2: write pass2/report.json (plain Python). Usage: python neck_report2.py PASS1_DIR PASS2_DIR"""
import sys, json, hashlib, numpy as np
from pathlib import Path
P1 = Path(sys.argv[1]); P = Path(sys.argv[2]); W = P / 'work'
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
J = lambda p: json.loads(Path(p).read_text())
fit = J(W / 'neck_fit2.json'); cs = J(W / 'curvature_stats.json')
v02 = J(W / 'verify_pass0_vs_pass2.json'); v12 = J(W / 'verify_pass1_vs_pass2.json')
ap = {k: J(W / f'apply_{k}.json') for k in ('sculpt', 'rig', 'clips')}

# posed groove curvature (rest, idle 1.5 s, hit), pass 0 parametrisation for all three passes
b = np.load(P1 / 'work/before_diag.npz'); a1 = np.load(P1 / 'work/after_diag.npz'); a2 = np.load(W / 'after2_diag.npz')
sv = b['sv']; th = b['th']; sel = b['sel']
posed = {}
for p in ('rest', 'idle_f45', 'sig_f29_hit'):
    posed[p] = {}
    for tag, z in (('pass0', b), ('pass1', a1), ('pass2', a2)):
        H = z[p + '_H']; rec = {}
        for g, lo, hi, ths in (('upper_ring', 134, 152, (0, 30, 60, 90, 270, 300, 330)), ('jaw_angle', 168, 196, (90, 105, 120, 135, 225, 240, 255, 270))):
            row = {}
            for t0 in ths:
                m = sel & (((th - t0 + 7.5) % 360) < 15)
                v = [H[m & (np.abs(sv - x) <= 1.5)].mean() for x in np.arange(lo, hi + .1, 3.0) if (m & (np.abs(sv - x) <= 1.5)).sum() >= 3]
                row[t0] = round(float(min(v)), 3)
            rec[g] = row
        posed[p][tag] = rec
(W / 'posed_groove_curvature.json').write_text(json.dumps(posed, indent=1))

Ws = b['Ws']; names = [str(x) for x in b['names']]; V0 = b['V0']; V1 = np.load(P1 / 'work/neck_V1.npy'); V2 = np.load(W / 'neck_V2.npy')
d = np.linalg.norm(V2 - V1, axis=1) * 1000; jaw = Ws[:, names.index('jaw_01')]
jaw_rep = {f'over_{t}': dict(vertices=int((jaw > t).sum()), moved=int(((d > 0) & (jaw > t)).sum()), max_move_mm=float(d[jaw > t].max())) for t in (0.1, 0.3, 0.5)}
sys.path.insert(0, str(Path(__file__).resolve().parent)); import neck_lib as NL
C, Tn, s_ = NL.spline(NL.REST_PTS); idx = b['idx']; R0 = V1 - C[idx]; t_ = Tn[idx]; u = R0 - t_ * (R0 * t_).sum(1)[:, None]; u /= np.maximum(np.linalg.norm(u, axis=1), 1e-12)[:, None]
dr = ((V2 - V1) * u).sum(1) * 1000; mv = d > 0
rad_rep = dict(mean=float(dr[mv].mean()), max_out=float(dr[mv].max()), max_in=float(dr[mv].min()))
REMAINS = ['A few vertices at the lowest end of the groove (theta about 130..135 and 225..230, about 178..181 mm) still read about -0.05 /mm in the smoothed measure; the binned minimum on the lower sides is now -0.033 /mm against -0.131 /mm before.',
           'The smoothed curvature dropped by more than 0.05 /mm (became more concave) on 183 vertices and by more than 0.1 on 1 vertex (-0.111, at the back of the jaw angle, x -44.7 mm) where the fill tapers out; no edge in either band is over 15 deg. Pass 1 alone had 30 vertices over 0.05 and none over 0.1.',
           'The game mesh was not changed. The groom binds to this topology (unchanged) but was not re-attached; strands rooted in the moved band (up to 2.9 mm cumulative) need re-attaching on the next groom pass.',
           'Not judged by a separate reader; this is the builder own look at the boards.']
files = ['luceras_sculpt.blend', 'rig.blend', 'clips.blend', 'work/neck_delta2.npz', 'work/neck_delta_cum.npz', 'work/neck_V2.npy',
         'video/idle_neck_side_pass2.mp4', 'video/idle_neck_side_pass0_pass1_pass2.mp4',
         'work/verify_pass0_vs_pass2.json', 'work/verify_pass1_vs_pass2.json', 'work/neck_fit2.json', 'work/curvature_stats.json', 'work/posed_groove_curvature.json', 'work/after2_diag.json']
files += sorted(str(p.relative_to(P)).replace('\\', '/') for p in (P / 'crops').glob('*.png'))
rep = dict(
    build_id='B-6kf7', defect='D-tmqp', species='luceras', pass_=2,
    scope=('Lower stretch of the seam behind the jaw angle (171..192 mm along the neck axis, lower sides), after the coordinator lifted the head-and-jaw hold '
           'for that band (Nick circled it). Pass 1 (upper ring) is kept. Inputs: the original pass 0 files (luceras-pawintegrate/pass3 sculpt and rig, '
           'luceras-animate/pass2 clips), with the cumulative pass 0 -> pass 2 delta applied; none modified.'),
    cause=('Same graft seam as pass 1, continuing down behind the jaw angle on both lower sides: a narrow groove on head_01-weighted geometry, mean curvature '
           'down to -0.13 /mm (binned), sharpest at theta 120..135 and 225..240 (left and right lower sides), 171..183 mm; at the sides (theta 90 / 270) it sits at 186..192 mm.'),
    method=['art/pipeline/rig/neck_fit2.py (numpy), starting from pass 1 geometry. Band: 164..197 mm along the axis (full 172..191), theta full on 90..145 and 215..270 with a 20 deg fade, zero within 15 deg of the throat line and on the top line; ear-weighted (> 0.5) vertices frozen.',
            'Radial step: per-theta median radius profile, Gaussian target along s (sigma 5 mm, smaller than pass 1 so the cheek volume stays), mesh-smoothed displacement, 4 rounds.',
            'Concave-only fill: 200 iterations moving only groove-floor vertices (mean curvature below -0.025 /mm) outward along the normal by their Laplacian; convex forms (cheek, jaw outline) do not move in this step.',
            'Band closing on the surface: near the back of the jaw the nearest axis sample jumps forward along the head, so a strip of vertices that lies on the groove maps to 215..250 mm. Vertices half-surrounded by the band (6 passes) and those param-far vertices within 10 edge rings of the band are taken in; they get no direct push and follow their neighbours.',
            'Taubin smoothing (lambda 0.5, mu -0.53, 15 iterations) on the seam core; sliver faces (< 0.05 mm2) follow their neighbours; an edge taper fades the change to zero over the outer rings of the band so no step is left at its edge.',
            'art/pipeline/rig/neck_apply.py: cumulative delta (pass 0 -> pass 2) applied to the mesh and every shape key (Basis + six PSD correctives); topology hash asserted equal.',
            'Checks: art/pipeline/rig/neck_verify.py run twice (pass 0 vs pass 2 with the cumulative moved set; pass 1 vs pass 2 with the pass 2 moved set), 152 frames each. Statistics: neck_stats2.py, neck_diag.py.'],
    moved=dict(pass1_to_pass2=fit['pass1_to_pass2'], pass0_to_pass2=fit['pass0_to_pass2'], vertices_total=fit['vertices_total'],
               topology_sha256=ap['rig']['topology_sha256_after'], topology_unchanged=all(a['topology_sha256_before'] == a['topology_sha256_after'] for a in ap.values()),
               corrective_offset_change_max_m=ap['rig']['corrective_offset_change_max_m'], weights_changed=False,
               deltas=dict(pass1_to_pass2='work/neck_delta2.npz', pass0_to_pass2='work/neck_delta_cum.npz', format='index, base_co, new_co (rest coordinates); reverse by writing base_co back')),
    curvature=dict(note='mean curvature per mm, negative = concave; min over s of 15 deg x 3 mm bins; rest-pose parametrisation from pass 0 for all passes',
                   rest_smoothed=cs, posed_unsmoothed=posed),
    pass1_edge_over_15deg=('Pass 1 left one edge at 15.5 deg (vertices 95736-95779, s 169..172, theta 132), at the top of the jaw-angle groove, inside the pass 2 band. '
                           'After pass 2 the lower-sides band has no edge over 15 deg (max %.1f deg) and the upper-ring band none (max %.1f deg).'
                           % (cs['pass2']['jaw_angle_s164_198_lower_sides']['dihedral_max'], cs['pass2']['upper_ring_s110_174']['dihedral_max'])),
    checks=dict(pass0_vs_pass2=v02, pass1_vs_pass2=v12),
    outputs={f: sha(P / f) for f in files if (P / f).exists()},
    jaw_and_cheek=dict(jaw_weighted_moved=jaw_rep, radial_change_mm_pass1_to_pass2=rad_rep,
                       note='No vertex with jaw weight over 0.3 moved; 58 with weight 0.1..0.3 moved at most 0.001 mm, so the jaw outline is unchanged. Moves are outward fills of the groove (radial mean shown); the cheek is not cut back.'),
    remains=REMAINS
)
(P / 'report.json').write_text(json.dumps(rep, indent=1)); print('REPORT', P / 'report.json', len(rep['outputs']))
