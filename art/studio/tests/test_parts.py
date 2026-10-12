"""Tests for the part kinds (numpy only): python -m unittest discover -s art/studio/tests -v"""
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from parts import Instance, KINDS, build_field, mass, ownership, part_keys, shell, smin, sweep  # noqa: E402
from parts.common import pchip  # noqa: E402


def inst(kind, params, mirror=None, blend=0.03, part='p'):
    return Instance({'part': part, 'kind': kind, 'params': params, 'mirror': mirror, 'blend': blend})


class MassTests(unittest.TestCase):
    def test_sign_ellipsoid(self):
        p = {'radii': [0.2, 0.1, 0.3], 'center': [1, 2, 3]}
        pts = np.array([[1, 2, 3], [1.19, 2, 3], [1.25, 2, 3], [1, 2.2, 3], [1, 2, 3.29], [1, 2, 3.4]])
        d = mass.sdf(p, pts)
        self.assertLess(d[0], 0)
        self.assertLess(d[1], 0)
        self.assertGreater(d[2], 0)
        self.assertGreater(d[3], 0)
        self.assertLess(d[4], 0)
        self.assertGreater(d[5], 0)
        self.assertAlmostEqual(float(mass.sdf(p, np.array([[1.2, 2, 3]]))[0]), 0.0, places=6)

    def test_distance_is_close_to_euclidean_for_a_sphere(self):
        d = mass.sdf({'radii': [.1, .1, .1]}, np.array([[0.3, 0, 0]]))[0]
        self.assertAlmostEqual(float(d), 0.2, places=6)

    def test_boxiness(self):
        corner = np.array([[0.08, 0.08, 0.08]])
        round_ = mass.sdf({'radii': [.1, .1, .1], 'exponent': 2}, corner)[0]
        boxy = mass.sdf({'radii': [.1, .1, .1], 'exponent': 8}, corner)[0]
        self.assertGreater(round_, 0)
        self.assertLess(boxy, 0)

    def test_rotation(self):
        p = {'radii': [0.3, 0.05, 0.05], 'rotation': [0, 0, 90]}
        d = mass.sdf(p, np.array([[0, 0.25, 0], [0.25, 0, 0]]))
        self.assertLess(d[0], 0)
        self.assertGreater(d[1], 0)

    def test_bounds_contain_the_solid(self):
        p = {'radii': [0.3, 0.05, 0.1], 'rotation': [10, 20, 30], 'center': [0.1, 0, 0]}
        lo, hi = mass.bounds(p)
        rng = np.random.default_rng(0)
        pts = rng.uniform(lo-0.2, hi+0.2, (20000, 3))
        inside = mass.sdf(p, pts) < 0
        self.assertTrue(np.all(pts[inside] >= lo-1e-9) and np.all(pts[inside] <= hi+1e-9))


