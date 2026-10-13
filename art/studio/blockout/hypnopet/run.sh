#!/usr/bin/env bash
# One blockout iteration for Hypnopet: spec -> build -> packet (cameras frozen to v1's frame) -> fit.
#   bash art/studio/blockout/hypnopet/run.sh v2
# Outputs go to C:/dev/art-data/studio/blockout/hypnopet/<version>/ (spec.json, build/, cameras.json, packet/, fit/).
set -euo pipefail
VER=$1
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
HERE=$ROOT/art/studio/blockout/hypnopet
O=C:/dev/art-data/studio/blockout/hypnopet/$VER
cd "$ROOT"
python "$HERE/make_spec.py" "$VER"
mkdir -p "$O"
cp "$HERE/spec.json" "$O/spec.json"
python art/species-construction/loop/loop_tools.py --species akinza blender --log "hypnopet-blockout-$VER" \
    art/studio/blockout.py -- --spec "$O/spec.json" --out "$O/build"
FREEZE=()
if [ "$VER" != v1 ]; then FREEZE=(--freeze-from C:/dev/art-data/studio/blockout/hypnopet/v1/cameras.json); fi
python art/studio/cameras_auto.py --build "$O/build" --out "$O/cameras.json" --close head --close hindlegs "${FREEZE[@]}"
python art/studio/packet.py --assembly "$O/build" --cameras "$O/cameras.json" --out "$O/packet" ${BASELINE:+--baseline "$BASELINE"}
cd "$HERE"
python fit.py --build "$O/build" --packet "$O/packet" --cameras "$O/cameras.json" --out "$O/fit" --label "$VER"
