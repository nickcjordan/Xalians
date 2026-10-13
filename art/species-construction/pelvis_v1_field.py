"""Pelvis v1 (numpy only): the crotch, inner thighs, inguinal creases, lower thighs above the knee, buttocks, cleft and gluteal fold.

World units, +y toward the back, z up. Every edit is a function of position on the joined skin's signed distance S (positive
outside), never of a vertex index, so the step chains after whatever tails, body and feet steps run before it.

Measured cause (assembled-3188, recipe-feet-v2):
  crotch     the inner thigh walls run almost straight down from a round arch at the groin (z -.22) to z -.32 (slope about
             .37), then flare outward fast (about .75) to z -.42 and turn vertical at the knee: in a frontal section the skin
             crosses from one inner thigh to the other as one continuous U, so the thighs read as a web, not as two round limbs;
  lower thigh the thigh holds its width (.185) to z -.34, then narrows to .12 by z -.46 and is narrower there than the knee and
             calf below: a convex corner at z -.34 and a concave one at -.44 on the inner side, and a matching pinch on the
             outer side under the hip warp's fade (x .280 at -.40 to .272 at -.48). The body B slimming moved this part by
             at most .003 (3186 against 3188), so the corners predate it; the old muscle bulges had hidden them.
  rump       behind the hips the back is nearly flat (y .05 to .06 from x .10 to .20) and runs straight into the backs of the
             thighs with no fold; the cleft walls are the remains of the old tail carve.

Field composition (spec keys in brackets; every mass is mirrored to both sides):
  E  = S + erode                   [erode] the old rump eroded a little under the buttocks, so their round surface wins
  F0 = smin3(E, glutes, k)         [glutes] two round buttocks joined to each other with a small radius (the cleft), then to
                                   the body with a larger one; they sit above the crotch and over the backs of the thighs
       smin3(F0, capsule, k)       [capsules] an elliptic tapered capsule along each inner thigh, from the groin to above the
                                   knee: it adds only where it stands proud of the old skin (the U walls between the thighs),
                                   so each inner thigh rounds into the groin as its own limb; the outer silhouette is S
  F1 = F0 + wz (blurz(F0) - F0)    [blurZ] a Gaussian along z only, over the lower thigh: averages the radius profile, so the
                                   corners above the knee round off (a straight or tilted tube is unchanged by it)
  F1 = F1 + wb (blur(F1) - F1)     [blurs] masked isotropic blur on the backs of the thighs under the buttocks
  F2 = F1 + grooves                [grooves] shallow Gaussian grooves along authored curves: the inguinal crease from the crotch
                                   up and out to the front of the hip, and the gluteal fold under each buttock
  F  = S + w (F2 - S)              [partBox, tailGuard] w is the part box times (1 - tail guard): the guard is found from the
                                   field (thin tubes = tails, dilated) plus a sphere around the tail attachment, so the tails
                                   and their attachment patch keep their skin exactly; outside w the field is S exactly
  [tube] an older option (horizontal elliptic thigh sections fitted to the input) is kept but not used by pelvis-v1.json.
"""
import numpy as np

from neck_v1_field import natural_spline, smootherstep, smin3, grid_coords


def leg_table(V, zs, side, xmin=.0, xmax=.30, ymax=.12, tol=.0015):
    """Per height: inner and outer x and front and back y of the leg section on one side, from vertices in a thin slab."""
    out = []
    for z in zs:
        b = V[np.abs(V[:, 2]-z) < tol]
        q = b[(side*b[:, 0] > xmin) & (side*b[:, 0] < xmax) & (b[:, 1] < ymax)]
        if len(q) < 10:
            out.append([np.nan]*4)
            continue
        ax = side*q[:, 0]
        out.append([ax.min(), ax.max(), q[:, 1].min(), q[:, 1].max()])
    return np.array(out)


def smooth_along(a, cells):
    rad = int(np.ceil(3*cells))
    k = np.exp(-0.5*(np.arange(-rad, rad+1)/cells)**2)
    k /= k.sum()
    out = a.copy()
    for c in range(a.shape[1]):
        col = a[:, c]
        ok = ~np.isnan(col)
        col = np.interp(np.arange(len(col)), np.where(ok)[0], col[ok])
        out[:, c] = np.convolve(np.pad(col, rad, mode='edge'), k, 'valid')
    return out


def tube_rows(V, spec, side):
    """The thigh tube's section table for one side: z, inner x, outer x, front y, back y (|x| for the side)."""
    T = spec['tube']
    zs = np.arange(T['zRange'][0], T['zRange'][1]-1e-9, -T['zStep'])
    m = smooth_along(leg_table(V, zs, side), T['smoothCells'])
    inner = natural_spline(*zip(*sorted(T['inner'])))(zs)
    outer = m[:, 1]-T['margin']
    front = m[:, 2]+T['margin']
    back = np.minimum(m[:, 3]-T['margin'], np.interp(zs, *zip(*sorted(T['backMax']))))
    return np.stack([zs, inner, outer, front, back], 1), m


