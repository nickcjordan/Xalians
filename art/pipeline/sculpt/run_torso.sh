#!/usr/bin/env bash
# Run build_torso.py (or $TORSO_SCRIPT) in Blender 5.2 (WSL) through the machine slot lock (art/pipeline/slot).
#   run_torso.sh <file.blend> [-- script args]
set -euo pipefail
BLENDER="${BLENDER:-/home/njord/.local/opt/blender-5.2.2-linux-x64/blender}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="${TORSO_SCRIPT:-$HERE/build_torso.py}"
BLEND="$1"; shift
[ "${1:-}" = "--" ] && shift
SLOT="$HERE/../slot/slot.py"
SLOTRUN=()
if [ -z "${XALIANS_NO_SLOT:-}" ] && [ -f "$SLOT" ] && command -v python3 >/dev/null 2>&1 && { [ -n "${XALIANS_LOCKS:-}" ] || [ -d /mnt/c/dev/art-data ]; }; then
  SLOTRUN=(python3 "$SLOT" run blender --wait 3600 --owner "claude-stream torso B-ej6s" --)
fi
start=$(date +%s)
# --python-exit-code must come before --python or Blender 5.2 ignores it.
${SLOTRUN[@]+"${SLOTRUN[@]}"} "$BLENDER" -b --factory-startup --python-exit-code 1 "$BLEND" --python "$SCRIPT" -- "$@"
echo "blender_seconds $(( $(date +%s) - start ))"