class SweepTests(unittest.TestCase):
    P = {'points': [[0, 0, 0, 0.1], [0, 0, 0.5, 0.06], [0, 0, 1.0, 0.03]]}

    def test_sign(self):
        d = sweep.sdf(self.P, np.array([[0, 0, 0.5], [0.05, 0, 0.5], [0.2, 0, 0.5], [0, 0, 1.2], [0, 0, 2]]))
        self.assertLess(d[0], 0)
        self.assertLess(d[1], 0)
        self.assertGreater(d[2], 0)
        self.assertGreater(d[3], 0)
        self.assertGreater(d[4], 0)

    def test_radius_at_a_control_is_the_given_radius(self):
        d = sweep.sdf(self.P, np.array([[0.06, 0, 0.5]]))[0]
        self.assertAlmostEqual(float(d), 0.0, delta=2e-3)

    def test_radius_tapers_monotonically(self):
        S, r, q, _, _ = sweep.spine({'points': [[0, 0, 0, 0.12], [0, 0.2, 0.3, 0.09], [0, 0.5, 0.5, 0.05],
                                                [0, 1.0, 0.5, 0.05], [0, 1.4, 0.4, 0.02]]})
        self.assertTrue(np.all(np.diff(r) <= 1e-12), 'radius must never grow along a non-increasing control list')
        self.assertAlmostEqual(float(r[0]), 0.12)
        self.assertAlmostEqual(float(r[-1]), 0.02)

    def test_pchip_does_not_overshoot(self):
        x = np.arange(5.0)
        y = np.array([1.0, 0.9, 0.2, 0.19, 0.18])
        v = pchip(x, y, np.linspace(0, 4, 400))
        self.assertTrue(np.all(np.diff(v) <= 1e-12))
        self.assertTrue(v.max() <= 1.0+1e-12 and v.min() >= 0.18-1e-12)

    def test_elliptic_section(self):
        p = {'points': [[0, 0, 0, 0.1, 0.5], [0, 0, 1, 0.1, 0.5]], 'up': [0, 1, 0]}
        # width (along x, perpendicular to up and the tangent) is r; thickness along up (y) is 0.5 r
        d = sweep.sdf(p, np.array([[0.08, 0, 0.5], [0, 0.08, 0.5], [0, 0.04, 0.5]]))
        self.assertLess(d[0], 0)
        self.assertGreater(d[1], 0)
        self.assertLess(d[2], 0)

    def test_bounds_contain_the_solid(self):
        lo, hi = sweep.bounds(self.P)
        rng = np.random.default_rng(1)
        pts = rng.uniform(lo-0.1, hi+0.1, (20000, 3))
        inside = sweep.sdf(self.P, pts) < 0
        self.assertTrue(np.all(pts[inside] >= lo-1e-9) and np.all(pts[inside] <= hi+1e-9))

    def test_needs_two_points(self):
        with self.assertRaises(ValueError):
            sweep.bounds({'points': [[0, 0, 0, 0.1]]})


class ShellTests(unittest.TestCase):
    P = {'center': [0, 0, 0], 'normal': [0, 1, 0], 'up': [0, 0, 1],
         'outline': [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]],
         'smooth': 0, 'thickness': 0.04, 'rimThickness': 0.01, 'rimWidth': 0.1}

    def test_sign(self):
        d = shell.sdf(self.P, np.array([[0, 0, 0], [0, 0.015, 0], [0, 0.05, 0], [0.5, 0, 0], [0, 0, 0.4]]))
        self.assertLess(d[0], 0)
        self.assertLess(d[1], 0)
        self.assertGreater(d[2], 0)
        self.assertGreater(d[3], 0)
        self.assertGreater(d[4], 0)

    def test_thins_toward_the_rim(self):
        # inside at the center at half thickness 0.02 minus; near the rim only the rim thickness remains
        center = shell.sdf(self.P, np.array([[0, 0.018, 0]]))[0]
        rim = shell.sdf(self.P, np.array([[0.29, 0.018, 0]]))[0]
        self.assertLess(center, 0)
        self.assertGreater(rim, 0)

    def test_bend_moves_the_plate_along_the_normal(self):
        p = {**self.P, 'bend': 4.0, 'bendAxis': 'u'}
        # the plate frame: v = up = +z, n = +y, u = cross(v, n) = +x; at u = .25 the mid surface sits at y = .125
        d = shell.sdf(p, np.array([[0.25, 0.125, 0.0], [0.25, 0.0, 0.0]]))
        self.assertLess(d[0], 0)
        self.assertGreater(d[1], 0)

    def test_bounds_contain_the_solid(self):
        p = {**self.P, 'bend': 3.0, 'normal': [0.3, 1, 0.2], 'smooth': 2}
        lo, hi = shell.bounds(p)
        rng = np.random.default_rng(2)
        pts = rng.uniform(lo-0.1, hi+0.1, (40000, 3))
        inside = shell.sdf(p, pts) < 0
        self.assertGreater(inside.sum(), 100)
        self.assertTrue(np.all(pts[inside] >= lo-1e-9) and np.all(pts[inside] <= hi+1e-9))

    def test_smoothing_cuts_corners(self):
        sharp = shell.sdf({**self.P, 'smooth': 0}, np.array([[0.295, 0, 0.295]]))[0]
        round_ = shell.sdf({**self.P, 'smooth': 3}, np.array([[0.295, 0, 0.295]]))[0]
        self.assertLess(sharp, 0.0)
        self.assertGreater(round_, sharp)


