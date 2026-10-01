"""Parse the lock tables of specs/R04.md into a JSON file the field builder reads.

  python art/species-construction/loop/r04_table.py [--spec <R04.md>] [--out <json>]

Rows are read exactly as written (back-view fit units: x positive to the viewer's right, y down from the figure top,
depth df positive toward the rear). Nothing is re-gridded; the spec's jitter is already in the numbers.
"""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SPEC = ROOT/'docs/design/species-construction/akinza/loop/specs/R04.md'
DEFAULT_OUT = ROOT/'art/species-construction/specs/r04_locks.json'
NUM = r'([+-]?\d*\.?\d+)'
ROW = re.compile(r'^\|\s*([A-Z]+\d?-?\d*)\s*\|\s*\(' + NUM + r',\s*' + NUM + r'\)\s*\|\s*\(' + NUM + r',\s*' + NUM + r'\)\s*\|\s*'
                 + NUM + r'\s*\|\s*' + NUM + r' / ' + NUM + r'\s*\|\s*' + NUM + r'\s*\|\s*' + NUM + r' / ' + NUM + r'\s*\|\s*'
                 + NUM + r' / ' + NUM + r'\s*\|')


def parse(spec):
    locks = []
    for line in spec.read_text(encoding='utf-8').splitlines():
        m = ROW.match(line)
        if not m:
            continue
        name = m.group(1)
        v = [float(x) for x in m.groups()[1:]]
        row = name.split('-')[0]
        row = {'LT': 'T', 'RT': 'T'}.get(row, row)
        side = 'L' if name.startswith('L') else 'R' if name.startswith('R') else None
        if name.startswith('LB') or name.startswith('RB'):
            row = name.split('-')[0][1:]
        elif name.startswith('LT') or name.startswith('RT'):
            row = 'T'
        elif name.startswith('D'):
            row, side = 'D', None
        elif name.startswith('C'):
            row, side = 'C', None
        locks.append({'name': name, 'row': row, 'side': side,
                      'root': [v[0], v[1]], 'tip': [v[2], v[3]], 'length': v[4], 'widthRoot': v[5], 'widthMid': v[6],
                      'thick': v[7], 'dirRoot': v[8], 'dirTip': v[9], 'depthRoot': v[10], 'depthTip': v[11]})
    return locks


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--spec', type=Path, default=DEFAULT_SPEC)
    p.add_argument('--out', type=Path, default=DEFAULT_OUT)
    a = p.parse_args()
    locks = parse(a.spec)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps({'source': str(a.spec.name), 'locks': locks}, indent=1)+'\n')
    from collections import Counter
    print(len(locks), Counter((l['row'], l['side']) for l in locks))
