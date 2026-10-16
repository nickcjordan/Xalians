# Mini Blender compute work record

## Intended outcome and scope

Add the Intel Mac mini as a second, CPU-only Blender 5.2.2 machine, with explicit file mapping, selective transfers, a single remote job, cleanup, CI priority, and a local-slot fallback. Prove it with the current Akinza fur scene on both machines, record pixel difference, timing and remote peak memory, then commit, push, open a PR and enable merge auto-merge. Do not edit other sessions' worktrees, CI registration, or WSL memory settings. Stop if money, a license purchase, or Nick's password is required.

## Completion criteria

- Exact Linux x86_64 Blender 5.2.2 installed and verified on the mini.
- Bounded CPU and memory use, low priority, CI activity yields compute.
- Python runner transfers only declared inputs and outputs with explicit Windows/WSL mapping, serializes remote compute and cleans job data.
- Slot integration in this worktree, plus precise adoption instructions for the shared slot owner.
- Real current Akinza fur render compared on both machines with recorded measurements.
- Meaningful tests, independent adversarial review, completion audit, documentation and auto-merge PR.

## Evidence and decisions

- 2026-10-16: Official Blender requirements and release index confirm 5.0+ has no Intel macOS binary; 5.2.2 Linux x64 exists.
- Mini has an existing Colima default VM: 3 CPUs, 4 GiB, x86_64, Docker, idle. Separate surfaced-art CI Lima VM has 10 CPUs and 8 GiB. Preserve both configurations. Use a 3 GiB container in existing Colima instead of allocating another VM.
- Prescribed `npm.cmd run wt -- new mini-blender-compute` refused unrelated dirty `.codex/hooks.json` and `scripts/completion_audit.py`. Preserved those edits and used the equivalent fresh fetch plus `git worktree add` to create the requested sibling from origin/main. No reference source edits.
- Latest fur progress identifies `s12-13b/surface.blend` as the held surface; s13d is eyeliner mockups. Source blend size 178,381,456 bytes. Benchmark outputs belong only under this worktree's ignored untracked directory.

## Implementation evidence

- Installed verified Blender 5.2.2 LTS Linux x64 build `d13f752e3b9c` in `mini-blender:5.2.2`; PC reports the same build. Container caps are 3 CPUs, 3 GiB RAM, no swap, no network, dropped capabilities and 256 PIDs. Reused existing Colima without resizing or changing CI registration.
- Both the Colima hostagent (19819) and the VZ XPC worker holding its disk (19825) are nice 15. The separate CI VZ worker (690) remains nice 0. Automatic disk-based identification handles later VM restarts.
- PC benchmark succeeded: 179.0288 seconds wall, 25.4 seconds render, 420,420 fur strands and 3,772,268 points, 768x1024, 32 samples, T7, current eyeliner. Outputs in ignored `untracked/mini-blender-benchmark/local/`.
- Seven PC tests and all twelve tests in WSL passed, including Windows/WSL mapping, overlap rejection, spillover selection, cancellation process lifetime, fail-closed CI probes, completion/pause race and archive validation. Five supervisor tests also passed on the mini.
- Adversarial scoped review identified five defects: case-sensitive overwrite checks, remote cancellation deleting a live mount, local slot release before WSL exit, completion during CI probe, and lost supervisor diagnostics. Implemented casefolded checks, stdin heartbeat plus lifetime locks and cancellation wait, a local process-tree worker, race-tolerant pause, and structured failure archives. Regression checks cover these paths; live checks remain underway.
- The Windows local route now queries WSL memory and load before considering a second local slot. It does not change shared slot code or WSL settings.

## Next unfinished action

Commit the explicitly staged implementation and evidence, push, open the full-description PR and enable auto merge. Implementation, comparison and installed-runner validation are complete; publication remains in progress.

## Capability repair and renewed verification

- First mini fur invocation failed with SIGILL after 588.66 supervisor seconds, 585.89 Blender seconds, peak RSS 1,788,696 KiB. No output image exists for that run. Logs retained in `untracked/mini-blender-benchmark/first-failure-evidence/`.
- Reproduced on a one-sample factory Cycles cube. Disabling AVX2 and denoising did not help. GDB identified the unsupported RDTSCP instruction at `0x5222af0`; the VZ guest omits that CPU feature. Implemented a narrow timer shim that preserves the exact official Blender binary and both VM configurations. A denoised cube succeeded. Build tests passed 1,000 increasing timer reads with zero upper register bits and preserved SIGILL on unrelated UD2.
- Independent shim review identified kernel-signal gating and prior-handler semantics. The final shim requires positive si_code, installs only over SIG_DFL, and documents CPU-ID/timestamp migration approximation and signal overhead. Canceled the preliminary rerun through the actual lifetime-lock cancellation path, confirmed its container and workspace were removed, then launched the final-image fur comparison. Cancellation diagnostics are retained separately.
- Live real-container checks passed: simulated CI pause/resume, 5.08 seconds paused, successful output; intentional Blender failure returned the error log and cleaned the job folder. These checks exposed and fixed a startup race: the supervisor now waits until Docker reports the container running before attempting a pause. Nonblocking SSH stdin EAGAIN is retried by the heartbeat reader.
- At this intermediate point, fur comparison and final installed-runner validation remained pending. The final verification below supersedes that pending status.

## Final implementation verification

- Successful real fur comparison: 768x1024 RGB, 32 Cycles CPU samples, T7, current eyeliner, 420,420 strands. Independently inspected both images and decoded pixels. Zero different pixels, mean and max channel difference zero. PNG byte hashes differ, so the comparison explicitly measures decoded pixels.
- PC: 179.03 seconds whole job, 25.4 seconds render. Mini: 915.20 seconds whole job, 919.45 seconds including transfers, 426.3 seconds render, 2,443,864 KiB peak Blender RSS (2.33 GiB), no CI pause during this benchmark. This is about 5.1 times slower end to end, adding independent capacity while the PC queue is busy.
- Full fur measurement used image `7360373764ec`, shim hash `40a0d9dd...`. Final image `4ca31db66d0f`, shim `d15b8954...`, adds only forwarding of user-generated SIGILL. Stored measured C source and exact diff confirm the normal RDTSCP kernel-fault path is unchanged. Independent review found another full render unnecessary for that isolated negative-case fix. Final compiler tests preserve both UD2 and user SIGILL fatal behavior.
- Final installed-image live checks succeeded: denoised Cycles cube, 5.045-second simulated CI pause/resume, intentional Blender failure with 5.085-second pause and retained diagnostics, and cleanup. A queued test waited behind the real fur lock, confirming serialization. All 19 WSL tests pass; all 12 supervisor tests pass on the mini.
- Remote jobs directory is empty and no mini-blender containers remain after the checks. Removed only the task's debug image. The installed compute image remains. CI and WSL configuration and other worktrees were preserved.
- Independent whole-outcome review confirmed the image comparison and reported no further substantive code defects. Operating guide, raw comparison/logs, input/image hashes, lifecycle evidence and scoped review are under `docs/design/mini-blender-evidence/`.
