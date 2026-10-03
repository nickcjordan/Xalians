"""A creature is a replayable recipe: pinned roots, a DAG of build steps, one assembly.

  python art/species-construction/loop/recipe.py build <recipe.json> [--assembly NAME] [--from STEP] [--no-cache] [--dry-run] [--allow-changed]
  python art/species-construction/loop/recipe.py status <recipe.json>
  python art/species-construction/loop/recipe.py pin <recipe.json> [--write]
  python art/species-construction/loop/recipe.py minutes <recipe.json> [--write]
  python art/species-construction/loop/recipe.py seed <recipe.json> [--write-expect] [--loose]
  python art/species-construction/loop/recipe.py set <recipe.json> <out.json> <step id> <arg> <value> [<arg> <value> ...]
  python art/species-construction/loop/recipe.py add <recipe.json> <out.json> --after <step id> --step <step.json> [--rewire STEP:INPUT ...]
  python art/species-construction/loop/recipe.py rebase [<old base>] <new base> <candidate> <out> [--live]
  python art/species-construction/loop/recipe.py merge <base.json> <a.json> <b.json> <out.json>
  python art/species-construction/loop/recipe.py verify <recipe.json> [--no-cache] [--no-packet]
  python art/species-construction/loop/recipe.py contain <recipe.json> <step id> [--out-dir NAME] [--zones FILE] [--no-reference]
  python art/species-construction/loop/recipe.py sweep <recipe.json> --step <id> --grid <arg>=<v1>,<v2> [--grid ...] [--variants file.json] [--max 12] [--region Rxx] [--out NAME]
  python art/species-construction/loop/recipe.py run-plan <plan.json> [--top K] [--dry-run]

See RECIPE.md beside this file for the format, the cache key and how orders edit a recipe.
Output directories are immutable: every build writes into a new head-NNNN, body-NNNN or assembled-NNNN name.
"""
import argparse
import copy
import datetime
import json
import os
import re
import subprocess
import sys
import threading
import time
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import recipe_steps as rs  # noqa: E402

