"""Run the Akinza rebuild plan step by step, in isolated source trees.

Every step in docs/design/species-construction/akinza/rebuild-plan.json carries a
`run` block. This runner turns it into a real process:

  * tree: git archive of the step's commit (art/species-construction and
    docs/design/species-construction), then the step's recovered-script overlays,
    generated files and explicit find-and-replace edits, then two junctions:
    untracked/species-construction/akinza -> {DATA} and untracked/tools -> {TOOLS}.
    Trees live in C:/dev/art-data/rebuild/trees/<step>; a tree is reused only if its
    manifest matches, and never silently replaced.
  * argv: placeholders {TREE} {DATA} {WSL_TREE} {WSL_DATA} {TOOLS} {WIN_BLENDER}
    {WSL_BLENDER} {SHAPE_PY} {SYSTEM_PY} {LOG} are filled in.
  * Blender work (windows-blender, wsl-blender, loop-tools) goes through the shared
    two-slot limit from the loop branch's loop_tools.acquire_slot, so a head lane
    and a body lane can run in parallel processes.
  * Hunyuan runs take a separate one-slot GPU lock ({DATA}/.gpu-slot.lock), so the
    two lanes never run inference at the same time on the 8 GB laptop GPU.
  * Each run writes C:/dev/art-data/rebuild/log/<step>.json with the command, exit
    code, elapsed time, output hashes, statistics read from the stage records and a
    comparison with the plan: match, drift or fail. A fail stops the run.

Usage:
  python art/species-construction/rebuild/run_rebuild.py --preflight
  python art/species-construction/rebuild/run_rebuild.py --dry-run [--lane head|body|all]
  python art/species-construction/rebuild/run_rebuild.py --lane head      (in one terminal)
  python art/species-construction/rebuild/run_rebuild.py --lane body      (in another)
  python art/species-construction/rebuild/run_rebuild.py --lane all --from A01
  python art/species-construction/rebuild/run_rebuild.py --step S01
  python art/species-construction/rebuild/run_rebuild.py --reverify --step S01   (recompare only)

Steps whose log already says match or drift are skipped. A step whose outputs exist
without such a log is refused; move the outputs away and rerun.
"""
import argparse
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
PLAN = REPO/'docs/design/species-construction/akinza/rebuild-plan.json'
ART = Path(os.environ.get('AKINZA_ART_DATA', r'C:\dev\art-data'))
DATA = ART/'species-construction'/'akinza'
TOOLS = ART/'tools'
TREES = ART/'rebuild'/'trees'
LOGS = ART/'rebuild'/'log'
WIN_BLENDER = Path(r'C:\Users\njord\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local'
                   r'\XaliansArtTools\blender-5.2.2-windows-x64\blender.exe')
WSL_BLENDER = '/home/njord/.local/opt/blender-5.2.2-linux-x64/blender'
SHAPE_PY = TOOLS/'shape-env'/'Scripts'/'python.exe'
UV_PYTHON = Path(r'C:\Users\njord\AppData\Roaming\uv\python\cpython-3.12.13-windows-x86_64-none\python.exe')
ART_VENV_SITE = 'C:/dev/src/xalians-art/.venv/Lib/site-packages'
BLENDER_INTERPRETERS = {'windows-blender', 'wsl-blender', 'loop-tools'}
HEX = re.compile(r'^[0-9a-f]{64}')


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as handle:
        for block in iter(lambda: handle.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def wsl_path(path):
    text = str(path).replace('\\', '/')
    m = re.match(r'^([A-Za-z]):/(.*)$', text)
    return f'/mnt/{m.group(1).lower()}/{m.group(2)}' if m else text


def placeholders(step_id):
    tree = TREES/step_id
    return {'{TREE}': str(tree), '{DATA}': str(DATA), '{WSL_TREE}': wsl_path(tree), '{WSL_DATA}': wsl_path(DATA),
            '{TOOLS}': str(TOOLS), '{WIN_BLENDER}': str(WIN_BLENDER), '{WSL_BLENDER}': WSL_BLENDER,
            '{SHAPE_PY}': str(SHAPE_PY), '{SYSTEM_PY}': sys.executable, '{LOG}': str(LOGS)}


def fill(value, table):
    if isinstance(value, str):
        for k, v in table.items():
            value = value.replace(k, v)
        return value
    if isinstance(value, list):
        return [fill(v, table) for v in value]
    if isinstance(value, dict):
        return {fill(k, table): fill(v, table) for k, v in value.items()}
    return value


def load_plan():
    plan = json.loads(PLAN.read_text(encoding='utf-8'))
    return plan, {s['id']: s for s in plan['steps']}


# ---------------------------------------------------------------- trees

def junction(link, target):
    if link.exists() or os.path.islink(link):
        if Path(os.path.realpath(link)) == Path(os.path.realpath(target)):
            return
        raise SystemExit(f'{link} exists and does not point at {target}')
    link.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['cmd', '/c', 'mklink', '/J', str(link), str(target)], check=True, capture_output=True)


