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
        out = subprocess.run(['tasklist', '/FI', f'PID eq {pid}', '/NH'], capture_output=True, text=True).stdout
        return str(pid) in out
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


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
    if result.exists() and result.stat().st_mtime >= plan.stat().st_mtime:
        print(json.dumps({'status': 'done', 'result': str(result), 'note': 'result already exists'}))
        return 0
    cmd = [sys.executable, str(ROOT/'art/species-construction/loop/recipe.py'), 'run-plan', str(plan)]
    if a.top:
        cmd += ['--top', str(a.top)]
    flags = 0
    if os.name == 'nt':
        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW
    with open(log, 'w', encoding='utf-8') as fh:
        p = subprocess.Popen(cmd, cwd=ROOT, stdout=fh, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                             creationflags=flags, start_new_session=(os.name != 'nt'))
    job.write_text(json.dumps({'pid': p.pid, 'cmd': cmd, 'log': str(log), 'result': str(result), 'started': time.time()}))
    print(json.dumps({'status': 'started', 'pid': p.pid, 'log': str(log), 'result': str(result)}))
    return 0


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
            print(json.dumps({'status': 'failed', 'reason': 'run-plan exited without a result', 'log': tail(log)}))
            return 1
        time.sleep(10)
    print(json.dumps({'status': 'running', 'pid': pid, 'progress': tail(log, 2), 'next': 'call wait again'}))
    return 3


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('start'); s.add_argument('plan'); s.add_argument('--top', type=int)
    w = sub.add_parser('wait'); w.add_argument('plan'); w.add_argument('--timeout', type=int, default=560)
    a = ap.parse_args()
    sys.exit({'start': cmd_start, 'wait': cmd_wait}[a.cmd](a))


if __name__ == '__main__':
    main()
