"""Encode PNG frame folders into looping videos with PyAV (its bundled ffmpeg), without Blender: the same outputs as
encode_video.py (which needs the shared Blender slot), for when the slot is held by long jobs.

  python art/species-construction/anim/encode_video_av.py <frames dir> <out dir> <name> [--fps 30]

Every subfolder of <frames dir> with NNNN.png frames (one per view) becomes <out>/<name>-<view>.mp4 (H.264, yuv420p, crf 16) and
<out>/<name>-<view>.webm (VP9, crf 20), at the frames' own size (even sizes; 720 px wide at most, scaled down by an integer if
wider, nearest neighbour for the sprite copies).
"""
import argparse
from fractions import Fraction
from pathlib import Path

import av
from PIL import Image

p = argparse.ArgumentParser()
p.add_argument('frames', type=Path)
p.add_argument('out', type=Path)
p.add_argument('name')
p.add_argument('--fps', type=int, default=24)
a = p.parse_args()
a.out.mkdir(parents=True, exist_ok=True)
for view in sorted(d for d in a.frames.iterdir() if d.is_dir()):
    files = sorted(view.glob('[0-9][0-9][0-9][0-9].png'))
    if not files:
        continue
    w, h = Image.open(files[0]).size
    k = 1
    while w//k > 720:
        k += 1
    W, H = (w//k)//2*2, (h//k)//2*2
    for ext, codec, opts in (('mp4', 'libx264', {'crf': '16', 'preset': 'slow'}), ('webm', 'libvpx-vp9', {'crf': '20', 'b': '0'})):
        dst = a.out/f'{a.name}-{view.name}.{ext}'
        c = av.open(str(dst), 'w')
        s = c.add_stream(codec, rate=Fraction(a.fps, 1))
        s.width, s.height, s.pix_fmt = W, H, 'yuv420p'
        s.options = opts
        for f in files:
            im = Image.open(f).convert('RGB')
            if im.size != (W, H):
                im = im.resize((W, H), Image.NEAREST if k > 1 else Image.LANCZOS)
            for pkt in s.encode(av.VideoFrame.from_image(im)):
                c.mux(pkt)
        for pkt in s.encode():
            c.mux(pkt)
        c.close()
        print('wrote', dst, len(files), 'frames', f'{W}x{H}', flush=True)
print('ENCODE_DONE')
