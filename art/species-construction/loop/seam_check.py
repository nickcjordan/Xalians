"""Seam check: catch a new kink, collar or crease where one part meets another.

    python art/species-construction/loop/seam_check.py <assembly name or render dir> [--baseline <assembly>] [--table] [--json out.json]
    python art/species-construction/loop/seam_check.py <assembly> --views front,left --species akinza

Round 17 and 18 reverted every promising candidate for a defect at a joint: a boot-cuff collar at the
ankle (assembled-2112), needles at the fan edge (assembled-2075). The silhouette fit and the row
criteria do not see them, a critic sees them only after the build. This check looks at the front, left
and back renders (the images quick previews and packets already write), resampled into the fixed
figure frame of `fit` (rows from the fixed floor and figure height, columns from the species
centreline, 700 samples per figure height, so a head change cannot move a body score and an older
render with a slightly different camera lines up with a newer one), in a band around each joint
(species.json "seams": neck base, shoulder, elbow, wrist, hip, knee, ankle, ear-fan root; heights are
the means of the sheet landmarks in the same figure frame).

Outline metrics. Every outline chain that crosses the band is traced (one run of filled pixels
followed from row to row by overlap; left edge, right edge and width are series in figure heights,
with sub-pixel edges from the antialiased alpha). Worst values over chains:

  kink    change of outline slope over a short span (dimensionless): a corner or crease in the outline
  bump    an edge's departure from its own local mean (figure heights): a ledge or collar on an edge
  wbump   the same on the width of the run: a cuff that rises and falls on both sides
  step    the largest one-row jump of an edge beyond the chain's slope (figure heights)
  needle  area (samples) the silhouette loses to a morphological opening: thin spikes and slivers

Shading metric (only with a baseline). A collar or crease is often almost invisible in the outline
(the collar of 2112 moves the rear edge by one pixel) and shows as a tonal ridge. Luminance is
band-passed (difference of Gaussians) inside the silhouette; the pixels where the candidate has a
ridge the baseline did not (stronger than the baseline's own ridge anywhere within two samples, by more
than a floor) are grouped, and

  crease  is the area (samples) of the largest such group in the band

With --baseline each outline chain is matched to the baseline's chain at the same place and the report
gives the rise over it: the useful signal is a new defect, not an old one. A flag is raised when a
rise exceeds species.json "seams.thresholds.change"; without a baseline the absolute thresholds
apply to the outline metrics. Deterministic: an unchanged re-assembly gives exactly zero everywhere.

    import seam_check
    scores = seam_check.seam_scores(render_dir, 'left')   # {joint: {kink, bump, wbump, step, needle, chains}}
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loop_tools as lt  # noqa: E402

METRICS = ('kink', 'bump', 'wbump', 'step', 'needle', 'crease')
OUTLINE = ('kink', 'bump', 'wbump', 'step', 'needle')
GRID = 700         # samples per figure height in the canonical frame
ALPHA_CUT = 0.08   # filled where alpha exceeds this (20/255, as the fit)
GAP = 2            # samples of gap that still count as one run
MIN_WIDTH = 0.008  # figure heights; thinner chains (claw tips, hair) are not outlines of a part
LINK_STEP = 0.02   # a chain edge may not move more than this between rows (figure heights)
MATCH_DX = 0.025   # a candidate chain matches a baseline chain within this lateral distance
NEEDLE_RADIUS = 0.005   # figure heights; the opening that removes a needle
RELIEF_SIGMAS = (1.5, 5.0)  # samples; difference of Gaussians band-pass of the luminance
RELIEF_FLOOR = 0.02        # a new ridge must beat the baseline's by this much (luminance 0..1)
RELIEF_TOLERANCE = 5       # samples; the baseline ridge counts anywhere inside this window
END_TRIM = 6              # samples; rows at the end of a chain left out of its score
STEEP = 1.5               # samples of sideways edge movement per row beyond which a row is not scored
EDGE_SPREAD = 6           # samples either side of a run's core whose coverage is counted into its edge
INTERIOR = 9               # samples; erosion of the silhouette before the shading is read


def seams_config():
    return lt.SPECIES['seams']


def exact_span(render, view):
    """Rows of the fixed figure's crown and floor in a render, unrounded (loop_tools.model_span rounds
    them to whole pixels, half a pixel of shift and .07 percent of scale, which shows as a bump when
    two renders with different cameras are compared)."""
    geometry = json.loads((Path(render)/'geometry.json').read_text(encoding='utf-8'))
    camera = next(c for c in geometry['cameras'] if c['name'] == view)
    width, height = camera['resolution']
    per_unit = max(width, height)/camera['orthoScale']
    center_z = camera['matrixWorld'][2][3]
    row = lambda z: height/2-(z-center_z)*per_unit
    return row(lt.FLOOR_Z+lt.FIXED_HEIGHT), row(lt.FLOOR_Z)


class View:
    """One render view resampled into the canonical frame: alpha and luminance on a GRID x GRID grid,
    rows 0 (crown) to 1 (floor) of the fixed figure height, columns -.5 to .5 figure heights about the
    centreline. A bare array (alpha or boolean mask) needs span and cx, else the frame is the mask's
    own rows and its fan centre."""

    def __init__(self, source, view, span=None, cx=None):
        if isinstance(source, np.ndarray):
            a = source.astype(float)
            alpha_img = Image.fromarray((np.clip(a/(255 if a.max() > 1 else 1), 0, 1)*255).astype(np.uint8))
            lum_img = alpha_img
        else:
            render = Path(source)
            im = Image.open(render/f'{view}.png').convert('RGBA')
            alpha_img, lum_img = im.getchannel('A'), im.convert('L')
            if (render/'geometry.json').exists():
                span = span or exact_span(render, view)
                cx = cx if cx is not None else lt.model_center(render, view)
        mask = np.array(alpha_img) > ALPHA_CUT*255
        rows = np.where(mask.any(axis=1))[0]
        top, bottom = span if span else (rows.min(), rows.max())
        if cx is None:
            band = range(max(top, rows.min()), int(top+.2*(bottom-top)))
            widest = max(band, key=lambda r: np.ptp(np.where(mask[r])[0]) if mask[r].any() else -1)
            cols = np.where(mask[widest])[0]
            cx = (cols.min()+cols.max())/2
        s = (bottom-top)/GRID
        affine = (s, 0, cx-GRID/2*s, 0, s, top)
        self.alpha = np.array(alpha_img.transform((GRID, GRID), Image.AFFINE, affine, Image.BILINEAR), float)/255
        self.lum = np.array(lum_img.transform((GRID, GRID), Image.AFFINE, affine, Image.BILINEAR), float)/255
        self.mask = self.alpha > ALPHA_CUT
        self._relief = None

    @property
    def interior(self):
        return ndimage.binary_erosion(self.alpha > .98, structure=np.ones((3, 3)), iterations=INTERIOR//2)

    @property
    def relief(self):
        """Band-passed luminance inside the silhouette (0 outside); normalised convolution so the edge
        of the silhouette does not leak its own contrast into the ridge response."""
        if self._relief is None:
            inside = self.interior
            w = inside.astype(float)

            def smooth(sigma):
                return ndimage.gaussian_filter(self.lum*w, sigma)/np.maximum(ndimage.gaussian_filter(w, sigma), 1e-3)
            r = smooth(RELIEF_SIGMAS[0])-smooth(RELIEF_SIGMAS[1])
            r[~inside] = 0
            self._relief = r
        return self._relief


def runs_of(row_alpha):
    """Runs of a row as (left, right) in samples. Sub-pixel edges are area based: from the first fully
    covered sample, the coverage of the antialiased samples outside it is subtracted, so a sloped edge
    (whose coverage spreads over several samples) is placed as accurately as a vertical one."""
    a = row_alpha
    cols = np.where(a > ALPHA_CUT)[0]
    if not len(cols):
        return []
    splits = np.where(np.diff(cols) > GAP)[0]
    out = []
    for s, e in zip(np.r_[cols[0], cols[splits+1]], np.r_[cols[splits], cols[-1]]):
        core = np.where(a[s:e+1] >= .97)[0]
        if len(core):
            f, g = s+core[0], s+core[-1]
            lo, hi = max(0, f-EDGE_SPREAD), min(len(a), g+1+EDGE_SPREAD+1)
            left = f-a[lo:f].sum()
            right = g+1+a[g+1:hi].sum()
        else:
            left, right = s+1-min(1.0, a[s]), e+min(1.0, a[e])
        out.append((left, right))
    return out


def trace_chains(view, row0, row1):
    """Follow runs from row to row by overlap (mutual best match). Chains are dicts with 'rows' and
    'L', 'R' (figure heights from the centreline)."""
    chains, open_, prev = [], {}, []
    link = LINK_STEP*GRID
    for r in range(row0, row1+1):
        cur = runs_of(view.alpha[r])
        best_prev, best_next = {}, {}
        for i, (l, rr) in enumerate(cur):
            for j, (pl, pr) in enumerate(prev):
                ov = min(rr, pr)-max(l, pl)
                if ov > 0:
                    if ov > best_prev.get(i, (0, None))[0]:
                        best_prev[i] = (ov, j)
                    if ov > best_next.get(j, (0, None))[0]:
                        best_next[j] = (ov, i)
        new_open = {}
        for i, (l, rr) in enumerate(cur):
            j = best_prev.get(i, (0, None))[1]
            if j is not None and best_next.get(j, (0, None))[1] == i and j in open_:
                ch = open_[j]
                if abs(l-ch['L'][-1]) < link and abs(rr-ch['R'][-1]) < link:
                    ch['rows'].append(r); ch['L'].append(l); ch['R'].append(rr)
                    new_open[i] = ch
                    continue
            ch = {'rows': [r], 'L': [l], 'R': [rr]}
            chains.append(ch)
            new_open[i] = ch
        open_, prev = new_open, cur
    for ch in chains:
        ch['rows'] = np.array(ch['rows'])
        ch['L'] = (np.array(ch['L'])-GRID/2)/GRID
        ch['R'] = (np.array(ch['R'])-GRID/2)/GRID
    return chains


def movmean(x, n):
    """Moving mean over n samples; positions without a full window are nan."""
    out = np.full(len(x), np.nan)
    if len(x) < n:
        return out
    c = np.cumsum(np.r_[0, x])
    m = (c[n:]-c[:-n])/n
    out[n//2:n//2+len(m)] = m
    return out


def series_metrics(x, inner, cfg):
    """kink, bump and step of one series (figure heights, one sample per row) over the `inner` rows."""
    k = max(2, int(round(cfg['kinkSpan']*GRID)))
    n = max(3, int(round(cfg['bumpWindow']*GRID)) | 1)
    idx = np.where(inner)[0]
    kink = bump = step = 0.0
    for i in idx:
        if i-k >= 0 and i+k < len(x):
            kink = max(kink, abs((x[i+k]-x[i])-(x[i]-x[i-k]))/k*GRID)
    res = x-movmean(x, n)
    ok = inner & ~np.isnan(res)
    if ok.any():
        bump = float(np.abs(res[ok]).max())
    d = np.diff(x)
    both = np.where(inner[:-1] & inner[1:])[0]
    if len(both):
        d = d-np.median(d[max(0, idx[0]-k):idx[-1]+k])
        step = float(np.abs(d[both]).max())
    return {'kink': round(float(kink), 4), 'bump': round(bump, 5), 'step': round(step, 5)}


def joint_band(joint, cfg):
    """(fraction of figure height scored above the joint, below it)."""
    b = joint.get('band', cfg['band'])
    return (b, b) if not isinstance(b, list) else (b[0], b[1])


def joint_chains(view, joint, cfg):
    """Outline metrics of every chain through the joint's band, one entry per chain."""
    up, down = joint_band(joint, cfg)
    ctx = cfg['context']
    centre = joint['at']*GRID
    row0, row1 = int(round((joint['at']-up-ctx)*GRID)), int(round((joint['at']+down+ctx)*GRID))
    out = []
    for ch in trace_chains(view, max(0, row0), min(GRID-1, row1)):
        rows = ch['rows']
        inner = (rows >= centre-up*GRID) & (rows <= centre+down*GRID)
        if inner.sum() < .6*(up+down)*GRID:
            continue
        width = ch['R']-ch['L']
        # The last rows of a chain are where the run ends or merges (an arm into the hip, a toe into the
        # floor): its edge turns sharply there on every render, and one row more or less moves the
        # numbers. Score only rows END_TRIM away from a chain end that is not a window end.
        end = np.arange(len(rows))
        if rows[0] > row0:
            inner &= end >= END_TRIM
        if rows[-1] < row1:
            inner &= end < len(rows)-END_TRIM
        # Where an edge runs nearly across the rows (more than STEEP samples sideways per row, a shelf
        # or the underside of an arm), one row of sampling shift moves it by more than a collar is high.
        slope = np.maximum(np.abs(np.gradient(ndimage.uniform_filter1d(ch['L']*GRID, 5))),
                           np.abs(np.gradient(ndimage.uniform_filter1d(ch['R']*GRID, 5))))
        inner &= slope < STEEP
        if not inner.any() or np.median(width[inner]) < MIN_WIDTH:
            continue
        s = {n: series_metrics(v, inner, cfg) for n, v in (('L', ch['L']), ('R', ch['R']), ('W', width))}
        out.append({'x': round(float(np.mean((ch['L'][inner]+ch['R'][inner])/2)), 4),
                    'width': round(float(np.median(width[inner])), 4),
                    'kink': max(s['L']['kink'], s['R']['kink']),
                    'bump': max(s['L']['bump'], s['R']['bump']),
                    'step': max(s['L']['step'], s['R']['step'], s['W']['step']),
                    'wbump': s['W']['bump']})
    return out


