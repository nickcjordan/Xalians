"""spiral: a tapered horn or tusk with helical ridges (a unicorn horn, a narwhal tusk, a twisted shell spire).

params:
    base      [x, y, z]: the axis start (put it inside the body so the horn is rooted, see embed)
    tip       [x, y, z]: the axis end (the very tip of the horn)
    profile   [[t, r], ...]: the core radius along the axis, t from 0 (base) to 1 (tip), linear between points;
              the last point is the tip's rounding radius (it should be small, a few millimeters)
    turns     how many full turns each ridge makes from base to tip (default 4.5)
    ridges    how many ridges run side by side (1 = one strand coiled like a soft-serve swirl; default 1)
    depth     ridge height as a fraction of the core radius (default 0.16): the surface radius is
              r(t) * (1 + depth * (2 g - 1)), g = ((1 + cos(ridges * angle - handedness * 2 pi * turns * t
              - phase)) / 2) ** groove
    groove    ridge shape exponent (default 1: a plain sine; below 1 the ridge tops broaden and the grooves between
              turns narrow to V cuts, like a strand coiled tight around a cone)
    handed    "right" (default, the ridge climbs counterclockwise seen from the tip) or "left"
    phase     degrees (default 0), turns the ridges about the axis
    embed     meters the solid continues below the base along the axis at the base radius (default 0.0)

Distance is the radial gap divided by the gradient norm of the ridged radius, a close bound near the surface,
so the field meshes cleanly at the studio voxel size. The tip is a sphere of the last profile radius.
"""
import numpy as np

from .common import unit


def _frame(params):
    base = np.asarray(params['base'], float)
    tip = np.asarray(params['tip'], float)
    axis = tip-base
    length = float(np.linalg.norm(axis))
    if length < 1e-6:
        raise ValueError('spiral base and tip coincide')
    u = axis/length
    ref = np.array([1.0, 0, 0]) if abs(u[0]) < 0.9 else np.array([0, 1.0, 0])
    e1 = unit(ref-np.dot(ref, u)*u)
    e2 = np.cross(u, e1)
    return base, u, e1, e2, length


def _profile(params):
    prof = np.asarray(params['profile'], float)
    if prof.ndim != 2 or prof.shape[1] != 2 or len(prof) < 2:
        raise ValueError('spiral profile must be [[t, r], ...] with at least two points')
    if np.any(np.diff(prof[:, 0]) <= 0) or prof[0, 0] != 0 or prof[-1, 0] != 1:
        raise ValueError('spiral profile t must rise from 0 to 1')
    if np.any(prof[:, 1] <= 0):
        raise ValueError('spiral profile radii must be positive')
    return prof


def sdf(params, pts):
    pts = np.asarray(pts, float)
    base, u, e1, e2, length = _frame(params)
    prof = _profile(params)
    turns = float(params.get('turns', 4.5))
    ridges = int(params.get('ridges', 1))
    depth = float(params.get('depth', 0.16))
    hand = -1.0 if params.get('handed', 'right') == 'left' else 1.0
    phase = np.radians(float(params.get('phase', 0.0)))
    embed = float(params.get('embed', 0.0))
    rel = pts-base
    z = rel@u
    q = rel-np.outer(z, u)
    rho = np.linalg.norm(q, axis=1)
    theta = np.arctan2(q@e2, q@e1)
    t = np.clip(z/length, 0.0, 1.0)
    r = np.interp(t, prof[:, 0], prof[:, 1])
    dr_dt = np.interp(t, prof[:, 0][1:]-1e-9, np.diff(prof[:, 1])/np.diff(prof[:, 0])) if len(prof) > 2 else \
        np.full_like(t, (prof[1, 1]-prof[0, 1]))
    # the ridges fade out over the last tenth so the tip is a clean rounded point
    fade = np.clip((1.0-t)/0.1, 0.0, 1.0)
    groove = float(params.get('groove', 1.0))
    arg = ridges*theta-hand*2*np.pi*turns*t-phase
    c = np.clip((1.0+np.cos(arg))/2, 1e-3, 1.0)
    g = c**groove
    dg = groove*c**(groove-1)*(-np.sin(arg)/2)          # d g / d arg
    m = 1.0+depth*fade*(2*g-1)
    R = r*m
    dR_dtheta = r*depth*fade*2*dg*ridges
    dR_dz = (dr_dt*m-r*depth*fade*2*dg*hand*2*np.pi*turns)/length
    grad = np.sqrt(1.0+(dR_dtheta/np.maximum(rho, 1e-4))**2+dR_dz**2)
    lateral = (rho-R)/grad
    # caps: below the base the solid continues for `embed` at the base radius; above the tip it ends in a sphere
    below = -(z+embed)
    tip_r = prof[-1, 1]
    tip_c = base+u*(length-tip_r)
    sphere = np.linalg.norm(pts-tip_c, axis=1)-tip_r
    body = np.maximum(np.maximum(lateral, below), z-(length-tip_r))
    return np.minimum(body, sphere)


def bounds(params):
    base, u, e1, e2, length = _frame(params)
    prof = _profile(params)
    rmax = float(prof[:, 1].max())*(1.0+float(params.get('depth', 0.16)))
    embed = float(params.get('embed', 0.0))
    ends = np.array([base-u*embed, base+u*length])
    return ends.min(axis=0)-rmax, ends.max(axis=0)+rmax
