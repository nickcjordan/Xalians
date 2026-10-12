"""Shared helpers for the reader pack and the surface statistics: which detail render sits in which
packet image, the cell layout of the packet's contact sheets, and the projection of a region's zone
(species.json zones) into a detail camera's pixels. Reads loop_tools; changes nothing in it."""
import json
from pathlib import Path

import numpy as np
from PIL import Image

import loop_tools as lt

CELL, LABEL = 420, 22   # labelled_grid in loop_tools: 420 px cells under a 22 px label strip

# Packet image -> (columns, [(detail set, detail name), ...]) exactly as cmd_packet builds it.
PACKET_CELLS = {
    'm04': (4, [('head', n) for n in ['head-front', 'head-back', 'head-top', 'head-side']]),
    'm05': (3, [('face', n) for n in ['nose-front', 'nose-profile', 'nose-below', 'eyes-front',
                                      'head-three-quarter', 'head-rear-oblique']]),
    'm06': (3, [('neck', n) for n in ['neck-front', 'neck-profile', 'neck-rear', 'shoulders-front']]
            + [('regions', 'trunk-front')]),
    'm07': (4, [('paws', n) for n in ['forearm-front', 'forearm-profile', 'forepaw-front', 'forepaw-profile']]),
    'm08': (3, [('paws', 'hindleg-front'), ('paws', 'hindleg-profile'), ('tail', 'shin-profile')]),
    'm09': (4, [('paws', n) for n in ['hindpaw-front', 'hindpaw-profile', 'hindpaw-oblique', 'hindpaw-underside']]),
    'm10': (4, [('tail', n) for n in ['tail-root-back', 'tail-root-oblique', 'tail-root-opposite', 'tail-fan-back']]),
}

# Extra shaded detail renders that show a region's coat but are not in its packet images.
SURFACE_EXTRA = {'R04': [('regions', 'ears-rear')], 'R03': [], 'R01': [], 'R02': [('regions', 'face-front')]}


def packet_assembly(packet):
    return json.loads((Path(packet)/'index.json').read_text())['assembly']


def region_cells(region):
    """[(image name, cell index, (set, detail name))] for the region's packet images (m02/m03 excluded)."""
    out = []
    for image in lt.REGION_IMAGES[region]:
        if image in PACKET_CELLS:
            out += [(image, k, sd) for k, sd in enumerate(PACKET_CELLS[image][1])]
    return out


def cell_image(packet, image, index):
    """The packet's own cell (label strip removed) as an RGB image."""
    cols, cells = PACKET_CELLS[image]
    sheet = Image.open(Path(packet)/f'{image}.png').convert('RGB')
    x, y = (index % cols)*CELL, (index//cols)*(CELL+LABEL)
    return sheet.crop((x, y+LABEL, x+CELL, y+LABEL+CELL))


def detail_path(assembly, dset, name):
    return lt.work(assembly)/f'details-{dset}'/f'{name}.png'


def detail_view(assembly, dset, name):
    geometry = json.loads((lt.work(assembly)/f'details-{dset}'/'details.json').read_text(encoding='utf-8'))
    view = next(v for v in geometry['views'] if v['name'] == name)
    return view, geometry['resolution']


def zone_pixels(region, view, resolution):
    """Pixel bounding box (x0, y0, x1, y1) of the region's zone box in a detail camera (orthographic),
    clipped to the image, or None for a whole-figure region or a zone outside the view."""
    box = lt.SPECIES.zone_box(region)
    if box is None:
        return None
    m = np.array(view['matrixWorld'], float)
    right, up, origin = m[:3, 0], m[:3, 1], m[:3, 3]
    per_unit = resolution/view['orthoScale']
    xs = [(box['x'][0], box['x'][1])]
    if box['symmetricX']:
        xs.append((-box['x'][1], -box['x'][0]))
    pts = [np.array([x, y, z]) for lo, hi in xs for x in (lo, hi) for y in box['y'] for z in box['z']]
    cols = [resolution/2+(p-origin)@right*per_unit for p in pts]
    rows = [resolution/2-(p-origin)@up*per_unit for p in pts]
    x0, x1 = int(max(0, np.floor(min(cols)))), int(min(resolution, np.ceil(max(cols))))
    y0, y1 = int(max(0, np.floor(min(rows)))), int(min(resolution, np.ceil(max(rows))))
    if x1-x0 < 8 or y1-y0 < 8:
        return None
    return x0, y0, x1, y1
