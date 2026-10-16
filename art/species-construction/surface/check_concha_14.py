"""Read-only mini sweep while the PC render lease is occupied."""
import runpy
import sys
from pathlib import Path
here=Path(__file__).resolve().parent
sys.path.insert(0,str(here))
from concha_14_paths import baseline
work=here.parents[2]/'untracked/species-construction/akinza/surface/fur-steps'
selected='s12-14' if (work/'s12-14').is_dir() else 's14b'
after=work/('s14c' if '--final' in sys.argv else selected)
for script,args in [('verify_concha_14.py',[baseline(work),after]),
                    ('sweep_fur_12d.py',[after,after/'r']),
                    ('sweep_obstacles_12d.py',[after,after/'r'])]:
    print('14_MINI_CHECK_BEGIN',script,flush=True)
    sys.argv=[script,'--',*map(str,args)]
    runpy.run_path(str(here/script),run_name='__main__')
    print('14_MINI_CHECK_END',script,flush=True)
