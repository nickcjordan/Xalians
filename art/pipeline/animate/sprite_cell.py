"""Luceras sprites: one fixed cell and camera scale for every clip, from the union of the per-frame bounds.

python sprite_cell.py MEASURE.json CELL.json [body_px=192] [margin_px=4] [master_scale=4]
Scale: the rest-pose body (mesh only, no horns or fur) is body_px tall at 1x. The cell holds the union of every frame's
rendered bounds (body, horns, eyes, claws, head parts, every visible strand incl. the plume tips) of both clips, played in
place, plus margin_px on every side. Sizes are rounded up to even pixels; the camera window is centred on the union.
"""
import json, math, sys

m = json.load(open(sys.argv[1])); out = sys.argv[2]
body_px = float(sys.argv[3]) if len(sys.argv) > 3 else 192.0
margin = int(sys.argv[4]) if len(sys.argv) > 4 else 4
ms = int(sys.argv[5]) if len(sys.argv) > 5 else 4
ppm = body_px / m['rest_body']['height_m']
lo = [1e9, 1e9]; hi = [-1e9, -1e9]; per_clip = {}; drivers = {}
for clip, rows in m['clips'].items():
    cl = [1e9, 1e9]; ch = [-1e9, -1e9]
    for r in rows:
        (a, b), (c, d) = r['bounds']
        cl = [min(cl[0], a), min(cl[1], b)]; ch = [max(ch[0], c), max(ch[1], d)]
        for i, (sname, val) in enumerate((('left', a), ('bottom', b))):
            if val < lo[i]: lo[i] = val; drivers[sname] = (clip, r['frame'], min(r['cats'], key=lambda k: r['cats'][k][0][i]))
        for i, (sname, val) in enumerate((('right', c), ('top', d))):
            if val > hi[i]: hi[i] = val; drivers[sname] = (clip, r['frame'], max(r['cats'], key=lambda k: r['cats'][k][1][i]))
    per_clip[clip] = dict(lo=cl, hi=ch, w_px=round((ch[0] - cl[0]) * ppm, 1), h_px=round((ch[1] - cl[1]) * ppm, 1))
w = math.ceil((hi[0] - lo[0]) * ppm + 2 * margin); h = math.ceil((hi[1] - lo[1]) * ppm + 2 * margin)
w += w % 2; h += h % 2
cell = dict(px_per_m=ppm, body_px_at_rest=body_px, rest_body_height_m=m['rest_body']['height_m'], margin_px=margin, cell_px=[w, h],
            master_scale=ms, master_px=[w * ms, h * ms], ortho_scale_m=w / ppm, center_cam_m=[(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2],
            union_cam_m=[lo, hi], extreme_frames=drivers, per_clip=per_clip,
            ground_y_px=None)
# ground line in the cell (rest body bottom in camera space -> pixel row from the top)
gy = m['rest_body']['bottom_m']; cell['ground_y_px'] = round(h / 2 - (gy - cell['center_cam_m'][1]) * ppm, 2)
json.dump(cell, open(out, 'w'), indent=1); print(json.dumps(cell, indent=1))
