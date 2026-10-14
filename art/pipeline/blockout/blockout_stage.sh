#!/usr/bin/env bash
# Stage 4 blockout step, run inside WSL Ubuntu (pattern of blender/blender_stage.sh).
set -euo pipefail
BLENDER="${BLENDER:-/home/njord/.local/opt/blender-5.2.2-linux-x64/blender}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GLB="$1"
OUT="$2"
shift 2
# Optional machine slot lock (art/pipeline/slot); runs the command bare when the lock is unavailable.
SLOT="$HERE/../slot/slot.py"
SLOTRUN=()
if [ -z "${XALIANS_NO_SLOT:-}" ] && [ -f "$SLOT" ] && command -v python3 >/dev/null 2>&1 && { [ -n "${XALIANS_LOCKS:-}" ] || [ -d /mnt/c/dev/art-data ]; }; then
  SLOTRUN=(python3 "$SLOT" run blender --)
fi
# --python-exit-code must come before --python or Blender 5.2 ignores it (measured: exit 0 after a traceback).
${SLOTRUN[@]+"${SLOTRUN[@]}"} "$BLENDER" -b --factory-startup --python-exit-code 1 --python "$HERE/build_blockout.py" -- --glb "$GLB" --out "$OUT" "$@"
