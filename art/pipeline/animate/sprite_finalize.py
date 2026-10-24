"""Luceras sprites pass 1: 1x frames, sprite sheets, atlas JSON, previews and hashes from the 4x masters.

python sprite_finalize.py PASS_DIR BAKE.json
Reads PASS_DIR/cell.json, PASS_DIR/measure.json and PASS_DIR/master/<clip>/####.png. Writes
  frames/<clip>/<clip>_####.png           1x straight-alpha RGBA (premultiplied box downscale of the 4x master)
  sheets/<clip>.png + sheets/<clip>.json  row-major sheet and atlas (rects, durations in ms, events, root offsets, pivot)
  preview/<clip>_{gray,dark}_{1x,2x}.webp and _1x.gif; preview/sig_travel_gray_1x.webp (cells moved by the root table)
  root_offsets.json                       per-frame root offset of the signature (metres and 1x pixels)
"""
import json, sys, math, hashlib
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from sprite_downscale import downscale, composite

P = Path(sys.argv[1]); bake = json.loads(Path(sys.argv[2]).read_text())
cell = json.loads((P / 'cell.json').read_text()); meas = json.loads((P / 'measure.json').read_text())
W, H = cell['cell_px']; K = cell['master_scale']; ppm = cell['px_per_m']
CLIPS = {'idle': dict(frames=90, ms=3000, loop=True), 'sig.horns-first-descent': dict(frames=60, ms=2000, loop=False)}
GRAY, DARK = (128, 128, 128), (24, 24, 28)
GUTTER, COLS = 2, 10
# pivot: the rest-pose root on the ground, in cell pixels (x of the rig origin, y of the rest ground line)
Cc = np.array(meas['camera']['matrix']); cx, cy = cell['center_cam_m']
o_cam = np.linalg.inv(Cc) @ np.array([0, 0, 0, 1.0])
pivot = [round(W / 2 + (o_cam[0] - cx) * ppm, 2), round(H / 2 - (o_cam[1] - cy) * ppm, 2)]
times = bake['times']; ev_src = bake['events']


def durations(n, total):
    return [round((i + 1) * total / n) - round(i * total / n) for i in range(n)]


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


report = dict(shared_render_cell=dict(px=[W, H], master_px=[W * K, H * K], px_per_m=ppm, pivot_px=pivot, ground_y_px=cell['ground_y_px']), clips={})
MG = cell['margin_px']; GROUND = cell['ground_y_px']
# per-clip cells (coordinator, after rendering): the shared scale stays; each clip is cropped from the shared 4x render to
# its own bounds union plus the margin, on whole 1x pixels, so the 4x crop is exact
CROP = {}
for clip in CLIPS:
    lo, hi = cell['per_clip'][clip]['lo'], cell['per_clip'][clip]['hi']
    x0 = math.floor(W / 2 + (lo[0] - cx) * ppm - MG); x1 = math.ceil(W / 2 + (hi[0] - cx) * ppm + MG)
    y0 = math.floor(H / 2 - (hi[1] - cy) * ppm - MG); y1 = math.ceil(H / 2 - (lo[1] - cy) * ppm + MG)
    x0, y0 = max(0, x0), max(0, y0); w_ = x1 - x0; h_ = y1 - y0; w_ += w_ % 2; h_ += h_ % 2
    w_ = min(w_, W - x0); h_ = min(h_, H - y0); CROP[clip] = (x0, y0, w_, h_)
