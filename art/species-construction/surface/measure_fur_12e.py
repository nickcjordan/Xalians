"""Measure final saved tails, compare every artifact flag, and assemble review pairs."""
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from tail_profile_12e import coordinates, widths


def main():
    p=argparse.ArgumentParser();p.add_argument('--before',type=Path,required=True);p.add_argument('--after',type=Path,required=True)
    a=p.parse_args();base=a.after.parent
    b=np.load(a.before/'r/evidence.npz');z=np.load(a.after/'r/evidence.npz')
    f=np.load(a.before/'r/sweep-flags.npz');g=np.load(a.after/'r/sweep-flags.npz');c=np.load(a.before/'r/collision-evidence.npz')
    assert np.array_equal(b['starts'],z['starts']) and np.array_equal(b['roots'],z['roots'])
    tails=coordinates(b,f,c['nearest']);before=widths(b,tails,c['nearest']);after=widths(z,tails,c['nearest'])
    comparisons=[dict(tail=x['tail'],views={k:dict(beforeJump=x['views'][k]['largestJump'],afterJump=y['views'][k]['largestJump'],jumpRatio=y['views'][k]['largestJump']/x['views'][k]['largestJump'],midWidthRatio=y['views'][k]['midWidth']/x['views'][k]['midWidth'],beforeExtremaJump=float(abs(np.diff(x['views'][k]['extrema'])).max()),afterExtremaJump=float(abs(np.diff(y['views'][k]['extrema'])).max())) for k in x['views']}) for x,y in zip(before,after)]
    metrics=dict(method='48 identical geometry-derived anatomical root-to-tip stations per tail; spatial nearest-centerline assignment of all saved hair points plus fixed skin vertices, with linear longitudinal projection past either endpoint instead of clamping overshooting samples into the endpoint bin; transverse 1st-99th percentile width and raw extrema; exact side/back 4-degree elevations; no output smoothing; fixed point counts before and after',before=before,after=after,comparison=comparisons)
    names=['chest-ribs','neck','head','ears','arms','hands','hips','legs','feet','tails']
    metrics['artifactGate']={}
    for key in ['collision','neighborLength','regionalLength','partTransfer','lift']:
        metrics['artifactGate'][key]=dict(newStrandFlags=int((g[key]&~f[key]).sum()),regions={name:dict(before=int((f[key]&(f['region']==i)).sum()),after=int((g[key]&(g['region']==i)).sum())) for i,name in enumerate(names)})
    patch=np.load(a.after/'patch-evidence.npz');selected=patch['changed'];counts=np.diff(np.r_[b['starts'],len(b['points'])])
    assert np.array_equal(b['points'][~np.repeat(selected,counts)],z['points'][~np.repeat(selected,counts)])
    moved=np.maximum.reduceat(np.linalg.norm(z['points']-b['points'],axis=1),b['starts'])>0
    metrics['scope']=dict(unselectedPointsEqual=True,rootsEqual=True,selectedCurves=int(selected.sum()),actualMovedCurves=int(moved.sum()),trueTailCurves=int((patch['tail_id']>0).sum()),hipBlendCurves=int((patch['hip_blend']>0).sum()))
    metrics['overall']=dict(beforeLargestJump=max(v['beforeJump'] for x in comparisons for v in x['views'].values()),afterLargestJump=max(v['afterJump'] for x in comparisons for v in x['views'].values()),minimumMidWidthRatio=min(v['midWidthRatio'] for x in comparisons for v in x['views'].values()))
    metrics['endpointMethod']='Beyond-tip samples retain their forward longitudinal coordinate. They are not collapsed into the last anatomical station. Earlier clamped preview statistics are superseded by this corrected saved-result measurement.'
    metrics['overall']['beforeInteriorLargestJump']=max(float(abs(np.diff(x['views'][k]['width'][1:-1])).max()) for x in before for k in x['views'])
    metrics['overall']['afterInteriorLargestJump']=max(float(abs(np.diff(x['views'][k]['width'][1:-1])).max()) for x in after for k in x['views'])
    (base/'12e-metrics.json').write_text(json.dumps(metrics,indent=2))
    font=ImageFont.truetype('arial.ttf',22);small=ImageFont.truetype('arial.ttf',17)
    for view in ['tails-side','tails-back','tails-threequarter']:
        paths=[base/'12e-before'/f'{view}.png',a.after/'r'/f'{view}.png']
        if not all(x.exists() for x in paths):continue
        pair=Image.new('RGB',(2048,1060),'white');draw=ImageDraw.Draw(pair)
        for j,path in enumerate(paths):
            im=Image.open(path).convert('RGB');assert im.size==(1024,1024)
            pair.paste(im,(j*1024,36));draw.text((j*1024+12,6),['Before: 12d','Now: 12e'][j],font=font,fill='black')
        pair.save(base/f'12e-{view}.png')
    chart=Image.new('RGB',(1400,1060),'white');draw=ImageDraw.Draw(chart)
    draw.text((40,15),'Tail silhouette widths: 48 fixed stations per tail',font=font,fill='black')
    draw.text((40,47),'Blue: before 12d   Amber: after 12e   Solid: 1st-99th percentile   Dotted: extrema',font=small,fill='black')
    colors=['#2675BC','#C8840D'];maxwidth=max(max(v['extrema']) for data in [before,after] for x in data for v in x['views'].values())*1.04
    for row in range(3):
        for col,view in enumerate(['side','back']):
            x0=75+col*690;y0=125+row*300;w=585;h=215
            draw.text((x0,y0-28),f'Tail {row+1} ({["upper","middle","lower"][row]}), {view}',font=font,fill='black')
            for tick in range(5):
                yy=y0+h-h*tick/4;draw.line((x0,yy,x0+w,yy),fill='#DDDDDD');draw.text((x0-55,yy-9),f'{maxwidth*tick/4:.2f}',font=small,fill='black')
            for j,data in enumerate([before,after]):
                v=data[row]['views'][view]
                for field in ['width','extrema']:
                    pts=[(x0+k*w/47,y0+h-h*value/maxwidth) for k,value in enumerate(v[field])]
                    if field=='width':draw.line(pts,fill=colors[j],width=3)
                    else:
                        for k in range(0,47,2):draw.line(pts[k:k+2],fill=colors[j],width=1)
            draw.text((x0,y0+h+7),'root',font=small,fill='black');draw.text((x0+w-25,y0+h+7),'tip',font=small,fill='black')
    draw.text((40,1000),'Widths in fixed figure units. Raw station populations and values: 12e-metrics.json.',font=small,fill='black')
    draw.text((40,1028),'Fixed anatomical root-to-tip stations; beyond-tip hairs project forward without endpoint accumulation.',font=small,fill='black')
    chart.save(base/'12e-width-profile.png')
    print(json.dumps(dict(overall=metrics['overall'],comparison=comparisons,artifactGate=metrics['artifactGate']),indent=2))


if __name__=='__main__':main()
