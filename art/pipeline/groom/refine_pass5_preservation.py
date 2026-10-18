from pathlib import Path
T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
s=(O/'build_groom.py').read_text()
needle=" plume=cz==10\n child=make_curves"
block=""" stable=(cz!=2)&(cz!=7)&(cz!=8)&(cz!=10)&~((cz==9)&(cr[:,1]>.61))
 inherited_cc=baseline_cc[keep_body];diff=np.max(abs(cc-inherited_cc),axis=1);changed=stable&(diff>1e-12)
 write('body_root_color_correction.json',{'changed_roots':int(changed.sum()),'max_linear_difference_before':float(diff[stable].max()),'changed_root_bounds':[cr[changed].min(0).tolist(),cr[changed].max(0).tolist()] if changed.any() else None,'method':'Restore original baseline barycentric color on every inherited body strand outside face, paws, ears and distal tail. Full original random material arrays were drawn before all local filtering.'})
 cc[stable]=inherited_cc[stable]
 plume=cz==10
 child=make_curves"""
assert needle in s;s=s.replace(needle,block)
compile(s,'preserve','exec');(O/'build_groom.py').write_text(s);(T/'build_groom_pass5.py').write_text(s)
