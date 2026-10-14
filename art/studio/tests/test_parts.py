"""Tests for the part kinds (numpy only): python -m unittest discover -s art/studio/tests -v"""
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from parts import Instance, KINDS, build_field, grid, mass, ownership, part_keys, separate_objects, shell, smax, smin, sweep, union_at  # noqa: E402
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
        self.assertEqual(sorted(KINDS), ['grid', 'mass', 'shell', 'sweep'])


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


def with_op(i, op):
    i.spec['op'] = op
    i.op = op
    return i


class CarveTests(unittest.TestCase):
    def setUp(self):
        self.ball = inst('mass', {'radii': [0.2, 0.2, 0.2]}, part='ball', blend=0.03)
        self.socket = with_op(inst('mass', {'radii': [0.06, 0.06, 0.06], 'center': [0, -0.15, 0]}, part='socket', blend=0.02),
                              'carve')
        self.eye = with_op(inst('mass', {'radii': [0.035, 0.035, 0.035], 'center': [0, -0.15, 0]}, part='eye', blend=0.01),
                           'add-after')

    def test_smax_is_the_mirror_of_smin(self):
        a = np.linspace(-1, 1, 41)
        np.testing.assert_allclose(smax(a, 0.3, 0.2), -smin(-a, -0.3, 0.2))
        far = np.abs(a-0.3) >= 0.2
        np.testing.assert_allclose(smax(a, 0.3, 0.2)[far], np.maximum(a, 0.3)[far])

    def test_carve_removes_material_and_leaves_the_rest(self):
        probe = np.array([[0, -0.15, 0], [0, -0.12, 0], [0, 0, 0], [0.1, 0.05, 0], [0, -0.3, 0]])
        before = union_at([self.ball], probe)
        after = union_at([self.ball, self.socket], probe)
        self.assertLess(before[0], 0)
        self.assertGreater(after[0], 0)                      # the socket center is empty now
        self.assertGreater(after[1], 0)
        self.assertLess(after[2], 0)                         # the ball's core is untouched
        self.assertLess(after[3], 0)
        self.assertGreater(after[4], 0)                      # outside stays outside
        np.testing.assert_allclose(after[2:4], before[2:4], atol=1e-9)

    def test_carve_is_a_smooth_subtraction(self):
        pts = np.array([[0, -0.15+0.06, 0], [0, -0.15+0.07, 0]])    # on the socket wall, and just behind it
        want = smax(self.ball.sdf(pts), -self.socket.sdf(pts), 0.02)
        np.testing.assert_allclose(union_at([self.ball, self.socket], pts), want)

    def test_order_in_the_spec_does_not_matter(self):
        probe = np.array([[0, -0.12, 0], [0, -0.15, 0], [0.02, -0.17, 0.01], [0, 0.1, 0]])
        a = union_at([self.ball, self.socket, self.eye], probe)
        b = union_at([self.eye, self.socket, self.ball], probe)
        np.testing.assert_allclose(a, b)

    def test_add_after_restores_material_inside_the_hollow(self):
        probe = np.array([[0, -0.15, 0]])
        self.assertGreater(union_at([self.ball, self.socket], probe)[0], 0)
        self.assertLess(union_at([self.ball, self.socket, self.eye], probe)[0], 0)
        # the eye is not itself carved: its own surface stays where it is
        edge = np.array([[0, -0.15+0.035, 0]])
        self.assertAlmostEqual(float(union_at([self.ball, self.socket, self.eye], edge)[0]), 0.0, delta=0.01)

    def test_grid_field_matches_the_direct_evaluation(self):
        insts = [self.ball, self.socket, self.eye]
        origin, f, _ = build_field(insts, 0.01)
        ix = lambda p: tuple(int(round((p[a]-origin[a])/0.01)) for a in range(3))
        for p in ([0, -0.15, 0], [0, -0.12, 0], [0, 0, 0], [0.1, -0.1, 0.05]):
            self.assertAlmostEqual(float(f[ix(p)]), float(union_at(insts, np.array([p]))[0]), delta=1e-4)
        bare = build_field([self.ball, self.socket], 0.01)[1]
        self.assertGreater(bare[ix([0, -0.15, 0])], 0)       # a hollow before the eye goes in
        self.assertLess(f[ix([0, -0.15, 0])], 0)             # and the eye fills it

    def test_the_carved_wall_belongs_to_the_carving_part(self):
        insts = [self.ball, self.socket, self.eye]
        keys = part_keys({'parts': [i.spec for i in insts]})
        which, _ = ownership(insts, keys, np.array([[0, -0.15+0.06, 0]]))   # deep in the ball, on the socket wall
        self.assertEqual(keys[which[0]], 'socket')
        which, _ = ownership(insts, keys, np.array([[0.19, 0, 0]]))
        self.assertEqual(keys[which[0]], 'ball')
        which, _ = ownership(insts, keys, np.array([[0, -0.15-0.035, 0]]))
        self.assertEqual(keys[which[0]], 'eye')              # the eyeball's own surface

    def test_unknown_op(self):
        with self.assertRaises(ValueError):
            Instance({'part': 'p', 'kind': 'mass', 'params': {}, 'op': 'subtract'})


