"""B-78vx: write clips.json (contract-shaped clips plus the parameters and measured geometry) and report.json.

python finalize.py OUT_DIR
Reads OUT/work/bake.json, OUT/work/measure.json, OUT/iter_notes.json; hashes every deliverable.
"""
import hashlib, json, sys
from pathlib import Path

FPS = 30
OUT = Path(sys.argv[1]).resolve()
W = OUT / 'work'
b = json.loads((W / 'bake.json').read_text()); m = json.loads((W / 'measure.json').read_text())
SIG = 'sig.horns-first-descent'


def r3(x):
    return round(float(x), 3)


sig_events = [{'name': n, 'timeMs': r3(ms)} for n, ms in b['events']]
sig_events.append({'name': 'recover', 'timeMs': r3(m['recover']['ms'])})
sig_events.sort(key=lambda e: e['timeMs'])
P = b['params']
hit = m['hit']
rows = m[SIG]


def maxv(rows, key, sub=None):
    vals = []
    for r in rows:
        v = r.get(key)
        if v is None: continue
        if isinstance(v, dict): vals += list(v.values())
        else: vals.append(v)
    return max(vals) if vals else 0.0


def corr_summary(rows):
    out = {}
    for r in rows:
        for k, v in r['correctives'].items():
            o = out.setdefault(k, dict(max=0.0, frames_over_0_05=0))
            o['max'] = max(o['max'], v); o['frames_over_0_05'] += v > 0.05
    return {k: dict(max=round(v['max'], 3), frames_over_0_05=v['frames_over_0_05']) for k, v in out.items()}


clips = {
    'idle': {'durationMs': P['idle']['duration_ms'], 'loop': True, 'events': []},
    SIG: {'durationMs': P[SIG]['duration_ms'], 'loop': False, 'archetype': 'lunge', 'events': sig_events,
          'travel': {'distanceM': r3(b['travel']['distanceM']), 'startMs': r3(b['travel']['startMs']), 'endMs': r3(b['travel']['endMs'])},
          'reachM': r3(hit['reach_m'])},
}
extras = {
    'idle': {'frames': b['info']['idle']['frames'], 'parameters': P['idle'], 'seam': m['idle_seam']},
    SIG: {
        'frames': b['info'][SIG]['frames'],
        'parameters': P[SIG],
        'phaseTimesMs': {k: r3(v) for k, v in b['times'].items()},
        'travelCurve': 'linear between startMs and endMs (the game moves the root; the review render applies the same)',
        'reachDefinition': 'horizontal distance from the clip root (origin) to the leading horn surface point along the dive direction at the hit frame',
        'hitContactInPlaceM': [r3(x) for x in hit['contact_inplace']],
        'hitContactHeightM': r3(hit['contact_height_m']),
        'hitContactFromStartM': r3(hit['root_at_hit_m'] + hit['reach_m']),
        'contactHorn': hit['contact_horn'],
        'hornTipsAtHitInPlaceM': {k: [r3(x) for x in v] for k, v in hit['horn_tips_inplace'].items()},
        'diveDirection': [r3(x) for x in hit['dive_dir']],
        'hitSolve': b.get('hit_solve'),
        'hitStopContactDriftMm': hit.get('hold_contact_drift_mm'),
        'durationNote': 'Longer than the 1.6 s act budget: the leap reads as high only with about 0.36 s of rise, a hang and a separate dive. The hit is at the earliest frame that keeps those three beats (before the halfway point).',
    },
}
checks = {}
for name in ('idle', SIG):
    rr = m[name]
    checks[name] = dict(
        min_vertex_z_mm=round(min(r['min_z_mm'] for r in rr), 2),
        planted_foot_slide_max_mm=round(maxv(rr, 'planted_slide_mm'), 3),
        horn_tip_to_body_min_mm=round(min(r['horn_tip_to_body_mm'] for r in rr), 1),
        claw_edge_change_max_um=round(max(r['claw_edge_change_um'] for r in rr), 3),
        correctives=corr_summary(rr),
    )
