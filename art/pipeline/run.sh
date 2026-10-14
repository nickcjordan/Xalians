#!/usr/bin/env bash
# Whole chain from Git Bash on Windows: Blender (WSL) -> meshopt + manifest (node) -> contract validator.
#   bash art/pipeline/run.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REL="${HERE#/c/}"
WSL_HERE="/mnt/c/${REL}"
WIN_HERE="$(cygpath -w "$HERE")"
[ -d "$HERE/node_modules" ] || (cd "$HERE" && npm install --no-audit --no-fund)
start=$(date +%s)
echo "== 1. Blender build and export (WSL)"
rm -f "$HERE/out/standin.build/standin.raw.glb"
MSYS_NO_PATHCONV=1 wsl -d Ubuntu -- bash "$WSL_HERE/blender/blender_stage.sh" "$WSL_HERE/out/standin.build" 2>&1 | grep -E "XALIANS_FACTS|Error|Traceback|error" || true
[ -f "$HERE/out/standin.build/standin.raw.glb" ] || { echo "Blender stage produced no glb"; exit 1; }
echo "== 2. meshopt compression and manifest"
node "$WIN_HERE\contract\write_manifest.mjs" "$WIN_HERE\out\standin.build" "$WIN_HERE\out\standin"
echo "== 3. contract validator"
node "$WIN_HERE\contract\validate.mjs" "$WIN_HERE\out\standin"
echo "chain done in $(( $(date +%s) - start )) s"
