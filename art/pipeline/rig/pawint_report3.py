"""B-yqgg pass 3: measurements.json and report.json for the left fore weld band fix (same method as pass 2)."""
import json, hashlib
from pathlib import Path
O = Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-pawintegrate/pass3'); W = O / 'work'
F = json.loads((W / 'band_fix.json').read_text()); R2 = json.loads((W / 'rig2_build.json').read_text()); C = json.loads((W / 'rig_checks.json').read_text())
L0 = json.loads((O.parent / 'pass2/work/locate_pass1.json').read_text()); L1 = json.loads((O.parent / 'pass2/work/locate_pass2.json').read_text()); L2 = json.loads((W / 'locate_pass3.json').read_text())
P1 = json.loads((O.parent / 'pass2/report.json').read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
folds = {}
for tag, L in (('pass1', L0), ('pass2', L1), ('pass3', L2)):
    for side in ('fore_l', 'fore_r'):
        for pose, b in L[side]['folds'].items():
            folds.setdefault(pose, {})[f'{side}_{tag}'] = dict(max_crease_growth_deg=round(b['max'], 1), edges_over_45=b['over45'], area_ratio_min=round(b['area_ratio_min'], 2))
rest = {f'{s}_{t}': dict(sliver_tris_minang_below_5=L[s]['rest_sliver_tris_minang_below_5'], sharp_rest_edges_over_15deg_0_to_2mm_below_ring=L[s]['rest_dihedral_over_15_h_mm_hist'][13],
                         rest_dihedral_max=round(L[s]['rest_dihedral_max'], 1)) for t, L in (('pass1', L0), ('pass2', L1), ('pass3', L2)) for s in ('fore_l', 'fore_r')}
cl = C['claws_rigid']
meas = dict(build_id='B-yqgg', pass_=3, band_fix=F, rig=R2, fold_angles_left_vs_right=folds, rest_band_left_vs_right=rest, rig_checks=C)
(O / 'measurements.json').write_text(json.dumps(meas, indent=1))
outs = sorted([p for p in O.glob('*') if p.is_file() and p.name != 'report.json'] + list((O / 'crops').glob('*.png')) + list((O / 'graze').glob('*.png')))
rep = dict(build_id='B-yqgg', pass_=3, species='luceras', base='pass2 (right fore band already fixed)', scope='left fore weld band only, same treatment as the right fore in pass 2',
  method=[
   'Same script and settings as pass 2 (art/pipeline/sculpt/pawint_band_fix.py, side l), run on pass2/luceras_sculpt.blend. Band: left fore vertices 12 mm above to 6 mm below the join plane, own side only. Vertices with an edge leaving the band are pinned. Triangulate faces touching the band, collapse edges under 0.3 mm, beautify, clean needles under 6 degrees and triangles under 0.08 mm2 (flip if convex and better, else collapse a short edge), relax 20 iterations (tangential plus 0.35 normal, full within 3.5 mm of the ring, fading to 0 at the band edges), rejoin flat triangles into quads.',
   'Weights (art/pipeline/rig/pawint_rig2.py, side l, on pass2/rig.blend): unchanged vertices copy pass 2 weights and corrective offsets; the 718 touched vertices get nearest surface interpolation of the pass 2 weights on the pass 2 surface. Pass 2 corrective offsets were 0.0 on every touched or removed vertex and their neighbors; drivers rebuilt. Claws, skeleton, controls, actions and game mesh kept.',
   'Re-verified with pawint_rig.py verify against rig pass 3; fold localization (pawint_locate.py) on both fore legs; eight-pose sheet and paw crops re-rendered; grazing before/after on the left fore and a right vs mirrored-left board (pawint_rig.py graze_side, pawint_compose3.py).'],
  topology=dict(pass2=P1['topology']['pass2'], pass3=dict(topology_sha256=F['pass2_topology_sha256'], verts=F['verts_pass2'])),
  band=dict(touched_vertices=F['touched_vertices'], touched_outside_band=F['touched_outside_band'], offset_from_pass1_surface_mm=F['touched_offset_from_pass1_surface_mm'],
            mirror_gap_left_band_vs_right_surface_mm=F['mirror_gap_right_band_vs_left'], band_metrics_before=F['band_before'], band_metrics_after=F['band_after']),
  fold_angles_left_vs_right=folds, rest_band_left_vs_right=rest,
  checks=dict(
   one_manifold_body=dict(passed=F['mesh']['shells'] == 1 and F['mesh']['nonmanifold_edges'] == 0, **F['mesh']),
   nothing_outside_band_changed=dict(passed=F['touched_outside_band'] == 0, touched_outside_band=F['touched_outside_band']),
   no_unweighted=dict(passed=C['weights']['unweighted'] == 0), weights_normalized=dict(passed=C['weights']['max_abs_sum_minus_1'] < 1e-6, max_abs_sum_minus_1=C['weights']['max_abs_sum_minus_1']),
   claws_rigid=dict(passed=max(v['max_edge_length_change_um'] for v in cl.values()) < 1.0, max_edge_length_change_um=max(v['max_edge_length_change_um'] for v in cl.values()), root_gap_change_mm_max=C['claw_root_gap_change_mm_max']),
   correctives_verified=dict(passed=C['correctives_fire'] == C['correctives_fire_old'] and C['correctives_rest_effect_max_mm'] == 0.0, rest_effect_max_mm=C['correctives_rest_effect_max_mm'], fire_in=C['correctives_fire'],
                             effect_diff_vs_pass3_max_mm=max(abs(x['effect_new_max_mm'] - x['effect_old_max_mm']) for v in C['correctives'].values() for x in v.values())),
   both_fore_folds_cleared=dict(passed=all(folds[p][f'{s}_pass3']['edges_over_45'] == 0 for p in ('crouch', 'leap', 'landing') for s in ('fore_l', 'fore_r'))),
   weight_symmetry=C['paw_weight_symmetry'],
   posed_agreement_outside_smoothing_mm=max(v['same_rest_outside_smoothing_max_mm'] for v in C['posed_agreement_preserved'].values())),
  what_remains=[
   'The two fore legs are now close but not identical. The left reads slightly cleaner under grazing light, and the right keeps a faint soft band near the join at rest and in crouch. In leap the right fore folds more (max 42.4 degrees, smallest area ratio 0.18) than the left (25.0, 0.45); neither has an edge over 45 degrees. The difference comes from the two sides having different starting ring topology (103 and 106 ring vertices).',
   'Both legs keep a small kink on the inside of the wrist in leap, where the wrist folds deeply.',
   'The left band moved at most 0.63 mm from the pass 2 surface (mean 0.07 mm). Mirrored onto the fixed right fore surface, the left band now sits a mean of 0.042 mm away (max 0.32 mm), down from 0.076 and 0.90 mm before.',
   'Carried over: game mesh parked with out-of-date paws; pass 8 paw open items (A5b notch, A3 hind swelling, toe bands); Nick has not reviewed.'],
  blockedBy=[],
  tooling=['art/pipeline/rig/pawint_locate.py', 'art/pipeline/sculpt/pawint_band_fix.py', 'art/pipeline/rig/pawint_rig2.py', 'art/pipeline/rig/pawint_rig.py (graze modes added)', 'art/pipeline/rig/pawint_compose3.py', 'art/pipeline/rig/pawint_report3.py'],
  outputs={str(p.relative_to(O)).replace('\\', '/'): sha(p) for p in outs})
(O / 'report.json').write_text(json.dumps(rep, indent=1))
print('report', {k: v.get('passed') if isinstance(v, dict) else v for k, v in rep['checks'].items()})
print(json.dumps(folds, indent=0)); print(json.dumps(rest))
