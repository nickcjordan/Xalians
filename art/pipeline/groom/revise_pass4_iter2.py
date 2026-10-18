from pathlib import Path
import json,math
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass4');T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom')
p=json.loads((O/'parameters.json').read_text());p.update(tuft_children=4500,tuft_radius=.000095,plume_dark_linear=.060,plume_white_linear=.70)
# Explicit silhouette targets translated into the required angle and length fields.
outer=[(.742,.375),(.772,.418),(.780,.461),(.766,.505),(.741,.545),(.699,.584),(.652,.618),(.600,.640),(.552,.650),(.510,.665)]
inner=[(.650,.354),(.636,.388),(.620,.425),(.601,.459),(.582,.492),(.562,.522),(.547,.550),(.533,.574)]
for j,tuft in enumerate(p['plume_tufts']):
 u=tuft['station'];y=.640+.055*u;z=.292+.070*u**1.45;target=(outer if j<10 else inner)[j if j<10 else j-10];dy=target[0]-y;dz=target[1]-z;tuft['angle']=math.degrees(math.atan2(dy,dz));tuft['length']=math.hypot(dy,dz);tuft['width']=.017 if j<10 else .016
p['tuft_root_y_start']=.640;p['tuft_root_y_span']=.055
(O/'parameters_iter2_candidate.json').write_text(json.dumps(p,indent=2))
s=(T/'authored_details_pass4.txt').read_text().replace("y=.610+.085*u","y=P['tuft_root_y_start']+P['tuft_root_y_span']*u")
s=s.replace("h.inputs['Coat'].default_value=.08;lk.new(h.outputs[0],out.inputs[0]);return m", "h.inputs['Coat'].default_value=.08;at=ns.new('ShaderNodeAttribute');at.attribute_name='detail_tone';info=ns.new('ShaderNodeHairInfo');ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(*[v*.48 for v in color],1);ramp.color_ramp.elements[1].color=(*[min(v*1.25,1) for v in color],1);lk.new(info.outputs['Intercept'],ramp.inputs[0]);mul=ns.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1;lk.new(ramp.outputs[0],mul.inputs[1]);lk.new(at.outputs['Fac'],mul.inputs[2]);lk.new(mul.outputs[0],h.inputs['Color']);lk.new(h.outputs[0],out.inputs[0]);return m")
s=s.replace("v=prng.uniform(.62,1,c)","v=prng.uniform(.76,1,c)")
s=s.replace("coords+=np.sin(tt*22+phase)*.00055", "coords+=np.sin(tt*22+phase)*.0013")
s=s.replace("h['tuft_name']=tuft['name']", "attr(h.data,'detail_tone',prng.uniform(.65,1.35,c),'FLOAT','CURVE');h['tuft_name']=tuft['name']")
s=s.replace("lidrecords.append({'eye'", "attr(h.data,'detail_tone',np.ones(len(aa)),'FLOAT','CURVE')\n  lidrecords.append({'eye'")
(T/'authored_details_pass4.txt').write_text(s)
