"""Make art/species-construction/specs/r03_envelope.npz: the first sheet's front fan envelope in the fit frame (R03 clump volume).

Run: python art/species-construction/loop/r03_envelope.py
Arrays are 500 x 500 over the fit frame (column c is x = (c - 250) / 500, row r is y = r / 500, figure heights):
  mask         the sheet's front figure mask (loop_tools.canonical of the reference figure)
  sdf          signed distance to its outline in figure heights (negative inside)
  sdf_closed   the same after closing the mask with a disk of radius .010 (notches narrower than .020 filled)
The clump tool only needs numpy, so the distance transforms are made here (scipy) and stored.
"""
from pathlib import Path
import sys

import numpy as np
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loop_tools as lt  # noqa: E402

N = lt.FIT_GRID
mask = lt.canonical(lt.reference_figure('front'))
r = int(round(.010*N))
yy, xx = np.mgrid[-r:r+1, -r:r+1]
disk = (xx**2+yy**2) <= r*r
closed = ndimage.binary_closing(np.pad(mask, r+2), structure=disk)[r+2:-(r+2), r+2:-(r+2)] | mask


def sdf(m):
    inside = ndimage.distance_transform_edt(m)
    outside = ndimage.distance_transform_edt(~m)
    return ((outside-inside)/N).astype(np.float32)


out = Path(lt.ROOT)/'art/species-construction/specs/r03_envelope.npz'
np.savez_compressed(out, mask=mask, sdf=sdf(mask), sdf_closed=sdf(closed), grid=np.array([N]))
print(out, mask.sum(), closed.sum())
