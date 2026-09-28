import sys
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from surface_math import profile


class SurfaceInterpolationTests(unittest.TestCase):
    def test_uneven_sections_preserve_knots_and_bounds(self):
        rows=[[0,.1,-.3],[.1,.5,-.3],[.9,.6,.2],[1.5,.2,-.1]]
        for row in rows:
            self.assertEqual(profile(rows,row[0]),row[1:])
        for a,b in zip(rows,rows[1:]):
            for step in range(101):
                values=profile(rows,a[0]+(b[0]-a[0])*step/100)
                for j,value in enumerate(values,1):
                    self.assertGreaterEqual(value,min(a[j],b[j])-1e-10)
                    self.assertLessEqual(value,max(a[j],b[j])+1e-10)

    def test_shared_tangents_at_extrema_and_plateaus(self):
        rows=[[0,.1],[.2,.4],[.7,.4],[1,.2],[2,.3]]
        epsilon=1e-6
        for x,value in rows[1:-1]:
            left=(value-profile(rows,x-epsilon)[0])/epsilon
            right=(profile(rows,x+epsilon)[0]-value)/epsilon
            self.assertAlmostEqual(left,right,places=4)

    def test_affine_rail_stays_straight(self):
        rows=[[x,2*x+.5,-.4*x+.3] for x in [0,.1,.4,1.2,2]]
        for i in range(201):
            x=i/100
            actual=profile(rows,x)
            self.assertAlmostEqual(actual[0],2*x+.5,places=10)
            self.assertAlmostEqual(actual[1],-.4*x+.3,places=10)


if __name__=='__main__':
    unittest.main()
