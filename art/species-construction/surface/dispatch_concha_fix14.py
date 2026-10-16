"""Explicit mini inputs for step 14 fix operations; no implicit model save."""
import json,sys,subprocess
from pathlib import Path
from concha_fix14_paths import baseline
ROOT=Path(__file__).resolve().parents[3]
WORK=ROOT/'untracked/species-construction/akinza/surface/fur-steps'
label,script,*args=sys.argv[1:]
before=baseline(WORK)
inputs=list((ROOT/'art/species-construction/surface').glob('*.py'))
inputs+=list((ROOT/'art/species-construction/surface').glob('*.json'))
inputs+=list((ROOT/'art/species-construction').glob('*.py'))
inputs += [before/n for n in ('surface.blend','surface-info.json','patch-evidence.npz')]
if label=='probe':outputs=[WORK/'14-fix-probe.npz']
else:
 inputs += [WORK/'14-fix-probe.npz',before/'artifact-gate.json']
 inputs += list((before/'r').glob('*.npz'))
 inputs += list((before/'r').glob('*.json'))
 if label.startswith('build'):outputs=[WORK/args[0]]
 else:
  inputs += [WORK/args[0]/n for n in ('surface.blend','surface-info.json','patch-evidence.npz')]
  outputs=[WORK/args[0]/('after' if label.startswith('render') else 'r')]
mappings=[dict(source=str(ROOT),target='akinza')]
if not before.is_relative_to(ROOT):mappings.append(dict(source=str(before),target='baseline14'))
job=dict(mappings=mappings,inputs=list(map(str,inputs)),outputs=list(map(str,outputs)),
 args=['-b','--factory-startup','--python-exit-code','1','--python',str(ROOT/'art/species-construction/surface'/script),'--',*args])
manifest=WORK/f'14-fix-{label}-job.json';manifest.write_text(json.dumps(job,indent=2)+'\n')
raise SystemExit(subprocess.call([sys.executable,'C:/dev/src/xalians-mini-blender-compute/scripts/mini-blender.py',str(manifest),'--route','mini','--evidence',str(WORK/f'14-fix-{label}-compute')]))