def apply_edit(tree, edit, table):
    path = tree/edit['file']
    data = path.read_bytes().decode('utf-8')
    find, replace = fill(edit['find'], table), fill(edit['replace'], table)
    count = data.count(find)
    if count == 0:
        if replace in data:
            return 'already applied'
        raise SystemExit(f'Edit target not found in {path}: {find[:80]!r}')
    if edit.get('count') and count != edit['count']:
        raise SystemExit(f'Edit in {path} expected {edit["count"]} matches, found {count}')
    path.write_bytes(data.replace(find, replace).encode('utf-8'))
    return f'applied {count}'


def materialize(step, table, log=print):
    spec = step['run']['tree']
    tree = TREES/step['id']
    manifest = {'commit': spec['commit'], 'paths': spec.get('paths', ['art/species-construction', 'docs/design/species-construction']),
                'overlays': spec.get('overlays', []), 'files': [f['path'] for f in spec.get('files', [])],
                'edits': spec.get('edits', [])}
    marker = tree/'.rebuild-tree.json'
    if marker.exists():
        old = json.loads(marker.read_text(encoding='utf-8'))
        if {k: old.get(k) for k in manifest} != manifest:
            raise SystemExit(f'{tree} was built from a different spec; move it away to rebuild it')
        return tree, old.get('results', {})
    if tree.exists() and any(tree.iterdir()):
        raise SystemExit(f'{tree} exists without a manifest; move it away')
    tree.mkdir(parents=True, exist_ok=True)
    archive = subprocess.run(['git', '-C', str(REPO), 'archive', spec['commit'], *manifest['paths']],
                             capture_output=True, check=True).stdout
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        tar.extractall(tree, filter='tar')
    results = {'resolvedCommit': subprocess.run(['git', '-C', str(REPO), 'rev-parse', spec['commit']],
                                                capture_output=True, text=True, check=True).stdout.strip()}
    for overlay in manifest['overlays']:
        source, target = REPO/overlay['from'], tree/overlay['to']
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        got = sha(target)
        if overlay.get('sha256') and got != overlay['sha256']:
            raise SystemExit(f'Overlay {source} hashes {got}, expected {overlay["sha256"]}')
        results[overlay['to']] = got
    for generated in spec.get('files', []):
        target = tree/generated['path']
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(generated['content'].encode('utf-8'))
    results['edits'] = [apply_edit(tree, e, table) for e in manifest['edits']]
    junction(tree/'untracked'/'species-construction'/'akinza', DATA)
    junction(tree/'untracked'/'tools', TOOLS)
    marker.write_text(json.dumps({**manifest, 'results': results}, indent=2)+'\n', encoding='utf-8')
    log(f'  tree {tree} from {spec["commit"]} ({results["resolvedCommit"][:8]}); edits {results["edits"]}')
    return tree, results


# ---------------------------------------------------------------- execution helpers

def slot_lock():
    sys.path.insert(0, str(REPO/'art/species-construction/loop'))
    import loop_tools  # the loop branch's two-slot limit, shared with loop runs
    return loop_tools.acquire_slot()