class ClosedSweepTests(unittest.TestCase):
    R = 0.2

    def ring(self, **kw):
        c = [[self.R, 0, 0, 0.02], [0, self.R, 0, 0.03], [-self.R, 0, 0, 0.02], [0, -self.R, 0, 0.03]]
        return {'points': c, 'closed': True, 'samples': 20, **kw}

    def test_spine_loops(self):
        S, r, q, e1, e2 = sweep.spine(self.ring())
        np.testing.assert_allclose(S[0], S[-1])
        self.assertAlmostEqual(float(r[0]), float(r[-1]))
        np.testing.assert_allclose(e1[0], e1[-1])
        self.assertGreater(float(np.linalg.norm(S, axis=1).min()), 0.17)     # a loop, not a chord

    def test_no_gap_at_the_join(self):
        p = self.ring()
        S, r, _, _, _ = sweep.spine(p)
        np.testing.assert_allclose(sweep.sdf(p, S), -r, atol=1e-6)          # every sample, the join included, is inside by its radius
        # the outer wall, one radius out from the spine in the ring's plane, is on the zero level everywhere,
        # the join included (the join is sample 0 and the last sample)
        T = np.gradient(S, axis=0)
        T[0] = T[-1] = S[1]-S[-2]
        T /= np.linalg.norm(T, axis=1, keepdims=True)
        out = np.cross(T, [0, 0, 1.0])
        out /= np.linalg.norm(out, axis=1, keepdims=True)
        wall = sweep.sdf(p, S+r[:, None]*out)
        self.assertLess(float(np.abs(wall).max()), 1e-3)
        near_join = np.r_[0:6, len(S)-6:len(S)]
        self.assertTrue(np.all(sweep.sdf(p, S[near_join]) < -0.015))

    def test_radius_has_no_kink_at_the_join(self):
        _, r, _, _, _ = sweep.spine(self.ring())
        step = np.diff(r)
        self.assertLess(float(abs(step[-1]-step[0])), 2e-4)

    def test_not_a_solid_disc(self):
        d = sweep.sdf(self.ring(), np.array([[0, 0, 0], [0.2, 0, 0.05], [0.3, 0, 0]]))
        self.assertGreater(d[0], 0)                          # the hole in the ring
        self.assertGreater(d[1], 0)
        self.assertGreater(d[2], 0)

    def test_elliptic_ring_is_smooth_all_the_way_round(self):
        p = self.ring()
        p['points'] = [[*c[:3], c[3], 0.5] for c in p['points']]
        S, r, _, _, _ = sweep.spine(p)
        z = sweep.sdf(p, S+np.array([0, 0, 0.004]))                          # above the spine; half thickness is 0.5 r >= 0.01
        self.assertTrue(np.all(z < 0))
        self.assertTrue(np.all(np.abs(np.diff(z)) < 1e-3), 'the field must not jump anywhere on the loop')
        top = sweep.sdf(p, S+np.array([0, 0, 1.0])*(0.5*r[:, None]+0.0005))  # just over the flattened top, all the way round
        self.assertTrue(np.all(top > 0) and float(top.max()) < 2e-3)

    def test_needs_three_points(self):
        with self.assertRaises(ValueError):
            sweep.spine({'points': [[0, 0, 0, 0.1], [1, 0, 0, 0.1]], 'closed': True})

    def test_open_sweeps_are_unchanged(self):
        P = {'points': [[0, 0, 0, 0.1], [0, 0, 0.5, 0.06], [0, 0, 1.0, 0.03]]}
        S0, r0, _, _, _ = sweep.spine(P)
        S1, r1, _, _, _ = sweep.spine({**P, 'closed': False})
        np.testing.assert_array_equal(S0, S1)
        np.testing.assert_array_equal(r0, r1)


