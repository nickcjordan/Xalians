#!/usr/bin/env bash
set -euo pipefail
B=/home/njord/.local/opt/blender-5.2.2-linux-x64/blender
S=/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline
C=/mnt/c/dev/art-data/pipeline/codex-stream
M=$C/luceras-merge
SLOT="python3 $S/slot/slot.py run blender --wait 3600 --owner orchestrator-merge --"
$SLOT $B -b --factory-startup --python-exit-code 1 $C/luceras-hindlegs/pass3/hindlegs.blend --python $S/sculpt/apply_region_delta.py -- --delta $C/luceras-tail/pass1/tail_delta.npz --meta $C/luceras-tail/pass1/meta.json --output $M/step1_tail.blend
$SLOT $B -b --factory-startup --python-exit-code 1 $M/step1_tail.blend --python $S/sculpt/apply_region_delta.py -- --delta $C/luceras-forelegs/pass1/forelegs_delta.npz --meta $C/luceras-forelegs/pass1/meta.json --output $M/merged.blend
echo MERGED
