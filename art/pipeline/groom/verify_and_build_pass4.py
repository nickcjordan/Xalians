"""Independent frozen-baseline attribute check followed by the production build."""
import runpy,sys
T='/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/groom/'
O='/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass4/'
sys.argv=['blender','--','--parameters',O+'baseline11_parameters.json','--out',O+'baseline11','--iteration','11','--mode','build']
runpy.run_path(T+'verify_baseline11_materials.py',run_name='__main__')
sys.argv=['blender','--','--parameters',O+'parameters.json','--iteration','6','--mode','build']
runpy.run_path(O+'build_groom.py',run_name='__main__')
