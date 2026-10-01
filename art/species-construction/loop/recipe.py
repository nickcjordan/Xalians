"""A creature is a replayable recipe: pinned roots, a DAG of build steps, one assembly.

  python art/species-construction/loop/recipe.py build <recipe.json> [--assembly NAME] [--from STEP] [--no-cache] [--dry-run]
  python art/species-construction/loop/recipe.py status <recipe.json>
  python art/species-construction/loop/recipe.py seed <recipe.json> [--write-expect] [--strict]
  python art/species-construction/loop/recipe.py set <recipe.json> <out.json> <step id> <arg> <value> [<arg> <value> ...]
  python art/species-construction/loop/recipe.py add <recipe.json> <out.json> --after <step id> --step <step.json> [--rewire STEP:INPUT ...]
  python art/species-construction/loop/recipe.py merge <base.json> <a.json> <b.json> <out.json>
  python art/species-construction/loop/recipe.py verify <recipe.json> [--no-cache] [--no-packet]
  python art/species-construction/loop/recipe.py contain <recipe.json> <step id> [--out-dir NAME] [--zones FILE]

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

ROOT = rs.ROOT
LOOP_TOOLS = HERE/'loop_tools.py'
ASSEMBLER = 'art/species-construction/assemble_reconstructed_creature.py'
DEFAULT_JOIN = {'head-scale': .5, 'jaw-anchor-z': .5, 'head-depth-offset': -.02}
BOUNDS_TOLERANCE_HEIGHTS = 1e-4
FIGURE_HEIGHT = 1.8605
NUMBER = re.compile(r'^[a-z-]+-(\d{4})')
LOCK = threading.RLock()


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


def dump(data, path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
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

def make_plan(recipe, cache, force_from=None, no_cache=False):
    keys = compute_keys(recipe)
    if force_from and force_from not in recipe.byid:
        fail(f'--from {force_from}: no such step')
    forced = set(recipe.byid) if no_cache else (recipe.descendants(force_from) if force_from else set())
    plan = {}
    for step in recipe.order:
        hit = None if step['id'] in forced else cache.get('steps', keys[step['id']])
        plan[step['id']] = {'key': keys[step['id']], 'dir': hit['dir'] if hit else None}
    rebuilt_head_or_body = any(plan[recipe.assembly[s]]['dir'] is None for s in ('head', 'body'))
    asm_hit = None if (no_cache or rebuilt_head_or_body) else cache.get('assemblies', keys['assembly'])
    plan['assembly'] = {'key': keys['assembly'], 'dir': asm_hit['dir'] if asm_hit else None}
    return plan, keys


def print_plan(recipe, plan):
    rows = [(s['id'], plan[s['id']]['dir'] or '-> build', plan[s['id']]['key'][:12]) for s in recipe.order]
    rows.append(('assembly', plan['assembly']['dir'] or '-> build', plan['assembly']['key'][:12]))
    width = max(len(r[0]) for r in rows)
    for sid, state, key in rows:
        print(f'  {sid:<{width}}  {key}  {state}')
    todo = [r[0] for r in rows if r[1] == '-> build']
    print('builds: '+(', '.join(todo) if todo else 'nothing'))


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
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if result.returncode or not out.is_dir():
        tail = '\n'.join((result.stdout+result.stderr).splitlines()[-25:])
        fail(f"step {step['id']} failed ({name}); log {recipe.work/(name+'.log')}\n{tail}")
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
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
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
    print_plan(recipe, plan)
    stale = [s['id'] for s in recipe.order if not plan[s['id']]['dir']]
    print(f"{len(recipe.order)-len(stale)} of {len(recipe.order)} steps cached"
          f"{'; assembly '+plan['assembly']['dir'] if plan['assembly']['dir'] else '; assembly not built'}")


def cmd_build(args):
    recipe = load(args.recipe)
    cache = Cache(recipe)
    plan, keys = make_plan(recipe, cache, args.start, args.no_cache)
    print_plan(recipe, plan)
    if args.dry_run:
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


def cmd_seed(args):
    recipe = load(args.recipe)
    cache = Cache(recipe)
    keys = compute_keys(recipe)
    dirs = {s['id']: s['existing'] for s in recipe.steps if s.get('existing')}
    problems, rows = 0, []
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
        cache.put('steps', keys[step['id']], {'dir': existing, 'step': step['id'], 'seeded': True,
                                              'built': datetime.datetime.now().isoformat(timespec='seconds')})
        pin = script_pin(step, directory)
        cover = input_coverage(recipe, step, dirs)
        if 'MISMATCH' in pin or (cover and cover['recordedNotFed']):
            problems += 1
        rows.append((step['id'], existing, keys[step['id']][:12], pin, cover))
        if args.write_expect:
            step['expect'] = measure_output(directory)
    asm = recipe.assembly
    if asm.get('existing') and (recipe.work/asm['existing']).is_dir():
        cache.put('assemblies', keys['assembly'], {'dir': asm['existing'], 'head': dirs[asm['head']], 'body': dirs[asm['body']],
                                                   'seeded': True, 'built': datetime.datetime.now().isoformat(timespec='seconds')})
        rows.append(('assembly', asm['existing'], keys['assembly'][:12], '-', None))
        if args.write_expect:
            asm['expect'] = assembly_summary(recipe.work/asm['existing'])
    if args.write_expect:
        recipe.data['steps'] = recipe.steps
        dump(recipe.data, recipe.path)
        say(f'wrote expect blocks into {recipe.path}')
    for sid, existing, key, pin, cover in rows:
        extra = ''
        if cover is not None:
            extra = f" inputs: recorded-not-fed {cover['recordedNotFed'] or 'none'}, fed-not-recorded {cover['fedNotRecorded'] or 'none'}"
        print(f'{sid:<9} {existing:<22} {key}  script {pin};{extra}')
    print(f'seeded {len(rows)} entries into {cache.path}; problems: {problems}')
    if args.strict and problems:
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


def cmd_set(args):
    recipe = load(args.recipe)
    data = copy.deepcopy(recipe.data)
    step = next((s for s in data['steps'] if s['id'] == args.step), None)
    if step is None:
        fail(f'no step {args.step}')
    if len(args.pairs) % 2:
        fail('arguments after the step id come in pairs: <arg> <value>')
    out = Path(args.out).resolve()
    spec_doc, spec_file = None, None
    for key, value in zip(args.pairs[0::2], args.pairs[1::2]):
        if key.startswith('--'):
            set_cli_arg(step, key, value)
        elif key.startswith('spec:'):
            if spec_doc is None:
                if '--spec' not in step['args']:
                    fail(f'step {args.step} has no --spec argument')
                source = step['args'][step['args'].index('--spec')+1]
                spec_doc = json.loads(Path(resolve(source, {}, Path('.'))).read_text(encoding='utf-8'))
                spec_file = out.with_name(f'{out.stem}.{args.step}.spec.json')
            try:
                parsed = json.loads(value)
            except ValueError:
                parsed = value
            set_path(spec_doc, key[len('spec:'):], parsed)
        else:
            fail(f'{key}: an argument is a --flag or spec:<dotted.path>')
    if spec_doc is not None:
        spec_file.write_bytes((json.dumps(spec_doc, indent=1)+'\n').encode('utf-8'))
        index = step['args'].index('--spec')+1
        try:
            step['args'][index] = '{repo}/'+spec_file.relative_to(ROOT).as_posix()
        except ValueError:  # a candidate outside the repository keeps an absolute path
            step['args'][index] = spec_file.as_posix()
    drop_expect(data, [args.step])
    dump(data, out)
    candidate = load(out)
    plan, _ = make_plan(candidate, Cache(candidate))
    say(f'wrote {out}')
    print_plan(candidate, plan)


def cmd_add(args):
    recipe = load(args.recipe)
    data = copy.deepcopy(recipe.data)
    new = json.loads(Path(args.step).read_text(encoding='utf-8'))
    ids = [s['id'] for s in data['steps']]
    if new['id'] in ids:
        fail(f"step id {new['id']} already exists")
    if args.after not in ids:
        fail(f'no step {args.after}')
    slots = [name for name, ref in new['inputs'].items() if ref == args.after]
    position = ids.index(args.after)+1
    data['steps'].insert(position, new)
    rewire = [tuple(x.split(':')) for x in args.rewire or []]
    for step in data['steps']:
        if step['id'] == new['id']:
            continue
        for name, ref in list(step['inputs'].items()):
            if ref == args.after:
                same_slot = name in slots and step.get('kind') == new.get('kind')
                if same_slot or (step['id'], name) in rewire:
                    step['inputs'][name] = new['id']
    for sink in ('head', 'body'):
        if data['assembly'][sink] == args.after and new.get('kind') == sink:
            data['assembly'][sink] = new['id']
    drop_expect(data, [new['id']])
    out = Path(args.out).resolve()
    dump(data, out)
    candidate = load(out)  # validates the DAG
    plan, _ = make_plan(candidate, Cache(candidate))
    say(f'wrote {out}')
    print_plan(candidate, plan)


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
    dump(out, Path(args.out))
    candidate = load(args.out)
    plan, _ = make_plan(candidate, Cache(candidate))
    say(f'wrote {args.out}')
    print_plan(candidate, plan)


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
    result = subprocess.run([sys.executable, str(LOOP_TOOLS), *argv], cwd=ROOT, capture_output=True, text=True)
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


def cmd_contain(args):
    import numpy as np
    from scipy.spatial import cKDTree
    recipe = load(args.recipe)
    cache = Cache(recipe)
    step = recipe.byid.get(args.step)
    if step is None:
        fail(f'no step {args.step}')
    zones, species = load_zones(recipe, args.zones)
    frame = species.get('frame', {})
    floor, height = frame.get('floorZ', -.957), frame.get('fixedHeight', FIGURE_HEIGHT)
    plan, keys = make_plan(recipe, cache)
    out_name = args.out_dir or plan[args.step]['dir']
    if not out_name:
        fail(f'step {args.step} is not built; build it first or pass --out-dir')
    entry = next((e for e in cache._load()['steps'].values() if e['dir'] == out_name), {})
    primary = 'base' if 'base' in step['inputs'] else next(iter(step['inputs']))
    ref = step['inputs'][primary]
    base_dir = recipe.work/(recipe.roots[ref]['dir'] if ref in recipe.roots else plan[ref]['dir'] or '')
    if not (base_dir/'shape.glb').is_file():
        fail(f'baseline {base_dir}/shape.glb not found (input {ref} is not built)')
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
    owned = [r for r in step.get('regions', [])]
    if any(r not in zones for r in owned):
        fail(f'step {args.step} owns a region with no zone ({owned}); the whole figure is its zone')
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
    report = {'step': args.step, 'output': out_name, 'baseline': base_dir.name, 'ownedRegions': owned, 'unit': 'figureHeight',
              'note': 'nearest-vertex displacement both ways, as in mesh_delta.py; a remeshed field has a noise floor near .002',
              'foreign': foreign,
              'outsideAllZones': ({'vertices': int(loose.sum()), 'p95': round(float(np.percentile(dist[loose], 95)), 5),
                                   'max': round(float(dist[loose].max()), 5)} if loose.any() else {'vertices': 0, 'p95': 0.0, 'max': 0.0}),
              'ownedMax': round(float(dist[own_mask].max()), 5) if own_mask.any() else 0.0}
    target = recipe.work/out_name/'containment.json' if not entry.get('seeded') else recipe.work/f'{out_name}.containment.json'
    target.write_bytes((json.dumps(report, indent=1)+'\n').encode('utf-8'))
    worst = max(foreign.items(), key=lambda kv: kv[1]['max'], default=(None, {'max': 0}))
    print(json.dumps({'written': str(target), 'worstForeign': worst[0], 'max': worst[1]['max'],
                      'outsideAllZonesMax': report['outsideAllZones']['max']}))


# ---------------------------------------------------------------- main

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('build'); p.add_argument('recipe'); p.add_argument('--assembly')
    p.add_argument('--from', dest='start'); p.add_argument('--no-cache', action='store_true')
    p.add_argument('--dry-run', action='store_true'); p.set_defaults(func=cmd_build)
    p = sub.add_parser('status'); p.add_argument('recipe'); p.set_defaults(func=cmd_status)
    p = sub.add_parser('seed'); p.add_argument('recipe'); p.add_argument('--write-expect', action='store_true')
    p.add_argument('--strict', action='store_true'); p.set_defaults(func=cmd_seed)
    p = sub.add_parser('set'); p.add_argument('recipe'); p.add_argument('out'); p.add_argument('step')
    p.add_argument('pairs', nargs=argparse.REMAINDER); p.set_defaults(func=cmd_set)
    p = sub.add_parser('add'); p.add_argument('recipe'); p.add_argument('out'); p.add_argument('--after', required=True)
    p.add_argument('--step', required=True); p.add_argument('--rewire', action='append'); p.set_defaults(func=cmd_add)
    p = sub.add_parser('merge'); p.add_argument('base'); p.add_argument('a'); p.add_argument('b'); p.add_argument('out')
    p.set_defaults(func=cmd_merge)
    p = sub.add_parser('verify'); p.add_argument('recipe'); p.add_argument('--no-cache', action='store_true')
    p.add_argument('--no-packet', action='store_true'); p.set_defaults(func=cmd_verify)
    p = sub.add_parser('contain'); p.add_argument('recipe'); p.add_argument('step'); p.add_argument('--out-dir')
    p.add_argument('--zones'); p.set_defaults(func=cmd_contain)
    args = parser.parse_args()
    args.func(args)


if __name__ == '__main__':
    main()
