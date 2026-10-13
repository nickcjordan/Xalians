# @xalians/studio

Core library and CLI of Creature Studio (design: `docs/design/creature-studio.md`, sections 2 to 4). TypeScript source, no build step.

Records live as JSON in `art/creatures/<key>/`: `creature.json` plus one file per record under `references/`, `parts/`, `holds/`, `defects/`, `builds/`, `notes/`. Every record has an `id` (kind letter plus a ULID), a short `alias` (kind letter plus four characters, for example `H-k3f9`), `rev`, timestamps and `createdBy`. Schemas are strict: unknown fields fail validation.

## CLI

Run with `npm run studio -- <command>`. Output is plain text; add `--json` for JSON. Errors print one line and exit 1. Aliases are accepted anywhere an id is.

```
init <key> --name N --template PATH --silhouette PATH [--builds 6 --minutes 180]
intake <key> [--species TEMPLATE_KEY] [--silhouette PATH] [--force]   (creates the creature if missing and takes its lock, reads the template, encyclopedia entry and silhouette; idempotent)
part propose <key> --file parts.json   (replaces the proposed list: [{key, name, includes, why, dependsOn: [keys], order}])
intake reading <key> --file reading.json [--force]   (sets what Nick approves at intake: must-have, carried-over and open-for-design features, and questions; needs the session lock; a submitted intake goes back to open)
stage submit <key> intake|vision|sheet   (checks required outputs, sets the stage in-review)
reference add <key> --file IMG --role R --governs a,b --not-for x,y [--precedence n]   (PNG, JPG, WEBP or SVG)
reference edit <key> <alias> [--role R] [--governs ..] [--not-for ..] [--precedence n]
reference target <key> <alias> --file IMG --kind K [--provisional]
image run <key> --stage vision|sheet --element E --label TEXT --prompt-file FILE [--input IMG ...] [--governs a,b --not-for x,y]   (one Codex image run, recorded as an image build)
image present <key> --stage vision --element E        image present <key> --stage sheet   (shows reported images to Nick; each call is one round)
status <key>        next <key>
lock <key> --session LABEL        unlock <key>
part add <key> --file part.json
hold add <key> --file hold.json   hold strike|lift <key> <alias> --reason TEXT
defect add <key> --file defect.json
note add <key> --file note.json   (a review note by nick also applies the review)
build plan <key> --part P --kind preview|build --goal TEXT --method TEXT [--targets a,b] [--allow-multiple]
build plan <key> --stage blockout --goal TEXT --method TEXT [--targets a,b]   (whole-form build, no part; budget is the creature default; no target needed the first time)
build start|fail <key> <alias>
build output <key> <alias> --name N --file PATH [--role R --camera C]   (file goes to the blob store)
build ingest <key> <alias> --packet DIR     (reads DIR/packet.json: renders, baselines, diffs, heat map, measures, Blender minutes)
build reference <key> <alias> --camera ID [--file IMG --label TEXT] [--overlay IMG]   (X24: --file adds a labeled reference image for that camera to the build's `compare` list, shown first beside the options; --overlay stores this build's overlay for the camera as role overlay, which the Options view toggles to)
build judge <key> <alias> --file checks.json      (X25: a JSON array of strings, the numbered "What to judge" checks shown above the images; the first option of a presented set that has them supplies the list; works on any build, image builds included)
build overlay <key> <alias> --dir DIR      (blockout builds: DIR/<view>.overlay.png stored as role overlay, camera = view; optional DIR/fit.json { view: iou } becomes fit-iou:<view> measure checks)
build report <key> <alias> --file report.json
build check <key> <alias> --file checks.json
build look <key> <alias> --camera C --image OUTPUT_NAME --note TEXT
build present <key> <alias>
verify
blob put <file>     (prints the sha256; store is $XALIANS_STUDIO_STORE, default C:/dev/art-data/studio)
cost collect <key> <build alias> [--projects DIR]   (token cost from Claude Code transcripts, see Cost)
cost show <key> [<part>]    (totals per build, part and creature)
watch <key>         (prints REVIEW/DECISION lines for new notes by nick; run under a monitor)
```

## Cost

**Tagging rule: every builder Agent call's `description` must start with `[<build alias>]`, for example `[B-k3f9] skull build`.** The collector finds a build's subagents by that tag in the transcript's `.meta.json` description (or, failing that, in the agent's first user message). An untagged builder is invisible to it.