def tube_field(X, Y, Z, rows, side, spec):
    """Approximate signed distance of the tube: horizontal ellipse sections (a superellipse with exponent p), capped at the
    top and bottom with smooth ends."""
    T = spec['tube']
    zs = rows[::-1, 0]
    f = [np.interp(Z, zs, rows[::-1, i]) for i in range(1, 5)]
    xin, xout, yf, yb = f
    cx, ax = (xin+xout)/2, np.maximum((xout-xin)/2, 1e-3)
    cy, ay = (yf+yb)/2, np.maximum((yb-yf)/2, 1e-3)
    p = float(T.get('exponent', 2.0))
    u = np.abs(side*X-cx)/ax
    v = np.abs(Y-cy)/ay
    e = (u**p+v**p)**(1/p)
    D = (e-1)*np.minimum(ax, ay)
    top, bot = T['cap']
    D = np.maximum(D, Z-top)
    D = np.maximum(D, bot-Z)
    return D


def capsule_field(X, Y, Z, m, side):
    """Approximate signed distance of a tapered capsule from a (radius ra) to b (radius rb), mirrored to the side."""
    a = np.array(m['a'], float)*np.array([side, 1, 1])
    b = np.array(m['b'], float)*np.array([side, 1, 1])
    sy = float(m.get('ySquash', 1.0))     # below 1: the section is wider front to back than across (an elliptic capsule)
    ab = b-a
    abq = ab*np.array([1, sy, 1])
    L2 = abq@abq
    Yq = (Y-a[1])*sy
    t = np.clip(((X-a[0])*abq[0]+Yq*abq[1]+(Z-a[2])*abq[2])/L2, 0, 1)
    d = np.sqrt((X-a[0]-t*abq[0])**2+(Yq-t*abq[1])**2+(Z-a[2]-t*abq[2])**2)
    return d-(m['ra']+t*(m['rb']-m['ra']))


def polyline_distance(P, pts):
    """Distance from points P (n,3) to a polyline; also the arc-length fraction of the nearest point."""
    pts = np.asarray(pts, float)
    best = np.full(len(P), np.inf)
    frac = np.zeros(len(P))
    L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    for i in range(len(pts)-1):
        a, b = pts[i], pts[i+1]
        ab = b-a
        t = np.clip(((P-a)@ab)/max(ab@ab, 1e-12), 0, 1)
        d = np.linalg.norm(P-(a+t[:, None]*ab), axis=1)
        sel = d < best
        best[sel] = d[sel]
        frac[sel] = (L[i]+t[sel]*np.linalg.norm(ab))/L[-1]
    return best, frac


def blur_z(F, sigma_cells):
    rad = int(np.ceil(3*sigma_cells))
    k = np.exp(-0.5*(np.arange(-rad, rad+1)/sigma_cells)**2)
    k /= k.sum()
    q = np.pad(F, [(0, 0), (0, 0), (rad, rad)], mode='edge')
    acc = np.zeros_like(F)
    for j, kv in enumerate(k):
        acc += kv*q[:, :, j:j+F.shape[2]]
    return acc


def box_weight(X, Y, Z, box):
    """Smootherstep box: box = {x: [a,b,c,d] on |x|, y: [...], z: [...]} each a band (in a..b, out c..d)."""
    w = np.ones_like(X)
    for v, key in ((np.abs(X), 'x'), (Y, 'y'), (Z, 'z')):
        if key in box:
            a, b, c, d = box[key]
            w = w*smootherstep((v-a)/max(b-a, 1e-9))*smootherstep((d-v)/max(d-c, 1e-9))
    return w


