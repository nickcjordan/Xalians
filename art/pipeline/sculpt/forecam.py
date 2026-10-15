"""Foreleg review cameras."""
from mathutils import Vector
import lookdev
BOUNDS=(Vector((-.10,-.205,0)),Vector((.10,.005,.405)))
def frame_forelegs():
    return {n:lookdev.place_camera('lookdev_cam_'+n,BOUNDS,a,e,margin=.045) for n,a,e in [('foreleg_side',90,0),('foreleg_front',0,4),('foreleg_three_quarter',45,10)]}
