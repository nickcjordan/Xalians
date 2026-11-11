#!/usr/bin/env bash
# Build one Hypnopet sculpt and its review images (experiment X33; was a scratch script, lost with a session
# scratchpad, so it lives here now).
# usage: build_sculpt.sh <n> <before build name> [views]
#   builds sculpt-<n> from body-recon-5 with $REPAIRS (default: the current list), renders the head board in clay
#   against <before>, and writes front and side sheet overlays and the side profile chart into board/s<n>-head/
set -e
cd "$(dirname "$0")/../../../.."
B=C:/dev/art-data/studio/blockout/hypnopet
N=$1; PREV=${2:-sculpt-87}
V=${3:-head-front,head-threequarter-left,head-side-left,side-left}
REPAIRS=${REPAIRS:-skin,face,proportions,details,smooth,horn,mouth,nose,eyes,lids,tail,bridge,toes,chest,lowerface,mouthrebuild,headrebuild}
python art/studio/blockout/hypnopet/sculpt.py --base $B/body-recon-5/spec.json --repairs $REPAIRS --out $B/sculpt-$N/spec.json >/dev/null
python -c "import json;p='$B/sculpt-$N/spec.json';s=json.load(open(p));s['voxel']=0.0015;json.dump(s,open(p,'w'),indent=1)"
python art/studio/runner.py blender --log sculpt-$N art/studio/blockout.py -- --spec $B/sculpt-$N/spec.json --out $B/sculpt-$N/build 2>&1 | tail -1 | cut -c1-200
grep "BLOCKOUT DONE\|REFUSED" C:/dev/art-data/studio/blender/logs/sculpt-$N.log | cut -c1-300 | head -3
python art/studio/board.py --build $B/sculpt-$N/build --before $B/$PREV/build --cameras $B/board/cameras.json \
    --refs $B/board/refs.json --out $B/board/s$N-head --views $V --label "sculpt-$N" --before-label "$PREV" \
    --samples 24 --looks clay 2>&1 | tail -1
D=$(ls -d $B/board/s$N-head/clay/sculpt-$N*)
O="art/studio/review/sheet_overlay.py"; C="--cameras $B/board/cameras.json --scale art/studio/blockout/hypnopet/sheet_scale.json"
python $O overlay --render "$D/head-front.png" --camera head-front $C --view front --box -0.10,0.10,0.28,0.58 --out $B/board/s$N-head/ov-front.jpg >/dev/null
python $O overlay --render "$D/head-side-left.png" --camera head-side-left $C --view side --box -0.30,-0.10,0.28,0.58 --out $B/board/s$N-head/ov-side.jpg >/dev/null
python $O profile --render "$D/head-side-left.png" --camera head-side-left $C --chart $B/board/s$N-head/profile.png > $B/board/s$N-head/profile.txt
echo "review images in $B/board/s$N-head"
