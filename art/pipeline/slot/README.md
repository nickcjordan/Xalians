# Machine slot lock

Keeps heavy pipeline work from piling onto Nick's machine (design: `docs/design/creature-pipeline-design.md` section 10). Python 3 standard library only. Shared by Windows launches, WSL launches (through the `.sh` wrappers) and the Codex stream.

## The line a brief should carry

> Every Blender or GPU launch goes through `slot.py run`: `python C:\dev\src\xalians-creature-pipeline\art\pipeline\slot\slot.py run <blender|gpu> -- <command...>`.

## Usage

```
python art/pipeline/slot/slot.py run blender -- <command...>      # acquire, run, keep heartbeat, release, exit with the command's code
python art/pipeline/slot/slot.py acquire blender --wait 600       # prints a token, exit 0; exit 3 on timeout
python art/pipeline/slot/slot.py release <token>
python art/pipeline/slot/slot.py status                           # who holds what
```

`--owner TEXT` labels the holder (default: user and working directory, or `XALIANS_SLOT_OWNER`). `run` waits up to 3600 s by default, `acquire` does not wait unless given `--wait`. Exit codes: command's own code for `run`, 3 on wait timeout, 127 if the command is not found.

## Rules

- `blender`: one holder; two when more than 9 GB RAM is free and the 1-minute CPU load is under half the core count (psutil if installed, otherwise PowerShell/wmic for memory on Windows and `/proc/meminfo` in WSL; the load test is skipped where it cannot be read).
- `gpu`: one holder, and refused if `nvidia-smi` shows more than 2 GB used by processes other than the caller.
- A `gpu` holder and a `blender` holder never run together (reconstruction never beside a Blender render).
- Locks are files in `C:\dev\art-data\pipeline\locks\<class>\<slot>.json` (from WSL: `/mnt/c/dev/art-data/pipeline/locks`), with owner, pid, started and a heartbeat refreshed every 10 s. A lock with no heartbeat for 60 s, or whose pid is dead (checked when the pid belongs to the same side, Windows or WSL), is reclaimed by the next caller.
- `acquire` leaves a small detached process beating the heartbeat until `release`. If the holder crashes, the beat stops with it or the lock goes stale in 60 s.

## Wrappers

`blender/blender_stage.sh`, `blockout/blockout_stage.sh` and `sculpt/run_head.sh` run Blender through `python3 slot.py run blender --` when `python3` and `slot.py` are present and the locks folder is reachable. Otherwise they run exactly as before. Set `XALIANS_NO_SLOT=1` to bypass the lock.

## Environment (tests and overrides)

`XALIANS_LOCKS` (lock folder), `XALIANS_BEAT`, `XALIANS_STALE`, `XALIANS_POLL` (seconds), `XALIANS_BLENDER_CAPACITY` (force 1 or 2), `XALIANS_GPU_OTHER_MB` (fake the nvidia-smi reading).

## Tests

```
python -m unittest discover -s art/pipeline/slot/tests -v
```
