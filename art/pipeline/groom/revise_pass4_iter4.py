from pathlib import Path
import json,math
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass4');T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom')
s=(O/'build_groom.py').read_text();(O/'build_groom_iter3.py').write_text(s)
s=s.replace("radius+.0015,radius+.005,d","radius+.0005,radius+.0025,d")
s=s.replace("radials*.020+outward*.001","radials*.022+outward*.001")
s=s.replace("(.065,.060,.057));lidrecords=[]", "(.110,.100,.095));lidrecords=[]\n lr=next(n for n in lidmat.node_tree.nodes if n.bl_idname=='ShaderNodeValToRGB').color_ramp;lr.elements[0].color=(.075,.068,.064,1);lr.elements[1].color=(.012,.011,.010,1);le=lr.elements.new(.86);le.color=(.12,.11,.105,1)")
s=s.replace("*.0156+vertical[None,:]*np.sin(aa)[:,None]*.0117", "*P['lid_open_width']+vertical[None,:]*np.sin(aa)[:,None]*P['lid_open_height']")
s=s.replace("'opening_horizontal_radius':.0156,'opening_vertical_radius':.0117", "'opening_horizontal_radius':P['lid_open_width'],'opening_vertical_radius':P['lid_open_height']")
s=s.replace("jitter[:,None,None]*np.sin(np.pi*t)","jitter[:,None,None]*np.sin(np.pi*t);coords+=horizontal[None,None,:]*np.sin(aa)[:,None,None]*.00045*np.sin(np.pi*t)")
s=s.replace("np.ones(len(aa)),'FLOAT','CURVE'", "prng.uniform(.85,1.15,len(aa)),'FLOAT','CURVE'")
s=s.replace("data.ortho_scale=.35;target=Vector((0,-.205,.58))", "data.ortho_scale=.43;target=Vector((0,-.205,.585))")
s=s.replace("keep_body=(cz!=10)","transition=(cz==9)&(cr[:,1]>.61)\n coords[transition]=cr[transition,None,:]+cn[transition,None,:]*.002*t+np.array([0,.002,.007])[None,None,:]*t\n keep_body=(cz!=10)")
s=s.replace("write('build_state.json',{'build_id'", "write('build_state.json',{'script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'parameters_sha256':hashlib.sha256(Path(args.parameters).read_bytes()).hexdigest(),'build_id'")
s=s.replace("'stage':'final' if final else 'preview','guides'", "'stage':'final' if final else 'preview','build_state':json.loads((OUT/'build_state.json').read_text()),'guides'")
start=s.index('def deformation_proof():');end=s.index("if args.mode in ('build','build_final')",start);s=s[:start]+(T/'deformation_pass4.txt').read_text()+'\n\n'+s[end:]
# White band stays white at its roots; dark tufts retain shaded roots.
s=s.replace("*[v*.48 for v in color]", "*[v*(.80 if name=='Authored plume white' else .48) for v in color]")
s=s.replace("prng.uniform(.40,1.75,groups)[group]", "prng.uniform(.78,1.18,groups)[group] if white else prng.uniform(.45,1.45,groups)[group]")
(O/'build_groom_iter4_candidate.py').write_text(s)
p=json.loads((O/'parameters.json').read_text());p.update(plume_dark_linear=.060,lid_open_width=.0152,lid_open_height=.0135)
for j,tuft in enumerate(p['plume_tufts']):
 y=.640+.055*tuft['station'];angle=math.radians(tuft['angle']);dy=math.sin(angle)*tuft['length'];dz=math.cos(angle)*tuft['length'];target_y=.66+((y+dy)-.66)*.8;dy=target_y-y;dz+=[.004,-.004,.006,-.003,.007,-.004,.003,-.003,.002,0][j%10];tuft['angle']=math.degrees(math.atan2(dy,dz));tuft['length']=math.hypot(dy,dz)
(O/'parameters_iter4_candidate.json').write_text(json.dumps(p,indent=2))
