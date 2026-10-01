"""Row measurements at fixed heights, model against the first sheet.

The named windows in loop_tools.measurements (neck, shoulders, waist, hips) left
most of the figure unmeasured: ankles, shins, side waist depth, the base of the
head. The 2026-09-30 gap audit found the model 1.4x to 1.9x off at exactly those
rows while every measured criterion passed. A rubric criterion with source "row",
"rowratio" or "edge" is computed here, always relative to the sheet measured by
the same code, so no hand-typed sheet value can drift.

Picks choose one run of filled pixels in a row:
  left / right   the leftmost or rightmost run (one leg, the figure's front in the
                 left view, the tail-free side of the back view)
  central        the run that contains the body centerline
  full           extreme left to extreme right
Heights are fractions of figure height from the top; widths are fractions of
figure height (fixed world height for the model, as in loop_tools).
"""
import numpy as np
from PIL import Image


def mask_frame(mask, span=None):
    rows = np.where(mask.any(axis=1))[0]
    top, bottom = span if span else (rows.min(), rows.max())
    height = bottom-top
    band = range(max(top, rows.min()), int(top+.2*height))
    widest = max(band, key=lambda r: np.ptp(np.where(mask[r])[0]) if mask[r].any() else -1)
    cols = np.where(mask[widest])[0]
    return top, height, (cols.min()+cols.max())/2


def runs_at(mask, frame, at):
    top, height, cx = frame
    row = mask[min(mask.shape[0]-1, int(top+at*height))]
    cols = np.where(row)[0]
    if not len(cols):
        return [], cx, height
    splits = np.where(np.diff(cols) > 2)[0]
    return list(zip(np.r_[cols[0], cols[splits+1]], np.r_[cols[splits], cols[-1]])), cx, height


def pick_run(mask, frame, at, pick):
    runs, cx, height = runs_at(mask, frame, at)
    if not runs:
        return None
    if pick == 'left':
        s, e = runs[0]
    elif pick == 'right':
        s, e = runs[-1]
    elif pick == 'full':
        s, e = runs[0][0], runs[-1][1]
    else:
        hit = [r for r in runs if r[0] <= cx <= r[1]]
        if not hit:
            return None
        s, e = hit[0]
    return {'start': (s-cx)/height, 'end': (e-cx)/height, 'width': (e-s)/height}


def width(mask, frame, spec):
    """Width of the picked run; spec 'at' is one height or [low, high] with 'reduce' min or max."""
    at = spec['at']
    heights = np.round(np.arange(at[0], at[1]+1e-9, .005), 3) if isinstance(at, list) else [at]
    values = [r['width'] for r in (pick_run(mask, frame, h, spec.get('pick', 'central')) for h in heights) if r]
    if not values:
        return None
    return float(min(values) if spec.get('reduce', 'min') == 'min' else max(values))


def edge(mask, frame, spec):
    r = pick_run(mask, frame, spec['at'], spec.get('pick', 'left'))
    return None if not r else float(r['start'] if spec.get('side', 'start') == 'start' else r['end'])


def evaluate(criterion, model, model_frame, ref, ref_frame):
    """Returns (model value, sheet value, compared value). Compared is the model over the
    sheet for row and rowratio, and the model minus the sheet (in figure heights) for edge."""
    if criterion['source'] == 'row':
        m, r = width(model, model_frame, criterion), width(ref, ref_frame, criterion)
        return m, r, (round(m/r, 3) if m and r else None)
    if criterion['source'] == 'rowratio':
        mn, md = width(model, model_frame, criterion['num']), width(model, model_frame, criterion['den'])
        rn, rd = width(ref, ref_frame, criterion['num']), width(ref, ref_frame, criterion['den'])
        m = mn/md if mn and md else None
        r = rn/rd if rn and rd else None
        return m, r, (round(m/r, 3) if m and r else None)
    # edge: offset of point a from point b along x, model minus sheet. The left view faces
    # image-left, so a negative offset means "further forward".
    ma, mb = edge(model, model_frame, criterion['a']), edge(model, model_frame, criterion['b'])
    ra, rb = edge(ref, ref_frame, criterion['a']), edge(ref, ref_frame, criterion['b'])
    m = ma-mb if ma is not None and mb is not None else None
    r = ra-rb if ra is not None and rb is not None else None
    return m, r, (round(m-r, 4) if m is not None and r is not None else None)


def load_mask(path):
    return np.array(Image.open(path).getchannel('A')) > 20
