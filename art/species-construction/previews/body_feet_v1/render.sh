#!/bin/sh
# render.sh <assembled-NNNN> <out subdir> <views> [samples] [heat ref npz] [heat max]
cd /c/dev/src/xalians-akinza-loop
O=$(pwd -W)/untracked/species-construction/akinza/surface/head-redesign/${OUTSET:-body-feet-v1}
A=$(pwd -W)/untracked/species-construction/akinza/$1/akinza.blend
python art/species-construction/loop/loop_tools.py blender --log bf1-render-$2 art/species-construction/previews/body_feet_v1/render_views.py -- $A none $O/work/$2 $3 ${4:-32} ${5:-none} ${6:-0.03}
