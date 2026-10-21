"""B-378v pass 2: elevation table (pass 1 vs pass 2 per phase), checks and report.json (Windows Python, numpy).

python tailflight_finalize_pass2.py PASS2_DIR
Needs PASS2/work/{bake,measure,check_after,check_before,elevation_table,notes}.json (check_before = pass 1 clips).
"""
import hashlib, json, math, sys
from pathlib import Path
import numpy as np

OUT = Path(sys.argv[1]).resolve(); W = OUT / 'work'; SIG = 'sig.horns-first-descent'
J = lambda p: json.loads(Path(p).read_text())
bake, meas, ca, cb, tab, notes = (J(W / n) for n in ('bake.json', 'measure.json', 'check_after.json', 'check_before.json', 'elevation_table.json', 'notes.json'))
P = bake['params'][SIG]
PH = {'launch_uncurl_f11_f16': range(11, 17), 'rise_f17_f21': range(17, 22), 'apex_f22': range(22, 23), 'pitch_over_f23_f24': range(23, 25),
      'dive_f25_f29': range(25, 30), 'hit_stop_and_rebound_airborne_f30_f37': range(30, 38), 'landing_f38_f40': range(38, 41)}
DIVE_LINE = math.degrees(math.radians(P['dive_pitch_deg']))   # backward line of the straight dive path
table = {}
for ph, rng in PH.items():
    rows = [tab[f] for f in rng]; d = {}
    for p in ('p1', 'p2'):
        d['pass1' if p == 'p1' else 'pass2'] = {k: round(max(r[f'{p}_{k}'] for r in rows), 1) for k in ('tail_max', 'plume', 'tip')}
    if ph == 'dive_f25_f29':
        for k in ('pass1', 'pass2'):
            d[k + '_above_backward_dive_line'] = {kk: round(v - DIVE_LINE, 1) for kk, v in d[k].items()}
        d['backward_dive_line_deg'] = DIVE_LINE
    table[ph] = d


def speeds(c, n):
    D = np.array([np.array(r['mats'][n])[:3, 1] / np.linalg.norm(np.array(r['mats'][n])[:3, 1]) for r in c[SIG]])
    return np.degrees(np.arccos(np.clip((D[1:] * D[:-1]).sum(-1), -1, 1)))


v9a, v9b = speeds(ca, 'tail_09'), speeds(cb, 'tail_09')
tips = [tab[f]['p2_tip'] for f in range(11, 17)]
nontail = 0.0
for clip in (SIG, 'idle'):
    for x, y in zip(ca[clip], cb[clip]):
        for n, M in y['mats'].items():
            if clip == SIG and n.startswith('tail_'): continue
            nontail = max(nontail, float(np.abs(np.array(x['mats'][n]) - np.array(M)).max()))
posed = J(OUT / 'posed' / 'posed_after.json')
checks = {
    'definition': 'deg above horizontal, pointing back (0 straight back, 90 straight up). tail_max = steepest tail bone (tail_01..09, pass 1 and 2 both have the plume bones); plume = stand-in line from the old tail_06 tip to the plume tip; tip = last 12 rings of the stand-in. The backward dive line is the straight dive path reversed (dive_pitch_deg).',
    'elevation_by_phase': table,
    'takeoff_uncurl': {'pass2_plume_tip_f11_to_f16': tips, 'monotonic_decreasing': all(b < a for a, b in zip(tips, tips[1:])),
                       'tail_09_deg_per_frame_f10_to_f20': {'pass1': [round(float(x), 1) for x in v9b[9:20]], 'pass2': [round(float(x), 1) for x in v9a[9:20]]}},
    'other_tracks_vs_pass1_max_matrix_diff': nontail,
    'tail_clearance_min_mm': round(min(r['tail_clearance_mm'] for r in meas[SIG]), 1),
    'plume_strand_root_error_max_mm': max(max(x['root_error_max_mm'] for o, x in v['plume_binding'].items() if o != 'Plume spine curve') for v in posed['frames'].values()),
    'hit': {k: meas['hit'][k] for k in ('frame', 'reach_m', 'contact_height_m')},
    'per_frame': tab,
}
(W / 'checks.json').write_text(json.dumps(checks, indent=1))
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
outs = {str(p.relative_to(OUT)).replace('\\', '/'): sha(p) for p in sorted(OUT.rglob('*'))
        if p.is_file() and 'frames' not in p.parts and p.suffix in ('.mp4', '.png', '.json', '.blend', '.py', '.sh') and p.name != 'report.json' and not p.name.endswith('.blend1')}
REPO = Path(r'C:\dev\src\xalians-creature-pipeline\art\pipeline\animate')
report = {
    'build_id': 'B-378v', 'defect': 'D-xqpy', 'species': 'luceras', 'stage': 9, 'pass_': 2,
    'inputs': {'pass1': str(OUT.parent / 'pass1' / 'report.json'), 'rig': 'pass2/rig.blend = byte copy of pass1/rig.blend (sha %s)' % sha(OUT / 'rig.blend')},
    'changes': notes['changes'], 'method': notes['method'],
    'tail_parameters': {k: v for k, v in P.items() if k.startswith('tail_')},
    'tail_parameters_changed_from_pass1': notes['param_changes'],
    'elevation_by_phase': table,
    'checks_summary': {k: v for k, v in checks.items() if k not in ('per_frame', 'elevation_by_phase')},
    'outputs': outs,
    'tooling': {f'art/pipeline/animate/{n}': sha(REPO / n) for n in ('luceras_clips.py', 'pose_rig.py', 'tailflight_check.py', 'posed_tailflight.py', 'tailflight_compose.py', 'tailflight_finalize_pass2.py')},
    'remains': notes['remains'], 'blockedBy': [],
}
(OUT / 'report.json').write_text(json.dumps(report, indent=1))
print(json.dumps(table, indent=1)); print(json.dumps(checks['takeoff_uncurl'])); print('nontail', nontail, 'clear', checks['tail_clearance_min_mm'], 'roots', checks['plume_strand_root_error_max_mm'])
