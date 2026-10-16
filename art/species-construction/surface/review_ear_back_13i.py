"""Use established cameras with periodic stack diagnostics for slow compute."""
import sys
import faulthandler
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
faulthandler.enable()
faulthandler.dump_traceback_later(60, repeat=True)
import review_fur_13
import render_surface as render
import eyeliner_styles

def logged(module, name):
    old = getattr(module, name)
    def call(*args, **kwargs):
        print('13I_RENDER_STAGE_BEGIN', name, flush=True)
        result = old(*args, **kwargs)
        print('13I_RENDER_STAGE_END', name, flush=True)
        return result
    setattr(module, name, call)
for name in ('apply_palette', 'setup_world', 'make_rig', 'place'):
    logged(render, name)
logged(eyeliner_styles, 'configured')
render.main()
faulthandler.cancel_dump_traceback_later()
