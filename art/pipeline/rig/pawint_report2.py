"""B-yqgg pass 2: measurements.json and report.json for the right fore weld band fix."""
import json, hashlib
from pathlib import Path
O = Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-pawintegrate/pass2'); W = O / 'work'
F = json.loads((W / 'band_fix.json').read_text()); R2 = json.loads((W / 'rig2_build.json').read_text()); C = json.loads((W / 'rig_checks.json').read_text())
L1 = json.loads((W / 'locate_pass1.json').read_text()); L2 = json.loads((W / 'locate_pass2.json').read_text())
P1 = json.loads((O.parent / 'pass1/report.json').read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
folds = {}
for tag, L in (('pass1', L1), ('pass2', L2)):
    for side in ('fore_l', 'fore_r'):
        for pose, b in L[side]['folds'].items():
            folds.setdefault(pose, {})[f'{side}_{tag}'] = dict(max_crease_growth_deg=round(b['max'], 1), edges_over_45=b['over45'], area_ratio_min=round(b['area_ratio_min'], 2))
rest = {f'{s}_{t}': dict(sliver_tris_minang_below_5=L[s]['rest_sliver_tris_minang_below_5'], sharp_rest_edges_over_15deg_0_to_2mm_below_ring=L[s]['rest_dihedral_over_15_h_mm_hist'][13],
                         rest_dihedral_max=round(L[s]['rest_dihedral_max'], 1)) for t, L in (('pass1', L1), ('pass2', L2)) for s in ('fore_l', 'fore_r')}
cl = C['claws_rigid']
meas = dict(build_id='B-yqgg', pass_=2, band_fix=F, rig=R2, fold_angles_left_vs_right=folds, rest_band_left_vs_right=rest, rig_checks=C)
(O / 'measurements.json').write_text(json.dumps(meas, indent=1))
outs = sorted([p for p in O.glob('*') if p.is_file() and p.name != 'report.json'] + list((O / 'crops').glob('*.png')) + list((O / 'graze').glob('*.png')))
rep = dict(build_id='B-yqgg', pass_=2, species='luceras', base='pass1 (B-yqgg)', scope='right fore weld band only: seam line and sliver triangles',
  method=[
   'Localized (art/pipeline/rig/pawint_locate.py): every right fore fold edge over 45 degrees in crouch, leap and landing sat 5 mm above to 1 mm below the join ring, on sliver triangles (minimum angle 0.45 to 4 degrees, 0.02 to 0.5 mm2). The cause was near-duplicate ring vertices from the bisect, 0.10 to 0.13 mm apart, fanned by the bisect n-gons into 9 mm needles. The seam was 15 sharp rest edges (over 15 degrees) 0 to 2 mm below the ring; the left fore had 1.',
   'Fix (art/pipeline/sculpt/pawint_band_fix.py, on pass1/luceras_sculpt.blend): band = right fore vertices 12 mm above to 6 mm below the join plane, own side only. Vertices with an edge leaving the band are pinned. The script triangulates faces touching the band, collapses edges under 0.3 mm (dissolve_degenerate) and runs beautify_fill. It then cleans remaining needles (under 6 degrees) and tiny triangles (under 0.08 mm2): a flip when that is convex and better, otherwise a short-edge collapse. Then 20 iterations of umbrella relax (tangential plus 0.35 normal), full strength within 3.5 mm of the ring and fading to 0 at the band edges. Band triangles are rejoined into quads where flat.',
   'Weights (art/pipeline/rig/pawint_rig2.py, on pass1/rig.blend): unchanged vertices copy their pass 1 weights and corrective offsets. The 701 touched vertices get nearest surface interpolation of the pass 1 weights on the pass 1 surface (same method as pass 1). Pass 1 corrective offsets were 0.0 on every touched or removed vertex and their neighbors, so offsets are zero there. Drivers were rebuilt. Claws, skeleton, controls, actions and game mesh were kept (game fingerprints equal).',
   'Re-verified with pawint_rig.py verify against rig pass 3; re-rendered the eight-pose sheet and paw crops; grazing-light before/after and left/right mirror boards (pawint_rig.py graze_old, graze_new, graze_left; pawint_compose2.py).'],
  topology=dict(pass1=P1['topology']['new'], pass2=dict(topology_sha256=F['pass2_topology_sha256'], verts=F['verts_pass2'])),
  band=dict(touched_vertices=F['touched_vertices'], touched_outside_band=F['touched_outside_band'], offset_from_pass1_surface_mm=F['touched_offset_from_pass1_surface_mm'],
            mirror_gap_right_band_vs_left_surface_mm=F['mirror_gap_right_band_vs_left'], band_metrics_before=F['band_before'], band_metrics_after=F['band_after']),
  fold_angles_left_vs_right=folds, rest_band_left_vs_right=rest,
  checks=dict(
   one_manifold_body=dict(passed=F['mesh']['shells'] == 1 and F['mesh']['nonmanifold_edges'] == 0, **F['mesh']),
   nothing_outside_band_changed=dict(passed=F['touched_outside_band'] == 0, touched_outside_band=F['touched_outside_band']),
   no_unweighted=dict(passed=C['weights']['unweighted'] == 0), weights_normalized=dict(passed=C['weights']['max_abs_sum_minus_1'] < 1e-6, max_abs_sum_minus_1=C['weights']['max_abs_sum_minus_1']),
   claws_rigid=dict(passed=max(v['max_edge_length_change_um'] for v in cl.values()) < 1.0, max_edge_length_change_um=max(v['max_edge_length_change_um'] for v in cl.values()), root_gap_change_mm_max=C['claw_root_gap_change_mm_max']),
   correctives_verified=dict(passed=C['correctives_fire'] == C['correctives_fire_old'] and C['correctives_rest_effect_max_mm'] == 0.0, rest_effect_max_mm=C['correctives_rest_effect_max_mm'], fire_in=C['correctives_fire'],
                             effect_diff_vs_pass3_max_mm=max(abs(x['effect_new_max_mm'] - x['effect_old_max_mm']) for v in C['correctives'].values() for x in v.values())),
   right_fore_folds_cleared=dict(passed=all(folds[p]['fore_r_pass2']['edges_over_45'] == 0 for p in ('crouch', 'leap', 'landing'))),
   weight_symmetry=C['paw_weight_symmetry'],
   posed_agreement_outside_smoothing_mm=max(v['same_rest_outside_smoothing_max_mm'] for v in C['posed_agreement_preserved'].values())),
  what_remains=[
   'Under grazing light both fore legs still show a faint, soft band near the join and a small kink at the wrist in leap. The left fore has the same, so it is shared anatomy and weld-band shape, not the right-only seam. The hard right-only line is gone.',
   'Right fore leap smallest triangle area ratio is 0.18 (left fore 0.23): compression at the inside of the wrist, with no fold over 45 degrees.',
   'The right band moved at most 0.61 mm from the pass 1 surface (mean 0.08 mm). The right band mirrored onto the left fore surface: mean gap 0.067 mm, max 0.66 mm (before: 0.043 and 0.40 mm).',
   'The left fore still has its own slivers (12 under 5 degrees) and a 75.8 degree leap fold on 2 edges, as in pass 1. It was not touched, per scope; the same fix applies if wanted.',
   'Carried from pass 1: game mesh parked with out-of-date paws; pass 8 paw open items (A5b notch, A3 hind swelling, toe bands); Nick has not reviewed.'],
  blockedBy=[],
  tooling=['art/pipeline/rig/pawint_locate.py', 'art/pipeline/sculpt/pawint_band_fix.py', 'art/pipeline/rig/pawint_rig2.py', 'art/pipeline/rig/pawint_rig.py (graze modes added)', 'art/pipeline/rig/pawint_compose2.py', 'art/pipeline/rig/pawint_report2.py'],
  outputs={str(p.relative_to(O)).replace('\\', '/'): sha(p) for p in outs})
(O / 'report.json').write_text(json.dumps(rep, indent=1))
print('report', {k: v.get('passed') if isinstance(v, dict) else v for k, v in rep['checks'].items()})
print(json.dumps(folds, indent=0)); print(json.dumps(rest))
