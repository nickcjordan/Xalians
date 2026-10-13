import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
try:
    import numpy as np
    import rig_core as rc
except ImportError:  # pragma: no cover
    np = None


def synthetic_upper_body(shift=0.):
    """Elliptical sections: a neck column .14 wide above z .43, a shoulder flare to .51 wide at z .31, a
    gently widening chest below, and free-hanging arms below an armpit at z .22. shift moves every
    landmark down by that much (a longer neck)."""
    rows = []
    t = np.linspace(0, 2*np.pi, 240, endpoint=False)
    for z in np.arange(-.05, .56, .002):
        h = z+shift
        if h >= .43:
            a = .07
        elif h >= .31:
            a = .07+(.43-h)/.12*.185
        else:
            a = .255+(.31-h)*.2
        rows.append(np.c_[a*np.cos(t), -.03+.08*np.sin(t), np.full_like(t, z)])
        if h < .22:
            for cx in (-.33, .33):
                rows.append(np.c_[cx+.035*np.cos(t), -.03+.035*np.sin(t), np.full_like(t, z)])
    return np.concatenate(rows)


@unittest.skipIf(np is None, 'numpy not installed')
class NeckShoulderLandmarkTests(unittest.TestCase):
    def test_landmarks_sit_on_the_flare(self):
        nb, line = rc.neck_shoulder_landmarks(synthetic_upper_body(), .50, -.05)
        self.assertAlmostEqual(line, .31, delta=.015)
        self.assertAlmostEqual(nb, (.43+.31)/2, delta=.015)
        self.assertGreater(nb, line)

    def test_landmarks_follow_the_mesh(self):
        nb0, line0 = rc.neck_shoulder_landmarks(synthetic_upper_body(), .50, -.05)
        nb1, line1 = rc.neck_shoulder_landmarks(synthetic_upper_body(.04), .50, -.05)
        self.assertAlmostEqual(nb0-nb1, .04, delta=.01)
        self.assertAlmostEqual(line0-line1, .04, delta=.01)

    def test_arm_splay_below_the_armpit_is_ignored(self):
        body = synthetic_upper_body()
        # arms flaring hard outward below the armpit must not move the shoulder line
        low = body[:, 2] < .22
        arm = low & (np.abs(body[:, 0]) > .29)
        body[arm, 0] *= 1+(.22-body[arm, 2])*3
        nb, line = rc.neck_shoulder_landmarks(body, .50, -.05)
        self.assertAlmostEqual(line, .31, delta=.015)


if __name__ == '__main__':
    unittest.main()
