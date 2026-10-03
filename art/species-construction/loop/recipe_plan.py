"""recipe.py run-plan: execute a planner's plan.json with one blocking command.

  python art/species-construction/loop/recipe.py run-plan <plan.json> [--top K] [--dry-run]

A plan (format in RECIPE.md and docs/design/species-construction/akinza/loop/plan-schema.md) names a base recipe, an optional
starting recipe, up to 16 variants (edits to steps) and sweeps (grids over one step's arguments), at most 24 builds in all.
This module:

  1. rebases `start` onto `base` (with `attachAfter`, re-parents the start's added steps onto a newer sink first),
  2. applies each variant's edits to its own candidate recipe (derivedFrom recorded, as `set` and `add` do),
  3. builds every variant's missing steps through the shared cache and Blender slot lock (one build per distinct step key),
  4. renders `quick` for each (the variant's component with the baseline's other one) and scores it with the sweep scorer
     (recipe_sweep: region overlap, stations, containment, seams, tool sweepScore, plus surface_stats when it is present),
  5. runs the full `recipe.py candidate` path for the top K by score, in parallel up to the slot limit,
  6. writes plan-result.json and plan-result.png beside the plan and prints one compact JSON line.

A variant that fails is reported and the rest continue. Exit 0 when at least one candidate packet exists.
"""
import copy
import datetime
import itertools
import json
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import os

# No console window for child processes on Windows: a detached plan job has no console, so
# every child would otherwise open its own window. Output is captured or logged already.
_NO_WINDOW = {'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}


def _run(*a, **k):
    return subprocess.run(*a, **{**_NO_WINDOW, **k})


HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

MAX_VARIANTS = 16
MAX_BUILDS = 24
DEFAULT_TOP = 3
QUICK_MINUTES = 0.8          # --dry-run estimate of one quick render (3 views, head plus body)
SECTION_MINUTES = 1.2        # --dry-run estimate of the two mesh-section dumps of a new body (quick criteria)
ASSEMBLY_MINUTES = 5.2       # the recipe's assembly; check, packet and diff are added by recipe_candidate's constants
SHEET_ROWS_PER_COLUMN = 6


# ---------------------------------------------------------------- the plan

def as_value(value):
    """An edit value as the string `set` takes."""
    if isinstance(value, str):
        return value
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (list, dict)) or value is None:
        return json.dumps(value)
    return str(value)


def load_plan(rc, path):
    path = Path(path).resolve()
    if not path.is_file():
        rc.fail(f'{path}: no such plan')
    try:
        plan = json.loads(path.read_text(encoding='utf-8'))
    except ValueError as error:
        rc.fail(f'{path}: not JSON ({error})')
    for key in ('base', 'baselinePacket'):
        if not plan.get(key):
            rc.fail(f'plan: "{key}" is required')
    order = plan.get('order') or {}
    plan['region'] = plan.get('region') or order.get('region')
    if not plan['region']:
        rc.fail('plan: "region" (or order.region) is required: the zone the variants are scored over')
    variants = []
    for number, v in enumerate(plan.get('variants') or [], 1):
        if not isinstance(v.get('edits'), list):
            rc.fail(f'plan: variant {number} needs an "edits" list')
        for e in v['edits']:
            check_edit(rc, number, e)
        variants.append({'name': v.get('name') or f'variant {number}', 'why': v.get('why', ''), 'edits': v['edits'], 'from': 'variant'})
    if len(variants) > MAX_VARIANTS:
        rc.fail(f'plan: {len(variants)} variants exceed the limit of {MAX_VARIANTS}')
    for k, sweep in enumerate(plan.get('sweeps') or [], 1):
        if not sweep.get('step') or not isinstance(sweep.get('grid'), dict) or not sweep['grid']:
            rc.fail(f'plan: sweep {k} needs "step" and a non-empty "grid" {{arg: [values]}}')
        axes = []
        for arg, values in sweep['grid'].items():
            if not isinstance(values, list) or not values:
                rc.fail(f'plan: sweep {k} grid "{arg}" needs a non-empty list of values')
            axes.append([(arg, v) for v in values])
        for combo in itertools.product(*axes):
            label = ' '.join(f"{(a[5:] if a.startswith('spec:') else a.lstrip('-'))}={json.dumps(v) if isinstance(v, (list, dict)) else v}" for a, v in combo)
            variants.append({'name': f"sweep {sweep['step']} {label}", 'why': sweep.get('why', ''), 'from': f'sweep {k}',
                             'edits': [{'op': 'set', 'step': sweep['step'], 'arg': a, 'value': v} for a, v in combo]})
    if not variants:
        rc.fail('plan: no variants and no sweeps')
    if len(variants) > MAX_BUILDS:
        rc.fail(f'plan: variants plus sweep points come to {len(variants)}, over the cap of {MAX_BUILDS} builds')
    plan['_variants'] = variants
    plan['_path'] = path
    return plan


def check_edit(rc, number, e):
    op = e.get('op')
    if op == 'set':
        need = ('step', 'arg', 'value')
    elif op == 'add':
        need = ('after', 'step')
    elif op == 'script':
        need = ('step', 'script')
    else:
        rc.fail(f'plan: variant {number}: op must be set, add or script (got {op!r})')
    missing = [k for k in need if k not in e]
    if missing:
        rc.fail(f'plan: variant {number}: {op} edit lacks {", ".join(missing)}')


# ---------------------------------------------------------------- start recipe: rebase and attachAfter

