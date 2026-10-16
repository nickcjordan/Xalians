from pathlib import Path
from PIL import Image,ImageDraw
OUT=Path(r"C:/dev/art-data/pipeline/codex-stream/luceras-surface/pass3")
for group in ["orbit","motion"]:
 files=sorted(OUT.glob("runtime_"+group+"_*.png"))
 canvas=Image.new("RGB",(4*300,6*320),(35,35,35));d=ImageDraw.Draw(canvas)
 for i,p in enumerate(files):
  im=Image.open(p).convert("RGB");im.thumbnail((300,300));x=(i%4)*300;y=(i//4)*320;canvas.paste(im,(x,y));d.text((x+8,y+302),p.stem,fill="white")
 canvas.save(OUT/("check_runtime_"+group+"_contact.png"))
 if files:
  ims=[Image.open(f).convert("RGB") for f in files];ims[0].save(OUT/("check_runtime_"+group+".webp"),save_all=True,append_images=ims[1:],duration=100,loop=0)
