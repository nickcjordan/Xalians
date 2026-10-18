from pathlib import Path
import json
T=Path(__file__).parent;O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass2');p=T/'build_groom_pass2.py';s=p.read_text()
s=s.replace("dd[zone==10]*=.20","dd[zone==10]*=.022")
s=s.replace("np.where(cz==2,P['root_radius']*.65,P['root_radius'])", "np.where(cz==10,P.get('plume_radius',.00018),np.where(cz==2,P['root_radius']*.75,P['root_radius']))")
s=s.replace("r=np.linspace(1,.008,pts)**1.25", "r=np.linspace(1,.015,pts)**.8")
s=s.replace("scale.inputs[2].default_value=(.38,.38,.38,1)","scale.inputs[2].default_value=(.75,.75,.75,1)")
s=s.replace("np.full(28,.00020)","np.full(28,.00035)")
s=s.replace("bare_nose=(coords[:,:,1]<-.300)","bare_nose=(coords[:,:,1]<-.303)").replace("(abs(coords[:,:,0])<.020)","(abs(coords[:,:,0])<.018)")
s=s.replace("d=np.linalg.norm(co-center,axis=1);rim=(1-smooth(radius+.002,radius+.010,d))", "d=np.linalg.norm(co-center,axis=1);rim=(1-smooth(radius+.004,radius+.013,d))")
s=s.replace("rim[:,None]*.8","rim[:,None]*.97")
# Add small surface-bound follicle marks at the actual whisker roots.
s=s.replace("write('groom_statistics.json'", "dots=np.array(wr)[:,0:1,:]+np.linspace(0,.00035,3)[None,:,None]*np.array([0,0,1])[None,None,:]\n dotmat=whiskmat.copy();dotmat.name='Dark whisker follicles';dh=next(n for n in dotmat.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfHairPrincipled');dh.inputs['Color'].default_value=(.015,.012,.010,1)\n make_curves('Luceras whisker follicles',dots,np.array(wi),co,np.tile([.015,.012,.010],(28,1)),dotmat,body,tree,np.full(28,.00065))\n write('groom_statistics.json'")
s=s.replace("'whiskers':28,'rendered_strands':len(cr)+28", "'whiskers':28,'follicle_curves':28,'rendered_strands':len(cr)+56")
p.write_text(s);(O/'build_groom.py').write_text(s)
P=json.loads((O/'parameters.json').read_text());P.update(hair_dark_scale=3.1,plume_lock_width=.008,plume_radius=.00020,flank_gain=1.5);(O/'parameters.json').write_text(json.dumps(P,indent=2));(T/'parameters_pass2.json').write_text(json.dumps(P,indent=2))
notes=json.loads((O/'iter_notes.json').read_text());notes.append({'iteration':2,'renders':['iter2_side.png','iter2_head.png','iter2_tail_plume.png'],'coat_value':{'back_srgb':[66,64,64],'flank_srgb':[68,65.5,65],'bib_srgb':[196,197,196.5],'finding':'Still dark relative to requested 80/77/75 and 99/94/92.'},'pattern_placement':'White foreleg front visible, continuous plume underside remains too weak.','fur_length_by_region':'Head and neck fur clear, bib softer than sheet.','outline_shagginess':'Body improved but still airy guard hairs.','plume_shape':'Smoky crescent persists. Two attempts show guide crowding and thin strands cannot give opaque locks. Change representation to fewer guides and much denser individual locks.','face':'Whiskers too faint; muzzle edge still rectangular.','eyes':'Amber returned with round catchlight; rim still weak.','horns':'Dark brown and bronze crests improved.','changed_next':['Reduce plume guide count by about 90 percent while retaining child count','Widen plume lock bodies and increase radius for opacity','Increase undercoat and hair response, preserving root contrast','Increase whisker radius and add small surface-bound follicle marks','Widen dark eye rim and permit fur along nose margins']});(O/'iter_notes.json').write_text(json.dumps(notes,indent=2))
