"""Use exactly the step 14 views and palette on a fix candidate."""
import sys,runpy,json,hashlib
from pathlib import Path
here=Path(__file__).resolve().parent
work=here.parents[2]/'untracked/species-construction/akinza/surface/fur-steps'
args=sys.argv[sys.argv.index('--')+1:];surface=work/args[0]
views=args[1] if len(args)>1 else 'ears-front,ear-root-close,head-side,head-backq,body-backq,body-front,tails-side'
index=surface/'after/index.json';binding=surface/'after/source.json'
prior=None
if index.exists() and binding.exists() and json.loads(binding.read_text()).get('surfaceSha256')==hashlib.sha256((surface/'surface.blend').read_bytes()).hexdigest():prior=json.loads(index.read_text())
sys.argv=['render_concha_coat_14.py','--','--surface',str(surface),'--out',str(surface/'after'),'--views',views,'--samples','32','--palette','T7']
runpy.run_path(str(here/'render_concha_coat_14.py'),run_name='__main__')
if prior:
 current=json.loads(index.read_text());images={r['view']:r for r in prior['images']}
 images.update({r['view']:r for r in current['images']});current['images']=list(images.values())
 current['renderSecondsTotal']=round(sum(r['seconds'] for r in current['images']),1)
 current['batchWallSecondsIncludingLoad']=[*prior.get('batchWallSecondsIncludingLoad',[prior['wallSecondsIncludingLoad']]),current['wallSecondsIncludingLoad']]
 index.write_text(json.dumps(current,indent=2)+'\n')
