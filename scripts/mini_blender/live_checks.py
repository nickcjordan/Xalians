"""Exercise real remote pause/resume, failure diagnostics and workspace cleanup.

Run on the mini after install: python3 .mini-blender/live_checks.py
This uses only dedicated mini-blender jobs and the compute Docker socket. CI
activity is simulated at the supervisor probe boundary, never inside CI's VM.
"""
import io
import json
from pathlib import Path
import tarfile
import tempfile
from unittest.mock import patch
import uuid

import remote


def check(fail=False):
    job_id = uuid.uuid4().hex
    job = remote.ROOT / 'jobs' / job_id
    job.mkdir(parents=True)
    with tempfile.TemporaryDirectory() as scratch:
        root = Path(scratch)
        script = root / 'smoke.py'
        script.write_text('import time,pathlib,bpy\n' + (
            'time.sleep(8)\nraise RuntimeError("intentional diagnostic test")\n' if fail else
            's=bpy.context.scene\ns.render.engine="CYCLES"\ns.cycles.device="CPU"\n'
            's.cycles.samples=1\ns.cycles.use_denoising=True\ns.render.resolution_percentage=10\n'
            's.render.filepath="/job/work/cube.png"\nbpy.ops.render.render(write_still=True)\n'
            'time.sleep(8)\npathlib.Path("/job/work/output.txt").write_text("ok")\n'))
        config = root / 'job.json'
        config.write_text(json.dumps({'args': ['-b', '--python-exit-code', '1', '--python', '/job/work/smoke.py'],
                                      'outputs': ['work/output.txt']}))
        with tarfile.open(job / 'inputs.tar', 'w') as tar:
            tar.add(script, arcname='work/smoke.py')
            tar.add(config, arcname='job.json')
    output = io.BytesIO()
    # One simulated CI interval after launch, while the real container runs.
    states = iter([False, True, True, False])
    with patch.object(remote, 'ci_busy', side_effect=lambda: next(states, False)), \
         patch.object(remote, 'heartbeat'), patch.object(remote.sys, 'stdout') as stdout:
        stdout.buffer = output
        code = remote.run(job_id)
    output.seek(0)
    with tarfile.open(fileobj=output) as tar:
        stats = json.load(tar.extractfile('result.json'))
        log = tar.extractfile('blender.log').read().decode()
        (remote.ROOT / ('live-failure.log' if fail else 'live-success.log')).write_text(log)
        (remote.ROOT / ('live-failure.json' if fail else 'live-success.json')).write_text(json.dumps(stats, indent=2))
        if not fail:
            assert tar.extractfile('work/output.txt').read() == b'ok'
        else:
            assert 'intentional diagnostic test' in log
    assert bool(code) == fail
    assert not job.exists()
    assert stats['ciPausedSeconds'] >= 5
    return stats


if __name__ == '__main__':
    print(json.dumps({'pauseResume': check(), 'failureDiagnostics': check(True)}, indent=2))