def prepare_start(rc, base, plan, run_dir, notes):
    """The starting recipe's data dict: the base itself, or the plan's `start` rebased onto it. A start is a path or
    {"recipe": path, "attachAfter": STEP, "live": bool}. With attachAfter the start's added steps that read the start's old sink
    (a step of its original recipe that nothing of that original recipe reads) are re-parented onto STEP, the start's tip takes over
    the assembly sink, and the added steps are placed after STEP: this is the case where the base grew steps after the same sink."""
    start = plan.get('start')
    if not start:
        return copy.deepcopy(base.data)
    spec = start if isinstance(start, dict) else {'recipe': start}
    path = Path(spec['recipe'])
    path = path if path.is_absolute() else rc.ROOT/path
    if not path.is_file():
        rc.fail(f'plan: start recipe {path} not found')
    cand = json.loads(path.read_text(encoding='utf-8'))
    block = cand.get('derivedFrom')
    if not block:
        rc.fail(f'plan: start {path.name} has no derivedFrom block; rebase it by hand with the old base first')
    attach = spec.get('attachAfter')
    commit = None if spec.get('live') else rc.candidate_commit(path)
    if attach:
        if attach not in base.byid:
            rc.fail(f'plan: attachAfter {attach} is not a step of the base recipe')
        component = base.byid[attach]['component']
        block = copy.deepcopy(block)
        added = [s for s in cand['steps'] if s['id'] not in block['steps']]
        original = [s for s in cand['steps'] if s['id'] in block['steps']]
        read = {r for s in original for r in s['inputs'].values()}
        leaves = {s['id'] for s in original if s.get('component') == component and s['id'] not in read}
        cand = copy.deepcopy(cand)
        moved = []
        for s in cand['steps']:
            if s['id'] in {a['id'] for a in added} and s.get('component') == component:
                for name, ref in list(s['inputs'].items()):
                    if ref in leaves:
                        s['inputs'][name] = attach
                        moved.append(f"{s['id']}.{name}: {ref} -> {attach}")
        if not moved:
            rc.fail(f'plan: attachAfter {attach}: the start adds no {component} step that reads its old {component} sink '
                    f'({", ".join(sorted(leaves)) or "none found"})')
        notes.append('attachAfter '+attach+': '+'; '.join(moved))
        if cand['assembly'].get(component) in {a['id'] for a in added}:
            # the start's tip is the new sink: make the rebase see the new base's sink as the thing the start started from
            block['assembly'][component] = rc._fp(base.data['assembly'][component])
        cand['derivedFrom'] = block
    out = rc.rebase_recipes(None, base.data, cand, commit, notes)
    if attach:
        moved_ids = [s['id'] for s in cand['steps'] if s['id'] in {a['id'] for a in added} and s.get('component') == component]
        steps = [s for s in out['steps'] if s['id'] not in moved_ids]
        at = next(i for i, s in enumerate(steps) if s['id'] == attach)+1
        steps[at:at] = [s for s in out['steps'] if s['id'] in moved_ids]
        out['steps'] = steps
    out['rebasedFrom'] = {'candidate': rc.rs.pin_key(path.resolve()), 'candidateSha256': rc.rs.file_hash(path, normalise=True)}
    return out


# ---------------------------------------------------------------- variant recipes

def apply_edits(rc, data, edits, spec_dir):
    """Apply a variant's edits to a recipe dict. Returns the ids of the steps it set, rescripted or added. Consecutive set and
    script edits of one step are applied together, so one spec file is written."""
    touched = []
    groups, current = [], None
    for e in edits:
        if e['op'] == 'add':
            groups.append(('add', e))
            current = None
            continue
        pair = (e['arg'], as_value(e['value'])) if e['op'] == 'set' else ('script', e['script'])
        if current is not None and current[1] == e['step']:
            current[2].append(pair)
        else:
            current = ['edit', e['step'], [pair]]
            groups.append(current)
    for group in groups:
        if group[0] == 'add':
            e = group[1]
            new = copy.deepcopy(e['step'])
            if 'id' not in new:
                rc.fail('an added step needs an "id"')
            new.setdefault('runner', 'blender')
            new.setdefault('regions', [])
            rewire = [tuple(x.split(':')) for x in e.get('rewire', [])]
            rc.add_step(data, e['after'], new, rewire)
            touched.append(new['id'])
        else:
            def spec_path(doc, step=group[1]):
                digest = rc.rs.sha256_bytes(json.dumps(doc, sort_keys=True).encode())[:12]
                return spec_dir/f'{step}-{digest}.json'
            rc.apply_edits(data, group[1], group[2], spec_path, keep_same=True)
            touched.append(group[1])
    return touched


def make_variants(rc, base, start_data, plan, run_dir, cache):
    out = []
    spec_dir = base.work/'sweep_specs'
    for number, v in enumerate(plan['_variants'], 1):
        vid = f'v{number:02d}'
        entry = {'id': vid, 'name': v['name'], 'why': v['why'], 'source': v['from'], 'edits': v['edits'], 'built': False}
        out.append(entry)
        try:
            data = copy.deepcopy(start_data)
            touched = apply_edits(rc, data, v['edits'], spec_dir)
            rc.stamp_derived(data, base.data, base.path)
            path = run_dir/f'{vid}.json'
            rc.dump(data, path)
            cand = rc.Recipe(path)
            cplan, keys = rc.make_plan(cand, cache)
        except SystemExit as error:
            entry['error'] = str(error.code)
            continue
        except (KeyError, ValueError, StopIteration) as error:
            entry['error'] = f'{type(error).__name__}: {error}'
            continue
        pinned = rc.plan_changed(cplan)
        if pinned:
            entry['error'] = 'pin refusal: '+'; '.join(f'{sid} {key} {state}' for sid, key, state in pinned)
            continue
        own = {plan['region'], *((plan.get('order') or {}).get('with') or [])}
        entry['warnings'] = [f'step {sid} is tagged {cand.byid[sid].get("regions")}, not {sorted(own)}' for sid in touched
                             if sid in cand.byid and not own & set(cand.byid[sid].get('regions', []))]
        entry.update(recipe=str(path), touched=touched, _cand=cand, _plan=cplan, _keys=keys)
        entry['changedSteps'] = sorted(sid for sid in cand.byid
                                       if sid not in base.byid or rc.step_fingerprint(cand.byid[sid]) != rc.step_fingerprint(base.byid[sid]))
    return out


