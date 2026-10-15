#!/bin/bash
set -euo pipefail
ROOT=/mnt/c/dev/src/xalians-creature-pipeline
BASE=/mnt/c/dev/art-data/pipeline/codex-stream/luceras-merge/merged.blend
python3 "$ROOT/art/pipeline/slot/slot.py" run blender --wait 3600 --owner "codex B-dp38 paws" -- /home/njord/.local/opt/blender-5.2.2-linux-x64/blender -b --factory-startup --python-exit-code 1 "$BASE" --python "$ROOT/art/pipeline/sculpt/build_paws.py" -- "$@"
