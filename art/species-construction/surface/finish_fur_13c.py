"""Verify the saved ear-lock candidate and refresh the final review views."""
import argparse
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--before', type=Path, default=WORK / 's12-13b')
parser.add_argument('--after', type=Path, default=WORK / 's12-13c')
args = parser.parse_args()
before, after = args.before, args.after

def run(*args):
    subprocess.run([sys.executable, *map(str, args)], check=True)

run(HERE / 'run_fur_12e.py', 'review_fur_13.py', '13c-final-views.log', '--',
    '--surface', after, '--out', after / 'r', '--views',
    'ears-front,ear-root-close,ear-tip-close,head-side,head-backq,body-backq,body-front,tails-side',
    '--samples', '32', '--palette', 'T7')
run(HERE / 'check_fur_13.py', before, after, '13c')
run(HERE / 'pairs_fur_13.py', WORK / '13c-before', after, '13c')