# No console window for child processes on Windows: a detached plan job has no console, so
# every child would otherwise open its own window. Output is captured or logged already.
_NO_WINDOW = {'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}


def _run(*a, **k):
    return subprocess.run(*a, **{**_NO_WINDOW, **k})


ROOT = rs.ROOT
LOOP_TOOLS = HERE/'loop_tools.py'
ASSEMBLER = 'art/species-construction/assemble_reconstructed_creature.py'
DEFAULT_JOIN = {'head-scale': .5, 'jaw-anchor-z': .5, 'head-depth-offset': -.02}
BOUNDS_TOLERANCE_HEIGHTS = 1e-4
FIGURE_HEIGHT = 1.8605
NUMBER = re.compile(r'^[a-z-]+-(\d{4})')
LOCK = threading.RLock()
FLAT_ALLOWANCE = .002     # figure heights of foreign displacement that is always tolerated (the remesh noise floor)
REFERENCE_FACTOR = 1.5    # a foreign region may move 1.5 x as far as the baseline version of the step moved it
BLENDER_SLOTS = 2


def say(text):
    print(f'[{datetime.datetime.now():%H:%M:%S}] {text}', flush=True)


def fail(text):
    sys.exit(f'recipe: {text}')


# ---------------------------------------------------------------- recipe model

class Recipe:
    def __init__(self, path):
        self.path = Path(path).resolve()
        self.data = json.loads(self.path.read_text(encoding='utf-8'))
        if self.data.get('schemaVersion') != 1:
            fail(f'{path}: schemaVersion must be 1')
        self.species = self.data['species']
        self.work = ROOT/'untracked/species-construction'/self.species
        self.roots = self.data['roots']
        self.steps = self.data['steps']
        self.byid = {s['id']: s for s in self.steps}
        if len(self.byid) != len(self.steps):
            fail('duplicate step ids')
        self.assembly = self.data['assembly']
        self.order = self._order()

    def _order(self):
        """Dependency order, listing order wins ties."""
        done, order, pending = set(self.roots), [], list(self.steps)
        while pending:
            for step in pending:
                refs = list(step['inputs'].values())
                missing = [r for r in refs if r not in self.roots and r not in self.byid]
                if missing:
                    fail(f"step {step['id']}: unknown input {missing}")
                if all(r in done for r in refs):
                    order.append(step)
                    done.add(step['id'])
                    pending.remove(step)
                    break
            else:
                fail('cycle among steps '+', '.join(s['id'] for s in pending))
        for sink in ('head', 'body'):
            if self.assembly[sink] not in self.byid:
                fail(f'assembly {sink} {self.assembly[sink]} is not a step')
        return order

    def descendants(self, step_id):
        out, grew = {step_id}, True
        while grew:
            grew = False
            for s in self.steps:
                if s['id'] not in out and any(r in out for r in s['inputs'].values()):
                    out.add(s['id'])
                    grew = True
        return out


def dump(data, path, like=None):
    """Write a recipe. With like (an existing file), keep that file's layout when it is plain json.dumps(indent=1), so
    rewriting a recipe in place changes only the lines that changed; otherwise the recipe layout (one flag per line)."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    if like and Path(like).is_file():
        text = Path(like).read_bytes().decode('utf-8')
        body = text.rstrip('\n')
        if '\r' not in text and body == json.dumps(json.loads(text), indent=1):
            Path(path).write_bytes((json.dumps(data, indent=1)+text[len(body):]).encode('utf-8'))
            return
    Path(path).write_bytes((rs.dump_recipe(data)+'\n').encode('utf-8'))


# ---------------------------------------------------------------- keys

def root_key(name, root):
    return rs.sha256_bytes(json.dumps({'root': name, 'dir': root['dir'], 'files': root['files']}, sort_keys=True).encode())


def step_key(step, input_keys):
    argv = [a.replace('{repo}', '.') for a in step['args']]
    files = {}
    for a in step['args']:
        if a.startswith('{repo}/') and (ROOT/a[len('{repo}/'):]).is_file():
            files[a] = rs.file_hash(ROOT/a[len('{repo}/'):])
        elif a[:1] not in ('{', '-') and Path(a).is_absolute() and Path(a).is_file():
            files[a] = rs.file_hash(a)  # an absolute path outside the repository (a candidate's own spec)
    payload = {'v': 1, 'runner': step.get('runner', 'blender'), 'closure': rs.closure_hash(step['script']),
               'args': argv, 'inputs': input_keys, 'argFiles': files}
    return rs.sha256_bytes(json.dumps(payload, sort_keys=True).encode())


def assembly_key(recipe, keys):
    asm = recipe.assembly
    payload = {'v': 1, 'head': keys[asm['head']], 'body': keys[asm['body']], 'args': asm.get('args', []),
               'closure': rs.closure_hash(ASSEMBLER)}
    return rs.sha256_bytes(json.dumps(payload, sort_keys=True).encode())


def compute_keys(recipe):
    keys = {name: root_key(name, root) for name, root in recipe.roots.items()}
    for step in recipe.order:
        keys[step['id']] = step_key(step, {n: keys[r] for n, r in step['inputs'].items()})
    keys['assembly'] = assembly_key(recipe, keys)
    return keys


# ---------------------------------------------------------------- cache

class Cache:
    def __init__(self, recipe):
        self.path = recipe.work/'recipe-cache.json'
        self.work = recipe.work

    def _load(self):
        if self.path.is_file():
            return json.loads(self.path.read_text(encoding='utf-8'))
        return {'schemaVersion': 1, 'steps': {}, 'assemblies': {}}

    def get(self, kind, key):
        entry = self._load()[kind].get(key)
        if entry and (self.work/entry['dir']).is_dir():
            return entry
        return None

    def put(self, kind, key, entry):
        with LOCK:
            data = self._load()  # reread: another process may have written since
            data[kind][key] = entry
            tmp = self.path.with_suffix('.tmp')
            tmp.write_text(json.dumps(data, indent=1, sort_keys=True)+'\n', encoding='utf-8')
            os.replace(tmp, self.path)


class Namer:
    """Fresh output names from the same counter as loop_tools next-number. A reservation marker file
    (<name>.reserved, matched by next-number's pattern) keeps a concurrent agent off a number whose
    directory the running step has not created yet."""
    def __init__(self, work):
        self.work = work

    def _highest(self):
        return max([int(m.group(1)) for p in self.work.iterdir() if (m := NUMBER.match(p.name))] or [0])

    def take(self, prefix):
        with LOCK:
            name = f'{prefix}-{self._highest()+1:04d}'
            (self.work/f'{name}.reserved').write_text(str(os.getpid()))
            return name

    def release(self, name):
        (self.work/f'{name}.reserved').unlink(missing_ok=True)


# ---------------------------------------------------------------- planning

def pin_state(recipe):
    """{step id or 'assembly': {'changed': [(key, 'CHANGED'|'MISSING')], 'unpinned': [key]}}: each step's recorded `pins`
    against the files it reads now. A step with no `pins` map has every file unpinned."""
    def state(files, pins):
        bad = rs.check_pins(pins, files)
        return {'changed': [(k, s) for k, s in bad if s != 'UNPINNED'], 'unpinned': [k for k, s in bad if s == 'UNPINNED']}
    out = {s['id']: state(rs.read_files(s['script'], s['args']), s.get('pins')) for s in recipe.order}
    out['assembly'] = state(rs.read_files(ASSEMBLER, []), recipe.assembly.get('pins'))
    return out


def seeded_mismatch(recipe, step, entry, dirs):
    """[(file key, 'DIFFERS' | 'LOOSE')] for a cache entry that came from `seed` (not from a build of this key): the files the
    step reads now against the bytes its output recorded. A hit that failed this is a mapping seed should never have made."""
    if entry.get('loose'):
        return [(step['script'], 'LOOSE')]
    analysis = analyze_files(step['script'], step['args'], recipe.work/entry['dir'], input_dirs(recipe, step, dirs), recipe.work)
    return [(k, 'DIFFERS') for k, v in analysis.items() if v['status'] == 'differs']


def make_plan(recipe, cache, force_from=None, no_cache=False):
    """The build plan. A step is not a cache hit when a pinned input changed (CHANGED), when its seeded output was built from
    other bytes than the step reads now (DIFFERS), or when anything upstream of it is not a hit."""
    keys = compute_keys(recipe)
    if force_from and force_from not in recipe.byid:
        fail(f'--from {force_from}: no such step')
    forced = set(recipe.byid) if no_cache else (recipe.descendants(force_from) if force_from else set())
    pins = pin_state(recipe)
    plan, blocked, dirs = {}, set(), {}
    for step in recipe.order:
        sid = step['id']
        reasons = list(pins[sid]['changed'])
        upstream = any(r in blocked for r in step['inputs'].values())
        hit = None
        if sid not in forced and not reasons and not upstream:
            hit = cache.get('steps', keys[sid])
            if hit and (hit.get('seeded') or hit.get('loose')):
                reasons = seeded_mismatch(recipe, step, hit, dirs)
                hit = None if reasons else hit
        if reasons or upstream:
            blocked.add(sid)
        if hit:
            dirs[sid] = recipe.work/hit['dir']
        plan[sid] = {'key': keys[sid], 'dir': hit['dir'] if hit else None, 'changed': reasons,
                     'unpinned': pins[sid]['unpinned'], 'upstreamChanged': upstream}
    rebuilt_head_or_body = any(plan[recipe.assembly[s]]['dir'] is None for s in ('head', 'body'))
    asm_changed = list(pins['assembly']['changed'])
    asm_hit = None
    if not (no_cache or rebuilt_head_or_body or asm_changed):
        asm_hit = cache.get('assemblies', keys['assembly'])
        if asm_hit and (asm_hit.get('seeded') or asm_hit.get('loose')):
            analysis = analyze_files(ASSEMBLER, [], recipe.work/asm_hit['dir'], {}, recipe.work)
            asm_changed = [(k, 'DIFFERS') for k, v in analysis.items() if v['status'] == 'differs'] or (
                [(ASSEMBLER, 'LOOSE')] if asm_hit.get('loose') else [])
            asm_hit = None if asm_changed else asm_hit
    plan['assembly'] = {'key': keys['assembly'], 'dir': asm_hit['dir'] if asm_hit else None, 'changed': asm_changed,
                        'unpinned': pins['assembly']['unpinned'], 'upstreamChanged': False}
    return plan, keys


def plan_changed(plan):
    """[(step id, file key, state)] for every pinned input whose bytes changed."""
    return [(sid, key, state) for sid, entry in plan.items() for key, state in entry['changed']]


def step_minutes(recipe, cache, step_id):
    """Recorded build minutes of a step (`minutes`), else the seconds of the newest cache entry that built it, else None."""
    holder = recipe.assembly if step_id == 'assembly' else recipe.byid[step_id]
    if holder.get('minutes') is not None:
        return float(holder['minutes'])
    kind = 'assemblies' if step_id == 'assembly' else 'steps'
    entries = [e for e in cache._load()[kind].values()
               if (kind == 'assemblies' or e.get('step') == step_id) and e.get('seconds') and not e.get('seeded')]
    entries.sort(key=lambda e: e.get('built', ''))
    return entries[-1]['seconds']/60 if entries else None


def estimate(recipe, cache, plan, slots=BLENDER_SLOTS):
    """Minutes the plan's rebuilds would take: the serial sum and the wall time of a greedy schedule on `slots` Blender
    slots in dependency order, then the assembly. `unknown` lists rebuilt steps with no recorded or measured time."""
    todo = [s for s in recipe.order if not plan[s['id']]['dir']]
    mins = {s['id']: step_minutes(recipe, cache, s['id']) for s in todo}
    unknown = [sid for sid, m in mins.items() if m is None]
    free, finish = [0.0]*slots, {}
    for s in todo:
        ready = max([finish[r] for r in s['inputs'].values() if r in finish] or [0.0])
        k = min(range(slots), key=lambda i: free[i])
        start = max(free[k], ready)
        finish[s['id']] = free[k] = start+(mins[s['id']] or 0.0)
    wall = max(finish.values(), default=0.0)
    serial = sum(m for m in mins.values() if m)
    asm = None
    if not plan['assembly']['dir']:
        asm = step_minutes(recipe, cache, 'assembly')
        if asm is None:
            unknown.append('assembly')
        else:
            wall += asm
            serial += asm
    return {'steps': mins, 'serialMinutes': round(serial, 1), 'wallMinutes': round(wall, 1), 'assemblyMinutes': asm,
            'unknown': unknown}


def print_plan(recipe, plan, cache=None):
    rows = [(s['id'], plan[s['id']]) for s in recipe.order]+[('assembly', plan['assembly'])]
    width = max(len(r[0]) for r in rows)
    for sid, entry in rows:
        state = entry['dir'] or '-> build'
        notes = [f'{s} {k}' for k, s in entry['changed']]
        if entry.get('upstreamChanged'):
            notes.append('upstream pinned input changed')
        if not entry['dir'] and cache is not None:
            m = step_minutes(recipe, cache, sid)
            notes.append(f'~{m:.1f} min' if m is not None else '~? min')
        if entry['unpinned']:
            notes.append(f"{len(entry['unpinned'])} unpinned")
        print(f"  {sid:<{width}}  {entry['key'][:12]}  {state}"+(f"  [{'; '.join(notes)}]" if notes else ''))
    todo = [sid for sid, entry in rows if not entry['dir']]
    print('builds: '+(', '.join(todo) if todo else 'nothing'))
    if todo and cache is not None:
        est = estimate(recipe, cache, plan)
        text = (f"estimated rebuild: about {est['wallMinutes']} min wall on {BLENDER_SLOTS} slots "
                f"({est['serialMinutes']} min serial)")
        if est['unknown']:
            text += f"; no recorded time for {', '.join(est['unknown'])}"
        print(text)


# ---------------------------------------------------------------- running steps

def resolve(arg, inputs, out):
    for name, path in inputs.items():
        arg = arg.replace('{'+name+'}', path.as_posix())
    return arg.replace('{repo}', ROOT.as_posix()).replace('{out}', out.as_posix())


def species_flags(recipe):
    return [] if recipe.species == 'akinza' else ['--species', recipe.species]


def run_step(recipe, step, input_dirs, name):
    out = recipe.work/name
    argv = [resolve(a, input_dirs, out) for a in step['args']]
    runner = step.get('runner', 'blender')
    if runner == 'blender':
        cmd = [sys.executable, str(LOOP_TOOLS), 'blender', *species_flags(recipe), '--log', name, step['script'], *argv]
    elif runner == 'python':
        cmd = [sys.executable, str(ROOT/step['script']), *argv]
    else:
        fail(f"step {step['id']}: runner {runner!r} is not supported here (blender-wsl steps belong to run_rebuild.py)")
    started = time.time()
    result = _run(cmd, cwd=ROOT, capture_output=True, text=True)
    if result.returncode or not out.is_dir():
        lines = (result.stdout+result.stderr).splitlines()
        tail = '\n'.join(lines[-25:])
        # the cause first: round 23's plan reported two geometry check failures as "Blender quit"
        cause = next((x.strip() for x in reversed(lines) if 'Error' in x and ':' in x), None)
        fail(f"step {step['id']} failed ({name})" + (f': {cause}' if cause else '') + f"; log {recipe.work/(name+'.log')}\n{tail}")
    return round(time.time()-started, 1)


def assemble(recipe, head_dir, body_dir, name):
    """loop_tools assemble; the recipe's assembly args become a --join JSON unless they equal the defaults."""
    args = recipe.assembly.get('args', [])
    pairs = {args[k].lstrip('-'): args[k+1] for k in range(0, len(args), 2)}
    numeric = {k: float(v) for k, v in pairs.items()}
    cmd = [sys.executable, str(LOOP_TOOLS), 'assemble', *species_flags(recipe), head_dir, body_dir, name]
    if any(abs(DEFAULT_JOIN[k]-v) > 1e-12 if k in DEFAULT_JOIN else True for k, v in numeric.items()):
        if "'--join'" not in LOOP_TOOLS.read_text(encoding='utf-8'):
            fail('the assembly args differ from the defaults and loop_tools.py assemble has no --join option yet')
        tmp = recipe.work/'recipe-tmp'
        tmp.mkdir(exist_ok=True)
        join = tmp/f'join-{name}.json'
        join.write_bytes((json.dumps(numeric, indent=1)+'\n').encode('utf-8'))
        cmd += ['--join', str(join)]
    started = time.time()
    result = _run(cmd, cwd=ROOT, capture_output=True, text=True)
    out = recipe.work/name
    if result.returncode or not (out/'assembly.json').is_file():
        tail = '\n'.join((result.stdout+result.stderr).splitlines()[-25:])
        fail(f'assembly failed ({name})\n{tail}')
    return round(time.time()-started, 1)


def execute(recipe, plan, keys, cache, register=True, assembly_name=None, slots=2):
    """Build every step whose plan has no directory, two at a time, then assemble. Returns the
    {step id: dir name} map and the assembly name."""
    namer = Namer(recipe.work)
    dirs = {name: recipe.work/root['dir'] for name, root in recipe.roots.items()}
    built = {}
    for step in recipe.order:
        if plan[step['id']]['dir']:
            dirs[step['id']] = recipe.work/plan[step['id']]['dir']
    todo = [s for s in recipe.order if not plan[s['id']]['dir']]
    running, started = {}, {}

    def task(step):
        name = namer.take(step.get('kind', 'part'))
        try:
            seconds = run_step(recipe, step, {n: dirs[r] for n, r in step['inputs'].items()}, name)
        finally:
            namer.release(name)
        return name, seconds

    with ThreadPoolExecutor(max_workers=slots) as pool:
        while todo or running:
            ready = [s for s in todo if all(r in dirs for r in s['inputs'].values())]
            for step in ready[:max(0, slots-len(running))]:
                todo.remove(step)
                say(f"start {step['id']} ({step['script'].split('/')[-1]})")
                future = pool.submit(task, step)
                running[future] = step
                started[step['id']] = time.time()
            if not running:
                fail('nothing ready to run but steps remain: '+', '.join(s['id'] for s in todo))
            finished, _ = wait(running, return_when=FIRST_COMPLETED)
            for future in finished:
                step = running.pop(future)
                try:
                    name, seconds = future.result()
                except SystemExit as error:
                    for other in running:
                        other.cancel()
                    raise error
                dirs[step['id']] = recipe.work/name
                built[step['id']] = name
                say(f"done {step['id']} -> {name} in {seconds:.0f}s")
                if register:
                    cache.put('steps', keys[step['id']], {'dir': name, 'step': step['id'], 'seconds': seconds,
                                                          'built': datetime.datetime.now().isoformat(timespec='seconds')})
    head, body = dirs[recipe.assembly['head']].name, dirs[recipe.assembly['body']].name
    if plan['assembly']['dir'] and not built:
        return built, plan['assembly']['dir'], head, body, 0
    name = assembly_name or namer.take('assembled')
    try:
        say(f'assemble {head} + {body} -> {name}')
        seconds = assemble(recipe, head, body, name)
    finally:
        namer.release(name)
    say(f'done assembly -> {name} in {seconds:.0f}s')
    if register:
        cache.put('assemblies', keys['assembly'], {'dir': name, 'head': head, 'body': body, 'seconds': seconds,
                                                   'built': datetime.datetime.now().isoformat(timespec='seconds')})
    return built, name, head, body, seconds


# ---------------------------------------------------------------- expectations

def record_summary(directory):
    """The first stage record in a step output that reports the skin: file, key and value."""
    skip = {'stage-start.json', 'fairing.json', 'containment.json'}
    for path in sorted(Path(directory).glob('*.json')):
        if path.name in skip:
            continue
        try:
            doc = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            continue
        for key in ('skinAfter', 'body'):
            if isinstance(doc.get(key), dict) and 'vertices' in doc[key]:
                return {'file': path.name, 'key': key, 'value': doc[key]}
    return None


def measure_output(directory):
    stats = rs.glb_stats(Path(directory)/'shape.glb')
    record = record_summary(directory)
    return {**stats, **({'record': record} if record else {})}


def compare_expect(expect, directory, tolerance=None):
    """Differences between a step's expect block and the directory it describes (empty = match)."""
    tolerance = tolerance if tolerance is not None else BOUNDS_TOLERANCE_HEIGHTS*FIGURE_HEIGHT
    got = measure_output(directory)
    diffs = []
    for field in ('vertices', 'faces'):
        if field in expect and expect[field] != got[field]:
            diffs.append(f'{field} {got[field]} != expected {expect[field]}')
    if 'bounds' in expect:
        worst = max(abs(a-b) for ea, ga in zip(expect['bounds'], got['bounds']) for a, b in zip(ea, ga))
        if worst > tolerance:
            diffs.append(f'bounds differ by {worst:.6f} (tolerance {tolerance:.6f})')
        got['boundsMaxDelta'] = round(worst, 6)
    if 'record' in expect:
        want = expect['record']
        path = Path(directory)/want['file']
        value = json.loads(path.read_text(encoding='utf-8')).get(want['key']) if path.is_file() else None
        if value != want['value']:
            diffs.append(f"record {want['file']}:{want['key']} {value} != expected {want['value']}")
    return diffs, got


def assembly_summary(directory):
    directory = Path(directory)
    stats = rs.glb_stats(directory/'akinza.glb')
    record = json.loads((directory/'assembly.json').read_text(encoding='utf-8'))
    skin = next(v for k, v in record['objects'].items() if 'continuous' in k)
    return {**stats, 'record': {'file': 'assembly.json', 'skin': {k: skin[k] for k in ('components', 'nonManifoldEdges', 'vertices')}}}


# ---------------------------------------------------------------- commands

def load(path):
    return Recipe(path)


def cmd_status(args):
    recipe = load(args.recipe)
    cache = Cache(recipe)
    plan, keys = make_plan(recipe, cache)
    for name, root in recipe.roots.items():
        problems = []
        for fname, want in root['files'].items():
            path = recipe.work/root['dir']/fname
            if not path.is_file():
                problems.append(f'{fname} missing')
            elif rs.file_hash(path, normalise=False) != want:
                problems.append(f'{fname} hash differs')
        print(f"root {name}: {root['dir']} {'ok' if not problems else '; '.join(problems)}")
    print_plan(recipe, plan, cache)
    stale = [s['id'] for s in recipe.order if not plan[s['id']]['dir']]
    print(f"{len(recipe.order)-len(stale)} of {len(recipe.order)} steps cached"
          f"{'; assembly '+plan['assembly']['dir'] if plan['assembly']['dir'] else '; assembly not built'}")
    changed = plan_changed(plan)
    for sid, key, state in changed:
        why = ('a pinned input has other bytes than the pin' if state in ('CHANGED', 'MISSING')
               else 'the cached output was built from other bytes than the step reads now')
        print(f'CHANGED {key}  ({state} in {sid}: {why}; the step is not cached)')
    unpinned = sorted({sid for sid, e in plan.items() if e['unpinned']})
    if unpinned:
        print(f"unpinned inputs in {', '.join(unpinned)}; run: recipe.py pin {args.recipe} --write")
    if changed:
        sys.exit(1)


def cmd_build(args):
    recipe = load(args.recipe)
    cache = Cache(recipe)
    plan, keys = make_plan(recipe, cache, args.start, args.no_cache)
    print_plan(recipe, plan, cache)
    changed = plan_changed(plan)
    for sid, key, state in changed:
        print(f'CHANGED {key}  ({state}; pinned by {sid})')
    if changed and not args.allow_changed and not args.dry_run:
        fail('a pinned input changed after its output was built; outputs are immutable and so are the files they were built from. '
             'Copy the new bytes to a new name and point the step at it (recipe.py set R OUT STEP script <new.py> or a --spec <new.json>), '
             'or restore the pinned bytes. --allow-changed rebuilds anyway (recovery only).')
    if args.dry_run:
        if changed and not args.allow_changed:
            print('build would refuse: CHANGED inputs (see above)')
        return
    built, assembly_name, head, body, _ = execute(recipe, plan, keys, cache, assembly_name=args.assembly)
    print(json.dumps({'head': head, 'body': body, 'assembly': assembly_name}))


def script_pin(step, directory):
    """Whether the script a step names is the bytes its output's stage-start.json recorded."""
    record = Path(directory)/'stage-start.json'
    if not record.is_file():
        return 'no stage-start.json'
    sources = json.loads(record.read_text(encoding='utf-8')).get('sources', {})
    data = (ROOT/step['script']).read_bytes()
    for name, want in sources.items():
        if want == rs.sha256_bytes(rs.crlf(data)):
            return f'ok (CRLF, recorded as {name})'
        if want == rs.sha256_bytes(rs.lf(data)):
            return f'ok (LF, recorded as {name})'
        if want == rs.sha256_bytes(data):
            return f'ok (raw, recorded as {name})'
    return 'MISMATCH: no recorded source hash equals this script'


def input_coverage(recipe, step, dirs):
    """Recorded input hashes of an output that no file the recipe feeds the step matches."""
    record = Path(recipe.work/dirs[step['id']])/'stage-start.json'
    if not record.is_file():
        return None
    recorded = json.loads(record.read_text(encoding='utf-8')).get('inputs', {})
    fed = {}
    for a in step['args']:
        path = Path(resolve(a, {n: recipe.work/dirs[r] if r in dirs else recipe.work/recipe.roots[r]['dir']
                                for n, r in step['inputs'].items()}, recipe.work/'__out__'))
        if path.is_file():
            fed[path] = rs.hash_variants(path)
    missing = []
    for source, want in recorded.items():
        if not any(want in variants for variants in fed.values()):
            missing.append(Path(source.replace('\\', '/')).name+':'+want[:8])
    extra = [p.name for p, v in fed.items() if not any(w in v for w in recorded.values())]
    return {'recordedNotFed': missing, 'fedNotRecorded': extra}


def output_dirs(recipe, cache, keys):
    """{step id: Path or None}: the step's `existing` directory, else the cache entry under today's key."""
    out = {}
    for step in recipe.order:
        existing = step.get('existing')
        if existing and (recipe.work/existing).is_dir():
            out[step['id']] = recipe.work/existing
        else:
            hit = cache.get('steps', keys[step['id']])
            out[step['id']] = recipe.work/hit['dir'] if hit else None
    return out


def input_dirs(recipe, step, outs):
    """{input name: directory} of the outputs a step was fed (roots, and the output directories of earlier steps)."""
    dirs = {}
    for name, ref in step['inputs'].items():
        path = recipe.work/recipe.roots[ref]['dir'] if ref in recipe.roots else outs.get(ref)
        if path is not None:
            dirs[name] = path
    return dirs


def analyze_files(script, args, directory, fed_dirs, work):
    """How each file a step reads compares with the bytes its output recorded in stage-start.json.
    Returns {pin key: {'kind', 'status': 'ok' | 'differs' | 'unrecorded', 'wanted': [recorded sha256], 'names': [recorded names]}}.
    'differs': the file exists but its bytes are not what the run used (the recorded hash belongs to this file by name, or is
    the only recorded hash left unexplained for this kind of file); 'unrecorded': nothing to compare (no output, no record)."""
    files = rs.read_files(script, args)
    record = Path(directory)/'stage-start.json' if directory else None
    if record is None or not record.is_file():
        why = 'no output directory' if directory is None else 'no stage-start.json'
        return {k: {'kind': kind, 'status': 'unrecorded', 'wanted': [], 'names': [], 'why': why} for k, kind in files.items()}
    doc = json.loads(record.read_text(encoding='utf-8'))
    sources, inputs = doc.get('sources', {}), doc.get('inputs', {})
    variants = {k: rs.hash_variants(rs.pin_path(k)) for k in files}
    fed = [rs.hash_variants(Path(resolve(a, fed_dirs, work/'__out__'))) for a in args
           if Path(resolve(a, fed_dirs, work/'__out__')).is_file()]
    fed_all = set().union(*fed) if fed else set()
    code = {k for k, kind in files.items() if kind != 'file'}
    source_left = {n: s for n, s in sources.items() if not any(s in variants[k] for k in code)}
    input_left = {p: s for p, s in inputs.items() if s not in fed_all and not any(s in variants[k] for k in files if files[k] == 'file')}
    result = {}
    for key, kind in files.items():
        entry = {'kind': kind, 'status': 'unrecorded', 'wanted': [], 'names': []}
        base, suffix = Path(key).name, Path(key).suffix
        if kind != 'file':
            matched = [n for n, s in sources.items() if s in variants[key]]
            if matched:
                entry['status'] = 'ok'
            elif base in sources:
                entry.update(status='differs', wanted=[sources[base]], names=[base])
            elif kind == 'script' and len(source_left) == 1:
                name, sha = next(iter(source_left.items()))
                entry.update(status='differs', wanted=[sha], names=[name])
        else:
            if any(s in variants[key] for s in inputs.values()):
                entry['status'] = 'ok'
            else:
                same = {p: s for p, s in input_left.items() if Path(p.replace('\\', '/')).suffix == suffix}
                named = {p: s for p, s in same.items() if Path(p.replace('\\', '/')).name == base}
                pick = named or (same if len(same) == 1 else {})
                if pick:
                    entry.update(status='differs', wanted=sorted(set(pick.values())),
                                 names=sorted({Path(p.replace('\\', '/')).name for p in pick}))
        result[key] = entry
    return result


def freeze(key, wanted, names, write=True):
    """Write the frozen copy of the bytes a run used and return the repo-relative path, or raise RuntimeError.
    The copy sits beside the original (scripts <name>_p<sha8>.py, other files <stem>-p<sha8><ext>); an existing copy
    with the same name is reused after its hash is checked. With write=False nothing is written (the report only)."""
    paths = [key] if not Path(key).is_absolute() else []
    paths += rs.history_paths_named(ROOT, {Path(key).name, *names})
    found = rs.find_in_history(ROOT, list(dict.fromkeys(paths)), set(wanted))
    if not found:
        raise RuntimeError('no commit of any ref ever held those bytes (the file lived only in the data directory); '
                           'commit a copy of the run-time bytes by hand under a versioned name')
    data, from_path, commit = found
    text = Path(key).suffix.lower() in rs.TEXT_SUFFIXES
    body = rs.lf(data) if text else data
    sha = rs.sha256_bytes(body)
    target = rs.frozen_name(rs.pin_path(key), sha)
    if target.is_file():
        if rs.file_hash(target) != sha:
            raise RuntimeError(f'{target} exists with other bytes')
    elif write:
        target.write_bytes(body)
    return rs.pin_key(target), f'{from_path}@{commit[:8]}'


def pin_step(label, holder, script, args, directory, fed_dirs, work, write, report):
    """Pin one step (or the assembly): freeze and repoint what differs, then record `pins` from the bytes it will read.
    Returns the list of problems that stay open."""
    open_problems = []
    analysis = analyze_files(script, args, directory, fed_dirs, work)
    repointed = False
    gone = {k for k, s in rs.check_pins(holder.get('pins')) if s in ('CHANGED', 'MISSING')}
    for key, res in analysis.items():
        if res['status'] == 'unrecorded':
            report.append(f"  {label}: {key} unverified ({res.get('why', 'not in the output record')})")
            if key in gone:
                open_problems.append(f'{label}: {key} changed since it was pinned and there is no output record to say which bytes the '
                                     'step used; restore the pinned bytes or copy the new ones to a new name')
        elif res['status'] == 'ok' and key in gone:
            report.append(f'  {label}: {key} differs from its recorded pin but equals what the output used; the pin is re-recorded')
        elif res['status'] == 'differs':
            if res['kind'] == 'module' or (label == 'assembly' and res['kind'] == 'script'):
                open_problems.append(f"{label}: {key} is not the bytes the output used and cannot be repointed ({res['kind']}"
                                     f"{' read by the assembler' if label == 'assembly' else ' imported by the step script'}); "
                                     'restore the run-time bytes or accept the drift by hand')
                continue
            try:
                new_key, source = freeze(key, res['wanted'], res['names'], write)
            except RuntimeError as error:
                open_problems.append(f'{label}: {key}: {error}')
                continue
            report.append(f"  {label}: {key} differs from the bytes the output used; {'frozen copy' if write else 'would freeze'} {new_key} (from {source})")
            if write:
                if res['kind'] == 'script':
                    holder['script'] = new_key
                    script = new_key
                else:
                    position = rs.arg_files(args)[key]
                    token = args[position]
                    args[position] = ('{repo}/'+new_key) if token.startswith('{repo}/') else str(rs.pin_path(new_key))
                repointed = True
            else:
                open_problems.append(f'{label}: {key} would be repointed to {new_key}')
    if write:
        holder['pins'] = rs.pins_now(script, args)
    return open_problems, repointed


def cmd_pin(args):
    recipe = load(args.recipe)
    cache = Cache(recipe)
    keys = compute_keys(recipe)
    outs = output_dirs(recipe, cache, keys)
    report, problems, repointed, pending = [], [], [], 0
    data = copy.deepcopy(recipe.data)
    by = {s['id']: s for s in data['steps']}
    for step in recipe.order:
        holder = by[step['id']]
        fed = input_dirs(recipe, step, outs)
        before = dict(holder.get('pins') or {})
        open_, moved = pin_step(step['id'], holder, holder['script'], holder['args'], outs[step['id']], fed, recipe.work, args.write, report)
        problems += open_
        if moved:
            repointed.append(step['id'])
        now = rs.pins_now(holder['script'], holder['args'])
        if before != now:
            pending += 1
            report.append(f"  {step['id']}: {len(now)} pins "+('written' if args.write and not open_ else 'to write'))
    asm_holder = data['assembly']
    asm_dir = None
    if recipe.assembly.get('existing') and (recipe.work/recipe.assembly['existing']).is_dir():
        asm_dir = recipe.work/recipe.assembly['existing']
    else:
        hit = cache.get('assemblies', keys['assembly'])
        asm_dir = recipe.work/hit['dir'] if hit else None
    before = dict(asm_holder.get('pins') or {})
    open_, _ = pin_step('assembly', asm_holder, ASSEMBLER, [], asm_dir, {}, recipe.work, args.write, report)
    problems += open_
    now = rs.pins_now(ASSEMBLER, [])
    if before != now:
        pending += 1
        report.append(f"  assembly: {len(now)} pins "+('written' if args.write and not open_ else 'to write'))
    for line in report:
        print(line)
    for line in problems:
        print('OPEN '+line)
    todo = bool(pending or problems)
    if args.write:
        if problems:
            print(f'not writing {recipe.path}: {len(problems)} problem(s) above')
            sys.exit(1)
        if data != recipe.data:
            dump(data, recipe.path, like=recipe.path)
            say(f'wrote pins into {recipe.path}')
            if repointed:
                say('steps were repointed; re-mapping their keys to the existing outputs (strict seed)')
                seed_args = argparse.Namespace(recipe=str(recipe.path), write_expect=False, loose=False, strict=True)
                cmd_seed(seed_args)
        else:
            print('nothing to pin')
        return
    print(('pin: nothing to pin' if not todo else f'pin: work to do ({len(problems)} open problem(s)); run with --write'))
    if todo:
        sys.exit(1)


def minutes_of(directory, product='shape.glb', settle=120):
    """Build minutes of an output directory: stage-start.json's mtime (written before the mesh import) to the last file the
    build wrote. The build's own files all land within `settle` seconds of its product (shape.glb; for an assembly akinza.glb
    and its renders); a file added to the directory much later (a spec copied in, a containment report) is not build time."""
    directory = Path(directory)
    start = directory/'stage-start.json'
    if not start.is_file():
        return None
    begin = start.stat().st_mtime
    made = (directory/product).stat().st_mtime if (directory/product).is_file() else None
    end = begin
    for path in directory.rglob('*'):
        if path.is_file() and 'containment' not in path.name:
            mtime = path.stat().st_mtime
            if made is None or mtime <= made+settle:
                end = max(end, mtime)
    return round((end-begin)/60, 1)


def cmd_minutes(args):
    recipe = load(args.recipe)
    cache = Cache(recipe)
    keys = compute_keys(recipe)
    outs = output_dirs(recipe, cache, keys)
    data = copy.deepcopy(recipe.data)
    by = {s['id']: s for s in data['steps']}
    rows = []
    for step in recipe.order:
        m = minutes_of(outs[step['id']]) if outs[step['id']] else None
        rows.append((step['id'], outs[step['id']].name if outs[step['id']] else '-', m))
        if m is not None:
            by[step['id']]['minutes'] = m
    asm = recipe.assembly
    asm_dir = recipe.work/asm['existing'] if asm.get('existing') and (recipe.work/asm['existing']).is_dir() else None
    m = minutes_of(asm_dir, 'akinza.glb', 600) if asm_dir else None
    rows.append(('assembly', asm_dir.name if asm_dir else '-', m))
    if m is not None:
        data['assembly']['minutes'] = m
    for sid, name, m in rows:
        print(f'  {sid:<9} {name:<24} {m if m is not None else "?"} min')
    print(f"total {round(sum(m for _, _, m in rows if m), 1)} min over {sum(1 for r in rows if r[2] is not None)} outputs")
    if args.write:
        dump(data, recipe.path, like=recipe.path)
        say(f'wrote minutes into {recipe.path}')


def cmd_seed(args):
    """Map each step's `existing` directory to its key without building. Strict (the default): a step is mapped only
    when every file it reads is the bytes its output recorded (script and modules by stage-start sources, file arguments
    by stage-start inputs) and every recorded input is a file the recipe feeds; anything else is refused and the exit
    status is 1. --loose maps anyway (explicit recovery; the cache entry is marked loose)."""
    recipe = load(args.recipe)
    cache = Cache(recipe)
    keys = compute_keys(recipe)
    dirs = {s['id']: s['existing'] for s in recipe.steps if s.get('existing')}
    outs = {sid: recipe.work/d for sid, d in dirs.items() if (recipe.work/d).is_dir()}
    problems, rows, refused = 0, [], set()
    for name, root in recipe.roots.items():
        for fname, want in root['files'].items():
            path = recipe.work/root['dir']/fname
            if not path.is_file() or rs.file_hash(path, normalise=False) != want:
                problems += 1
                print(f"ROOT {name}/{fname}: missing or hash differs")
    for step in recipe.order:
        existing = step.get('existing')
        if not existing:
            print(f"{step['id']}: no existing dir, left unseeded")
            continue
        directory = recipe.work/existing
        if not directory.is_dir():
            problems += 1
            print(f"{step['id']}: {existing} is missing")
            continue
        pin = script_pin(step, directory)
        cover = input_coverage(recipe, step, dirs)
        analysis = analyze_files(step['script'], step['args'], directory, input_dirs(recipe, step, outs), recipe.work)
        drift = [k for k, v in analysis.items() if v['status'] == 'differs']
        upstream = [r for r in step['inputs'].values() if r in refused]
        bad = 'MISMATCH' in pin or bool(cover and cover['recordedNotFed']) or bool(drift) or bool(upstream)
        problems += bad
        if upstream:
            pin += f"; upstream {', '.join(upstream)} refused"
        if bad and not args.loose:
            refused.add(step['id'])
            pin += '; REFUSED (not mapped)'
        else:
            entry = {'dir': existing, 'step': step['id'], 'seeded': True, 'built': datetime.datetime.now().isoformat(timespec='seconds')}
            if bad:
                entry['loose'] = True
            cache.put('steps', keys[step['id']], entry)
        rows.append((step['id'], existing, keys[step['id']], pin, cover, drift))
        if args.write_expect:
            step['expect'] = measure_output(directory)
    asm = recipe.assembly
    if asm.get('existing') and (recipe.work/asm['existing']).is_dir():
        asm_analysis = analyze_files(ASSEMBLER, [], recipe.work/asm['existing'], {}, recipe.work)
        asm_drift = [k for k, v in asm_analysis.items() if v['status'] == 'differs']
        asm_drift = asm_drift or (['upstream refused'] if {asm['head'], asm['body']} & refused else [])
        problems += bool(asm_drift)
        if not asm_drift or args.loose:
            cache.put('assemblies', keys['assembly'], {'dir': asm['existing'], 'head': dirs.get(asm['head']), 'body': dirs.get(asm['body']),
                                                       'seeded': True, 'built': datetime.datetime.now().isoformat(timespec='seconds'),
                                                       **({'loose': True} if asm_drift else {})})
        rows.append(('assembly', asm['existing'], keys['assembly'], '-' if not asm_drift else 'DRIFT '+', '.join(asm_drift)+'; REFUSED', None, asm_drift))
        if args.write_expect:
            asm['expect'] = assembly_summary(recipe.work/asm['existing'])
    if args.write_expect:
        recipe.data['steps'] = recipe.steps
        dump(recipe.data, recipe.path, like=recipe.path)
        say(f'wrote expect blocks into {recipe.path}')
    for sid, existing, key, pin, cover, drift in rows:
        extra = ''
        if cover is not None:
            extra = f" inputs: recorded-not-fed {cover['recordedNotFed'] or 'none'}, fed-not-recorded {cover['fedNotRecorded'] or 'none'}"
        if drift:
            extra += f' files differ from the run: {", ".join(Path(k).name for k in drift)}'
        print(f'{sid:<9} {existing:<22} {key[:12]}  script {pin};{extra}')
    mapped = sum(1 for r in rows if 'REFUSED' not in r[3])
    print(f'seeded {mapped} of {len(rows)} entries into {cache.path}; problems: {problems}'
          +(' (loose: mapped anyway)' if args.loose and problems else ''))
    if problems and not args.loose:
        sys.exit(1)


def drop_expect(recipe_data, changed_ids):
    """A changed step's recorded statistics no longer describe it, nor do those of its descendants."""
    affected = set()
    for sid in changed_ids:
        affected |= descendants_of(recipe_data, sid)
    for step in recipe_data['steps']:
        if step['id'] in affected:
            step.pop('expect', None)
    asm = recipe_data['assembly']
    if asm['head'] in affected or asm['body'] in affected:
        asm.pop('expect', None)


def descendants_of(data, step_id):
    out, grew = {step_id}, True
    while grew:
        grew = False
        for s in data['steps']:
            if s['id'] not in out and any(r in out for r in s['inputs'].values()):
                out.add(s['id'])
                grew = True
    return out


def set_cli_arg(step, flag, value):
    args = step['args']
    tokens = value.split() if isinstance(value, str) else [str(value)]
    if flag in args:
        start = args.index(flag)
        end = start+1
        while end < len(args) and not args[end].startswith('--'):
            end += 1
        if value in ('true', 'True') and end == start+1:
            return
        if value in ('false', 'False'):
            step['args'] = args[:start]+args[end:]
            return
        step['args'] = args[:start+1]+([] if value in ('true', 'True') else tokens)+args[end:]
    else:
        step['args'] = args+[flag]+([] if value in ('true', 'True') else tokens)


def set_path(doc, dotted, value):
    keys = dotted.split('.')
    node = doc
    for key in keys[:-1]:
        node = node[int(key)] if isinstance(node, list) else node[key]
    last = keys[-1]
    if isinstance(node, list):
        node[int(last)] = value
    else:
        node[last] = value


def refresh_pins(step, before):
    """Pins of an edited step: carried forward for every file it still reads (an unchanged input keeps its recorded sha, so a
    file edited in place stays CHANGED), recorded from the bytes now for a file it reads for the first time."""
    old = before.get('pins') or {}
    step['pins'] = {key: old.get(key) or rs.pin_hash(key) for key in sorted(rs.read_files(step['script'], step['args']))}


def apply_edits(data, step_id, pairs, spec_path, keep_same=False):
    """Edit one step of a recipe dict in place: pairs is [(arg, value)], each a --flag, spec:<dotted.path> or script (the
    step's script path, to point it at a new versioned copy).
    spec_path(spec_doc) returns the file the edited spec is written to. With keep_same, a spec edit that
    leaves the document unchanged keeps the original path (so the step key equals the baseline's).
    Returns the spec file written, or None."""
    step = next((s for s in data['steps'] if s['id'] == step_id), None)
    if step is None:
        fail(f'no step {step_id}')
    spec_doc, original = None, None
    before = copy.deepcopy(step)
    for key, value in pairs:
        if key == 'script':
            if not (ROOT/value).is_file():
                fail(f'script {value}: no such file under the repository')
            step['script'] = value
        elif key.startswith('--'):
            set_cli_arg(step, key, value)
        elif key.startswith('spec:'):
            if spec_doc is None:
                if '--spec' not in step['args']:
                    fail(f'step {step_id} has no --spec argument')
                source = step['args'][step['args'].index('--spec')+1]
                spec_doc = json.loads(Path(resolve(source, {}, Path('.'))).read_text(encoding='utf-8'))
                original = copy.deepcopy(spec_doc)
            try:
                parsed = json.loads(value)
            except ValueError:
                parsed = value
            set_path(spec_doc, key[len('spec:'):], parsed)
        else:
            fail(f'{key}: an argument is a --flag, spec:<dotted.path> or script')
    spec_file = None
    if spec_doc is not None and not (keep_same and spec_doc == original):
        spec_file = Path(spec_path(spec_doc))
        spec_file.parent.mkdir(parents=True, exist_ok=True)
        spec_file.write_bytes((json.dumps(spec_doc, indent=1)+'\n').encode('utf-8'))
        index = step['args'].index('--spec')+1
        try:
            step['args'][index] = '{repo}/'+spec_file.relative_to(ROOT).as_posix()
        except ValueError:  # a candidate outside the repository keeps an absolute path
            step['args'][index] = spec_file.as_posix()
    refresh_pins(step, before)
    drop_expect(data, [step_id])
    return spec_file


def cmd_set(args):
    recipe = load(args.recipe)
    data = copy.deepcopy(recipe.data)
    if len(args.pairs) % 2:
        fail('arguments after the step id come in pairs: <arg> <value>')
    out = Path(args.out).resolve()
    apply_edits(data, args.step, list(zip(args.pairs[0::2], args.pairs[1::2])),
                lambda doc: out.with_name(f'{out.stem}.{args.step}.spec.json'))
    stamp_derived(data, recipe.data, recipe.path)
    dump(data, out)
    candidate = load(out)
    cache = Cache(candidate)
    plan, _ = make_plan(candidate, cache)
    say(f'wrote {out}')
    print_plan(candidate, plan, cache)


def add_step(data, after, new, rewire=()):
    """Insert a step into a recipe dict after `after`: consumers of `after` that read it through the same input name as the new step,
    and the assembly sink, are rewired to it (plus any (step id, input name) pairs in `rewire`). Records the step's pins from today's
    bytes and drops the recorded statistics downstream."""
    ids = [s['id'] for s in data['steps']]
    if new['id'] in ids:
        fail(f"step id {new['id']} already exists")
    if after not in ids:
        fail(f'no step {after}')
    slots = [name for name, ref in new['inputs'].items() if ref == after]
    data['steps'].insert(ids.index(after)+1, new)
    for step in data['steps']:
        if step['id'] == new['id']:
            continue
        for name, ref in list(step['inputs'].items()):
            if ref == after:
                same_slot = name in slots and step.get('kind') == new.get('kind')
                if same_slot or (step['id'], name) in rewire:
                    step['inputs'][name] = new['id']
    for sink in ('head', 'body'):
        if data['assembly'][sink] == after and new.get('kind') == sink:
            data['assembly'][sink] = new['id']
    refresh_pins(new, new)
    drop_expect(data, [new['id']])


def cmd_add(args):
    recipe = load(args.recipe)
    data = copy.deepcopy(recipe.data)
    new = json.loads(Path(args.step).read_text(encoding='utf-8'))
    add_step(data, args.after, new, [tuple(x.split(':')) for x in args.rewire or []])
    out = Path(args.out).resolve()
    stamp_derived(data, recipe.data, recipe.path)
    dump(data, out)
    candidate = load(out)  # validates the DAG
    cache = Cache(candidate)
    plan, _ = make_plan(candidate, cache)
    say(f'wrote {out}')
    print_plan(candidate, plan, cache)


def cmd_merge(args):
    base, a, b = (json.loads(Path(p).read_text(encoding='utf-8')) for p in (args.base, args.a, args.b))
    ids_base = [s['id'] for s in base['steps']]
    by = lambda d: {s['id']: s for s in d['steps']}
    base_s, a_s, b_s = by(base), by(a), by(b)
    conflicts, merged = [], {}
    for sid in ids_base:
        in_a, in_b = a_s.get(sid), b_s.get(sid)
        changed_a, changed_b = in_a != base_s[sid], in_b != base_s[sid]
        if changed_a and changed_b and in_a != in_b:
            conflicts.append(f'step {sid} changed in both candidates')
        merged[sid] = in_a if changed_a else (in_b if changed_b else base_s[sid])
    added_a = [s for s in a['steps'] if s['id'] not in base_s]
    added_b = [s for s in b['steps'] if s['id'] not in base_s]
    for s in added_a:
        if s['id'] in {x['id'] for x in added_b} and s != by(b)[s['id']]:
            conflicts.append(f"added step {s['id']} differs between candidates")

    def predecessor(candidate, sid):
        order = [s['id'] for s in candidate['steps']]
        k = order.index(sid)
        return order[k-1] if k else None

    removed = [sid for sid in ids_base if (sid not in a_s) != (sid not in b_s)]
    for sid in removed:
        conflicts.append(f'step {sid} removed in only one candidate')
    for s in added_a:
        for t in added_b:
            if predecessor(a, s['id']) == predecessor(b, t['id']) and s['id'] != t['id']:
                conflicts.append(f"added steps {s['id']} and {t['id']} follow the same step")
    if base['assembly'] != a['assembly'] and base['assembly'] != b['assembly'] and a['assembly'] != b['assembly']:
        conflicts.append('assembly changed in both candidates')
    if conflicts:
        fail('cannot merge: '+'; '.join(conflicts))
    steps = []
    new_by_pred = {}
    for cand, adds in ((a, added_a), (b, added_b)):
        for s in adds:
            new_by_pred.setdefault(predecessor(cand, s['id']), []).append(s)
    seen = set()
    for sid in ids_base:
        if sid in merged and (sid in a_s and sid in b_s):
            steps.append(merged[sid])
        for s in new_by_pred.get(sid, []):
            if s['id'] not in seen:
                steps.append(s)
                seen.add(s['id'])
    out = copy.deepcopy(base)
    out['steps'] = steps
    out['assembly'] = a['assembly'] if a['assembly'] != base['assembly'] else b['assembly']
    drop_expect(out, [s['id'] for s in steps if s != base_s.get(s['id'])])
    stamp_derived(out, base, args.base)
    dump(out, Path(args.out))
    candidate = load(args.out)
    cache = Cache(candidate)
    plan, _ = make_plan(candidate, cache)
    say(f'wrote {args.out}')
    print_plan(candidate, plan, cache)


# ---------------------------------------------------------------- derivedFrom and rebase

FP_FIELDS = ('script', 'args', 'inputs', 'regions', 'runner', 'kind', 'component')


def _fp(value):
    return rs.sha256_bytes(json.dumps(value, sort_keys=True).encode())


def step_fingerprint(step):
    """{field: hash} of the fields of a step that say what it builds."""
    return {f: _fp(step.get(f)) for f in FP_FIELDS}


def assembly_fingerprint(asm):
    return {f: _fp(asm.get(f)) for f in ('head', 'body', 'args')}


def derived_block(data, path):
    """What a candidate records about the base it was cut from: the base file's sha256 (LF form) and a per-field fingerprint of
    every base step and of the assembly, so `rebase` can tell what the candidate changed without finding the old base."""
    path = Path(path)
    try:
        shown = path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        shown = path.as_posix()
    return {'recipe': shown, 'sha256': rs.file_hash(path, normalise=True) if path.is_file() else None,
            'steps': {s['id']: step_fingerprint(s) for s in data['steps']},
            'assembly': assembly_fingerprint(data['assembly'])}


def stamp_derived(cand_data, base_data, base_path):
    """Record `derivedFrom` in a candidate cut from base_data. A candidate of a candidate keeps the original base's block; the live
    recipe.json (which moves every kept round, and may carry a promoted candidate's stale block) is always the base itself."""
    if Path(base_path).name != 'recipe.json' and base_data.get('derivedFrom'):
        cand_data['derivedFrom'] = copy.deepcopy(base_data['derivedFrom'])
    else:
        cand_data['derivedFrom'] = derived_block(base_data, base_path)


def candidate_commit(path):
    """The commit a committed, unmodified candidate file is at; None when it is untracked, modified or outside the repository."""
    try:
        rel = Path(path).resolve().relative_to(ROOT).as_posix()
        if rs.git(ROOT, 'status', '--porcelain', '--', rel).strip():
            return None
        commit = rs.git(ROOT, 'log', '-1', '--format=%H', '--', rel).decode().strip()
        return commit or None
    except (ValueError, RuntimeError):
        return None


def freeze_candidate_bytes(key, commit, notes):
    """The repo-relative path a candidate's file argument or script should name: the file itself when its bytes are what they were at
    the candidate's commit (or it has no such history), else a frozen copy of the candidate-time bytes."""
    if commit is None or Path(key).is_absolute() or not (ROOT/key).is_file():
        return key
    try:
        blob = rs.git(ROOT, 'show', f'{commit}:{key}')
    except RuntimeError:
        return key
    text = Path(key).suffix.lower() in rs.TEXT_SUFFIXES
    body = rs.lf(blob) if text else blob
    sha = rs.sha256_bytes(body)
    if sha == rs.file_hash(ROOT/key):
        return key
    target = rs.frozen_name(ROOT/key, sha)
    if not target.is_file():
        target.write_bytes(body)
    notes.append(f'{key} has changed since the candidate was committed ({commit[:8]}); frozen the candidate-time bytes as {rs.pin_key(target)}')
    return rs.pin_key(target)


def rebase_recipes(old, new, cand, commit, notes):
    """The rebased recipe dict: the new base, plus every step the candidate added or changed (field by field, against the old base's
    fingerprints), with fresh pins. Raises SystemExit naming every field both sides changed differently."""
    block = old if old is not None else cand.get('derivedFrom')
    base_steps = block['steps']
    base_asm = block['assembly']
    out = copy.deepcopy(new)
    by = {s['id']: s for s in out['steps']}
    new_ids = {s['id'] for s in new['steps']}
    conflicts, changed, added, taken = [], set(), [], {}
    cand_ids = {s['id'] for s in cand['steps']}
    for cs in cand['steps']:
        sid = cs['id']
        if sid not in base_steps:
            if sid in by:
                if step_fingerprint(by[sid]) != step_fingerprint(cs):
                    conflicts.append(f'step {sid}: added by the candidate and by the new base, differently')
            else:
                added.append(cs)
            continue
        fp_old, fp_cand = base_steps[sid], step_fingerprint(cs)
        fields = [f for f in FP_FIELDS if fp_cand[f] != fp_old[f]]
        if not fields:
            continue
        if sid not in by:
            conflicts.append(f'step {sid}: the candidate changed {", ".join(fields)} and the new base removed the step')
            continue
        fp_new = step_fingerprint(by[sid])
        for f in fields:
            if fp_new[f] != fp_old[f] and fp_new[f] != fp_cand[f]:
                conflicts.append(f'step {sid}.{f}: changed by the candidate and by the new base, differently')
        if any(c.startswith(f'step {sid}.') for c in conflicts):
            continue
        for f in fields:
            if f in cs:
                by[sid][f] = copy.deepcopy(cs[f])
            else:
                by[sid].pop(f, None)
        if 'note' in cs:
            by[sid]['note'] = cs['note']
        changed.add(sid)
        taken[sid] = fields
    for sid in base_steps:
        if sid not in cand_ids and sid in by:
            if step_fingerprint(by[sid]) == base_steps[sid] or sid not in new_ids:
                out['steps'].remove(by.pop(sid))
                changed.add(sid)
            else:
                conflicts.append(f'step {sid}: removed by the candidate and changed by the new base')
    asm_fields = {}
    for f in ('head', 'body'):
        fp_cand = _fp(cand['assembly'].get(f))
        if fp_cand != base_asm[f]:
            if _fp(new['assembly'].get(f)) not in (base_asm[f], fp_cand):
                conflicts.append(f'assembly.{f}: changed by the candidate and by the new base, differently')
            else:
                asm_fields[f] = cand['assembly'][f]
    if conflicts:
        fail('cannot rebase: '+'; '.join(conflicts))
    if _fp(cand['assembly'].get('args')) != base_asm['args'] and cand['assembly'].get('args') != new['assembly'].get('args'):
        notes.append('the candidate changed the assembly args; the new base args are kept')
    # added steps keep their position: after the nearest earlier candidate step that is in the result
    order = [s['id'] for s in cand['steps']]
    for cs in added:
        k = order.index(cs['id'])
        prev = next((order[j] for j in range(k-1, -1, -1) if order[j] in by or order[j] in {a['id'] for a in added[:added.index(cs)]}), None)
        position = 0
        if prev is not None:
            position = next(i for i, s in enumerate(out['steps']) if s['id'] == prev)+1
        out['steps'].insert(position, copy.deepcopy(cs))
        by[cs['id']] = out['steps'][position]
        changed.add(cs['id'])
        taken[cs['id']] = list(FP_FIELDS)
    asm = out['assembly']
    asm.update(copy.deepcopy(asm_fields))
    # existing, expect and minutes describe an output the step no longer produces; fresh pins of the bytes it names
    for sid in changed:
        step = by.get(sid)
        if step is None:
            continue
        for key in ('existing', 'expect', 'minutes'):
            step.pop(key, None)
        if 'script' in taken[sid]:
            step['script'] = freeze_candidate_bytes(step['script'], commit, notes)
        if 'args' in taken[sid]:
            for key, position in rs.arg_files(step['args']).items():
                moved = freeze_candidate_bytes(key, commit, notes)
                if moved != key:
                    step['args'][position] = ('{repo}/'+moved) if step['args'][position].startswith('{repo}/') else str(rs.pin_path(moved))
        step['pins'] = rs.pins_now(step['script'], step['args'])
    affected = set()
    for sid in changed:
        if sid in by:
            affected |= descendants_of(out, sid)
    for step in out['steps']:
        if step['id'] in affected:
            step.pop('expect', None)
    if asm_fields or asm['head'] in affected or asm['body'] in affected:
        for key in ('existing', 'expect'):
            asm.pop(key, None)
    return out


def cmd_rebase(args):
    paths = args.paths
    if len(paths) == 4:
        old_path, new_path, cand_path, out_path = paths
        old = derived_block(json.loads(Path(old_path).read_text(encoding='utf-8')), old_path)
    elif len(paths) == 3:
        new_path, cand_path, out_path = paths
        old = None
    else:
        fail('usage: rebase <new base> <candidate> <out>   or   rebase <old base> <new base> <candidate> <out>')
    new = json.loads(Path(new_path).read_text(encoding='utf-8'))
    cand = json.loads(Path(cand_path).read_text(encoding='utf-8'))
    if old is None and not cand.get('derivedFrom'):
        fail(f'{cand_path} has no derivedFrom block (it predates it); give the old base: rebase <old base> <new base> <candidate> <out>')
    notes = []
    out = rebase_recipes(old, new, cand, None if args.live else candidate_commit(cand_path), notes)
    out['derivedFrom'] = derived_block(new, new_path)
    out['rebasedFrom'] = {'candidate': rs.pin_key(Path(cand_path).resolve()), 'candidateSha256': rs.file_hash(cand_path, normalise=True)}
    dump(out, Path(out_path).resolve(), like=new_path)
    result = load(out_path)
    cache = Cache(result)
    plan, _ = make_plan(result, cache)
    say(f'wrote {out_path}')
    for note in notes:
        print('note: '+note)
    print_plan(result, plan, cache)
    if plan_changed(plan):
        for sid, key, state in plan_changed(plan):
            print(f'{state} {key} ({sid})')
        sys.exit(1)


def cmd_verify(args):
    recipe = load(args.recipe)
    cache = Cache(recipe)
    plan, keys = make_plan(recipe, cache, no_cache=True)
    started = time.time()
    built, assembly_name, head, body, seconds = execute(recipe, plan, keys, cache, register=False)
    report = {'recipe': str(recipe.path), 'replayed': built, 'assembly': assembly_name, 'steps': {}, 'seconds': round(time.time()-started)}
    failures = []
    for step in recipe.order:
        directory = recipe.work/built[step['id']]
        if 'expect' in step:
            diffs, got = compare_expect(step['expect'], directory)
        else:
            diffs, got = ['no expect block'], measure_output(directory)
        report['steps'][step['id']] = {'dir': built[step['id']], 'existing': step.get('existing'), 'ok': not diffs,
                                       'diffs': diffs, 'got': {k: v for k, v in got.items() if k != 'record'}}
        if diffs:
            failures.append(step['id'])
        print(f"  {step['id']:<5} {built[step['id']]:<10} {'match' if not diffs else 'DIFF: '+'; '.join(diffs)}")
    asm = recipe.assembly
    got = assembly_summary(recipe.work/assembly_name)
    diffs = []
    if 'expect' in asm:
        want = asm['expect']
        for field in ('vertices', 'faces'):
            if want.get(field) != got[field]:
                diffs.append(f'{field} {got[field]} != expected {want.get(field)}')
        worst = max(abs(a-b) for ea, ga in zip(want['bounds'], got['bounds']) for a, b in zip(ea, ga))
        if worst > BOUNDS_TOLERANCE_HEIGHTS*FIGURE_HEIGHT:
            diffs.append(f'bounds differ by {worst:.6f}')
        if want['record']['skin'] != got['record']['skin']:
            diffs.append(f"skin {got['record']['skin']} != expected {want['record']['skin']}")
    report['steps']['assembly'] = {'dir': assembly_name, 'existing': asm.get('existing'), 'ok': not diffs, 'diffs': diffs, 'got': got}
    print(f"  assembly {assembly_name} {'match' if not diffs else 'DIFF: '+'; '.join(diffs)}")
    if diffs:
        failures.append('assembly')
    if not args.no_packet:
        report['measured'] = measured_comparison(recipe, assembly_name, asm.get('existing'))
    report['failures'] = failures
    path = recipe.work/f'recipe-verify-{assembly_name.split("-")[-1]}.json'
    path.write_bytes((json.dumps(report, indent=1)+'\n').encode('utf-8'))
    say(f'report {path}; failing steps: {failures or "none"}; total {report["seconds"]} s')


def tool(*argv):
    result = _run([sys.executable, str(LOOP_TOOLS), *argv], cwd=ROOT, capture_output=True, text=True)
    if result.returncode:
        fail(f"loop_tools {' '.join(argv)} failed\n"+'\n'.join((result.stdout+result.stderr).splitlines()[-20:]))
    return result.stdout


def measured_comparison(recipe, assembly_name, existing):
    """check, packet and measured on the replayed assembly, then its measured.json against the original's."""
    say(f'check {assembly_name}')
    check = json.loads(tool('check', assembly_name).strip().splitlines()[-1])
    packet = recipe.work/'loop/packets'/assembly_name
    say(f'packet {assembly_name} (renders, posed fit; several minutes)')
    tool('packet', assembly_name, str(packet))
    tool('measured', str(packet))
    result = {'check': check, 'packet': str(packet)}
    original = recipe.work/'loop/packets'/(existing or '')/'measured.json'
    if existing and original.is_file():
        mine = json.loads((packet/'measured.json').read_text(encoding='utf-8'))
        theirs = json.loads(original.read_text(encoding='utf-8'))
        result['comparison'] = compare_measured(theirs, mine)
    return result


def flatten(doc, prefix=''):
    if isinstance(doc, dict):
        for k, v in doc.items():
            yield from flatten(v, f'{prefix}{k}.')
    elif isinstance(doc, list):
        for i, v in enumerate(doc):
            yield from flatten(v, f'{prefix}{i}.')
    else:
        yield prefix.rstrip('.'), doc


def compare_measured(original, replay):
    a, b = dict(flatten(original)), dict(flatten(replay))
    rows = {}
    for key in sorted(set(a)|set(b)):
        x, y = a.get(key), b.get(key)
        if x == y:
            continue
        delta = abs(x-y) if isinstance(x, (int, float)) and isinstance(y, (int, float)) and not isinstance(x, bool) else None
        rows[key] = {'original': x, 'replay': y, 'delta': round(delta, 6) if delta is not None else None}
    return {'compared': len(set(a)|set(b)), 'different': len(rows), 'differences': rows}


# ---------------------------------------------------------------- contain

def load_zones(recipe, zones_file):
    path = Path(zones_file) if zones_file else ROOT/f'docs/design/species-construction/{recipe.species}/loop/species.json'
    if not path.is_file():
        fail(f'{path} not found; pass --zones FILE (a species.json or a file holding a zones block)')
    doc = json.loads(path.read_text(encoding='utf-8'))
    return doc['zones'] if 'zones' in doc else doc, doc


def in_zone(points, zone, floor, height):
    import numpy as np
    at = (floor+height-points[:, 2])/height
    x = points[:, 0]/height
    x = np.abs(x) if zone.get('symmetricX') else x
    y = points[:, 1]/height
    return ((at >= zone['at'][0]) & (at <= zone['at'][1]) & (x >= zone['x'][0]) & (x <= zone['x'][1])
            & (y >= zone['y'][0]) & (y <= zone['y'][1]))


def compute_containment(recipe, step, out_name, base_dir, zones, species, owned=None):
    """Nearest-vertex displacement between a step's input (base_dir) and its output (out_name), per
    foreign region. Pure computation: nothing is written."""
    import numpy as np
    from scipy.spatial import cKDTree
    frame = species.get('frame', {})
    floor, height = frame.get('floorZ', -.957), frame.get('fixedHeight', FIGURE_HEIGHT)
    cand = rs.glb_vertices(recipe.work/out_name/'shape.glb')
    base = rs.glb_vertices(base_dir/'shape.glb')
    if step.get('kind') == 'head':
        join = species.get('join', {})
        scale = join.get('head-scale', .5)
        offset = np.array([0, join.get('head-depth-offset', -.02), join.get('jaw-anchor-z', .5)+.27*scale])
        cand, base = cand*scale+offset, base*scale+offset
    d_cb, _ = cKDTree(base).query(cand)
    d_bc, _ = cKDTree(cand).query(base)
    points, dist = np.concatenate([cand, base]), np.concatenate([d_cb, d_bc])/height
    owned = list(owned if owned is not None else step.get('regions', []))
    if any(r not in zones for r in owned):
        fail(f"step {step['id']} owns a region with no zone ({owned}); the whole figure is its zone")
    own_mask = np.zeros(len(points), bool)
    for r in owned:
        own_mask |= in_zone(points, zones[r], floor, height)
    foreign, any_zone = {}, own_mask.copy()
    for r, zone in zones.items():
        if r in ('note', 'unit') or not isinstance(zone, dict):
            continue
        member = in_zone(points, zone, floor, height)
        any_zone |= member
        if r in owned:
            continue
        sel = member & ~own_mask
        foreign[r] = ({'vertices': int(sel.sum()), 'p95': round(float(np.percentile(dist[sel], 95)), 5),
                       'max': round(float(dist[sel].max()), 5)} if sel.any() else {'vertices': 0, 'p95': 0.0, 'max': 0.0})
    loose = ~any_zone
    report = {'step': step['id'], 'output': out_name, 'baseline': base_dir.name, 'ownedRegions': owned, 'unit': 'figureHeight',
              'note': 'nearest-vertex displacement both ways, as in mesh_delta.py; a remeshed field has a noise floor near .002',
              'foreign': foreign,
              'outsideAllZones': ({'vertices': int(loose.sum()), 'p95': round(float(np.percentile(dist[loose], 95)), 5),
                                   'max': round(float(dist[loose].max()), 5)} if loose.any() else {'vertices': 0, 'p95': 0.0, 'max': 0.0}),
              'ownedMax': round(float(dist[own_mask].max()), 5) if own_mask.any() else 0.0}
    return report


def existing_chain_dir(recipe, ref):
    """The directory the baseline run of a step's input used: a root's directory, or the input step's `existing` output."""
    if ref in recipe.roots:
        return recipe.work/recipe.roots[ref]['dir']
    existing = recipe.byid[ref].get('existing')
    return recipe.work/existing if existing and (recipe.work/existing).is_dir() else None


def reference_step(recipe, step):
    """The baseline version of a step: the step itself when it has an `existing` output, else the nearest earlier step of the
    same component that owns one of its regions and has one (a tool step added in place of the method it replaces is judged
    against that method's own footprint)."""
    def has_output(s):
        return bool(s.get('existing')) and (recipe.work/s['existing']/'shape.glb').is_file()
    if has_output(step):
        return step
    own, seen, queue = set(step.get('regions', [])), {step['id']}, [step]
    while queue:
        current = queue.pop(0)
        for ref in current['inputs'].values():
            if ref in recipe.byid and ref not in seen:
                seen.add(ref)
                ancestor = recipe.byid[ref]
                if has_output(ancestor) and ancestor['component'] == step['component'] and own & set(ancestor.get('regions', [])):
                    return ancestor
                queue.append(ancestor)
    return None


def containment_reference(recipe, step, zones, species):
    """(report, note): the displacement per region the baseline version of a step produced, its `existing` output against
    its input, measured over the same zones and the same owned regions as the candidate and cached under
    <work>/contain-ref/. report is None with a note when the step has no baseline version."""
    ref = reference_step(recipe, step)
    if ref is None:
        return None, 'no baseline version of this step (no existing output of it or of an earlier step owning the same region)'
    primary = 'base' if 'base' in ref['inputs'] else next(iter(ref['inputs']))
    base_dir = existing_chain_dir(recipe, ref['inputs'][primary])
    if base_dir is None or not (base_dir/'shape.glb').is_file():
        return None, f"the baseline input of {ref['id']} has no output to compare against"
    owned = list(step.get('regions', []))
    digest = rs.sha256_bytes(json.dumps({'zones': zones, 'frame': species.get('frame'), 'join': species.get('join'), 'owned': owned},
                                        sort_keys=True).encode())[:8]
    name = f"{ref['id']}-{ref['existing'].replace('/', '_')}-{base_dir.name.replace('/', '_')}-{'_'.join(owned)}-{digest}.json"
    cached = recipe.work/'contain-ref'/name
    with LOCK:
        if cached.is_file():
            report = json.loads(cached.read_text(encoding='utf-8'))
        else:
            report = compute_containment(recipe, ref, ref['existing'], base_dir, zones, species, owned=owned)
            cached.parent.mkdir(exist_ok=True)
            tmp = cached.with_suffix('.tmp')
            tmp.write_bytes((json.dumps(report, indent=1)+'\n').encode('utf-8'))
            os.replace(tmp, cached)
    report['cacheFile'] = cached.as_posix()
    return report, None


def apply_reference(report, reference, note=None):
    """Add the relative rule to a containment report: per foreign region the baseline version's displacement (`reference`), the
    allowance max(FLAT_ALLOWANCE, REFERENCE_FACTOR x reference max), the excess over it and whether it is flagged. The absolute
    numbers stay; `flaggedAbsolute` is the old flat rule. Without a reference the allowance is the flat one."""
    def one(entry, ref_entry):
        ref_max = ref_entry['max'] if ref_entry else None
        allowance = max(FLAT_ALLOWANCE, REFERENCE_FACTOR*ref_max) if ref_max is not None else FLAT_ALLOWANCE
        entry.update(reference=({'p95': ref_entry['p95'], 'max': ref_entry['max']} if ref_entry else None),
                     allowance=round(allowance, 5), excess=round(entry['max']-allowance, 5),
                     flagged=entry['max'] > allowance, flaggedAbsolute=entry['max'] > FLAT_ALLOWANCE)
    ref_foreign = reference.get('foreign', {}) if reference else {}
    for region, entry in report['foreign'].items():
        one(entry, ref_foreign.get(region))
    one(report['outsideAllZones'], reference.get('outsideAllZones') if reference else None)
    rows = {**report['foreign'], 'outsideAllZones': report['outsideAllZones']}
    report['rule'] = {'allowance': f'max({FLAT_ALLOWANCE}, {REFERENCE_FACTOR} x the displacement the baseline version of the step gave the region)',
                      'referenceStep': reference['step'] if reference else None,
                      'referenceOutput': reference['output'] if reference else None,
                      'referenceInput': reference['baseline'] if reference else None, 'note': note}
    report['verdict'] = {'absolute': sorted(r for r, e in rows.items() if e['flaggedAbsolute']),
                         'relative': sorted(r for r, e in rows.items() if e['flagged'])}
    return report


def cmd_contain(args):
    recipe = load(args.recipe)
    cache = Cache(recipe)
    step = recipe.byid.get(args.step)
    if step is None:
        fail(f'no step {args.step}')
    zones, species = load_zones(recipe, args.zones)
    plan, keys = make_plan(recipe, cache)
    out_name = args.out_dir or plan[args.step]['dir']
    if not out_name:
        fail(f'step {args.step} is not built; build it first or pass --out-dir')
    entry = next((e for e in cache._load()['steps'].values() if e['dir'] == out_name), {})
    primary = 'base' if 'base' in step['inputs'] else next(iter(step['inputs']))
    ref = step['inputs'][primary]
    base_dir = recipe.work/(recipe.roots[ref]['dir'] if ref in recipe.roots else plan[ref]['dir'] or recipe.byid[ref].get('existing') or '')
    if not (base_dir/'shape.glb').is_file():
        fail(f'baseline {base_dir}/shape.glb not found (input {ref} is not built)')
    report = compute_containment(recipe, step, out_name, base_dir, zones, species)
    if not args.no_reference:
        reference, note = containment_reference(recipe, step, zones, species)
        apply_reference(report, reference, note)
    target = recipe.work/out_name/'containment.json' if not entry.get('seeded') else recipe.work/f'{out_name}.containment.json'
    number = 1
    while target.exists():  # outputs are immutable: a second report goes beside the first, never over it
        number += 1
        target = recipe.work/f'{out_name.replace("/", "_")}.containment-{number}.json'
    target.write_bytes((json.dumps(report, indent=1)+'\n').encode('utf-8'))
    worst = max(report['foreign'].items(), key=lambda kv: kv[1]['max'], default=(None, {'max': 0}))
    summary = {'written': str(target), 'worstForeign': worst[0], 'max': worst[1]['max'],
               'outsideAllZonesMax': report['outsideAllZones']['max']}
    if 'verdict' in report:
        ref_step = report['rule']['referenceStep']
        summary.update(flaggedAbsolute=report['verdict']['absolute'], flaggedRelative=report['verdict']['relative'],
                       reference=f"{ref_step} ({report['rule']['referenceOutput']})" if ref_step else None)
    print(json.dumps(summary))


def cmd_sweep(args):
    import recipe_sweep
    recipe_sweep.run(args, sys.modules[__name__])


def cmd_candidate(args):
    import recipe_candidate
    recipe_candidate.run(args, sys.modules[__name__])


def cmd_run_plan(args):
    import recipe_plan
    recipe_plan.run(args, sys.modules[__name__])


# ---------------------------------------------------------------- main

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('build'); p.add_argument('recipe'); p.add_argument('--assembly')
    p.add_argument('--from', dest='start'); p.add_argument('--no-cache', action='store_true')
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--allow-changed', action='store_true', help='rebuild even though a pinned input changed (recovery only)')
    p.set_defaults(func=cmd_build)
    p = sub.add_parser('status'); p.add_argument('recipe'); p.set_defaults(func=cmd_status)
    p = sub.add_parser('pin', help='freeze and pin every file each step reads')
    p.add_argument('recipe'); p.add_argument('--write', action='store_true'); p.set_defaults(func=cmd_pin)
    p = sub.add_parser('minutes', help='record the build minutes of each step from its existing output')
    p.add_argument('recipe'); p.add_argument('--write', action='store_true'); p.set_defaults(func=cmd_minutes)
    p = sub.add_parser('seed'); p.add_argument('recipe'); p.add_argument('--write-expect', action='store_true')
    p.add_argument('--strict', action='store_true', help='accepted and ignored: strict is the default')
    p.add_argument('--loose', action='store_true', help='map keys to outputs whose recorded bytes do not match (explicit recovery)')
    p.set_defaults(func=cmd_seed)
    p = sub.add_parser('set'); p.add_argument('recipe'); p.add_argument('out'); p.add_argument('step')
    p.add_argument('pairs', nargs=argparse.REMAINDER); p.set_defaults(func=cmd_set)
    p = sub.add_parser('add'); p.add_argument('recipe'); p.add_argument('out'); p.add_argument('--after', required=True)
    p.add_argument('--step', required=True); p.add_argument('--rewire', action='append'); p.set_defaults(func=cmd_add)
    p = sub.add_parser('rebase', help='re-cut a candidate onto a newer base recipe')
    p.add_argument('paths', nargs='+', help='<new base> <candidate> <out>, or <old base> <new base> <candidate> <out>')
    p.add_argument('--live', action='store_true', help='pin the candidate files as they are now instead of freezing candidate-time bytes (a tool script improved since the candidate was committed)')
    p.set_defaults(func=cmd_rebase)
    p = sub.add_parser('merge'); p.add_argument('base'); p.add_argument('a'); p.add_argument('b'); p.add_argument('out')
    p.set_defaults(func=cmd_merge)
    p = sub.add_parser('verify'); p.add_argument('recipe'); p.add_argument('--no-cache', action='store_true')
    p.add_argument('--no-packet', action='store_true'); p.set_defaults(func=cmd_verify)
    p = sub.add_parser('contain'); p.add_argument('recipe'); p.add_argument('step'); p.add_argument('--out-dir')
    p.add_argument('--zones')
    p.add_argument('--no-reference', action='store_true', help='skip the baseline-relative allowance (flat .002 only)')
    p.set_defaults(func=cmd_contain)
    p = sub.add_parser('sweep', help='try several values of one step parameters; build, quick, score and rank them')
    p.add_argument('recipe'); p.add_argument('--step', required=True)
    p.add_argument('--grid', action='append', help='<arg>=<v1>,<v2>,...; a --flag or spec:<dotted.path>; several grids form a product')
    p.add_argument('--variants', help='JSON file: a list of {arg: value} dicts')
    p.add_argument('--max', type=int, default=12); p.add_argument('--region'); p.add_argument('--out')
    p.add_argument('--top', type=int, default=6, help='variants shown in sweep.png')
    p.add_argument('--contain-tol', type=float, default=.004, help='foreign displacement (figure heights) tolerated before the total is charged')
    p.set_defaults(func=cmd_sweep)
    p = sub.add_parser('candidate', help='one call per candidate: build, check, packet, measured, diff, seams, contain; prints one JSON summary')
    p.add_argument('recipe'); p.add_argument('--baseline', required=True, help='baseline packet directory (or its assembly name)')
    p.add_argument('--region'); p.add_argument('--assembly-name', default='auto')
    p.add_argument('--base', help='base recipe the candidate was cut from (default: its derivedFrom block, else the live recipe.json)')
    p.add_argument('--dry-run', action='store_true')
    p.set_defaults(func=cmd_candidate)
    p = sub.add_parser('run-plan', help='execute a plan.json: variants and sweeps, built, scored, the top K taken through candidate; one blocking command')
    p.add_argument('plan'); p.add_argument('--top', type=int, help='candidates taken through the full candidate path (default: top in the plan, else 3)')
    p.add_argument('--dry-run', action='store_true', help='write the candidate recipes to a temporary folder and print what would build and the estimated minutes')
    p.set_defaults(func=cmd_run_plan)
    args = parser.parse_args()
    args.func(args)


if __name__ == '__main__':
    main()
