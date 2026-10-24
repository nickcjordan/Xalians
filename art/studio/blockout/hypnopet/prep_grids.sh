#!/usr/bin/env bash
# Hypnopet sculpt-stage grid preparation (experiment X33). Each step writes a new grid next to the reconstruction;
# sculpt.py repairs point at the results by path and pin them by sha256. Run from the repository root.
set -euo pipefail
R=C:/dev/art-data/studio/recon/hypnopet/r10-mv-oct512
B=C:/dev/art-data/studio/blockout/hypnopet
# 1. body grid with only the horn cut baked in (no face cut: the head grid takes the face by morph, step 3)
python - <<'PY'
import json
B='C:/dev/art-data/studio/blockout/hypnopet/'
s=json.load(open(B+'body-recon-5/spec.json'))
for p in s['parts']:
    if p['part']=='body': p['params']['cuts']=[c for c in p['params']['cuts'] if abs(c['center'][2]-0.62)<0.01]
json.dump(s,open(B+'board/tmp-horncut-only.json','w'),indent=1)
PY
python art/studio/recon/grid_bake.py --spec $B/board/tmp-horncut-only.json --part body --out $R/grid-body-5-horncut.npz
# 2. crown: round the horn cut's rim into the crown
python art/studio/recon/grid_soften.py --grid $R/grid-body-5-horncut.npz --out $R/grid-body-5-horncut-crown.npz --at 0,-0.155,0.53,0.06,0.006
# 3. one skin: morph the 1 mm head grid into the body inside the head ellipsoid, 1.5 mm
python - <<'PY'
import json, hashlib
B='C:/dev/art-data/studio/blockout/hypnopet/'; R='C:/dev/art-data/studio/recon/hypnopet/r10-mv-oct512/'
s=json.load(open(B+'sculpt-6/spec.json'))
for p in s['parts']:
    if p['part']=='body':
        p['params']['file']=R+'grid-body-5-horncut-crown.npz'; p['params']['sha256']=hashlib.sha256(open(p['params']['file'],'rb').read()).hexdigest(); p['params']['cuts']=[]
json.dump(s,open(B+'board/tmp-merge-src.json','w'),indent=1)
PY
python art/studio/recon/grid_merge.py --spec $B/board/tmp-merge-src.json --out $R/grid-skin-1.npz
# 4. face (critic items 3, 7, 14): fill the reconstruction's mouth slot (fill-only blur, so the fangs and the slot
#    close while convex forms stay), soften the crescent crease behind and under each eye, the outer brow and the
#    jowl fold, and soften the wide nose so an authored button can replace it. Centers come from the strongest
#    creases found on the curvature board (sculpt-7). The grid is the left half (mirrored in the spec).
python art/studio/recon/grid_soften.py --grid $R/grid-skin-1.npz --out $R/grid-skin-2.npz \
  --at 0,-0.232,0.352,0.040,0.006,1 \
  --at 0.082,-0.185,0.428,0.030,0.005 \
  --at 0.080,-0.198,0.446,0.022,0.004 \
  --at 0.070,-0.185,0.375,0.025,0.004 \
  --at 0,-0.282,0.396,0.022,0.004
