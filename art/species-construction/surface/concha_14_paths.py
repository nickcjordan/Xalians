"""Locate the unchanged 13i baseline before and after its authorized archive."""
from pathlib import Path


def baseline(work):
    suffix='Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12-13i-superseded-14'
    for path in (work/'s12-13i',Path('/job/work/baseline13i'),Path('C:/'+suffix),Path('/mnt/c/'+suffix)):
        if (path/'surface.blend').is_file():return path
    raise FileNotFoundError('13i baseline is required; see fur-14-archive.json for its retained location')
