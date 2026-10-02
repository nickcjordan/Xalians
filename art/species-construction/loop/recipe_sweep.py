"""Parameter sweep for recipe.py: try several values of one step's parameters in one tool call.

  python art/species-construction/loop/recipe.py sweep <recipe> --step <id> --grid <arg>=<v1>,<v2> [--grid ...]
         [--variants file.json] [--max 12] [--region Rxx] [--out name] [--top 6] [--contain-tol .004]

recipe.py hands this module itself (`run(args, rc)`), so there is one copy of its globals and lock.
Nothing here edits loop_tools.py; Blender runs through `recipe.run_step` and `loop_tools.py quick`,
both of which take the shared slot lock. No variant is assembled or packeted.

Per variant: the candidate recipe is written into the sweep folder; the edited step and its descendants
in the same component are built (a step key with a cache entry costs nothing, a key shared by two variants
is built once); `loop_tools.py quick` renders head and body three views; four terms are measured and
combined into `total` (see TERMS below and RECIPE.md, "Sweeps"). A step that writes a top-level `sweepScore` (higher is
better, plus an optional `sweepTerms` dict) into a JSON record of its output directory adds a fifth term: the tool reads
what the quick silhouette cannot see (the R06 trunk tool scores achieved against target sections, so the waist counts).
"""
import copy
import datetime
import itertools
import json
import subprocess
import sys
import threading
import time
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

SHEET_STEP = .02            # station spacing of loop/sheet.json
MISSING_PICK = .1           # figure heights charged when only the model or only the sheet has a run at a station
SEAM_WEIGHT = 5             # total points per 1.0 of seam ratio (1.0 = the seam check's flag threshold)
CONTAIN_TOL = .004          # figure heights of foreign displacement allowed before the total is charged
TOOL_WEIGHT = 100           # total points per 1.0 (a figure height) of the step's own sweepScore
VIEWS = ('front', 'left', 'back')
BASELINE = 'baseline'
WINDOW_PAD = .03           # fitIou: figure heights of margin around the zone's x extent (front and back views)
CELL_PAD = .06              # contact sheet: figure heights of margin around the region's x extent

TERMS = '''total = 100*(fitIou - baseline.fitIou)
        - 100*(stationDiff - baseline.stationDiff)
        - 100*containExcess
        + 100*(toolScore - baseline.toolScore)  # only when the edited step's output records a sweepScore
        - 5*seam.worstRatio                     # only when seam_check.py exists
fitIou      mean over front, left, back of the model-vs-reference silhouette IoU over the region's zone rows, and in the front and back views only the columns of the zone's x extent (higher is better)
stationDiff mean |width difference| + |centre difference| of the model's station table against sheet.json over the zone rows,
            per left/right/central pick and view, in figure heights; a pick present in only one table costs 0.1 (lower is better)
containMax  worst foreign-region nearest-vertex displacement of the edited step (recipe.py contain), figure heights (lower is better);
            the charge is containExcess: the worst foreign region's displacement above max(containTol, its allowance), where the
            allowance is max(.002, 1.5 x the displacement the baseline version of the step gave that region)
toolScore   the step's own sweepScore (higher is better); the baseline's is read from the baseline step's output, else the worst variant's
seam        worst ratio of any joint's rise (against the baseline quick) in any seam_check metric to that metric's flag threshold: 0 nothing new, 1 or more flagged (lower is better)'''


# ---------------------------------------------------------------- arguments

def split_values(text):
    """Split on commas that are not inside brackets, braces or quotes: a value may be a JSON list."""
    out, depth, quote, current = [], 0, None, ''
    for ch in text:
        if quote:
            current += ch
            quote = None if ch == quote else quote
        elif ch in '"\'':
            quote = ch
            current += ch
        elif ch in '[{':
            depth += 1
            current += ch
        elif ch in ']}':
            depth -= 1
            current += ch
        elif ch == ',' and depth == 0:
            out.append(current)
            current = ''
        else:
            current += ch
    out.append(current)
    return [v.strip() for v in out if v.strip() != '']


def as_value(value):
    """A --variants value as the string `set` takes."""
    if isinstance(value, str):
        return value
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (list, dict)) and True:
        return json.dumps(value)
    return str(value)