def needle_area(view, joint, cfg):
    """Samples the silhouette loses to an opening in the joint's band (thin spikes and slivers)."""
    up, down = joint_band(joint, cfg)
    r = max(1, int(round(NEEDLE_RADIUS*GRID)))
    yy, xx = np.mgrid[-r:r+1, -r:r+1]
    disc = (xx**2+yy**2) <= r*r
    r0, r1 = max(0, int((joint['at']-up)*GRID)), min(GRID, int((joint['at']+down)*GRID))
    r0p, r1p = max(0, r0-r), min(GRID, r1+r)
    sub = view.mask[r0p:r1p]
    opened = ndimage.binary_opening(sub, structure=disc)
    lost = (sub & ~opened)[r0-r0p:r0-r0p+(r1-r0)]
    return int(lost.sum())


def grown_ridges(view, base):
    """Boolean grid of the samples where the candidate has a tonal ridge the baseline did not: the
    candidate's band-passed magnitude beats the baseline's, taken as its maximum within the tolerance
    window, by more than the floor, inside the candidate's silhouette."""
    tol = ndimage.maximum_filter(np.abs(base.relief), size=RELIEF_TOLERANCE)
    return (np.abs(view.relief)-tol > RELIEF_FLOOR) & view.interior


def crease_in_band(grown, joint, cfg):
    """(area in samples of the largest connected group of grown ridge in the band, its centre as
    [x, at] in figure heights)."""
    up, down = joint_band(joint, cfg)
    r0, r1 = max(0, int((joint['at']-up)*GRID)), min(GRID, int((joint['at']+down)*GRID))
    m = np.zeros_like(grown)
    m[r0:r1] = grown[r0:r1]
    lab, _ = ndimage.label(ndimage.binary_dilation(m, structure=np.ones((3, 3))), structure=np.ones((3, 3)))
    best, where = 0, None
    for i, sl in enumerate(ndimage.find_objects(lab)):
        area = int((m[sl] & (lab[sl] == i+1)).sum())
        if area > best:
            best, where = area, [round(((sl[1].start+sl[1].stop)/2-GRID/2)/GRID, 3), round((sl[0].start+sl[0].stop)/2/GRID, 3)]
    return best, where


