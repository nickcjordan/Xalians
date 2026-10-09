"""Flat swatch of the tiger stripe function over the trunk's unrolled coordinates.

x: angle around the body, left belly -> back midline (center) -> right belly
y: height in row periods. Mirrors the shader in render_surface.py (pattern kind 'tiger3'); tune here first.
Each half-row stripe starts thick at the spine and tapers to a point toward the belly; even rows start at the spine
(the two sides meet in a downward chevron), odd rows start a little off it and have a short partner pointing up from the belly.
  python art/species-construction/surface/stripe_swatch.py <out.png>
"""
import sys
import numpy as np
from PIL import Image

P = dict(hw=0.4, power=1.25, chev=0.42, chevMax=1.7, lenMin=1.5, lenMax=3.0, offMin=0.35, offMax=0.7,
         double=0.25, dgap=0.2, dwidth=0.5, bend=0.1, partner=0.8, partnerMin=0.7, partnerMax=1.2, mw=None)


def sm(x, a, b):
    t = np.clip((x-a)/(b-a), 0, 1)
    return t*t*(3-2*t)


def hash3(a, b, c):
    out = []
    for k in range(4):
        x = np.sin((a+7.1*k)*127.1+(b+3.3*k)*311.7+c*74.7+k*19.19)*43758.5453
        out.append(x-np.floor(x))
    return np.array(out)


def row_stripe(a, side, h, row, p):
    """Stripe coverage of one row (row is an integer array); the band centre shears up away from the spine (chevron)."""
    shear = p['chev']*np.minimum(a, p['chevMax'])
    vrel = h-(row+0.5)-shear          # distance from the row's centre line, in row periods
    odd = np.mod(row, 2)
    R, G, B, R2 = hash3(row*0.37+1.3+side*5.1, 0.9+side*3.3, 0.7)
    s0 = odd*(p['offMin']+R2*(p['offMax']-p['offMin']))
    L = p['lenMin']+R*(p['lenMax']-p['lenMin'])
    u = (a-s0)/L
    valid = sm(u, -0.02, 0.0)*(1-sm(u, 0.98, 1.0))
    wvar = 0.85+0.3*G
    hw = p['hw']*wvar*np.clip(1-u, 0, 1)**p['power']*valid*sm(a-s0, 0.0, 0.45)
    if p['mw'] is not None:
        hw = hw*p['mw']
    c = p['bend']*np.sin(np.pi*np.clip(u, 0, 1))*(2*G-1)-0.1*np.clip(u, 0, 1)
    dbl = (B < p['double']).astype(float)
    ramp = sm(u, 0.12, 0.6)
    delta = p['dgap']*ramp*dbl
    main_w = hw*(1-dbl*ramp)
    br_w = hw*p['dwidth']*dbl*ramp

    def S(off, w):
        d = np.abs(vrel-c-off)
        return (1-sm(d, w*0.9, w*1.0+0.006))*sm(w, 0.012, 0.04)
    f = np.maximum(S(0, main_w), np.maximum(S(delta, br_w), S(-delta, br_w)))
    Lb = p['partnerMin']+R2*(p['partnerMax']-p['partnerMin'])
    ub = (np.pi-a)/Lb
    vb = sm(ub, -0.02, 0.0)*(1-sm(ub, 0.98, 1.0))
    wb = p['hw']*p['partner']*wvar*np.clip(1-ub, 0, 1)**p['power']*vb*odd
    if p['mw'] is not None:
        wb = wb*p['mw']
    return np.maximum(f, S(0, wb))


def stripe_value(a, side, h, p=P):
    base = np.floor(h)
    return np.maximum(row_stripe(a, side, h, base-1, p), np.maximum(row_stripe(a, side, h, base, p), row_stripe(a, side, h, base+1, p)))


def swatch(W=1400, H=900, rows=10.0, p=P):
    th = np.linspace(-np.pi, np.pi, W)[None, :].repeat(H, 0)
    h = np.linspace(rows, 0, H)[:, None].repeat(W, 1)
    a = np.abs(th)
    side = (th > 0).astype(float)
    f = stripe_value(a, side, h, p)
    white = np.array([248, 250, 253], float)
    blue = np.array([147, 196, 232], float)
    img = white[None, None, :]*(1-f[..., None])+blue[None, None, :]*f[..., None]
    return img.astype(np.uint8)


if __name__ == '__main__':
    Image.fromarray(swatch()).save(sys.argv[1])
