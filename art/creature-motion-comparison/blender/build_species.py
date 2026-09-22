"""Build and render one species study from its spec through the shared rig library.

    blender -b --factory-startup --python build_species.py -- --species species/avilily.json --render
    blender -b --factory-startup --python build_species.py -- --species species/bioflim.json --frames=21,33
    blender -b --factory-startup --python build_species.py -- --species species/avilily.json --render --out /tmp/check
    blender -b --factory-startup --python build_species.py -- --species species/akinza.json --render --style=toon

The spec chooses a body-plan template, a palette, proportions, anatomy
switches, clip ranges, timeline markers, projected points, and the
performance key track. Everything else is shared code, so two runs of the
same spec on the same Blender build produce the same frames.
"""

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import bpy  # noqa: E402

from xalians_rig import stage as stage_module  # noqa: E402
from xalians_rig.materials import Palette  # noqa: E402
from xalians_rig.motion import make_linear  # noqa: E402
from xalians_rig.styles import STYLES, apply_style  # noqa: E402
from xalians_rig.templates import TEMPLATES  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    for item in ARGS:
        if item.startswith(name + "="):
            return item.split("=", 1)[1]
    if name in ARGS:
        return True
    return default


spec_path = Path(arg("--species", "species/avilily.json"))
if not spec_path.is_absolute():
    spec_path = HERE / spec_path
spec = json.loads(spec_path.read_text(encoding="utf-8"))
style_override = arg("--style")
style = style_override if isinstance(style_override, str) else spec.get("render", {}).get("style", "plain")
if style not in STYLES:
    raise SystemExit(f"unknown render style {style!r}; expected one of {STYLES}")
# A command-line style renders beside the spec's own study instead of replacing it:
# its own output folder, export name and label, and no saved .blend.
styled = isinstance(style_override, str) and style != spec.get("render", {}).get("style", "plain")
if styled:
    spec["output"] = f"{spec['output']}-{style}"
    spec["export"] = f"{spec['export']}-{style}"
    spec["label"] = f"{spec.get('label', spec['species'])} ({style})"
spec.setdefault("render", {})["style"] = style
output = Path(arg("--out") or (HERE.parent / spec["output"]))
subset = arg("--frames")
subset = [int(v) for v in subset.split(",") if v] if isinstance(subset, str) else None

stage_module.clear_scene()
palette = Palette(spec["palette"])
creature = TEMPLATES[spec["template"]](spec, palette)
all_frames = []
for clip, (start, count) in spec["clips"].items():
    for frame in range(start, start + count):
        creature.apply_pose(frame, clip)
        all_frames.append(frame)
make_linear()

scene, camera = stage_module.configure(spec)
if hasattr(creature, "finish"):
    # A template may grow a skinned body over the posed joints once every frame is keyed.
    creature.finish(scene, all_frames)
    make_linear()
apply_style(scene, style, spec)
scene.frame_set(spec["clips"]["action"][0])
if not styled:
    blend_path = HERE / spec["blend"]
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    print("Saved editable Blender study:", blend_path)

points = {}
for name, entry in spec["points"].items():
    part = creature.parts[entry["part"]]
    getter = part if callable(part) else (lambda obj=part: obj.matrix_world.translation.copy())
    points[name] = (entry["frame"], getter)
library_files = [p for p in (HERE / "xalians_rig").rglob("*.py")] + [HERE / "build_species.py"]
stage_module.write_meta(scene, camera, spec, spec_path, points, output, library_files)

if subset:
    stage_module.render_frames(scene, output, spec, subset)
elif arg("--render"):
    stage_module.render_frames(scene, output, spec)
