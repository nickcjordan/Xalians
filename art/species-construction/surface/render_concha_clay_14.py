"""Matched shaved-anatomy ear-base renders, without saving another model build."""
import sys
import shutil
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
import render_surface as render
root=Path(__file__).resolve().parents[3]
out=root/'untracked/species-construction/akinza/surface/fur-steps/s14a'
render.VIEWS['ear-base-clay']=(35,4,Vector((.205,.01,.692)),.16,1024,1024)
for label,build in (('before','assembled-3300'),('after','assembled-3301')):
    target=out/label;target.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(root/'untracked/species-construction/akinza'/build/'akinza.blend',target/'surface.blend')
    sys.argv=[__file__,'--','--surface',str(target),'--out',str(target),'--views','ear-base-clay','--samples','32','--hide-fur','--clay','--eyeliner','current']
    render.main()
