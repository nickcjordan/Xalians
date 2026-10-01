"""usage: top_scan.py PREVIEW_DIR [PREVIEW_DIR ...]  Top-silhouette scan of the front view in a quick preview: per column (x in figure heights, centred on the
ear fan), the depth of the top edge below the figure top, in figure heights (1.8605 world units). Prints the crown (|x|<.03), the left and right wing tops and tip heights."""
import json, sys
import numpy as np
from PIL import Image
for d in sys.argv[1:]:
    g=json.load(open(f'{d}/geometry.json'))
    cam=[c for c in g['cameras'] if c['name']=='front'][0]
    w,h=cam['resolution']; pxw=cam['orthoScale']/max(w,h); pxh=1.8605/pxw
    m=np.array(Image.open(f'{d}/front.png').getchannel('A'))>20
    rows=np.where(m.any(axis=1))[0]; top=rows.min()
    cols=np.where(m[top:top+int(.2*pxh)].any(axis=0))[0]
    cx=(cols.min()+cols.max())/2
    out={}
    for x in np.arange(-.28,.2801,.02):
        c=int(round(cx+x*pxh))
        col=np.where(m[:,c])[0]
        out[round(float(x),2)]=round(float((col.min()-top)/pxh),3) if len(col) else None
    print(d.split('/')[-1],'height px',int(rows.max()-top), 'span', round(float((cols.max()-cols.min())/pxh),3))
    print(' '.join(f'{k:+.2f}:{v}' for k,v in out.items()))
