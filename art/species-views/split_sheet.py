"""Crop explicit, nonoverlapping view rectangles without resizing."""
import argparse
from pathlib import Path
from PIL import Image
from common import VIEWS, digest, read_json, write_json


def split(sheet, boxes, output):
    if set(boxes) != set(VIEWS):
        raise ValueError('Exactly six named views required')
    im = Image.open(sheet).convert('RGBA')
    seen = []
    for name, box in boxes.items():
        if len(box) != 4 or not all(type(v) is int for v in box):
            raise ValueError('Crop coordinates must be four integers')
        l, t, r, b = box
        if not (0 <= l < r <= im.width and 0 <= t < b <= im.height):
            raise ValueError(f'Invalid crop: {name}')
        for ol, ot, or_, ob in seen:
            if max(l, ol) < min(r, or_) and max(t, ot) < min(b, ob):
                raise ValueError('Overlapping crops')
        seen.append(box)
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    records = {}
    for name, box in boxes.items():
        path = output / f'{name}.png'
        im.crop(box).save(path)
        records[name] = {'angle': VIEWS[name], 'crop': box, 'sha256': digest(path)}
    write_json(output / 'crops.json', {'sheetSha256': digest(sheet), 'views': records})
    return records


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('sheet'); p.add_argument('boxes'); p.add_argument('output')
    a = p.parse_args()
    split(a.sheet, read_json(a.boxes), a.output)
