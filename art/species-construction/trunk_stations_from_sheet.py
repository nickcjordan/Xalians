"""Read the trunk station table straight from the shared sheet trace and compare it with a trunk-sections spec.

  python art/species-construction/trunk_stations_from_sheet.py --sheet docs/design/species-construction/akinza/loop/sheet.json
      [--spec art/species-construction/specs/trunk-sections-r06-v1.json] [--y0 .26 --y1 .62] [--out table.json]

The R06 loft (author_trunk_sections_field.py) takes a station table of side front and back edges and front half widths
every .02 of figure height. This reads the same numbers from `sheet.json` (the loop's one trace of the reference sheet,
fit units, `sheet_measure.py`): front and back are the leftmost run of the left view (negative x forward), the half
width is half the central run of the front view (the back view's central run is listed beside it). A row where the
leftmost run is wider than --arm-width (.15) is marked `merged`: an arm, forearm or tail touches the trunk there, so the
back edge is the arm's, not the trunk's (specs/R06.md section 0). With --spec, each spec station is listed beside
the sheet value and the difference, so a builder sees at a glance where the spec deliberately departs from the sheet
(hidden rows) and where it holds the model. Pure Python, no Blender.
"""
import argparse
import json
from pathlib import Path


def rows(sheet, y0, y1, arm_width):
    left = {round(s['at'], 2): s for s in sheet['views']['left']['stations']}
    front = {round(s['at'], 2): s for s in sheet['views']['front']['stations']}
    back = {round(s['at'], 2): s for s in sheet['views']['back']['stations']}
    out = []
    y = y0
    while y <= y1+1e-9:
        key = round(y, 2)
        row = {'y': key, 'front': None, 'back': None, 'halfWidthFront': None, 'halfWidthBack': None, 'merged': False}
        runs = (left.get(key) or {}).get('runs') or []
        if runs:
            first = min(runs, key=lambda r: r[0])
            row['front'], row['back'] = first[0], first[1]
            row['merged'] = (first[1]-first[0]) > arm_width
        for name, table in (('halfWidthFront', front), ('halfWidthBack', back)):
            central = (table.get(key) or {}).get('central')
            if central:
                row[name] = central['width']/2
        out.append(row)
        y += .02
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--sheet', type=Path, required=True)
    p.add_argument('--spec', type=Path)
    p.add_argument('--y0', type=float, default=.26)
    p.add_argument('--y1', type=float, default=.62)
    p.add_argument('--arm-width', type=float, default=.15)
    p.add_argument('--out', type=Path)
    a = p.parse_args()
    sheet = json.loads(a.sheet.read_text())
    table = rows(sheet, a.y0, a.y1, a.arm_width)
    spec = {round(s['y'], 2): s for s in json.loads(a.spec.read_text())['stations']} if a.spec else {}
    f = lambda v: '    -  ' if v is None else f'{v:+.4f}'
    print(' y     sheet front  back   half(f) half(b)  | spec front  back   half   | delta front back half')
    for r in table:
        s = spec.get(r['y'], {})
        d = [None if r[k] is None or s.get(k2) is None else s[k2]-r[k] for k, k2 in
             (('front', 'front'), ('back', 'back'), ('halfWidthFront', 'halfWidth'))]
        print(f"{r['y']:.2f}  {f(r['front'])} {f(r['back'])} {f(r['halfWidthFront'])} {f(r['halfWidthBack'])}  | "
              f"{f(s.get('front'))} {f(s.get('back'))} {f(s.get('halfWidth'))} | {f(d[0])} {f(d[1])} {f(d[2])}"
              f"{'  merged' if r['merged'] else ''}")
    if a.out:
        a.out.write_text(json.dumps({'sheet': str(a.sheet), 'rows': table}, indent=1)+'\n')


main()
