#!/usr/bin/env bash
# Stage 4 blockout step, run inside WSL Ubuntu (pattern of blender/blender_stage.sh).
set -euo pipefail
BLENDER="${BLENDER:-/home/njord/.local/opt/blender-5.2.2-linux-x64/blender}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GLB="$1"
OUT="$2"
shift 2
# --python-exit-code must come before --python or Blender 5.2 ignores it (measured: exit 0 after a traceback).
"$BLENDER" -b --factory-startup --python-exit-code 1 --python "$HERE/build_blockout.py" -- --glb "$GLB" --out "$OUT" "$@"
