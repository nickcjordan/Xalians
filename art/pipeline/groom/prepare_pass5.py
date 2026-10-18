from pathlib import Path
import json,math
T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom')
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
s=(O.parent/'pass4/build_groom_iter6_candidate.py').read_text().replace('B-spm3','B-7qgf').replace('luceras-groom/pass4','luceras-groom/pass5').replace('parameters_pass4.json','parameters_pass5.json')
p=json.loads((O/'baseline_iter6/parameters.json').read_text());p.update(build_id='B-7qgf',deliver_on_build=False,samples_preview=48,samples_final=64,samples_tail_final=96,tuft_root_y_start=.580,tuft_root_y_span=.115,tuft_children=3600,supersample=4,samples_small=128,pixel_filter_width=1.0,small_denoise=False)
p['plume_tufts']=[]
for color in ['dark','white']:
 for i in range(14):
  u=i/13
  p['plume_tufts'].append(dict(name=('crest_' if color=='dark' else 'inner_white_')+str(i+1).zfill(2),station=u,side='upper/outer' if color=='dark' else 'lower/inner',angle=65-92*u if color=='dark' else 42-79*u,length=.027+.272*u**1.40 if color=='dark' else .022+.191*u**1.25,width=.005+.013*u if color=='dark' else .005+.011*u,color=color))
s=s.replace("(co[:,1]>.60),2]", "(co[:,1]>.53),2]")
s=s.replace("guide[:,:,1]+=.018*np.sin(np.pi*t[0,:,0])", "guide[:,:,1]+=length*.08*np.sin(np.pi*t[0,:,0])")
s=s.replace("groups=24;group=np.arange(c)%groups;ends=.35+.54*prng.beta(2,2,groups);ends[0]=1.0", "groups=40;group=np.arange(c)%groups;ends=.72+.28*prng.beta(2,2,groups);ends[0]=1.0")
s=s.replace('envelope=np.sin(np.pi*tt)**.70','envelope=np.sin(np.pi*t)**.85')
s=s.replace("*.026*np.sin(np.pi*tt[:,:,0])", "*.010*np.sin(np.pi*t[0,:,0])")
s=s.replace("end_offsets*=width*.44", "end_offsets*=width*.24")
s=s.replace("*.0018*np.sin(np.pi*t)**.8", "*min(.0011,length*.015)*np.sin(np.pi*t)**.8")
s=s.replace("*.0012*np.sin(np.pi*t)","*min(.0008,length*.012)*np.sin(np.pi*t)")
# Keep random draws and original body code unchanged. Local edits happen later.
s=s.replace("s.cycles.denoiser='OPENIMAGEDENOISE'", "s.cycles.denoiser='OPENIMAGEDENOISE';s.cycles.filter_width=P.get('pixel_filter_width',1.0)")
s=s.replace("data.type='ORTHO';data.ortho_scale", "data.type='ORTHO';data.dof.use_dof=False;data.ortho_scale")
s=s.replace("for view in views:\n", "for view in views:\n")
s=s.replace("s.render.resolution_x=size;s.render.resolution_y=size;s.render.resolution_percentage=100", "target_size=size;size*=P.get('supersample',4) if view in ('sprite','portrait') else 1;s.render.resolution_x=size;s.render.resolution_y=size;s.render.resolution_percentage=100;s.camera.data.dof.use_dof=False;s.cycles.filter_width=P.get('pixel_filter_width',1.0);s.cycles.use_denoising=P.get('small_denoise',False) if view in ('sprite','portrait') else P['denoise']")
s=s.replace("name=('render_' if final else 'iter'+args.iteration+'_')+view+'.png';", "s.cycles.samples=P.get('samples_small',128) if view in ('sprite','portrait') else s.cycles.samples;name=('render_' if final else 'iter'+args.iteration+'_')+view+('_4x' if view in ('sprite','portrait') else '')+'.png';")
s=s.replace("'width':s.render.resolution_x,'height':s.render.resolution_y,", "'width':s.render.resolution_x,'height':s.render.resolution_y,'target_size':target_size,'pixel_filter_width':s.cycles.filter_width,'depth_of_field':s.camera.data.dof.use_dof,")
compile(s,'pass5','exec')
(O/'build_groom.py').write_text(s);(T/'build_groom_pass5.py').write_text(s)
(O/'parameters.json').write_text(json.dumps(p,indent=2));(T/'parameters_pass5.json').write_text(json.dumps(p,indent=2))
runner=(T/'run_pass4.py').read_text().replace('pass4','pass5').replace('B-spm3','B-7qgf')
(T/'run_pass5.py').write_text(runner)
