"""Tests for the studio Blender runner's slot rule (no Blender): python -m unittest discover -s art/studio/tests -v"""
import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import runner  # noqa: E402


class Clock:
    def __init__(self):
        self.t = time.time()

    def now(self):
        return self.t

    def sleep(self, s):
        self.t += max(s, 1.0)


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.cfg = {**runner.load_config(), 'work': Path(self.tmp.name)}
        self.clock = Clock()

    def tearDown(self):
        self.tmp.cleanup()

    def take(self, free=100.0, alive=lambda pid: True):
        return runner.acquire_slot(self.cfg, free_memory=lambda: free, alive=alive, sleep=self.clock.sleep, now=self.clock.now)

    def test_config_is_not_tied_to_a_species(self):
        raw = json.loads(runner.CONFIG_FILE.read_text(encoding='utf-8'))
        self.assertNotIn('akinza', json.dumps(raw).lower())
        self.assertEqual(runner.load_config()['work'].parts[-3:], ('art-data', 'studio', 'blender'))

    def test_need_rule(self):
        c = self.cfg
        self.assertEqual(runner.free_needed(0, c), 0)
        self.assertEqual(runner.free_needed(1, c), c['minFreeGb'])
        self.assertEqual(runner.free_needed(2, c), c['thirdSlotFreeGb'])
        self.assertIsNone(runner.free_needed(c['maxSlots'], c))

    def test_first_slot_always_starts_second_needs_memory(self):
        a = self.take(free=0.0)
        self.assertTrue(a.is_file())
        # the second waits for memory: with plenty it starts once the first has settled
        b = self.take(free=50.0)
        self.assertNotEqual(a, b)
        self.assertEqual(len(list((Path(self.tmp.name)/'slots').glob('slot-*.lock'))), 2)

    def test_dead_holder_frees_its_slot(self):
        a = self.take()
        a.write_text('99999999')
        again = self.take(alive=lambda pid: False)
        self.assertEqual(again, a)

    def test_slots_dir_is_under_work(self):
        a = self.take()
        self.assertEqual(a.parent, Path(self.tmp.name)/'slots')


if __name__ == '__main__':
    unittest.main()