for clip, c in CLIPS.items():
    n = c['frames']; fd = P / 'frames' / clip; fd.mkdir(parents=True, exist_ok=True)
    one, two = [], []; x0c, y0c, W, H = CROP[clip]
    piv = [round(pivot[0] - x0c, 2), round(pivot[1] - y0c, 2)]; gnd = round(GROUND - y0c, 2)
    for f in range(n):
        m = np.asarray(Image.open(P / 'master' / clip / f'{f:04d}.png').convert('RGBA'))[y0c * K:(y0c + H) * K, x0c * K:(x0c + W) * K]
        a1 = downscale(m, K); a2 = downscale(m, K // 2)
        Image.fromarray(a1).save(fd / f'{clip}_{f:04d}.png'); one.append(a1); two.append(a2)
    dur = durations(n, c['ms'])
    rows = math.ceil(n / COLS); SW = COLS * W + (COLS - 1) * GUTTER; SH = rows * H + (rows - 1) * GUTTER
    sheet = np.zeros((SH, SW, 4), np.uint8); frames = []
    roots = [float(bake['specs'][clip][f].get('_root', 0.0)) for f in range(n)]
    for i, a in enumerate(one):
        x = (i % COLS) * (W + GUTTER); y = (i // COLS) * (H + GUTTER); sheet[y:y + H, x:x + W] = a
        frames.append(dict(index=i, name=f'{clip}_{i:04d}', rect=dict(x=x, y=y, w=W, h=H), duration_ms=dur[i], start_ms=sum(dur[:i]),
                           root_offset=dict(x_m=round(roots[i], 5), x_px=round(roots[i] * ppm, 2), y_px=0.0)))
    sd = P / 'sheets'; sd.mkdir(exist_ok=True); Image.fromarray(sheet).save(sd / f'{clip}.png', optimize=True)
    events = []
    if clip.startswith('sig'):
        fe = dict(launch=times['takeoff'], hit=times['hit'], fore_foot_down=times['fore_land'], hind_foot_down=times['hind_land'], recover=times['recover'])
        for k, t in fe.items(): events.append(dict(name=k, ms=round(t, 2), frame=min(n - 1, int(round(t / (c['ms'] / n))))))
    atlas = dict(meta=dict(image=f'{clip}.png', size=dict(w=SW, h=SH), format='RGBA8888 straight alpha (not premultiplied)', scale=1,
                           cell=dict(w=W, h=H), gutter_px=GUTTER, columns=COLS, order='row-major', fps=30, loop=c['loop'], duration_ms=c['ms'],
                           pivot_px=dict(x=piv[0], y=piv[1], note='rest-pose root on the ground, cell pixels from the top left; the same in every frame'),
                           ground_y_px=gnd, ground_note='y of the feet at rest in this cell; align clips by their ground_y_px and pivot x (same px_per_m in every clip)',
                           crop_in_shared_cell_px=dict(x=x0c, y=y0c, w=W, h=H), shared_cell_px=dict(w=cell['cell_px'][0], h=cell['cell_px'][1]),
                           other_clips={k: dict(cell=dict(w=v[2], h=v[3]), pivot_px=dict(x=round(pivot[0] - v[0], 2), y=round(pivot[1] - v[1], 2)), ground_y_px=round(GROUND - v[1], 2)) for k, v in CROP.items() if k != clip},
                           facing='right (side view, slice ruling)', px_per_m=round(ppm, 4),
                           root_motion=('none (plays in place)' if not clip.startswith('sig') else
                                        'cells are in place; add frames[i].root_offset.x_px to the sprite position (forward = +x). The offset reaches '
                                        f'{roots[-1] * ppm:.1f} px ({roots[-1]:.3f} m) and holds; vertical motion (the leap) is inside the cell'),
                           events_source='luceras_clips.py bake (anim3 work/bake.json times; fore/hind foot-down = fore_land/hind_land)'),
                 frames=frames, events=events)
    (sd / f'{clip}.json').write_text(json.dumps(atlas, indent=1))
    pv = P / 'preview'; pv.mkdir(exist_ok=True); outs = []
    for bgn, bg in (('gray', GRAY), ('dark', DARK)):
        for sc, seq in (('1x', one), ('2x', two)):
            ims = [Image.fromarray(composite(a, bg)) for a in seq]
            p = pv / f'{clip}_{bgn}_{sc}.webp'; ims[0].save(p, save_all=True, append_images=ims[1:], duration=dur, loop=0, quality=90, method=4); outs.append(p)
            if sc == '1x':
                p = pv / f'{clip}_{bgn}_1x.gif'; ims[0].convert('P', palette=Image.ADAPTIVE).save(p, save_all=True, append_images=[i.convert('P', palette=Image.ADAPTIVE) for i in ims[1:]], duration=dur, loop=0, disposal=2); outs.append(p)
    if clip.startswith('sig'):
        span = int(math.ceil(roots[-1] * ppm)); TW = W + span; ims = []
        for i, a in enumerate(one):
            can = np.zeros((H, TW, 4), np.uint8); x = int(round(roots[i] * ppm)); can[:, x:x + W] = a; ims.append(Image.fromarray(composite(can, GRAY)))
        p = pv / 'sig_travel_gray_1x.webp'; ims[0].save(p, save_all=True, append_images=ims[1:], duration=dur, loop=0, quality=90); outs.append(p)
        (P / 'root_offsets.json').write_text(json.dumps(dict(clip=clip, px_per_m=ppm, forward='+x (the creature faces right)',
                                                             frames=[dict(frame=i, x_m=round(r, 5), x_px=round(r * ppm, 2)) for i, r in enumerate(roots)]), indent=1))
    report['clips'][clip] = dict(cell_px=[W, H], crop_in_shared_cell=CROP[clip], pivot_px=piv, ground_y_px=gnd, frames=n, duration_ms=c['ms'], sheet=str(sd / f'{clip}.png'), sheet_px=[SW, SH], atlas=str(sd / f'{clip}.json'), events=events,
                                 previews=[str(p) for p in outs])
    print('FINAL', clip, n, SW, SH, flush=True)
(P / 'finalize.json').write_text(json.dumps(report, indent=1)); print('FINAL done')