class InstanceTests(unittest.TestCase):
    def test_mirror_symmetry(self):
        p = {'radii': [0.1, 0.1, 0.2], 'center': [0.4, 0.1, 0.2]}
        i = inst('mass', p, mirror='x')
        rng = np.random.default_rng(3)
        pts = rng.uniform(-1, 1, (3000, 3))
        flipped = pts*np.array([-1, 1, 1])
        np.testing.assert_allclose(i.sdf(pts), i.sdf(flipped), atol=1e-9)
        lo, hi = i.bounds()
        self.assertAlmostEqual(float(lo[0]), -float(hi[0]))

    def test_mirror_adds_the_other_side(self):
        p = {'points': [[0.3, 0, 0, 0.05], [0.4, 0, 0.5, 0.04]]}
        one, both = inst('sweep', p), inst('sweep', p, mirror='x')
        probe = np.array([[-0.35, 0, 0.25]])
        self.assertGreater(one.sdf(probe)[0], 0)
        self.assertLess(both.sdf(probe)[0], 0)

    def test_unknown_kind(self):
        with self.assertRaises(ValueError):
            inst('blob', {})

    def test_kinds_registered(self):
        self.assertEqual(sorted(KINDS), ['mass', 'shell', 'sweep'])


class UnionTests(unittest.TestCase):
    def test_smin_continuous_and_bounded(self):
        a = np.linspace(-1, 1, 2001)
        b = 0.3
        s = smin(a, np.full_like(a, b), 0.2)
        self.assertLessEqual(float(np.abs(np.diff(s)).max()), float(np.diff(a)[0])*1.0001)   # 1-Lipschitz in a
        self.assertTrue(np.all(s <= np.minimum(a, b)+1e-12))
        far = np.abs(a-b) >= 0.2
        np.testing.assert_allclose(s[far], np.minimum(a, b)[far])

    def test_union_of_two_masses_is_one_connected_blob(self):
        a = inst('mass', {'radii': [0.1, 0.1, 0.1], 'center': [-0.08, 0, 0]}, part='a', blend=0.05)
        b = inst('mass', {'radii': [0.1, 0.1, 0.1], 'center': [0.08, 0, 0]}, part='b', blend=0.05)
        origin, f, info = build_field([a, b], 0.01)
        # the field is negative at both centers and along the line between them, and the neck is wider than a hard union
        ix = lambda x: int(round((x-origin[0])/0.01))
        iy, iz = int(round(-origin[1]/0.01)), int(round(-origin[2]/0.01))
        line = f[ix(-0.08):ix(0.08)+1, iy, iz]
        self.assertTrue(np.all(line < 0))
        hard = np.minimum(a.sdf(np.array([[0.0, 0.095, 0.0]])), b.sdf(np.array([[0.0, 0.095, 0.0]])))[0]
        soft = f[ix(0.0), int(round((0.095-origin[1])/0.01)), iz]
        self.assertLess(soft, hard)

    def test_field_matches_direct_evaluation_near_the_surface(self):
        a = inst('mass', {'radii': [0.12, 0.08, 0.1]}, part='a', blend=0.03)
        origin, f, _ = build_field([a], 0.01)
        rng = np.random.default_rng(4)
        idx = np.stack([rng.integers(0, s, 500) for s in f.shape], axis=1)
        pts = origin+idx*0.01
        near = np.abs(f[idx[:, 0], idx[:, 1], idx[:, 2]]) < 0.03
        direct = a.sdf(pts)
        np.testing.assert_allclose(f[idx[:, 0], idx[:, 1], idx[:, 2]][near], direct[near], atol=1e-5)

    def test_ownership_picks_the_nearest_part(self):
        a = inst('mass', {'radii': [0.1, 0.1, 0.1], 'center': [-0.3, 0, 0]}, part='a')
        b = inst('mass', {'radii': [0.1, 0.1, 0.1], 'center': [0.3, 0, 0]}, part='b')
        keys = part_keys({'parts': [a.spec, b.spec]})
        which, weight = ownership([a, b], keys, np.array([[-0.3, 0, 0], [0.3, 0, 0], [0.0, 0, 0]]))
        self.assertEqual(list(which[:2]), [0, 1])
        self.assertGreater(weight[0], 0.99)
        self.assertLess(weight[2], 0.01)


if __name__ == '__main__':
    unittest.main()