def seam_scores(source, view, joints=None, span=None, cx=None, baseline=None):
    """{joint: {kink, bump, wbump, step, needle, chains[, crease]}} for one view of a render directory
    (or an alpha array with span and cx, or a View): the worst outline values over the chains that
    cross the joint's band. With `baseline` (a render directory, array or View) the shading metric
    `crease` is added."""
    cfg = seams_config()
    v = source if isinstance(source, View) else View(source, view, span, cx)
    b = grown = None
    if baseline is not None:
        b = baseline if isinstance(baseline, View) else View(baseline, view)
        grown = grown_ridges(v, b)
    result = {}
    for name, joint in cfg['joints'].items():
        if (joints and name not in joints) or view not in joint['views']:
            continue
        chains = joint_chains(v, joint, cfg)
        row = {'at': joint['at'], 'chains': chains, 'needle': needle_area(v, joint, cfg)}
        for m in ('kink', 'bump', 'wbump', 'step'):
            row[m] = max((c[m] for c in chains), default=0.0)
        if b is not None:
            row['crease'], row['creaseAt'] = crease_in_band(grown, joint, cfg)
        result[name] = row
    return result


def match(chain, candidates):
    """The baseline chain at the same place as `chain` (nearest centre within MATCH_DX), or None."""
    near = [c for c in candidates if abs(c['x']-chain['x']) <= MATCH_DX and abs(c['width']-chain['width']) < .06+.5*chain['width']]
    return min(near, key=lambda c: abs(c['x']-chain['x'])) if near else None


