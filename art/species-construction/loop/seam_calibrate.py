"""Calibration cases for seam_check.py: recorded candidates with a known verdict.

    python art/species-construction/loop/seam_calibrate.py [--json out.json]

Each case is (candidate, baseline, defect, joints where the defect lives, round, source). `defect` is
None for a control (a candidate whose seams were judged clean or an unchanged re-assembly). Prints the
largest change per metric over all joints and views, and which joint and view carries it, then whether
the check flags it with the thresholds in species.json. The cases are read from the round records
(docs/design/species-construction/akinza/loop/rounds/round-NN.json, the verdict reasons)."""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import seam_check as sc  # noqa: E402

CASES = [
    # candidate, baseline, defect text (None = clean control), joints (where the defect should show), source
    ('assembled-2112', 'assembled-0458', 'boot-cuff collar and side crease at the ankle', ['ankle'], 'round 18 R09'),
    ('assembled-2078', 'assembled-0458', 'ankle collar and heel knob', ['ankle'], 'round 17 R09'),
    ('assembled-2075', 'assembled-0458', 'needles at the rear fan edge', ['earFanRoot', 'neckBase'], 'round 17 R04'),
    ('assembled-0358', 'assembled-0336', 'dented the upper tail', ['hip'], 'round 9 R06'),
    ('assembled-0418', 'assembled-0408', 'ledge and corner nubs on each upper arm, corner kinks at the caps', ['shoulder', 'elbow'], 'round 13 R05'),
    ('assembled-0342', 'assembled-0336', 'tail kink and thigh band', ['hip', 'knee'], 'round 8 R08'),
    ('assembled-0274', 'assembled-0265', 'belt lines on the trunk, knob on the top tail root', ['hip', 'shoulder'], 'round 3 R06'),
    ('assembled-0345', 'assembled-0336', 'nape spikes and holes', ['neckBase', 'earFanRoot'], 'round 8 R04'),
    ('assembled-0303', 'assembled-0291', 'box and gap artifacts on the fan top', ['earFanRoot'], 'round 5 R03'),
    ('assembled-0428', 'assembled-0419', 'faint crease with a small back-outline step at each ankle top (kept)', ['ankle'], 'round 14 R08'),
    ('assembled-2055', 'assembled-0458', None, [], 'unchanged re-assembly'),
    ('assembled-0450', 'assembled-0442', None, [], 'round 16 R07 (smooth arms, no defect named)'),
    ('assembled-0457', 'assembled-0442', None, [], 'round 16 R03 (fan locks, no seam defect)'),
    ('assembled-0371', 'assembled-0336', None, [], 'round 10 R06 (pelvis shelf removed)'),
    ('assembled-0396', 'assembled-0377', None, [], 'round 11 R04 (wing locks, no seam defect)'),
    ('assembled-0442', 'assembled-0428', None, [], 'round 15 R03 (tuft locks, no seam defect)'),
    ('assembled-0402', 'assembled-0396', None, [], 'round 12 R09 (graded toes, no seam defect named)'),
    ('assembled-0305', 'assembled-0291', 'pointed shoulder cap corner, dark pockets behind the caps', ['shoulder'], 'round 5 R07'),
    ('assembled-0327', 'assembled-0320', None, [], 'round 7 R05 (rear deltoid knob removed, caps rounded)'),
    ('assembled-0290', 'assembled-0265', None, [], 'round 4 R06 (chest smoothed)'),
]


def run():
    rows = []
    for cand, base, defect, joints, source in CASES:
        report = sc.check(cand, base)
        peak = {}
        for view, joints_ in report['views'].items():
            for joint, e in joints_.items():
                for m in sc.METRICS:
                    v = e["change"][m]
                    if v > peak.get(m, (0,))[0]:
                        peak[m] = (v, joint, view)
        rows.append({'candidate': cand, 'baseline': base, 'defect': defect, 'joints': joints, 'source': source,
                     'peak': {m: [round(p[0], 4), p[1], p[2]] for m, p in peak.items()},
                     'flagged': [{'joint': f['joint'], 'view': f['view'], 'metrics': f['metrics']} for f in report['flagged']]})
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--json')
    args = parser.parse_args()
    rows = run()
    for r in rows:
        print(f"{r['candidate']} vs {r['baseline']} [{r['source']}] defect: {r['defect']}")
        print('   peak: ' + '; '.join(f"{m} {v[0]:.4f} ({v[1]} {v[2]})" for m, v in r['peak'].items()))
        print('   flagged: ' + (', '.join(f"{f['joint']}/{f['view']}:{'+'.join(f['metrics'])}" for f in r['flagged']) or 'none'))
    if args.json:
        Path(args.json).write_text(json.dumps(rows, indent=1)+'\n')


if __name__ == '__main__':
    main()
