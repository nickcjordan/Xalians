"""usage: r03_lock_try.py NNNN key=value ...  (values JSON). Builds head-NNNN from head-0395 with the parameters of the BASE head (default head-0415) plus overrides; writes the command to scratch-r15/cmdNNNN.json. Run from the repo root."""
import json, subprocess, sys
A='C:/dev/src/xalians-akinza-loop/untracked/species-construction/akinza'
base=json.load(open(f'{A}/head-0415/fan-front-lock-system.json'))['parameters']
num=sys.argv[1]
for kv in sys.argv[2:]:
    k,v=kv.split('=',1)
    base[k]=json.loads(v)
base.pop('no_snapshot',None)
cmd=['python','art/species-construction/loop/loop_tools.py','blender','--log',f'scratch-r15/build{num}','art/species-construction/author_fan_front_lock_system_field.py','--','--scene',f'{A}/head-0395/head.blend','--out',f'{A}/head-{num}','--spec',base.pop('spec')]
for k,v in base.items():
    if k in ('only_side','no_snapshot') and not v: continue
    flag='--'+k.replace('_','-')
    if v is None: continue
    if v is True: cmd.append(flag)
    elif v is False: continue
    elif isinstance(v,list): cmd+= [flag]+[str(x) for x in v]
    else: cmd+=[flag,str(v)]
json.dump(cmd,open(f'{A}/scratch-r15/cmd{num}.json','w'))
print(' '.join(cmd))
r=subprocess.run(cmd,capture_output=True,text=True)
print(r.stdout[-1500:], r.stderr[-1500:])