def build_variants(rc, args):
    """[(label, [(arg, value)])] from --grid (product) and/or --variants (explicit dicts)."""
    variants = []
    if args.grid:
        axes = []
        for item in args.grid:
            if '=' not in item:
                rc.fail(f'--grid {item}: expected <arg>=<v1>,<v2>,...')
            arg, values = item.split('=', 1)
            values = split_values(values)
            if not values:
                rc.fail(f'--grid {item}: no values')
            axes.append([(arg, v) for v in values])
        for combo in itertools.product(*axes):
            variants.append(list(combo))
    if args.variants:
        for entry in json.loads(Path(args.variants).read_text(encoding='utf-8')):
            variants.append([(k, as_value(v)) for k, v in entry.items()])
    if not variants:
        rc.fail('give at least one --grid or a --variants file')
    return variants


def short(arg):
    return arg[len('spec:'):] if arg.startswith('spec:') else arg.lstrip('-')


def label_of(pairs):
    return ' '.join(f'{short(a)}={v}' for a, v in pairs)


# ---------------------------------------------------------------- baseline and dirs

def baseline_dirs(rc, recipe, cache):
    """{step id: dir name} for every baseline step: the cache entry under today's key, else the step's `existing`."""
    keys = rc.compute_keys(recipe)
    out = {}
    for step in recipe.order:
        hit = cache.get('steps', keys[step['id']])
        existing = step.get('existing') if step.get('existing') and (recipe.work/step['existing']).is_dir() else None
        if hit and not (hit.get('sweep') and existing):  # a sweep's own control build must not replace the lineage output
            out[step['id']] = hit['dir']
        elif existing:
            out[step['id']] = existing
    return out


def input_path(recipe, ref, results, keys, chain, base):
    if ref in recipe.roots:
        return recipe.work/recipe.roots[ref]['dir']
    if ref in chain:
        return recipe.work/results[keys[ref]]['dir']
    if ref in base:
        return recipe.work/base[ref]
    raise RuntimeError(f'input {ref} has no built baseline (no cache entry and no existing directory); build the recipe first')


# ---------------------------------------------------------------- scheduler

class Scheduler:
    """Nodes {id: (deps, fn(results) -> result)} run on a pool of `slots` threads, a node as soon as its
    dependencies are done. A failed node fails its dependents; nothing else stops."""
    def __init__(self, slots, say):
        self.nodes, self.slots, self.say = {}, slots, say

    def add(self, node_id, deps, fn, label=''):
        if node_id not in self.nodes:
            self.nodes[node_id] = {'deps': list(deps), 'fn': fn, 'label': label}

    def run(self):
        results, errors, running = {}, {}, {}
        todo = dict(self.nodes)
        with ThreadPoolExecutor(max_workers=self.slots) as pool:
            while todo or running:
                for nid in list(todo):
                    node = todo[nid]
                    bad = [d for d in node['deps'] if d in errors]
                    if bad:
                        errors[nid] = f'dependency failed: {bad[0]}'
                        del todo[nid]
                        continue
                    if all(d in results for d in node['deps']) and len(running) < self.slots:
                        del todo[nid]
                        running[pool.submit(self._call, nid, node, results)] = nid
                if not running:
                    for nid in todo:
                        errors[nid] = 'never became ready'
                    break
                finished, _ = wait(running, return_when=FIRST_COMPLETED)
                for future in finished:
                    nid = running.pop(future)
                    try:
                        results[nid] = future.result()
                    except BaseException as error:  # SystemExit from recipe.fail included
                        errors[nid] = (str(error).strip().splitlines() or [repr(error)])[-1]
                        self.say(f"FAILED {self.nodes[nid]['label'] or nid[:12]}: {errors[nid]}")
        return results, errors

    def _call(self, nid, node, results):
        started = time.time()
        result = node['fn'](results)
        result = dict(result) if isinstance(result, dict) else {'value': result}
        result.setdefault('seconds', round(time.time()-started, 1))
        return result


# ---------------------------------------------------------------- measuring

