"""Tail review cameras using the shared look-dev rig."""
from mathutils import Vector
import lookdev
TAIL_BOUNDS=(Vector((-.14,.20,.23)),Vector((.14,.73,.59)))
TAIL_CAMERAS={'tail_side':(90,0),'tail_three_quarter_rear':(135,10),'tail_top':(0,90)}
def frame_tail():
 return {n:lookdev.place_camera('lookdev_cam_'+n,TAIL_BOUNDS,*a,margin=.04) for n,a in TAIL_CAMERAS.items()}
