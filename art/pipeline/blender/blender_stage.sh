#!/usr/bin/env bash
# Blender stage of the chain, run inside WSL Ubuntu. Called by run.ps1 / run.sh.
set -euo pipefail
BLENDER="${BLENDER:-/home/njord/.local/opt/blender-5.2.2-linux-x64/blender}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-$HERE/../out/standin.build}"
"$BLENDER" -b --factory-startup --python "$HERE/export_asset.py" --python-exit-code 1 --   --class "$HERE/../roster/classes/quadruped.json" --out "$OUT"
