"""Blender slot lock: concurrency caps by free memory, with several concurrent waiters.

    python -m unittest art/species-construction/loop/test/test_slots.py -v      (from the repository root)

Each waiter is a separate process that takes a slot through loop_tools.acquire_slot (free memory and
the settle time patched, the lock folder a temporary one), holds it for HOLD seconds and logs its start
and end. The test reads the log back and checks the largest number of overlapping holders and that no
two holders ever shared a lock file. No Blender runs."""
import json
import os
import subprocess
import sys
import tempfile
import textwrap
import time
import unittest
from pathlib import Path

LOOP = Path(__file__).resolve().parents[1]
HOLD = 2.5

WORKER = textwrap.dedent('''
    import os, sys, time
    from pathlib import Path
    sys.path.insert(0, {loop!r})
    import loop_tools as lt
    lt.WORK = Path({work!r})
    lt.free_memory_gb = lambda: {free}
    lt.SLOT_SETTLE_S = {settle}
    log = {log!r}
    slot = lt.acquire_slot()
    with open(log, 'a') as f:
        f.write('start %s %.3f %s\\n' % (os.getpid(), time.time(), slot.name))
    time.sleep({hold})
    with open(log, 'a') as f:
        f.write('end %s %.3f %s\\n' % (os.getpid(), time.time(), slot.name))
    slot.unlink(missing_ok=True)
''')


def run_waiters(count, free, settle=0.0, stagger=0.0):
    work = tempfile.mkdtemp(prefix='slots-')
    log = str(Path(work)/'log.txt')
    source = WORKER.format(loop=str(LOOP), work=work, free=free, settle=settle, log=log, hold=HOLD)
    procs = []
    for _ in range(count):
        procs.append(subprocess.Popen([sys.executable, '-c', source], stdout=subprocess.PIPE, stderr=subprocess.PIPE))
        time.sleep(stagger)
    for p in procs:
        out, err = p.communicate(timeout=240)
        assert p.returncode == 0, err.decode()
    events = [line.split() for line in Path(log).read_text().splitlines()]
    return events


def max_overlap(events):
    points = sorted((float(t), 1 if kind == 'start' else -1) for kind, _, t, _ in events)
    level = peak = 0
    for _, d in points:
        level += d
        peak = max(peak, level)
    return peak


def shared_slot_overlap(events):
    """True when two holders had the same lock file at the same time."""
    spans = {}
    for kind, pid, t, slot in events:
        spans.setdefault(pid, {})[kind] = (float(t), slot)
    items = list(spans.values())
    for i, a in enumerate(items):
        for b in items[i+1:]:
            if a['start'][1] == b['start'][1] and a['start'][0] < b['end'][0] and b['start'][0] < a['end'][0]:
                return True
    return False


class SlotTests(unittest.TestCase):
    def test_three_waiters_with_plenty_of_memory_run_together(self):
        ev = run_waiters(3, free=20, settle=0.0)
        self.assertEqual(len([e for e in ev if e[0] == 'start']), 3)
        self.assertEqual(max_overlap(ev), 3)
        self.assertFalse(shared_slot_overlap(ev))
        self.assertEqual(len({e[3] for e in ev}), 3)

    def test_two_slots_between_nine_and_fourteen_gb(self):
        ev = run_waiters(3, free=10, settle=0.0)
        self.assertEqual(max_overlap(ev), 2)
        self.assertFalse(shared_slot_overlap(ev))

    def test_one_slot_below_the_nine_gb_floor(self):
        ev = run_waiters(3, free=6, settle=0.0)
        self.assertEqual(max_overlap(ev), 1)

    def test_five_waiters_never_exceed_three(self):
        ev = run_waiters(5, free=20, settle=0.0)
        self.assertEqual(len([e for e in ev if e[0] == 'start']), 5)
        self.assertLessEqual(max_overlap(ev), 3)
        self.assertFalse(shared_slot_overlap(ev))

    def test_settle_time_spaces_the_starts(self):
        ev = run_waiters(3, free=20, settle=1.0)
        starts = sorted(float(e[2]) for e in ev if e[0] == 'start')
        self.assertGreaterEqual(starts[1]-starts[0], 0.9)
        self.assertGreaterEqual(starts[2]-starts[1], 0.9)

    def test_thresholds_in_one_place(self):
        sys.path.insert(0, str(LOOP))
        import loop_tools as lt
        cfg = json.loads((lt.SPECIES.path).read_text(encoding='utf-8'))['blender']
        self.assertEqual((lt.BLENDER_SLOTS, lt.MIN_FREE_GB, lt.THIRD_SLOT_FREE_GB),
                         (cfg['maxSlots'], cfg['minFreeGb'], cfg['thirdSlotFreeGb']))
        self.assertEqual([lt.free_needed(n) for n in range(4)], [0, 9, 14, None])


if __name__ == '__main__':
    unittest.main()
