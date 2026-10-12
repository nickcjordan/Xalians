# @xalians/studio

Core library and CLI of Creature Studio (design: `docs/design/creature-studio.md`, sections 2 to 4). TypeScript source, no build step.

Records live as JSON in `art/creatures/<key>/`: `creature.json` plus one file per record under `references/`, `parts/`, `holds/`, `defects/`, `builds/`, `notes/`. Every record has an `id` (kind letter plus a ULID), a short `alias` (kind letter plus four characters, for example `H-k3f9`), `rev`, timestamps and `createdBy`. Schemas are strict: unknown fields fail validation.

## CLI

Run with `npm run studio -- <command>`. Output is plain text; add `--json` for JSON. Errors print one line and exit 1. Aliases are accepted anywhere an id is.

```
init <key> --name N --template PATH --silhouette PATH [--builds 6 --minutes 180]
intake <key> [--species TEMPLATE_KEY] [--silhouette PATH] [--force]   (creates the creature if missing and takes its lock, reads the template, encyclopedia entry and silhouette; idempotent)
part propose <key> --file parts.json   (replaces the proposed list: [{key, name, includes, why, dependsOn: [keys], order}])
stage submit <key> intake|references   (checks required outputs, sets the stage in-review)
reference add <key> --file IMG --role R --governs a,b --not-for x,y [--precedence n]   (PNG, JPG, WEBP or SVG)
reference edit <key> <alias> [--role R] [--governs ..] [--not-for ..] [--precedence n]
reference target <key> <alias> --file IMG --kind K [--provisional]
status <key>        next <key>
lock <key> --session LABEL        unlock <key>
part add <key> --file part.json
hold add <key> --file hold.json   hold strike|lift <key> <alias> --reason TEXT
defect add <key> --file defect.json
note add <key> --file note.json   (a review note by nick also applies the review)
build plan <key> --part P --kind preview|build --goal TEXT --method TEXT [--targets a,b] [--allow-multiple]
build start|fail <key> <alias>
build output <key> <alias> --name N --file PATH [--role R --camera C]   (file goes to the blob store)
build ingest <key> <alias> --packet DIR     (reads DIR/packet.json: renders, baselines, diffs, heat map, measures, Blender minutes)
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

## Stages: intake and references

`creature.intake` (strict, optional) holds what intake read: template path and sha256, name, element, home world, body plan, covering, `sizeCm` (the template's `heightCm`, or null), the template's `lore.description` as `loreSummary` (the encyclopedia entry's definition is the fallback), appearance and anatomy lists, and the silhouette blob. The record key and the template key are separate: `studio intake fixture-dromeus --species dromeus`.

Parts proposed at intake have status `proposed`. Nick's verdict on a stage is `recordStageReview(store, { stage, verdict, text })` in `review.ts` (a review note with `about.stage`, by nick, via studio; no creature lock). Approve records evidence (sha256 of the silhouette blob, the template sha, each part's content hash; for references each reference record, image and target blob), makes proposed parts `not-started` and opens the next Phase 1 stage. Adjust or reject returns the stage to `open` with his words. A part's content hash leaves out status, so starting work on a part does not stale the approval; editing what it includes does. `status()` reports an approved stage whose evidence moved, or whose template file changed on disk, as `stale` with the reason. Changing proposed parts or references while a stage is in-review sends it back to `open`.

The review screen shows these at `/studio/<key>` (stage track and parts), `/studio/<key>/stage/intake` and `/studio/<key>/stage/references`. Keep test creatures under `art/creatures/fixture*/`, which is gitignored.
