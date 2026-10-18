#!/usr/bin/env bash
set -euo pipefail
PIPE=/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline
OUT=/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass6
export GM_ITERATION=${GM_ITERATION:-4}
export GM_STAGE=${GM_STAGE:-${1:-all}}
python3 "$PIPE/slot/slot.py" run blender --wait 3600 --owner "codex B-csbd gamemesh" -- /home/njord/.local/opt/blender-5.2.2-linux-x64/blender -b -t 8 --python-exit-code 1 --python "$PIPE/gamemesh/${GM_SCRIPT:-build_gamemesh.py}" > "$OUT/iter${GM_ITERATION:-1}_${GM_SCRIPT:-build_gamemesh.py}.log" 2>&1