def compose(S, lo, step, V, spec, log=print):
    X, Y, Z = grid_coords(lo, step, S.shape)
    rec = {}
    F0 = S
    for er in spec.get('erode', []):
        e = np.sqrt(((X-er['c'][0])/er['s'][0])**2+((Y-er['c'][1])/er['s'][1])**2+((Z-er['c'][2])/er['s'][2])**2)
        F0 = F0+er['depth']*smootherstep((er['fade'][1]-e)/(er['fade'][1]-er['fade'][0]))
    g = spec.get('groin')
    if g:
        e = np.sqrt(((X-g['c'][0])/g['s'][0])**2+((Y-g['c'][1])/g['s'][1])**2+((Z-g['c'][2])/g['s'][2])**2)
        F0 = smin3(F0, (e-1)*min(g['s']), g['k'])
    for m in spec.get('lobes', []):
        for side in (1, -1):
            c = np.array(m['c'])*np.array([side, 1, 1])
            e = np.sqrt(((X-c[0])/m['s'][0])**2+((Y-c[1])/m['s'][1])**2+((Z-c[2])/m['s'][2])**2)
            F0 = smin3(F0, (e-1)*min(m['s']), m['k'])
    gl = spec.get('glutes')
    if gl:
        # two round buttocks: joined to each other with a small radius (the cleft), then to the body with a larger one
        parts = []
        for side in (1, -1):
            c = np.array(gl['c'])*np.array([side, 1, 1])
            e = np.sqrt(((X-c[0])/gl['s'][0])**2+((Y-c[1])/gl['s'][1])**2+((Z-c[2])/gl['s'][2])**2)
            parts.append((e-1)*min(gl['s']))
        G = smin3(parts[0], parts[1], gl['cleftK'])
        F0 = smin3(F0, G, gl['k'])
    for m in spec.get('capsules', []):
        for side in (1, -1):
            F0 = smin3(F0, capsule_field(X, Y, Z, m, side), m['k'])
    for side in ((1, -1) if 'tube' in spec else ()):
        rows, meas = tube_rows(V, spec, side)
        rec[f'tube{"+" if side > 0 else "-"}'] = {'rows': rows.round(4).tolist(), 'measured': meas.round(4).tolist()}
        Tf = tube_field(X, Y, Z, rows, side, spec)
        F0 = smin3(F0, Tf, spec['tube']['k'])
    log('tubes joined')
    F1 = F0
    bz = spec.get('blurZ')
    if bz:
        wb = box_weight(X, Y, Z, bz['box'])
        for pr in bz.get('protect', []):
            for side in (1, -1):
                c = np.array(pr['c'])*np.array([side, 1, 1])
                e = np.sqrt(((X-c[0])/pr['s'][0])**2+((Y-c[1])/pr['s'][1])**2+((Z-c[2])/pr['s'][2])**2)
                wb = wb*(1-smootherstep((pr['fade'][1]-e)/(pr['fade'][1]-pr['fade'][0])))
        F1 = F0+wb*(blur_z(F0, bz['sigma']/step)-F0)
        log('lower thigh blurred along z')
    for bl in spec.get('blurs', []):
        from neck_v1_field import gaussian_blur3
        Fb = gaussian_blur3(F1, bl['sigma']/step)
        wb = np.zeros_like(F1)
        for side in ((1, -1) if bl.get('mirror', True) else (1,)):
            c = np.array(bl['c'])*np.array([side, 1, 1])
            e = np.sqrt(((X-c[0])/bl['s'][0])**2+((Y-c[1])/bl['s'][1])**2+((Z-c[2])/bl['s'][2])**2)
            wb = np.maximum(wb, smootherstep((bl['fade'][1]-e)/(bl['fade'][1]-bl['fade'][0])))
        F1 = F1+wb*(Fb-F1)
        log('masked blur')
    F2 = F1
    for g in spec.get('grooves', []):
        for side in (1, -1):
            pts = np.array(g['points'], float)*np.array([side, 1, 1])
            P = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)
            d, fr = polyline_distance(P, pts)
            amp = np.interp(fr, *zip(*g['depthAlong']))
            F2 = F2+(g['depth']*amp*np.exp(-(d/g['sigma'])**2)).reshape(X.shape)
    for m in spec.get('swells', []):
        for side in (1, -1):
            c = np.array(m['c'])*np.array([side, 1, 1])
            e = np.sqrt(((X-c[0])/m['s'][0])**2+((Y-c[1])/m['s'][1])**2+((Z-c[2])/m['s'][2])**2)
            F2 = F2-m['height']*np.exp(-e**2)
    w = box_weight(X, Y, Z, spec['partBox'])
    tg = spec.get('tailGuard')
    if tg:
        guard = tail_guard(S, X, Y, Z, step, tg)
        w = w*(1-guard)
        rec['tailGuardCells'] = int((guard > 0.5).sum())
    F = S+w*(F2-S)
    return F, w, rec


def max_filter(a, r):
    out = a.copy()
    for ax in range(3):
        b = out.copy()
        for k in range(1, r+1):
            s1 = [slice(None)]*3
            s2 = [slice(None)]*3
            s1[ax] = slice(k, None)
            s2[ax] = slice(None, -k)
            b[tuple(s1)] = np.maximum(b[tuple(s1)], out[tuple(s2)])
            b[tuple(s2)] = np.maximum(b[tuple(s2)], out[tuple(s1)])
        out = b
    return out


def tail_guard(S, X, Y, Z, step, tg):
    """1 on and around the tails and their attachment patch, 0 elsewhere, from the field alone (no vertex indices):
    a tail is skin whose deepest interior point within `window` is shallower than `thin` (a thin tube; the thighs,
    buttocks and trunk are all thicker), dilated by `dilate`; the attachment patch is a sphere of radius `discR` around
    `base` (faded out to discR + discFade). Tails are only looked for behind y `behindY`."""
    D = np.maximum(-S, 0)
    M = max_filter(D, int(round(tg['window']/step)))
    thin = (S < tg.get('shell', .004)) & (M < tg['thin']) & (Y > tg.get('behindY', -1.0))
    g = max_filter(thin.astype(float), int(round(tg['dilate']/step)))
    from neck_v1_field import gaussian_blur3
    g = np.clip(gaussian_blur3(g, tg['dilate']/step/2)*1.5, 0, 1)
    b = np.array(tg['base'], float)
    r = np.sqrt((X-b[0])**2+(Y-b[1])**2+(Z-b[2])**2)
    disc = smootherstep((tg['discR']+tg['discFade']-r)/tg['discFade'])
    return np.maximum(g, disc)
