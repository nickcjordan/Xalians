"""Keep the local Blender tree inside the lifetime of its slot owner."""
import os
import signal
import subprocess
import sys
import threading


def run(command):
    process = subprocess.Popen(command, start_new_session=os.name != 'nt')

    def terminate():
        if process.poll() is None:
            if os.name == 'nt':
                subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
        process.wait()

    def monitor():
        try:
            while sys.stdin.buffer.read(1):
                pass
        finally:
            terminate()

    threading.Thread(target=monitor, daemon=True).start()
    try:
        return process.wait()
    finally:
        terminate()


if __name__ == '__main__':
    sys.exit(run(sys.argv[1:]))
