"""Preflight for a construction batch: the checks the orchestrator runs before every batch, in order, failing loudly.

    python art/species-construction/loop/loop_preflight.py <species> [--args-out FILE] [--skip-python-tests] [--stop]

Run from the repository root. Each check is a separate process; all of them run (so one report shows every problem) unless
--stop is given, and the exit status is 1 when any failed. A batch must not start on a nonzero exit.

  1  node tests            node --test art/species-construction/loop/test/
  2  python tests          python -m unittest discover -s art/species-construction/loop/test -p "test_*.py"
  3  workflow build        node build_workflow.mjs --check            (loop_workflow.js is not stale)
  4  recipe pins           recipe.py pin <recipe>                     (nothing left to pin or freeze)
  5  recipe status         recipe.py status <recipe>                  (every step cached, no CHANGED input, assembly built)
  6  workflow arguments    loop_state.py args <species> --out ...     (args.json written to --args-out)

--args-out is the file the arguments go to (default: the species loop folder's args.json, where loop_state.py puts it).
"""
import argparse
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
NODE = shutil.which('node') or 'node'
TAIL = 6


def run(cmd, cwd=ROOT):
    started = time.time()
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return result.returncode, (result.stdout+result.stderr), round(time.time()-started, 1)


def tail(text, n=TAIL):
    lines = [line.rstrip() for line in text.splitlines() if line.strip()]
    return lines[-n:]


def check_node_tests(ctx):
    code, out, secs = run([NODE, '--test', 'art/species-construction/loop/test/'])
    tests = re.search(r'^(?:#|\u2139) tests (\d+)', out, re.M)
    fail = re.search(r'^(?:#|\u2139) fail (\d+)', out, re.M)
    detail = f"{tests.group(1) if tests else '?'} tests, {fail.group(1) if fail else '?'} failed"
    return code == 0 and (fail is None or fail.group(1) == '0'), detail, out, secs


def check_python_tests(ctx):
    if ctx.skip_python_tests:
        return True, 'skipped (--skip-python-tests)', '', 0.0
    code, out, secs = run([sys.executable, '-m', 'unittest', 'discover', '-s', 'art/species-construction/loop/test', '-p', 'test_*.py'])
    ran = re.search(r'^Ran (\d+) tests?', out, re.M)
    return code == 0, f"{ran.group(1) if ran else '?'} tests, {'ok' if code == 0 else 'FAILED'}", out, secs


def check_workflow_build(ctx):
    code, out, secs = run([NODE, 'build_workflow.mjs', '--check'], cwd=HERE)
    return code == 0, ('loop_workflow.js is current' if code == 0 else 'loop_workflow.js is stale: run node build_workflow.mjs'), out, secs


def check_pins(ctx):
    code, out, secs = run([sys.executable, str(HERE/'recipe.py'), 'pin', str(ctx.recipe)])
    nothing = 'nothing to pin' in out
    detail = 'nothing to pin' if code == 0 and nothing else 'work to do: run recipe.py pin <recipe> --write, commit the frozen copies and the recipe'
    return code == 0 and nothing, detail, out, secs


def check_status(ctx):
    code, out, secs = run([sys.executable, str(HERE/'recipe.py'), 'status', str(ctx.recipe)])
    cached = re.search(r'^(\d+) of (\d+) steps cached; assembly (\S+)', out, re.M)
    problems = []
    if not cached:
        problems.append('no status summary')
    else:
        if cached.group(1) != cached.group(2):
            problems.append(f'{int(cached.group(2))-int(cached.group(1))} step(s) not cached')
        if cached.group(3) == 'not':
            problems.append('assembly not built')
    changed = re.findall(r'^CHANGED (.+?)\s+\(', out, re.M)
    if changed:
        problems.append('CHANGED '+', '.join(changed))
    if re.search(r'^unpinned inputs', out, re.M):
        problems.append('unpinned inputs')
    if re.search(r'^root .*(missing|hash differs)', out, re.M):
        problems.append('a root is missing or differs')
    ok = code == 0 and not problems
    return ok, (f'{cached.group(1)} of {cached.group(2)} steps cached, assembly {cached.group(3)}' if cached and ok else '; '.join(problems) or f'exit {code}'), out, secs


def check_args(ctx):
    target = Path(ctx.args_out) if ctx.args_out else None
    with tempfile.TemporaryDirectory() as tmp:
        code, out, secs = run([sys.executable, str(HERE/'loop_state.py'), 'args', ctx.species, '--out', str(target.parent if target else tmp)])
        if code == 0 and target and target.name != 'args.json':
            shutil.move(str(target.parent/'args.json'), str(target))
    where = re.search(r'wrote (.+?) \((\d+) bytes', out)
    return code == 0, (f"{target or where.group(1)} ({where.group(2)} bytes)" if where and code == 0 else f'exit {code}'), out, secs


CHECKS = [('node tests', check_node_tests), ('python tests', check_python_tests), ('workflow build', check_workflow_build),
          ('recipe pins', check_pins), ('recipe status', check_status), ('workflow args', check_args)]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('species')
    ap.add_argument('--args-out', help='file to write the workflow arguments to (default: the species loop folder args.json)')
    ap.add_argument('--skip-python-tests', action='store_true')
    ap.add_argument('--stop', action='store_true', help='stop at the first failing check')
    ctx = ap.parse_args(argv)
    ctx.recipe = ROOT/'docs/design/species-construction'/ctx.species/'recipe.json'
    if not ctx.recipe.is_file():
        sys.exit(f'preflight: no recipe at {ctx.recipe}')
    results = []
    for number, (name, fn) in enumerate(CHECKS, 1):
        try:
            ok, detail, out, secs = fn(ctx)
        except Exception as error:  # a check that cannot run is a failed check
            ok, detail, out, secs = False, f'could not run: {error}', '', 0.0
        results.append((number, name, ok, detail, out, secs))
        if not ok and ctx.stop:
            break
    print(f'preflight {ctx.species}   recipe {ctx.recipe.relative_to(ROOT).as_posix()}')
    print('-'*78)
    for number, name, ok, detail, out, secs in results:
        print(f"{number}  {'PASS' if ok else 'FAIL'}  {name:<15} {detail}  ({secs:.0f}s)")
    failed = [r for r in results if not r[2]]
    for number, name, ok, detail, out, secs in failed:
        print(f'\n--- {name}: last lines ---')
        print('\n'.join(tail(out, 12)))
    print('-'*78)
    if failed or len(results) < len(CHECKS):
        print(f"PREFLIGHT FAILED: {', '.join(r[1] for r in failed)}. Do not start the batch.")
        sys.exit(1)
    print('PREFLIGHT OK: the batch may start.')


if __name__ == '__main__':
    main()
