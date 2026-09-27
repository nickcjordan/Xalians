"""Build a review contact sheet only from a passing, unchanged candidate."""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw
from common import VIEWS, digest, read_json


def contact(directory, reference, output):
    d=Path(directory); report=read_json(d/'report.json')
    if report['status'] != 'pass': raise ValueError('Candidate is not eligible for review')
    for name, expected in report['inventory'].items():
        if name == 'annotations':
            if digest(d/'annotations.json') != expected: raise ValueError('Stale annotations')
            continue
        path = reference if name == 'reference' else d/name
        if digest(path) != expected: raise ValueError('Stale check report')
    tiles=[('Source',Path(reference))]+[(n,d/f'{n}.png') for n in VIEWS]
    tiles += [(n+' mask',d/f'{n}.mask.png') for n in VIEWS]
    tiles += [(n,d/n) for n in ('front-overlay.png','back-overlay.png')]
    width=320; height=350; cols=7
    sheet=Image.new('RGB',(cols*width,((len(tiles)+cols-1)//cols)*height),'white')
    draw=ImageDraw.Draw(sheet)
    for i,(name,path) in enumerate(tiles):
        im=Image.open(path).convert('RGB'); im.thumbnail((width,height-30))
        x=(i%cols)*width; y=(i//cols)*height
        sheet.paste(im,(x,y+25)); draw.text((x+8,y+5),name,fill='black')
    sheet.save(output)


if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('directory');p.add_argument('reference');p.add_argument('output')
    a=p.parse_args();contact(a.directory,a.reference,a.output)