class Measurer:
    """Silhouette and station measurements of a quick render against the reference sheet, over the rows of one zone."""
    def __init__(self, lt, sm, row_measures, zone, sheet, seam):
        zone_at = zone['at']
        self.lt, self.sm, self.rm, self.zone, self.zone_at, self.sheet, self.seam = lt, sm, row_measures, zone, zone_at, sheet, seam
        self._ref, self._masks = {}, {}
        self.changed = None
        self.rows = (int(zone_at[0]*lt.FIT_GRID), max(int(zone_at[1]*lt.FIT_GRID), int(zone_at[0]*lt.FIT_GRID)+1))

    def _masks_of(self, out):
        return self._masks.setdefault(str(out), {})

    def reference(self, view):
        if view not in self._ref:
            self._ref[view] = self.lt.canonical(self.lt.reference_figure(view))
        return self._ref[view]

    def column_window(self, view):
        """Columns of the canonical frame the zone's x extent covers (both sides for a symmetric zone), for the front and
        back views only: the left view's horizontal axis is depth, and an asymmetric zone's side flips in the back view,
        so those use all columns of the zone rows."""
        zone, grid = self.zone, self.lt.FIT_GRID
        if view not in ('front', 'back') or not zone.get('symmetricX'):
            return None
        lo, hi = zone['x'][0]-WINDOW_PAD, zone['x'][1]+WINDOW_PAD
        cols = np.arange(grid)
        u = np.abs((cols-grid/2)/grid)
        return (u >= lo) & (u <= hi)

    def render(self, out):
        out = Path(out)
        return out/'render' if (out/'render/geometry.json').exists() else out

    def fit_iou(self, out, base_out=None):
        lt, render = self.lt, self.render(out)
        per_view, changed, area = {}, 0, 0
        for view in VIEWS:
            png = render/f'{view}.png'
            if not png.exists():
                continue
            model = lt.canonical(np.array(Image.open(png).getchannel('A')) > 20, lt.model_span(render, view), lt.model_center(render, view))
            self._masks_of(out)[view] = model
            ref = self.reference(view)
            r0, r1 = self.rows
            m, r = model[r0:r1], ref[r0:r1]
            window = self.column_window(view)
            if window is not None:
                m, r = m[:, window], r[:, window]
            union = (m | r).sum()
            per_view[view] = round(float((m & r).sum()/union), 5) if union else None
            if base_out is not None and view in self._masks_of(base_out):
                b = self._masks_of(base_out)[view][r0:r1]
                b = b[:, window] if window is not None else b
                changed += int((m ^ b).sum())
                area += int(r.sum())
        vals = [v for v in per_view.values() if v is not None]
        self.changed = round(changed/area, 5) if area else None
        return (round(float(np.mean(vals)), 5) if vals else None), per_view

    def band_iou(self, out):
        """The quick run's own fit.json: the band that holds most of the zone's rows, mean over its views."""
        lt = self.lt
        fit = json.loads((Path(out)/'fit.json').read_text(encoding='utf-8')) if (Path(out)/'fit.json').is_file() else None
        if not fit:
            return None, None
        a, b = self.zone_at
        overlap = {n: max(0, min(b, hi)-max(a, lo)) for n, (lo, hi) in lt.FIT_BANDS.items()}
        band = max(overlap, key=overlap.get)
        vals = [v[band]['iou'] for k, v in fit['views'].items() if k in VIEWS and v[band]['iou'] is not None]
        return band, (round(float(np.mean(vals)), 4) if vals else None)

    def station_diff(self, out):
        lt, sm, rm = self.lt, self.sm, self.rm
        render = self.render(out)
        a, b = self.zone_at
        total, count = 0.0, 0
        for view in VIEWS:
            png = render/f'{view}.png'
            if not png.exists() or view not in self.sheet['views']:
                continue
            mask = rm.load_mask(png)
            frame = rm.mask_frame(mask, lt.model_span(render, view), lt.model_center(render, view))
            model = sm.stations(mask, frame, self.sheet['step'])
            for m, s in zip(model, self.sheet['views'][view]['stations']):
                if not (a-1e-9 <= m['at'] <= b+1e-9):
                    continue
                for key in ('left', 'right', 'central'):
                    x, y = m[key], s[key]
                    if x and y:
                        total += abs(x['width']-y['width'])+abs(x['centre']-y['centre'])
                        count += 1
                    elif x or y:
                        total += MISSING_PICK
                        count += 1
        return round(total/count, 5) if count else None

    def seam_score(self, out, base_out):
        """seam_check.check(variant render, baseline=baseline render) over the three views. The score is the worst ratio of a
        joint's rise in any metric to that metric's flag threshold (0 = nothing new, 1 or more = flagged as a new seam defect)."""
        if self.seam is None or base_out is None:
            return None
        try:
            report = self.seam.check(str(self.render(out)), baseline=str(self.render(base_out)), views=list(VIEWS))
            cfg = self.seam.seams_config()['thresholds']
            worst, where = 0.0, None
            for view, joints in report['views'].items():
                for joint, entry in joints.items():
                    kind = 'change' if entry.get('frame') == 'same' else 'changeLegacy'
                    limits = {**cfg[kind], **cfg.get('joints', {}).get(joint, {}).get(kind, {})}
                    for metric, limit in limits.items():
                        ratio = entry.get('change', {}).get(metric, 0) / limit if limit else 0.0
                        if ratio > worst:
                            worst, where = ratio, f'{joint} {view} {metric}'
            return {'worstRatio': round(worst, 4), 'at': where, 'flagged': [f"{f['joint']} {f['view']} {','.join(f['metrics'])}" for f in report['flagged']]}
        except Exception as error:  # a seam module that cannot read this render must not sink the sweep
            return {'error': str(error)}

    def measure(self, out, base_out=None):
        fit, per_view = self.fit_iou(out, base_out)
        band, band_iou = self.band_iou(out)
        return {'fitIou': fit, 'fitIouByView': per_view, 'silhouetteChange': self.changed, 'fitBand': band, 'fitBandIou': band_iou,
                'stationDiff': self.station_diff(out), 'seam': self.seam_score(out, base_out)}


