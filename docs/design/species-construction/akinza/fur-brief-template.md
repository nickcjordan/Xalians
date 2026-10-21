# Akinza fur step brief template (shared rules for every step)

Worktree `C:\dev\src\xalians-akinza-loop`, branch `akinza/construction-loop`. Tools: `art/species-construction/surface/build_surface.py`, `render_surface.py`, config `art/species-construction/surface/akinza-surface.json`, palettes `akinza-palettes.json` (T7 default). Current surface: `untracked/species-construction/akinza/surface/fur-steps/s11d/surface.blend` (built on assembled-3300). Step log: `untracked/species-construction/akinza/surface/fur-steps/progress.txt` (read its last 10 lines first; append one line per step in the same format). Stage log: `docs/design/species-construction/akinza/surface-backlog.md` "Fur stage log" (one short line per step). Read `git log --oneline -12` to see how earlier steps were done; reuse their render cameras and views.

## Rules (all sourced)
- One Blender process at a time (Nick, standing). WSL Blender as earlier steps used it.
- Change only what your step names. Every other region's fur must stay as it is (inferred from Nick's approvals of earlier steps). Hold: geometry of assembled-3300 is fixed (Nick approved the integrated creature, approved-looks.json).
- Fur is hair tufts, never feathers; short on face/head/neck (Nick 2026-10-09).
- At most 4 tries for your step. Render only the views your step needs (at about 1000 px, a before/after side-by-side per view, left before, right now). Short write-up.
- Commit each step separately with an explicit path list (`git add <paths>`; never `git add -A`, never bare git stash). Commit message "Akinza fur step 12x: <what changed, plain words>". No Co-Authored-By or AI trailer. Do not push; Claude pushes after review.
- New surface goes in `fur-steps/s12<x>/`. When your step supersedes an earlier fur-steps surface folder (not s11d's predecessors already archived), move the superseded folder to `C:\Users\njord\.claude\scratch-archive\Xalians\2026-10-15\` (rm -rf is denied). Keep the surface your step built on until your step is committed.
- Never create a file named inspect.py. Never edit reference files.
- Self-check before reporting: look at your own renders at full size and say what still looks wrong. Never report "done" on a change you cannot see in the render; if Nick could not see a difference, it is not fixed.
- Report: commit, surface path, image paths, one sentence of what changed, "Still off:" list, "Blocked by:" if anything held you back, elapsed time.
- Fur bug gate (Nick 2026-10-15, "Can you fix all of these sorts of fur bug issues"): before reporting, run the body-wide artifact sweep built in step 12d (strands through the body, outlier length, roots on one part ending over another, excess lift) on your surface; counts must not rise in any region versus the "before" surface, and any new cluster is fixed before reporting.

## Codex run notes
- Codex is the builder; Claude reviews the renders afterward. Commit only (explicit paths); Claude pushes after review.
- Final message is the report. Do not self-approve: say plainly what is still visibly wrong at full size, judged at the normal framing.
- Flag overlays use amber or blue, never red (Nick is red-green colorblind).
- Run: `node "$APPDATA/npm/node_modules/@openai/codex/bin/codex.js" exec --sandbox danger-full-access --skip-git-repo-check -C <worktree> --output-last-message <report.md> "Read AGENTS.md, then <brief>, and do exactly that step." < /dev/null`. Fix pass: `exec resume <session-id> -c 'sandbox_mode="danger-full-access"' ...`.
- Reference research first (Nick 2026-10-21): before building, gather 2 to 4 real-animal photos or video frames of the exact feature in the exact state (nearest animals for Akinza: fennec, arctic fox, cat), write a short mechanism note (pivot, rigid parts, what deforms, landmarks, range), and put the references beside every review render. Keep them local and untracked; they inform anatomy and motion, not the design.
