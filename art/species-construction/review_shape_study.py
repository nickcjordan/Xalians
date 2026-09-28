"""Validate recorded projections and derive an undistorted internal review sheet."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
from review_blockout import check_cameras,occupancy,PRINCIPAL


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def thumbnail(path,size,box=None):
    im=Image.open(path).convert('RGBA')
    if box:im=im.crop(box)
    im=Image.alpha_composite(Image.new('RGBA',im.size,'white'),im).convert('RGB')
    return ImageOps.contain(im,size,Image.Resampling.LANCZOS)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('directory',type=Path)
    parser.add_argument('--label',required=True)
    parser.add_argument('--reference',type=Path)
    args=parser.parse_args()
    root=args.directory
    record=json.loads((root/'geometry.json').read_text())
    check_cameras(record['cameras'])
    if sha(record['source']) != record['sourceSha256']:
        raise ValueError('Source mesh changed since rendering')
    cameras={camera['name']:camera for camera in record['cameras']}
    for name,digest in record['outputs'].items():
        if sha(root/name)!=digest:raise ValueError('Changed render: '+name)
    boxes={};masks={}
    for name in PRINCIPAL:
        path=root/(name+'.png')
        im=Image.open(path).convert('RGBA')
        if list(im.size) != cameras[name]['resolution']:
            raise ValueError('Recorded image dimensions disagree: '+name)
        mask,box=occupancy(im)
        boxes[name]=box
        target=root/(name+'.occupancy.png');mask.save(target)
        masks[target.name]={'sha256':sha(target),'sourceSha256':sha(path),
                           'method':'Black occupancy where render alpha >=128, white background'}
    # One common crop for display only. Camera validation uses original images.
    common=[min(b[0] for b in boxes.values())-24,min(b[1] for b in boxes.values())-24,
            max(b[2] for b in boxes.values())+24,max(b[3] for b in boxes.values())+24]
    font=ImageFont.load_default(size=23);small=ImageFont.load_default(size=17)
    sheet=Image.new('RGB',(1500,1190),'white');draw=ImageDraw.Draw(sheet)
    draw.text((20,15),args.label+' | actual geometry | internal comparison',fill='#26313b',font=font)
    draw.text((20,48),'No artistic approval. Judge form, likeness, joints and attachments together.',fill='#56606b',font=small)
    for i,name in enumerate(PRINCIPAL):
        x,y=(i%3)*500,82+(i//3)*548
        tile=thumbnail(root/(name+'.png'),(480,505),common)
        sheet.paste(tile,(x+(500-tile.width)//2,y))
        draw.text((x+20,y+510),name.upper(),fill='#26313b',font=small)
    sheet.save(root/'contact.png')
    derived={'contact.png':sha(root/'contact.png')}
    turns=[root/f'turn-{a:03}.png' for a in range(0,360,45)]
    if all(p.exists() for p in turns):
        frames=[]
        for p in turns:
            frame=Image.new('RGB',(800,590),'white')
            im=thumbnail(p,(800,540));frame.paste(im,((800-im.width)//2,35))
            ImageDraw.Draw(frame).text((15,12),args.label+' | actual geometry | unapproved',fill='#26313b',font=small)
            frames.append(frame)
        frames[0].save(root/'turntable.gif',save_all=True,append_images=frames[1:],duration=500,loop=0,disposal=2)
        derived['turntable.gif']=sha(root/'turntable.gif')
    if args.reference:
        comp=Image.new('RGB',(1100,880),'white');draw=ImageDraw.Draw(comp)
        for i,(path,label) in enumerate([(args.reference,'Preferred reference (pose differs)'),
                                        (root/'front.png','Current actual geometry')]):
            im=Image.open(path).convert('RGBA');box=im.getchannel('A').getbbox()
            tile=thumbnail(path,(510,750),box)
            comp.paste(tile,(i*550+(550-tile.width)//2,70))
            draw.text((i*550+18,20),label,fill='#26313b',font=small)
        draw.text((18,835),'Preserved aspect ratio. Fit to separate panels; apparent heights may differ. Later corrections apply.',fill='#56606b',font=small)
        comp.save(root/'reference-comparison.png');derived['reference-comparison.png']=sha(root/'reference-comparison.png')
    heights=[b[3]-b[1] for b in boxes.values()];grounds=[b[3] for b in boxes.values()]
    height_spread=(max(heights)-min(heights))/max(heights)
    ground_spread=(max(grounds)-min(grounds))/max(heights)
    if height_spread>.01 or ground_spread>.01:raise ValueError('Principal projection height/ground mismatch')
    result={'approval':None,'scope':'Technical projection checks and internal display, not final-pack eligibility',
            'geometrySha256':sha(root/'geometry.json'),'masks':masks,'derived':derived,
            'heightSpreadFraction':height_spread,'groundSpreadFraction':ground_spread,
            'displayCrop':common,'displayAspectPreserved':True,'referenceSha256':sha(args.reference) if args.reference else None,
            'limitations':['Occupancy only; final front feature cutouts are not asserted',
                           'Technical checks do not establish reference likeness or animation readiness']}
    (root/'review.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:result[k] for k in ['heightSpreadFraction','groundSpreadFraction','approval']}))


if __name__=='__main__':main()
