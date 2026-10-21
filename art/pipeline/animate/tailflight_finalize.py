"""B-378v: checks summary and report.json for the tail-in-flight pass (Windows Python, numpy).

python tailflight_finalize.py PASS_DIR
Reads PASS/work/{bake,measure,check_after,check_before,rig_bones}.json and PASS/posed/posed_{before,after}.json,
writes PASS/work/checks.json and PASS/report.json (outputs hashed).
"""
import hashlib, json, math, sys
from pathlib import Path
import numpy as np

FPS = 30
OUT = Path(sys.argv[1]).resolve(); W = OUT / 'work'
SIG = 'sig.horns-first-descent'
J = lambda p: json.loads(Path(p).read_text())
bake, meas, ca, cb, rb = J(W / 'bake.json'), J(W / 'measure.json'), J(W / 'check_after.json'), J(W / 'check_before.json'), J(W / 'rig_bones.json')
T = bake['times']; fr = lambda ms: round(ms * FPS / 1000)
takeoff, hit, fore_land, hind_land = fr(T['takeoff']), fr(T['hit']), fr(T['fore_land']), fr(T['hind_land'])
P = bake['params'][SIG]; PI = bake['params']['idle']


def ydirs(rows, names):
    return np.array([[np.array(r['mats'][n])[:3, 1] / np.linalg.norm(np.array(r['mats'][n])[:3, 1]) for n in names] for r in rows])


def ang(a, b):
    return np.degrees(np.arccos(np.clip((a * b).sum(-1), -1, 1)))


def snap(rows, names):
    D = ydirs(rows, names); v = ang(D[1:], D[:-1])                  # deg per frame
    acc = np.abs(np.diff(v, axis=0))                                    # change of speed between frames
    out = {}
    for j, n in enumerate(names):
        out[n] = dict(max_deg_per_frame=round(float(v[:, j].max()), 1), at_frame=int(v[:, j].argmax()) + 1,
                      max_speed_change_deg=round(float(acc[:, j].max()), 1), at=int(acc[:, j].argmax()) + 1)
    return out, v


tails_a = sorted(n for n in ca[SIG][0]['mats'] if n.startswith('tail_')); tails_b = sorted(n for n in cb[SIG][0]['mats'] if n.startswith('tail_'))
snap_a, va = snap(ca[SIG], tails_a); snap_b, vb = snap(cb[SIG], tails_b)
air = range(takeoff, fore_land)            # takeoff to the fore feet down
flight = range(takeoff, hit + 1)           # takeoff to the hit
pe = lambda c, key, rng: max(c[SIG][f][key] for f in rng)
nontail = {}
for clip in (SIG, 'idle'):
    worst = 0.0
    for x, y in zip(ca[clip], cb[clip]):
        for n, M in y['mats'].items():
            if n.startswith('tail_') and (clip == SIG): continue
            worst = max(worst, float(np.abs(np.array(x['mats'][n]) - np.array(M)).max()))
    nontail[clip] = worst
