"""Use the established review views, plus matched eye and ear-tip details."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from mathutils import Vector
import review_fur_12f
import render_surface as render
render.VIEWS.update({
    'eye-close':(0,2,Vector((.084,-.15,.650)),.20,1000,1000),
    'head-front':render.VIEWS['ears-front'],
    'ear-tip-close':(155,24,Vector((.395,.015,.837)),.25,1000,1000),
})
if __name__=='__main__':render.main()
