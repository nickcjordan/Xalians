"""B-6kf7: write pass1/report.json (plain Python). Usage: python neck_report.py PASS_DIR"""
import sys, json, hashlib
from pathlib import Path
P = Path(sys.argv[1]); W = P / 'work'
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
J = lambda n: json.loads((W / n).read_text())
fit = J('neck_fit.json'); ver = J('verify.json'); cs = J('crease_stats.json'); ring = J('ring_curvature_summary.json')
ap = {k: J(f'apply_{k}.json') for k in ('sculpt', 'rig', 'clips')}
files = ['luceras_sculpt.blend', 'rig.blend', 'clips.blend', 'work/neck_delta.npz', 'video/idle_neck_side_before.mp4', 'video/idle_neck_side_after.mp4', 'video/idle_neck_side_stack.mp4',
         'work/verify.json', 'work/neck_fit.json', 'work/crease_stats.json', 'work/ring_curvature_summary.json', 'work/before_diag.json', 'work/after_diag.json']
files += sorted(str(p.relative_to(P)).replace('\\', '/') for p in (P / 'crops').glob('*.png'))
rep = dict(
    build_id='B-6kf7', defect='D-tmqp', species='luceras', pass_=1,
    inputs=dict(rig='luceras-pawintegrate/pass3/rig.blend', sculpt='luceras-pawintegrate/pass3/luceras_sculpt.blend', clips='luceras-animate/pass2/work/clips.blend',
                note='inputs not modified; all outputs written to luceras-neck/pass1'),
    cause_found=dict(
        verdict='rest shape (sculpt), not skinning',
        location=('a ring on the upper neck at s ~ 138-146 mm along the neck axis (spline through the neck_01, neck_02 and head_01 heads; the head_01 joint is at s 193.5), '
                  'about 50 mm below the skull joint, strongest on the top line and upper sides (theta 300..60), fading on the lower sides. The head-side section is 2 to 5 mm '
                  'larger in radius than the neck-side section and the two meet in a narrow notch with a lip just above it: a graft step from the stage 5 head reconstruction.'),
        depth=('top line: radius steps 25.0 -> 27.5 -> 30.0 mm across 8 mm; notch mean curvature -0.097 /mm (about a 10 mm radius groove) against about +0.03 on the '
               'surrounding neck, lip +0.09 /mm; upper sides -0.03 to -0.06 /mm.'),
        evidence=dict(rest_vs_idle='binned curvature on the ring is the same at rest and at idle 1.5 s (top -0.097 vs -0.099 /mm), so the neck_02/head_01 rotation adds nothing',
                      weights='head_01 weight rises smoothly over about 35 mm (s10 97..140, s50 115..153, s90 130..161 depending on side), no sharp step at the ring; weights not changed',
                      signature='at the hit (0.97 s) the ring is still visible on the top line (-0.049 /mm); the throat shows ordinary flexion compression from the -62 deg neck bend, not the seam'),
        ring_curvature_min_per_theta_per_mm=ring),
    method=['Diagnosis: art/pipeline/rig/neck_diag.py (radial profile and mean curvature on an (s, theta) grid around the neck axis at rest, idle f45, signature f29 and f30, plus the weight profile along the axis). neck_lib.py holds the shared measures.',
            'Fix (art/pipeline/rig/neck_fit.py, numpy): per 10 deg theta bin, median radius profile in 1 mm s bins; target = Gaussian smoothing along s (sigma 7 mm, slope-keeping reflection), which keeps the taper and broad form and spreads the step. Displacement along each vertex radial direction, windowed in s (full 128..156 mm, cosine fade to 0 at 114 and 170) and in theta (zero within 30 deg of the throat line, full beyond 65 deg), softened to 0 as jaw/ear weight goes from 0.3 to 0.5 (frozen above 0.5). Displacement field smoothed over the mesh (40 umbrella iterations, zero held outside the band); 5 rounds; then Taubin smoothing (lambda 0.5, mu -0.53, 15 iterations) on the seam core s 134..154 only, to even the old seam sliver faces. Vertex moves only.',
            'Apply (art/pipeline/rig/neck_apply.py): the same per-vertex offset goes to the mesh and every shape key (Basis and the six PSD correctives), so corrective offsets are unchanged; topology hash asserted equal; written to the sculpt, rig and clips blends. Weights untouched.',
            'Verify (art/pipeline/rig/neck_verify.py): old vs new clips, every frame of idle (0..90) and the signature (0..60), evaluated with armature and correctives.',
            'Proof renders (art/pipeline/rig/neck_render.py, neck_compose.py, neck_encode.py): grazing clay (Cycles, one low sun raking down the posed neck from 30 deg on the camera side) and curvature (blue/dark concave, amber/light convex) at rest, idle 1.5 s and signature hit, side and three-quarter; idle side video 960 x 640 framed on head and neck in the review look-dev lighting.'],
    changes=dict(moved_vertices=fit['moved_vertices'], vertices_total=fit['vertices_total'], move_mm=fit['move_mm'], moved_s_range_mm=fit['s_range_of_moved'],
                 moved_outside_band=fit['moved_outside_band'], jaw_or_ear_vertices_moved_weight_over_0_5=fit['furniture_moved'], throat_line_within_30_deg_moved=0,
                 topology_sha256=ap['rig']['topology_sha256_after'], topology_unchanged=all(a['topology_sha256_before'] == a['topology_sha256_after'] for a in ap.values()),
                 corrective_offset_change_max_m=ap['rig']['corrective_offset_change_max_m'], weights_changed=False,
                 region_delta='work/neck_delta.npz (index, base_co, new_co; rest coordinates; reverse by writing base_co back)',
                 head_jaw_ears_eyes_horns=('eyes, horns, claws and whiskers are separate objects and are byte-identical (verify.other_meshes_identical); no vertex with jaw or ear '
                                           'weight over 0.5 moved; no vertex beyond s 170 mm (the skull joint is at 193.5) moved')),
    corrective_check=dict(ver, note='outside_moved_set_max_abs_diff_m = 0.0: every vertex outside the moved set is bit-identical in all 152 posed frames, including frames where each of the six correctives is active'),
    band_quality=cs,
    outputs={f: sha(P / f) for f in files},
    remains=['The line continues from the neck ring down behind the jaw angle (s 171..192 on the lower sides, theta 105..135 and 225..255, curvature to -0.13 /mm). That stretch sits entirely on head_01-weighted head geometry (the back border of the jaw and cheek), so it was left as is under the head and jaw hold. In the three-quarter view it still reads as the lower half of the line Nick circled. If the art director wants it softened too, the same method can run on that band with the head hold relaxed there.',
             'A faint short wrinkle remains on the top line at the signature hit (three-quarter crop), where the neck folds most; much weaker than before but not gone.',
             'The game mesh (game_body_horns_claws) was not changed; it is a separate decimated mesh and was outside this defect.',
             'The groom binds to this topology (unchanged) but was not re-run or re-rendered here; strands rooted in the band will need a re-attach on the next groom pass (moves up to 2.9 mm).']
)
(P / 'report.json').write_text(json.dumps(rep, indent=1)); print('REPORT', P / 'report.json', len(rep['outputs']))
