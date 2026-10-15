from PIL import Image, ImageDraw, ImageFont
B='C:/dev/art-data/pipeline/blobs/'
blob=lambda h: B+h[:2]+'/'+h
REF='C:/dev/art-data/pipeline/codex-stream/luceras-paws/pass2/references/'
rows=[('full_side',blob('d265b6fcbff2e1f3fdd994590fd8b884eca9397680c871d8ccfc3d9d6aec8ec9'),'Full body, side'),
 ('full_three_quarter',blob('352833b55a8c0f986f76f81e9c5d9389bfc2849a99ff4161507a78c920a40b99'),'Full body, three-quarter'),
 ('full_front',blob('bc153b786d965458e78dab459cc8a9e6027a66b67dc3a38d58e61bccba570981'),'Full body, front'),
 ('hind_paw_side',REF+'hind_side_clay_crop.png','Hind paw, side'),
 ('hind_paw_three_quarter',REF+'hind_front_three_quarter_clay_crop.png','Hind paw, three-quarter'),
 ('fore_paws_front',REF+'fore_front_clay_crop.png','Fore paws, front'),
 ('fore_paw_side',REF+'fore_side_clay_crop.png','Fore paw, side')]
try: F=ImageFont.truetype('arial.ttf',26)
except: F=ImageFont.load_default()
H=700
for name,clay,title in rows:
    ims=[Image.open(f'generated_{name}.png').convert('RGB'),Image.open(f'current_{name}.png').convert('RGB'),Image.open(clay).convert('RGB')]
    ims=[i.resize((int(i.width*H/i.height),H)) for i in ims]
    W=sum(i.width for i in ims)+16
    out=Image.new('RGB',(W,H+44),(24,25,28)); d=ImageDraw.Draw(out); x=0
    for i,lab in zip(ims,['1. Generated (approved blockout)','2. Current build','3. Your shaved clay']):
        out.paste(i,(x,44)); d.text((x+12,8),lab,fill=(235,235,235),font=F); x+=i.width+8
    out.save(f'triple_{name}.png'); print(name,out.size)
