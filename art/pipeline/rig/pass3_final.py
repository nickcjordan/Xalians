import bpy,sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from pass3 import p,r,BASE
import pass2_export,pass3_additional as pass2_additional_checks,pass3_preservation
pass3_preservation.main()
try:pass2_export.main()
except AssertionError as e:p.write('measurement_assertion.json',{'error':str(e)})
f=json.loads((p.OUT/'measurements.json').read_text());f['build_id']='B-a87k';p.write('measurements.json',f)
try:pass2_additional_checks.main()
except Exception as e:p.write('additional_exception.json',{'error':str(e)})
rig=p.openfile(p.OUT/'rig.blend');r.renders(rig,'final',True);p.detail(rig,'after')

