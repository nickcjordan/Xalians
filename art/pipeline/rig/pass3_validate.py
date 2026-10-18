import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import compensate_glb as c
c.OUT=Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-rig/pass3');c.main()
import verify_glb_vertices as v
v.OUT=c.OUT;v.main()
