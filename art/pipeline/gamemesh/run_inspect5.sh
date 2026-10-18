#!/usr/bin/env bash
set -euo pipefail
PIPE=/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline
B=/home/njord/.local/opt/blender-5.2.2-linux-x64/blender
OUT=/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass5
mkdir -p "$OUT"
python3 "$PIPE/slot/slot.py" run blender --wait 3600 --owner "codex B-sgkc gamemesh" -- "$B" -b --factory-startup -t 8 --python-exit-code 1 --python "$PIPE/gamemesh/inspect_pass5.py" -- --stage "${1:-all}" > "$OUT/iter${GM_ITERATION:-1}_${1:-all}.log" 2>&1
