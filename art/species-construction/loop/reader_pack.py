"""Blind pairwise pack for the construction loop's readers.

    python reader_pack.py <baseline packet> <candidate packet> --regions R04[,R06] --out <dir> --seed <text>

Writes into <dir> (a new folder; an existing non-empty one is refused):
  pack-01.png ...   one region panel (A and B side by side, equal scale), then that region's
                    Reference panel, per region, then one whole-figure panel (front, left, back
                    of A and of B in one fixed frame). No assembly or round number appears in an
                    image or a file name.
  pack.json         the panels in order, what each shows, and the question to ask.  Safe to give
                    to readers.
  key.json          which side is the baseline. Not for readers.

The A/B assignment is one deterministic coin per pack: sha256(seed | baseline | candidate |
regions). The packet cells are the fixed-camera detail renders (the same frame for every
assembly), so equal scale is by construction; the whole-figure panel uses the fixed render frame
with one crop for all six views.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loop_tools as lt  # noqa: E402
import packet_images as pi  # noqa: E402

CELL = pi.CELL
GAP = 24
BAND = 56            # header band with the big A / B letter
INK, MUTED = (25, 25, 25), (120, 120, 120)

NAMES = {
    'R01': 'the head shape and skull (front, side, back)',
    'R02': 'the face: eyes, nose, muzzle and cheeks',
    'R03': 'the front of the ear fan: locks and cupped inner ears',
    'R04': 'the rear of the ear fan: how the locks lie from behind, above and in profile',
    'R05': 'the neck and shoulders',
    'R06': 'the trunk: chest, waist and hips',
    'R07': 'the arms and forepaws',
    'R08': 'the hind legs',
    'R09': 'the hind paws',
    'R10': 'the three tails as a whole',
    'R11': 'where the three tails join the body',
}

# Which detail cells show a region best (at most six). Anything else falls back to all of the
# region's packet cells.
PICK = {
    'R01': ['head-front', 'head-side', 'head-back', 'head-top'],
    'R02': ['eyes-front', 'nose-front', 'nose-profile', 'head-three-quarter'],
    'R03': ['head-front', 'head-three-quarter', 'head-side', 'head-top'],
    'R04': ['head-back', 'head-rear-oblique', 'head-top', 'head-side', 'head-front', 'head-three-quarter'],
}

# Reference panel per region: sheet views cropped to the region's zone rows, plus accepted studies
# (packet files r01 to r04, the same in every packet).
REFERENCE = {
    'R01': (['front', 'left'], ['r04.png']),
    'R02': (['front'], ['r01.png']),
    'R03': (['front'], ['r04.png']),
    'R04': (['back', 'left'], ['r04.png']),
    'R05': (['front', 'left'], []),
    'R06': (['front', 'left'], []),
    'R07': (['front', 'left'], ['r02.png']),
    'R08': (['front', 'left'], []),
    'R09': (['front'], ['r02.png']),
    'R10': (['back'], ['r03.png']),
    'R11': (['back'], ['r03.png']),
}


def coin(seed, baseline, candidate, regions):
    digest = hashlib.sha256('|'.join([seed, str(baseline), str(candidate), ','.join(regions)]).encode()).digest()
    return digest[0] & 1   # 1: A is the candidate


def font(size):
    from PIL import ImageFont
    for name in ('arial.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def letter_band(width, text):
    band = Image.new('RGB', (width, BAND), 'white')
    ImageDraw.Draw(band).text((10, 6), text, fill=INK, font=font(40))
    return band


def cell_grid(images, labels, cols):
    rows = (len(images)+cols-1)//cols
    sheet = Image.new('RGB', (cols*CELL, rows*CELL), 'white')
    draw = ImageDraw.Draw(sheet)
    for k, (im, label) in enumerate(zip(images, labels)):
        x, y = (k % cols)*CELL, (k//cols)*CELL
        sheet.paste(im, (x, y))
        draw.text((x+6, y+4), label, fill=MUTED, font=font(14))
    return sheet


def side_by_side(a, b):
    """A left, B right, each under its letter, with a hairline between."""
    w = max(a.width, b.width)
    out = Image.new('RGB', (2*w+GAP, BAND+max(a.height, b.height)), 'white')
    out.paste(letter_band(w, 'A'), (0, 0))
    out.paste(letter_band(w, 'B'), (w+GAP, 0))
    out.paste(a, (0, BAND))
    out.paste(b, (w+GAP, BAND))
    ImageDraw.Draw(out).line([(w+GAP//2, 0), (w+GAP//2, out.height)], fill=(200, 200, 200), width=2)
    return out


def region_cells_for(region):
    cells = pi.region_cells(region)
    wanted = PICK.get(region)
    if wanted:
        by_name = {sd[1]: (image, k) for image, k, sd in cells}
        # picks may live in an image the region does not list (R03 uses m05's three-quarter)
        for image, (cols, items) in pi.PACKET_CELLS.items():
            for k, (_, name) in enumerate(items):
                by_name.setdefault(name, (image, k))
        return [(by_name[n][0], by_name[n][1], n) for n in wanted if n in by_name]
    return [(image, k, sd[1]) for image, k, sd in cells]


def region_panel(packet, region):
    cells = region_cells_for(region)
    images = [pi.cell_image(packet, image, k) for image, k, _ in cells]
    cols = 3 if len(cells) > 4 else 2 if len(cells) in (2, 4) else min(3, len(cells))
    return cell_grid(images, [n for _, _, n in cells], cols)


def sheet_crop(view, region, height=560):
    """The first sheet's figure in `view`, cropped to the region's zone rows, neighbours blanked."""
    zone = lt.SPECIES.zone(region)
    gray = np.asarray(Image.open(lt.SPECIES.docs/lt.SPECIES['referenceSheet']).convert('L'))
    mask = lt.reference_figure(view)
    rows, cols = np.where(mask)
    top, bottom = rows.min(), rows.max()
    h = bottom-top
    a0, a1 = zone['at'] if zone else (0, 1)
    r0, r1 = int(max(0, top+(a0-.02)*h)), int(min(gray.shape[0], top+(a1+.02)*h))
    band = mask[r0:r1]
    cc = np.where(band.any(axis=0))[0]
    c0, c1 = max(0, cc.min()-8), min(gray.shape[1], cc.max()+8)
    from scipy import ndimage as ndi
    keep = ndi.binary_dilation(mask, iterations=6)[r0:r1, c0:c1]
    crop = np.where(keep, gray[r0:r1, c0:c1], 255).astype(np.uint8)
    im = Image.fromarray(crop).convert('RGB')
    s = height/im.height
    return im.resize((max(1, round(im.width*s)), height), Image.LANCZOS)


def reference_panel(packet, region):
    views, studies = REFERENCE[region]
    parts = [sheet_crop(v, region) for v in views]
    for study in studies:
        im = Image.open(Path(packet)/study).convert('RGB')
        s = 560/im.height
        parts.append(im.resize((round(im.width*s), 560), Image.LANCZOS))
    width = sum(p.width for p in parts)+GAP*(len(parts)-1)
    out = Image.new('RGB', (width, BAND+560), 'white')
    ImageDraw.Draw(out).text((10, 6), 'Reference', fill=INK, font=font(40))
    x = 0
    for p in parts:
        out.paste(p, (x, BAND))
        x += p.width+GAP
    return out


def whole_figure(assembly_a, assembly_b, scale=.8):
    """Front, left and back of A and of B from the fixed render frame, one crop for all six."""
    views = ['front', 'left', 'back']
    renders = {k: [Image.open(lt.work(asm)/'render'/f'{v}.png').convert('RGBA') for v in views]
               for k, asm in (('A', assembly_a), ('B', assembly_b))}
    boxes = [im.getchannel('A').getbbox() for ims in renders.values() for im in ims]
    x0, x1 = min(b[0] for b in boxes)-10, max(b[2] for b in boxes)+10
    y0, y1 = min(b[1] for b in boxes)-10, max(b[3] for b in boxes)+10
    # one crop per view column would change scale between views; the union keeps all six identical
    panels = {}
    for k, ims in renders.items():
        row = Image.new('RGB', ((x1-x0)*len(views), y1-y0), 'white')
        for i, im in enumerate(ims):
            ground = Image.new('RGBA', im.size, (255, 255, 255, 255))
            ground.alpha_composite(im)
            row.paste(ground.convert('RGB').crop((x0, y0, x1, y1)), (i*(x1-x0), 0))
        panels[k] = row.resize((round(row.width*scale), round(row.height*scale)), Image.LANCZOS)
    return side_by_side(panels['A'], panels['B'])


def question(region):
    return (f'Which of A or B is closer to the Reference in {NAMES[region]}? Answer A, B or tie, then name the one '
            'visible difference that decides it. Judge the shape and softness of the large and medium forms and coat '
            'masses, not fine strands or colour. The model stands arms down and the sheet has hands on hips; ignore '
            'that and nothing else about the pose.')


WHOLE_QUESTION = ('Which of A or B reads more like the Reference creature as a whole (proportion, balance of head, fan, '
                  'body and tails, one consistent coat)? Answer A, B or tie, then name the one visible difference that '
                  'decides it. The Reference for the whole figure is the first panel of any region; the model is arms down.')


def build(baseline, candidate, regions, out, seed):
    out = Path(out)
    if out.exists() and any(out.iterdir()):
        raise SystemExit(f'{out} is not empty; write a new folder')
    out.mkdir(parents=True, exist_ok=True)
    for r in regions:
        if r not in REFERENCE:
            raise SystemExit(f'No reader pack for {r} (regions {", ".join(REFERENCE)})')
    base_asm, cand_asm = pi.packet_assembly(baseline), pi.packet_assembly(candidate)
    flip = coin(seed, base_asm, cand_asm, regions)
    side = {'A': (candidate, cand_asm), 'B': (baseline, base_asm)} if flip else {'A': (baseline, base_asm), 'B': (candidate, cand_asm)}
    panels, n = [], 0

    def save(image, entry):
        nonlocal n
        n += 1
        name = f'pack-{n:02d}.png'
        image.save(out/name)
        panels.append({'file': name, **entry})

    for r in regions:
        save(side_by_side(region_panel(side['A'][0], r), region_panel(side['B'][0], r)),
             {'kind': 'region', 'region': r, 'shows': f'A and B, {NAMES[r]}, same cameras and scale', 'question': question(r)})
        save(reference_panel(candidate, r), {'kind': 'reference', 'region': r,
             'shows': f'Reference for {NAMES[r]}: the sheet cropped to the region, plus accepted studies'})
    save(whole_figure(side['A'][1], side['B'][1]),
         {'kind': 'whole', 'shows': 'A (left) and B (right), each front, left and back in one fixed frame', 'question': WHOLE_QUESTION})
    (out/'pack.json').write_text(json.dumps({'panels': panels, 'answerFormat': 'A, B or tie, plus the one deciding difference'}, indent=1)+'\n')
    (out/'key.json').write_text(json.dumps({
        'seed': seed, 'A': side['A'][1], 'B': side['B'][1], 'baseline': base_asm, 'candidate': cand_asm,
        'aIsCandidate': bool(flip), 'regions': regions,
        'note': 'Do not give this file to readers.'}, indent=1)+'\n')
    return out


def main():
    ap = argparse.ArgumentParser(description='Blind pairwise reader pack')
    ap.add_argument('baseline')
    ap.add_argument('candidate')
    ap.add_argument('--regions', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--seed', required=True)
    ap.add_argument('--species')
    a = ap.parse_args()
    out = build(a.baseline, a.candidate, a.regions.split(','), a.out, a.seed)
    print(f'pack {out}')


if __name__ == '__main__':
    main()