def gpu_lock():
    """One Hunyuan run at a time: two at once would pass the laptop GPU's 8 GB."""
    sys.path.insert(0, str(REPO/'art/species-construction/loop'))
    import loop_tools
    path = DATA/'.gpu-slot.lock'
    while True:
        try:
            fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, str(os.getpid()).encode()); os.close(fd)
            return path
        except FileExistsError:
            try:
                pid = int(path.read_text().strip() or 0)
            except (OSError, ValueError):
                pid = 0
            if pid and not loop_tools.pid_alive(pid):
                path.unlink(missing_ok=True)
                continue
            time.sleep(5)


def command_list(step, table):
    run = step['run']
    commands = run.get('commands') or [run['argv']]
    out = []
    for argv in commands:
        argv = fill(argv, table)
        if run['interpreter'] == 'wsl-blender':
            argv = ['wsl', '-e', *argv]
        out.append(argv)
    return out


def lookup(record, dotted):
    value = record
    for part in dotted.split('.'):
        if isinstance(value, dict) and part in value:
            value = value[part]
        elif part == '*continuous*' and isinstance(value, dict):
            value = next(v for k, v in value.items() if 'continuous' in k)
        else:
            return None
    return value


def roots_reproduced(step, steps):
    """True if every Hunyuan root upstream of this step reproduced its mesh bit for bit."""
    seen, todo, roots = set(), [step['id']], []
    while todo:
        sid = todo.pop()
        if sid in seen:
            continue
        seen.add(sid)
        if steps[sid]['kind'] == 'hunyuan':
            roots.append(sid)
        todo.extend(steps[sid].get('dependsOn', []))
    for sid in roots:
        path = LOGS/f'{sid}.json'
        if not path.exists():
            return False
        record = json.loads(path.read_text(encoding='utf-8'))
        if not all(h['result'] == 'match' for h in record.get('hashes', {}).values()):
            return False
    return True


def compare(step, steps, table, exit_code, text):
    run = step['run']
    result = {'hashes': {}, 'checks': [], 'problems': []}
    expect_exit = run.get('expectExit', 0)
    if (expect_exit == 'nonzero' and exit_code == 0) or (expect_exit != 'nonzero' and exit_code != expect_exit):
        result['problems'].append(f'exit code {exit_code}, expected {expect_exit}')
    for pattern in run.get('expectLog', []):
        if pattern not in text:
            result['problems'].append(f'log lacks {pattern!r}')
    for output in fill(run.get('outputs', []), table):
        if not Path(output).exists():
            result['problems'].append(f'missing output {output}')
    for rel, want in fill(run.get('hashes', {}), table).items():
        path = Path(rel)
        got = sha(path) if path.is_file() else None
        result['hashes'][rel] = {'expected': want, 'got': got,
                                 'result': 'match' if got == want else ('missing' if got is None else 'differs')}
        if got is None:
            result['problems'].append(f'missing hashed output {rel}')
    result['outputHashes'] = {o: sha(o) for o in fill(run.get('outputs', []), table) if Path(o).is_file()}
    exact_counts = roots_reproduced(step, steps)
    for check in run.get('checks', []):
        path = Path(fill(check['file'], table))
        got = lookup(json.loads(path.read_text(encoding='utf-8')), check['key']) if path.exists() else None
        want, kind = check['expect'], check.get('kind', 'count')
        if got is None:
            verdict = 'fail'
        elif kind == 'count' and not exact_counts:
            verdict = 'match' if got == want else ('drift' if abs(got-want) <= .02*abs(want) else 'fail')
        else:
            verdict = 'match' if got == want else 'fail'
        result['checks'].append({**check, 'got': got, 'result': verdict,
                                 'tolerance': 'exact' if kind != 'count' or exact_counts else '2 percent'})
    if result['problems'] or any(c['result'] == 'fail' for c in result['checks']):
        result['verdict'] = 'fail'
    elif any(h['result'] != 'match' for h in result['hashes'].values()) or any(c['result'] == 'drift' for c in result['checks']):
        result['verdict'] = 'drift'
    else:
        result['verdict'] = 'match'
    return result


