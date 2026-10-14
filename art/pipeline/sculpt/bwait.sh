#!/usr/bin/env bash
# Run Blender 5.2 (WSL) with the given args after any other Blender process has finished (shared machine, one at a time).
set -euo pipefail
BLENDER="${BLENDER:-/home/njord/.local/opt/blender-5.2.2-linux-x64/blender}"
for i in $(seq 1 20); do
  if pgrep -f "blender-5.2.2-linux-x64/blender" >/dev/null; then echo "another Blender is running, waiting 30 s"; sleep 30; else break; fi
done
"$BLENDER" -b --factory-startup --python-exit-code 1 "$@"