def compare(cand, base):
    """Per joint: the largest rise of each outline metric over the matched baseline chain (a chain
    with no match is compared with the baseline's worst chain of that joint); needle is a plain
    difference of areas, crease is already a change."""
    out = {}
    for name, row in cand.items():
        b = base.get(name, {'chains': [], **{m: 0.0 for m in METRICS}})
        delta, where = {m: 0.0 for m in METRICS}, {}
        for c in row['chains']:
            ref = match(c, b['chains'])
            for m in ('kink', 'bump', 'wbump', 'step'):
                r = ref[m] if ref else b[m]
                if c[m]-r > delta[m]:
                    delta[m] = c[m]-r
                    where[m] = {'x': c['x'], 'width': c['width']}
        delta['needle'] = max(0, row['needle']-b['needle'])
        delta['crease'] = row.get('crease', 0)
        if row.get('creaseAt'):
            where['crease'] = {'x': row['creaseAt'][0], 'at': row['creaseAt'][1]}
        out[name] = {'delta': {m: round(delta[m], 5) for m in METRICS}, 'where': where}
    return out


def flags(values, kind, joint=None):
    """The metrics of a {metric: number} dict that exceed the thresholds of `kind` ('change' for renders
    in the same fixed frame, 'changeLegacy' for older renders in their own frames, 'absolute'); a joint with its own entry under thresholds.joints (the ear fan, whose outline is
    ragged by design) uses those numbers instead."""
    cfg = seams_config()['thresholds']
    t = {**cfg[kind], **cfg.get('joints', {}).get(joint, {}).get(kind, {})}
    return [m for m in METRICS if m in t and values.get(m, 0) > t[m]]


