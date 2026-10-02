"""Numpy-only views of a dumped wing field (see r03_dump_field.py): front first-hit depth shading, rear depth, sections.

Head-local frame. S = 3.721 converts figure heights to head-local units. Fit frame: x_fit = x_h/S + .0046, y_fit = (.537 - z_h)/S,
df = (y_h - .04)/S (front negative).
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

S = 3.721
CX = .0046
Z0 = .537
DF0 = .04


def load(dump, side):
    info = json.loads((Path(dump)/'wings.json').read_text())
    arr = np.load(Path(dump)/f'field{side}.npy')
    return arr, np.array(info[side]['lo']), info['voxel']


def first_hit(field, from_front=True):
    """Index of the first inside voxel along +y (front) or -y (rear) for every (x, z); -1 where empty."""
    inside = field < 0
    has = inside.any(axis=1)
    if from_front:
        k = inside.argmax(axis=1)
    else:
        k = inside.shape[1]-1-inside[:, ::-1, :].argmax(axis=1)
    return np.where(has, k, -1)


def depth_df(field, lo, vs, from_front=True):
    k = first_hit(field, from_front)
    y_h = (lo[1]+k)*vs
    df = (y_h-DF0)/S
    return np.where(k >= 0, df, np.nan)


def shade(depth, vs, light=(-.4, -.5, .75), base=None):
    """Lambert shading from the depth map (df units); x right, z down in the image."""
    d = np.nan_to_num(depth, nan=np.nanmax(depth))*S    # head-local y
    gx = np.gradient(d, vs, axis=0)
    gz = np.gradient(d, vs, axis=1)
    n = np.stack([gx, np.ones_like(gx)*-1, gz], axis=-1)       # surface y = f(x, z): normal ~ (fx, -1, fz) pointing to -y
    n = n/np.linalg.norm(n, axis=-1, keepdims=True)
    l = np.array(light, float)
    l = l/np.linalg.norm(l)
    v = np.clip((n*[l[0], l[1], l[2]]).sum(axis=-1), 0, 1)
    return v


def front_image(field, lo, vs, scale=2, tuft=None, light=(-.45, -.55, .70), ao=0.):
    """RGB image of the front first-hit surface with sub-voxel depth (columns x ascending, rows z descending)."""
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    import fan_clumps_front as fc

    class W:
        pass
    w = W()
    w.Y = ((lo[1]+np.arange(field.shape[1]))*vs).astype(np.float32)
    w.vs = vs
    yfront, _ = fc.surfaces(field, w)
    sh = shade((yfront-DF0)/S, vs, light)
    if ao:
        valid = ~np.isnan(yfront)
        dd = np.where(valid, yfront, np.nanmax(yfront))
        for rr in (6, 14):
            bl = fc.blur_masked(dd, np.ones_like(valid), rr, passes=2)
            sh = sh*(1-np.clip((bl-dd)*ao/rr*6, 0, .6)/2)
    img = np.where(np.isnan(yfront), 1.0, .22+.78*sh)
    img = np.repeat(img[:, :, None], 3, axis=2)
    if tuft is not None:
        img[tuft] = img[tuft]*.35+np.array([1, .88, .35])*.65
    im = np.transpose(img, (1, 0, 2))[::-1]
    out = Image.fromarray((np.clip(im, 0, 1)*255).astype(np.uint8))
    return out.resize((out.width*scale, out.height*scale), Image.BICUBIC) if scale != 1 else out


def silhouette_fit(field, lo, vs, grid=500):
    """Front silhouette of a wing crop in the fit frame: boolean (grid, grid) with only the crop's pixels set, and a validity mask."""
    c = np.arange(grid)
    r = np.arange(grid)
    xh = S*((c-grid/2)/grid-CX)
    zh = Z0-S*(r/grid)
    i = np.round(xh/vs).astype(int)-lo[0]
    k = np.round(zh/vs).astype(int)-lo[2]
    okc = (i >= 0) & (i < field.shape[0])
    okr = (k >= 0) & (k < field.shape[2])
    sil = (field < 0).any(axis=1)
    out = np.zeros((grid, grid), bool)
    valid = np.zeros((grid, grid), bool)
    ii, kk = np.meshgrid(np.clip(i, 0, field.shape[0]-1), np.clip(k, 0, field.shape[2]-1), indexing='xy')
    # rows are r (z), columns are c (x)
    out = sil[ii, kk]
    valid = (okc[None, :] & okr[:, None])
    return out & valid, valid


def fan_stats(fields, env_mask, band_rows=120, u_min=.085):
    """Missing and extra area of the fan silhouette against the sheet, within the wing zone (u >= u_min), as fractions of the head
    band's reference area (the fit's normalisation). fields: dict side -> (field, lo, vs)."""
    ref_area = env_mask[:band_rows].sum()
    miss = extra = 0
    for side, (f, lo, vs) in fields.items():
        sil, valid = silhouette_fit(f, lo, vs)
        c = np.arange(500)
        u = np.abs((c-250)/500-CX)
        zone = valid & (u[None, :] >= u_min) & (np.arange(500)[:, None] < band_rows)
        if side == 'L':
            zone &= ((c-250)/500-CX > 0)[None, :]
        else:
            zone &= ((c-250)/500-CX < 0)[None, :]
        miss += (env_mask & ~sil & zone).sum()
        extra += (sil & ~env_mask & zone).sum()
    return {'missing': round(float(miss/ref_area), 4), 'extra': round(float(extra/ref_area), 4)}
