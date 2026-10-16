"""Explicit mini manifest or exclusive local WSL Blender invocation for step 14."""
import json
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
WORK=ROOT/'untracked/species-construction/akinza/surface/fur-steps'
MINI=Path('C:/dev/src/xalians-mini-blender-compute')
route,label,script,*args=sys.argv[1:]
if route=='local':
    raise SystemExit(subprocess.call([sys.executable,str(Path(__file__).with_name('run_fur_12e.py')),
        script,'14-'+label+'.log','--',*args]))
script_path=(Path(__file__).parent/script).resolve()
inputs=[script_path, ROOT/'untracked/species-construction/akinza/assembled-3300/akinza.blend']
if label!='probe':
    inputs+=list((ROOT/'art/species-construction').glob('*.py'))
    inputs+=list((ROOT/'art/species-construction/surface').glob('*.py'))
    inputs+=list((ROOT/'art/species-construction/surface').glob('*.json'))
    inputs+=list((ROOT/'art/species-construction/specs').glob('*.json'))
    inputs+=[ROOT/'untracked/species-construction/akinza/assembled-3300/assembly.json']
    inputs+=[ROOT/'untracked/species-construction/akinza/surface/fur-steps/s12-13i'/n for n in ('surface.blend','surface-info.json')]
    inputs+=list((ROOT/'untracked/species-construction/akinza/assembled-3301').glob('*.*'))
    if label=='checks':inputs += [WORK/'s14b'/n for n in ('surface.blend','surface-info.json','patch-evidence.npz')]
inputs=list(dict.fromkeys(p for p in inputs if p.is_file()))
outputs=[WORK/'14-probe.json'] if label=='probe' else [WORK/'s14a'] if label=='clay' else [WORK/'s14b'] if label=='coat' else [WORK/'s14b/r',WORK/'s14b/held-data.json'] if label=='checks' else [ROOT/'untracked/species-construction/akinza/assembled-3301']
job=dict(mappings=[dict(source=str(ROOT),target='akinza')], inputs=list(map(str,inputs)),
    outputs=list(map(str,outputs)),
    args=['-b','--factory-startup','--python-exit-code','1','--python',str(script_path),'--',*args])
manifest=WORK/('14-'+label+'-job.json')
manifest.write_text(json.dumps(job,indent=2)+'\n')
raise SystemExit(subprocess.call([sys.executable,str(MINI/'scripts/mini-blender.py'),str(manifest),
    '--route','mini','--evidence',str(WORK/('14-'+label+'-compute'))]))
