"""Quick look at a raw reconstruction: import the glb as is and render it from the six axis directions.

    blender -b --factory-startup --python-exit-code 1 --python preview_recon.py -- --glb <shape.glb> --out <dir>
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "roster"))

import bpy  # noqa: E402

import lookdev  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:]
glb = Path(ARGS[ARGS.index("--glb") + 1])
out = Path(ARGS[ARGS.index("--out") + 1])
out.mkdir(parents=True, exist_ok=True)

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
lookdev.setup_scene("EEVEE")
ground = bpy.data.objects["lookdev_ground"]
lo, hi = lookdev.world_bounds(meshes)
ground.location.z = lo.z
for m in meshes:
    lookdev.apply_clay(m)
print("BOUNDS", tuple(lo), tuple(hi))
VIEWS = {"negY": (0, 0), "posX": (90, 0), "posY": (180, 0), "negX": (270, 0), "top": (0, 90)}
if "--oblique" in ARGS:
    VIEWS = {"obl_fl": (40, 40), "obl_bl": (140, 40), "top": (0, 90)}
size = int(ARGS[ARGS.index("--size") + 1]) if "--size" in ARGS else 512
for name, (az, el) in VIEWS.items():
    cam = lookdev.place_camera(f"lookdev_cam_{name}", (lo, hi), az, el)
    lookdev.render(cam, out / f"{name}.png", size=size)
