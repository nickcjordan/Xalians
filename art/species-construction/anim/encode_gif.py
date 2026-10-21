"""GIF fallback for the motion clips: every view folder of NNNN.png frames becomes <out>/<name>-<view>.gif,
looping, at the given fps (palette per frame, no dithering of the clay gray), at most 720 px wide.

  python art/species-construction/anim/encode_gif.py <frames dir> <out dir> <name> [fps]
"""
import sys
from pathlib import Path

from PIL import Image

frames, out, name = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
fps = int(sys.argv[4]) if len(sys.argv) > 4 else 24
out.mkdir(parents=True, exist_ok=True)
for view in sorted(d for d in frames.iterdir() if d.is_dir()):
    files = sorted(view.glob('[0-9][0-9][0-9][0-9].png'))
    if not files:
        continue
    ims = []
    for f in files:
        im = Image.open(f).convert('RGB')
        if im.width > 720:
            im = im.resize((720, round(im.height*720/im.width)), Image.LANCZOS)
        ims.append(im.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
    path = out/f'{name}-{view.name}.gif'
    ims[0].save(path, save_all=True, append_images=ims[1:], duration=round(1000/fps), loop=0, disposal=1)
    print('wrote', path, len(ims), 'frames')
