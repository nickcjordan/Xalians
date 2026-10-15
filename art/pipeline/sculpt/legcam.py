"""Hind leg review cameras using the fixed roster look development."""
from mathutils import Vector
import lookdev
LEG_BOUNDS=(Vector((-0.19,-0.10,0.0)),Vector((0.19,0.37,0.58)))
LEG_CAMERAS={"leg_side":(90,0),"leg_three_quarter_rear":(135,10),"leg_rear":(180,4),"leg_front_three_quarter":(45,10)}
def frame_legs():
    return {n:lookdev.place_camera("lookdev_cam_"+n,LEG_BOUNDS,a,e,margin=0.045) for n,(a,e) in LEG_CAMERAS.items()}
