#!/usr/bin/env bash
# Build, packet and sprite-check one first-pass face preview:
#   bash art/studio/blockout/hypnopet/face_preview.sh A [folder prefix, default face-preview]
# writes C:/dev/art-data/studio/blockout/hypnopet/<prefix>-A/
# QUICK=1 renders only the face cameras plus the sprite view, at low samples, with no baseline (experiment X26);
# render the full packet only for the chosen option. The face fit numbers (face_fit.py) go to fit.json first.
set -euo pipefail
N=$1
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
B=C:/dev/art-data/studio/blockout/hypnopet
O=$B/${2:-face-preview}-$N
mkdir -p "$O"
cd "$ROOT"
python art/studio/blockout/hypnopet/face_previews.py "$N" --out "$O/spec.json"
python art/studio/blockout/hypnopet/face_fit.py "$O/spec.json" --json "$O/fit.json"
python art/studio/runner.py blender --log "hypnopet-${2:-face-preview}-$N" art/studio/blockout.py -- --spec "$O/spec.json" --out "$O/build"
python art/studio/cameras_auto.py --build "$O/build" --out "$O/cameras.json" --close head --freeze-from $B/v5/cameras.json
if [ "${QUICK:-0}" = 1 ]; then
  python art/studio/packet.py --assembly "$O/build" --cameras "$O/cameras.json" --out "$O/packet"     --cameras-only head-front,head-threequarter-left,head-side-left,threequarter-left --quick --no-baseline
else
  python art/studio/packet.py --assembly "$O/build" --baseline $B/v5/build --part head --cameras "$O/cameras.json" --out "$O/packet"
fi
python art/studio/sprite_check.py --image "$O/packet/threequarter-left.png" --out "$O"
