#!/usr/bin/env bash
# Build, fit-check and quick-render one reconstructed-head variant (experiment X29):
#   bash art/studio/blockout/hypnopet/face_recon.sh R1 <grid.npz> [folder prefix, default face-recon]
# writes C:/dev/art-data/studio/blockout/hypnopet/<prefix>-R1/ (spec, fit.json, build, packet with the face
# cameras and the sprite view at low samples, sprite check). VOXEL=0.0015 meshes finer (thin lips).
set -euo pipefail
N=$1
GRID=$2
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
B=C:/dev/art-data/studio/blockout/hypnopet
O=$B/${3:-face-recon}-$N
mkdir -p "$O"
cd "$ROOT"
python art/studio/blockout/hypnopet/face_recon.py "$N" --grid "$GRID" --out "$O/spec.json" ${VOXEL:+--voxel $VOXEL}
python art/studio/blockout/hypnopet/face_fit.py "$O/spec.json" --json "$O/fit.json"
python art/studio/runner.py blender --log "hypnopet-${3:-face-recon}-$N" art/studio/blockout.py -- --spec "$O/spec.json" --out "$O/build"
python art/studio/cameras_auto.py --build "$O/build" --out "$O/cameras.json" --close head --freeze-from $B/v5/cameras.json
python art/studio/packet.py --assembly "$O/build" --cameras "$O/cameras.json" --out "$O/packet" \
  --cameras-only head-front,head-threequarter-left,head-side-left,threequarter-left --quick --no-baseline
python art/studio/sprite_check.py --image "$O/packet/threequarter-left.png" --out "$O"
