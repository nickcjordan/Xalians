"""Render the native step 14 comparisons and six established current views."""
import sys
import hashlib
import json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import review_fur_13
import render_surface as render
from mathutils import Vector
# Same established 62-degree root view, aimed at the new cup to keep it in frame.
render.VIEWS['ear-root-close']=(62,4,Vector((.205,.005,.692)),.24,1024,1024)
args=sys.argv[sys.argv.index('--')+1:]
source=Path(args[args.index('--surface')+1]);out=Path(args[args.index('--out')+1])
source_hash=hashlib.sha256((source/'surface.blend').read_bytes()).hexdigest()
render.main()
(out/'source.json').write_text(json.dumps(dict(surfaceSha256=source_hash,
    viewSourceSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()),indent=2)+'\n')
