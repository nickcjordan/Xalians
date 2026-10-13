#!/bin/sh
# r.sh <tag> <deform.npz|none> <views> [samples] : render into work/r-<tag>
cd /c/dev/src/xalians-akinza-loop
W=$(pwd -W)/untracked/species-construction/akinza/surface/head-redesign/feet-body-previews/work
B=$(pwd -W)/untracked/species-construction/akinza/assembled-3179/akinza.blend
D=$2; [ "$D" != none ] && D=$W/$D
python art/species-construction/loop/loop_tools.py blender --log $W/logs/render-$1 art/species-construction/previews/feet_body/preview_render.py -- $B $D $W/r-$1 $3 ${4:-48}
