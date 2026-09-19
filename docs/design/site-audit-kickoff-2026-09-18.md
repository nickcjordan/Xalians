# Site audit remediation: kickoff for the orchestrator

Written for: the Opus orchestrator. Nick starts a session in the prepared worktree and invokes `/site-audit-remediation` (or pastes "Read docs/design/site-audit-kickoff-2026-09-18.md and do what it says"). Everything else is yours.

## What is already prepared

- This worktree, `C:/dev/src/xalians-remediation`, is a detached checkout of `origin/main` with `npm ci` done at the root. If `git status` shows a branch instead, run `git fetch origin main && git checkout --detach origin/main` before anything else.
- The design authority is `docs/design/site-audit-brief-2026-09-18.md`. The findings behind it are in `docs/design/site-audit-2026-09-18.md`. Issues #423 to #445 on `nickcjordan/Xalians` carry the per-issue acceptance criteria. Read the brief in full before the first tool call that changes anything.
- The verification harness is checked in at `scripts/audit/` (`README.md` there). `playwright-core` is a root dev dependency and uses the installed Chrome; nothing to install.
- The "before" screenshots for the audited routes on the deployed site are at `untracked/site-audit/before/` (`report.md` and `data.json` beside the images). If the folder is missing, regenerate it: `node scripts/audit/verify.mjs --routes audited --out untracked/site-audit/before`.
- The run log is at `untracked/site-audit-run.md`, pre-filled with every issue and wave. If it is missing, copy `scripts/audit/run-log.template.md` there.
- Baseline test results on main are recorded at the top of the run log.

## What you do

1. Read the brief. Then read `CLAUDE.md`, `docs/BACKLOG.md`, and sections 1, 2 and 10 of `docs/DESIGN_SYSTEM.md`.
2. Confirm the baseline: `npm test -- --run` in `apps/web`, and `npm test -- --run` in `packages/content` and `packages/rules`. Record the result in the run log. If anything fails on main, file an issue and note it; do not fix it inside a wave PR unless it blocks that PR.
3. Run the waves exactly as the brief's section 4 lays them out. For each issue: cut a worktree from `origin/main` (`git worktree add C:/dev/src/xalians-audit-<issue> -b audit/<issue>-<slug> origin/main`; run `npm ci` there), spawn a Sonnet builder with the issue body, the brief's section for that issue, and the ground rules; when it reports done, review the diff yourself, run `node scripts/audit/verify.mjs --base http://localhost:3000 --routes <affected routes>` against a dev server in that worktree, then spawn a Sonnet critic with the brief's section 6 checklist and the issue's acceptance criteria. Merge only on an all-pass verdict; otherwise send the failing criteria back to the builder. Open the PR ready, with `Fixes #N`, and arm auto-merge at once. Update the run log at every state change.
4. After each wave merges, fetch main, wait for the deploy (the bundle hash in the served `index.html` at `https://www.xalians.com` changes), and run `node scripts/audit/verify.mjs --routes <the wave's routes>` against the deployed site. A regression found there is fixed before the next wave starts.
5. Clean up each finished worktree with `npm run wt -- --prune --yes` from the repo root.
6. Lore text goes through `.claude/skills/lore-factcheck/SKILL.md` before commit, every time. Species and planet prose obeys `.claude/skills/lore-voice/SKILL.md`.
7. Anything out of scope becomes a GitHub issue with labels the moment it is found.
8. Stop and ask Nick only for what the brief marks as his: nothing in the current brief is, so expect to run end to end. If a source contradicts the brief (a ratified doc says otherwise, a percentile direction is the reverse, a field does not exist), follow the brief's "verify" instruction, choose the reading the source supports, and record it in the PR body and the run log.
9. When every issue is closed, run the full audited set against the deployed site into `untracked/site-audit/after/`, then write the final report described in the brief's section 8, with the before and after pairs on an Artifact page.

## Cost discipline

Builders and critics run on Sonnet. You run on Opus and read every diff, but you do not re-read the whole brief into every subagent: give each builder only its own section, the ground rules, and the issue body. Keep the run log short. Report real token usage in the final report.
