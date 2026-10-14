"""Head close cameras for sculpt-stage review renders, built on roster/lookdev.py conventions.

Same three-point lights, ground and clay as lookdev; cameras are orthographic and framed on a head bounds box
(skull, horns, ears) instead of the whole body. Azimuth is measured from the creature's front (-Y) toward its left (+X).
"""

import bpy

import lookdev

HEAD_CAMERAS = {
    "head_three_quarter": (45.0, 12.0),
    "head_front": (0.0, 4.0),
    "head_side": (90.0, 0.0),
}


def frame_head(bounds, names=None, margin=0.06):
    cams = {}
    for name in names or HEAD_CAMERAS:
        az, el = HEAD_CAMERAS[name]
        cams[name] = lookdev.place_camera(f"lookdev_cam_{name}", bounds, az, el, margin=margin)
    return cams


def render_set(cams, out_dir, prefix="", size=1024):
    paths = {}
    for name, cam in cams.items():
        p = f"{out_dir}/{prefix}{name}.png"
        lookdev.render(cam, p, size=size)
        paths[name] = p
    return paths
