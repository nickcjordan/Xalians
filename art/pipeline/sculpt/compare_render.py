"""Render one creature file through fixed look-dev cameras so two builds can be compared view for view.

    blender -b --factory-startup --python-exit-code 1 <file.blend> --python compare_render.py -- --out <dir> --tag <t>

The cameras use fixed world boxes (not the file's own bounds), so every file is framed identically.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path[:0] = [str(HERE), str(HERE.parent / "roster")]

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import lookdev  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:]
OUT = Path(ARGS[ARGS.index("--out") + 1])
TAG = ARGS[ARGS.index("--tag") + 1]
OUT.mkdir(parents=True, exist_ok=True)

BOX = lambda lo, hi: (Vector(lo), Vector(hi))  # noqa: E731
FULL = BOX((-0.20, -0.36, 0.0), (0.20, 0.74, 0.74))
HIND = BOX((0.05, -0.02, 0.0), (0.22, 0.30, 0.15))
FORE = BOX((-0.10, -0.25, 0.0), (0.10, -0.04, 0.13))
FORE_L = BOX((-0.01, -0.25, 0.0), (0.10, -0.04, 0.13))
VIEWS = {
    "full_side": (FULL, 90, 0),
    "full_three_quarter": (FULL, 45, 12),
    "full_front": (FULL, 0, 4),
    "hind_paw_side": (HIND, 90, 0),
    "hind_paw_three_quarter": (HIND, 45, 12),
    "fore_paws_front": (FORE, 0, 6),
    "fore_paw_side": (FORE_L, 90, 0),
}

for o in bpy.data.objects:
    if o.type == "ARMATURE":
        o.hide_render = True
lookdev.setup_scene(engine="CYCLES")
for o in bpy.data.objects:
    if o.type == "MESH" and not o.name.startswith("lookdev_") and not o.hide_render:
        dark = any(k in o.name.lower() for k in ("claw",))
        if not dark:
            lookdev.apply_clay(o)
for name, (box, az, el) in VIEWS.items():
    cam = lookdev.place_camera(f"lookdev_cam_{name}", box, az, el, margin=0.04)
    lookdev.render(cam, OUT / f"{TAG}_{name}.png", size=900)
print("rendered", TAG, list(VIEWS))
