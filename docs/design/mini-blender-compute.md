# Mac mini Blender compute

Implemented 2026-10-16. This is interactive art compute, not an additional CI runner. No CI registration, runner labels, CI VM sizing or WSL memory configuration was changed. The compute VM was resized with Nick's approval.

## Route and installation

The Intel mini uses the same official Linux x86_64 Blender **5.2.2 LTS**, build **d13f752e3b9c**, as the PC's WSL installation. Blender's [requirements](https://www.blender.org/download/requirements/) say 4.5 LTS is the last Intel macOS release; the [5.2 release directory](https://download.blender.org/release/Blender5.2/) supplies Linux x64 and macOS ARM64, with no Intel macOS package. A native 4.5 install would not meet the exact-version requirement.

Reused the existing Colima `default` VM: x86_64, Docker. Nick approved raising it from 3 vCPUs/4 GiB to **8 vCPUs/6 GiB** on 2026-10-16. Blender containers receive **8 CPUs and 5632 MiB (5.5 GiB, about 5.9 GB)**, leaving 512 MiB for the guest OS. The separate surfaced-art CI Lima VM remains at its existing 10 vCPUs and 8 GiB. The PC exposes 24 WSL CPUs. CPU quotas are ceilings, not reservations; CI retains priority through nice values and container pausing.

The mini already had Colima, Lima and Docker under `~/.mini-runner/`. Noninteractive SSH must source `~/.mini-runner/env.sh`. The installer explicitly selects `unix://$HOME/.colima/default/docker.sock`; it never changes the Docker context or selects the CI VM's Docker daemon.

### Intel VZ timer compatibility

The first real fur job reached rendering and terminated with SIGILL. A one-sample default cube reproduced it, even with AVX2 disabled and denoising off. GDB identified the exact instruction as `rdtscp` in the Cycles timer path. The guest advertises AVX2 but omits RDTSCP. Cycles' [fast timer source](https://raw.githubusercontent.com/blender/blender/main/intern/cycles/util/time.h) uses the timestamp and CPU ID to reject timing samples across CPU migrations.

The image therefore preloads the small, source-built `rdtscp_compat.so` while retaining the publisher's Blender binary. On a CPU without RDTSCP and with the default SIGILL action, it handles only a kernel-generated fault at that three-byte instruction, obtains the Linux CPU ID and uses fenced RDTSC to fill the expected registers. Every other illegal instruction remains fatal. The build tests 1,000 increasing timestamps and zero upper register bits, and verifies an unrelated UD2 trap still exits with SIGILL. A denoised Cycles cube rendered successfully after the change.

This is a timer compatibility aid for this single-node VM, not a general instruction emulator. CPU migration between the CPU-ID syscall and timestamp can affect profiling metadata and scheduling measurements. Signal handling also adds overhead. It does not change shading math, scene data, sampling configuration, or Blender's build. The full fur comparison below measures its practical result. A future Blender or VM upgrade must repeat the cube and fur checks. User-mode QEMU inside the same container is a possible fallback if a future version cannot use this narrow workaround; it has not been selected or validated here.

From the new worktree:

```powershell
python scripts/mini_blender/install.py
# Explicitly resize the idle compute VM to the approved caps:
python scripts/mini_blender/install.py --resize-compute
```

This copies the Dockerfile, supervisor and inferred-asset guard under `~/.mini-blender/`, builds `mini-blender:5.2.2`, checks the downloaded Blender archive against the publisher's SHA-256 file, and prints the installed build. Without `--resize-compute`, it requires the existing Colima VM to be running. With that explicit option, it refuses to resize when a compute container is active, stops and restarts only Colima at 8 CPUs/6 GiB with auto-activation disabled, and reapplies low priority. It does not use sudo, Homebrew, a paid service, a license purchase, or a new VM. The reference checkout had unrelated uncommitted hook edits, so the prescribed worktree command refused; a fresh fetch and equivalent `git worktree add` created this sibling without changing those files.

## Resource and scheduling policy

- One remote compute job holds an OS `flock` on `~/.mini-blender/compute.lock`. Jobs queue there independently of the PC slot.
- Each container has an 8-CPU quota, 5632 MiB memory limit, equal memory-plus-swap limit (no swap), low CPU shares, 256-PID limit, no network, dropped capabilities, and no exposed GPU. Blender runs headless with eight threads and nice 15.
- On every job, the supervisor lowers both the Colima hostagent and the process holding that VM's disk to nice 15. Apple's VZ CPU worker is a separate XPC process with PPID 1; lowering only the hostagent is insufficient. The CI worker's distinct disk keeps it out of this selection.
- The supervisor confirms a live `Runner.Listener` in the CI VM, then checks for `Runner.Worker`. Active CI pauses the compute container and resumes it after CI becomes idle. Missing listeners, unknown status and probe errors also yield compute. Checks occur roughly every 2 seconds between work, with a 15-second timeout per probe and 5-second polling while paused. This is bounded cooperative priority, not instantaneous preemption or memory reclamation: a paused container still holds RAM.
- A 24-hour deadline covers queueing, CI waits and execution. The client sends heartbeat bytes. EOF or 45 seconds without a heartbeat cancels compute. Cancellation waits for the supervisor's lifetime lock and confirms container removal before deleting the mount. A daemon failure retains the workspace and reports the cleanup failure.
- Normal completion, Blender failure and supervisor failure return diagnostics, then remove the remote job folder. If a daemon failure prevents confirmed removal, the workspace remains and subsequent jobs refuse to start while an old `mini-blender-*` container exists. Only the image, installed tools and tiny persistent compute lock remain after successful cleanup. Queued uploads occupy disk until their job runs or is canceled.

## Running a job

Python and OpenSSH (`ssh`, `scp`) must be available on the PC or in WSL, with working `ssh mini` authentication. Use absolute paths in a JSON manifest. Only named input files transfer; directories are not implicitly uploaded.

```json
{
  "mappings": [
    {"source": "C:/dev/src/xalians-akinza-loop", "target": "akinza"},
    {"source": "C:/dev/src/xalians-mini-blender-compute/untracked/example", "target": "result"}
  ],
  "inputs": [
    "C:/dev/src/xalians-akinza-loop/untracked/example/model.blend",
    "C:/dev/src/xalians-akinza-loop/untracked/example/render.py"
  ],
  "outputs": [
    "C:/dev/src/xalians-mini-blender-compute/untracked/example/front.png"
  ],
  "args": [
    "-b", "C:/dev/src/xalians-akinza-loop/untracked/example/model.blend",
    "--python-exit-code", "1",
    "--python", "C:/dev/src/xalians-akinza-loop/untracked/example/render.py",
    "--", "--out", "C:/dev/src/xalians-mini-blender-compute/untracked/example/front.png"
  ]
}
```

The example assumes the named files exist and its render script accepts `--out`. Include every imported sibling script, config, texture and other dependency. Pack external `.blend` assets or preserve their relative layout in the mappings. Embedded absolute paths inside scripts or `.blend` data are not rewritten. Linux filenames and embedded relative asset names must use their actual case. Arguments containing a path by itself or as `--option=<path>` are translated, without shell evaluation. Unmapped paths, traversal, overlapping mappings and input/output collisions are rejected, including Windows case aliases.

For example, `C:\dev\src\xalians-akinza-loop\untracked\example\model.blend` and `/mnt/c/dev/src/xalians-akinza-loop/untracked/example/model.blend` both map to `/job/work/akinza/untracked/example/model.blend`. On the Mac that is `~/.mini-blender/jobs/<uuid>/work/akinza/untracked/example/model.blend`. Declared output paths map back to their original PC destinations after a successful render. A failed job does not copy partial outputs into those destinations. Output directories merge into existing destinations, so name exact output files when stale files would be misleading.

```powershell
python scripts/mini-blender.py job.json --route auto --evidence untracked/job-evidence
python scripts/mini-blender.py job.json --route mini --evidence untracked/job-evidence
python scripts/mini-blender.py job.json --route local --evidence untracked/job-evidence
```

`auto` makes one atomic attempt to acquire the existing shared local Blender slot. If busy, it sends the manifest to the mini. A local Blender failure is returned to the caller and is never silently retried remotely. `local` returns exit 3 if the slot is busy. Override the slot's location with `--slot <absolute slot.py path>` and the SSH alias with `--host`. The default PC binary is `/home/njord/.local/opt/blender-5.2.2-linux-x64/blender`, run through `wsl -d Ubuntu --exec` on Windows. Set manifest `local_blender` to override it.

The local route imports the existing slot's lock protocol, heartbeats its token while the job runs, and releases only after the process-tree supervisor exits. On Windows, WSL memory and load determine whether a second local slot fits. The local route preserves the existing slot's first-job policy and environment overrides. It does not raise WSL's memory limit or change the local slot capacity.

Evidence includes `blender.log` and `result.json`. Remote results contain wall time including queueing and CI pauses, transfer-inclusive client time, CI pause time and resource caps. `/usr/bin/time -v` records Blender's peak resident memory in the log.

## Shared slot adoption

The shared `C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py` belongs to another session and was not edited. This branch contains a copy with a change limited to `cmd_run`. Existing `slot.py run blender ... -- <command>` callers need no command changes after that branch adopts the helper files and patch. A free slot runs locally. A busy slot attempts inference and spills to `mini`; unsafe inference or unavailable transport logs a reason and resumes the original local wait. A genuine remote Blender failure returns failure. GPU calls stay local. Set `XALIANS_MINI=0` to disable automatic spillover or `XALIANS_MINI_EVIDENCE` to select its evidence directory.

Inference accepts direct Blender 5.2.2 commands, including `wsl -d Ubuntu --exec <blender>`, with `-b`. It gathers positional blends, every `--python` script, recursively imported sibling modules/packages, existing named configuration inputs, and explicit output locations. Script-relative resources and resolvable filesystem/Blender/NumPy reads are included. Named input folders may contain only recognized data files, at most 256 files/2 GiB in total. Windows and WSL paths map into a private drive mirror, preserving the original working directory and relative layout. The remote runner owns the eight-thread cap and supplies a Python failure exit code if the caller omitted one.

Analysis is conservative static inference for trusted local scripts, not a Python sandbox or a proof of arbitrary program equivalence. Shell wrappers, dynamic imports, process/network calls, unresolved paths, stateful append/update/exclusive writes, empty input directories, and reads from existing output locations fall back locally. A remote Blender preflight opens every inferred blend and requires its external resources to be declared and present; unprovided assets, image sequences, UDIM and disk simulation caches require a manifest or local execution. Preflight failure returns to the local wait without copying partial outputs. Explicit manifests remain available for jobs beyond the inferred subset.

After this follow-up PR merges, the creature-pipeline owner can adopt without replacing their slot file:

```powershell
git fetch origin
git restore --source origin/main -- scripts/mini_blender scripts/mini-blender.py docs/design/mini-blender-slot-adoption.patch
git apply --check docs/design/mini-blender-slot-adoption.patch
git apply docs/design/mini-blender-slot-adoption.patch
```

Run those commands in the creature-pipeline branch, review its current local changes first, and resolve any failed patch check against the small `cmd_run` diff. The patch is against the copied slot baseline, rather than an instruction to overwrite another session's file. Adopt helpers and slot change together. Do not wrap the manifest runner in `slot.py run blender`, which would reserve a local slot for remote work.

## Reproducing the fur comparison

The latest `fur-steps/progress.txt` held `s12-13b/surface.blend`; `s13d` contained eyeliner mockups. The benchmark snapshots the held blend, its metadata, four scripts and two configs into this worktree's ignored `untracked/mini-blender-benchmark/source/`. It does not modify or commit in the Akinza worktree.

```powershell
python scripts/mini_blender/benchmark.py prepare
python scripts/mini-blender.py untracked/mini-blender-benchmark/job.json --route mini --evidence untracked/mini-blender-benchmark/mini-evidence
Move-Item untracked/mini-blender-benchmark/render untracked/mini-blender-benchmark/mini
python scripts/mini-blender.py untracked/mini-blender-benchmark/job.json --route local --evidence untracked/mini-blender-benchmark/local-evidence
Move-Item untracked/mini-blender-benchmark/render untracked/mini-blender-benchmark/local
python scripts/mini_blender/benchmark.py compare
```

Run the two routes sequentially when using these same output paths. A busy local slot must become available before the local command succeeds. The comparison helper requires Pillow and NumPy; the runner itself uses Python's standard library. The job is the real `body-front` camera at 768x1024, 32 Cycles CPU samples with denoising, T7 palette and current eyeliner, retaining all 420,420 fur strands.

Initial three-thread results (one run per machine under ambient load, retained as the baseline):

| Measurement | PC WSL | Intel mini |
|---|---:|---:|
| Whole job wall time | 179.03 s (2m 59s) | 915.20 s (15m 15s) |
| Scene script including load and setup | 178.3 s | 909.5 s |
| Render only | 25.4 s | 426.3 s (7m 06s) |
| Client time including remote transfers | N/A | 919.45 s |
| Blender peak RSS | Not measured | 2,443,864 KiB (2.33 GiB) |
| CI pause during fur benchmark | N/A | 0 s |

Both decoded 768x1024 RGB images are pixel-identical: **0 different pixels, mean absolute channel difference 0, maximum channel difference 0**. The PNG files have different byte hashes; this comparison checks their decoded RGB pixels. The images were opened for visual inspection and show the complete current furred front view. Raw [measurements](mini-blender-evidence/comparison.json), [input hashes](mini-blender-evidence/input-hashes.json), [mini log](mini-blender-evidence/mini-fur-render.txt) and [PC log](mini-blender-evidence/local-fur-render.txt) are committed. Images and an 8x difference image remain under the ignored benchmark folder.

The mini's whole job was about 5.1 times slower; it adds capacity while the PC is queued. This result combines the older CPU, conservative thread cap and timer compatibility overhead, rather than isolating any one cost. It is one workload, not a guarantee for other scenes.

The full fur run used image `7360373764ec`. While it ran, the final image added forwarding of explicitly user-generated SIGILL; the kernel RDTSCP path used by Cycles is unchanged. Final-image timer tests cover this added negative case, and final-image denoised cube and container-control checks exercise the installed setup. Exact image and shim hashes are in [installation evidence](mini-blender-evidence/installation.json).

Initial validation: 19 regression tests passed in WSL, and the supervisor suite passed on the mini. Real-container checks covered a denoised Cycles cube, a simulated five-second CI pause and resume, intentional Blender failure with diagnostics, and folder cleanup. The long queue wait observed by the second job while the fur container held the lock confirmed remote serialization. The preliminary real fur rerun was canceled through the control path; its container and folder were removed before the successful run. Windows local-worker startup and a real busy-local-slot spillover also returned the expected Blender build.

```powershell
wsl -d Ubuntu --exec python3 -m unittest discover -s /mnt/c/dev/src/xalians-mini-blender-compute/scripts/mini_blender -v
scp scripts/mini_blender/live_checks.py mini:.mini-blender/live_checks.py
ssh mini 'python3 .mini-blender/live_checks.py'
```

## Eight-thread follow-up and command-only proof

The rerun used the exact same eight-file input snapshot and unchanged PC baseline. A command-only `slot.py run blender --wait 0 -- wsl -d Ubuntu --exec <blender> ...` invocation inferred eight inputs and one output folder, passed blend-resource preflight, rendered on the mini and copied outputs back. No manifest was supplied to the slot. At dispatch, the production shared lock directory held the Akinza session's exclusive GPU-class token, owned by `Akinza fur serial CPU Blender`; that token blocks local Blender acquisition. The proof did not modify or release that other session's token.

| Measurement | PC baseline | Mini, 3 threads | Mini, 8 threads |
|---|---:|---:|---:|
| Whole job wall time | 179.03 s | 915.20 s | **659.61 s (10m 59.6s)** |
| Script including load and setup | 178.3 s | 909.5 s | 648.6 s |
| Render only | 25.4 s | 426.3 s | **229.1 s (3m 49.1s)** |
| Client including transfers | N/A | 919.45 s | 665.48 s |
| Peak Blender RSS | Not measured | 2,443,864 KiB | **2,465,412 KiB (2.35 GiB)** |
| CI pause | N/A | 0 s | 0 s |

The new whole-job measurement includes the added blend preflight. The phase RSS values are 871,524 KiB for preflight and 2,465,412 KiB for rendering; the reported peak is their maximum, not their sum. This run reduced whole-job time by about 28% and render time by about 46% against the three-thread run. Ambient load and setup variation remain part of these single-run measurements. The mini still takes about 3.7 times the PC's whole-job time.

Decoded output remains pixel-identical to the PC: **zero differing pixels, mean and maximum channel difference zero**, at 768x1024 RGB. The full image was opened and inspected. [Measurements](mini-blender-followup-evidence/comparison.json), [command-only dispatch proof](mini-blender-followup-evidence/command-only-proof.json), [inferred job](mini-blender-followup-evidence/inferred-job.json), [render log](mini-blender-followup-evidence/mini-fur-render.txt) and [live caps](mini-blender-followup-evidence/installation.json) preserve the result and image ID. The final inference code produces the same manifest as the executed job.

Follow-up validation passes 37 tests in WSL and 25 on Windows, with 12 POSIX-only skips on Windows. A real unsafe inline-Python command logged its reason and followed local timeout, without launching mini work. The independent review and regression evidence are in [review](mini-blender-followup-evidence/review.md) and [verification](mini-blender-followup-evidence/verification.json). Real container checks repeat CI pause/resume, diagnostic failure and cleanup at the new caps, and verify that an undeclared blend image stops preflight before the render script executes.

## Authorized Messages cleanup

The same follow-up authorized clearing local Messages history. `CloudKitSyncingEnabled` in `com.apple.madrid.plist` was verified false immediately before deletion and again afterward. Messages.app was closed. History databases, attachments, archives, drafts and content caches were cleared, preserving preferences byte-for-byte and leaving iMessage sign-in alone. The remaining Sync remote-record and regenerated LiteSegment content tables have zero rows. No message contents were exported.

Free space immediately around cleanup rose from **52,540,493,824 to 98,696,671,232 bytes**, about **48.9 to 91.9 GiB**, an increase of 43.0 GiB. Later render uploads and ordinary activity can change available space. See [cleanup](mini-blender-followup-evidence/messages-cleanup.json) and [final read-only verification](mini-blender-followup-evidence/messages-final-verification.json).

## Limits

CPU-only capacity is a throughput addition when the PC queue is occupied, not a promise that the mini renders faster. Jobs over 5.5 GiB fail rather than borrowing CI's memory. Matching Blender binaries do not guarantee identical pixels across CPU instruction sets or denoiser implementations. Embedded absolute paths, unresolved dependencies, programs other than Blender and GPU jobs require caller adaptation or local fallback. No always-on launch service or additional CI runner was registered. After a mini reboot, the existing Colima startup must finish before jobs can run; CI status must be readable for compute to proceed.

## Stopped compute VM (fixed 2026-10-22)

The compute VM is created with auto-activation off, so after the mini restarts it stays stopped. The first real Akinza spill (2026-10-22) then failed in under a second at the supervisor's orphan check ("docker daemon unreachable") and the slot returned that as a failed job. Two fixes:

- `remote.py` starts the stopped VM itself (`colima start default --activate=false`, at nice 15) before admitting a job, and raises a clear error only if it will not start.
- `infer.spill` treats any supervisor failure before Blender ran (an `error` in `result.json` with an empty `blender.log`) as the mini being unavailable: it raises `Unsafe`, so `slot.py` waits for the local slot instead of failing the caller's job. A Blender failure on the mini still fails the job.
- `remote.py` `ci_busy()` no longer parks a job when the CI VM itself is Stopped or Broken: there is no CI job to yield to, so compute proceeds and prints a warning to check the surfaced-art runner watchdog. A Running VM with no listener still yields (the runner may be restarting). Before this, a Broken CI VM held a spilled Akinza render silently for 40 minutes (2026-10-22).
