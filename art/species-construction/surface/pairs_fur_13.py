"""Labeled native-size before/after images and the final current-state set."""
import sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
before,after,part=map(str,sys.argv[1:4]);before=Path(before);after=Path(after);work=after.parent
views=['head-backq','ear-tip-close'] if part=='13b' else ['ears-front','ear-root-close']
if part=='13c' and (before/'ear-tip-close.png').exists():views.append('ear-tip-close')
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
for view in views:
    ims=[Image.open(p/f'{view}.png').convert('RGB') for p in (before,after/'r')];assert ims[0].size==ims[1].size
    w,h=ims[0].size;pair=Image.new('RGB',(w*2,h+38),'#f0f0f0');draw=ImageDraw.Draw(pair)
    for i,im in enumerate(ims):pair.paste(im,(i*w,38));draw.text((i*w+12,5),['Before',f'Now: {part}'][i],font=font,fill='#172532')
    pair.save(work/f'{part}-{view}.png')
if part=='13c':
    for view in ['ears-front','head-side','head-backq','body-backq','body-front','tails-side']:
        Image.open(after/'r'/f'{view}.png').save(work/f'current-{view}.png')
