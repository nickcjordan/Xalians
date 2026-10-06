import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import face_measure as fm  # noqa: E402

BASE = {'eyes': [{'irisOffset': .08, 'bandTopBottom': 7.0, 'bandMin': .4}, {'irisOffset': .05, 'bandTopBottom': 7.1, 'bandMin': .41}]}
RING = {'eyes': [{'irisOffset': .17, 'bandTopBottom': 1.9, 'bandMin': 2.8}, {'irisOffset': .16, 'bandTopBottom': 2.1, 'bandMin': 2.7}]}


class Guards(unittest.TestCase):
    def test_an_even_ring_and_a_convergent_stare_fail(self):
        fails = fm.guard_failures(RING, BASE)
        self.assertEqual([f.split()[0] for f in fails], ['irisOffset', 'bandTopBottom', 'bandMin'])

    def test_an_unchanged_face_never_fails(self):
        self.assertEqual(fm.guard_failures(BASE, BASE), [])

    def test_a_baseline_that_already_breaks_a_guard_does_not_block_an_equal_candidate(self):
        self.assertEqual(fm.guard_failures(RING, RING), [])


if __name__ == '__main__':
    unittest.main()
