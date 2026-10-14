"""2D silhouette token derived from the rest-pose mesh: side view, orthographic, facing right.

Pure numpy and the standard library, no GPU. The mesh triangles are rasterized at 2x (1024) into a
coverage mask, box-filtered to 512 for an antialiased alpha, written as an RGBA PNG (transparent
background, solid dark fill), then the 50 percent contour is traced with marching squares and
simplified into ``token.svg``. Input points are glTF space (+Y up, +Z forward).
"""

import struct
import zlib

import numpy as np

SIZE = 512
SS = 2
PAD = 28
FILL = (20, 22, 26)
FILL_HEX = "#14161a"


def rasterize(points, tris, size=SIZE, ss=SS, pad=PAD):
    """Return alpha (float32, size x size, 0..1)."""
    pts = np.asarray(points, dtype=np.float64)
    h = pts[:, 2]          # forward (+Z) runs to the right
    v = pts[:, 1]          # up
    w, ht = h.max() - h.min(), v.max() - v.min()
    scale = (size - 2 * pad) / max(w, ht)
    ox = (size - w * scale) / 2 - h.min() * scale
    oy = (size - ht * scale) / 2 - v.min() * scale
    n = size * ss
    px = (h * scale + ox) * ss
    py = (size - (v * scale + oy)) * ss     # image y runs down
    mask = np.zeros((n, n), dtype=bool)
    for a, b, c in tris:
        xs = (px[a], px[b], px[c])
        ys = (py[a], py[b], py[c])
        x0, x1 = int(max(0, np.floor(min(xs)))), int(min(n - 1, np.ceil(max(xs))))
        y0, y1 = int(max(0, np.floor(min(ys)))), int(min(n - 1, np.ceil(max(ys))))
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        d = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
        if abs(d) < 1e-12:
            continue
        l1 = ((ys[1] - ys[2]) * (gx - xs[2]) + (xs[2] - xs[1]) * (gy - ys[2])) / d
        l2 = ((ys[2] - ys[0]) * (gx - xs[2]) + (xs[0] - xs[2]) * (gy - ys[2])) / d
        l3 = 1 - l1 - l2
        eps = -1e-9
        mask[y0:y1 + 1, x0:x1 + 1] |= (l1 >= eps) & (l2 >= eps) & (l3 >= eps)
    return mask.reshape(size, ss, size, ss).mean(axis=(1, 3)).astype(np.float32)


def write_png(path, alpha):
    """RGBA 8-bit PNG: constant dark fill, straight alpha from coverage."""
    a = np.rint(alpha * 255).astype(np.uint8)
    h, w = a.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = FILL
    rgba[..., 3] = a
    rgba[a == 0, 0:3] = 0
    raw = b"".join(b"\x00" + rgba[y].tobytes() for y in range(h))

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)


def contours(alpha, level=0.5):
    """Marching squares on the alpha field; returns closed loops of (x, y) pixel coordinates."""
    f = np.pad(alpha, 1)
    inside = f >= level

    def interp(x0, y0, x1, y1):
        v0, v1 = float(f[y0, x0]), float(f[y1, x1])
        t = (level - v0) / (v1 - v0) if v1 != v0 else 0.5
        return (round(x0 + (x1 - x0) * t - 1 + 0.5, 3), round(y0 + (y1 - y0) * t - 1 + 0.5, 3))

    adj = {}

    def link(p, q):
        adj.setdefault(p, []).append(q)
        adj.setdefault(q, []).append(p)

    any_in = inside[:-1, :-1] | inside[1:, :-1] | inside[:-1, 1:] | inside[1:, 1:]
    ys, xs = np.nonzero(any_in)
    for y, x in zip(ys.tolist(), xs.tolist()):
        tl, tr, br, bl = bool(inside[y, x]), bool(inside[y, x + 1]), bool(inside[y + 1, x + 1]), bool(inside[y + 1, x])
        code = tl * 8 + tr * 4 + br * 2 + bl
        if code in (0, 15):
            continue
        edge = {"t": (x, y, x + 1, y), "r": (x + 1, y, x + 1, y + 1), "b": (x, y + 1, x + 1, y + 1), "l": (x, y, x, y + 1)}
        segs = {1: ["lb"], 2: ["br"], 3: ["lr"], 4: ["tr"], 5: ["tl", "br"], 6: ["tb"], 7: ["tl"], 8: ["tl"],
                9: ["tb"], 10: ["tr", "lb"], 11: ["tr"], 12: ["lr"], 13: ["br"], 14: ["lb"]}[code]
        for s in segs:
            link(interp(*edge[s[0]]), interp(*edge[s[1]]))
    seen, loops = set(), []
    for start in adj:
        if start in seen:
            continue
        loop, prev, cur = [start], None, start
        seen.add(start)
        while True:
            nxt = next((q for q in adj[cur] if q != prev and q not in seen), None)
            if nxt is None:
                break
            loop.append(nxt)
            seen.add(nxt)
            prev, cur = cur, nxt
        if len(loop) >= 8:
            loops.append(loop)
    return loops


def _dp(seq, eps):
    a, b = seq[0], seq[-1]
    if len(seq) < 3:
        return [tuple(a), tuple(b)]
    ab = b - a
    norm = float(np.hypot(*ab))
    if norm > 0:
        dist = np.abs(ab[0] * (seq[:, 1] - a[1]) - ab[1] * (seq[:, 0] - a[0])) / norm
    else:
        dist = np.hypot(seq[:, 0] - a[0], seq[:, 1] - a[1])
    k = int(np.argmax(dist))
    if dist[k] <= eps:
        return [tuple(a), tuple(b)]
    return _dp(seq[:k + 1], eps)[:-1] + _dp(seq[k:], eps)


def simplify(loop, eps=0.6):
    """Douglas-Peucker on a closed loop, split at the point farthest from the first."""
    pts = np.array(loop)
    j = int(np.argmax(((pts - pts[0]) ** 2).sum(axis=1)))
    first = _dp(pts[:j + 1], eps)
    second = _dp(np.vstack([pts[j:], pts[:1]]), eps)
    return first[:-1] + second[:-1]


def write_svg(path, alpha, size=SIZE):
    loops = [simplify(l) for l in contours(alpha)]
    d = " ".join("M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in l) + " Z" for l in loops)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
           f'<path fill="{FILL_HEX}" fill-rule="evenodd" d="{d}"/></svg>\n')
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    return {"loops": len(loops), "points": sum(len(l) for l in loops)}


def make_token(points, tris, png_path, svg_path):
    alpha = rasterize(points, tris)
    write_png(png_path, alpha)
    stats = write_svg(svg_path, alpha)
    stats["coverage"] = round(float((alpha > 0.5).mean()), 4)
    return stats
