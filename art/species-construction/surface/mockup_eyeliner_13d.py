"""One serial render per framing for each requested A/D eyeliner mix."""
import subprocess, sys, json, hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
WORK=ROOT/'untracked/species-construction/akinza/surface/fur-steps'
SURFACE=WORK/'s12-13b'
OUT=WORK/'s13d'
OUT.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before=sha(SURFACE/'surface.blend')
styles=[('G1','mix-g1','Bold upper + lower hairline'),('G2','mix-g2','Bold upper + fading lower'),('G3','mix-g3','Bold upper only')]
for label,style,title in styles:
    index=OUT/label/'index.json'
    if index.exists():
        saved=json.loads(index.read_text())
        assert saved['eyeliner']==style
        expected=sha(HERE/'eyeliner_styles.py')
        # G1/G2 are frozen mockups; the follow-up changes G3 only.
        if label in ('G1','G2'):
            assert saved['eyelinerSourceSha256'] in (expected,'94a8675b67217fdeede24ed9b3f1f15872c0b141bdb96177c595832756e84a3b')
        else:assert saved['eyelinerSourceSha256']==expected
        assert all((OUT/label/f'{view}.png').exists() for view in ('eye-close','head-front'))
        continue
    subprocess.run([sys.executable,str(HERE/'run_fur_12e.py'),'review_fur_13.py',f'13d-{label}.log','--','--surface',str(SURFACE),'--out',str(OUT/label),'--views','eye-close,head-front','--samples','24','--palette','T7','--eyeliner',style],check=True)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',26)
for view,name in [('eye-close','13d-eyeliner-mix.png'),('head-front','13d-eyeliner-mix-face.png')]:
    w,h=Image.open(OUT/'G1'/f'{view}.png').size
    sheet=Image.new('RGB',(w*3,h+44),'#f0f0f0');draw=ImageDraw.Draw(sheet)
    for i,(label,style,title) in enumerate(styles):
        draw.text((i*w+14,8),f'{label}. {title}',font=font,fill='#172532')
        sheet.paste(Image.open(OUT/label/f'{view}.png').convert('RGB'),(i*w,44))
    sheet.save(WORK/name)
assert sha(SURFACE/'surface.blend')==before
(OUT/'mockup-evidence.json').write_text(json.dumps(dict(default='current',surface=str(SURFACE.relative_to(ROOT)),baselineSha256=before,savedSurfaceUnchanged=True,styles=styles),indent=2))
