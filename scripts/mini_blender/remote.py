"""Mac supervisor. Holds the compute lock and yields the container to CI."""
import fcntl
import json
import os
from pathlib import Path
import shutil
import signal
import select
import subprocess
import sys
import tarfile
import time
import threading
import uuid

ROOT = Path.home() / '.mini-blender'
DOCKER = str(Path.home() / '.mini-runner/bin/docker')
LIMA = str(Path.home() / '.mini-runner/opt/lima/bin/limactl')
IMAGE = 'mini-blender:5.2.2'


def lower_vm_priority():
    """Identify only compute VM processes, including Apple's VZ XPC worker."""
    vm = Path.home() / '.colima/_lima/colima'
    pids = {int((vm / 'ha.pid').read_text().strip())}
    # VZ runs the vCPUs in a separate XPC process with PPID 1. Nicing only
    # Lima's hostagent does not lower that process. Its open VM disk identifies
    # it without touching the separate CI VM's identically named XPC process.
    holders = subprocess.check_output(['lsof', '-t', str(vm / 'disk')], text=True)
    pids.update(int(p) for p in holders.split())
    for pid in sorted(pids):
        subprocess.run(['renice', '15', '-p', str(pid)], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def ci_busy():
    env = dict(os.environ, LIMA_HOME=str(Path.home() / '.ci-runner/lima'))
    try:
        listener = subprocess.run([LIMA, 'shell', 'ci-runner', '--', 'pgrep', '-x', 'Runner.Listener'],
                                  env=env, capture_output=True, text=True, timeout=15)
        if listener.returncode != 0:
            return True
        r = subprocess.run([LIMA, 'shell', 'ci-runner', '--', 'pgrep', '-x', 'Runner.Worker'], env=env,
                           capture_output=True, text=True, timeout=15)
        # Unknown CI status must yield too.
        return r.returncode != 1 or bool(r.stderr.strip())
    except (OSError, subprocess.TimeoutExpired):
        return True


def docker(*args, **kw):
    kw.setdefault('timeout', 20)
    return subprocess.run([DOCKER, '--host', 'unix://' + str(Path.home() / '.colima/default/docker.sock'),
                           *args], **kw)


def stop_container(name):
    result = docker('rm', '-f', name, capture_output=True, text=True)
    if result.returncode and 'No such container' not in result.stderr:
        raise RuntimeError('cannot confirm container stopped; retaining workspace: ' + result.stderr)


COLIMA = str(Path.home() / '.mini-runner/bin/colima')


def ensure_vm():
    """Start the compute VM if it is stopped (auto-activation is off, so it stays down after a reboot)."""
    if docker('info', capture_output=True, text=True).returncode == 0:
        return
    start = subprocess.run(['nice', '-n', '15', COLIMA, 'start', 'default', '--activate=false'],
                           capture_output=True, text=True, timeout=300)
    if start.returncode or docker('info', capture_output=True, text=True).returncode:
        raise RuntimeError('compute VM is stopped and did not start: ' + (start.stderr or start.stdout)[-400:])


def reject_orphans():
    result = docker('ps', '-aq', '--filter', 'name=^/mini-blender-', capture_output=True, text=True, check=True)
    if result.stdout.strip():
        raise RuntimeError('previous mini-blender container remains; inspect it before admitting another job')


def safe_extract(archive, target):
    with tarfile.open(archive) as tar:
        for m in tar.getmembers():
            path = (target / m.name).resolve()
            if not path.is_relative_to(target.resolve()) or not (m.isfile() or m.isdir()):
                raise ValueError('unsafe input archive member: ' + m.name)
        tar.extractall(target)


def cancellation(job):
    """Cancel and wait for the job's lifetime lock before deleting its files."""
    if not job.exists():
        return
    (job / '.cancel').touch()
    try:
        lock = (job / '.active').open('a')
    except FileNotFoundError:
        return
    with lock:
        deadline = time.monotonic() + 60
        while True:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() > deadline:
                    raise TimeoutError('supervisor is still active; workspace retained')
                time.sleep(1)
        if job.exists():
            stop_container('mini-blender-' + job.name)
            shutil.rmtree(job)


def heartbeat(cancel):
    last = time.monotonic()
    while not cancel.is_set():
        ready, _, _ = select.select([sys.stdin], [], [], 2)
        if ready:
            try:
                data = os.read(sys.stdin.fileno(), 1024)
            except BlockingIOError:
                data = None
            if data == b'':
                cancel.set()
                return
            if data is not None:
                last = time.monotonic()
        if time.monotonic() - last > 45:
            cancel.set()


def pause_if_running(process, name):
    if process.poll() is not None:
        return False
    result = docker('pause', name, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if result.returncode and process.poll() is None:
        try:
            process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            raise RuntimeError('could not pause active compute container')
    return result.returncode == 0


def unpause_if_running(process, name):
    result = docker('unpause', name, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if result.returncode and process.poll() is None:
        try:
            process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            raise RuntimeError('could not resume active compute container')


def wait_started(process, name):
    deadline = time.monotonic() + 30
    while process.poll() is None:
        result = docker('inspect', '--format', '{{.State.Running}}', name, capture_output=True, text=True)
        if result.returncode == 0 and result.stdout.strip() == 'true':
            return
        if time.monotonic() > deadline:
            raise TimeoutError('container did not start')
        time.sleep(0.25)


def run_phase(name, job, args, stream, deadline, check_cancel, cwd):
    cmd = [DOCKER, '--host', 'unix://' + str(Path.home() / '.colima/default/docker.sock'),
           'run', '--rm', '--name', name, '--cpus', '8', '--memory', '5632m',
           '--memory-swap', '5632m', '--cpu-shares', '128', '--pids-limit', '256',
           '--network', 'none', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
           '--user', str(os.getuid()) + ':' + str(os.getgid()),
           '--mount', 'type=bind,src=' + str(job) + ',dst=/job', '--workdir', cwd,
           IMAGE, *args]
    process = subprocess.Popen(cmd, stdout=stream, stderr=subprocess.STDOUT)
    paused_seconds = 0.0
    try:
        wait_started(process, name)
        while process.poll() is None:
            check_cancel()
            if time.monotonic() > deadline:
                raise TimeoutError('remote job exceeded 24 hours')
            if ci_busy() and pause_if_running(process, name):
                pause_start = time.monotonic()
                try:
                    while ci_busy() and process.poll() is None:
                        check_cancel()
                        if time.monotonic() > deadline:
                            raise TimeoutError('CI pause exceeded job deadline')
                        time.sleep(5)
                finally:
                    unpause_if_running(process, name)
                    paused_seconds += time.monotonic() - pause_start
            time.sleep(2)
    finally:
        if process.poll() is None:
            stop_container(name)
        process.wait(timeout=20)
    return process.returncode, paused_seconds


def run(job_id):
    # Only a generated UUID may select the job directory or container name.
    if uuid.UUID(job_id).hex != job_id:
        raise ValueError('invalid job id')
    job = ROOT / 'jobs' / job_id
    name = 'mini-blender-' + job_id
    ROOT.mkdir(exist_ok=True)
    active = (job / '.active').open('a')
    fcntl.flock(active, fcntl.LOCK_EX)
    cancel = threading.Event()
    threading.Thread(target=heartbeat, args=(cancel,), daemon=True).start()

    def check_cancel():
        if cancel.is_set() or (job / '.cancel').exists():
            raise RuntimeError('client disconnected or canceled job')
    started = time.monotonic()
    paused_seconds = 0.0
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))
    signal.signal(signal.SIGHUP, lambda *_: sys.exit(129))
    try:
        with (ROOT / 'compute.lock').open('a') as lock:
            deadline = time.monotonic() + 86400
            while True:
                check_cancel()
                try:
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    if time.monotonic() > deadline:
                        raise TimeoutError('remote compute lock timed out')
                    time.sleep(2)
            ensure_vm()
            reject_orphans()
            safe_extract(job / 'inputs.tar', job)
            (job / 'inputs.tar').unlink()
            config = json.loads((job / 'job.json').read_text())
            lower_vm_priority()
            for out in config['outputs']:
                (job / out).parent.mkdir(parents=True, exist_ok=True)
            while ci_busy():
                check_cancel()
                if time.monotonic() > deadline:
                    raise TimeoutError('CI did not become idle')
                time.sleep(5)
            log = job / 'blender.log'
            cwd = config.get('cwd', '/job')
            (job / Path(cwd).relative_to('/job')).mkdir(parents=True, exist_ok=True)
            inference_unsafe = False
            with log.open('wb') as stream:
                code = 0
                if config.get('inferred') and config.get('blendInputs'):
                    shutil.copy2(ROOT / 'blend_guard.py', job / '.blend_guard.py')
                    (job / '.blend_inputs.json').write_text(json.dumps({'blends': config['blendInputs'], 'inputs': config['inputPaths']}))
                    code, paused = run_phase(name, job, ['-b', '--python-exit-code', '99', '--python',
                                                       '/job/.blend_guard.py', '--', '/job/.blend_inputs.json'],
                                             stream, deadline, check_cancel, cwd)
                    paused_seconds += paused
                    inference_unsafe = code == 99
                if code == 0:
                    code, paused = run_phase(name, job, config['args'], stream, deadline, check_cancel, cwd)
                    paused_seconds += paused
            result = {'returncode': code, 'wallSeconds': time.monotonic() - started,
                      'ciPausedSeconds': paused_seconds, 'memoryLimitBytes': 5632 * 2**20, 'threads': 8,
                      'inferenceUnsafe': inference_unsafe}
            (job / 'result.json').write_text(json.dumps(result, indent=2))
            with tarfile.open(fileobj=sys.stdout.buffer, mode='w|') as tar:
                for path in ['blender.log', 'result.json', *config['outputs']]:
                    item = job / path
                    if item.exists():
                        tar.add(item, arcname=path)
            return code
    except Exception as error:
        # Transfer diagnostics even when the supervisor fails before Blender.
        (job / 'result.json').write_text(json.dumps({'returncode': 1, 'error': str(error),
                                                    'wallSeconds': time.monotonic() - started}))
        (job / 'blender.log').touch()
        with tarfile.open(fileobj=sys.stdout.buffer, mode='w|') as tar:
            for path in ('blender.log', 'result.json'):
                tar.add(job / path, arcname=path)
        return 1
    finally:
        stop_container(name)
        # job is UUID-validated and directly inside our dedicated jobs directory.
        if job.exists():
            shutil.rmtree(job)
        active.close()


if __name__ == '__main__':
    if sys.argv[1] == 'priority':
        lower_vm_priority()
    elif sys.argv[1] == 'cancel':
        job_id = sys.argv[2]
        if uuid.UUID(job_id).hex != job_id:
            raise ValueError('invalid job id')
        cancellation(ROOT / 'jobs' / job_id)
    else:
        sys.exit(run(sys.argv[1]))
