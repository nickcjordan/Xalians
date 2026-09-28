"""Verify full-body render provenance and compose a provisional geometry review."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pipeline import file_hash

PRINCIPAL = {'front': 0, 'front-left': 45, 'left': 90, 'back': 180, 'right': 270, 'front-right': 315}


def check_cameras(cameras):
    selected = [c for c in cameras if c['name'] in PRINCIPAL]
    if len(selected) != 6 or {c['name'] for c in selected} != set(PRINCIPAL):
        raise ValueError('Six unique principal cameras required')
    first = selected[0]
    for camera in selected:
        if (camera['angle'] != PRINCIPAL[camera['name']] or camera['projection'] != 'orthographic'
                or camera['elevationOffset'] != 0 or camera['orthoScale'] != first['orthoScale']
                or camera['resolution'] != first['resolution']
                or abs(camera['matrixWorld'][2][3]-first['matrixWorld'][2][3]) > 1e-5):
            raise ValueError('Principal camera convention, scale or height mismatch')


def occupancy(image):
    alpha = image.getchannel('A')
    binary = alpha.point(lambda a: 255 if a >= 128 else 0)
    box = binary.getbbox()
    if not box or box[0] == 0 or box[1] == 0 or box[2] == image.width or box[3] == image.height:
        raise ValueError('Empty or clipped figure')
    return binary.point(lambda a: 0 if a else 255, mode='1'), box


def white(path, size):
    image = Image.open(path).convert('RGBA')
    bg = Image.new('RGBA', image.size, 'white')
    return Image.alpha_composite(bg, image).convert('RGB').resize(size, Image.Resampling.LANCZOS)


def build(directory):
    report = json.loads((directory/'geometry.json').read_text())
    check_cameras(report['cameras'])
    for name, expected in report['outputs'].items():
        if file_hash(directory/name) != expected:
            raise ValueError('Changed render or geometry: '+name)
    masks, boxes = {}, {}
    for camera in report['cameras']:
        source = directory/camera['image']
        with Image.open(source) as image:
            if list(image.size) != camera['resolution']:
                raise ValueError('Render does not match recorded resolution')
            mask, box = occupancy(image)
        target = directory/(camera['name']+'.occupancy.png')
        mask.save(target)
        masks[target.name] = {'sourceSha256': file_hash(source), 'sha256': file_hash(target),
                              'method': 'render alpha >= 128, black occupancy; no facial cutouts'}
        boxes[camera['name']] = list(box)
    heights = [boxes[n][3]-boxes[n][1] for n in PRINCIPAL]
    grounds = [boxes[n][3]-1 for n in PRINCIPAL]
    spread = (max(heights)-min(heights))/max(heights)
    ground_spread = (max(grounds)-min(grounds))/max(heights)
    font = ImageFont.load_default(size=22)
    small = ImageFont.load_default(size=17)
    sheet = Image.new('RGB', (1440,1090), 'white')
    draw = ImageDraw.Draw(sheet)
    draw.text((24,12), 'AKINZA | provisional whole-body geometry | six actual cameras', fill='#27323b', font=font)
    draw.text((24,43), 'Judge proportions, connections and depth. Coat, facial finish and animation are not represented.', fill='#46535e', font=small)
    for index,name in enumerate(PRINCIPAL):
        x, y = (index%3)*480, 76+(index//3)*500
        sheet.paste(white(directory/(name+'.png'), (470,470)), (x,y))
        draw.text((x+24,y+470), name.upper(), fill='#27323b', font=small)
    sheet.save(directory/'contact.png')
    frames=[]
    for angle in range(0,360,45):
        frame = white(directory/f'turn-{angle:03}.png', (640,640))
        ImageDraw.Draw(frame).text((15,15), 'PROVISIONAL | ELEVATED INSPECTION', fill='#27323b', font=small)
        frames.append(frame)
    frames[0].save(directory/'turntable.gif', save_all=True, append_images=frames[1:], duration=500, loop=0, disposal=2)
    result = {'scope': 'Technical geometry review, not final pack validation or art approval',
              'geometryReportSha256': file_hash(directory/'geometry.json'), 'masks': masks,
              'pixelBounds': boxes, 'principalFigureHeightSpread': spread,
              'principalGroundRowSpread': ground_spread,
              'registrationDiagnosticsPass': spread <= .01 and ground_spread <= .015,
              'contactSha256': file_hash(directory/'contact.png'),
              'turntableSha256': file_hash(directory/'turntable.gif'), 'approval': None}
    (directory/'review-assets.json').write_text(json.dumps(result,indent=2)+'\n')
    if not result['registrationDiagnosticsPass']:
        raise ValueError('Principal views exceed height or ground tolerances')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    build(parser.parse_args().directory)
