"""B-sntv pass 5: plausibility table from reskin_plaus.py outputs.

python reskin_plaus_table.py OUT.md OUT.json LABEL=sheet.json,sig.json [LABEL=...]
Limits: forelimb abduction (humerus, forearm) at most 12 deg; hind limb abduction at most 10 deg beyond rest (the rest
femur already sits 14 deg out); fore tuck elbow 25 to 180 deg and carpus flexion at most 120 deg.
"""
import json, sys
OUT_MD, OUT_JSON = sys.argv[1], sys.argv[2]
sets = []
for a in sys.argv[3:]:
    lab, files = a.split('=', 1); d = {}
    for f in files.split(','): d.update(json.load(open(f)))
    sets.append((lab, d))
LIM_F, LIM_H = 12.0, 10.0
lines = []; tab = {}
for lab, d in sets:
    lines += [f'## {lab}', '', '| pose | fore humerus abd (L/R) | fore forearm abd (L/R) | elbow deg | carpus flex | hind thigh abd vs rest | hind gaskin abd vs rest | stifle deg | hock flex | within limits |',
              '|---|---|---|---|---|---|---|---|---|---|']
    tab[lab] = {}
    for p, m in d.items():
        if p == 'rest': continue
        fl, fr, hl, hr = m['fl'], m['fr'], m['hl'], m['hr']
        fa = max(abs(fl['humerus_abd']), abs(fr['humerus_abd']), abs(fl['forearm_abd']), abs(fr['forearm_abd']))
        # pass 9 (one-sided hind rule): outward at most 10 deg beyond rest; inward is fine while the absolute angle stays >= 0
        ha = max(hl['thigh_abd_vs_rest'], hr['thigh_abd_vs_rest'], hl['gaskin_abd_vs_rest'], hr['gaskin_abd_vs_rest'])
        h_in_ok = min(hl['thigh_abd'], hr['thigh_abd']) >= 0
        ok_j = fl['elbow_deg'] >= 25 and fl['carpus_flex_deg'] <= 120
        ok = fa <= LIM_F and ha <= LIM_H and ok_j and h_in_ok
        tab[lab][p] = dict(fore_max_abd=fa, hind_max_abd_vs_rest=ha, elbow=fl['elbow_deg'], carpus=fl['carpus_flex_deg'], ok=ok)
        lines.append(f"| {p} | {fl['humerus_abd']} / {fr['humerus_abd']} | {fl['forearm_abd']} / {fr['forearm_abd']} | {fl['elbow_deg']} | {fl['carpus_flex_deg']} | "
                     f"{hl['thigh_abd_vs_rest']} / {hr['thigh_abd_vs_rest']} | {hl['gaskin_abd_vs_rest']} / {hr['gaskin_abd_vs_rest']} | {hl['stifle_deg']} | {hl['hock_flex_deg']} | {'yes' if ok else 'NO'} |")
    lines.append('')
hdr = ['# Pose plausibility (B-sntv pass 5)', '', 'Limits: forelimb abduction (humerus and forearm out of the parasagittal plane of the body) at most 12 deg; hind limb abduction at most 10 deg outward beyond rest (the rest femur sits 14 deg out because the stifle is on the flank), inward allowed while the absolute thigh angle stays at 0 deg or more; fore elbow at least 25 deg; carpus flexion at most 120 deg. Angles in degrees, outward positive.', '']
open(OUT_MD, 'w', encoding='utf-8').write('\n'.join(hdr + lines)); json.dump(tab, open(OUT_JSON, 'w'), indent=1)
print('\n'.join(lines))
