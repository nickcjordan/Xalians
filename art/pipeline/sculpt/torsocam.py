"""Torso cameras for sculpt-stage review renders, built on roster/lookdev.py conventions.

Same three-point lights, ground and clay as lookdev; orthographic cameras framed on a torso bounds box (the trunk
from the neck base to the tail root, with the head and upper legs in view for context). Azimuth is measured from the
creature's front (-Y) toward its left (+X).
"""

from mathutils import Vector

import lookdev

TORSO_BOUNDS = (Vector((-0.17, -0.27, 0.17)), Vector((0.17, 0.42, 0.62)))
TORSO_CAMERAS = {
    "torso_side": (90.0, 0.0),
    "torso_three_quarter": (45.0, 12.0),
    "torso_front": (0.0, 4.0),
    "torso_top": (0.0, 90.0),
}


def frame_torso(bounds=TORSO_BOUNDS, names=None, margin=0.04):
    cams = {}
    for name in names or TORSO_CAMERAS:
        az, el = TORSO_CAMERAS[name]
        cams[name] = lookdev.place_camera(f"lookdev_cam_{name}", bounds, az, el, margin=margin)
    return cams


def render_set(cams, out_dir, prefix="", size=1024):
    paths = {}
    for name, cam in cams.items():
        p = f"{out_dir}/{prefix}{name}.png"
        lookdev.render(cam, p, size=size)
        paths[name] = p
    return paths
