"""Render six material-only options serially and assemble two labeled sheets.

Use --rerender after editing shader code; existing image/index pairs are reused.
Use --surface to reproduce against the archived baseline after later steps.
"""
import subprocess,sys,json,hashlib,argparse
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
WORK=ROOT/'untracked/species-construction/akinza/surface/fur-steps'
styles=[('A','current','Current liner'),('B','none','None'),('C','hairline','Hairline'),('D','upper','Upper lid only'),('E','cat-eye','Cat-eye wing'),('F','ice-blue','Ice-blue')]
p=argparse.ArgumentParser();p.add_argument('--surface',type=Path,default=WORK/'s12f');p.add_argument('--rerender',action='store_true');args=p.parse_args()
surface=args.surface;out=WORK/'s13a';out.mkdir(exist_ok=True)
baseline=hashlib.sha256((surface/'surface.blend').read_bytes()).hexdigest()
for letter,style,label in styles:
    dest=out/letter
    if args.rerender or not (dest/'index.json').exists():
        subprocess.run([sys.executable,str(HERE/'run_fur_12e.py'),'review_fur_13.py',f'13a-{letter}.log','--','--surface',str(surface),'--out',str(dest),'--views','eye-close,head-front','--samples','24','--palette','T7','--eyeliner',style],check=True)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',26)
for view,name in [('eye-close','13a-eyeliner-options.png'),('head-front','13a-eyeliner-options-face.png')]:
    w,h=Image.open(out/'A'/f'{view}.png').size
    sheet=Image.new('RGB',(w*3,(h+44)*2),'#f0f0f0');draw=ImageDraw.Draw(sheet)
    for i,(letter,style,label) in enumerate(styles):
        x=i%3*w;y=i//3*(h+44);draw.text((x+14,y+8),f'{letter}. {label}',font=font,fill='#172532');sheet.paste(Image.open(out/letter/f'{view}.png').convert('RGB'),(x,y+44))
    sheet.save(WORK/name)
assert hashlib.sha256((surface/'surface.blend').read_bytes()).hexdigest()==baseline
(out/'mockup-evidence.json').write_text(json.dumps(dict(default='current',baselineSha256=baseline,savedSurfaceUnchanged=True,styles=styles),indent=2))
