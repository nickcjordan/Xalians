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
parser.add_argument('--part', choices=['13c','13c-fix'], default='13c')
parser.add_argument('--reuse-details', action='store_true', help='Keep already inspected details from the same saved surface; rerender all six current views.')
args = parser.parse_args()
before, after = args.before, args.after

def run(*args):
    subprocess.run([sys.executable, *map(str, args)], check=True)

views='ears-front,ear-root-close,ear-tip-close,head-side,head-backq,body-backq,body-front,tails-side'
if args.reuse_details:
    assert all((after/'r'/f'{view}.png').exists() for view in ['ear-root-close','ear-tip-close'])
    views='ears-front,head-side,head-backq,body-backq,body-front,tails-side'
run(HERE / 'run_fur_12e.py', 'review_fur_13.py', f'{args.part}-final-views.log', '--',
    '--surface', after, '--out', after / 'r', '--views',
    views,
    '--samples', '32', '--palette', 'T7')
run(HERE / 'check_fur_13.py', before, after, '13c')
run(HERE / 'pairs_fur_13.py', WORK / f'{args.part}-before', after, args.part)
