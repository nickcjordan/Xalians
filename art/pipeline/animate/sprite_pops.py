"""Luceras sprites: head-detail and plume pop checks from sprite_render.py measure.json.

python sprite_pops.py MEASURE.json OUT.json
- head parts (nose pad, lid rims, lid shells, lip lines) are rigid on head_01 while the skin deforms; a pop would show as
  the part-to-skin gap jumping between frames. Per part and frame: median and minimum distance (mm) from the part's
  vertices to the evaluated skin. Flags: a one-frame spike (step >= 2.5x the larger neighbouring step and >= 0.5 mm), and
  any frame where the part sinks into or lifts off the skin by more than 1 mm against its rest (frame 0) gap.
- plume: proxy ring centres along the plume; per frame the step of each centre (mm). Pop = a step >= 2.5x the larger
  neighbouring step and >= 25 mm (the tailflight_pops.py rule): a one-frame spike, not a fast continuous move.
"""
import json, sys
import numpy as np

m = json.load(open(sys.argv[1])); out = {}


def spikes(steps, thr):
    res = []
    for i in range(1, len(steps) - 1):
        nb = max(steps[i - 1], steps[i + 1], 1e-9)
        if steps[i] >= thr and steps[i] >= 2.5 * nb: res.append(i)
    return res


for clip, rows in m['clips'].items():
    rec = dict(parts={}, plume={})
    names = sorted(rows[0]['part_skin_gap_mm'])
    for n in names:
        med = np.array([r['part_skin_gap_mm'][n][0] for r in rows]); mn = np.array([r['part_skin_gap_mm'][n][1] for r in rows])
        st = np.abs(np.diff(med)).tolist()
        rec['parts'][n] = dict(median_gap_mm_range=[round(float(med.min()), 3), round(float(med.max()), 3)], drift_from_frame0_mm=round(float(np.abs(med - med[0]).max()), 3),
                               min_gap_mm=round(float(mn.min()), 3), max_step_mm=round(float(max(st)), 3), spike_frames=[i + 1 for i in spikes(st, 0.5)],
                               drift_over_1mm_frames=[int(i) for i in np.where(np.abs(med - med[0]) > 1.0)[0]])
    R = np.array([r['plume_rings'] for r in rows])          # frames x rings x 3
    st = np.linalg.norm(np.diff(R, axis=0), axis=2) * 1000  # mm per frame
    per_ring = [dict(ring=k, max_step_mm=round(float(st[:, k].max()), 1), pops=[i + 1 for i in spikes(st[:, k].tolist(), 25.0)]) for k in range(st.shape[1])]
    rec['plume'] = dict(rings=per_ring, pops=sorted({p for r_ in per_ring for p in r_['pops']}))
    out[clip] = rec
json.dump(out, open(sys.argv[2], 'w'), indent=1)
for clip, rec in out.items():
    print(clip, 'plume pops', rec['plume']['pops'], 'max ring step', max(r['max_step_mm'] for r in rec['plume']['rings']))
    for n, v in rec['parts'].items(): print('  ', n, v)
