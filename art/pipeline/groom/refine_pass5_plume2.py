from pathlib import Path
import json
T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
p=json.loads((O/'parameters.json').read_text());s=(O/'build_groom.py').read_text()
ys=[.582,.594,.606,.618,.629,.638,.647,.655,.663,.671,.679,.685,.691,.695]
da=[84,76,74,65,61,53,47,36,29,16,8,-2,-14,-27]
dl=[.027,.038,.055,.075,.095,.120,.150,.175,.202,.225,.25,.272,.30,.332]
wa=[55,43,46,28,29,11,12,-5,-5,-20,-17,-31,-26,-38]
wl=[.020,.029,.042,.054,.071,.088,.108,.126,.145,.163,.181,.199,.216,.235]
for tuft in p['plume_tufts']:
 i=int(tuft['name'].rsplit('_',1)[1])-1;white=tuft['color']=='white';tuft['station']=(ys[i]-.580)/.115
 tuft['angle']=(wa if white else da)[i];tuft['length']=(wl if white else dl)[i]
 tuft['width']=(.006+.011*i/13) if white else (.006+.014*i/13)
s=s.replace('ends=.72+.28*prng.beta(2,2,groups)','ends=.53+.45*prng.beta(2,2,groups)')
s=s.replace("length*.08*np.sin(np.pi*t[0,:,0])", "length*.055*np.sin(np.pi*t[0,:,0])")
compile(s,'iter2','exec');(O/'build_groom.py').write_text(s);(T/'build_groom_pass5.py').write_text(s);(O/'parameters.json').write_text(json.dumps(p,indent=2));(T/'parameters_pass5.json').write_text(json.dumps(p,indent=2))