`studio cost collect <key> <alias>` scans `~/.claude/projects/*` for every slug containing "xalians" (case-insensitive), reads each `<session>/subagents/agent-*.jsonl`, and sums `usage` per category (input, output, cache read, cache write), de-duplicated by message id (the same message appears on several lines, and a streamed message's output count grows, so the largest value per id is kept). Pass `--orchestrator-session <session id>` on `build plan` or `build start` to record the orchestrator session. It writes `cost.tokens` (subagents only), `cost.agents` (one row per agent), `cost.orchestratorTokens` and `cost.uncovered` to the build. The orchestrator figure is approximate and comes only from that one session (`<slug>/<id>.jsonl`): its assistant messages with a Xalians cwd between the build's `startedAt` and `endedAt` (or now), which may include other work that session did in the window. With no session recorded the share is omitted and `cost.uncovered` says so. It is never added into `cost.tokens`. Messages with no usage are counted in `cost.uncovered`, not treated as zero. Codex sessions are out of scope. Transcripts are only read.

Mutations need the creature lock (`.lock`, gitignored, stale after 12 hours). Pass `--session` (or set `STUDIO_SESSION`) so a command is refused if another session holds the lock. `--by` sets the actor (`orchestrator` default, `nick`, `builder:<alias>`, `import`). The root is found by walking up to `packages/studio`; override with `--root` or `STUDIO_ROOT`.

## Library

`openCreature(root, key)` gives `list`, `get`, `create`, `update` (atomic, rev-checked). `status`, `planBuild`, `submitReport`, `canPresent`, `applyReview` in `engine.ts` are pure functions over `store.load()`. `verifyAll(root)` backs `studio verify` and CI.

Tests: `npm test -w packages/studio`; types: `npm run typecheck -w packages/studio`.

`partView(data, part)` and `needsNick(data)` in `engine.ts` feed the review screen (`/studio` in apps/web, dev server only); `review.ts` has `recordReview`, `strikeHold` and `recordChoice`, the writes the screen makes as Nick without the creature lock.

## Stages: intake, vision and sheet

`creature.intake` (strict, optional) holds what intake read: template path and sha256, name, element, home world, body plan, covering, `sizeCm` (the template's `heightCm`, or null), the template's `lore.description` as `loreSummary` (the encyclopedia entry's definition is the fallback), appearance and anatomy lists, and the silhouette blob. The record key and the template key are separate: `studio intake fixture-dromeus --species dromeus`.

`intake.reading` (strict, optional) is what Nick approves at intake: `mustHave` (feature plus source `description`, `silhouette` or `both`), `carryOver` (high-level features read from the silhouette), `openForDesign` (feature plus optional note; decided on the vision board and model sheet) and `questions`. The species description is mandatory and the silhouette a high-level reference (see "Reading a creature at intake" in `docs/design/creature-studio.md`). `studio intake reading <key> --file reading.json` sets it (refused once intake is approved unless `--force`; re-running `studio intake` keeps it). Submitting intake requires a reading with at least one must-have, and the approval evidence includes the reading's hash, so editing it later shows the stage out of date. Proposed parts stay required as the orchestrator's build plan, but Nick is not asked to approve them.

Parts proposed at intake have status `proposed`. Nick's verdict on a stage is `recordStageReview(store, { stage, verdict, text })` in `review.ts` (a review note with `about.stage`, by nick, via studio; no creature lock). Approve records evidence (sha256 of the silhouette blob, the template sha, each part's content hash; for vision each reference record, image and target blob; for the sheet each shown sheet image and the consistency note), makes proposed parts `not-started` and opens the next Phase 1 stage. Adjust or reject returns the stage to `open` with his words. A part's content hash leaves out status, so starting work on a part does not stale the approval; editing what it includes does. `status()` reports an approved stage whose evidence moved, or whose template file changed on disk, as `stale` with the reason. Changing proposed parts or references while a stage is in-review sends it back to `open`.

The Phase 1 stages are `intake`, `vision`, `sheet`, `blockout`, `parts`, `coherence`, `surface`, `color`, `readiness`; `rig`, `animate`, `atlas` are reserved. `vision` was `references`; a creature file written with the old name is read as `vision` (and gets a locked `sheet`).

The review screen shows these at `/studio/<key>` (stage track and parts), `/studio/<key>/stage/intake` and `/studio/<key>/stage/vision` and `/studio/<key>/stage/sheet`. Keep test creatures under `art/creatures/fixture*/`, which is gitignored.

## Image runs, the vision board and the model sheet

An image run is a build with `kind: image`, no part and no defect targets, and a strict `image` block: stage, element, label, the exact prompt and its sha256, inputs (name and blob), tool `codex image_gen`, the path of Codex's own file, `codexTokens`, `model: null`, optional `governs`/`notFor` for a vision pick, `round` (set when presented) and `failure` (log tail). `studio image run` creates the build as `running`, makes `<store>/codex-runs/<build alias>/` (outside the repository; the repo Stop hook traps Codex inside it), copies the inputs there, writes the wrapper prompt and runs `codex exec --sandbox workspace-write --skip-git-repo-check -C <folder> --output-last-message <folder>/reply.md -` with the prompt on stdin (binary from `STUDIO_CODEX_BIN`, default `codex`; a `.js`/`.cjs` path is run with node). It stores `output.png` as a `render` output, reads `tokens used` from the log, records wall minutes and sets `reported`. A failed or timed-out (15 minute) run is a `failed` build carrying the log tail, and the command exits 1.

`image present` sets reported images to `presented` and stamps them with the next round for that element (`vision:<element>`) or for the sheet. `status` lists the rounds, so a third set for one element (two failed regenerations) shows up as a signal to change approach. Nick, in the screen, picks one option per vision element (`pickImage`: a reference with role = the element, governs and not-for from the image build, precedence next in line; a decision note by nick; the other options become `superseded`) or says none of these (`adjustElement`: a review note with verdict `adjust` and `about.element`; the set becomes `superseded`). On the sheet he marks problems on an image (`markSheetImage`: defects with `stage: sheet`, no part). The sheet stage submits only with vision approved, a shown turnaround image for each of front, threequarter, side and back, a shown bare-body image, and an orchestrator `decision` note about stage `sheet` whose text starts "Consistency check:".
