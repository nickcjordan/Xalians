"""Trunk side-profile criteria: the trunk's own front edge, back edge and depth, model against the sheet.

R06's side criteria (R06.2, R06.6, R06.7) read a silhouette row, and in the side view the silhouette at
waist height is the hanging arm, not the trunk (specs/R06.md section 0, finding 3). A rubric criterion with
source "trunk" reads instead:

  model  render/trunk-profile.json, written by trunk_edge_sections.py: at each fit row the front edge (smallest
         y) and back edge (largest y) of the loop around the body centerline, using only cut points inside a
         lateral window about the centerline so an arm merged at the flank and a tail root are excluded.
  sheet  docs/.../loop/trunk-profile-sheet.json, built by `python trunk_edges.py sheet` from sheet.json. The
         sheet's left view has the akimbo arm behind the trunk, so its run end is the trunk's back edge only
         where a white gap shows between trunk and arm; the other rows carry the R06 spec's hidden-edge
         estimate (specs/R06.md section 1) with its range.

Both are in fit units: x forward-negative, fractions of figure height, 0 at the figure centerline.

Criterion shapes (all rows are fit rows on the sheet's .02 stations; 'reduce' is mean, min or max over them):
  {"metric": "depth", "at": [.32, .34], "reduce": "mean"}                 compared = model / sheet
  {"metric": "depthratio", "num": {at, reduce}, "den": {at, reduce}}      compared = model ratio / sheet ratio
  {"metric": "swing", "edge": "back", "a": {"at": .34}, "b": {"at": .44}} compared = model (a - b) / sheet (a - b)
  {"metric": "straight", "edge": "front", "from": .38, "to": .50, "at": [.40, .44, .48]}
        largest departure of the edge from the straight line between the rows `from` and `to`;
        compared = model minus sheet, in figure heights (positive: the model is more bowed)
"""
import json
import sys
from pathlib import Path

# The R06 spec's trunk back edge where the akimbo arm or the tails hide it (fit units, side x, back positive):
# (low, high) of the estimate. Rows not listed here are read from sheet.json when a gap separates the first run
# from the next (from .40) or the arm has not started (.26 to .30), the only cases where the run end is the trunk.
HIDDEN_BACK = {.32: (.034, .040), .34: (.035, .042), .36: (.030, .037), .38: (.016, .024), .48: (.004, .008)}
ROWS = [round(.26+.02*k, 2) for k in range(13)]  # .26 to .50


def build_sheet(sheet_json):
    left = {round(s['at'], 2): s for s in json.loads(Path(sheet_json).read_text(encoding="utf-8"))['views']['left']['stations']}
    rows = {}
    for at in ROWS:
        runs = left[at]['runs']
        front = runs[0][0]
        if at in HIDDEN_BACK:
            lo, hi = HIDDEN_BACK[at]
            rows[f'{at:.2f}'] = {'front': front, 'back': round((lo+hi)/2, 5), 'backLow': lo, 'backHigh': hi,
                                 'backSource': 'estimate: specs/R06.md section 1 hidden-edge range'}
        else:
            if at >= .40 and len(runs) < 2:
                raise SystemExit(f'row {at}: no gap after the first run, the back edge is not visible')
            rows[f'{at:.2f}'] = {'front': front, 'back': runs[0][1], 'backLow': runs[0][1], 'backHigh': runs[0][1],
                                 'backSource': 'sheet.json first run end (above .31 the arm has not started, from .40 a white gap follows)'}
    return {'scope': 'The trunk side profile of the first sheet, left view, in fit units (x forward-negative, fractions '
                     'of figure height). The front edge is the sheet.json run start (the trunk is the frontmost run at every '
                     'row from .26 to .50). The back edge is the run end where a gap separates trunk from the akimbo '
                     'arm or forearm, and the R06 spec estimate (range in backLow, backHigh, mid in back) where the arm '
                     'covers it. The .168 chest depth in gap-audit-0458.md is the arm: sheet.json runs end at +.043 to '
                     '+.079 over .32 to .38, which is the upper arm, not the trunk (.1194 to .1303 deep).',
            'generatedBy': 'python art/species-construction/loop/trunk_edges.py sheet', 'rows': rows}


def load_model(path, centerline, height):
    """Rows keyed by fit row: front, back in fit units, from trunk-profile.json (world y)."""
    rows = {}
    for r in json.loads(Path(path).read_text(encoding="utf-8"))['rows']:
        if r['front'] is None:
            continue
        front, back = (r['front']-centerline)/height, (r['back']-centerline)/height
        rows[round(r['at'], 2)] = {'front': front, 'back': back}
    return rows


def _rows(spec):
    at = spec['at']
    return [round(a, 2) for a in (at if isinstance(at, list) else [at])]


def _reduce(values, how):
    if not values or any(v is None for v in values):
        return None
    return {'mean': sum(values)/len(values), 'min': min(values), 'max': max(values)}[how]


def _depth(table, rows, how):
    return _reduce([table[r]['back']-table[r]['front'] if r in table else None for r in rows], how)


def _edge(table, row, edge):
    return table[row][edge] if row in table else None


def evaluate(criterion, model, sheet):
    """(model value, sheet value, compared value) for one 'trunk' criterion. `model` and `sheet` map a fit row
    (float, 2 places) to {'front', 'back'}."""
    metric = criterion['metric']
    if metric == 'depth':
        rows, how = _rows(criterion), criterion.get('reduce', 'mean')
        m, s = _depth(model, rows, how), _depth(sheet, rows, how)
        return m, s, (round(m/s, 3) if m and s else None)
    if metric == 'depthratio':
        def one(table):
            n = _depth(table, _rows(criterion['num']), criterion['num'].get('reduce', 'mean'))
            d = _depth(table, _rows(criterion['den']), criterion['den'].get('reduce', 'mean'))
            return n/d if n and d else None
        m, s = one(model), one(sheet)
        return m, s, (round(m/s, 3) if m and s else None)
    if metric == 'swing':
        edge = criterion['edge']

        def one(table):
            a, b = _edge(table, round(criterion['a']['at'], 2), edge), _edge(table, round(criterion['b']['at'], 2), edge)
            return a-b if a is not None and b is not None else None
        m, s = one(model), one(sheet)
        return m, s, (round(m/s, 3) if m and s else None)
    if metric == 'straight':
        edge, lo, hi = criterion['edge'], round(criterion['from'], 2), round(criterion['to'], 2)

        def one(table):
            a, b = _edge(table, lo, edge), _edge(table, hi, edge)
            if a is None or b is None:
                return None
            devs = []
            for r in _rows(criterion):
                v = _edge(table, r, edge)
                if v is None:
                    return None
                devs.append(abs(v-(a+(b-a)*(r-lo)/(hi-lo))))
            return max(devs)
        m, s = one(model), one(sheet)
        return m, s, (round(m-s, 4) if m is not None and s is not None else None)
    raise ValueError(f'unknown trunk metric {metric}')


def sheet_table(path):
    return {round(float(k), 2): v for k, v in json.loads(Path(path).read_text(encoding="utf-8"))['rows'].items()}


if __name__ == '__main__':
    if sys.argv[1:2] == ['sheet']:
        here = Path(__file__).resolve().parents[3]/'docs/design/species-construction/akinza/loop'
        out = build_sheet(here/'sheet.json')
        (here/'trunk-profile-sheet.json').write_text(json.dumps(out, indent=1)+'\n', encoding='utf-8')
        print('wrote', here/'trunk-profile-sheet.json')
