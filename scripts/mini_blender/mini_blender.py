#!/usr/bin/env python3
"""Run a manifest on the local shared slot, spilling busy work onto the mini.

python scripts/mini_blender/mini_blender.py job.json --route auto --slot <slot.py>
Manifest paths are absolute Windows or WSL /mnt/<drive> paths. Inputs are files.
Mapping targets are relative folders below /job/work. Outputs are explicit files
or directories. Blender arguments use the original paths, translated per route.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import threading
import time
import uuid


def canonical(value):
    value = str(value).replace('\\', '/')
    match = re.match(r'^/mnt/([a-zA-Z])/(.*)', value)
    if match:
        value = match[1].upper() + ':/' + match[2]
    if not re.match(r'^[A-Za-z]:/', value):
        raise ValueError('expected absolute Windows or WSL path: ' + value)
    if any(p in ('.', '..') for p in value.split('/')):
        raise ValueError('path traversal is not allowed: ' + value)
    return value[0].upper() + value[1:].rstrip('/')


def pc_path(value, wsl=False):
    value = canonical(value)
    if wsl or os.name != 'nt':
        return '/mnt/' + value[0].lower() + value[2:]
    return value


def relative(value):
    p = PurePosixPath(value)
    if not value or p.is_absolute() or '..' in p.parts or ':' in value or '\\' in value:
        raise ValueError('unsafe relative path: ' + value)
    return str(p)


class Job:
    def __init__(self, config):
        self.config = config
        self.maps = sorted([(canonical(m['source']), relative(m['target'])) for m in config['mappings']],
                           key=lambda item: -len(item[0]))
        targets = [t.lower() for _, t in self.maps]
        sources = [s.lower() for s, _ in self.maps]
        if len(set(sources)) != len(sources):
            raise ValueError('duplicate mapping sources')
        if any(a == b or a.startswith(b + '/') or b.startswith(a + '/')
               for i, a in enumerate(targets) for b in targets[i + 1:]):
            raise ValueError('mapping targets overlap')
        self.case_paths = {}
        for value in config['inputs'] + config['outputs']:
            parts = canonical(value).split('/')
            normalized = parts[0]
            for part in parts[1:]:
                normalized += '/' + part
                normalized = self.case_paths.setdefault(normalized.casefold(), normalized)
        self.inputs = [(pc_path(p), self.mapped(p)) for p in config['inputs']]
        self.outputs = [(pc_path(p), self.mapped(p)) for p in config['outputs']]
        if len({r.lower() for _, r in self.inputs}) != len(self.inputs):
            raise ValueError('duplicate inputs')
        for _, out in self.outputs:
            if any(out.casefold() == inp.casefold() or inp.casefold().startswith(out.casefold() + '/')
                   or out.casefold().startswith(inp.casefold() + '/') for _, inp in self.inputs):
                raise ValueError('outputs overlap inputs')
        if not self.outputs:
            raise ValueError('at least one output is required')
        for i, (_, out) in enumerate(self.outputs):
            if any(out.casefold() == other.casefold() or out.casefold().startswith(other.casefold() + '/')
                   or other.casefold().startswith(out.casefold() + '/')
                   for _, other in self.outputs[i + 1:]):
                raise ValueError('outputs overlap')
        args = config['args']
        if not args or not all(isinstance(a, str) for a in args):
            raise ValueError('args must be a nonempty string array')
        # The image enforces headless CPU work and the thread ceiling. Scripts
        # are trusted user code; they must also select Cycles CPU explicitly.
        if any(a in ('-t', '--threads') or a.startswith('--threads=') for a in args):
            raise ValueError('thread arguments are owned by the runner')
        if '-b' not in args and '--background' not in args:
            raise ValueError('headless -b is required')

    def mapped(self, value):
        p = canonical(value)
        # Windows accepts case aliases; Linux must use the same spelling as
        # the archived declaration, including directory arguments.
        for declared in sorted(self.case_paths.values(), key=len, reverse=True):
            if p.casefold() == declared.casefold() or p.casefold().startswith(declared.casefold() + '/'):
                p = declared + p[len(declared):]
                break
        for source, target in self.maps:
            if p.lower() == source.lower() or p.lower().startswith(source.lower() + '/'):
                return 'work/' + target + p[len(source):]
        raise ValueError('unmapped path: ' + p)

    def arg(self, arg, remote=False, wsl=False):
        # Supports standalone paths and --option=<path>, without shell parsing.
        prefix, sep, value = arg.partition('=')
        candidate = value if sep else arg
        if re.match(r'^(?:[A-Za-z]:[/\\]|/mnt/[a-zA-Z]/)', candidate):
            mapped = '/job/' + self.mapped(candidate) if remote else pc_path(candidate, wsl)
            return prefix + '=' + mapped if sep else mapped
        return arg


def ssh(host, command, **kw):
    return subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ServerAliveInterval=15',
                           '-o', 'ServerAliveCountMax=3', host, command], **kw)


def connected_call(command, **kwargs):
    """Keep the supervisor alive; closing stdin cancels its process tree."""
    process = subprocess.Popen(command, stdin=subprocess.PIPE, **kwargs)
    stop = threading.Event()

    def pump():
        while not stop.is_set():
            try:
                process.stdin.write(b'.')
                process.stdin.flush()
            except (BrokenPipeError, OSError, ValueError):
                return
            stop.wait(5)

    thread = threading.Thread(target=pump, daemon=True)
    thread.start()
    try:
        return process.wait()
    finally:
        stop.set()
        thread.join(timeout=1)
        process.stdin.close()
        # The worker kills and reaps Blender on EOF before returning. Never
        # release a local slot while its worker can still be running.
        process.wait()


def mini(job, host, evidence):
    evidence.mkdir(parents=True, exist_ok=True)
    job_id = uuid.uuid4().hex
    remote_root = '.mini-blender/jobs/' + job_id
    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix='mini-blender-') as scratch:
        archive = Path(scratch) / 'inputs.tar'
        config = Path(scratch) / 'job.json'
        config.write_text(json.dumps({'args': [job.arg(a, remote=True) for a in job.config['args']],
                                     'outputs': [p for _, p in job.outputs],
                                     'inferred': job.config.get('inferred', False),
                                     'blendInputs': ['/job/' + job.mapped(p) for p in job.config.get('blend_inputs', [])],
                                     'inputPaths': ['/job/' + p for _, p in job.inputs],
                                     'cwd': '/job/' + job.mapped(job.config['cwd']) if job.config.get('cwd') else '/job'}), encoding='utf-8')
        with tarfile.open(archive, 'w') as tar:
            tar.add(config, arcname='job.json')
            for path, target in job.inputs:
                if not Path(path).is_file() or Path(path).is_symlink():
                    raise ValueError('input must be a regular file: ' + path)
                tar.add(path, arcname=target, recursive=False)
        ssh(host, 'mkdir -p ' + remote_root, check=True)
        try:
            subprocess.run(['scp', '-q', '-o', 'BatchMode=yes', str(archive),
                            host + ':' + remote_root + '/inputs.tar'], check=True)
            with (Path(scratch) / 'outputs.tar').open('wb') as output:
                result = connected_call(['ssh', '-o', 'BatchMode=yes', '-o', 'ServerAliveInterval=15',
                                         '-o', 'ServerAliveCountMax=3', host,
                                         'python3 .mini-blender/remote.py ' + job_id], stdout=output)
            # Validate every member before copying any output onto the PC.
            with tarfile.open(Path(scratch) / 'outputs.tar') as tar:
                members = tar.getmembers()
                for m in members:
                    p = relative(m.name)
                    allowed = p in ('result.json', 'blender.log') or any(
                        p == out or p.startswith(out + '/') for _, out in job.outputs)
                    if not allowed or not (m.isfile() or m.isdir()):
                        raise ValueError('unexpected remote output: ' + m.name)
                if sys.version_info >= (3, 12):
                    tar.extractall(scratch, members=members, filter='data')
                else:
                    tar.extractall(scratch, members=members)
            for name in ('result.json', 'blender.log'):
                shutil.copy2(Path(scratch) / name, evidence / name)
            stats = json.loads((evidence / 'result.json').read_text())
            stats['transferAndWallSeconds'] = time.monotonic() - started
            stats['route'] = 'mini'
            (evidence / 'result.json').write_text(json.dumps(stats, indent=2))
            if result or stats['returncode']:
                raise RuntimeError('mini Blender failed; see ' + str(evidence / 'blender.log'))
            for destination, out in job.outputs:
                source = Path(scratch) / out
                if not source.exists():
                    raise RuntimeError('missing declared output: ' + out)
            for destination, out in job.outputs:
                source = Path(scratch) / out
                Path(destination).parent.mkdir(parents=True, exist_ok=True)
                if source.is_dir():
                    shutil.copytree(source, destination, dirs_exist_ok=True)
                else:
                    shutil.copy2(source, destination)
            return 0
        finally:
            # No shell deletion: UUID-validated dedicated directory only. The
            # supervisor cleans normal jobs; this covers interrupted uploads.
            ssh(host, 'python3 .mini-blender/remote.py cancel ' + job_id,
                stdout=subprocess.DEVNULL, check=True)


def local(job, slot_path, evidence):
    spec = importlib.util.spec_from_file_location('shared_blender_slot', pc_path(slot_path))
    slot = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(slot)
    executable = job.config.get('local_blender', '/home/njord/.local/opt/blender-5.2.2-linux-x64/blender')
    wsl = os.name == 'nt' and executable.startswith('/')
    if wsl:
        # Importing the lock on Windows must not substitute host free RAM for
        # the WSL memory limit when deciding whether a second local job fits.
        program = ('import json,os; from pathlib import Path; '
                   'm=dict(l.split(":",1) for l in Path("/proc/meminfo").read_text().splitlines()); '
                   'print(json.dumps([int(m["MemAvailable"].split()[0])/2**20,os.getloadavg()[0],os.cpu_count()]))')
        try:
            result = subprocess.run(['wsl', '-d', 'Ubuntu', '--exec', 'python3', '-c', program],
                                    capture_output=True, text=True, timeout=20, check=True)
            free, load, cpus = json.loads(result.stdout)
        except (subprocess.SubprocessError, ValueError, OSError):
            free, load, cpus = None, 1, 1
        slot.free_ram_gb = lambda: free
        slot.load_is_low = lambda: load < 0.5 * cpus
    token = slot.try_acquire('blender', 'mini-blender local route', os.getpid())
    if token is None:
        return None
    cls, number = slot.parse_token(token)
    stop = threading.Event()

    def pump():
        while not stop.wait(slot.beat_interval()):
            slot.beat(cls, number, token)

    threading.Thread(target=pump, daemon=True).start()
    try:
        evidence.mkdir(parents=True, exist_ok=True)
        worker = Path(__file__).with_name('local_worker.py').resolve().as_posix()
        if wsl:
            command = ['wsl', '-d', 'Ubuntu', '--exec', 'python3', pc_path(worker, True), executable]
        else:
            command = [sys.executable, worker, executable]
        command += [job.arg(a, wsl=wsl or os.name != 'nt') for a in job.config['args']]
        start = time.monotonic()
        with (evidence / 'blender.log').open('wb') as log:
            code = connected_call(command, stdout=log, stderr=subprocess.STDOUT)
        (evidence / 'result.json').write_text(json.dumps(
            {'route': 'local', 'returncode': code, 'wallSeconds': time.monotonic() - start}, indent=2))
        if code == 0 and any(not Path(path).exists() for path, _ in job.outputs):
            raise RuntimeError('local Blender did not create all declared outputs')
        return code
    finally:
        stop.set()
        slot.remove_if_token(cls, number, token)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--route', choices=['auto', 'mini', 'local'], default='auto')
    parser.add_argument('--slot', default='C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py')
    parser.add_argument('--host', default='mini')
    parser.add_argument('--evidence', type=Path, required=True)
    args = parser.parse_args(argv)
    job = Job(json.loads(args.manifest.read_text(encoding='utf-8-sig')))
    if args.route in ('auto', 'local'):
        code = local(job, args.slot, args.evidence)
        if code is not None:
            return code
        if args.route == 'local':
            print('local Blender slot is busy', file=sys.stderr)
            return 3
        print('local slot busy; routing to mini', file=sys.stderr)
    return mini(job, args.host, args.evidence)


if __name__ == '__main__':
    sys.exit(main())
