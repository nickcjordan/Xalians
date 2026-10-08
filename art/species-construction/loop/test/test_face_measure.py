import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import face_measure as fm  # noqa: E402

BASE = {'eyes': [{'irisOffset': .08, 'bandTopBottom': 7.0, 'bandMin': .4}, {'irisOffset': .05, 'bandTopBottom': 7.1, 'bandMin': .41}]}
RING = {'eyes': [{'irisOffset': .17, 'bandTopBottom': 1.9, 'bandMin': 2.8}, {'irisOffset': .16, 'bandTopBottom': 2.1, 'bandMin': 2.7}]}


class Guards(unittest.TestCase):
    def test_a_convergent_stare_fails_and_a_bold_ring_does_not(self):
        # Nick 2026-10-07: the eye outline is bold, so the ring guards are retired; the stare guard (I01) stays
        fails = fm.guard_failures(RING, BASE)
        self.assertEqual([f.split()[0] for f in fails], ['irisOffset'])
        bold = {'eyes': [dict(e, irisOffset=.06) for e in RING['eyes']]}
        self.assertEqual(fm.guard_failures(bold, BASE), [])

    def test_an_eye_that_cannot_be_measured_fails(self):
        one = {'eyes': [BASE['eyes'][0], {'irisOffset': None, 'bandTopBottom': None, 'bandMin': None}]}
        fails = fm.guard_failures(one, BASE)
        self.assertEqual([f.split()[0] for f in fails], ['measureFailed'])

    def test_an_unchanged_face_never_fails(self):
        self.assertEqual(fm.guard_failures(BASE, BASE), [])

    def test_a_baseline_that_already_breaks_a_guard_does_not_block_an_equal_candidate(self):
        self.assertEqual(fm.guard_failures(RING, RING), [])


if __name__ == '__main__':
    unittest.main()
