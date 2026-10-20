"""Render a surface with one ear poof color option applied in memory (--poof-color NAME)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
i = sys.argv.index('--poof-color')
NAME = sys.argv[i + 1]
del sys.argv[i:i + 2]
import numpy as np
import review_fur_13
import render_surface as render
import ear_poof_color_19 as color

_apply = render.apply_palette
surface = Path(sys.argv[sys.argv.index('--surface') + 1])


def apply_palette(pal, factor):
    color.apply(np.load(surface / 'patch-evidence.npz'), NAME)
    _apply(pal, factor)


render.apply_palette = apply_palette
render.main()
