"""Reuse the existing front, close, head, body and tail review cameras."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from mathutils import Vector
import review_fur_12d
import review_fur_12e
from review_fur_12c import VIEWS
import render_surface as render
render.VIEWS['head-backq']=VIEWS['head-backq']
render.VIEWS.update({
    'ears-front': (0,3,Vector((0,-.02,.74)),1.35,1024,667),
    'head-side': (90,2,Vector((0,-.12,.58)),.42,1024,1024),
    'ear-root-close': (62,4,Vector((.15,-.05,.70)),.24,1024,1024),
})
if __name__=='__main__':render.main()
