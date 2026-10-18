from pathlib import Path
T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass4')
p=T/'authored_details_pass4.txt';s=p.read_text();s='\n'.join(x for x in s.splitlines() if 'if False else' not in x)+'\n';p.write_text(s)
s=(T/'compose_pass3.py').read_text().replace("luceras-groom/pass3","luceras-groom/pass4").replace('B-pq45','B-spm3')
s=s[:s.index("if not a.iteration:\n images=")]
s+='''\nif not a.iteration:
 for view in ('side','head'):
  images=[Image.open(OUT.parent/'pass3'/('render_'+view+'.png')).convert('RGB'),Image.open(OUT/('render_'+view+'.png')).convert('RGB'),Image.open(BLOB/refs[view][:2]/refs[view]).convert('RGB')]
  h=images[1].height;images=[im.resize((round(im.width*h/im.height),h),Image.Resampling.LANCZOS) for im in images];canvas=Image.new('RGB',(sum(im.width for im in images),h+36),(35,35,35));d=ImageDraw.Draw(canvas);x=0
  for im,label in zip(images,['Pass 3 delivered render (mixed older state)','B-spm3 pass 4 final','Approved sheet']):
   canvas.paste(im,(x,36));d.text((x+10,8),label,fill='white');x+=im.width
  canvas.save(OUT/('composite_'+view+'_pass3_pass4_sheet.png'))
'''
(T/'compose_pass4.py').write_text(s)
(T/'WORK_RECORD_pass4.md').write_text('''# Luceras B-spm3 pass 4

Started 2026-10-16 21:39:14 UTC. Edit cutoff 22:27:14 UTC. Hard stop 22:39:14 UTC.

Authorized scope: preserve iteration 11 body groom, author 18 named isolated plume tufts and eyelid guide rings, restore gray paws, darken face slate while preserving white atlas regions, render complete current proof and deformation test. No sculpt geometry changes, git, installs or paid services.

Evidence: pass3 iteration 11 code and parameters were frozen but not built. Its saved blend is iteration 10, and some delivered views are iteration 9. Use iteration 11 deterministic generator as requested and label pass3 comparisons honestly.

Iteration 1: new tuft and eyelid methods implemented. Preview side, tail and head rendering. Next: inspect against sheet, correct defects, measure masks, verify all outputs and final freshness. Body RNG sequence retained before replacing the plume.

Completion requires current eight-view Cycles proof, all sheet comparisons, runtime comparisons, three-column head and side comparisons, deformation proof, geometry and strand checks, measured costs and hashed report. Artistic approval remains with Nick.
''')