def verified(step_id):
    path = LOGS/f'{step_id}.json'
    return path.exists() and json.loads(path.read_text(encoding='utf-8')).get('verdict') in ('match', 'drift')


def reverify(step, steps):
    """Recompute the comparison of an already-run step from its saved exit code and output."""
    path = LOGS/f"{step['id']}.json"
    if not path.exists():
        raise SystemExit(f"{step['id']} has no log to reverify")
    record = json.loads(path.read_text(encoding='utf-8'))
    table = placeholders(step['id'])
    text = Path(record['stdout']).read_text(encoding='utf-8') if Path(record['stdout']).exists() else ''
    result = compare(step, steps, table, record['exitCode'], text)
    record.update(result)
    record['reverifiedAt'] = time.strftime('%Y-%m-%dT%H:%M:%S')
    path.write_text(json.dumps(record, indent=2)+'\n', encoding='utf-8')
    print(f"{step['id']} reverified: {result['verdict']} {result['problems']}")


def run_step(step, steps, plan, dry_run):
    table = placeholders(step['id'])
    tree, tree_results = materialize(step, table)
    commands = command_list(step, table)
    cwd = fill(step['run'].get('cwd', '{TREE}'), table)
    print(f"{step['id']} {step['output']} [{step['run']['interpreter']}] cwd={cwd}")
    for argv in commands:
        print('   ' + subprocess.list2cmdline(argv))
    if step['run'].get('internal'):
        print(f"   then internal: {step['run']['internal']}")
    if dry_run:
        return 'dry-run'
    if verified(step['id']):
        print('   already verified; skipped')
        return 'skipped'
    for missing in [d for d in step.get('dependsOn', []) if not verified(d)]:
        raise SystemExit(f"{step['id']} depends on {missing}, which has no verified log")
    existing = [o for o in fill(step['run'].get('guard', step['run'].get('outputs', [])), table) if Path(o).exists()]
    if existing:
        raise SystemExit(f"{step['id']}: outputs already exist without a verified log: {existing}")
    LOGS.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, **fill(step['run'].get('env', {}), table)}
    slot = slot_lock() if step['run']['interpreter'] in BLENDER_INTERPRETERS else (gpu_lock() if step['kind'] == 'hunyuan' else None)
    start, texts, code = time.monotonic(), [], 0
    try:
        for argv in commands:
            proc = subprocess.run(argv, cwd=cwd, env=env, capture_output=True, text=True, errors='replace')
            texts.append(proc.stdout + proc.stderr)
            code = proc.returncode
            if code != 0:
                break
    finally:
        if slot:
            slot.unlink(missing_ok=True)
    elapsed = time.monotonic()-start
    text = '\n'.join(texts)
    (LOGS/f"{step['id']}.out").write_text(text, encoding='utf-8')
    extra = {}
    if step['run'].get('internal') == 'acceptance' and code == 0:
        extra = acceptance(step, table, texts)
    result = compare(step, steps, table, code, text)
    if extra:
        result['acceptance'] = extra
        if extra.get('fail'):
            result['verdict'] = 'fail'
            result['problems'].extend(extra['fail'])
    record = {'step': step['id'], 'output': step['output'], 'commands': commands, 'cwd': cwd, 'tree': str(tree),
              'treeResults': tree_results, 'exitCode': code, 'elapsedSeconds': round(elapsed, 1),
              'stdout': str(LOGS/f"{step['id']}.out"), **result}
    (LOGS/f"{step['id']}.json").write_text(json.dumps(record, indent=2)+'\n', encoding='utf-8')
    print(f"   {result['verdict']} in {elapsed:.0f}s; log {LOGS/(step['id']+'.json')}")
    for problem in result['problems']:
        print('   problem: ' + problem)
    if result['verdict'] == 'fail':
        raise SystemExit(f"{step['id']} failed; stopping")
    return result['verdict']


# ---------------------------------------------------------------- acceptance

