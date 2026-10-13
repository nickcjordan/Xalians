#!/usr/bin/env bash
# Build and packet one head variant: bash art/studio/blockout/hypnopet/head_preview.sh A
set -euo pipefail
N=$1
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
B=C:/dev/art-data/studio/blockout/hypnopet
O=$B/head-preview-$N
mkdir -p "$O"
cd "$ROOT"
python art/studio/blockout/hypnopet/head_variants.py "$N" --out "$O/spec.json"
python art/studio/runner.py blender --log "hypnopet-head-$N" art/studio/blockout.py -- --spec "$O/spec.json" --out "$O/build"
python art/studio/cameras_auto.py --build "$O/build" --out "$O/cameras.json" --close head --freeze-from C:/dev/art-data/studio/blockout/hypnopet/v5/cameras.json
python art/studio/packet.py --assembly "$O/build" --baseline $B/v5/build --part head --cameras "$O/cameras.json" --out "$O/packet"