class EllipticFrameTests(unittest.TestCase):
    def test_vertical_leg_has_no_rings(self):
        # a vertical spine that leans part-way up used to leave a solid thin disc where it began to lean
        pts = [[0, 0, 0, 0.05, 0.4], [0, 0, 0.3, 0.05, 0.4], [0, 0, 0.6, 0.05, 0.4], [0, 0.1, 0.9, 0.05, 0.4]]
        p = {'points': pts, 'up': [0, 0, 1]}
        for z in np.linspace(0.04, 0.58, 28):
            xs = np.linspace(-0.09, 0.09, 721)
            d = sweep.sdf(p, np.stack([xs, np.zeros_like(xs), np.full_like(xs, z)], axis=1))
            self.assertGreater(d[0], 0, f'z={z:.3f}: the slice must not be solid out to x = -0.09')
            self.assertGreater(d[-1], 0)
            self.assertAlmostEqual(float(xs[d < 0].max()), 0.05, delta=0.004, msg=f'width at z={z:.3f}')

    def test_exactly_vertical_spine_is_an_ellipse_of_constant_size(self):
        p = {'points': [[0, 0, 0.1*i, 0.05, 0.4] for i in range(7)], 'up': [0, 0, 1]}
        for z in (0.1, 0.25, 0.4, 0.5):
            xs = np.linspace(-0.09, 0.09, 721)
            wx = xs[sweep.sdf(p, np.stack([xs, 0*xs, 0*xs+z], axis=1)) < 0]
            wy = xs[sweep.sdf(p, np.stack([0*xs, xs, 0*xs+z], axis=1)) < 0]
            extents = sorted([float(wx.max()), float(wy.max())])
            self.assertAlmostEqual(extents[0], 0.02, delta=0.002)
            self.assertAlmostEqual(extents[1], 0.05, delta=0.002)

    def test_vertical_leg_is_smooth_along_its_length(self):
        p = {'points': [[0, 0, 0.1*i, 0.05, 0.4] for i in range(7)], 'up': [0, 0, 1]}
        z = np.linspace(0.05, 0.55, 200)
        d = sweep.sdf(p, np.stack([np.full_like(z, 0.03), np.full_like(z, 0.005), z], axis=1))
        self.assertLess(float(np.ptp(d)), 1e-3)

    def test_horizontal_spine_keeps_the_up_convention(self):
        p = {'points': [[0, 0, 0, 0.1, 0.5], [0, 1, 0, 0.1, 0.5]], 'up': [0, 0, 1]}
        d = sweep.sdf(p, np.array([[0.08, 0.5, 0], [0, 0.5, 0.08], [0, 0.5, 0.04]]))
        self.assertLess(d[0], 0)                             # wide across
        self.assertGreater(d[1], 0)                          # thin along up
        self.assertLess(d[2], 0)


