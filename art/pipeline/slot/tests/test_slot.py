import json, os, subprocess, sys, tempfile, time, unittest

SLOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slot.py")


def this_host():
    if os.name == "nt":
        return "win"
    try:
        if "microsoft" in open("/proc/version").read().lower():
            return "wsl"
    except OSError:
        pass
    return "posix"


class SlotTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.env = dict(os.environ, XALIANS_LOCKS=self.tmp.name, XALIANS_BEAT="0.3", XALIANS_STALE="2",
                        XALIANS_POLL="0.2", XALIANS_BLENDER_CAPACITY="1", XALIANS_GPU_OTHER_MB="0")
        self.tokens = []

    def tearDown(self):
        for t in self.tokens:
            self.slot("release", t)
        time.sleep(0.6)  # let heartbeat processes notice the release and exit
        self.tmp.cleanup()

    def slot(self, *args, env=None):
        return subprocess.run([sys.executable, SLOT, *args], capture_output=True, text=True,
                              env=env or self.env, timeout=60)

    def acquire(self, cls, *extra, env=None):
        r = self.slot("acquire", cls, *extra, env=env)
        if r.returncode == 0:
            self.tokens.append(r.stdout.strip())
        return r

    def test_acquire_release(self):
        r = self.acquire("blender")
        self.assertEqual(r.returncode, 0, r.stderr)
        token = r.stdout.strip()
        self.assertTrue(token.startswith("blender:"))
        self.assertIn("blender slot 0", self.slot("status").stdout)
        self.assertEqual(self.slot("release", token).returncode, 0)
        self.assertIn("no holders", self.slot("status").stdout)
        self.assertEqual(self.slot("release", token).returncode, 1)

    def test_capacity_one_then_two(self):
        self.assertEqual(self.acquire("blender").returncode, 0)
        self.assertEqual(self.acquire("blender").returncode, 3)
        env2 = dict(self.env, XALIANS_BLENDER_CAPACITY="2")
        self.assertEqual(self.acquire("blender", env=env2).returncode, 0)
        self.assertEqual(self.acquire("blender", env=env2).returncode, 3)

    def test_gpu_exclusive_and_cross_class(self):
        self.assertEqual(self.acquire("gpu").returncode, 0)
        self.assertEqual(self.acquire("gpu").returncode, 3)
        self.assertEqual(self.acquire("blender").returncode, 3)

    def test_gpu_refused_when_others_use_memory(self):
        env = dict(self.env, XALIANS_GPU_OTHER_MB="3000")
        self.assertEqual(self.acquire("gpu", env=env).returncode, 3)

    def test_heartbeat_keeps_lock_alive(self):
        self.assertEqual(self.acquire("blender").returncode, 0)
        time.sleep(3.5)  # longer than the stale window; the heartbeat process must keep it
        self.assertEqual(self.acquire("blender").returncode, 3)

    def test_stale_reclaim_by_heartbeat_age(self):
        d = os.path.join(self.tmp.name, "blender")
        os.makedirs(d)
        path = os.path.join(d, "0.json")
        with open(path, "w") as f:
            json.dump({"token": "blender:0:dead", "pid": 0, "host": "other", "owner": "x"}, f)
        old = time.time() - 120
        os.utime(path, (old, old))
        r = self.acquire("blender")
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_stale_reclaim_by_dead_pid(self):
        p = subprocess.Popen([sys.executable, "-c", "pass"])
        p.wait()
        d = os.path.join(self.tmp.name, "blender")
        os.makedirs(d)
        with open(os.path.join(d, "0.json"), "w") as f:
            json.dump({"token": "blender:0:dead", "pid": p.pid, "host": this_host(), "owner": "x"}, f)
        r = self.acquire("blender")
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_timeout_exit_code(self):
        self.assertEqual(self.acquire("gpu").returncode, 0)
        t0 = time.time()
        r = self.slot("acquire", "gpu", "--wait", "1")
        self.assertEqual(r.returncode, 3)
        self.assertGreaterEqual(time.time() - t0, 0.9)

    def test_run_propagates_exit_codes_and_releases(self):
        r = self.slot("run", "blender", "--", sys.executable, "-c", "import sys; sys.exit(7)")
        self.assertEqual(r.returncode, 7)
        r = self.slot("run", "blender", "--", sys.executable, "-c", "print('hi')")
        self.assertEqual(r.returncode, 0)
        self.assertIn("hi", r.stdout)
        self.assertIn("no holders", self.slot("status").stdout)
        r = self.slot("run", "blender", "--", "no-such-command-xyz")
        self.assertEqual(r.returncode, 127)
        self.assertIn("no holders", self.slot("status").stdout)

    def test_run_holds_slot_while_running(self):
        p = subprocess.Popen([sys.executable, SLOT, "run", "blender", "--", sys.executable, "-c",
                              "import time; time.sleep(3)"], env=self.env)
        time.sleep(1.2)
        self.assertEqual(self.acquire("blender").returncode, 3)
        p.wait()
        self.assertEqual(self.acquire("blender").returncode, 0)

    def test_run_timeout(self):
        self.assertEqual(self.acquire("blender").returncode, 0)
        r = self.slot("run", "blender", "--wait", "1", "--", sys.executable, "-c", "print(1)")
        self.assertEqual(r.returncode, 3)
        self.assertEqual(r.stdout.strip(), "")


if __name__ == "__main__":
    unittest.main()
