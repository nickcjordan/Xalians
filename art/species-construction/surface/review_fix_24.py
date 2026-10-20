"""Established cameras for the step 24-28 fixes: eye-close (13h), head-backq,
tails-side and tails-back (step 11/12e), sole (step 7c c_sole), ears-front, ear-root-close."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from mathutils import Vector
import review_fur_13
import review_fur_12e
import render_surface as render
render.VIEWS['sole'] = (180, -78, Vector((0.345, -0.045, -0.95)), 0.27, 1024, 1024)
render.VIEWS['ear-base-close'] = (0, 3, Vector((-0.24, -0.02, 0.76)), 0.30, 1000, 1000)
if __name__ == '__main__':
    render.main()
