# Backlog & Ticketing Standards

GitHub Issues on this repo is the single backlog. If work is worth remembering, it is worth an issue; chat transcripts, audit docs, and PR comments are not backlog storage.

## Labels

Every issue gets **one priority**, **one or more type labels**, and **one or more area labels**.

**Priority** (exactly one):

| Label | Meaning |
|---|---|
| `P1` | Do next — actively hurts users or blocks the roadmap |
| `P2` | Do soon — real issue, not urgent |
| `P3` | Someday — cleanup, polish, nice-to-have |

**Type**: `bug`, `enhancement`, `tech-debt`, `balance`, `infra`, `data`, `documentation`, `question` (needs a design decision from Nick before implementation — do not start these without an answer).

**Area**: `duel`, `generator`, `frontend`, `backend`.

## Milestones

GitHub Milestones track roadmap chunks (e.g. "M3: Rules hardening", "M4: Flavor pass", "M5: Multiplayer (deferred)"). Attach an issue to a milestone only when it is genuinely part of that deliverable. Milestones marked "(deferred)" hold designed-but-not-scheduled work; nothing in them should be started without an explicit go-ahead.

## Issue quality bar

- **Title**: imperative and specific enough to understand from the list view. Prefix game/area context when useful ("Duel: …", "Data: …").
- **Body**: what is wrong / wanted, where (file paths, line refs), and — for anything non-obvious — acceptance criteria. Link related issues.
- Small related items may be bundled into one checklist issue (see the "polish bundle" pattern) rather than filed as noise.

## Workflow rules (for Claude sessions)

1. **File findings immediately.** Anything discovered mid-task that is out of scope for the current PR becomes an issue right then, with labels and enough body to be actionable cold. Do not park findings in chat or in markdown docs.
2. **Reference issues from PRs.** Use `Fixes #N` / `Closes #N` in the PR body so merges auto-close tickets. A PR that partially addresses an issue references it without a closing keyword and leaves a comment on the issue saying what remains.
3. **Pull from the backlog by priority.** When Nick says "work the backlog" (or equivalent), take P1s first, oldest first, unless he names a ticket. Confirm scope on `question`-labeled issues before implementing.
4. **Close with evidence.** When an issue is resolved outside a PR (e.g. AWS console change), comment with what was done and close it.
5. **Keep it current.** If reality diverges from a ticket (fixed incidentally, superseded, wrong), update or close the ticket the moment it is noticed.
6. **Don't relitigate.** `wontfix`/closed decisions stand unless Nick reopens them.

## Relationship to other docs

- `docs/AUDIT_FINDINGS.md` is a **historical record** of the 2026-08-29 audit (what was found and fixed) plus the hidden-features reference table. Its open-item lists were migrated to issues and are no longer maintained there.
- `CLAUDE.md` carries a short pointer to this file; this file is the authority on process.
