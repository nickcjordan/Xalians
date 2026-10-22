#!/usr/bin/env python3
"""Machine slot lock for heavy pipeline work (design section 10). Python 3 stdlib only.

  slot.py acquire <class> [--wait SECONDS] [--owner TEXT]   print token, exit 0; exit 3 on timeout
  slot.py release <token>
  slot.py run <class> [--wait SECONDS] [--owner TEXT] -- <command...>
  slot.py status

Classes: blender (capacity 1, or 2 with >9 GB free RAM and low load), gpu (capacity 1).
A gpu holder and a blender holder never run together (reconstruction never beside a Blender render).
Works from Windows and from WSL; both resolve to C:\\dev\\art-data\\pipeline\\locks unless XALIANS_LOCKS is set.
"""
import argparse, json, os, shutil, subprocess, sys, threading, time, uuid

CLASSES = ("blender", "gpu")
EXIT_TIMEOUT = 3


def env_num(name, default):
    try:
        return float(os.environ[name])
    except (KeyError, ValueError):
        return default


def beat_interval():
    return env_num("XALIANS_BEAT", 10.0)


def stale_after():
    return env_num("XALIANS_STALE", 60.0)


def poll_interval():
    return env_num("XALIANS_POLL", 5.0)


def locks_root():
    if os.environ.get("XALIANS_LOCKS"):
        return os.environ["XALIANS_LOCKS"]
    if os.name != "nt" and os.path.isdir("/mnt/c"):
        return "/mnt/c/dev/art-data/pipeline/locks"
    return r"C:\dev\art-data\pipeline\locks"


def host_kind():
    if os.name == "nt":
        return "win"
    try:
        with open("/proc/version") as f:
            if "microsoft" in f.read().lower():
                return "wsl"
    except OSError:
        pass
    return "posix"


def pid_alive(pid):
    if os.name == "nt":
        import ctypes
        k = ctypes.windll.kernel32
        h = k.OpenProcess(0x1000, False, int(pid))  # PROCESS_QUERY_LIMITED_INFORMATION
        if not h:
            return False
        code = ctypes.c_ulong()
        ok = k.GetExitCodeProcess(h, ctypes.byref(code))
        k.CloseHandle(h)
        return bool(ok) and code.value == 259  # STILL_ACTIVE
    try:
        os.kill(int(pid), 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


# ---------- resources ----------

def free_ram_gb():
    try:
        import psutil
        return psutil.virtual_memory().available / 2**30
    except ImportError:
        pass
    if os.name == "nt":
        try:
            out = subprocess.run(
                ["powershell", "-NoProfile", "-Command",
                 "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory"],
                capture_output=True, text=True, timeout=20).stdout.strip()
            return int(out) / 2**20  # KB -> GB
        except Exception:
            pass
        try:
            out = subprocess.run(["wmic", "OS", "get", "FreePhysicalMemory", "/value"],
                                 capture_output=True, text=True, timeout=20).stdout
            for line in out.splitlines():
                if line.startswith("FreePhysicalMemory="):
                    return int(line.split("=")[1]) / 2**20
        except Exception:
            pass
        return None
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemAvailable:"):
                    return int(line.split()[1]) / 2**20
    except OSError:
        pass
    return None


def load_is_low():
    """True when the 1-minute CPU load is low; True (test skipped) where it cannot be read."""
    try:
        import psutil
        load = psutil.getloadavg()[0]
    except Exception:
        try:
            load = os.getloadavg()[0]
        except (AttributeError, OSError):
            return True
    return load < 0.5 * (os.cpu_count() or 1)


def blender_capacity(live_count):
    forced = os.environ.get("XALIANS_BLENDER_CAPACITY")
    if forced:
        return int(forced)
    if live_count < 1:
        return 1  # the first slot never needs the resource test
    free = free_ram_gb()
    if free is not None and free > 9 and load_is_low():
        return 2
    return 1


def gpu_other_used_mb():
    """MB of GPU memory used by processes other than the caller, or None if unreadable."""
    if os.environ.get("XALIANS_GPU_OTHER_MB"):
        return float(os.environ["XALIANS_GPU_OTHER_MB"])
    if not shutil.which("nvidia-smi"):
        return None
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-compute-apps=pid,used_memory", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=20).stdout
    except Exception:
        return None
    mine = {os.getpid(), os.getppid()}
    total = 0.0
    for line in out.splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) != 2:
            continue
        try:
            pid, mb = int(parts[0]), float(parts[1])
        except ValueError:
            continue
        if pid not in mine:
            total += mb
    return total


# ---------- lock files ----------

def class_dir(cls):
    d = os.path.join(locks_root(), cls)
    os.makedirs(d, exist_ok=True)
    return d


