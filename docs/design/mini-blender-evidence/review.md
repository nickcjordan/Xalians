# Independent adversarial review and repairs

Reviewer: separate scoped review agent, task `/root/review_mini_blender`, 2026-10-16. It reviewed the brief and actual code without editing files or running remote compute.

The review identified case-sensitive Windows overwrite checks, remote cleanup of active mounts, premature local-slot release, pause/completion races and lost failure diagnostics. Follow-up review found mixed-case filename translation, ignored unpause failures, ignored removal failures with unbounded wait, and possible orphan containers after failed cleanup. Repairs and regression tests are in the runner and supervisor. The primary implementation audit also repaired container startup readiness, nonblocking SSH reads and WSL resource measurement. Real-container pause/resume and intentional failure cleanup succeeded.

The RDTSCP compatibility review found the register writes, instruction advance and fenced RDTSC ordering appropriate for a timer use, with a documented limitation: CPU-ID and timestamp reads are separate and can straddle a migration. The implementation now gates on kernel-generated SIGILL, installs only over the default signal action, preserves register upper bits and errno, and forwards unrelated user signals. Compiler-stage tests verify 1,000 increasing timer reads, zero upper register bits, and fatal UD2 and user-generated SIGILL. The official Blender executable remains byte-identical to the PC's executable.

Observed GDB fault before the repair:

```text
Thread 7 "blender" received signal SIGILL, Illegal instruction.
0x0000000005222af0 in ?? ()
=> 0x5222af0: rdtscp
   0x5222af3: shl $0x20,%rdx
   0x5222af7: mov %ecx,(%rdi)
   0x5222af9: or %rdx,%rax
```

The caller consumes both the timestamp and CPU ID. The guide therefore describes this as a single-node timer compatibility aid, not exact general emulation. Timing overhead and image behavior require the full fur comparison; a cube alone is not acceptance evidence. The image comparison and final whole-outcome assessment are recorded in the task audit and operating guide.