# ---------------------------------------------------------------- dry run

def schedule(nodes, slots):
    """Wall minutes of a greedy schedule of {key: (deps, minutes)} on `slots` slots."""
    free, finish, todo = [0.0]*slots, {}, dict(nodes)
    while todo:
        key = next(k for k, (deps, _) in todo.items() if all(d in finish or d not in nodes for d in deps))
        deps, minutes = todo.pop(key)
        ready = max([finish[d] for d in deps if d in finish] or [0.0])
        k = min(range(slots), key=lambda i: free[i])
        finish[key] = free[k] = max(free[k], ready)+(minutes or 0.0)
    return max(finish.values(), default=0.0)


def edit_group(v):
    """Variants of one sweep share a group (the readers learn little from two points of one sweep);
    every other variant is its own group."""
    src = str(v.get('source') or '')
    return src if src.startswith('sweep') else 'variant '+v['id']


def choose_candidates(ranked, top, has_start, say=lambda s: None):
    """The top K for the readers, round 23's lessons applied:
    - a plan that starts from a tool starter keeps a slot for its control variant (no edits), the build the
      tool's reader check already compared with the baseline; round 23 ranked it sixth and the readers
      never saw it, while the three picks they did see all read worse;
    - at most one variant per sweep, so the readers compare different ideas;
    - when no variant moves a measured criterion of the order (every progress term zero), the totals are
      noise, so the picks are spread over different groups rather than taken in score order."""
    picks, groups = [], set()
    control = next((v for v in ranked if not v.get('edits') and not v.get('noop')), None) if has_start else None
    if control:
        picks.append(control)
        groups.add(edit_group(control))
    blind = all(not (v.get('parts') or {}).get('progress') for v in ranked)
    # blind: the planner's own order (ideas before sweeps, most believed first) beats a noise ranking
    order = sorted(ranked, key=lambda v: v['id']) if blind else ranked
    for v in order:
        if len(picks) >= top:
            break
        if v in picks or edit_group(v) in groups:
            continue
        picks.append(v)
        groups.add(edit_group(v))
    for v in ranked:  # fill from the ranking if the groups ran out
        if len(picks) >= top:
            break
        if v not in picks:
            picks.append(v)
    if control:
        say(f"candidate slot kept for the start's control variant {control['id']} (rank {control['rank']})")
    if blind:
        say("no variant moved a measured criterion of the order; candidates taken in the planner's order, one per idea")
    return sorted(picks, key=lambda v: v['rank'])


