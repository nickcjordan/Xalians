"""B-yqgg: measurements.json and report.json from the work checks."""
import json, hashlib
from pathlib import Path
O = Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-pawintegrate/pass1'); W = O / 'work'
S = json.loads((W / 'sculpt_checks.json').read_text()); B = json.loads((W / 'rig_build.json').read_text()); C = json.loads((W / 'rig_checks.json').read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
meas = dict(build_id='B-yqgg',
    sculpt=dict(old=S['old_body'], new=S['new_body'], mesh=S['mesh'], base_mesh=S['base_mesh'], odd_faces_by_region=S['odd_faces_by_region'],
                preserved_vertices=S['preserved_vertices'], new_vertices=S['new_vertices'], paw_vertices=S['paw_vertices'],
                weld=dict(ring_points=S['weld']['ring_points'], merged=S['weld']['merged'], parts=S['weld']['parts']),
                matches_pass8_preview=S['preview_compare'], paw_symmetry=S['paw_symmetry'], claws=S['claws'], dewclaws=S['dewclaws']),
    rig=dict(transfer=B['transfer'], smoothing=B['smoothing'], correctives_transfer=B['keys'], claws=B['claws'], game_mesh_unchanged=B['game_unchanged'],
             weights=C['weights'], paw_bone_usage=C['paw_bone_usage'], paw_weight_symmetry=C['paw_weight_symmetry'],
             posed_agreement_preserved_vertices=C['posed_agreement_preserved'], correctives=C['correctives'], correctives_fire=C['correctives_fire'],
             correctives_fire_pass3=C['correctives_fire_old'], correctives_rest_effect_max_mm=C['correctives_rest_effect_max_mm'], basis_equals_rest_m=C['basis_equals_rest_m'],
             claws_rigid=C['claws_rigid'], claw_root_gap_mm=C['claw_root_gap_mm'], claw_root_gap_change_mm_max=C['claw_root_gap_change_mm_max'],
             paw_join_quality=C['paw_join_quality']))
(O / 'measurements.json').write_text(json.dumps(meas, indent=1))
outs = sorted([p for p in O.glob('*') if p.is_file() and p.name != 'report.json'] + list((O / 'crops').glob('*.png')))
cl = C['claws_rigid']
rep = dict(build_id='B-yqgg', species='luceras', stage='07-surface sculpt update + 08-rig refit', decision='N-t8c8 (paws approved 2026-10-20), paws from B-pzrq pass 8',
  inputs=dict(paws=r'C:\dev\art-data\pipeline\codex-stream\luceras-pawpart\pass8\paws.blend', join_planes=r'C:\dev\art-data\pipeline\codex-stream\luceras-pawpart\pass8\work\u3\paws.npz',
              base_sculpt=r'C:\dev\art-data\pipeline\codex-stream\luceras-hindpaw\pass1\luceras_sculpt.blend (the sculpt the pass 8 preview was cut from: pass8/work/runvdb.sh opens it)',
              rig=r'C:\dev\art-data\pipeline\codex-stream\luceras-rig\pass3\rig.blend', input_files_modified=False),
  method=[
   'Sculpt (art/pipeline/sculpt/pawint_sculpt.py): opened the hindpaw pass 1 sculpt read only; cut each old paw off with the pass 8 preview bisect (paw_part_blend.cut_body, join planes from pass8/work/u3/paws.npz), with the bisect geometry sorted by index so the vertex order is deterministic run to run.',
   'Appended the four paw parts and sixteen claws from pass8/paws.blend; deleted each part cap face, joined the parts into the body and merged the 480 ring vertices by distance (1e-6 m, restricted to ring positions). 480 of 480 merged.',
   'New claws take the old claw names (matched to the nearest old claw) and the old parenting (bone leg_*_03). The fore dewclaws are kept: they sit on the leg above the cut and still touch the surface (gap 0.003 to 0.005 mm, as before). The 31 base vertex groups were filled on the new vertices by nearest surface interpolation.',
   'Confirmed against the pass 8 preview: same vertex count and every vertex position identical both ways (max 0.0 m), claw centers identical; only the vertex order differs (the preview cut order depended on Python set order).',
   'Rig (art/pipeline/rig/pawint_rig.py build): opened rig pass 3 read only and swapped luceras_blockout to the new mesh; skeleton, controls, actions and the game mesh untouched (game fingerprints equal).',
   'Weights: the 126,564 body vertices kept from the base sculpt copy their own pass 3 weight (same topology); the 84,738 new paw and ring vertices get nearest surface (barycentric) interpolation of the pass 3 weights on the old sculpt surface. Then edge diffusion (40 iterations, factor 0.5) at full strength in the paws and up to 4 mm above each join ring, fading to zero 14 mm above it. Normalized; no weight on non-deforming bones.',
   'Correctives: all six keys sit at the elbows and hips, and none had any offset on a removed vertex (max 0.0 m), so each was carried over exactly by vertex correspondence (old index to new index, zero on new paw vertices) and its driver rebuilt with the same expression and bone variable.',
   'Claws: the old sixteen claw objects were replaced by the new ones, each bound at weight 1 to its old bone with the pass 3 binding (gamemesh build_pass1.bind_rigid).',
   'Verify (pawint_rig.py verify): old and new rigs evaluated in all eight review poses: posed agreement on unchanged vertices, per-key effect by muting each key, claw edge lengths and seating, weight symmetry, paw/join triangle area and crease growth for new and old paws.',
   'Renders (pawint_rig.py render/crops/crops_old, pawint_compose.py): the pass 3 eight-pose sheet code (build_rig.renders, same cameras), paw crops in crouch, leap, landing, foreleg step (and rest) on the new and pass 3 rigs, composites. Self-reviewed every crop board.'],
  checks=dict(
   one_manifold_body=dict(passed=S['mesh']['shells'] == 1 and S['mesh']['nonmanifold_edges'] == 0, shells=S['mesh']['shells'], euler=S['mesh']['euler']),
   welds_closed=dict(passed=S['mesh']['nonmanifold_edges'] == 0 and S['mesh']['boundary_edges'] == 0 and S['weld']['merged'] == S['weld']['ring_points'], nonmanifold_edges=S['mesh']['nonmanifold_edges'], boundary_edges=S['mesh']['boundary_edges'], nonmanifold_verts=S['mesh']['nonmanifold_verts'], merged=S['weld']['merged'], ring_points=S['weld']['ring_points']),
   no_unweighted=dict(passed=C['weights']['unweighted'] == 0, unweighted=C['weights']['unweighted']),
   weights_normalized=dict(passed=C['weights']['max_abs_sum_minus_1'] < 1e-6, max_abs_sum_minus_1=C['weights']['max_abs_sum_minus_1']),
   claws_rigid=dict(passed=max(v['max_edge_length_change_um'] for v in cl.values()) < 1.0, max_edge_length_change_um=max(v['max_edge_length_change_um'] for v in cl.values()), pass3_claws_same_test_um=max(v['old_claw_max_edge_length_change_um'] for v in cl.values()), root_gap_change_mm_max=C['claw_root_gap_change_mm_max'], note='float32 noise; one bone at weight 1 each'),
   correctives_verified=dict(passed=C['correctives_fire'] == C['correctives_fire_old'] and C['correctives_rest_effect_max_mm'] == 0.0, rest_effect_max_mm=C['correctives_rest_effect_max_mm'], fire_in=C['correctives_fire']),
   paw_join_crops=dict(passed=None, note='visual: no collapse or tearing seen in any paw crop; see what_remains for the right fore weld line and the right fore metric outlier'),
   left_right_symmetry=dict(paw_surface_mirror_mm=S['paw_symmetry'], paw_weight_mirror=C['paw_weight_symmetry'], claw_center_mirror_mm_max=max(S['claws']['mirror_center_diff_mm'].values()))),
  topology=dict(old=S['old_body'], new=S['new_body']),
  game_mesh=dict(status='parked, untouched (fingerprints equal)', note='Its paws are now out of date: it still carries the pre-pass-8 paws and the old claw islands. Re-derive it from the new sculpt when the 3D output is unparked.'),
  what_remains=[
   'Right fore leg: a thin seam line circles the leg 3 to 4 cm above the paw (the pass 8 weld band, A4 carried). It is in the sculpt geometry, visible at rest, identical in the approved preview, and only on the right fore. Not fixed here because it would change approved geometry; a local ring-band relax on the right fore is the smallest fix.',
   'Right fore paw/join metric outlier: in crouch, leap and landing a few triangles near the right fore join reach crease growth 86 to 176 degrees and area ratio 0.25 (11, 26 and 4 edges over 45 degrees), against 15 to 76 degrees on the left fore and 61 to 71 on the pass 3 right fore. Weights mirror within 0.033, so the cause is most likely sliver triangles in the right fore weld band (where the seam line is). Not localized in this pass; no visible tear or fold in the right fore crops beyond the seam line.',
   'Wrist folding in leap on both fore paws is as deep as in pass 3 (left fore min area ratio 0.23 vs 0.34); the paw folds back smoothly in the crops.',
   'Preserved vertices inside the join smoothing band move up to 0.81 mm differently from pass 3 in leap (by design); everywhere else posed positions match pass 3 within 0.0001 mm.',
   'The sculpt keeps the base file 106 n-gons and 3 zero-area faces (all in preserved body regions, unchanged).',
   'Paws inherit pass 8 open items: A5b groove back-end notch, A3 faint hind leg swelling, toe width and dip bands.',
   'Game mesh paws out of date (parked). GLB not re-exported (game mesh only, unchanged).',
   'Nick has not seen the new deformation sheet or the paw crops.'],
  blockedBy=[],
  tooling=['art/pipeline/sculpt/pawint_sculpt.py', 'art/pipeline/rig/pawint_rig.py', 'art/pipeline/rig/pawint_compose.py', 'art/pipeline/rig/pawint_report.py', 'art/pipeline/rig/pawint_inspect.py'],
  outputs={str(p.relative_to(O)).replace('\\', '/'): sha(p) for p in outs})
(O / 'report.json').write_text(json.dumps(rep, indent=1))
print('report written', len(outs), 'outputs', {k: v.get('passed') for k, v in rep['checks'].items() if isinstance(v, dict)})
