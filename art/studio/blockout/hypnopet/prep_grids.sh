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
# 5. proportions (critic items 4 and 5): board/warps-5.json, run by grid_warp.py on the face grid
python art/studio/recon/grid_mask.py --grid $R/grid-skin-2.npz --seed 0.23,-0.06,0.25 --box 0.0,0.4,-0.33,0.33,0.0,0.44 --out $R/mask-ear-left.npz
python art/studio/recon/grid_warp.py --grid $R/grid-skin-2.npz --out $R/grid-skin-3.npz --warps $B/board/warps-5.json
# 6. close-up blemishes (critic items 6, 9, 10, 11, 12, 13), positions from the critic's pixel coordinates mapped
#    through the board cameras: sole rims, head-back lobes, the thigh's front crease, the wrist lumps, the armpit
#    slits (fill), the ear pinch, and the buttock cleft under the tail (fill)
python art/studio/recon/grid_soften.py --grid $R/grid-skin-3.npz --out $R/grid-skin-4.npz --below 0.012,0.010,0.003 \
  --at 0.085,-0.10,0.415,0.030,0.005 \
  --at 0.100,0.115,0.250,0.030,0.005 \
  --at 0.030,-0.100,0.100,0.025,0.004 \
  --at 0.030,-0.080,0.190,0.025,0.005,1 \
  --at 0.170,-0.080,0.420,0.015,0.003 \
  --at 0,0.190,0.215,0.030,0.005,1
# 5b-7 (critic 2): the ear rake bent over 12 cm (board/warps-6.json; warps-5's 7 cm bend creased the back of each
#    ear), step 6's softening repeated on it, then the tail stem flattened, the cleft's V pinch filled and the
#    creases where the ear roots meet the back of the skull softened (positions picked on sculpt-28's curvature board)
python art/studio/recon/grid_warp.py --grid $R/grid-skin-2.npz --out $R/grid-skin-3b.npz --warps $B/board/warps-6.json
python art/studio/recon/grid_soften.py --grid $R/grid-skin-3b.npz --out $R/grid-skin-4b.npz --below 0.012,0.010,0.003   --at 0.085,-0.10,0.415,0.030,0.005   --at 0.100,0.115,0.250,0.030,0.005   --at 0.030,-0.100,0.100,0.025,0.004   --at 0.030,-0.080,0.190,0.025,0.005,1   --at 0.170,-0.080,0.420,0.015,0.003   --at 0,0.190,0.215,0.030,0.005,1
python art/studio/recon/grid_soften.py --grid $R/grid-skin-4b.npz --out $R/grid-skin-5.npz   --at 0,0.205,0.228,0.022,0.006   --at 0,0.185,0.205,0.018,0.005,1   --at 0.062,-0.078,0.490,0.022,0.005
# 5c-7c: as 5b-7 on board/warps-7.json (the ear blades also swing 6 degrees in, the hind lower legs and feet move 15
#    percent in below the hock: metric overlays on flesh-front and flesh-back), plus a fill at the top of the cleft
python art/studio/recon/grid_warp.py --grid $R/grid-skin-2.npz --out $R/grid-skin-3c.npz --warps $B/board/warps-7.json
python art/studio/recon/grid_soften.py --grid $R/grid-skin-3c.npz --out $R/grid-skin-4c.npz --below 0.012,0.010,0.003   --at 0.085,-0.10,0.415,0.030,0.005   --at 0.100,0.115,0.250,0.030,0.005   --at 0.030,-0.100,0.100,0.025,0.004   --at 0.030,-0.080,0.190,0.025,0.005,1   --at 0.170,-0.080,0.420,0.015,0.003   --at 0,0.190,0.215,0.030,0.005,1
python art/studio/recon/grid_soften.py --grid $R/grid-skin-4c.npz --out $R/grid-skin-5c.npz   --at 0,0.205,0.228,0.022,0.006   --at 0,0.185,0.205,0.018,0.005,1   --at 0.062,-0.078,0.490,0.022,0.005   --at 0,0.215,0.240,0.020,0.006,1
# 5d-7d (critic 3): as 5c-7c on board/warps-8.json, which adds the forepaw shortened to 0.73 and the jowls narrowed
#    about the mouth corner to the sheet's heart-shaped lower face
python art/studio/recon/grid_warp.py --grid $R/grid-skin-2.npz --out $R/grid-skin-3d.npz --warps $B/board/warps-8.json
python art/studio/recon/grid_soften.py --grid $R/grid-skin-3d.npz --out $R/grid-skin-4d.npz --below 0.012,0.010,0.003 \
  --at 0.085,-0.10,0.415,0.030,0.005 \
  --at 0.100,0.115,0.250,0.030,0.005 \
  --at 0.030,-0.100,0.100,0.025,0.004 \
  --at 0.030,-0.080,0.190,0.025,0.005,1 \
  --at 0.170,-0.080,0.420,0.015,0.003 \
  --at 0,0.190,0.215,0.030,0.005,1
python art/studio/recon/grid_soften.py --grid $R/grid-skin-4d.npz --out $R/grid-skin-5d.npz \
  --at 0,0.205,0.228,0.022,0.006 \
  --at 0,0.185,0.205,0.018,0.005,1 \
  --at 0.062,-0.078,0.490,0.022,0.005 \
  --at 0,0.215,0.240,0.020,0.006,1
# 8 (critic 3): the dimple on each ear's outer face filled where the swung-in ear now has it, and the inner wrist
#    bulges softened (positions picked on sculpt-35)
python art/studio/recon/grid_soften.py --grid $R/grid-skin-5d.npz --out $R/grid-skin-5e.npz \
  --at 0.184,-0.079,0.424,0.016,0.004,1 \
  --at 0.019,-0.115,0.074,0.016,0.004
# 5f-7f (critic 4): as 5d-7d plus step 8 on board/warps-9.json, which rakes the ears 15 degrees and swings them in 3
#    (6 hung them against the body), and narrows the hind feet 18 percent about their own center line (x 0.10)
python art/studio/recon/grid_warp.py --grid $R/grid-skin-2.npz --out $R/grid-skin-3f.npz --warps $B/board/warps-9.json
python art/studio/recon/grid_soften.py --grid $R/grid-skin-3f.npz --out $R/grid-skin-4f.npz --below 0.012,0.010,0.003 \
  --at 0.085,-0.10,0.415,0.030,0.005 \
  --at 0.100,0.115,0.250,0.030,0.005 \
  --at 0.030,-0.100,0.100,0.025,0.004 \
  --at 0.030,-0.080,0.190,0.025,0.005,1 \
  --at 0.170,-0.080,0.420,0.015,0.003 \
  --at 0,0.190,0.215,0.030,0.005,1
python art/studio/recon/grid_soften.py --grid $R/grid-skin-4f.npz --out $R/grid-skin-5f.npz \
  --at 0,0.205,0.228,0.022,0.006 \
  --at 0,0.185,0.205,0.018,0.005,1 \
  --at 0.062,-0.078,0.490,0.022,0.005 \
  --at 0,0.215,0.240,0.020,0.006,1 \
  --at 0.184,-0.079,0.424,0.016,0.004,1 \
  --at 0.019,-0.115,0.074,0.016,0.004