def same_frame(render, other, view):
    """True when two renders of a view share the camera exactly (every candidate and baseline since the
    fixed render frame of 2026-10-01): their silhouettes are then pixel aligned and the numbers carry no
    resampling noise. Older renders were framed to their own bounds and compare with legacy thresholds."""
    try:
        cams = []
        for r in (render, other):
            g = json.loads((Path(r)/'geometry.json').read_text(encoding='utf-8'))
            c = next(c for c in g['cameras'] if c['name'] == view)
            cams.append((c['orthoScale'], c['resolution'], np.array(c['matrixWorld'], float)))
        return (abs(cams[0][0]-cams[1][0]) < 1e-6 and list(cams[0][1]) == list(cams[1][1])
                and np.abs(cams[0][2]-cams[1][2]).max() < 1e-6)
    except (OSError, StopIteration, KeyError, ValueError):
        return False


def resolve(name):
    """A render directory from a path to one, a quick preview or a render's parent, or an assembly
    name (relative paths are tried against the work folder too)."""
    for p in (Path(name), lt.WORK/name):
        for q in (p, p/'render'):
            if (q/'geometry.json').exists():
                return q
    return lt.work(name)/'render'


def baseline_render(ref):
    """Render directory of a baseline given as a fit.json (its 'source'), a packet directory (its
    index.json assembly, else its fit.json), an assembly name or a render directory."""
    p = Path(ref)
    if not p.exists() and (lt.WORK/ref).exists():
        p = lt.WORK/ref
    fit = p if p.suffix == '.json' else p/'fit.json'
    if p.is_dir() and (p/'index.json').exists():
        assembly = lt.packet_assembly(p)
        if assembly and (lt.work(assembly)/'render/geometry.json').exists():
            return lt.work(assembly)/'render'
    if fit.is_file():
        source = Path(json.loads(fit.read_text(encoding='utf-8'))['source'])
        return resolve(source)
    return resolve(ref)


