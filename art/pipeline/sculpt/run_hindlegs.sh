#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLEND="$1"; shift
[ "${1:-}" = "--" ] && shift
python3 "$HERE/../slot/slot.py" run blender --wait 3600 --owner "codex B-xcbx" -- /home/njord/.local/opt/blender-5.2.2-linux-x64/blender -b --factory-startup --python-exit-code 1 "$BLEND" --python "$HERE/build_hindlegs.py" -- "$@"
