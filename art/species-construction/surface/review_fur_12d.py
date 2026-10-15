"""Step 12d review cameras recovered from step 10f's render script."""
import sys
from pathlib import Path
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_surface as render
render.VIEWS.update({
 'held-head-side': (90, 2, Vector((0, -.12, .58)), .42, 1024, 1024),
 'held-ears-front': (0, 3, Vector((0, -.02, .74)), 1.35, 1024, 667),
 'held-sole': (180, -78, Vector((.345, -.045, -.95)), .27, 1024, 1024),
 'body-backq': (145, 8, Vector((0, .16, -.03)), 2.05, 768, 1024),
 'body-front': (0, 4, Vector((0, .16, -.03)), 2.05, 768, 1024),
 'chest-front': (0, 4, Vector((0, -.05, .25)), .75, 1024, 1024),
 'chest-threequarter': (38, 6, Vector((0, -.03, .25)), .75, 1024, 1024),
 'chest-underarm': (55, -22, Vector((.13, -.02, .24)), .42, 1024, 1024),
})
if __name__ == '__main__':
 if '--extract' in sys.argv:
  from review_fur_12c import export
  surface = Path(sys.argv[sys.argv.index('--surface')+1])
  out = Path(sys.argv[sys.argv.index('--out')+1]); out.mkdir(parents=True, exist_ok=True)
  export(surface, out)
  sys.argv.remove('--extract')
 render.main()
