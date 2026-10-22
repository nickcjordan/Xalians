"""Install compute; optionally resize its idle Colima VM without changing CI."""
import argparse
from pathlib import Path
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--resize-compute', action='store_true', help='Set idle compute VM to 8 CPUs and 6 GiB')
    args = parser.parse_args()
    here = Path(__file__).resolve().parent
    subprocess.run(['ssh', '-o', 'BatchMode=yes', 'mini',
                    'mkdir -p .mini-blender/build .mini-blender/jobs'], check=True)
    for name, target in [('Dockerfile', 'build/Dockerfile'), ('rdtscp_compat.c', 'build/rdtscp_compat.c'),
                         ('rdtscp_check.c', 'build/rdtscp_check.c'),
                         ('blend_guard.py', 'blend_guard.py'),
                         ('remote.py', 'remote.py')]:
        subprocess.run(['scp', '-q', '-o', 'BatchMode=yes', str(here / name),
                        'mini:.mini-blender/' + target], check=True)
    if args.resize_compute:
        subprocess.run(['ssh', '-o', 'BatchMode=yes', 'mini', '''set -eu
. "$HOME/.mini-runner/env.sh"
test -z "$(docker --host "unix://$HOME/.colima/default/docker.sock" ps -q)" || { echo 'Compute VM has active containers; resize refused' >&2; exit 1; }
nice -n 15 colima stop
nice -n 15 colima start --cpu 8 --memory 6 --activate=false
'''], check=True)
    # Explicit socket prevents any use of the separate CI Docker daemon.
    command = '''set -eu
. "$HOME/.mini-runner/env.sh"
colima status
docker --host "unix://$HOME/.colima/default/docker.sock" ps
python3 "$HOME/.mini-blender/remote.py" priority
nice -n 15 docker --host "unix://$HOME/.colima/default/docker.sock" build --memory 5632m --cpu-shares 128 -t mini-blender:5.2.2 "$HOME/.mini-blender/build"
docker --host "unix://$HOME/.colima/default/docker.sock" run --rm --cpus 8 --memory 5632m --memory-swap 5632m mini-blender:5.2.2 --version
'''
    subprocess.run(['ssh', '-o', 'BatchMode=yes', 'mini', command], check=True)


if __name__ == '__main__':
    main()