class CurvedPlateTests(unittest.TestCase):
    R = 0.3

    def plate(self, **kw):
        th = np.radians([0, 50, 100, 150])
        spine = [[0.0, self.R*np.sin(t), self.R*(1-np.cos(t))] for t in th]
        self.length = self.R*np.radians(150)
        return {'spine': spine, 'normal': [0, 0, 1],
                'outline': [[-0.08, -0.03], [0.08, -0.03], [0.08, self.length+0.03], [-0.08, self.length+0.03]],
                'smooth': 2, 'thickness': 0.03, 'rimThickness': 0.01, 'rimWidth': 0.04, **kw}

    def test_follows_its_spine(self):
        p = self.plate()
        S, arc, T, N, U, *_ = shell._curved(p)
        keep = (arc > 0.1) & (arc < self.length-0.1)
        np.testing.assert_allclose(shell.sdf(p, S[keep]), -0.015, atol=2e-3)    # mid surface: minus half the thickness
        self.assertTrue(np.all(shell.sdf(p, S[keep]+0.06*N[keep]) > 0.03))      # clear of the plate along the normal
        self.assertTrue(np.all(shell.sdf(p, S[keep]+0.12*U[keep]) > 0.03))      # past the lateral edge

    def test_arcs_over_and_comes_back_down(self):
        p = self.plate()
        a150 = np.radians(150)
        end = np.array([[0.0, self.R*np.sin(a150), self.R*(1-np.cos(a150))]])
        top = np.array([[0.0, self.R, self.R]])
        self.assertLess(shell.sdf(p, end)[0], 0.0)
        self.assertLess(shell.sdf(p, top)[0], 0.0)
        # a flat plate would run straight on along y; the curved one has no material out there
        self.assertGreater(shell.sdf(p, np.array([[0.0, 0.45, 0.02]]))[0], 0.05)
        self.assertGreater(shell.sdf(p, np.array([[0.0, 0.0, 0.3]]))[0], 0.1)        # nor in the hollow of the curl

    def test_even_width_along_the_curve(self):
        p = self.plate()
        S, arc, *_ = shell._curved(p)
        for frac in (0.2, 0.5, 0.8):
            mid = S[int(np.searchsorted(arc, frac*self.length))]
            probe = lambda du: shell.sdf(p, np.array([mid+np.array([du, 0, 0])]))[0]
            self.assertLess(probe(0.0), 0)
            self.assertLess(probe(0.06), 0)
            self.assertGreater(probe(0.1), 0)

    def test_no_knob_at_the_root(self):
        p = self.plate()
        root = np.array([[0.0, 0.0, 0.0]])
        self.assertLess(shell.sdf(p, root)[0], 0)
        self.assertGreater(shell.sdf(p, root+np.array([[0, 0, 0.04]]))[0], 0.02)     # a plate, not a lump
        self.assertGreater(shell.sdf(p, root+np.array([[0, -0.05, 0]]))[0], 0.0)     # ends where the outline ends (-0.03)

    def test_rolled_rim_is_thinner_than_the_middle(self):
        p = self.plate()
        a = np.radians(75)
        mid = np.array([0.0, self.R*np.sin(a), self.R*(1-np.cos(a))])
        radial = (np.array([0.0, 0.0, self.R])-mid)/self.R
        thick = shell.sdf(p, np.array([mid+0.012*radial]))[0]                         # inside at the center (half thickness 0.015)
        rim = shell.sdf(p, np.array([mid+np.array([0.0795, 0, 0])+0.012*radial]))[0]  # at the lateral edge only the rim is left
        self.assertLess(thick, 0)
        self.assertGreater(rim, 0)

    def test_bounds_contain_the_solid(self):
        p = self.plate()
        lo, hi = shell.bounds(p)
        rng = np.random.default_rng(5)
        pts = rng.uniform(lo-0.1, hi+0.1, (60000, 3))
        inside = shell.sdf(p, pts) < 0
        self.assertGreater(inside.sum(), 200)
        self.assertTrue(np.all(pts[inside] >= lo-1e-9) and np.all(pts[inside] <= hi+1e-9))

    def test_without_a_spine_the_flat_plate_is_unchanged(self):
        flat = ShellTests.P
        probe = np.array([[0, 0, 0], [0, 0.015, 0], [0.4, 0, 0]])
        np.testing.assert_array_equal(shell.sdf(flat, probe), shell.sdf({**flat, 'spine': None}, probe))

    def test_spine_needs_three_points(self):
        with self.assertRaises(ValueError):
            shell.bounds({'spine': [[0, 0, 0], [0, 1, 0]]})

    def test_mirror_works_for_a_curved_plate(self):
        q = self.plate()
        q['spine'] = [[0.1, y, z] for _, y, z in q['spine']]
        i = inst('shell', q, mirror='x')
        self.assertLess(i.sdf(np.array([[-0.1, 0.0, 0.0]]))[0], 0)


class GridTests(unittest.TestCase):
    """A sampled sphere: trilinear sampling, the clip, bounds and the sha256 check."""

    def setUp(self):
        import hashlib
        import tempfile
        self.dir = tempfile.mkdtemp()
        ax = np.arange(-0.2, 0.2001, 0.01)
        X, Y, Z = np.meshgrid(ax, ax, ax, indexing='ij')
        vals = (np.sqrt(X**2+Y**2+Z**2)-0.1).astype(np.float32)
        self.path = str(Path(self.dir)/'sphere.npz')
        np.savez(self.path, origin=np.array([-0.2, -0.2, -0.2]), voxel=np.float64(0.01), values=vals)
        self.sha = hashlib.sha256(Path(self.path).read_bytes()).hexdigest()

    def params(self, **kw):
        return {'file': self.path, 'sha256': self.sha, 'clip': {'center': [0, 0, 0], 'radii': [1, 1, 1], 'blend': 0}, **kw}

    def test_samples_the_distance(self):
        d = grid.sdf(self.params(), np.array([[0, 0, 0], [0.1, 0, 0], [0.15, 0.0, 0.0], [0.5, 0, 0]]))
        self.assertAlmostEqual(d[0], -0.1, places=3)
        self.assertAlmostEqual(d[1], 0.0, places=3)
        self.assertAlmostEqual(d[2], 0.05, places=3)
        self.assertGreater(d[3], 1.0)          # outside the grid reads far away

    def test_clip_cuts_and_bounds_follow(self):
        p = self.params(clip={'center': [0, 0, -0.1], 'radii': [0.2, 0.2, 0.1], 'blend': 0})
        self.assertGreater(grid.sdf(p, np.array([[0, 0, 0.05]]))[0], 0)    # above the clip: removed
        self.assertLess(grid.sdf(p, np.array([[0, 0, -0.05]]))[0], 0)      # inside both: kept
        lo, hi = grid.bounds(p)
        self.assertAlmostEqual(hi[2], 0.0)
        self.assertAlmostEqual(lo[0], -0.2)

    def test_sha_mismatch_refused(self):
        grid._GRIDS.clear()
        with self.assertRaises(ValueError):
            grid.sdf(self.params(sha256='0'*64), np.zeros((1, 3)))


