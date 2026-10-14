"""Horn centerline as a heading-integrated curve (numpy only, usable inside and outside Blender).

Left horn (+X). Heading alpha turns in the side plane from up (0) through back (90) to down (180+); beta is the
outward lean (positive away from the midline, negative turns the tip inward). Both follow power-law ramps along
the arc so the curl tightens toward the tip, as a spiral horn does.
"""

import numpy as np

DEFAULT = dict(
    base=(0.021, -0.214, 0.612),
    length=0.427,
    a0=-25.0, a1=211.6, ap=0.843,
    b0=5.1, bm=39.9, bs=0.357, b1=-34.4,
)


def centerline(p=None, n=400):
    q = dict(DEFAULT)
    if p:
        q.update(p)
    s = np.linspace(0.0, 1.0, n)
    a = np.radians(q["a0"] + (q["a1"] - q["a0"]) * s ** q["ap"])
    if "bm" in q:
        b = np.radians(np.interp(s, [0.0, q["bs"], 1.0], [q["b0"], q["bm"], q["b1"]]))
    else:
        b = np.radians(q["b0"] + (q["b1"] - q["b0"]) * s ** q["bp"])
    t = np.stack([np.sin(b), np.cos(b) * np.sin(a), np.cos(b) * np.cos(a)], 1)
    ds = q["length"] / (n - 1)
    pts = np.vstack([np.zeros(3), np.cumsum(t[:-1] * ds, 0)]) + np.array(q["base"])
    return pts, t, s


def landmarks(pts):
    top = pts[np.argmax(pts[:, 2])]
    return dict(top=top, tip=pts[-1], maxX=float(pts[:, 0].max()))


def fit(target_top, target_tip, target_maxx, tip_dir=None, seed=1, iters=6000, base_x_max=None):
    rng = np.random.default_rng(seed)
    keys = ["length", "a0", "a1", "ap", "b0", "bm", "bs", "b1"]
    lo = dict(length=0.30, a0=-25, a1=180, ap=0.8, b0=0, bm=25, bs=0.3, b1=-35)
    hi = dict(length=0.50, a0=15, a1=212, ap=2.2, b0=15, bm=65, bs=0.7, b1=-5)
    best, bestp = 1e9, None

    def cost(p):
        pts, t, _ = centerline(p, 200)
        L = landmarks(pts)
        d = 0.0 if tip_dir is None else 0.03 * np.linalg.norm(t[-1] - tip_dir)
        return d + (np.linalg.norm(L["top"] - target_top) + 1.5 * np.linalg.norm(L["tip"] - target_tip)
                + abs(L["maxX"] - target_maxx))

    for i in range(iters):
        if bestp is None or i < iters // 3:
            p = {k: rng.uniform(lo[k], hi[k]) for k in keys}
        else:
            p = {k: np.clip(bestp[k] + rng.normal(0, 0.04 * (hi[k] - lo[k])), lo[k], hi[k]) for k in keys}
        c = cost(p)
        if c < best:
            best, bestp = c, p
    return bestp, best
