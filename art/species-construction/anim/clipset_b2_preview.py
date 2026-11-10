"""Quick numpy previews of posed Akinza frames for the clip set batch 2 build (no Blender): the skin posed as the renders pose
it (rig_core.posed_skin with the corrective keys and the breath key), splatted into the render cameras with a z-buffer and
a plain Lambert shade, plus the pixels each body region shows. A building aid and a measuring tool; the clay renders in
Blender (clip_frames.py) are the record.

  python art/species-construction/anim/clipset_b2_preview.py <rig dir> <rest skin npz> <bake dir> <out png>
      --frames clip:0,clip:5,... [--views side,sprite,front,top] [--regions] [--scale 1]

Views: side (azimuth 90, elevation 3, the 720 px clip framing of clip_frames.py), sprite (azimuth 90, elevation 0, the 192 px
sprite framing), front (azimuth 0) and top (straight down), both fitted like side. With --regions every pixel takes its
region's colour (head, ear near, ear far, tails, arms, legs, trunk) and visible_regions() counts them; the counts are what the
faint setup check reports as how much of the head, an ear and the tails the camera sees.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import akinza_clips as ac  # noqa: E402

BOX = (-0.5375, -0.5567, -0.987, 0.6738, 0.7639, 0.932)          # clip_frames --box (source units), batch 1's
SPRITE_BOX = (-0.5675, -0.5867, -1.017, 0.7038, 0.7939, 0.962)   # clip_frames --sprite-box
REGION_COLOURS = {'head': (235, 200, 80), 'ear_near': (90, 170, 255), 'ear_far': (40, 90, 200), 'tails': (240, 120, 40),
                  'arms': (170, 220, 120), 'legs': (150, 120, 200), 'trunk': (200, 200, 200)}


class Cam:
    """The render cameras (clipset_measure_p3.py's): an orthographic view fitted to a box (source units) from azimuth az and
    elevation el, size px square; fit and margin as clip_frames (side: 1.08, 0; sprite: 1.0, .06)."""
    def __init__(self, box, az, el, size, fit, margin, s, off):
        box = np.asarray(box, float)
        lo, hi = box[:3], box[3:]
        ar, er = math.radians(az), math.radians(el)
        if el >= 89.9:
            dvec = np.array([0., 0., 1.])
            r, u = np.array([0., 1., 0.]), np.array([-1., 0., 0.])
        else:
            dvec = np.array([math.sin(ar)*math.cos(er), -math.cos(ar)*math.cos(er), math.sin(er)])
            f = -dvec
            r = np.cross(f, [0, 0, 1.])
            r /= np.linalg.norm(r)
            u = np.cross(r, f)
        corners = np.array([[hi[0] if k & 1 else lo[0], hi[1] if k & 2 else lo[1], hi[2] if k & 4 else lo[2]] for k in range(8)])
        xs, ys = corners@r, corners@u
        self.ortho = max(xs.max()-xs.min(), ys.max()-ys.min())*fit*(1+2*margin)
        self.cx, self.cy = (xs.max()+xs.min())/2, (ys.max()+ys.min())/2
        self.r, self.u, self.d, self.size = r, u, dvec, size
        self.pps = size/self.ortho
        self.s, self.off = s, off

    def px(self, P_m):
        X = np.atleast_2d(P_m)/self.s+self.off
        return np.stack([(X@self.r-self.cx)*self.pps+self.size/2, self.size/2-(X@self.u-self.cy)*self.pps], 1)

    def depth(self, P_m):
        return -(np.atleast_2d(P_m)/self.s+self.off)@self.d          # larger is further from the camera


class Skin:
    def __init__(self, rig_dir, rest_npz, bake_dir=None):
        R = Path(rig_dir)
        rig = json.loads((R/'rig.json').read_text())
        self.J = json.loads((R/'joints.json').read_text())
        self.s, self.off = rig['transform']['scale'], np.array(rig['transform']['offset'])
        d = np.load(rest_npz)
        self.rest = self.s*(d['src'].astype(np.float64)-self.off)
        self.tris = d['tri'].astype(np.int64)
        wt = np.load(R/'weights.npz')
        self.idx = wt['idx'].astype(int)
        w = np.round(wt['w'].astype(np.float64)*4096)/4096
        self.w = w/w.sum(1, keepdims=True)
        self.keys = json.loads((R/'correctives.json').read_text())['keys']
        cz = np.load(R/'correctives.npz')
        self.deltas = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in self.keys}
        self.shapes = ac.load_shapes(bake_dir) if bake_dir else {}
        names = rc.ANIM_NAMES
        dom = np.array([names[b] for b in self.idx[:, 0]])
        reg = np.full(len(dom), 'trunk', dtype=object)
        base = np.array([rc.base_of(n) for n in dom])
        reg[np.isin(dom, ['head', 'jaw', 'neck'])] = 'head'
        reg[np.char.startswith(dom.astype(str), 'ear_') & np.char.endswith(dom.astype(str), '.L')] = 'ear_near'
        reg[np.char.startswith(dom.astype(str), 'ear_') & np.char.endswith(dom.astype(str), '.R')] = 'ear_far'
        reg[np.char.startswith(dom.astype(str), 'tail_')] = 'tails'
        reg[np.isin(base, ['clavicle', 'upperarm', 'forearm', 'hand'])] = 'arms'
        reg[np.isin(base, ['thigh', 'shin', 'foot'])] = 'legs'
        self.region = reg
        self.cams = {'side': Cam(BOX, 90., 3., 720, 1.08, 0., self.s, self.off),
                     'sprite': Cam(SPRITE_BOX, 90., 0., 192, 1., .06, self.s, self.off),
                     'front': Cam(BOX, 0., 3., 720, 1.08, 0., self.s, self.off),
                     'top': Cam(BOX, 0., 90., 720, 1.08, 0., self.s, self.off)}

    def pose(self, fr):
        base = ac.apply_shapes(self.rest, fr, self.shapes) if self.shapes else self.rest
        P, _, vals = rc.posed_skin(base, self.idx, self.w, self.J, fr['pose'], fr['lift'], self.keys, self.deltas)
        return P, vals

    def normals(self, P):
        t = self.tris
        fn = np.cross(P[t[:, 1]]-P[t[:, 0]], P[t[:, 2]]-P[t[:, 0]])
        vn = np.zeros_like(P)
        for k in range(3):
            np.add.at(vn, t[:, k], fn)
        return vn/np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-20)

    def splat(self, P, view, regions=False, floor=True):
        """The z-buffered splat of the posed skin: an RGB image and the per-pixel vertex index (-1 for background)."""
        c = self.cams[view]
        q = c.px(P)
        dz = c.depth(P)
        n = self.normals(P)
        light = -c.d*.6+c.u*.7+c.r*-.35
        light /= np.linalg.norm(light)
        shade = np.clip(n@light, 0, 1)*.75+.25
        S = c.size
        foot = 2 if view == 'sprite' else 3
        best = np.full(S*S, np.inf)
        owner = np.full(S*S, -1, np.int64)
        for dx in range(foot):
            for dy in range(foot):
                x = np.floor(q[:, 0]-foot/2+.5+dx).astype(int)
                y = np.floor(q[:, 1]-foot/2+.5+dy).astype(int)
                ok = (x >= 0) & (x < S) & (y >= 0) & (y < S)
                pix = y[ok]*S+x[ok]
                vid = np.flatnonzero(ok)
                order = np.lexsort((dz[vid], pix))
                pix, vid = pix[order], vid[order]
                first = np.r_[True, pix[1:] != pix[:-1]]
                pix, vid = pix[first], vid[first]
                better = dz[vid] < best[pix]
                best[pix[better]] = dz[vid[better]]
                owner[pix[better]] = vid[better]
        img = np.full((S*S, 3), 18, np.uint8)
        hit = owner >= 0
        if regions:
            cols = np.array([REGION_COLOURS[r] for r in self.region[owner[hit]]], float)
            img[hit] = (cols*shade[owner[hit]][:, None]).astype(np.uint8)
        else:
            g = (shade[owner[hit]]*215).astype(np.uint8)
            img[hit] = np.stack([g, g, g], 1)
        im = Image.fromarray(img.reshape(S, S, 3))
        if floor and view != 'top':
            fy = c.px(np.array([[0., 0., 0.], [0., 1., 0.]]))
            ImageDraw.Draw(im).line([(0, fy[0, 1]), (S, fy[1, 1]+(fy[0, 1]-fy[1, 1]))], fill=(90, 60, 60))
        return im, owner.reshape(S, S)

    def visible_regions(self, owner):
        hit = owner >= 0
        regs, cnt = np.unique(self.region[owner[hit]], return_counts=True)
        return {r: int(c) for r, c in zip(regs, cnt)}


def sheet(skin, frames, views, regions=False, scale=1., labels=None):
    tiles = []
    for i, fr in enumerate(frames):
        P, _ = skin.pose(fr)
        row = []
        for v in views:
            im, _ = skin.splat(P, v, regions)
            if v == 'sprite':
                im = im.resize((im.width*3, im.height*3), Image.NEAREST)
            if scale != 1:
                im = im.resize((round(im.width*scale), round(im.height*scale)), Image.LANCZOS)
            row.append(im)
        lab = labels[i] if labels else f"f{fr.get('frame', i)}"
        tiles.append((lab, row))
    W = sum(im.width for im in tiles[0][1])
    H = max(im.height for im in tiles[0][1])
    out = Image.new('RGB', (W, (H+20)*len(tiles)), (10, 10, 10))
    dr = ImageDraw.Draw(out)
    for k, (lab, row) in enumerate(tiles):
        x = 0
        for im in row:
            out.paste(im, (x, k*(H+20)+20))
            x += im.width
        dr.text((6, k*(H+20)+3), lab, fill=(250, 220, 90))
    return out


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('rig', type=Path)
    p.add_argument('rest', type=Path)
    p.add_argument('bake', type=Path)
    p.add_argument('out', type=Path)
    p.add_argument('--frames', required=True)
    p.add_argument('--views', default='side,sprite')
    p.add_argument('--regions', action='store_true')
    p.add_argument('--scale', type=float, default=1.)
    a = p.parse_args()
    sk = Skin(a.rig, a.rest, a.bake)
    frs, labs = [], []
    for spec in a.frames.split(','):
        clip, k = spec.split(':')
        frs.append(json.loads((a.bake/clip/'poses.json').read_text())[int(k)])
        labs.append(spec)
    sheet(sk, frs, a.views.split(','), a.regions, a.scale, labs).save(a.out)
    print('wrote', a.out)