def check(source, baseline=None, views=None):
    """Report for a render directory or assembly name: per view and joint the scores, and with a
    baseline the changes and flags. {'views': {view: {joint: {...}}}, 'flagged': [...], 'mode': ...}."""
    cfg = seams_config()
    render = resolve(source)
    base_render = baseline_render(baseline) if baseline else None
    report = {'source': str(render), 'baseline': str(base_render) if base_render else None, 'views': {}, 'flagged': []}
    for view in views or cfg['views']:
        if not (render/f'{view}.png').exists():
            continue
        have_base = base_render is not None and (base_render/f'{view}.png').exists()
        v = View(render, view)
        b = View(base_render, view) if have_base else None
        cand = seam_scores(v, view, baseline=b)
        change = compare(cand, seam_scores(b, view)) if have_base else None
        kind = 'change' if have_base and same_frame(render, base_render, view) else 'changeLegacy'
        rows = {}
        for joint, row in cand.items():
            entry = {m: row[m] for m in OUTLINE}
            if change:
                entry['change'] = change[joint]['delta']
                entry['where'] = change[joint]['where']
                entry['frame'] = 'same' if kind == 'change' else 'legacy'
                entry['flags'] = flags(change[joint]['delta'], kind, joint)
            else:
                entry['flags'] = flags(row, 'absolute', joint)
            if entry['flags']:
                report['flagged'].append({'view': view, 'joint': joint, 'metrics': entry['flags'],
                                          'values': entry.get('change', {m: row[m] for m in OUTLINE}),
                                          'where': entry.get('where', {})})
            rows[joint] = entry
        report['views'][view] = rows
    report['mode'] = 'change against baseline' if base_render else 'absolute'
    return report


def summary_lines(report):
    """Text lines for quick and the CLI: the flagged joints with the numbers and where."""
    n = len(report['flagged'])
    lines = [f"seam check ({report['mode']}): " + (f'{n} flagged' if n else 'nothing flagged')]
    for f in report['flagged']:
        parts = []
        for m in f['metrics']:
            at = f['where'].get(m)
            loc = f" at x {at['x']:+.3f}" if at else ''
            parts.append(f"{m} {f['values'][m]:+.4g}{loc}")
        lines.append(f"  FLAG {f['joint']} {f['view']}: " + ', '.join(parts))
    return lines


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('source')
    parser.add_argument('--baseline')
    parser.add_argument('--views')
    parser.add_argument('--json')
    parser.add_argument('--species', default=argparse.SUPPRESS)
    parser.add_argument('--table', action='store_true', help='print every joint, not only the flagged')
    args = parser.parse_args()
    report = check(args.source, args.baseline, args.views.split(',') if args.views else None)
    print('\n'.join(summary_lines(report)))
    if args.table:
        for view, rows in report['views'].items():
            for joint, e in rows.items():
                vals = e.get('change', e)
                print(f"  {view:6} {joint:10} " + ' '.join(f'{m} {vals.get(m, 0):+.4f}' for m in METRICS if m in vals)
                      + (f"  FLAG {e['flags']}" if e['flags'] else ''))
    if args.json:
        Path(args.json).write_text(json.dumps(report, indent=1)+'\n')


if __name__ == '__main__':
    main()