posed = {k: J(OUT / 'posed' / f'posed_{k}.json') for k in ('before', 'after')}
clear = [r['tail_clearance_mm'] for r in meas[SIG]]; cleari = [r['tail_clearance_mm'] for r in meas['idle']]
checks = {
    'other_tracks_unchanged': {'signature_non_tail_bones_max_matrix_diff': nontail[SIG], 'idle_all_original_40_bones_max_matrix_diff': nontail['idle'],
                               'note': 'pose matrices of every bone in both clips compared frame by frame with luceras-neck pass2 clips.blend; in the idle tail_01..06 are identical too'},
    'plume_direction_deg': {
        'definition': 'measured on the plume stand-in (same tube and weights as the furred plume): elevation of the line from the tube ring at the old tail_06 tip to the plume tip ("plume"), and of the last 12 rings ("tip"); 0 = straight back, 90 = straight up, over 90 = leaning forward',
        'flight_takeoff_to_hit': {'frames': [takeoff, hit], 'pass2_plume_max': round(pe(cb, 'plume_elev_deg', flight), 1), 'this_pass_plume_max': round(pe(ca, 'plume_elev_deg', flight), 1),
                                  'pass2_tip_max': round(pe(cb, 'plume_tip_elev_deg', flight), 1), 'this_pass_tip_max': round(pe(ca, 'plume_tip_elev_deg', flight), 1)},
        'airborne_takeoff_to_fore_feet_down': {'frames': [takeoff, fore_land - 1], 'pass2_plume_max': round(pe(cb, 'plume_elev_deg', air), 1), 'this_pass_plume_max': round(pe(ca, 'plume_elev_deg', air), 1),
                                               'pass2_tip_max': round(pe(cb, 'plume_tip_elev_deg', air), 1), 'this_pass_tip_max': round(pe(ca, 'plume_tip_elev_deg', air), 1)},
        'per_frame': [{'frame': a['frame'], 'pass2_plume': round(b['plume_elev_deg'], 1), 'plume': round(a['plume_elev_deg'], 1), 'pass2_tip': round(b['plume_tip_elev_deg'], 1), 'tip': round(a['plume_tip_elev_deg'], 1)}
                      for a, b in zip(ca[SIG], cb[SIG])],
    },
    'tail_clearance_mm': {'definition': 'nearest distance from the tail skin past tail_01 and the plume stand-in to every body vertex that is not tail or pelvis (legs included), in place, every frame',
                          'signature_min': round(min(clear), 1), 'signature_min_frame': int(np.argmin(clear)), 'idle_min': round(min(cleari), 1),
                          'frames_under_20mm': [i for i, c in enumerate(clear) if c < 20]},
    'snap': {'definition': 'per tail bone, the largest rotation between consecutive frames and the largest change of that rate between frames (a snap shows as a one-frame spike)',
             'this_pass': snap_a, 'pass2': snap_b,
             'this_pass_max_outside_hit_whip': round(float(max(va[f - 1].max() for f in range(1, len(va) + 1) if not (hit <= f <= hit + 8))), 1),
             'pass2_max_outside_hit_whip': round(float(max(vb[f - 1].max() for f in range(1, len(vb) + 1) if not (hit <= f <= hit + 8))), 1)},
    'idle_seam': meas['idle_seam'],
    'plume_binding_furred_frames': {k: {n: {'strand_root_error_max_mm': max(x['root_error_max_mm'] for o, x in v['plume_binding'].items() if o != 'Plume spine curve'), 'nonfinite': v['nonfinite'], 'reference_spine_curve_mm': v['plume_binding'].get('Plume spine curve', {}).get('root_error_max_mm')} for n, v in posed[k]['frames'].items()} for k in posed},
    'plume_binding_note': 'strand roots (dark and white plume strands) against the evaluated tube; the hidden Plume spine curve reads 7.8 mm by construction (its root is on the tube axis, see the pass 9 report)',
    'recover': meas['recover'], 'hit': {k: meas['hit'][k] for k in ('frame', 'reach_m', 'contact_height_m')},
}
(W / 'checks.json').write_text(json.dumps(checks, indent=1))

tailp = {k: v for k, v in P.items() if k.startswith('tail_')}
phases = {
    'crouch (0 to %d ms)' % T['crouch']: {k: tailp[k] for k in ('tail_crouch_s', 'tail_crouch_lift_deg', 'tail_crouch_swish_deg', 'tail_crouch_swish_ms')},
    'launch (takeoff %.0f ms)' % T['takeoff']: {k: tailp[k] for k in ('tail_launch_s', 'tail_launch_lift_deg', 'tail_straighten_ms')},
    'rise and apex (to %.0f ms)' % T['pitch0']: {k: tailp[k] for k in ('tail_target_deg', 'tail_stream_lift_deg', 'tail_stream_arc_deg', 'tail_plume_tip_trim_deg')},
    'dive (%.0f to %.0f ms)' % (T['pitch0'], T['hit']): {k: tailp[k] for k in ('tail_dive_counter_deg', 'tail_counter_ms', 'tail_dive_arc_deg', 'tail_inertia', 'tail_inertia_lag_cap')},
    'hit (%.0f ms)' % T['hit']: {k: tailp[k] for k in ('tail_whip_deg', 'tail_whip_period_ms', 'tail_whip_decay_ms', 'tail_whip_max_factor')},
    'rebound and landing (%.0f to %.0f ms)' % (T['hit'], T['recover']): {k: tailp[k] for k in ('tail_land_s', 'tail_land_lift_deg', 'tail_settle_s')},
    'whole chain': {k: tailp[k] for k in ('tail_joints', 'tail_lag_ms', 'tail_straighten_lag_ms')},
    'idle (plume bones only; tail_01..06 unchanged)': {k: PI[k] for k in ('plume_sway_deg', 'plume_lift_deg', 'plume_lag_ms')},
}


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


