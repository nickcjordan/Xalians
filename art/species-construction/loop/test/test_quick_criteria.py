import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import quick_criteria as qc  # noqa: E402


def c(value, result, lo=None, hi=None):
    return {'value': value, 'result': result, 'min': lo, 'max': hi}


class Progress(unittest.TestCase):
    def test_flips_and_distance(self):
        base = {'A': c(1.163, 'fail', .95, 1.08), 'B': c(.931, 'pass', .9, 1.15)}
        cand = {'A': c(1.079, 'pass', .95, 1.08), 'B': c(.864, 'fail', .9, 1.15)}
        points, detail = qc.progress(base, cand)
        self.assertEqual(detail['flips'], 0)
        # A closes .083/1.08, B opens .036/.9
        self.assertAlmostEqual(detail['closed'], .083/1.08-.036/.9, places=3)
        self.assertTrue(detail['moved'])
        self.assertAlmostEqual(points, qc.DIST_WEIGHT*detail['closed'], places=2)

    def test_still_is_not_moved(self):
        base = {'A': c(1.0, 'pass', .9, 1.1)}
        points, detail = qc.progress(base, {'A': c(1.0005, 'pass', .9, 1.1)})
        self.assertEqual(points, 0)
        self.assertFalse(detail['moved'])

    def test_missing_values_are_skipped(self):
        points, detail = qc.progress({'A': c(None, 'fail')}, {'A': c(1.0, 'pass', .9)})
        self.assertEqual((points, detail['flips']), (0, 0))


if __name__ == '__main__':
    unittest.main()
