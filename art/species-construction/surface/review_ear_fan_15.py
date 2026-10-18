"""Established review cameras; optional --no-denoise for a strand-detail check view."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
NO_DENOISE = '--no-denoise' in sys.argv
if NO_DENOISE:
    sys.argv.remove('--no-denoise')
import bpy
import review_fur_13
import render_surface as render

_place = render.place


def place(camera, rig, view):
    _place(camera, rig, view)
    bpy.context.scene.cycles.use_denoising = not NO_DENOISE


render.place = place
render.main()
print('DENOISE', not NO_DENOISE, flush=True)
