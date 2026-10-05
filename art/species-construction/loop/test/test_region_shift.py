import sys
import unittest
from pathlib import Path
from unittest import mock

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import region_shift  # noqa: E402
import recipe_steps as rs  # noqa: E402

FRAME = {'floorZ': 0.0, 'fixedHeight': 1.0}
# at runs from the crown (z = 1) to the floor (z = 0); zones overlap like the arm and leg zones do
ZONES = {'note': 'x', 'ARM': {'at': [.3, .7], 'x': [.1, .3], 'symmetricX': True, 'y': [-1, 1]},
         'LEG': {'at': [.5, 1.0], 'x': [0, .3], 'symmetricX': True, 'y': [-1, 1]}}


def grid():
    xs, zs = np.meshgrid(np.linspace(-.3, .3, 31), np.linspace(0, 1, 51))
    return np.stack([xs.ravel(), np.zeros(xs.size), zs.ravel()], axis=1)


class Shift(unittest.TestCase):
    def run_shift(self, base, cand, owned):
        with mock.patch.object(rs, 'glb_vertices', side_effect=lambda p, skin_only=True: {'b': base, 'c': cand}[p]):
            return region_shift.shift('b', 'c', ZONES, FRAME, owned)

    def test_a_change_inside_the_owned_zone_is_not_charged_to_an_overlapping_region(self):
        base = grid()
        cand = base.copy()
        # move a paw at z .4 (at .6), x .2: inside ARM and LEG
        sel = (np.abs(cand[:, 0] - .2) < .03) & (np.abs(cand[:, 2] - .4) < .03)
        cand[sel, 1] += .05
        rows = self.run_shift(base, cand, ['ARM'])
        self.assertGreater(rows['ARM']['max'], .04)
        self.assertEqual(rows['LEG']['max'], 0.0)
        # without the owner the leg sees it
        self.assertGreater(self.run_shift(base, cand, [])['LEG']['max'], .04)

    def test_a_change_outside_the_owned_zone_is_charged(self):
        base = grid()
        cand = base.copy()
        sel = (np.abs(cand[:, 0]) < .03) & (np.abs(cand[:, 2] - .2) < .03)  # at .8, x 0: LEG only
        cand[sel, 1] += .02
        rows = self.run_shift(base, cand, ['ARM'])
        self.assertGreater(rows['LEG']['max'], region_shift.CARRY_TOL)


if __name__ == '__main__':
    unittest.main()