def candidate_minutes(plan_dir):
    """Median wall minutes of past top-K candidates (assemble, packet, posed fit, measures), from the plan
    results beside this plan. They ran while the other component's plan shared the Blender slots, which
    is how a round runs them, so they already carry that contention."""
    vals = []
    for f in Path(plan_dir).glob('*plan-result*.json'):
        try:
            r = json.loads(f.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            continue
        vals += [e['wallMinutes'] for e in r.get('top') or [] if isinstance(e.get('wallMinutes'), (int, float))]
    vals.sort()
    return vals[len(vals)//2] if len(vals) >= 3 else None


def dry_run(rc, base, plan, variants, notes, start_data, cache, top, slots):
    # round 21: estimates of 27 and 17 minutes ran 63 and 90, because a round runs the head and the
    # body plan at once on the same slots and a candidate took 20 to 50 minutes, not 7. Schedule on
    # half the slots and price a candidate by the measured median.
    shared = max(1, round(slots/2))
    print(f"plan {plan['_path'].name}: base {Path(plan['base']).name}, region {plan['region']}, {len(variants)} variants, top {top}")
    for note in notes:
        print('start: '+note)
    if plan.get('start'):
        cand = rc.Recipe(plan['_run_dir']/'start.json')
        cplan, _ = rc.make_plan(cand, cache)
        print('start recipe after the rebase:')
        rc.print_plan(cand, cplan, cache)
    nodes, unknown = {}, set()
    import loop_tools as lt
    import quick_criteria as qc
    regions = [plan['region']]+list((plan.get('order') or {}).get('with') or [])
    sections = any(c['source'] == 'trunk' or (c['source'] == 'measure' and c.get('key') in qc.BODY_MEASURE_KEYS) for _, c in qc.criteria(lt, regions))
    for v in variants:
        if 'error' in v:
            print(f"  {v['id']} {v['name']}: ERROR {v['error'].splitlines()[0]}")
            continue
        cand, cplan, keys = v['_cand'], v['_plan'], v['_keys']
        todo = [s for s in cand.order if not cplan[s['id']]['dir']]
        for s in todo:
            m = rc.step_minutes(cand, cache, s['id'])
            if m is None:
                unknown.add(s['id'])
            nodes[keys[s['id']]] = ([keys[r] for r in s['inputs'].values() if r in keys and not cplan[r]['dir']], m)
        sinks = [cand.assembly['head'], cand.assembly['body']]
        nodes[('quick', v['id'])] = ([keys[s] for s in sinks if not cplan[s]['dir']], QUICK_MINUTES)
        if sections and not cplan[cand.assembly['body']]['dir']:
            # a new body is sliced twice (trunk and torso sections) for the quick criteria
            nodes[('sections', v['id'])] = ([('quick', v['id'])], SECTION_MINUTES)
        mins = ', '.join(f"{s['id']} ~{rc.step_minutes(cand, cache, s['id']) or 0:.1f}" for s in todo)
        print(f"  {v['id']} {v['name']}: changed {', '.join(v['changedSteps']) or 'nothing'}; builds {mins or 'nothing (all cached)'}")
        for w in v.get('warnings', []):
            print(f'    warning: {w}')
    nodes[('quick', 'baseline')] = ([], QUICK_MINUTES)
    wall = schedule(nodes, shared)
    from recipe_candidate import CHECK_MINUTES, DIFF_MINUTES, PACKET_MINUTES
    measured = candidate_minutes(plan['_path'].parent)
    per_candidate = measured or ASSEMBLY_MINUTES+CHECK_MINUTES+PACKET_MINUTES+DIFF_MINUTES
    waves = -(-top//slots)  # run-plan starts up to `slots` candidates at once; the median was measured that way
    print(f"builds: {sum(1 for k in nodes if isinstance(k, str))} distinct steps and {sum(1 for k in nodes if isinstance(k, tuple))} quick renders; "
          f"scoring about {wall:.1f} min wall on {shared} of {slots} slots (the other component's plan shares them)"
          + (f' (no recorded time for {", ".join(sorted(unknown))})' if unknown else ''))
    print(f"then the top {top} through candidate: about {per_candidate:.1f} min each ({'median of past candidates' if measured else 'nominal'}), {waves} wave(s) of {slots}; total about {wall+waves*per_candidate:.1f} min")
    print('run it as a job: plan_job.py start, then plan_job.py wait until done' if wall+waves*per_candidate > 9 else 'short enough to run in the foreground')


# ---------------------------------------------------------------- packet images for the contact sheet

def packet_image(packet, species, region):
    names = (species.get('regionImages') or {}).get(region) or ['m02']
    for name in names:
        path = Path(packet)/f'{name}.png'
        if path.is_file():
            return path
    return None


def compose_sheet(rc, rs_mod, region, zone, species, rows, top_entries, baseline_packet, path):
    """rows: [(label lines, quick dir)] baseline first. Variant tiles in columns, then the packet region image of the baseline and of
    every top-K candidate side by side."""
    from PIL import Image, ImageDraw
    grid = 500
    a, b = zone['at']
    pad = max(.02, (.12-(b-a))/2)
    r0, r1 = max(0, int((a-pad)*grid)), min(grid, int((b+pad)*grid))
    windows = rs_mod.view_windows(zone, grid)
    ncols = 1 if len(rows) <= SHEET_ROWS_PER_COLUMN else (2 if len(rows) <= 2*SHEET_ROWS_PER_COLUMN else 3)
    scale = {1: 1.0, 2: .8, 3: .6}[ncols]
    label_w = 230
    tiles = []
    for lines, quick in rows:
        fit = Path(quick)/'fit.png' if quick else None
        widths = [int((c1-c0)*scale) for c0, c1 in windows]
        height = int((r1-r0)*scale)
        tile = Image.new('RGB', (label_w+sum(widths)+4*3, height), 'white')
        draw = ImageDraw.Draw(tile)
        for j, line in enumerate(lines[:max(1, height//12)]):
            draw.text((4, 2+12*j), line[:40], fill=(0, 0, 0))
        if fit and fit.is_file():
            image = Image.open(fit).convert('RGB')
            x = label_w
            for k, ((c0, c1), w) in enumerate(zip(windows, widths)):
                tile.paste(image.crop((k*grid+c0, r0, k*grid+c1, r1)).resize((w, height), Image.NEAREST), (x, 0))
                x += w+4
        else:
            draw.text((label_w, height//2), 'no quick render', fill=(160, 0, 0))
        tiles.append(tile)
    per = -(-len(tiles)//ncols)
    columns = [tiles[i*per:(i+1)*per] for i in range(ncols)]
    col_w = max(t.width for t in tiles)
    gap = 6
    panel_h = max(sum(t.height+gap for t in col) for col in columns)
    top_w = ncols*col_w+gap*(ncols-1)
    # second panel
    shots = []
    for label, packet in [('baseline '+Path(baseline_packet).name, baseline_packet)]+[(f"#{e['rank']} {e['id']} {Path(e['packet']).name}", e['packet']) for e in top_entries]:
        image = packet_image(packet, species, region) if packet else None
        if image:
            shots.append((label, Image.open(image).convert('RGB')))
    width = max(top_w, 1200)
    each = (width-gap*(len(shots)-1))//max(1, len(shots))
    panel2 = []
    for label, image in shots:
        h = int(image.height*each/image.width)
        panel2.append((label, image.resize((each, h), Image.LANCZOS)))
    panel2_h = (max(i.height for _, i in panel2)+16) if panel2 else 0
    sheet = Image.new('RGB', (width, 22+panel_h+(panel2_h+8 if panel2 else 0)), 'white')
    draw = ImageDraw.Draw(sheet)
    draw.text((4, 4), f'plan {region}: every variant front | left | back over rows {a:.2f}-{b:.2f} (grey both, blue model only, orange reference only); '
              'below, the packet image of the baseline and of the top candidates', fill=(0, 0, 0))
    for c, col in enumerate(columns):
        y = 22
        for tile in col:
            sheet.paste(tile, (c*(col_w+gap), y))
            y += tile.height+gap
    if panel2:
        y = 22+panel_h+8
        x = 0
        for label, image in panel2:
            draw.text((x+4, y), label, fill=(0, 0, 0))
            sheet.paste(image, (x, y+14))
            x += each+gap
    sheet.quantize(256).save(path, optimize=True)
    return list(sheet.size)


# ---------------------------------------------------------------- the command

def reserve(rc):
    return _run([sys.executable, str(rc.LOOP_TOOLS), 'next-number', '--reserve'], cwd=rc.ROOT,
                          capture_output=True, text=True, check=True).stdout.strip()


def run(args, rc):
    import loop_tools as lt
    import recipe_sweep as sw
    import row_measures
    import sheet_measure as sm
    started = time.time()
    plan = load_plan(rc, args.plan)
    base_path = Path(plan['base'])
    base_path = base_path if base_path.is_absolute() else rc.ROOT/base_path
    base = rc.load(base_path)
    if base.species != 'akinza':
        rc.fail('run-plan scores with loop/sheet.json through sheet_measure, which supports akinza only until species.json generalises it')
    top = args.top if args.top is not None else int(plan.get('top') or DEFAULT_TOP)
    slots = max(1, getattr(lt, 'BLENDER_SLOTS', 2))
    cache = rc.Cache(base)
    baseline_packet = Path(plan['baselinePacket'])
    baseline_packet = baseline_packet if baseline_packet.is_absolute() else rc.ROOT/baseline_packet
    if not (baseline_packet/'index.json').is_file():
        baseline_packet = base.work/'loop/packets'/plan['baselinePacket']
    if not (baseline_packet/'index.json').is_file():
        rc.fail(f"baselinePacket {plan['baselinePacket']}: not a packet directory (no index.json)")
    baseline_packet = baseline_packet.resolve()
    zones, species = rc.load_zones(base, None)
    region = plan['region']
    if region not in zones or not isinstance(zones[region], dict):
        rc.fail(f'region {region} has no zone in species.json')
    zone = zones[region]

    if args.dry_run:
        run_dir = Path(tempfile.mkdtemp(prefix='plan-dry-'))
    else:
        number = reserve(rc)
        run_dir = base.work/f'plan-{number}'
        run_dir.mkdir(parents=True)
    plan['_run_dir'] = run_dir
    try:
        notes = []
        start_data = prepare_start(rc, base, plan, run_dir, notes)
        if plan.get('start'):
            rc.dump(start_data, run_dir/'start.json', like=base.path)
        variants = make_variants(rc, base, start_data, plan, run_dir, cache)
        if args.dry_run:
            dry_run(rc, base, plan, variants, notes, start_data, cache, top, slots)
            return
        result = execute(rc, lt, sw, row_measures, sm, base, plan, variants, notes, cache, zones, species, zone, region,
                         baseline_packet, run_dir, top, slots, started)
    finally:
        if args.dry_run:
            shutil.rmtree(run_dir, ignore_errors=True)
    sys.exit(0 if any(c.get('ok') for c in result['top']) else 1)


def execute(rc, lt, sw, row_measures, sm, base, plan, variants, notes, cache, zones, species, zone, region, baseline_packet, run_dir, top, slots, started):
    work = base.work
    shutil.copyfile(plan['_path'], run_dir/'plan.json')
    quick_root = work/'sweep_quick'
    quick_root.mkdir(exist_ok=True)
    sheet = json.loads((lt.DOCS/'loop/sheet.json').read_text(encoding='utf-8'))
    try:
        import seam_check
        seam = seam_check if hasattr(seam_check, 'check') else None
    except ImportError:
        seam = None
    try:
        import surface_stats
    except ImportError:
        surface_stats = None
    measurer = sw.Measurer(lt, sm, row_measures, zone, sheet, seam)
    measure_lock = threading.Lock()
    import quick_criteria as qc
    crit_regions = [region]+[r for r in ((plan.get('order') or {}).get('with') or []) if r != region]
    packet_measured = json.loads((baseline_packet/'measured.json').read_text(encoding='utf-8')) if (baseline_packet/'measured.json').is_file() else {}
    crit_cache, crit_locks, crit_lock = {}, {}, threading.Lock()

    def crit_of(quick):
        # quick criteria of one quick folder, once per folder (the baseline is shared by every variant).
        # Round 23: one lock around every evaluation ran the mesh-section dumps (two Blender runs per
        # body) one at a time, and the torso plan's scoring took 79 minutes; now one lock per body, so
        # different bodies run in parallel and two quick folders on one body never dump it twice at once
        key = quick['dir']
        with crit_lock:
            if key in crit_cache:
                return crit_cache[key]
            body_lock = crit_locks.setdefault(quick['body'], threading.Lock())
        with body_lock:
            with crit_lock:
                if key in crit_cache:
                    return crit_cache[key]
            value = qc.evaluate(lt, quick['dir'], work/quick['body'], crit_regions)
            with crit_lock:
                crit_cache[key] = value
            return value
    namer = rc.Namer(work)
    sched = sw.Scheduler(slots, rc.say)
    base_plan, _ = rc.make_plan(base, cache)
    for sink in ('head', 'body'):
        if not base_plan[base.assembly[sink]]['dir']:
            rc.fail(f'baseline {sink} sink {base.assembly[sink]} is not built; build the base recipe first')
    base_head, base_body = (base_plan[base.assembly[s]]['dir'] for s in ('head', 'body'))
    live = [v for v in variants if 'error' not in v]
    rc.say(f"plan {run_dir.name}: {len(variants)} variants ({len(live)} prepared), region {region}, baseline {base_head} + {base_body}, top {top}")
    for note in notes:
        rc.say('start: '+note)
    for v in variants:
        if 'error' in v:
            rc.say(f"{v['id']} {v['name']}: NOT PREPARED {v['error'].splitlines()[0]}")

    def quick_fn(head_of, body_of):
        def fn(results):
            head, body = head_of(results), body_of(results)
            out = quick_root/f'quick_{head}__{body}'
            if (out/'fit.json').is_file():
                return {'dir': str(out), 'seconds': 0.0, 'cached': True, 'head': head, 'body': body}
            began = time.time()
            cmd = [sys.executable, str(rc.LOOP_TOOLS), 'quick', *rc.species_flags(base), head, body, str(out)]
            for attempt in (1, 2):
                proc = _run(cmd, cwd=rc.ROOT, capture_output=True, text=True)
                if not proc.returncode and (out/'fit.json').is_file():
                    break
                if attempt == 2:
                    lines = [x for x in (proc.stdout+proc.stderr).splitlines() if x.strip()]
                    raise RuntimeError('quick failed: '+(lines[-1] if lines else 'no output'))
                time.sleep(20)
            return {'dir': str(out), 'seconds': round(time.time()-began, 1), 'head': head, 'body': body}
        return fn

    sched.add(('quick', 'baseline'), [], quick_fn(lambda r: base_head, lambda r: base_body), 'quick baseline')

    for v in live:
        vid, cand, cplan, keys = v['id'], v['_cand'], v['_plan'], v['_keys']
        todo = [s for s in cand.order if not cplan[s['id']]['dir']]

        def dir_of(ref, results, cand=cand, cplan=cplan, keys=keys):
            if ref in cand.roots:
                return work/cand.roots[ref]['dir']
            if cplan[ref]['dir']:
                return work/cplan[ref]['dir']
            return work/results[keys[ref]]['dir']

        for s in todo:
            key = keys[s['id']]
            deps = [keys[r] for r in s['inputs'].values() if r in keys and not cplan[r]['dir']]

            def build(results, s=s, key=key, cand=cand, vid=vid, dir_of=dir_of):
                dirs = {n: dir_of(r, results) for n, r in s['inputs'].items()}
                for attempt in (1, 2):
                    out_name = namer.take(s.get('kind', 'part'))
                    try:
                        rc.say(f"start {vid} {s['id']} -> {out_name}" + (' (retry after memory error)' if attempt == 2 else ''))
                        seconds = rc.run_step(cand, s, dirs, out_name)
                        break
                    except SystemExit as error:
                        log = work/f'{out_name}.log'
                        if attempt == 2 or 'MemoryError' not in (log.read_text(encoding='utf-8', errors='replace') if log.is_file() else ''):
                            raise error
                        time.sleep(45)
                    finally:
                        namer.release(out_name)
                cache.put('steps', key, {'dir': out_name, 'step': s['id'], 'seconds': seconds,
                                         'built': datetime.datetime.now().isoformat(timespec='seconds'), 'plan': run_dir.name})
                rc.say(f"done {vid} {s['id']} -> {out_name} in {seconds:.0f}s")
                return {'dir': out_name, 'seconds': seconds}
            sched.add(key, deps, build, f"{vid} {s['id']}")

        sinks = {c: cand.assembly[c] for c in ('head', 'body')}
        sink_deps = [keys[sinks[c]] for c in ('head', 'body') if not cplan[sinks[c]]['dir']]
        sched.add(('quick', vid), sink_deps,
                  quick_fn(lambda r, d=dir_of, k=sinks['head']: Path(d(k, r)).name, lambda r, d=dir_of, k=sinks['body']: Path(d(k, r)).name),
                  f'quick {vid}')

        edited = [sid for sid in v['touched'] if sid in cand.byid]

        def contain(results, cand=cand, edited=edited, dir_of=dir_of, keys=keys, cplan=cplan, vid=vid):
            worst_all, rows = {'max': 0.0, 'region': None, 'excess': 0.0, 'step': None}, []
            for sid in edited:
                s = cand.byid[sid]
                ref = s['inputs']['base' if 'base' in s['inputs'] else next(iter(s['inputs']))]
                out_dir = Path(dir_of(sid, results)).name
                report = rc.compute_containment(cand, s, out_dir, dir_of(ref, results), zones, species)
                reference, note = rc.containment_reference(cand, s, zones, species)
                rc.apply_reference(report, reference, note)
                (run_dir/f'contain-{vid}-{sid}.json').write_bytes((json.dumps(report, indent=1)+'\n').encode('utf-8'))
                worst = max(report['foreign'].items(), key=lambda kv: kv[1]['max'], default=(None, {'max': 0.0}))
                excess = max([0.0]+[e['max']-max(sw.CONTAIN_TOL, e['allowance']) for e in report['foreign'].values()])
                rows.append({'step': sid, 'max': worst[1]['max'], 'region': worst[0], 'excess': round(excess, 5),
                             'relativeFlagged': report['verdict']['relative']})
                if excess > worst_all['excess'] or (worst_all['step'] is None):
                    worst_all = {'max': worst[1]['max'], 'region': worst[0], 'excess': round(excess, 5), 'step': sid}
            return {'worst': worst_all, 'steps': rows, 'seconds': 0.0}
        sched.add(('contain', vid), [keys[sid] for sid in edited if not cplan[sid]['dir']], contain, f'{vid} contain')

        def score(results, vid=vid, name=v['name']):
            quick, contained = results[('quick', vid)], results[('contain', vid)]
            with measure_lock:
                base_quick = results[('quick', 'baseline')]
                bt = measurer.measure(base_quick['dir'])
                terms = measurer.measure(quick['dir'], base_quick['dir'])
            terms['criteria'] = crit_of(quick)
            crit_of(base_quick)
            total, _ = sw.total_score({**terms, 'toolScore': None}, bt, contained['worst']['excess'])
            rc.say(f"{vid} {name}: fit {terms['fitIou']} (base {bt['fitIou']}) stations {terms['stationDiff']} "
                   f"contain {contained['worst']['max']} {contained['worst']['region'] or ''} total {total:+.2f} (before tool score)")
            return {'terms': terms, 'seconds': 0.0}
        sched.add(('score', vid), [('quick', vid), ('contain', vid), ('quick', 'baseline')], score, f'{vid} score')

    began = time.time()
    results, errors = sched.run()
    scoring_seconds = round(time.time()-began, 1)

    base_quick = results.get(('quick', 'baseline'))
    if not base_quick:
        rc.fail(f"baseline quick failed: {errors.get(('quick', 'baseline'))}")
    base_terms = measurer.measure(base_quick['dir'])

    # the tool score is read from the first edited step whose output records a sweepScore
    def tool_of(v):
        for sid in v['touched']:
            if sid not in v['_cand'].byid:
                continue
            ref = v['_plan'][sid]['dir'] or (results.get(v['_keys'][sid]) or {}).get('dir')
            record = sw.tool_record(work/ref) if ref else None
            if record:
                return sid, record
        return None, None
    tool_by_step = {}
    for v in live:
        if all(k not in errors for k in (('score', v['id']),)):
            sid, record = tool_of(v)
            if record:
                tool_by_step.setdefault(sid, []).append(record[0])
    tool_ref = {}
    for sid, scores in tool_by_step.items():
        # the baseline's own output of the step (cached or existing); the worst variant only when the base lacks the step,
        # since a reference taken from the variants credits every variant for not being the worst (round 21, B-20T)
        existing = (base_plan.get(sid) or {}).get('dir') or (base.byid[sid].get('existing') if sid in base.byid else None)
        record = sw.tool_record(work/existing) if existing else None
        tool_ref[sid] = record[0] if record else min(scores)
        if not record:
            rc.say(f'tool score of {sid}: the base has no output of it; reference is the lowest variant score')

    for v in variants:
        vid = v['id']
        if 'error' in v:
            v['total'] = None
            continue
        bad = [errors[k] for k in [*v['_keys'].values(), ('quick', vid), ('contain', vid), ('score', vid)] if k in errors]
        if bad:
            v['error'] = bad[0]
            v['total'] = None
            continue
        quick, contained = results[('quick', vid)], results[('contain', vid)]
        terms = results[('score', vid)]['terms']
        sid, record = tool_of(v)
        terms = {**terms, 'containMax': contained['worst']['max'], 'containRegion': contained['worst']['region'],
                 'containExcess': contained['worst']['excess'], 'toolScore': record[0] if record else None,
                 'toolStep': sid if record else None}
        parts_total, parts = sw.total_score(terms, base_terms, contained['worst']['excess'], tool_ref.get(sid) if record else None)
        if surface_stats is not None and hasattr(surface_stats, 'plan_terms'):
            try:  # optional hook from the surface statistics module: {'score': float (higher is better), ...}
                extra = surface_stats.plan_terms(variant=quick, baseline=base_quick['dir'], region=region, zone=zone)
                terms['surface'] = extra
                if isinstance(extra, dict) and isinstance(extra.get('score'), (int, float)):
                    parts['surface'] = round(float(extra['score']), 3)
                    parts_total = round(parts_total+parts['surface'], 3)
            except Exception as error:
                terms['surface'] = {'error': str(error)}
        base_crit = crit_cache.get(base_quick['dir']) or {}
        estimate = {}
        for cid, c in (terms.get('criteria') or {}).items():
            b, p0 = base_crit.get(cid), packet_measured.get(cid)
            if c.get('value') is None or not b or b.get('value') is None:
                continue
            # the packet's baseline value moved by the quick change: quick renders carry a constant offset for some rows
            ref = p0 if p0 and isinstance(p0.get('value'), (int, float)) else b
            value = ref['value']+(c['value']-b['value'])
            ok = c.get('min', None) is None or value >= c['min']
            ok = ok and (c.get('max', None) is None or value <= c['max'])
            estimate[cid] = {**c, 'value': round(value, 5), 'result': 'pass' if ok else 'fail'}
        base_est = {cid: (packet_measured[cid] if cid in packet_measured and isinstance(packet_measured[cid].get('value'), (int, float))
                          else base_crit[cid]) for cid in estimate}
        points, detail = qc.progress(base_est, estimate)
        parts['progress'] = points
        parts_total = round(parts_total+points, 3)
        terms['progress'] = detail
        near_noop = not detail['moved'] and (terms.get('silhouetteChange') or 0) < .0005
        v.update(built=True, terms=terms, parts=parts, total=parts_total, quick=quick['dir'], nearNoop=near_noop,
                 head=quick['head'], body=quick['body'], contain=contained['steps'],
                 noop=(quick['head'] == base_quick['head'] and quick['body'] == base_quick['body']))
        v['rebuilt'] = {sid: results[v['_keys'][sid]]['dir'] for sid in v['_cand'].byid
                        if not v['_plan'][sid]['dir'] and v['_keys'][sid] in results}
    # a variant that moves no criterion of the order and no silhouette shows readers a copy of the baseline: rank it last
    ranked = sorted((v for v in variants if v.get('total') is not None), key=lambda v: (bool(v.get('nearNoop') or v.get('noop')), -v['total']))
    for k, v in enumerate(ranked, 1):
        v['rank'] = k
    chosen = choose_candidates(ranked, top, bool(plan.get('start')), rc.say)

    # the full candidate path for the top K, in parallel up to the slot limit
    def candidate(v):
        asm = f'assembled-{reserve(rc)}'
        cmd = [sys.executable, str(HERE/'recipe.py'), 'candidate', v['recipe'], '--baseline', str(baseline_packet), '--region', region,
               '--base', str(base.path), '--assembly-name', asm]
        rc.say(f"candidate {v['id']} #{v['rank']} -> {asm}")
        proc = _run(cmd, cwd=rc.ROOT, capture_output=True, text=True)
        summary = None
        for line in reversed(proc.stdout.splitlines()):
            if line.startswith('{'):
                try:
                    summary = json.loads(line)
                    break
                except ValueError:
                    continue
        if summary is None:
            tail = (proc.stdout+proc.stderr).strip().splitlines()[-6:]
            summary = {'ok': False, 'stage': 'start', 'failure': ' / '.join(tail) or 'no output', 'assembly': asm}
        rc.say(f"candidate {v['id']}: {'ok' if summary.get('ok') else 'FAILED at '+str(summary.get('stage'))} {summary.get('verdict') or summary.get('failure', '')}"[:260])
        return v, summary
    top_entries = []
    if chosen:
        with ThreadPoolExecutor(max_workers=min(slots, len(chosen))) as pool:
            for v, summary in pool.map(candidate, chosen):
                top_entries.append({'rank': v['rank'], 'id': v['id'], 'name': v['name'], 'recipe': v['recipe'],
                                    'ok': bool(summary.get('ok')), 'stage': summary.get('stage'), 'failure': summary.get('failure'),
                                    'assembly': summary.get('assembly'), 'packet': summary.get('packet'),
                                    'check': summary.get('check'), 'measuredChanged': summary.get('measuredChanged'),
                                    'measuredFailing': summary.get('measuredFailing'), 'seamsNew': summary.get('seamsNew'),
                                    'containment': {sid: {'flaggedRelative': c.get('flaggedRelative'), 'worst': c.get('worst'), 'error': c.get('error')}
                                                    for sid, c in (summary.get('containment') or {}).items()},
                                    'regionChange': summary.get('regionChange'), 'verdict': summary.get('verdict'),
                                    'wallMinutes': summary.get('wallMinutes')})
    top_entries.sort(key=lambda e: e['rank'])

    # contact sheet
    base_t = base_terms
    rows = [([f'baseline {base_body}', f"iou {base_t['fitIou']}  stn {base_t['stationDiff']}"], base_quick['dir'])]
    for v in sorted(variants, key=lambda v: (v.get('rank') is None, v.get('rank') or 0, v['id'])):
        if v.get('built'):
            t = v['terms']
            rows.append(([f"#{v['rank']} {v['id']}  total {v['total']:+.2f}", v['name'][:40], f"iou {t['fitIou']}  stn {t['stationDiff']}",
                          f"contain {t['containMax']} ({t['containRegion']})"], v['quick']))
    png = run_dir/'plan-result.png'
    size = compose_sheet(rc, sw, region, zone, species, rows, [e for e in top_entries if e.get('packet') and Path(e['packet']).is_dir()],
                         baseline_packet, png)

    wall_minutes = round((time.time()-started)/60, 1)
    result = {
        'schemaVersion': 1, 'plan': str(plan['_path']), 'runFolder': str(run_dir), 'order': plan.get('order'), 'region': region,
        'base': str(base.path), 'baselinePacket': str(baseline_packet), 'startNotes': notes, 'top': top_entries,
        'baseline': {'head': base_head, 'body': base_body, 'quick': base_quick['dir'], 'terms': base_terms},
        'variants': [{k: v[k] for k in ('id', 'name', 'why', 'source', 'edits', 'built', 'error', 'recipe', 'warnings', 'changedSteps',
                                        'total', 'parts', 'terms', 'rank', 'noop', 'nearNoop', 'rebuilt', 'contain', 'quick', 'head', 'body') if k in v}
                     for v in variants],
        'scoringSeconds': scoring_seconds, 'wallMinutes': wall_minutes, 'surfaceStats': surface_stats is not None,
        'created': datetime.datetime.now().isoformat(timespec='seconds')}
    text = json.dumps(result, indent=1)+'\n'
    plan_path = plan['_path']
    stem = '' if plan_path.stem == 'plan' else plan_path.stem+'-'
    beside_json, beside_png = plan_path.with_name(f'{stem}plan-result.json'), plan_path.with_name(f'{stem}plan-result.png')
    result['resultFiles'] = [str(beside_json), str(beside_png)]
    text = json.dumps(result, indent=1)+'\n'
    for target in (run_dir/'plan-result.json', beside_json):
        target.write_bytes(text.encode('utf-8'))
    shutil.copyfile(png, beside_png)

    compact = {
        'wallMinutes': wall_minutes, 'resultFiles': result['resultFiles'], 'sheet': size,
        'variants': [{'id': v['id'], 'name': v['name'][:48], 'built': bool(v.get('built')), 'rank': v.get('rank'), 'total': v.get('total'),
                      **({'parts': v['parts']} if v.get('built') else {'error': (v.get('error') or '').splitlines()[0][:160] if v.get('error') else None}),
                      **({'noop': True} if v.get('noop') else {}), **({'nearNoop': True} if v.get('nearNoop') else {}),
                      **({'progress': v['terms']['progress']['rows']} if v.get('built') and v['terms'].get('progress') else {})} for v in variants],
        'top': [{'rank': e['rank'], 'id': e['id'], 'ok': e['ok'], 'assembly': e['assembly'], 'packet': e['packet'],
                 'check': (e['check'] or {}).get('pass') if e['check'] else None, 'failure': e['failure'],
                 'measuredChanged': [f"{c['id']} {c['before']}->{c['after']} {c['result'][0]}->{c['result'][1]}" for c in (e['measuredChanged'] or [])],
                 'seamsNew': [f"{s['joint']}/{s['view']} {s['kind']}" for s in (e['seamsNew'] or [])],
                 'containment': {sid: c['flaggedRelative'] for sid, c in e['containment'].items()}, 'verdict': e['verdict']} for e in top_entries]}
    print(json.dumps(compact, separators=(',', ':')), flush=True)
    return result
