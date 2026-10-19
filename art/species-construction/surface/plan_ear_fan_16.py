"""Step 16: the half-circle fan's hairs in ears-front pixels, by the rules of
briefs/16-target-painter.py (Nick's D1), written for the Blender build to cast.

Origin, axis, 180-degree spread, length law, 80 percent reach cap against the
painter's own ear mask, root spread along the head edge, and per-hair bend are
the painter's. Only the hair count and seed are this build's.
  python plan_ear_fan_16.py <out.npz> [hairs per ear] [seed offset]
"""
import sys
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
BRIEFS = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps/briefs'
base = Image.open(BRIEFS / '15-target-base.png').convert('RGB')   # the painter's base.png
W, H = base.size
a = np.asarray(base).astype(int)
ear = (np.abs(a - 247).max(axis=2) > 10)
mm = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(mm)
d.ellipse((280, 300, 385, 410), fill=255)
d.ellipse((640, 295, 745, 405), fill=255)
ear = ear | (np.asarray(mm) > 0)
yy, xx = np.mgrid[0:H, 0:W]
HEADIN = ((xx - 512) / 128.0) ** 2 + ((yy - 395) / 163.0) ** 2 <= 1.0
ear[HEADIN] = False
EARHARD = np.asarray(Image.fromarray((ear * 255).astype('uint8')).filter(ImageFilter.MinFilter(15))) > 0

R = 85
N = int(sys.argv[2]) if len(sys.argv) > 2 else 3000
SEED_OFFSET = int(sys.argv[3]) if len(sys.argv) > 3 else 0
STEPS = 24
EARS = [dict(side=-1, origin=(375, 362), center=math.radians(-149), cs=1, seed=1611),
        dict(side=1, origin=(649, 361), center=math.radians(-31), cs=-1, seed=1612)]
paths, sides, us, lengths = [], [], [], []
for e in EARS:
    rng = np.random.default_rng(e['seed'] + SEED_OFFSET)
    ox, oy = e['origin']
    c = e['center']
    for k in range(N):
        u = rng.uniform(-1, 1)
        ang = c + u * math.pi / 2
        L = R * (0.45 + 0.55 * (1 - abs(u) ** 1.6)) * rng.uniform(0.7, 1.1)
        dx, dy = math.cos(ang), math.sin(ang)
        reach = 0
        for t in range(1, 400):
            px, py = int(ox + dx * t), int(oy + dy * t)
            if px < 0 or py < 0 or px >= W or py >= H or (t > 14 and not EARHARD[py, px]):
                break
            reach = t
        L = min(L, 0.8 * reach * rng.uniform(0.85, 1.0))
        qx, qy = -math.sin(c), math.cos(c)
        sp = rng.normal(0, 9)
        back = abs(rng.normal(0, 4))
        x = ox + qx * sp - math.cos(c) * back
        y = oy + qy * sp - math.sin(c) * back
        pts = [(x, y)]
        aa = ang
        cv = e['cs'] * rng.uniform(0, 0.35) * u
        for i in range(STEPS - 1):
            aa += cv / (STEPS - 1)
            x += math.cos(aa) * L / (STEPS - 1)
            y += math.sin(aa) * L / (STEPS - 1)
            pts.append((x, y))
        paths.append(pts)
        sides.append(e['side'])
        us.append(u)
        lengths.append(L)
paths = np.array(paths, np.float64)
# target-image pixels to render pixels (the target is render rows 2..667)
paths[..., 1] += 2
np.savez_compressed(sys.argv[1], paths=paths, side=np.array(sides), u=np.array(us), lengthPx=np.array(lengths),
                    origins=np.array([[375, 364], [649, 363]], float))
print('PLANNED', paths.shape, 'length px median/max', np.median(lengths).round(1), np.max(lengths).round(1))
