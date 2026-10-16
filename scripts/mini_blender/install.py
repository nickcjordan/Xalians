"""Install in the mini's existing idle Colima VM without changing VM or CI configuration."""
from pathlib import Path
import subprocess


def main():
    here = Path(__file__).resolve().parent
    subprocess.run(['ssh', '-o', 'BatchMode=yes', 'mini',
                    'mkdir -p .mini-blender/build .mini-blender/jobs'], check=True)
    for name, target in [('Dockerfile', 'build/Dockerfile'), ('rdtscp_compat.c', 'build/rdtscp_compat.c'),
                         ('rdtscp_check.c', 'build/rdtscp_check.c'),
                         ('remote.py', 'remote.py')]:
        subprocess.run(['scp', '-q', '-o', 'BatchMode=yes', str(here / name),
                        'mini:.mini-blender/' + target], check=True)
    # Do not start, resize, stop or switch the user's existing VMs. Explicit
    # Docker socket prevents any use of the separate CI Docker daemon.
    command = '''set -eu
. "$HOME/.mini-runner/env.sh"
colima status
docker --host "unix://$HOME/.colima/default/docker.sock" ps
python3 "$HOME/.mini-blender/remote.py" priority
nice -n 15 docker --host "unix://$HOME/.colima/default/docker.sock" build --memory 3g --cpu-shares 128 -t mini-blender:5.2.2 "$HOME/.mini-blender/build"
docker --host "unix://$HOME/.colima/default/docker.sock" run --rm --cpus 3 --memory 3g --memory-swap 3g mini-blender:5.2.2 --version
'''
    subprocess.run(['ssh', '-o', 'BatchMode=yes', 'mini', command], check=True)


if __name__ == '__main__':
    main()
