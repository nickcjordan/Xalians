"""Write the authored neck table for assemble_reconstructed_creature_r27.py from the first sheet's neck rows.

Run with plain python (numpy only): python art/species-construction/make_neck_table_r27.py --out art/species-construction/specs/neck-r27-v1.json

Sources: docs/design/species-construction/akinza/loop/specs/R05.md section 1 (half widths, mean of the sheet's front and back
drawings about the neck midline, fit units) and the left outline in loop/sheet.json (front and back edges, crossings at each
row's v). Conversion to world, calibrated on assembled-2775 against mesh sections at z .43 to .46 (front offset .0098, back
offset .0121, half width times the fixed figure height): half = 1.8605 h, front = 1.8605 f - .0098, back = 1.8605 b - .0121,
world x about the neck's own midline (the model's neck is centered on x = 0).

Per-row weights decide how far the assembler's stub morph may pull the head toward the table: `wFront` is 1 through the
throat (z .466) and 0 by z .476, so the chin underside above it, which belongs to R01, is not dragged; `wSide` falls
from 1 at z .476 to 0 at z .494 for the same reason; `wBack` stays 1 through the nape. The loft between the cuts
(z .425 to .462) is authored from the rows whatever the weights.
"""
import argparse
import json
from pathlib import Path

import numpy as np

HEIGHT = 1.8605
FRONT_OFFSET, BACK_OFFSET = .0098, .0121

# z, half width, front, back (all fit units, sheet)
SHEET = [
    (.424, .0408, -.0348, .0177), (.429, .0358, -.0336, .0165), (.438, .0312, -.0315, .0143), (.443, .0291, -.0306, .0133),
    (.448, .0274, -.0306, .0133), (.452, .0271, -.0306, .0133), (.457, .0271, -.0306, .0133), (.462, .0272, -.0306, .0133),
    (.466, .0272, -.0306, .0133), (.476, .0279, -.0321, .0133), (.481, .0288, -.0338, .0133), (.485, .0296, -.0351, .0133),
    (.494, .0337, -.0351, .0133)]
ROWS_Z = [.424, .429, .434, .438, .443, .448, .452, .457, .462, .466, .471, .476, .481, .485, .490, .494, .497]
W_FRONT = {.466: 1.0, .471: .5, .476: 0.0}
W_SIDE = {.476: 1.0, .485: .5, .494: 0.0}


def weight(table, z, below=1.0, above=0.0):
    zs = sorted(table)
    return float(np.interp(z, zs, [table[k] for k in zs], left=below, right=above))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True)
    parser.add_argument('--jaw-fillet', type=float, default=.016, help='world radius of the jaw-to-neck smoothing near z .466 to .482')
    parser.add_argument('--base-fillet', type=float, default=.02, help='world radius of the base smoothing near z .430 to .445')
    parser.add_argument('--residual-fade', type=float, default=.85)
    parser.add_argument('--exp', type=float, default=2.0, help='superellipse exponent of every row (2 is an ellipse)')
    args = parser.parse_args()
    sz = [r[0] for r in SHEET]
    column = lambda k: [r[k] for r in SHEET]
    rows = []
    for z in ROWS_Z:
        half = float(np.interp(z, sz, column(1))) if z <= sz[-1] else column(1)[-1]+(z-sz[-1])*(column(1)[-1]-column(1)[-2])/(sz[-1]-sz[-2])
        front = float(np.interp(z, sz, column(2)))
        back = float(np.interp(z, sz, column(3)))
        rows.append({'z': z, 'half': round(HEIGHT*half, 5), 'front': round(HEIGHT*front-FRONT_OFFSET, 5),
                     'back': round(HEIGHT*back-BACK_OFFSET, 5), 'exp': args.exp,
                     'wFront': weight(W_FRONT, z, 1.0, 0.0), 'wSide': weight(W_SIDE, z, 1.0, 0.0), 'wBack': 1.0})
    doc = {'note': 'authored neck column from the first sheet; see make_neck_table_r27.py', 'frame': 'world, front is -y',
           'fade': .012, 'residualFade': args.residual_fade, 'smooth': .003,
           'jawFillet': args.jaw_fillet, 'jawFilletZ': [.466, .482], 'baseFillet': args.base_fillet, 'baseFilletZ': [.430, .445],
           'fillZ': [.43, .465], 'rows': rows}
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes((json.dumps(doc, indent=1)+'\n').encode('utf-8'))
    print(f'wrote {out}')
    for r in rows:
        print(r)


if __name__ == '__main__':
    main()