if __name__ == '__main__':
    unittest.main()


class SeparateTests(unittest.TestCase):
    """"separate": true instances (eyeballs) are their own closed objects, never part of the skin's field."""
    SKIN = {'part': 'head', 'kind': 'mass', 'params': {'radii': [0.2, 0.2, 0.2]}, 'blend': 0.03}
    EYE = {'part': 'eye', 'kind': 'mass', 'params': {'center': [0.1, -0.2, 0.0], 'radii': [0.04, 0.04, 0.04]},
           'blend': 0.003, 'separate': True, 'material': 'eye', 'gaze': [0.3, -1.0, 0.0], 'mirror': 'x',
           'name': 'eye-left', 'mirrorName': 'eye-right'}

    def test_spec_parsing(self):
        e = Instance(self.EYE)
        self.assertTrue(e.separate)
        self.assertEqual(e.material, 'eye')
        np.testing.assert_allclose(e.pivot, [0.1, -0.2, 0.0])                # defaults to the mass center
        self.assertAlmostEqual(float(np.linalg.norm(e.gaze)), 1.0)
        p = Instance({**self.EYE, 'pivot': [0.1, -0.19, 0.0]})
        np.testing.assert_allclose(p.pivot, [0.1, -0.19, 0.0])
        self.assertFalse(Instance(self.SKIN).separate)

    def test_bad_specs_refused(self):
        with self.assertRaises(ValueError):
            Instance({**self.EYE, 'op': 'carve'})
        with self.assertRaises(ValueError):
            Instance({**self.EYE, 'gaze': [0, 0, 0]})
        with self.assertRaises(ValueError):
            Instance({**self.SKIN, 'material': 'eye'})                       # tags belong to separate objects only
        with self.assertRaises(ValueError):
            separate_objects([Instance({**self.EYE, 'mirror': None, 'name': 'a'}),
                              Instance({**self.EYE, 'mirror': None, 'name': 'a'})])

    def test_excluded_from_the_skin_field(self):
        skin, eye = Instance(self.SKIN), Instance({**self.EYE, 'params': {'center': [0.0, -0.3, 0.0], 'radii': [0.05]*3}})
        probe = np.array([[0.0, -0.3, 0.0], [0.0, 0.0, 0.0]])
        np.testing.assert_allclose(union_at([skin, eye], probe), union_at([skin], probe))
        self.assertGreater(union_at([skin, eye], probe)[0], 0)              # the eye's center is not skin
        o1, f1, _ = build_field([skin, eye], 0.02)
        o2, f2, _ = build_field([skin], 0.02)
        np.testing.assert_allclose(o1, o2)
        np.testing.assert_allclose(f1, f2)
        keys = part_keys({'parts': [self.SKIN, self.EYE]})
        self.assertEqual(keys, ['head'])
        which, _ = ownership([skin, eye], keys, np.array([[0.0, -0.3, 0.0]]))
        self.assertEqual(which[0], 0)

    def test_objects_and_mirroring(self):
        objs = separate_objects([Instance(self.SKIN), Instance(self.EYE)])
        self.assertEqual([o['name'] for o in objs], ['eye-left', 'eye-right'])
        left, right = objs
        np.testing.assert_allclose(right['pivot'], left['pivot']*[-1, 1, 1])
        np.testing.assert_allclose(right['gaze'], left['gaze']*[-1, 1, 1])
        self.assertTrue(right['mirrored'])
        solo = left['instance']
        self.assertFalse(solo.separate)
        self.assertIsNone(solo.mirror)                                       # each side is meshed on its own
        self.assertLess(solo.sdf(np.array([[0.1, -0.2, 0.0]]))[0], 0)
        self.assertGreater(solo.sdf(np.array([[-0.1, -0.2, 0.0]]))[0], 0)
        unnamed = separate_objects([Instance({k: v for k, v in self.EYE.items() if k not in ('name', 'mirrorName')})])
        self.assertEqual([o['name'] for o in unnamed], ['eye-0', 'eye-0-mirror'])