def slot_path(cls, slot):
    return os.path.join(class_dir(cls), "%d.json" % slot)


def read_lock(path):
    """Return (record or None, mtime or None). A half-written file reads as {} (treated as live until old)."""
    for _ in range(3):
        try:
            mtime = os.path.getmtime(path)
            with open(path) as f:
                return json.load(f), mtime
        except FileNotFoundError:
            return None, None
        except (ValueError, OSError):
            time.sleep(0.05)
    try:
        return {}, os.path.getmtime(path)
    except OSError:
        return None, None


def is_stale(rec, mtime):
    if time.time() - mtime > stale_after():
        return True
    pid = rec.get("pid")
    if pid and rec.get("host") == host_kind() and not pid_alive(pid):
        return True
    return False


def live_holders(cls, reclaim=True):
    """List of (slot, record) for live holders; reclaims stale locks."""
    out = []
    for slot in range(2):
        path = slot_path(cls, slot)
        rec, mtime = read_lock(path)
        if rec is None:
            continue
        if is_stale(rec, mtime):
            if reclaim:
                gone = path + ".stale.%s" % uuid.uuid4().hex[:8]
                try:
                    os.replace(path, gone)
                    os.remove(gone)
                except OSError:
                    pass
            continue
        out.append((slot, rec))
    return out


def write_atomic(path, rec):
    tmp = path + ".tmp.%s" % uuid.uuid4().hex[:8]
    with open(tmp, "w") as f:
        json.dump(rec, f)
    for _ in range(10):
        try:
            os.replace(tmp, path)
            return True
        except OSError:
            time.sleep(0.05)
    try:
        os.remove(tmp)
    except OSError:
        pass
    return False


def conflicts_with(cls):
    return "gpu" if cls == "blender" else "blender"


def remove_if_token(cls, slot, token):
    path = slot_path(cls, slot)
    rec, _ = read_lock(path)
    if rec is not None and rec.get("token") == token:
        try:
            os.remove(path)
            return True
        except OSError:
            return False
    return False


def try_acquire(cls, owner, pid):
    """One attempt. Returns a token or None."""
    mine = live_holders(cls)
    cap = blender_capacity(len(mine)) if cls == "blender" else 1
    if len(mine) >= cap:
        return None
    if live_holders(conflicts_with(cls)):
        return None
    if cls == "gpu":
        other = gpu_other_used_mb()
        if other is not None and other > 2048:
            return None
    used = {s for s, _ in mine}
    for slot in range(2):
        if slot in used:
            continue
        token = "%s:%d:%s" % (cls, slot, uuid.uuid4().hex)
        rec = {"token": token, "class": cls, "slot": slot, "owner": owner, "pid": pid,
               "host": host_kind(), "started": time.strftime("%Y-%m-%dT%H:%M:%S"),
               "heartbeat": time.time()}
        path = slot_path(cls, slot)
        try:
            fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            continue
        with os.fdopen(fd, "w") as f:
            json.dump(rec, f)
        # Re-check after writing so simultaneous cross-class or over-capacity attempts back off.
        clash = live_holders(conflicts_with(cls), reclaim=False)
        siblings = [s for s, r in live_holders(cls, reclaim=False) if r.get("token") != token]
        if clash or len(siblings) >= cap:
            remove_if_token(cls, slot, token)
            time.sleep(0.05 + (uuid.uuid4().int % 100) / 1000.0)
            return None
        return token
    return None


def beat(cls, slot, token):
    """Refresh the heartbeat. Returns False if the lock is no longer ours."""
    path = slot_path(cls, slot)
    rec, _ = read_lock(path)
    if rec is None or rec.get("token") != token:
        return False
    rec["heartbeat"] = time.time()
    write_atomic(path, rec)
    return True


def parse_token(token):
    try:
        cls, slot, _ = token.split(":", 2)
        if cls not in CLASSES:
            raise ValueError
        return cls, int(slot)
    except ValueError:
        sys.exit("bad token: %r" % token)


def wait_acquire(cls, wait, owner, pid):
    deadline = time.time() + wait
    while True:
        token = try_acquire(cls, owner, pid)
        if token:
            return token
        left = deadline - time.time()
        if left <= 0:
            return None
        time.sleep(min(poll_interval(), left))


# ---------- commands ----------

