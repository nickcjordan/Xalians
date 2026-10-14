"""Arms v2 (numpy only): arms v1's retapered tube with new masses (upper arm as full as the forearm top) and elbow landmarks.

Anatomy review 2026-10-13, finding 5 (measured on assembled-3205): the upper arm is thinnest under the shoulder (mean radius
.032 at z .20, .034 at .17) and widens steadily to .045 just below the elbow (z .06), then tapers to .031 at the wrist, so the
arm reads as a thin upper arm on a club forearm; there is no elbow landmark (no point behind, no crease in front).

  rebuild_arm     arms_v1_field.rebuild_arm with this spec's taper rows: the vertex is placed on the smoothed, retapered tube
                  (radius smoothed along the bone axis, rescaled to the authored taper), faded in below the shoulder and out
                  above the wrist, so the shoulder (approved) and the wrist and hand (held) keep their skin
  landmarks       radial offsets added on top, each a Gaussian in world z (c, sz) times a lobe around the arm toward a world
                  direction (dir: +y is the back, -y the front; width: exp(-(1 - cos)/width)): the olecranon point behind the
                  elbow (positive amp) and a soft crease in front of it (negative amp)
"""
import numpy as np

import arms_v1_field as af


def rebuild_arm(V, side, spec, log=print):
    idx, newP, rec = af.rebuild_arm(V, side, spec, log=log)
    P0 = V[idx]
    C = np.array(rec['axisPoints'])
    s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(C, axis=0), axis=1))]
    Cf = np.stack([np.interp(np.linspace(0, s[-1], 2000), s, C[:, k]) for k in range(3)], 1)
    sf = np.linspace(0, s[-1], 2000)
    _sp, Q, _T, _r = af.project(newP, Cf, sf)
    D = newP-Q
    r = np.linalg.norm(D, axis=1)
    radial = D/np.maximum(r, 1e-9)[:, None]
    add = np.zeros(len(idx))
    for lm in spec.get('landmarks', []):
        d = np.array(lm['dir'], float)
        d /= np.linalg.norm(d)
        cosv = radial@d
        lobe = np.exp(-(1-cosv)/lm['width'])
        gz = np.exp(-((P0[:, 2]-lm['c'])/lm['sz'])**2)
        add += lm['amp']*gz*lobe
    newP = newP+add[:, None]*radial
    rec['landmarkMax'] = float(add.max()) if len(add) else 0.0
    rec['landmarkMin'] = float(add.min()) if len(add) else 0.0
    return idx, newP, rec


relax = af.relax
local_smooth = af.local_smooth