outs = {}
for p in sorted(OUT.rglob('*')):
    if p.is_file() and 'frames' not in p.parts and 'frames_try' not in str(p) and p.suffix in ('.mp4', '.png', '.json', '.blend', '.py', '.sh') and p.name != 'report.json':
        if p.suffix == '.blend' and p.name.endswith('1'): continue
        outs[str(p.relative_to(OUT)).replace('\\', '/')] = sha(p)
REPO = Path(r'C:\dev\src\xalians-creature-pipeline\art\pipeline\animate')
tooling = {f'art/pipeline/animate/{n}': sha(REPO / n) for n in ('luceras_clips.py', 'pose_rig.py', 'tailflight_rig.py', 'tailflight_check.py', 'posed_tailflight.py', 'tailflight_compose.py', 'tailflight_finalize.py', 'compose.py')}
notes = J(W / 'notes.json') if (W / 'notes.json').exists() else {}
report = {
    'build_id': 'B-378v', 'defect': 'D-xqpy', 'species': 'luceras', 'stage': 9, 'pass_': 1,
    'inputs': {k: {'path': p, 'sha256': sha(p)} for k, p in (('rig', r'C:\dev\art-data\pipeline\codex-stream\luceras-neck\pass2\rig.blend'),
                                                             ('clips', r'C:\dev\art-data\pipeline\codex-stream\luceras-neck\pass2\clips.blend'),
                                                             ('groom', r'C:\dev\art-data\pipeline\codex-stream\luceras-groom\pass9\groom.blend'))},
    'method': notes.get('method', []),
    'new_bones': {'bones': rb['bones'], 'extension_arc_m': round(rb['extension_arc_m'], 4), 'bone_mid_arcs_m': [round(x, 4) for x in rb['bone_mid_arcs_m']],
                  'sprite_only': 'bone custom property sprite_only = True and rig property sprite_only_bones; the parked game mesh has no weights on them (it keeps its 40 joints). export_asset.py counts len(rig.data.bones), so a game export from this rig must drop sprite_only bones first.',
                  'plume_weighting': rb['weight_scheme'], 'weights_before_sample_by_arc_m': rb['weights_before_sample'], 'weights_after_sample_by_arc_m': rb['weights_after_sample']},
    'tail_parameters': phases,
    'phase_times_ms': {k: round(v, 1) for k, v in T.items()},
    'checks_summary': {
        'other_tracks_unchanged': checks['other_tracks_unchanged'],
        'plume_flight': checks['plume_direction_deg']['flight_takeoff_to_hit'],
        'plume_airborne_incl_rebound': checks['plume_direction_deg']['airborne_takeoff_to_fore_feet_down'],
        'tail_clearance_mm': {k: v for k, v in checks['tail_clearance_mm'].items() if k != 'definition'},
        'snap_max_deg_per_frame_outside_hit_whip': {'this_pass': checks['snap']['this_pass_max_outside_hit_whip'], 'pass2': checks['snap']['pass2_max_outside_hit_whip']},
        'idle_seam': checks['idle_seam'],
        'plume_strand_root_error_max_mm': {k: max(v['strand_root_error_max_mm'] for v in d.values()) for k, d in checks['plume_binding_furred_frames'].items()},
        'full': 'work/checks.json',
    },
    'hair_streaming': notes.get('hair_streaming', ''),
    'outputs': outs, 'tooling': tooling,
    'remains': notes.get('remains', []), 'blockedBy': [],
}
(OUT / 'report.json').write_text(json.dumps(report, indent=1))
print('REPORT', OUT / 'report.json', json.dumps(report['checks_summary'], indent=1)[:3000])
