"""Pure numpy helpers for the R01 head-silhouette round 2 options (no Blender): used by shape_head_silhouette_field.py
and by the silhouette predictor, so a setting can be tried on a vertex array before any build.

All coordinates are head-local (x across, y toward the rear, z up). Fig-frame conversion: x_fig = x/3.721,
z_local = .537 - 3.721 y_fig.

  cut_distance(X, Y, Z, cfg)   an approximate signed distance (negative inside) of the region to REMOVE below the ear
                               shelf: material outside the head-base half widths (the notch web under the wings),
                               behind the nape profile, or in front of the chin profile. The field is combined with
                               smax(field, -distance, blend), so the cut leaves a soft fillet, never a ledge.
  rim_lift_dz(x, z, cfg)       smooth lift of the fan's top rim between the crown and the tips (per side), weighted
                               to zero below z0 so the face is untouched.
  front_set_back_dy(x, y, z, cfg)   moves the fan's front surface back beside the crown so the dome stands in front of
                               it. Applied only to the front half (y below cfg['y'][0]..cfg['y'][1] fade).
  crown_lift_dz(x, z, cfg)     a gaussian lift of the crown top (retry of round 2): amp, sx (local), z0 and zf ramp. Lets the crown
                               stand above the inner fan rims after rim_lift.
  rear_valley_dy(x, y, z, cfg) a soft concave valley in the rear surface along the crease where each wing root meets the
                               skull dome (moves only the rear-facing half toward the front).
"""
import numpy as np


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smootherstep(t):
    t = np.clip(t, 0, 1)
    return t*t*t*(t*(t*6-15)+10)


def table(points, z):
    """Piecewise-linear lookup of [[z, value], ...] sorted by z ascending or descending; flat outside the ends."""
    pts = sorted(points, key=lambda p: p[0])
    return np.interp(z, [p[0] for p in pts], [p[1] for p in pts])


def smooth_knots(knots, sigma, a, grid_step=.0005, top=.5):
    g = np.arange(0, top, grid_step)
    f = np.interp(g, [k[0] for k in knots], [k[1] for k in knots])
    n = int(3*sigma/grid_step)
    kernel = np.exp(-.5*((np.arange(-n, n+1)*grid_step)/sigma)**2)
    kernel /= kernel.sum()
    f = np.convolve(np.pad(f, n, mode='edge'), kernel, mode='valid')
    return np.interp(a, g, f)


def cut_distance(X, Y, Z, cfg):
    """Region to remove (negative inside): union of the notch web, the nape and the chin projections."""
    shelf = cfg['shelf_z']
    hb = table(cfg['head_base_half'], Z)
    a = np.maximum(Z-shelf, hb-np.abs(X))
    pieces = [a]
    if cfg.get('nape'):
        yr = table(cfg['nape'], Z)
        pieces.append(np.maximum(Z-cfg['nape_top_z'], yr-Y))
    if cfg.get('chin'):
        yf = table(cfg['chin'], Z)
        pieces.append(Y-yf)
    return np.minimum.reduce(pieces)


def rim_lift_dz(x, z, cfg):
    a = np.abs(x)/cfg.get('fig', 3.721)
    pos = smooth_knots(cfg['pos'], cfg.get('sigma', .012), a)
    neg = smooth_knots(cfg['neg'], cfg.get('sigma', .012), a)
    lift = np.where(x > 0, pos, neg)*cfg.get('fig', 3.721)*cfg.get('scale', 1.0)
    return lift*smoothstep((z-cfg['z'][0])/cfg['z'][1])


def front_set_back_dy(x, y, z, cfg):
    ax = np.abs(x)
    wx = smoothstep((ax-cfg['x'][0])/(cfg['x'][1]-cfg['x'][0]))*(1-smoothstep((ax-cfg['x_out'][0])/(cfg['x_out'][1]-cfg['x_out'][0])))
    wz = smoothstep((z-cfg['z'][0])/cfg['z_fade'])*(1-smoothstep((z-cfg['z'][1])/cfg['z_fade']))
    wy = 1-smoothstep((y-cfg['y'][0])/(cfg['y'][1]-cfg['y'][0]))
    return cfg['depth']*wx*wz*wy


def rear_valley_dy(x, y, z, cfg):
    crease = table(cfg['crease'], z)
    d = (np.abs(x)-crease)/cfg['width']
    groove = np.exp(-d*d)
    wz = smoothstep((z-cfg['z'][0])/cfg['z_fade'][0])*(1-smoothstep((z-cfg['z'][1])/cfg['z_fade'][1]))
    wy = smoothstep((y-cfg['y'][0])/(cfg['y'][1]-cfg['y'][0]))
    return -cfg['depth']*groove*wz*wy


def underside_drop_dz(x, z, cfg):
    """Lower the fan's underside (the bottom `fade` of the wing at each |x|) by a per-side amount, so the wing hangs to the
    sheet's outline. `under` is [[|x| in figure heights, local z of the underside]]; `pos` and `neg` are drops in figure heights."""
    fig = cfg.get('fig', 3.721)
    a = np.abs(x)/fig
    drop = np.where(x > 0, smooth_knots(cfg['pos'], cfg.get('sigma', .012), a), smooth_knots(cfg['neg'], cfg.get('sigma', .012), a))
    under = np.interp(a, [u[0] for u in cfg['under']], [u[1] for u in cfg['under']])
    weight = 1-smoothstep((z-under)/cfg['fade'])
    return -drop*fig*cfg.get('scale', 1.0)*weight


def crown_lift_dz(x, z, cfg):
    """Raise the crown between the ear roots by `amp` (head-local) with a gaussian across x of width `sx`, weighted to zero below
    z0 over `zf`. Keep amp*0.86/sx under 0.3 so no ridge forms."""
    wx = np.exp(-(x/cfg['sx'])**2)
    return cfg['amp']*wx*smoothstep((z-cfg['z0'])/cfg['zf'])
