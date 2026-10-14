#!/usr/bin/env bash
# Run build_head.py in Blender 5.2 (WSL), waiting for any other Blender process to finish first (shared machine).
set -euo pipefail
BLENDER="${BLENDER:-/home/njord/.local/opt/blender-5.2.2-linux-x64/blender}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLEND="$1"; shift
for i in $(seq 1 20); do
  if pgrep -f "blender-5.2.2-linux-x64/blender" >/dev/null; then echo "another Blender is running, waiting 30 s"; sleep 30; else break; fi
done
# Optional machine slot lock (art/pipeline/slot); runs the command bare when the lock is unavailable.
SLOT="$HERE/../slot/slot.py"
SLOTRUN=()
if [ -z "${XALIANS_NO_SLOT:-}" ] && [ -f "$SLOT" ] && command -v python3 >/dev/null 2>&1 && { [ -n "${XALIANS_LOCKS:-}" ] || [ -d /mnt/c/dev/art-data ]; }; then
  SLOTRUN=(python3 "$SLOT" run blender --)
fi
start=$(date +%s)
# --python-exit-code must come before --python or Blender 5.2 ignores it.
${SLOTRUN[@]+"${SLOTRUN[@]}"} "$BLENDER" -b --factory-startup --python-exit-code 1 "$BLEND" --python "$HERE/build_head.py" -- "$@"
echo "blender_seconds $(( $(date +%s) - start ))"