def cmd_acquire(a):
    token = wait_acquire(a.cls, a.wait, a.owner, os.getpid())
    if not token:
        print("timeout waiting for %s slot" % a.cls, file=sys.stderr)
        return EXIT_TIMEOUT
    cls, slot = parse_token(token)
    # Hand the lock to a detached heartbeat process, which also becomes the liveness pid.
    kw = {"stdin": subprocess.DEVNULL, "stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}
    if os.name == "nt":
        kw["creationflags"] = 0x00000008 | 0x00000200 | 0x08000000  # DETACHED | NEW_GROUP | NO_WINDOW
    else:
        kw["start_new_session"] = True
    p = subprocess.Popen([sys.executable, os.path.abspath(__file__), "_beat", token], **kw)
    path = slot_path(cls, slot)
    rec, _ = read_lock(path)
    if rec and rec.get("token") == token:
        rec["pid"] = p.pid
        write_atomic(path, rec)
    print(token)
    return 0


def cmd_beat(a):
    cls, slot = parse_token(a.token)
    while beat(cls, slot, a.token):
        time.sleep(beat_interval())
    return 0


def cmd_release(a):
    cls, slot = parse_token(a.token)
    if remove_if_token(cls, slot, a.token):
        return 0
    print("token not held (already released or reclaimed)", file=sys.stderr)
    return 1


def cmd_run(a):
    cmd = a.command
    if cmd and cmd[0] == "--":
        cmd = cmd[1:]
    if not cmd:
        print("run needs a command after --", file=sys.stderr)
        return 2
    deadline = time.monotonic() + a.wait
    token = try_acquire(a.cls, a.owner, os.getpid())
    if not token and a.cls == 'blender' and os.environ.get('XALIANS_MINI', '1') != '0':
        # Only this branch's slot copy is changed. The integration patch and
        # scripts/mini_blender must be adopted together by the pipeline branch.
        repo = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        mini_dir = os.path.join(repo, 'scripts', 'mini_blender')
        if os.path.isfile(os.path.join(mini_dir, 'infer.py')):
            sys.path.insert(0, mini_dir)
            try:
                import infer
                evidence = os.environ.get('XALIANS_MINI_EVIDENCE') or os.path.join(
                    repo, 'untracked', 'mini-blender-auto', uuid.uuid4().hex)
                try:
                    return infer.spill(cmd, evidence)
                except infer.Unsafe as error:
                    print('mini spillover unsafe/unavailable: %s; waiting for local Blender slot' % error,
                          file=sys.stderr, flush=True)
                except RuntimeError as error:
                    print('mini Blender job failed: %s' % error, file=sys.stderr, flush=True)
                    return 1
            except ImportError as error:
                print('mini spillover integration unavailable: %s; waiting locally' % error,
                      file=sys.stderr, flush=True)
        else:
            print('mini spillover helper is not installed; waiting locally', file=sys.stderr, flush=True)
    if not token:
        token = wait_acquire(a.cls, max(0, deadline - time.monotonic()), a.owner, os.getpid())
    if not token:
        print("timeout waiting for %s slot" % a.cls, file=sys.stderr)
        return EXIT_TIMEOUT
    cls, slot = parse_token(token)
    stop = threading.Event()

    def pump():
        while not stop.wait(beat_interval()):
            beat(cls, slot, token)

    threading.Thread(target=pump, daemon=True).start()
    try:
        try:
            code = subprocess.call(cmd)
        except FileNotFoundError:
            print("command not found: %s" % cmd[0], file=sys.stderr)
            code = 127
        except KeyboardInterrupt:
            code = 130
    finally:
        stop.set()
        remove_if_token(cls, slot, token)
    return code


def cmd_status(a):
    now = time.time()
    found = False
    for cls in CLASSES:
        for slot, rec in live_holders(cls):
            found = True
            _, mtime = read_lock(slot_path(cls, slot))
            age = now - mtime if mtime else -1
            print("%s slot %d  owner=%s pid=%s host=%s started=%s heartbeat_age=%.0fs" % (
                cls, slot, rec.get("owner"), rec.get("pid"), rec.get("host"), rec.get("started"), age))
    if not found:
        print("no holders")
    return 0


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    who = "%s@%s" % (os.environ.get("USERNAME") or os.environ.get("USER") or "?", os.getcwd())
    for name in ("acquire", "run"):
        s = sub.add_parser(name)
        s.add_argument("cls", metavar="class", choices=CLASSES)
        s.add_argument("--wait", type=float, default=0 if name == "acquire" else 3600)
        s.add_argument("--owner", default=os.environ.get("XALIANS_SLOT_OWNER", who))
    s = sub.add_parser("release")
    s.add_argument("token")
    s = sub.add_parser("_beat")
    s.add_argument("token")
    sub.add_parser("status")
    argv = list(sys.argv[1:] if argv is None else argv)
    command = []
    if "--" in argv:  # everything after the first -- is the command, untouched by argparse
        i = argv.index("--")
        argv, command = argv[:i], argv[i + 1:]
    a = p.parse_args(argv)
    a.command = command
    return {"acquire": cmd_acquire, "release": cmd_release, "run": cmd_run,
            "status": cmd_status, "_beat": cmd_beat}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
