"""Blender runner for Creature Studio: one pinned Blender, a slot lock, a log folder. No species config.

    python art/studio/runner.py blender [--log NAME] <script.py> [-- script args ...]

Same slot rule as art/species-construction/loop/loop_tools.py: the first Blender process always starts, a
second needs minFreeGb of free memory, a third thirdSlotFreeGb, none starts within settleSeconds of the
previous start, and at most maxSlots run at once. Settings live in art/studio/runner.json. Slot locks are
files under <work>/slots, logs under <work>/logs; both are outside the repo.

From Python: `import runner; runner.run_blender([...blender args...], log_path)`.
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CONFIG_FILE = HERE/'runner.json'

_NO_WINDOW = {'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}


def load_config(path=CONFIG_FILE):
    cfg = json.loads(Path(path).read_text(encoding='utf-8'))
    cfg['work'] = Path(cfg['work'])
    return cfg


def blender_path(cfg=None):
    cfg = cfg or load_config()
    path = Path(os.environ.get(cfg['blenderEnv'], cfg['blenderDefault']))
    if not path.is_file():
        sys.exit(f"Blender not found at {path}; set {cfg['blenderEnv']}")
    return path


def free_memory_gb():
    import ctypes

    class Status(ctypes.Structure):
        _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong), ('total', ctypes.c_ulonglong),
                    ('available', ctypes.c_ulonglong), ('pageTotal', ctypes.c_ulonglong),
                    ('pageAvailable', ctypes.c_ulonglong), ('virtualTotal', ctypes.c_ulonglong),
                    ('virtualAvailable', ctypes.c_ulonglong), ('extended', ctypes.c_ulonglong)]
    status = Status()
    status.length = ctypes.sizeof(Status)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status))
    return status.available/1e9


def pid_alive(pid):
    if os.name != 'nt':
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            return False
    import ctypes
    handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
    if not handle:
        return False
    code = ctypes.c_ulong()
    ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
    ctypes.windll.kernel32.CloseHandle(handle)
    return code.value == 259


def free_needed(held, cfg):
    """Free memory (GB) required to start another process while `held` run: 0 for the first, minFreeGb for the
    second, thirdSlotFreeGb for the third and later; None when maxSlots are already running."""
    if held >= cfg['maxSlots']:
        return None
    if held == 0:
        return 0
    return cfg['minFreeGb'] if held == 1 else cfg['thirdSlotFreeGb']


def acquire_slot(cfg=None, free_memory=free_memory_gb, alive=pid_alive, sleep=time.sleep, now=time.time):
    """Claim a slot under a short-lived gate file and return its lock file; unlink it when the process ends.
    The memory, liveness and clock readers are parameters so a test can drive the rule without Blender."""
    cfg = cfg or load_config()
    slots = cfg['work']/'slots'
    slots.mkdir(parents=True, exist_ok=True)
    gate = slots/'gate.lock'
    while True:
        try:
            fd = os.open(gate, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.close(fd)
        except FileExistsError:
            try:
                if now()-gate.stat().st_mtime > 30:   # a waiter died inside the gate
                    gate.unlink(missing_ok=True)
            except OSError:
                pass
            sleep(.05)
            continue
        try:
            held = []
            for k in range(cfg['maxSlots']):
                lock = slots/f'slot-{k}.lock'
                if lock.exists():
                    try:
                        pid = int(lock.read_text().strip() or 0)
                    except (OSError, ValueError):
                        pid = 0
                    if pid and not alive(pid):
                        lock.unlink(missing_ok=True)
                    else:
                        held.append(k)
            need = free_needed(len(held), cfg)
            settled = all(now()-(slots/f'slot-{k}.lock').stat().st_mtime >= cfg['settleSeconds'] for k in held if (slots/f'slot-{k}.lock').exists())
            if need is not None and settled and (need == 0 or free_memory() >= need):
                for k in range(cfg['maxSlots']):
                    if k in held:
                        continue
                    try:
                        fd = os.open(slots/f'slot-{k}.lock', os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                    except FileExistsError:
                        continue
                    os.write(fd, str(os.getpid()).encode())
                    os.close(fd)
                    return slots/f'slot-{k}.lock'
        finally:
            gate.unlink(missing_ok=True)
        sleep(3)


def shared_acquire(cfg, owner):
    """Take the machine-wide blender slot (the creature pipeline's slot.py) so studio runs queue with every other
    session's Blender and GPU work. Returns (token or None, note). None with a note means the shared lock is
    absent, or busy past the wait and the fallback rule allowed running anyway at below-normal priority."""
    path = cfg.get('sharedSlot')
    if not path or not Path(path).is_file() or os.environ.get('XALIANS_NO_SLOT') == '1':
        return None, 'shared slot not used'
    wait = int(cfg.get('sharedSlotWait', 1200))
    try:                                   # a long render holding the slot will not end soon: do not wait long
        import datetime
        locks = Path(cfg.get('sharedLocks', 'C:/dev/art-data/pipeline/locks'))/'blender'
        recs = [json.loads(f.read_text()) for f in locks.glob('*.json')]
        if recs and all((datetime.datetime.now()-datetime.datetime.fromisoformat(r['started'])).total_seconds()
                        > 60*cfg.get('sharedSlotLongHoldMinutes', 10) for r in recs):
            wait = int(cfg.get('sharedSlotShortWait', 20))
    except (OSError, ValueError, KeyError):
        pass
    wait = str(wait)
    r = subprocess.run([sys.executable, path, 'acquire', 'blender', '--wait', wait, '--owner', owner],
                       capture_output=True, text=True, **_NO_WINDOW)
    if r.returncode == 0 and r.stdout.strip():
        return r.stdout.strip(), 'shared slot held'
    free = free_memory_gb()
    if free < cfg.get('sharedSlotFallbackFreeGb', 4):
        sys.exit(f'shared Blender slot busy after {wait} s and only {free:.1f} GB free; not starting ({r.stderr.strip()})')
    return None, f'shared slot busy after {wait} s; running at below-normal priority with {free:.1f} GB free'


def shared_release(cfg, token):
    if token:
        r = subprocess.run([sys.executable, cfg['sharedSlot'], 'release', token], capture_output=True, text=True,
                           **_NO_WINDOW)
        if r.returncode:
            print(f'warning: shared slot release failed for {token}: {r.stderr.strip()}', file=sys.stderr)


def run_blender(arguments, log, cfg=None):
    cfg = cfg or load_config()
    command = [str(blender_path(cfg)), '-b', *arguments]
    Path(log).parent.mkdir(parents=True, exist_ok=True)
    token, note = shared_acquire(cfg, f'studio {Path(log).stem}')
    slot = acquire_slot(cfg)
    flags = dict(_NO_WINDOW)
    if os.name == 'nt' and token is None and 'busy' in note:
        flags['creationflags'] = flags.get('creationflags', 0) | 0x4000      # BELOW_NORMAL_PRIORITY_CLASS
    try:
        with open(log, 'w', encoding='utf-8', errors='replace') as handle:
            handle.write(f'[runner] {note}' + chr(10))
            handle.flush()
            result = subprocess.run(command, stdout=handle, stderr=subprocess.STDOUT, cwd=ROOT, **flags)
    finally:
        slot.unlink(missing_ok=True)
        shared_release(cfg, token)
    text = Path(log).read_text(encoding='utf-8', errors='replace')
    if result.returncode or 'Traceback' in text:
        tail = '\n'.join(text.splitlines()[-25:])
        sys.exit(f'Blender step failed; see {log}\n{tail}')


def cmd_blender(args):
    cfg = load_config()
    script = Path(args.script)
    if not script.is_absolute():
        script = ROOT/script
    rest = args.rest[1:] if args.rest[:1] == ['--'] else args.rest
    log = cfg['work']/'logs'/f'{args.log or script.stem}.log'
    run_blender(['--factory-startup', '--python', str(script), '--', *rest], log, cfg)
    print(f'ok; log {log}')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    sub = ap.add_subparsers(dest='command', required=True)
    p = sub.add_parser('blender')
    p.add_argument('--log')
    p.add_argument('script')
    p.add_argument('rest', nargs=argparse.REMAINDER)
    p.set_defaults(func=cmd_blender)
    args = ap.parse_args()
    args.func(args)


if __name__ == '__main__':
    main()
