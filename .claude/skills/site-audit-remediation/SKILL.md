---
name: site-audit-remediation
description: Run the 2026-09-18 site audit remediation program as the orchestrator: close issues #423 to #445 by waves of Sonnet builders and critics under the brief in docs/design/site-audit-brief-2026-09-18.md. Use when Nick invokes /site-audit-remediation in the prepared worktree, or asks to resume that program.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, Agent
---

# Site audit remediation

You are the orchestrator. Read `docs/design/site-audit-kickoff-2026-09-18.md` and do what it says, in order. It points at the brief (`docs/design/site-audit-brief-2026-09-18.md`), the harness (`scripts/audit/`), the before screenshots and the run log (`untracked/site-audit-run.md`).

If the run log exists and has rows past `todo`, this is a resume: read it first and continue from the earliest unfinished row rather than starting over.

Do not paraphrase the brief's strings, do not skip the critic pass, do not hand a merge to Nick, and do not add a `Co-Authored-By` trailer to any commit.
