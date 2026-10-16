import io
import json
from pathlib import Path
import tarfile
import tempfile
import subprocess
import sys
import unittest
from unittest.mock import patch

import mini_blender as runner


class MappingTests(unittest.TestCase):
    def config(self):
        return {'mappings': [{'source': 'C:/dev/input space', 'target': 'scene'},
                             {'source': 'C:/dev/output', 'target': 'results'}],
                'inputs': ['C:/dev/input space/model.blend'], 'outputs': ['C:/dev/output/front.png'],
                'args': ['-b', 'C:/dev/input space/model.blend', '-o', 'C:/dev/output/front.png']}

    def test_windows_wsl_and_case_map_to_same_target(self):
        job = runner.Job(self.config())
        expected = 'work/scene/model.blend'
        self.assertEqual(job.mapped(r'c:\dev\input space\model.blend'), expected)
        self.assertEqual(job.mapped('/mnt/c/dev/input space/model.blend'), expected)
        self.assertEqual(job.arg('--file=/mnt/c/dev/input space/model.blend', remote=True),
                         '--file=/job/' + expected)
        self.assertEqual(job.arg('C:/DEV/INPUT SPACE/MODEL.BLEND', remote=True), '/job/' + expected)
        self.assertEqual(job.arg('C:/DEV/INPUT SPACE', remote=True), '/job/work/scene')

    def test_prefix_boundary_and_traversal_are_rejected(self):
        job = runner.Job(self.config())
        for path in ('C:/dev/input spacer/model.blend', 'C:/dev/input space/../secret'):
            with self.assertRaises(ValueError):
                job.mapped(path)
        for path in ('/etc/passwd', '../secret', 'C:/secret', 'foo\\bar'):
            with self.assertRaises(ValueError):
                runner.relative(path)

    def test_mapping_collisions_and_output_input_overlap_are_rejected(self):
        cfg = self.config()
        cfg['mappings'][1]['target'] = 'scene/nested'
        with self.assertRaises(ValueError):
            runner.Job(cfg)
        cfg = self.config()
        cfg['outputs'] = ['C:/dev/input space/MODEL.blend']
        with self.assertRaises(ValueError):
            runner.Job(cfg)
        cfg = self.config()
        cfg['outputs'] = ['C:/dev/input space']
        with self.assertRaises(ValueError):
            runner.Job(cfg)

    def test_threads_and_interactive_jobs_are_rejected(self):
        for args in (['-b', '-t', '99'], ['--threads=99', '-b'], ['--version']):
            cfg = self.config()
            cfg['args'] = args
            with self.assertRaises(ValueError):
                runner.Job(cfg)

    def test_auto_routes_only_when_slot_busy(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'job.json'
            path.write_text(json.dumps(self.config()))
            with patch.object(runner, 'local', return_value=None), patch.object(runner, 'mini', return_value=0) as mini:
                self.assertEqual(runner.main([str(path), '--evidence', directory]), 0)
                mini.assert_called_once()
            # A failed local job must never get silently repeated remotely.
            with patch.object(runner, 'local', return_value=3), patch.object(runner, 'mini') as mini:
                self.assertEqual(runner.main([str(path), '--evidence', directory]), 3)
                mini.assert_not_called()

    def test_disconnected_local_worker_stops_child_before_exit(self):
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory) / 'finished'
            command = [sys.executable, str(Path(__file__).with_name('local_worker.py')),
                       sys.executable, '-c',
                       'import time,pathlib; time.sleep(2); pathlib.Path(' + repr(str(marker)) + ').touch()']
            process = subprocess.Popen(command, stdin=subprocess.PIPE)
            process.stdin.close()
            process.wait(timeout=10)
            # If the worker returns before reaping the child, this marker can
            # still appear. Waiting through the child's planned completion
            # makes the regression observable.
            import time
            time.sleep(2.2)
            self.assertFalse(marker.exists())

    def test_connected_call_closes_and_reaps_on_interrupt(self):
        from unittest.mock import MagicMock
        child = MagicMock()
        child.wait.side_effect = [KeyboardInterrupt(), 0]
        with patch.object(runner.subprocess, 'Popen', return_value=child):
            with self.assertRaises(KeyboardInterrupt):
                runner.connected_call(['worker'])
        child.stdin.close.assert_called_once()
        self.assertEqual(child.wait.call_count, 2)


if __name__ == '__main__':
    unittest.main()
