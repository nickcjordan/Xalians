"""Review shot specs and sheets for Akinza rig pass 6 (pose_shots.py poses, render_shots.py renders).

  python art/species-construction/anim/compose_pass6.py spec <shots dir> <tag> [--rest-only]
  python art/species-construction/anim/compose_pass6.py joints <shots dir> <tag> <rig dir> <out png> [--title T]
  python art/species-construction/anim/compose_pass6.py strip <out png> <title> <png> [<png> ...] [--labels a|b|..]

spec writes <shots dir>/<tag>_spec.json: the rest skin from the side, front and back half clear (for the joints
overlay), the crouch at shares 0, .3, .5, .7, 1 from the front half clear, the deepest crouch from the side, the
rump from the side and the back three-quarter, and the weight colours. joints draws the skeleton (bones blue,
joints amber) over the half-clear rest shots, side, front and back, like the diagnosis sheet's first row, with
the sculpt's knee pit band and the crotch marked. strip puts images side by side with labels.
"""
import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

LOW, SL = [0, 0, -.47], 1.12          # lower body framing, source units
RUMP = [0, .15, -.4]
BLUE, AMBER, WHITE, DARK, BG = (40, 110, 255), (255, 176, 0), (255, 255, 255), (20, 20, 20), (245, 245, 245)
try:
    F = ImageFont.truetype('arial.ttf', 22)
    FS = ImageFont.truetype('arial.ttf', 18)
    FB = ImageFont.truetype('arialbd.ttf', 30)
except OSError:
    F = FS = FB = ImageFont.load_default()
CHAIN = [('pelvis', 'waist'), ('pelvis', 'hip.L'), ('pelvis', 'hip.R'), ('hip.L', 'knee.L'), ('knee.L', 'ankle.L'),
         ('ankle.L', 'toe.L'), ('hip.R', 'knee.R'), ('knee.R', 'ankle.R'), ('ankle.R', 'toe.R'), ('pelvis', 'tail_base'),
         ('tail_base', 'tail_fork'), ('hip.L', 'glute_tip.L'), ('hip.R', 'glute_tip.R')] + \
    [(f'tail_{t}_j{k}', f'tail_{t}_j{k+1}') for t in 'abc' for k in range(2)]
LABEL = {'hip.L': 'hip', 'knee.L': 'knee', 'ankle.L': 'ankle', 'pelvis': 'pelvis', 'tail_base': 'tail base',
         'tail_fork': 'fork', 'glute_tip.L': 'glute'}


def shot(name, pos, color, az, el, center, scale, alpha=0., size=800):
    return dict(name=name, pos=pos, color=color, az=az, el=el, center=center, scale=scale, alpha=alpha, size=size)


def spec(d, tag, rest_only=False):
    S = []
    for v, az in (('side', 90), ('front', 0), ('back', 180)):
        S.append(shot(f'{tag}_rest_{v}_xray', 'rest', 'clay', az, 0, LOW, SL, .5))
    S.append(shot(f'{tag}_rest_side_w', 'rest', f'{tag}_col_weights.npy', 90, 0, LOW, SL))
    S.append(shot(f'{tag}_rest_front_thigh', 'rest', f'{tag}_col_thigh.npy', 0, 0, LOW, SL))
    S.append(shot(f'{tag}_rest_back_w', 'rest', f'{tag}_col_weights.npy', 180, 0, LOW, SL))
    if not rest_only:
        for e in ('e000', 'e030', 'e050', 'e070', 'e100'):
            S.append(shot(f'{tag}_{e}_front_xray', f'{tag}_{e}.npy', 'clay', 0, 0, LOW, SL, .45))
        S.append(shot(f'{tag}_e100_side_xray', f'{tag}_e100.npy', 'clay', 90, 0, LOW, SL, .45))
        S.append(shot(f'{tag}_e100_side', f'{tag}_e100.npy', 'clay', 90, 0, LOW, SL))
        S.append(shot(f'{tag}_e050_front', f'{tag}_e050.npy', 'clay', 0, 0, LOW, SL))
        S.append(shot(f'{tag}_e100_front', f'{tag}_e100.npy', 'clay', 0, 0, LOW, SL))
        S.append(shot(f'{tag}_e100_rump_side', f'{tag}_e100.npy', 'clay', 90, 0, RUMP, .7))
        S.append(shot(f'{tag}_e100_back3q', f'{tag}_e100.npy', 'clay', 145, 15, RUMP, .8))
        S.append(shot(f'{tag}_e100_back', f'{tag}_e100.npy', 'clay', 180, 0, LOW, SL))
        S.append(shot(f'{tag}_e100_side_w', f'{tag}_e100.npy', f'{tag}_col_weights.npy', 90, 0, LOW, SL))
        S.append(shot(f'{tag}_e100_side_thigh', f'{tag}_e100.npy', f'{tag}_col_thigh.npy', 90, 0, LOW, SL))
        S.append(shot(f'{tag}_e100_back3q_w', f'{tag}_e100.npy', f'{tag}_col_weights.npy', 145, 15, RUMP, .8))
    (d/f'{tag}_spec.json').write_text(json.dumps(dict(samples=20, shots=S), indent=0))
    print(len(S), 'shots')


