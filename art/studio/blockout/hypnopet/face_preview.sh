#!/usr/bin/env bash
# Build, packet and sprite-check one first-pass face preview: bash art/studio/blockout/hypnopet/face_preview.sh A
set -euo pipefail
N=$1
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
B=C:/dev/art-data/studio/blockout/hypnopet
O=$B/face-preview-$N
mkdir -p "$O"
cd "$ROOT"
python art/studio/blockout/hypnopet/face_previews.py "$N" --out "$O/spec.json"
python art/studio/runner.py blender --log "hypnopet-face-$N" art/studio/blockout.py -- --spec "$O/spec.json" --out "$O/build"
python art/studio/cameras_auto.py --build "$O/build" --out "$O/cameras.json" --close head --freeze-from $B/v5/cameras.json
python art/studio/packet.py --assembly "$O/build" --baseline $B/v5/build --part head --cameras "$O/cameras.json" --out "$O/packet"
python art/studio/sprite_check.py --image "$O/packet/threequarter-left.png" --out "$O"
