"""The three requested matched eyeliner views."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from mathutils import Vector
import review_fur_13
import render_surface as render
render.VIEWS['head34'] = (35, 8, Vector((0, -.08, .64)), .68, 1000, 1000)
if __name__ == '__main__':
    render.main()
