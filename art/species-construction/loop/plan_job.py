"""Run a recipe plan as a detached job that outlives the agent that started it, and wait on it.

    python art/species-construction/loop/plan_job.py start <plan.json> [--top K]
    python art/species-construction/loop/plan_job.py wait <plan.json> [--timeout 560]

Round 21: a runner agent started `recipe.py run-plan` in the background, gave up after
15 minutes of an 89-minute plan, and its build died with it. `start` launches run-plan as a
detached process (it survives the agent), records its pid and log beside the plan, and returns
at once. `wait` blocks until the plan's result file exists or the job exits, at most --timeout
seconds (default 560, under the 10-minute tool limit), and prints one line: done, running or
failed. A runner calls `wait` again after every `running`; each call is one cheap turn.
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def paths(plan):
    plan = Path(plan).resolve()
    stem = plan.stem
    result = plan.with_name('plan-result.json' if stem == 'plan' else f'{stem}-plan-result.json')
    return plan, result, plan.with_name(f'{stem}.job.json'), plan.with_name(f'{stem}.job.log')


def alive(pid):
    if os.name == 'nt':
        # round 26: one tasklist call under load came back without the pid while the plan ran on, the
        # runner reported the plan failed and a second plan raced it; only three misses in a row count
        import time
        for attempt in range(3):
            try:
                out = subprocess.run(['tasklist', '/FI', f'PID eq {pid}', '/NH'], capture_output=True, text=True, timeout=60).stdout
            except (subprocess.TimeoutExpired, OSError):
                out = None
            if out is None or str(pid) in out:
                return True
            time.sleep(5)
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def inputs_mtime(plan):
    """Newest of the plan and the recipes it names. Round 22: a toolsmith's fix pass rewrote its starter
    recipe but not the check plan, so the recheck read the first check's stale result and a tool was
    judged on the candidate it had already replaced."""
    times = [plan.stat().st_mtime]
    try:
        data = json.loads(plan.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return times[0]
    start = data.get('start')
    refs = [data.get('base'), start.get('recipe') if isinstance(start, dict) else start]
    for ref in refs:
        if isinstance(ref, str) and ref:
            p = Path(ref) if Path(ref).is_absolute() else ROOT/ref
            if p.is_file():
                times.append(p.stat().st_mtime)
    return max(times)


def missing(plan):
    # A Windows path passed through bash loses its backslashes and names no file; say so plainly.
    print(json.dumps({'status': 'failed', 'reason': f'no plan file at {plan}; pass the path with forward slashes'}))
    return 2


def cmd_start(a):
    plan, result, job, log = paths(a.plan)
    if not plan.exists():
        return missing(plan)
    if job.exists():
        j = json.loads(job.read_text())
        if alive(j['pid']) and not result.exists():
            print(json.dumps({'status': 'running', 'pid': j['pid'], 'log': str(log), 'note': 'already started'}))
            return 0
    if result.exists() and result.stat().st_mtime >= inputs_mtime(plan):
        print(json.dumps({'status': 'done', 'result': str(result), 'note': 'result already exists'}))
        return 0
    if result.exists():
        # older than its inputs: keep it under another name so wait cannot report it as this run's
        result.replace(result.with_name(result.stem+f'-stale-{int(result.stat().st_mtime)}.json'))
    # round 27: a run-plan died during its candidate stage with nothing in its log; a supervisor now runs it with
    # faulthandler on and writes its exit code to the log and the job record
    cmd = [sys.executable, str(Path(__file__).resolve()), 'supervise', str(plan)] + (['--top', str(a.top)] if a.top else [])
    flags = 0
    if os.name == 'nt':
        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW
    with open(log, 'w', encoding='utf-8') as fh:
        p = subprocess.Popen(cmd, cwd=ROOT, stdout=fh, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                             creationflags=flags, start_new_session=(os.name != 'nt'))
    job.write_text(json.dumps({'pid': p.pid, 'cmd': cmd, 'log': str(log), 'result': str(result), 'started': time.time(), 'top': a.top}))
    print(json.dumps({'status': 'started', 'pid': p.pid, 'log': str(log), 'result': str(result)}))
    return 0


def cmd_supervise(a):
    plan, result, job, log = paths(a.plan)
    cmd = [sys.executable, '-X', 'faulthandler', str(ROOT/'art/species-construction/loop/recipe.py'), 'run-plan', str(plan)]
    if a.top:
        cmd += ['--top', str(a.top)]
    with open(log, 'a', encoding='utf-8') as fh:
        p = subprocess.Popen(cmd, cwd=ROOT, stdout=fh, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                             creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        code = p.wait()
    note = f'[plan_job] run-plan exited with code {code}' + (f' (0x{code & 0xffffffff:08X})' if code not in (0, 1) else '')
    with open(log, 'a', encoding='utf-8') as fh:
        fh.write(note+'\n')
    try:
        j = json.loads(job.read_text())
        j['exitCode'] = code
        job.write_text(json.dumps(j))
    except (OSError, ValueError):
        pass
    return code


def tail(log, n=5):
    try:
        return log.read_text(encoding='utf-8', errors='replace').strip().splitlines()[-n:]
    except OSError:
        return []


def cmd_wait(a):
    plan, result, job, log = paths(a.plan)
    if not plan.exists():
        return missing(plan)
    if not job.exists() and not result.exists():
        print(json.dumps({'status': 'failed', 'reason': 'no job started for this plan; run plan_job.py start first'}))
        return 2
    pid = json.loads(job.read_text())['pid'] if job.exists() else None
    end = time.time() + a.timeout
    while time.time() < end:
        if result.exists() and (not pid or not alive(pid)):
            print(json.dumps({'status': 'done', 'result': str(result)}))
            return 0
        if pid and not alive(pid):
            if result.exists():
                print(json.dumps({'status': 'done', 'result': str(result)}))
                return 0
            # audit 2026-10-07 recommendation 19: four run-plans died silently in rounds 21 to 27, each an hour of Blender.
            # A dead plan is started once more (the recipe cache keeps every step it built); a second death is an alarm
            j = json.loads(job.read_text())
            if not j.get('retried'):
                lines = tail(log, 8)
                # cmd_start rewrites the log, so the first run's tail is kept beside it
                log.with_name(log.stem+'-first.log').write_text('\n'.join(lines)+'\n', encoding='utf-8')
                again = argparse.Namespace(plan=str(plan), top=j.get('top'))
                import contextlib, io
                with contextlib.redirect_stdout(io.StringIO()):
                    cmd_start(again)
                j2 = json.loads(job.read_text())
                j2.update(retried=True, firstDeath={'exitCode': j.get('exitCode'), 'log': lines})
                job.write_text(json.dumps(j2))
                pid = j2['pid']
                print(json.dumps({'status': 'running', 'pid': pid, 'note': 'run-plan died without a result and was started once more', 'next': 'call wait again'}))
                return 3
            print(json.dumps({'status': 'failed', 'alarm': True, 'reason': 'run-plan died twice without a result (harness failure, not a plan verdict)',
                              'exitCode': j.get('exitCode'), 'firstDeath': j.get('firstDeath'), 'log': tail(log)}))
            return 1
        time.sleep(10)
    print(json.dumps({'status': 'running', 'pid': pid, 'progress': tail(log, 2), 'next': 'call wait again'}))
    return 3


def candidate_row(entry, baseline_packet, regions, seed):
    """One candidate as the workflow's runner output wants it, read from the candidate's own candidate.json, with its blind
    reader pack made here (round 26: a runner copying these fields by hand dropped every regionShift row at 0.0)."""
    packet = Path(entry['packet'])
    summary = json.loads((packet/'candidate.json').read_text(encoding='utf-8'))
    dirs = summary.get('componentDirs') or {}
    pack = packet/'reader-pack'
    if not (pack/'key.json').is_file():
        proc = subprocess.run([sys.executable, str(ROOT/'art/species-construction/loop/reader_pack.py'), str(baseline_packet), str(packet),
                               '--regions', ','.join(regions), '--out', str(pack), '--seed', f"{seed}-{entry['name']}"],
                              cwd=ROOT, capture_output=True, text=True)
        if proc.returncode or not (pack/'key.json').is_file():
            return {'name': entry['name'], 'assembly': entry.get('assembly'), 'packet': str(packet), 'technicalPass': False,
                    'error': 'reader pack failed: '+((proc.stdout+proc.stderr).strip().splitlines() or ['no output'])[-1]}
    key = json.loads((pack/'key.json').read_text(encoding='utf-8'))
    side = 'A' if key.get('aIsCandidate') else 'B'
    seams = summary.get('seamsNew') or []
    return {'name': entry['name'], 'recipe': entry['recipe'], 'head': dirs.get('head'), 'body': dirs.get('body'),
            'assembly': summary.get('assembly'), 'packet': str(packet).replace('\\', '/'),
            'technicalPass': bool(summary.get('ok') and (summary.get('check') or {}).get('pass')),
            'regionChange': summary.get('regionChange') or {}, 'regionShift': summary.get('regionShift') or {},
            'seams': 'no new seams flagged' if not seams else 'seams flagged at '+', '.join(sorted({f"{s['joint']}/{s['view']} {s['kind']}" for s in seams})),
            'measured': summary.get('verdict') or '', 'pack': str(pack).replace('\\', '/'), 'keys': {r: side for r in regions},
            'guards': summary.get('faceGuards') or [], 'face': face_line(summary.get('faceMeasures'))}


def face_line(face):
    eyes = (face or {}).get('eyes') or []
    keys = ('eyeAspect', 'irisWidth', 'irisOffset', 'bandTopBottom', 'bandMin', 'bandMedian')
    return '; '.join(f"eye {k+1}: " + ', '.join(f"{x} {e.get(x)}" for x in keys if x in e) for k, e in enumerate(eyes))


def cmd_report(a):
    """The runner's whole return value for a finished plan, as one JSON line: every top candidate with a packet, its reader pack
    and key side, regionChange and regionShift copied from candidate.json. The workflow journal keeps it; no file is written beside the plan (it only repeated the plan result)."""
    plan, result, job, log = paths(a.plan)
    if not result.exists():
        print(json.dumps({'ok': False, 'reason': f'no plan result at {result}', 'candidates': []}))
        return 1
    data = json.loads(result.read_text(encoding='utf-8'))
    regions = [r for r in a.regions.split(',') if r]
    rows = [candidate_row(e, Path(a.baseline_packet), regions, a.seed) for e in data.get('top', []) if e.get('ok') and e.get('packet')]
    out = {'ok': bool(rows), 'candidates': rows, 'now': int(time.time())}
    harness = [f"{e.get('id')} {str(e.get('failure') or '')[:160]}" for e in data.get('top', []) if e.get('harnessError')]
    if harness:
        # a top candidate the harness lost twice (recipe_plan's retry): the readers see fewer candidates than planned
        out['harnessErrors'] = harness
    if not rows:
        out['reason'] = 'no top candidate built: ' + '; '.join(f"{e.get('id')} {e.get('stage')} {str(e.get('failure') or '')[:160]}" for e in data.get('top', []))
    text = json.dumps(out)
    print(text)
    return 0


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('start'); s.add_argument('plan'); s.add_argument('--top', type=int)
    w = sub.add_parser('wait'); w.add_argument('plan'); w.add_argument('--timeout', type=int, default=560)
    r = sub.add_parser('report'); r.add_argument('plan'); r.add_argument('--baseline-packet', required=True)
    r.add_argument('--regions', required=True); r.add_argument('--seed', required=True)
    v = sub.add_parser('supervise'); v.add_argument('plan'); v.add_argument('--top', type=int)
    a = ap.parse_args()
    sys.exit({'start': cmd_start, 'wait': cmd_wait, 'report': cmd_report, 'supervise': cmd_supervise}[a.cmd](a))


if __name__ == '__main__':
    main()