def acceptance(step, table, texts):
    """Compare the rebuilt assembly with the saved evidence in rebuild/acceptance."""
    import numpy as np
    from PIL import Image
    spec = json.loads((REPO/step['run']['acceptanceFile']).read_text(encoding='utf-8'))
    tree = Path(table['{TREE}'])
    sys.path.insert(0, str(tree/'art/species-construction/loop'))
    import build_loop_page
    render = DATA/spec['assembly']/'render'
    out, fail = {}, []
    tol = spec['tolerances']
    parsed = []
    for text in texts:
        try:
            parsed.append(json.loads(text[text.index('{'):text.rindex('}')+1]))
        except ValueError:
            parsed.append(None)
    check, measure = parsed[0] or {}, parsed[1] or {}
    out['check'] = {k: {'expected': v, 'got': check.get(k)} for k, v in spec['check'].items()}
    for k, v in spec['check'].items():
        got = check.get(k)
        ok = got == v if k != 'vertices' else (got is not None and abs(got-v) <= .02*v)
        if not ok:
            fail.append(f'check {k}: {got} against {v}')
    out['measurementRatios'] = {}
    for view, ratios in spec['measurementRatios'].items():
        for k, v in ratios.items():
            got = (measure.get(view) or {}).get(k)
            out['measurementRatios'][f'{view}.{k}'] = {'expected': v, 'got': got}
            if got is None or abs(got-v) > tol['measurementRatio']:
                fail.append(f'measurement {view}.{k}: {got} against {v}')
    fit = json.loads((LOGS/f"{step['id']}-fit"/'fit.json').read_text(encoding='utf-8'))
    out['fit'] = {}
    for view, bands in spec['fit'].items():
        for band, v in bands.items():
            got = ((fit['views'].get(view) or {}).get(band) or {}).get('iou')
            out['fit'][f'{view}.{band}'] = {'expected': v, 'got': got}
            if got is None or abs(got-v) > tol['fitIoU']:
                fail.append(f'fit {view}.{band}: {got} against {v}')
    geometry = json.loads((render/'geometry.json').read_text(encoding='utf-8'))
    bounds = geometry.get('bounds')
    height = round(bounds[1][2]-bounds[0][2], 4) if bounds else None
    out['figureHeight'] = {'expected': spec['figureHeight'], 'got': height, 'measuredAs': 'render/geometry.json bounds z span'}
    if height is None or abs(height-spec['figureHeight']) > tol['figureHeight']:
        fail.append(f'figure height {height} against {spec["figureHeight"]}')
    # Six views: same crop as the review page, then its 1800 px JPEG encoding.
    row = build_loop_page.view_row(render)
    row = row.resize((1800, round(row.height*1800/row.width)), Image.LANCZOS)
    buffer = io.BytesIO()
    row.save(buffer, 'JPEG', quality=82, optimize=True, progressive=True)
    new = Image.open(io.BytesIO(buffer.getvalue())).convert('RGB')
    saved = Image.open(REPO/'docs/design/species-construction/akinza/rebuild/acceptance'/spec['sixViews'].split(':')[0]).convert('RGB')
    compare_new = new if new.size == saved.size else new.resize(saved.size, Image.LANCZOS)
    a, b = np.asarray(compare_new, dtype=np.int16), np.asarray(saved, dtype=np.int16)
    diff = np.abs(a-b).mean(axis=2)
    ma, mb = a.mean(axis=2) < 245, b.mean(axis=2) < 245
    cells = []
    width = saved.width//6
    for k, name in enumerate(build_loop_page.VIEWS):
        sa, sb = ma[:, k*width:(k+1)*width], mb[:, k*width:(k+1)*width]
        union = (sa | sb).sum()
        cells.append({'view': name, 'meanAbsDifference': round(float(diff[:, k*width:(k+1)*width].mean()), 2),
                      'silhouetteIoU': round(float((sa & sb).sum()/union), 4) if union else None})
    new.save(LOGS/f"{step['id']}-six-views.jpg", quality=92)
    heat = Image.fromarray(np.clip(diff*4, 0, 255).astype('uint8'))
    sheet = Image.new('RGB', (saved.width, saved.height*3), 'white')
    sheet.paste(saved, (0, 0)); sheet.paste(compare_new, (0, saved.height)); sheet.paste(heat.convert('RGB'), (0, saved.height*2))
    sheet.save(LOGS/f"{step['id']}-six-views-comparison.png")
    out['sixViews'] = {'savedSize': saved.size, 'newSize': new.size, 'resizedForComparison': new.size != saved.size,
                       'cells': cells, 'comparisonImage': str(LOGS/f"{step['id']}-six-views-comparison.png"),
                       'note': 'Reported, not gated: rendering noise and JPEG encoding make small differences normal.'}
    out['fail'] = fail
    return out