lead = [r for r in rows if b['times']['dive'] - 1 <= r['ms'] <= b['times']['hit'] + 1]
checks[SIG]['horns_lead_during_descent'] = dict(frames=[r['frame'] for r in lead], min_margin_mm=round(min(r['horn_lead_margin_mm'] for r in lead), 1))
checks[SIG]['recover'] = m['recover']
(OUT / 'clips.json').write_text(json.dumps(dict(species='luceras', build='B-78vx', fps=FPS, rig='luceras-pawintegrate/pass3/rig.blend (B-yqgg pass 3)',
                                                clips=clips, extras=extras, checks=checks), indent=1))
(OUT / 'params.json').write_text(json.dumps({k: P[k] for k in ('idle', SIG)}, indent=1))

notes = json.loads((OUT / 'iter_notes.json').read_text()) if (OUT / 'iter_notes.json').exists() else {}
outs = {}
for p in sorted(OUT.rglob('*')):
    if p.is_file() and 'work' not in p.parts and 'frames' not in p.parts and p.name != 'report.json':
        outs[str(p.relative_to(OUT)).replace('\\', '/')] = hashlib.sha256(p.read_bytes()).hexdigest()
report = dict(
    build_id='B-78vx', stage=9, species='luceras', status='review', pass_=int(OUT.name.replace('pass', '') or 1),
    changes=notes.get('changes', []),
    rig='C:\\dev\\art-data\\pipeline\\codex-stream\\luceras-pawintegrate\\pass3\\rig.blend (read only)',
    method=[
        'Clips are code: art/pipeline/animate/luceras_clips.py turns named parameters (params.json) into a pose spec per frame; the signature is the lunge archetype (launch, hit, recover) with the leap, hang, pitch-over and dive as extra keys.',
        'Shared primitives: eased key tracks, lag down the tail chain (each joint reads the spec 38 ms later and resists body pitch changes), a decaying whip, a breathing cycle on the approved breath_in chest scale, anticipation and overshoot.',
        'art/pipeline/animate/pose_rig.py poses the deform rig directly (its control-input constraints stay off): body placement about the mid-spine, chain rotations, then a two-link solver per leg that blends a planted target (toe tip on the ground, heel-lift roll about the toe) with the leg FK pose, using the FK knee as the pole and lifting any target whose toe would go under the ground.',
        'Every deform joint is keyed every frame (location, rotation, scale) in actions named idle and sig.horns-first-descent in work/clips.blend; the keyed action is re-evaluated and compared against the posed values.',
        'The hit body height is solved so the leading horn surface meets the target at hit_contact_height_m; travel and reach are measured from the posed meshes, not typed.',
        'Per-frame checks on the evaluated meshes: lowest vertex, planted toe slide, horn tips to the non-head body, horns leading along the body axis in the descent, corrective key values, claw edge lengths.',
        'Review renders: look-dev clay, lights and ground (art/pipeline/roster/lookdev.py), EEVEE, orthographic side camera from the creature\'s right so it closes to the right of frame, and a front-right three-quarter camera. The signature review applies the declared travel to the rig object; the 192 px game-size render is in place.',
        'Pass 2: a hit-stop pins the leading horn point (in head space) at the contact for the hit frame plus two, the body is translated to hold it while the neck S-bends 28 deg, the spine hunches and the chest squashes; the pin then fades over 110 ms into the rebound. Fore and hind legs stay tucked until the body is within leg_reach_window_m of its landing height.',
        'Pass 2 cameras: side (fixed, whole travel), sidetrack (follows the body horizontally, fixed height band so the leap height still reads), three-quarter (fixed); 192 px: sidecell (a 1.45 m window following the body, in place, so the creature fills the cell) and side with travel (fixed).',
        'Videos are assembled with Blender\'s bundled FFmpeg (no ffmpeg on the machine); WebP, GIF, strips and contact sheets with PIL (compose.py).',
    ],
    outputs=outs,
    what_remains=notes.get('what_remains', []),
    blockedBy=[],
    tooling=['art/pipeline/animate/luceras_clips.py', 'art/pipeline/animate/pose_rig.py', 'art/pipeline/animate/compose.py', 'art/pipeline/animate/finalize.py', 'art/pipeline/animate/inspect_rig.py'],
)
(OUT / 'report.json').write_text(json.dumps(report, indent=1))
print('finalized', len(outs), 'outputs')
