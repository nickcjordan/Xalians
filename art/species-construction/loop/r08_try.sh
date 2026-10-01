#!/bin/bash
# usage: r08_try.sh <spec> <out-number>   builds a leg reshape on body-0400 and writes closeups + delta report
set -e
cd /c/dev/src/xalians-akinza-loop
A=C:/dev/src/xalians-akinza-loop/untracked/species-construction/akinza
N=$2
python art/species-construction/loop/loop_tools.py blender --log scratch-r08/leg$N art/species-construction/reshape_legs_field.py -- --scene $A/body-0400/body.blend --fairing $A/body-0400/fairing.json --spec $1 --out $A/body-$N | tail -1
python art/species-construction/loop/loop_tools.py blender --log scratch-r08/cl$N art/species-construction/loop/leg_closeup.py -- --glb $A/body-$N/shape.glb --out $A/scratch-r08/cl-$N | tail -1
python art/species-construction/loop/loop_tools.py blender --log scratch-r08/dump$N art/species-construction/rig_dump.py -- --glb $A/body-$N/shape.glb --out $A/scratch-r08/dump$N.npz | tail -1
python art/species-construction/loop/mesh_delta.py $A/scratch-r08/dump0400.npz $A/scratch-r08/dump$N.npz --min .003 | head -12
python - <<P
from PIL import Image
d='$A/scratch-r08/'
for v in ['front','left','back','q']:
    ims=[Image.open(f'{d}cl-{b}-{v}.png') for b in ('0400','$N')]
    w,h=ims[0].size
    o=Image.new('RGB',(w*2,h)); o.paste(ims[0],(0,0)); o.paste(ims[1],(w,0)); o.save(f'{d}cmp$N-{v}.png')
P