def proj(sh, p):
    az, el = math.radians(sh['az']), math.radians(sh['el'])
    dv = np.array([math.sin(az)*math.cos(el), -math.cos(az)*math.cos(el), math.sin(el)])
    v = -dv
    r = np.cross(v, [0, 0, 1.])
    r /= np.linalg.norm(r)
    u = np.cross(r, v)
    q = np.asarray(p)-np.array(sh['center'])
    N, S = sh['size'], sh['scale']
    return (N*(.5+(q@r)/S), N*(.5-(q@u)/S))


def draw_skeleton(im, sh, j, hide=None, labels=True):
    dr = ImageDraw.Draw(im)
    for a_, b_ in CHAIN:
        if hide and (a_.endswith('.'+hide) or b_.endswith('.'+hide)):
            continue
        if a_ in j and b_ in j:
            dr.line([proj(sh, j[a_]), proj(sh, j[b_])], fill=BLUE, width=5)
    for k, p in j.items():
        if (hide and k.endswith('.'+hide)) or k in ('chest', 'waist'):
            continue
        x, y = proj(sh, p)
        dr.ellipse([x-8, y-8, x+8, y+8], fill=AMBER, outline=DARK, width=2)
    if labels:
        for k, t in LABEL.items():
            if k in j and not (hide and k.endswith('.'+hide)):
                x, y = proj(sh, j[k])
                dr.text((x+12, y-12), t, fill=WHITE, font=FS, stroke_width=3, stroke_fill=DARK)
    return dr


def hline(dr, sh, z_src, text, col):
    _, y = proj(sh, [0, 0, z_src])
    for xx in range(0, sh['size'], 18):
        dr.line([(xx, y), (xx+10, y)], fill=col, width=2)
    dr.text((8, y-24), text, fill=col, font=FS, stroke_width=3, stroke_fill=DARK)


def wrap(text, w, font):
    lines, cur = [], ''
    for wd in text.split():
        t = (cur+' '+wd).strip()
        if font.getlength(t) > w-14 and cur:
            lines.append(cur)
            cur = wd
        else:
            cur = t
    return lines+[cur]


def strip(ims, labels, title, width=None):
    H = max(i.height for i in ims)
    ims = [i if i.height == H else i.resize((int(i.width*H/i.height), H), Image.LANCZOS) for i in ims]
    W = sum(i.width for i in ims)+10*(len(ims)-1)
    lab = [wrap(l, i.width, FS) for l, i in zip(labels, ims)]
    nl = max(len(x) for x in lab) if lab else 0
    tl = wrap(title, W, F)
    top = 14+28*len(tl)
    out = Image.new('RGB', (W, top+H+10+22*nl), BG)
    d = ImageDraw.Draw(out)
    for k, l in enumerate(tl):
        d.text((8, 8+28*k), l, fill=DARK, font=F)
    x = 0
    for im, ls in zip(ims, lab):
        out.paste(im, (x, top))
        for k, l in enumerate(ls):
            d.text((x+6, top+H+6+22*k), l, fill=DARK, font=FS)
        x += im.width+10
    return out


def joints_sheet(d, tag, rig, out, title):
    sp = {s['name']: s for s in json.loads((d/f'{tag}_spec.json').read_text())['shots']}
    SJ = json.loads((d/f'{tag}_shots.json').read_text())
    J = SJ['rest_joints_src']
    rj = json.loads((rig/'joints.json').read_text())
    rr = json.loads((rig/'rig.json').read_text())
    s, off = rr['transform']['scale'], np.array(rr['transform']['offset'])
    legs = rj['_meta'].get('legs', {})
    ims, labels = [], []
    for v, hide in (('side', 'R'), ('front', None), ('back', None)):
        nm = f'{tag}_rest_{v}_xray'
        sh = sp[nm]
        im = Image.open(d/'shots'/f'{nm}.png').convert('RGB')
        dr = draw_skeleton(im, sh, J, hide=hide)
        if v == 'side' and legs:
            hline(dr, sh, legs['crotchZ']/s+off[2], 'crotch', WHITE)
            band = legs['kneePitBand']
            hline(dr, sh, band[0]/s+off[2], 'knee pit band, bottom', AMBER)
            hline(dr, sh, band[1]/s+off[2], 'knee pit band, top', AMBER)
        ims.append(im)
        labels.append({'side': 'Rest, side from the left, mesh half clear, right leg bones hidden.',
                       'front': 'Rest, front.', 'back': 'Rest, back.'}[v])
    strip(ims, labels, title).save(out)
    print('wrote', out)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('cmd', choices=['spec', 'joints', 'strip'])
    p.add_argument('args', nargs='*')
    p.add_argument('--rest-only', action='store_true')
    p.add_argument('--title', default='')
    p.add_argument('--labels', default='')
    a = p.parse_args()
    if a.cmd == 'spec':
        spec(Path(a.args[0]), a.args[1], a.rest_only)
    elif a.cmd == 'joints':
        joints_sheet(Path(a.args[0]), a.args[1], Path(a.args[2]), Path(a.args[3]), a.title)
    else:
        out, title, *fs = a.args
        labels = a.labels.split('|') if a.labels else ['']*len(fs)
        strip([Image.open(f).convert('RGB') for f in fs], labels, title).save(out)
        print('wrote', out)
