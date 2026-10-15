"""Exact step 11 tail cameras, preserved for before/after review."""
import sys
from pathlib import Path
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_surface as render
TARGET = Vector((.24, .28, -.17))
render.VIEWS.update({
    'tails-side': (90, 4, TARGET, 1.3, 1024, 1024),
    'tails-back': (180, 4, TARGET, 1.3, 1024, 1024),
    'tails-threequarter': (135, 10, TARGET, 1.3, 1024, 1024),
})
if __name__ == '__main__':
    render.main()