# ---------------------------------------------------------------- preflight

def preflight(plan):
    report, problems = {}, []
    tc = plan['toolchain']
    # Weights: move the downloaded layout to the plan's, then hash all four files.
    moves = {TOOLS/'hunyuan-weights'/'Hunyuan3D-2mini': TOOLS/'hunyuan-mini-weights',
             TOOLS/'hunyuan-weights'/'Hunyuan3D-2': TOOLS/'hunyuan-full-weights'}
    for src, dst in moves.items():
        if src.exists() and not dst.exists():
            shutil.move(str(src), str(dst))
            report[f'moved {src.name}'] = str(dst)
    leftover = TOOLS/'hunyuan-weights'
    if leftover.exists() and not any(leftover.iterdir()):
        leftover.rmdir()
    for kind, folder, sub in [('mini', 'hunyuan-mini-weights', 'hunyuan3d-dit-v2-mini'), ('full', 'hunyuan-full-weights', 'hunyuan3d-dit-v2-0')]:
        for name, want in tc['hunyuan3d']['weightHashes'][kind].items():
            path = TOOLS/folder/sub/name
            got = sha(path) if path.exists() else None
            report[f'weights {kind} {name}'] = 'ok' if got == want else f'MISMATCH {got}'
            if got != want:
                problems.append(f'{path}: {got} != {want}')
    # Hunyuan checkout.
    head = subprocess.run(['git', '-C', str(TOOLS/'Hunyuan3D-2'), 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
    dirty = subprocess.run(['git', '-C', str(TOOLS/'Hunyuan3D-2'), 'status', '--porcelain'], capture_output=True, text=True).stdout.strip()
    report['Hunyuan3D-2 HEAD'] = head + (' (dirty)' if dirty else '')
    if head != tc['hunyuan3d']['checkoutCommit']:
        problems.append(f'Hunyuan3D-2 at {head}')
    # shape-env, exactly as recorded.
    venv = TOOLS/'shape-env'
    if not SHAPE_PY.exists():
        subprocess.run([str(UV_PYTHON), '-m', 'venv', '--system-site-packages', str(venv)], check=True)
        (venv/'Lib/site-packages/xalians_existing_art_runtime.pth').write_text(ART_VENV_SITE+'\n')
        for args in tc['hunyuan3d']['pipInstalls']:
            subprocess.run([str(SHAPE_PY), '-m', 'pip', 'install', '--disable-pip-version-check', *args], check=True)
        report['shape-env'] = 'built'
    else:
        report['shape-env'] = 'present'
    probe = ("import sys,torch,PIL,numpy,scipy,trimesh,diffusers,transformers,huggingface_hub,cv2,torchvision;"
             "print(sys.version.split()[0],torch.__version__,torch.cuda.is_available(),PIL.__version__,numpy.__version__,"
             "scipy.__version__,trimesh.__version__,diffusers.__version__,transformers.__version__,huggingface_hub.__version__,"
             "cv2.__version__,torchvision.__version__)")
    proc = subprocess.run([str(SHAPE_PY), '-c', probe], capture_output=True, text=True)
    report['shape-env versions'] = proc.stdout.strip() or proc.stderr.strip()[-400:]
    if proc.returncode:
        problems.append('shape-env import probe failed')
    proc = subprocess.run([str(SHAPE_PY), '-c', "import sys;sys.path.insert(0,r'%s');from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline;print('hy3dgen import ok')" % (TOOLS/'Hunyuan3D-2')],
                          capture_output=True, text=True)
    report['hy3dgen import'] = (proc.stdout.strip() or proc.stderr.strip()[-400:])
    if proc.returncode:
        problems.append('hy3dgen import failed')
    # Blender builds.
    for label, argv, want in [('windows', [str(WIN_BLENDER), '--version'], tc['windowsBlender']['version']),
                              ('wsl', ['wsl', '-e', WSL_BLENDER, '--version'], tc['wslLinuxBlender']['version'])]:
        proc = subprocess.run(argv, capture_output=True, text=True, errors='replace', timeout=180)
        lines = [l.strip() for l in proc.stdout.splitlines() if l.strip()]
        text = ' '.join(lines[:3])
        build_hash = re.search(r'build hash: (\w+)', proc.stdout)
        build_date = re.search(r'build date: ([\d-]+)', proc.stdout)
        build_time = re.search(r'build time: ([\d:]+)', proc.stdout)
        got = f"Blender {lines[0].split()[1] if lines else '?'}"
        report[f'blender {label}'] = {'version': lines[0] if lines else None, 'hash': build_hash and build_hash.group(1),
                                     'built': f"{build_date and build_date.group(1)} {build_time and build_time.group(1)}"}
        if not (build_hash and build_hash.group(1) in want and build_time and build_time.group(1) in want):
            problems.append(f'Blender {label}: {text}')
    for name, (path, want) in {'windows archive': (WIN_BLENDER.parents[1]/'blender-5.2.2-windows-x64.zip', tc['windowsBlender']['archiveSha256']['blender-5.2.2-windows-x64.zip']),
                               'linux archive': (WIN_BLENDER.parents[1]/'blender-5.2.2-linux-x64.tar.xz', tc['wslLinuxBlender']['archiveSha256']['blender-5.2.2-linux-x64.tar.xz'])}.items():
        got = sha(path) if path.exists() else None
        report[f'blender {name}'] = 'ok' if got == want else f'MISMATCH {got}'
        if got != want:
            problems.append(f'{path}: {got}')
    # Junction behaviour under WSL.
    probe_dir = TREES/'.wsl-junction-probe'
    probe_dir.mkdir(parents=True, exist_ok=True)
    junction(probe_dir/'data', DATA)
    proc = subprocess.run(['wsl', '-e', 'bash', '-c', f'test -d {wsl_path(probe_dir)}/data && readlink -f {wsl_path(probe_dir)}/data'],
                          capture_output=True, text=True)
    report['wsl follows junctions'] = proc.returncode == 0 and proc.stdout.strip() == wsl_path(DATA)
    subprocess.run(['cmd', '/c', 'rmdir', str(probe_dir/'data')], capture_output=True)
    probe_dir.rmdir()
    print(json.dumps({'report': report, 'problems': problems}, indent=2))
    return not problems


# ---------------------------------------------------------------- main

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--preflight', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--step', action='append')
    parser.add_argument('--from', dest='start')
    parser.add_argument('--to', dest='stop')
    parser.add_argument('--lane', choices=['head', 'body', 'all'], default='all')
    parser.add_argument('--reverify', action='store_true', help='recompute the comparison of already-run steps without running them')
    args = parser.parse_args()
    plan, steps = load_plan()
    if args.preflight:
        sys.exit(0 if preflight(plan) else 1)
    order = [s['id'] for s in plan['steps']]
    chosen = order
    if args.start:
        chosen = chosen[chosen.index(args.start):]
    if args.stop:
        chosen = chosen[:chosen.index(args.stop)+1]
    if args.lane != 'all':
        chosen = [sid for sid in chosen if steps[sid]['branch'] == args.lane]
    if args.step:
        chosen = [sid for sid in order if sid in args.step]
    for sid in chosen:
        if args.reverify:
            if (LOGS/f'{sid}.json').exists():
                reverify(steps[sid], steps)
            continue
        run_step(steps[sid], steps, plan, args.dry_run)


if __name__ == '__main__':
    main()
