from pathlib import Path
import json
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass4');T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');base=O.parent/'pass3'
s=(base/'build_groom.py').read_text().replace('B-pq45','B-spm3').replace("luceras-groom/pass3","luceras-groom/pass4").replace('parameters_pass3.json','parameters_pass4.json')
s=s.replace("s.render.threads=8","s.render.threads=6")
s=s.replace("guide=make_curves('Luceras guides',gcoords,gi,co,gc,mat,body,tree)","guide=make_curves('Luceras guides',gcoords[gz!=10],gi[gz!=10],co,gc[gz!=10],mat,body,tree)")
s=s.replace("plume=cz==10\n child=", "body_preservation_hash=hashlib.sha256(coords[(cz!=10)&(cz!=2)&(cz!=7)].astype(np.float32).tobytes()).hexdigest()\n keep_body=cz!=10\n ci,cb,cr,cn,cc,cz,coords,nearest=[v[keep_body] for v in (ci,cb,cr,cn,cc,cz,coords,nearest)]\n # Paw length returns to pass 2 while all other body strand points remain unchanged.\n coords[cz==7]=cr[cz==7,None,:]+(coords[cz==7]-cr[cz==7,None,:])*(.0045/.0035)\n plume=cz==10\n child=")
s=s.replace("gain*=np.where((cz==0)","gain*=np.where((cz==2)&(cc.mean(1)<.35),P['face_response'],1)\n gain*=np.where((cz==0)")
s=s.replace("return [guide,child,whisk]","author_details(body,co,tris,tree,eyes)\n stats=json.loads((OUT/'groom_statistics.json').read_text());stats['guides']=int(sum(gz!=10))+len(P['plume_tufts'])+P['lid_guides']*2;stats['children']=len(cr)+P['tuft_children']*len(P['plume_tufts'])+P['lid_guides']*2*P['lid_children'];stats['rendered_strands']=stats['children']+56;stats['region_child_counts']['10']=P['tuft_children']*len(P['plume_tufts']);stats['body_preservation_hash']=body_preservation_hash;stats['authored_plume_tufts']=len(P['plume_tufts']);stats['eyelid_guides']=P['lid_guides']*2;write('groom_statistics.json',stats)\n return [guide,child,whisk]")
# Face only affects existing dark pigment, keeping the atlas white blaze and muzzle.
s=s.replace("attr(body.data,'coat_color',np.c_[col,np.ones(len(col))],'FLOAT_COLOR')\n skin_gain", "head=(y<-.15)&(z>.49)&(col.mean(1)<.35)\n col[head]*=P['face_skin_response']\n attr(body.data,'coat_color',np.c_[col,np.ones(len(col))],'FLOAT_COLOR')\n skin_gain")
# Open moderate pupil; remove upper iris dark wash that made it half closed.
s=s.replace("horizontal,.29","horizontal,.25").replace("zz,.090","zz,.125").replace("upper.inputs['To Max'].default_value=.30","upper.inputs['To Max'].default_value=.85")
s=s.replace("rim.inputs['To Max'].default_value=.045","rim.inputs['To Max'].default_value=.16")
# authored methods inserted separately
custom=(T/'authored_details_pass4.txt').read_text() if (T/'authored_details_pass4.txt').exists() else ''
s=s.replace('def eye_mat(o):',custom+'\n\ndef eye_mat(o):')
(O/'build_groom.py').write_text(s);(T/'build_groom_pass4.py').write_text(s)
p=json.loads((base/'parameters.json').read_text());p.update(build_id='B-spm3',deliver_on_build=False,samples_preview=32,samples_final=64,preview_size=900,face_response=.72,face_skin_response=.85,lid_guides=192,lid_children=12,tuft_children=6000,tuft_radius=.00013,lid_radius=.00011,plume_white_linear=.80,plume_dark_linear=.055)
p['plume_tufts']=[]
for j,(station,angle,length,width) in enumerate([(0,35,.085,.018),(.13,27,.125,.021),(.24,23,.165,.023),(.36,18,.195,.026),(.48,9,.235,.028),(.60,0,.267,.028),(.72,-10,.291,.026),(.82,-18,.307,.025),(.92,-25,.320,.024),(1,-32,.328,.020)]):
 p['plume_tufts'].append(dict(name=f'crest_{j+1:02}',station=station,side='upper/outer',angle=angle,length=length,width=width,color='dark'))
for j,(station,angle,length,width) in enumerate([(0,-42,.062,.017),(.12,-39,.091,.020),(.24,-37,.121,.023),(.36,-34,.151,.025),(.48,-32,.180,.026),(.60,-30,.208,.027),(.72,-28,.231,.025),(.84,-27,.249,.022)]):
 p['plume_tufts'].append(dict(name=f'inner_white_{j+1:02}',station=station,side='lower/inner',angle=angle,length=length,width=width,color='white'))
(O/'parameters.json').write_text(json.dumps(p,indent=2));(T/'parameters_pass4.json').write_text(json.dumps(p,indent=2))
r=(T/'run_pass3.py').read_text().replace('pass3','pass4').replace("'blender','--wait'","'gpu','--wait'").replace('B-pq45','B-spm3').replace("'-t','8'","'-t','6'")
(T/'run_pass4.py').write_text(r)
