"""Run on macOS or Linux, where the supervisor's fcntl lock is available."""
import io
from pathlib import Path
import subprocess
import tarfile
import tempfile
import threading
import unittest
import uuid
from unittest.mock import Mock, patch

try:
    import remote
except ImportError:
    remote = None


@unittest.skipIf(remote is None, 'supervisor tests require POSIX fcntl')
class RemoteTests(unittest.TestCase):
    def test_nonblocking_ssh_stdin_does_not_kill_heartbeat_thread(self):
        cancel = threading.Event()
        with patch.object(remote.select, 'select', return_value=([remote.sys.stdin], [], [])), \
             patch.object(remote.os, 'read', side_effect=[BlockingIOError(), b'']):
            remote.heartbeat(cancel)
        self.assertTrue(cancel.is_set())

    def test_spurious_readiness_still_expires_heartbeat(self):
        cancel = threading.Event()
        with patch.object(remote.select, 'select', return_value=([remote.sys.stdin], [], [])), \
             patch.object(remote.os, 'read', side_effect=BlockingIOError()), \
             patch.object(remote.time, 'monotonic', side_effect=[0, 46]):
            remote.heartbeat(cancel)
        self.assertTrue(cancel.is_set())

    def test_ci_pause_waits_for_container_creation(self):
        process = Mock()
        process.poll.return_value = None
        with patch.object(remote, 'docker', side_effect=[Mock(returncode=1), Mock(returncode=0, stdout='true\n')]), \
             patch.object(remote.time, 'sleep'):
            remote.wait_started(process, 'starting')

    def test_ci_status_fails_closed(self):
        for code, busy in [(0, True), (1, False), (2, True), (255, True)]:
            with patch.object(remote.subprocess, 'run', side_effect=[Mock(returncode=0), Mock(returncode=code, stderr='')]):
                self.assertEqual(remote.ci_busy(), busy)
        with patch.object(remote.subprocess, 'run', side_effect=subprocess.TimeoutExpired('lima', 15)):
            self.assertTrue(remote.ci_busy())
        with patch.object(remote.subprocess, 'run', return_value=Mock(returncode=1)):
            self.assertTrue(remote.ci_busy())
        with patch.object(remote.subprocess, 'run', side_effect=[Mock(returncode=0), Mock(returncode=1, stderr='lima error')]):
            self.assertTrue(remote.ci_busy())

    def test_orphan_container_blocks_new_work(self):
        with patch.object(remote, 'docker', return_value=Mock(stdout='orphan-id\n')):
            with self.assertRaises(RuntimeError):
                remote.reject_orphans()

    def test_render_finishing_during_ci_probe_is_not_failure(self):
        process = Mock()
        process.poll.side_effect = [None, 0]
        with patch.object(remote, 'docker', return_value=Mock(returncode=1)):
            self.assertFalse(remote.pause_if_running(process, 'finished'))

    def test_pause_failure_with_live_render_is_error(self):
        process = Mock()
        process.poll.return_value = None
        process.wait.side_effect = subprocess.TimeoutExpired('docker', 2)
        with patch.object(remote, 'docker', return_value=Mock(returncode=1)):
            with self.assertRaises(RuntimeError):
                remote.pause_if_running(process, 'running')

    def test_unpause_failure_with_live_render_is_error(self):
        process = Mock()
        process.poll.return_value = None
        process.wait.side_effect = subprocess.TimeoutExpired('docker', 2)
        with patch.object(remote, 'docker', return_value=Mock(returncode=1)):
            with self.assertRaises(RuntimeError):
                remote.unpause_if_running(process, 'running')

    def test_daemon_failure_prevents_workspace_deletion(self):
        with tempfile.TemporaryDirectory() as directory:
            job = Path(directory) / 'job'
            job.mkdir()
            with patch.object(remote, 'docker', return_value=Mock(returncode=1, stderr='daemon unavailable')):
                with self.assertRaises(RuntimeError):
                    remote.cancellation(job)
            self.assertTrue(job.exists())

    def test_archive_symlinks_and_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, kind in [('../escape', tarfile.REGTYPE), ('link', tarfile.SYMTYPE)]:
                archive = root / 'input.tar'
                with tarfile.open(archive, 'w') as tar:
                    m = tarfile.TarInfo(name)
                    m.type = kind
                    tar.addfile(m)
                with self.assertRaises(ValueError):
                    remote.safe_extract(archive, root / 'target')

    def test_active_supervisor_prevents_early_workspace_deletion(self):
        with tempfile.TemporaryDirectory() as directory:
            job = Path(directory) / 'job'
            job.mkdir()
            with patch.object(remote.fcntl, 'flock', side_effect=BlockingIOError), \
                 patch.object(remote.time, 'monotonic', side_effect=[1, 62]), \
                 patch.object(remote.shutil, 'rmtree') as delete:
                with self.assertRaises(TimeoutError):
                    remote.cancellation(job)
                delete.assert_not_called()

    def test_supervisor_failure_transfers_diagnostics_then_cleans(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            job_id = uuid.uuid4().hex
            job = root / 'jobs' / job_id
            job.mkdir(parents=True)
            output = io.BytesIO()
            with patch.object(remote, 'ROOT', root), patch.object(remote, 'heartbeat'), \
                 patch.object(remote, 'stop_container'), patch.object(remote, 'reject_orphans'), \
                 patch.object(remote.sys, 'stdout') as stdout:
                stdout.buffer = output
                self.assertEqual(remote.run(job_id), 1)
            output.seek(0)
            with tarfile.open(fileobj=output) as tar:
                import json
                result = json.load(tar.extractfile('result.json'))
                self.assertIn('inputs.tar', result['error'])
                self.assertIsNotNone(tar.getmember('blender.log'))
            self.assertFalse(job.exists())


if __name__ == '__main__':
    unittest.main()
