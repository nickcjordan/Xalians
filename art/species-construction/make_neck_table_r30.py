"""Derive a round 30 neck table from neck-r27-v2.json for assemble_reconstructed_creature_r27.py (plain python, no dependencies).

Run: python art/species-construction/make_neck_table_r30.py --out art/species-construction/specs/neck-r30-fillets-mid.json --jaw-fillet .028 --base-fillet .035

Each option changes one thing the join can reach, and nothing else in the source table moves:
  --jaw-fillet / --base-fillet / --base-fillet-z A B   Gaussian smoothing radius (world) of the authored half width and edges near the jaw
                                                        (z .466 to .482) and the neck base; larger radii open the hourglass curvature.
  --fill-z A B                                          z range over which --neck-back-fill is ramped in (the nape fill).
  --extend-top Z                                        add rows above z .497 up to Z so the authored back edge keeps pulling the head's
                                                        nape toward the column (wBack fades 1 to 0 across the new rows) instead of stopping at .497.
  --extend-base                                         add rows below z .424 (a flaring neck base, half width and depth continuing the body's own
                                                        trend toward z .404); use with assemble --join body-trim .410 or lower.
  --side-hold Z                                         keep the side weight at 1 up to z Z, fading to 0 at .497, so the stub's flare above the
                                                        throat (the head's ruff and cheek at the neck) is pulled toward the sheet half width.
"""
import argparse
import json
from pathlib import Path

SOURCE = Path(__file__).parent/'specs'/'neck-r27-v2.json'


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--src', type=Path, default=SOURCE)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--jaw-fillet', type=float)
    p.add_argument('--base-fillet', type=float)
    p.add_argument('--base-fillet-z', type=float, nargs=2)
    p.add_argument('--fill-z', type=float, nargs=2)
    p.add_argument('--extend-top', type=float)
    p.add_argument('--extend-base', action='store_true')
    p.add_argument('--side-hold', type=float)
    p.add_argument('--note', default='')
    a = p.parse_args()
    doc = json.loads(a.src.read_text(encoding='utf-8'))
    rows = doc['rows']
    if a.jaw_fillet is not None:
        doc['jawFillet'] = a.jaw_fillet
    if a.base_fillet is not None:
        doc['baseFillet'] = a.base_fillet
    if a.base_fillet_z:
        doc['baseFilletZ'] = a.base_fillet_z
    if a.fill_z:
        doc['fillZ'] = a.fill_z
    if a.side_hold is not None:
        for r in rows:
            if r['z'] <= a.side_hold:
                r['wSide'] = 1.0
            elif r['z'] < .497:
                r['wSide'] = round(1.0-(r['z']-a.side_hold)/(.497-a.side_hold), 4)
    if a.extend_top:
        last = rows[-1]
        count = 3
        for i in range(1, count+1):
            z = round(last['z']+(a.extend_top-last['z'])*i/count, 4)
            rows.append({'z': z, 'half': round(last['half']+.0045*i, 5), 'front': last['front'], 'back': last['back'], 'exp': 2.0,
                         'wFront': 0.0, 'wSide': 0.0, 'wBack': round(1.0-i/count, 4)})
    if a.extend_base:
        first = rows[0]
        # half width, front and back continue the body's own flare (body half .0983 at z .415, .0763 at .425; front -.0856, back .0295 at .415)
        for z, half, front, back in [(.404, .1120, -.0935, .0360), (.409, .1050, -.0905, .0335), (.414, .0985, -.0868, .0302),
                                     (.419, .0890, -.0820, .0262)]:
            rows.insert(0, {'z': z, 'half': half, 'front': front, 'back': back, 'exp': 2.0, 'wFront': 1.0, 'wSide': 1.0, 'wBack': 1.0})
        rows.sort(key=lambda r: r['z'])
    doc['note'] = (doc.get('note', '')+'; round 30 variant of neck-r27-v2 by make_neck_table_r30.py '+(a.note or '')).strip('; ')
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_bytes((json.dumps(doc, indent=1)+'\n').encode('utf-8'))
    print(f'wrote {a.out} ({len(rows)} rows)')


if __name__ == '__main__':
    main()