def tool_record(directory):
    """(score, terms, file name) from the first JSON record in a step's output directory with a top-level numeric `sweepScore`
    (higher is better; `sweepTerms` is an optional dict of its parts), else None."""
    if not directory or not Path(directory).is_dir():
        return None
    for path in sorted(Path(directory).glob('*.json')):
        if path.name == 'stage-start.json':
            continue
        try:
            doc = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            continue
        score = doc.get('sweepScore') if isinstance(doc, dict) else None
        if isinstance(score, (int, float)) and not isinstance(score, bool):
            terms = doc.get('sweepTerms')
            return float(score), terms if isinstance(terms, dict) else None, path.name
    return None


def total_score(term, base, contain_excess, tool_ref=None):
    """The ranking score; None terms drop out. contain_excess is already the charge (figure heights above the allowance)."""
    parts = {}
    if term['fitIou'] is not None and base['fitIou'] is not None:
        parts['fit'] = 100*(term['fitIou']-base['fitIou'])
    if term['stationDiff'] is not None and base['stationDiff'] is not None:
        parts['station'] = -100*(term['stationDiff']-base['stationDiff'])
    if contain_excess is not None:
        parts['contain'] = -100*max(0.0, contain_excess)
    if term.get('toolScore') is not None and tool_ref is not None:
        parts['tool'] = TOOL_WEIGHT*(term['toolScore']-tool_ref)
    seam = term.get('seam')
    if isinstance(seam, dict) and 'worstRatio' in seam:
        parts['seam'] = -SEAM_WEIGHT*seam['worstRatio']
    return round(sum(parts.values()), 3), {k: round(v, 3) for k, v in parts.items()}


# ---------------------------------------------------------------- contact sheet

def view_windows(zone, grid=500):
    """Pixel column windows of the three views for a zone: front and back show the zone's x extent (both sides of a symmetric zone), left shows the depth extent about the centreline."""
    xlo, xhi = zone['x']
    ylo, yhi = zone['y']
    front = (-xhi-CELL_PAD, xhi+CELL_PAD) if zone.get('symmetricX') else (xlo-CELL_PAD, xhi+CELL_PAD)
    depth = max(abs(ylo), abs(yhi))+CELL_PAD
    px = lambda lo, hi: (max(0, int(grid/2+lo*grid)), min(grid, int(grid/2+hi*grid)))
    return [px(*front), px(-depth, depth), px(*front)]


