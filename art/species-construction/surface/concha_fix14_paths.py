"""Locate the immutable step 14 before surface after verified archival."""
from pathlib import Path
def baseline(work):
 candidates=[work/'s12-14',Path('/job/work/baseline14'),Path('C:/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12-14-superseded-14-fix'),Path('/mnt/c/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12-14-superseded-14-fix')]
 for path in candidates:
  if (path/'surface.blend').is_file():return path
 raise FileNotFoundError('Exact step 14 baseline is unavailable')
