import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import plan_job as pj  # noqa: E402


class DeadPlanRetry(unittest.TestCase):
    """Audit 2026-10-07 recommendation 19: a run-plan that dies without a result is started once more; a second death is an alarm."""

    def setUp(self):
        self.saved = pj.cmd_start, pj.alive
        d = Path(tempfile.mkdtemp())
        self.plan = d/'r99-R07.json'
        self.plan.write_text('{}')
        _, _, self.job, log = pj.paths(self.plan)
        self.job.write_text(json.dumps({'pid': 999999, 'top': 2}))
        log.write_text('boom\n')
        self.started = []

        def fake_start(a):
            self.started.append(a)
            self.job.write_text(json.dumps({'pid': 999998, 'top': a.top}))
        pj.cmd_start, pj.alive = fake_start, (lambda pid: False)

    def tearDown(self):
        pj.cmd_start, pj.alive = self.saved

    def test_first_death_restarts_second_alarms(self):
        class A:
            plan, timeout = str(self.plan), 1
        with contextlib.redirect_stdout(io.StringIO()):
            first = pj.cmd_wait(A)
        self.assertEqual(first, 3)
        self.assertEqual(len(self.started), 1)
        self.assertEqual(self.started[0].top, 2)
        self.assertTrue(json.loads(self.job.read_text())['retried'])
        with contextlib.redirect_stdout(io.StringIO()) as out:
            second = pj.cmd_wait(A)
        self.assertEqual(second, 1)
        self.assertTrue(json.loads(out.getvalue())['alarm'])
        self.assertEqual(len(self.started), 1)


if __name__ == '__main__':
    unittest.main()