def contact_sheet(rows, region, zone, path):
    """rows: [(label lines, quick dir)] best first, baseline last. Each cell is the fit overlay of one view cropped to the zone's
    rows and extent, so what a parameter changed is the picture, not the whole figure."""
    grid = 500
    a, b = zone['at']
    pad = max(.02, (.12-(b-a))/2)
    r0, r1 = max(0, int((a-pad)*grid)), min(grid, int((b+pad)*grid))
    windows = view_windows(zone, grid)
    tiles = []
    for lines, quick in rows:
        fit = Path(quick)/'fit.png'
        if not fit.is_file():
            continue
        image = Image.open(fit).convert('RGB')
        tiles.append((lines, [image.crop((k*grid+c0, r0, k*grid+c1, r1)) for k, (c0, c1) in enumerate(windows)]))
    if not tiles:
        return None
    widths = [c1-c0 for c0, c1 in windows]
    ch = r1-r0
    label_w, gap, limit = 300, 6, 1100
    scale = min(3.0, limit/sum(widths))
    scale = max(1.0, scale) if sum(widths)*1.0 <= limit else scale
    cells = [int(w*scale) for w in widths]
    ch2 = int(ch*scale)
    width = label_w+sum(cells)+gap*3
    height = 22+len(tiles)*(ch2+gap)
    sheet = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(sheet)
    draw.text((4, 4), f'sweep {region}: front | left | back, rows {a:.2f}-{b:.2f}; grey = both, blue = model only, orange = reference only', fill=(0, 0, 0))
    for k, (lines, views) in enumerate(tiles):
        y = 22+k*(ch2+gap)
        for j, line in enumerate(lines[:max(1, ch2//12)]):
            draw.text((4, y+2+12*j), line[:48], fill=(0, 0, 0))
        x = label_w
        for view, cw in zip(views, cells):
            sheet.paste(view.resize((cw, ch2), Image.NEAREST), (x, y))
            x += cw+gap
    sheet.quantize(128).save(path, optimize=True)
    return {'cells': cells, 'rowHeight': ch2, 'size': [width, height]}


# ---------------------------------------------------------------- the command

def run(args, rc):
    import loop_tools as lt
    import row_measures
    import sheet_measure as sm
    recipe = rc.load(args.recipe)
    step = recipe.byid.get(args.step)
    if step is None:
        rc.fail(f'no step {args.step}')
    component = step['component']
    other = 'head' if component == 'body' else 'body'
    if recipe.species != 'akinza':
        rc.fail('sweep reads loop/sheet.json through sheet_measure, which supports akinza only until species.json generalises it')
    region = args.region or (step.get('regions') or [None])[0]
    zones, species = rc.load_zones(recipe, None)
    if region not in zones or not isinstance(zones[region], dict):
        rc.fail(f'region {region} has no zone in species.json; pass --region with one that has')
    zone = zones[region]
    sheet = json.loads((lt.DOCS/'loop/sheet.json').read_text(encoding='utf-8'))
    try:
        import seam_check
        has_seam = hasattr(seam_check, 'check')
    except ImportError:
        seam_check, has_seam = None, False
    variants = build_variants(rc, args)
    if len(variants) > args.max:
        rc.fail(f'{len(variants)} variants exceed --max {args.max}; narrow the grid or raise --max')

    # sweep folder: a fresh numbered name, never an existing output
    work = recipe.work
    if args.out:
        name = args.out
        if (work/name).exists():
            rc.fail(f'{work/name} already exists; outputs are immutable, pick another --out')
        (work/name).mkdir(parents=True)
    else:
        number = subprocess.run([sys.executable, str(rc.LOOP_TOOLS), 'next-number', '--reserve'], cwd=rc.ROOT,
                                capture_output=True, text=True, check=True).stdout.strip()
        name = f'sweep-{number}'
        (work/name).mkdir(parents=True)
    sweep_dir = work/name
    spec_dir = work/'sweep_specs'
    quick_root = work/'sweep_quick'
    quick_root.mkdir(exist_ok=True)
    cache = rc.Cache(recipe)
    namer = rc.Namer(work)
    base = baseline_dirs(rc, recipe, cache)
    for sink in (component, other):
        if recipe.assembly[sink] not in base:
            rc.fail(f"baseline {sink} sink {recipe.assembly[sink]} is neither cached nor an existing directory; build the recipe first")
    base_head, base_body = base[recipe.assembly['head']], base[recipe.assembly['body']]
    rc.say(f'sweep {name}: step {args.step} ({component}, region {region}), {len(variants)} variants, baseline {base_head} + {base_body}')

    measurer = Measurer(lt, sm, row_measures, zone, sheet, seam_check if has_seam else None)
    slots = max(1, getattr(lt, 'BLENDER_SLOTS', 2))
    sched = Scheduler(slots, rc.say)
    info = []

    def quick_node(quick_id, deps, head_from, body_from):
        def fn(results):
            head, body = head_from(results), body_from(results)
            out = quick_root/f'quick_{head}__{body}'
            if (out/'fit.json').is_file():
                return {'dir': str(out), 'seconds': 0.0, 'cached': True}
            started = time.time()
            cmd = [sys.executable, str(rc.LOOP_TOOLS), 'quick', *rc.species_flags(recipe), head, body, str(out)]
            for attempt in (1, 2):  # a second try covers loop_tools.py being edited by another agent mid-run
                result = subprocess.run(cmd, cwd=rc.ROOT, capture_output=True, text=True)
                if not result.returncode and (out/'fit.json').is_file():
                    break
                if attempt == 2:
                    lines = [x for x in (result.stdout+result.stderr).splitlines() if x.strip()]
                    raise RuntimeError('quick failed: '+(lines[-1] if lines else 'no output'))
                time.sleep(20)
            return {'dir': str(out), 'seconds': round(time.time()-started, 1)}
        sched.add(quick_id, deps, fn, f'quick {quick_id[1]}')

    # the baseline is measured by the same quick render as every variant
    quick_node(('quick', BASELINE), [], lambda r: base_head, lambda r: base_body)

    for number, pairs in enumerate(variants, 1):
        vid = f'v{number:02d}'
        data = copy.deepcopy(recipe.data)

        def spec_path(doc, vid=vid):
            digest = rc.rs.sha256_bytes(json.dumps(doc, sort_keys=True).encode())[:12]
            return spec_dir/f'{args.step}-{digest}.json'

        rc.apply_edits(data, args.step, pairs, spec_path, keep_same=True)
        candidate_path = sweep_dir/f'{vid}.json'
        rc.stamp_derived(data, recipe.data, recipe.path)
        rc.dump(data, candidate_path)
        cand = rc.Recipe(candidate_path)
        keys = rc.compute_keys(cand)
        below = cand.descendants(args.step)
        chain = {s['id'] for s in cand.order if s['id'] in below and s['component'] == component}
        sink = cand.assembly[component]
        if sink not in chain:
            rc.fail(f'step {args.step} does not feed the {component} sink {sink}')
        record = {'id': vid, 'params': dict(pairs), 'label': label_of(pairs), 'recipe': str(candidate_path),
                  'chain': [s['id'] for s in cand.order if s['id'] in chain], 'nodeKeys': {s: keys[s] for s in chain}}
        info.append(record)
        for s in cand.order:
            if s['id'] not in chain:
                continue
            key = keys[s['id']]
            hit = cache.get('steps', key)
            if hit:
                sched.add(key, [], (lambda results, d=hit['dir']: {'dir': d, 'seconds': 0.0, 'cached': True}), f"{vid} {s['id']} (cached)")
                continue
            deps = [keys[r] for r in s['inputs'].values() if r in chain]

            def build(results, s=s, key=key, cand=cand, keys=keys, chain=chain, vid=vid):
                dirs = {n: input_path(cand, r, results, keys, chain, base) for n, r in s['inputs'].items()}
                for attempt in (1, 2):
                    out_name = namer.take(s.get('kind', 'part'))
                    try:
                        rc.say(f"start {vid} {s['id']} -> {out_name}" + (' (retry after memory error)' if attempt == 2 else ''))
                        seconds = rc.run_step(cand, s, dirs, out_name)
                        break
                    except SystemExit as error:
                        # Another agent's Blender can leave too little memory for a field build: wait once and rebuild
                        if attempt == 2 or 'MemoryError' not in (Path(work/f'{out_name}.log').read_text(encoding='utf-8', errors='replace')
                                                               if (work/f'{out_name}.log').is_file() else ''):
                            raise error
                        time.sleep(45)
                    finally:
                        namer.release(out_name)
                cache.put('steps', key, {'dir': out_name, 'step': s['id'], 'seconds': seconds,
                                         'built': datetime.datetime.now().isoformat(timespec='seconds'), 'sweep': name})
                rc.say(f"done {vid} {s['id']} -> {out_name} in {seconds:.0f}s")
                return {'dir': out_name, 'seconds': seconds}
            sched.add(key, deps, build, f"{vid} {s['id']}")
        edited_key = keys[args.step]
        sink_key = keys[sink]
        record['sinkKey'] = sink_key

        def contain(results, cand=cand, keys=keys, chain=chain, vid=vid):
            s = cand.byid[args.step]
            ref = s['inputs']['base' if 'base' in s['inputs'] else next(iter(s['inputs']))]
            base_dir = input_path(cand, ref, results, keys, chain, base)
            report = rc.compute_containment(cand, s, results[keys[args.step]]['dir'], base_dir, zones, species)
            reference, note = rc.containment_reference(cand, s, zones, species)
            rc.apply_reference(report, reference, note)
            (sweep_dir/f'contain-{vid}.json').write_bytes((json.dumps(report, indent=1)+'\n').encode('utf-8'))
            worst = max(report['foreign'].items(), key=lambda kv: kv[1]['max'], default=(None, {'max': 0.0}))
            excess = max([0.0]+[e['max']-max(args.contain_tol, e['allowance']) for e in report['foreign'].values()])
            return {'max': worst[1]['max'], 'region': worst[0], 'outsideAllZonesMax': report['outsideAllZones']['max'],
                    'ownedMax': report['ownedMax'], 'excess': round(excess, 5), 'relativeFlagged': report['verdict']['relative'],
                    'reference': report['rule']['referenceStep'], 'seconds': 0.0}
        sched.add(('contain', vid), [edited_key], contain, f'{vid} contain')
        if component == 'body':
            quick_node(('quick', vid), [sink_key], lambda r: base_head, lambda r, sk=sink_key: r[sk]['dir'])
        else:
            quick_node(('quick', vid), [sink_key], lambda r, sk=sink_key: r[sk]['dir'], lambda r: base_body)

    started = time.time()
    results, errors = sched.run()
    elapsed = round(time.time()-started, 1)

    base_quick = results.get(('quick', BASELINE))
    if not base_quick:
        rc.fail(f"baseline quick failed: {errors.get(('quick', BASELINE))}")
    base_terms = measurer.measure(base_quick['dir'])
    base_tool = tool_record(recipe.work/base[args.step]) if args.step in base else None
    rows = []
    for record in info:
        vid = record['id']
        entry = dict(record)
        seconds = {sid: results[key]['seconds'] for sid, key in record['nodeKeys'].items() if key in results}
        entry['seconds'] = {'steps': seconds, 'quick': results.get(('quick', vid), {}).get('seconds')}
        bad = [errors[k] for k in [*record['nodeKeys'].values(), ('contain', vid), ('quick', vid)] if k in errors]
        if bad:
            entry['error'] = bad[0]
            entry['total'] = None
            rows.append(entry)
            continue
        quick = results[('quick', vid)]
        entry['sink'] = results[record['sinkKey']]['dir']
        entry['quick'] = quick['dir']
        terms = measurer.measure(quick['dir'], base_quick['dir'])
        contain = results[('contain', vid)]
        tool = tool_record(recipe.work/results[record['nodeKeys'][args.step]]['dir'])
        entry['terms'] = {**terms, 'containMax': contain['max'], 'containRegion': contain['region'],
                          'containOutsideZones': contain['outsideAllZonesMax'], 'containExcess': contain['excess'],
                          'containRelativeFlagged': contain['relativeFlagged'], 'containReference': contain['reference'],
                          'toolScore': tool[0] if tool else None, 'toolTerms': tool[1] if tool else None,
                          'toolRecord': tool[2] if tool else None}
        rows.append(entry)
    # the tool score is judged against the baseline step's own record; when that output predates the score, against the worst variant
    scores = [r['terms']['toolScore'] for r in rows if r.get('terms') and r['terms']['toolScore'] is not None]
    tool_ref = base_tool[0] if base_tool else (min(scores) if scores else None)
    for entry in rows:
        if entry.get('terms'):
            entry['total'], entry['parts'] = total_score(entry['terms'], base_terms, entry['terms']['containExcess'], tool_ref)
    ranked = sorted(rows, key=lambda r: (r['total'] is None, -(r['total'] or 0)))
    for k, r in enumerate(ranked, 1):
        r['rank'] = k
    best = next((r for r in ranked if r['total'] is not None), None)

    report = {'schemaVersion': 1, 'sweep': name, 'recipe': str(recipe.path), 'step': args.step, 'component': component,
              'region': region, 'zone': zone, 'containTol': args.contain_tol, 'seamTerm': has_seam, 'scoring': TERMS,
              'toolScore': {'reference': tool_ref, 'baseline': base_tool[0] if base_tool else None,
                            'referenceIs': 'baseline step record' if base_tool else ('worst variant' if scores else None)},
              'baseline': {'head': base_head, 'body': base_body, 'quick': base_quick['dir'], 'terms': base_terms,
                           'quickSeconds': base_quick['seconds'], 'toolTerms': base_tool[1] if base_tool else None},
              'seconds': elapsed, 'variants': ranked, 'best': best['id'] if best else None,
              'bestRecipe': best['recipe'] if best else None,
              'created': datetime.datetime.now().isoformat(timespec='seconds')}
    (sweep_dir/'sweep.json').write_bytes((json.dumps(report, indent=1)+'\n').encode('utf-8'))

    top = args.top
    sheet_rows = []
    for r in [x for x in ranked if x['total'] is not None][:top]:
        t = r['terms']
        sheet_rows.append(([f"#{r['rank']} {r['id']}  total {r['total']:+.2f}", r['label'][:52],
                            f"iou {t['fitIou']}  stn {t['stationDiff']}", f"contain {t['containMax']} ({t['containRegion']})"]
                           + ([f"tool {t['toolScore']:.5f}"] if t.get('toolScore') is not None else [])
                           + ([f"seam {t['seam']['worstRatio']} {t['seam']['at'] or ''}"] if isinstance(t.get('seam'), dict) and 'worstRatio' in t['seam'] else []), r['quick']))
    bt = base_terms
    sheet_rows.append(([f'baseline {base_body}', 'recipe as is', f"iou {bt['fitIou']}  stn {bt['stationDiff']}"], base_quick['dir']))
    drawn = contact_sheet(sheet_rows, region, zone, sweep_dir/'sweep.png')

    # compact table
    print(f"\nsweep {name}  step {args.step}  region {region}  baseline iou {bt['fitIou']}  station {bt['stationDiff']}  "
          f"({elapsed:.0f}s wall, {len(variants)} variants)")
    cols = ['rank', 'id', 'params', 'fitIou', 'station', 'contain', 'tool', 'seam', 'changed', 'total', 'build s', 'quick s']
    table = [cols]
    for r in ranked:
        if r['total'] is None:
            table.append(['-', r['id'], r['label'], 'ERROR', r.get('error', '')[:60], '', '', '', '', '', '', ''])
            continue
        t = r['terms']
        built = sum(r['seconds']['steps'].values())
        table.append([r['rank'], r['id'], r['label'], t['fitIou'], t['stationDiff'], f"{t['containMax']} {t['containRegion'] or ''}".strip(),
                      (f"{t['toolScore']:.5f}" if t.get('toolScore') is not None else '-'),
                      (t['seam'].get('worstRatio', 'err') if isinstance(t['seam'], dict) else '-'), t['silhouetteChange'], f"{r['total']:+.2f}", f'{built:.0f}', r['seconds']['quick']])
    widths = [max(len(str(row[c])) for row in table) for c in range(len(cols))]
    for row in table:
        print('  '.join(str(v).ljust(w) for v, w in zip(row, widths)))
    print(f"baseline: iou {bt['fitIou']} station {bt['stationDiff']}"
          + (f" tool {tool_ref:.5f} ({report['toolScore']['referenceIs']})" if tool_ref is not None else '')
          + f" (quick {base_quick['seconds']}s)")
    print(f'report {sweep_dir/"sweep.json"}\ncontact sheet {sweep_dir/"sweep.png"}' + ('' if drawn else ' (none drawn)'))
    if best:
        print(f"best {best['id']}: candidate recipe {best['recipe']}\n  build it with: python art/species-construction/loop/recipe.py build {best['recipe']}")
    else:
        print('no variant succeeded')
