#!/usr/bin/env bash
# Blender stage of the chain, run inside WSL Ubuntu. Called by run.ps1 / run.sh.
set -euo pipefail
BLENDER="${BLENDER:-/home/njord/.local/opt/blender-5.2.2-linux-x64/blender}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-$HERE/../out/standin.build}"
# Optional machine slot lock (art/pipeline/slot); runs the command bare when the lock is unavailable.
SLOT="$HERE/../slot/slot.py"
SLOTRUN=()
if [ -z "${XALIANS_NO_SLOT:-}" ] && [ -f "$SLOT" ] && command -v python3 >/dev/null 2>&1 && { [ -n "${XALIANS_LOCKS:-}" ] || [ -d /mnt/c/dev/art-data ]; }; then
  SLOTRUN=(python3 "$SLOT" run blender --)
fi
${SLOTRUN[@]+"${SLOTRUN[@]}"} "$BLENDER" -b --factory-startup --python-exit-code 1 --python "$HERE/export_asset.py" --   --class "$HERE/../roster/classes/quadruped.json" --out "$OUT"
