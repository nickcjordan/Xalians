"""Locate the immutable before surface for the second step14 fix pass."""
from pathlib import Path
def baseline(work):
 for folder in [work/'s12-14-fix3',Path('C:/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12-14-fix3-superseded-14-fix2'),Path('/mnt/c/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12-14-fix3-superseded-14-fix2')]:
  if (folder/'surface.blend').exists():return folder
 raise FileNotFoundError('Step14fix before surface is unavailable')
