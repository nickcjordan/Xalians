"""seam_check on synthetic silhouettes: an unchanged figure scores zero, a collar on a leg is flagged.

    python -m unittest art/species-construction/loop/test/test_seam_check.py -v      (from the repository root)
"""
import sys
import unittest
from pathlib import Path

import numpy as np

LOOP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(LOOP))
import seam_check as sc  # noqa: E402

N = sc.GRID


def figure(collar=0):
    """A leg-like tube, 40 samples wide, standing from the crown to the floor of a 700-sample frame,
    with a collar (a ring `collar` samples wider each side) around the ankle row when asked."""
    a = np.zeros((N, N))
    for r in range(N):
        half = 20+(collar if abs(r/N-0.914) < 0.012 else 0)
        a[r, N//2-half:N//2+half] = 1
    return a


def scores(arr, baseline=None):
    return sc.seam_scores(arr, 'front', joints=['ankle'], span=(0, N), cx=N/2, baseline=baseline)['ankle']


class SeamTests(unittest.TestCase):
    def test_unchanged_is_zero(self):
        s = scores(figure(), baseline=figure())
        d = sc.compare({'ankle': s}, {'ankle': scores(figure())})['ankle']['delta']
        self.assertTrue(all(v == 0 for v in d.values()), d)

    def test_collar_is_flagged(self):
        base, cand = scores(figure()), scores(figure(collar=6), baseline=figure())
        d = sc.compare({'ankle': cand}, {'ankle': base})['ankle']['delta']
        self.assertTrue({'bump', 'wbump'} & set(sc.flags(d, 'change', 'ankle')), d)

    def test_standalone_clean_tube_not_flagged(self):
        s = scores(figure())
        self.assertEqual(sc.flags({m: s.get(m, 0) for m in sc.OUTLINE}, 'absolute', 'ankle'), [])


if __name__ == '__main__':
    unittest.main()
