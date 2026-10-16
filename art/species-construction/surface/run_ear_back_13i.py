"""Run one 13i job in the exclusive local PC Blender slot.

The restart excludes mini compute until its earlier render hang is understood.
This wrapper uses the established serial runner and never changes other jobs.
"""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
script, name, *args = sys.argv[1:]
raise SystemExit(subprocess.call([
    sys.executable, str(HERE / 'run_fur_12e.py'), script,
    '13i-local-' + name + '.log', '--', *args,
]))
