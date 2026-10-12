# @xalians/studio

Core library and CLI of Creature Studio (design: `docs/design/creature-studio.md`, sections 2 to 4). TypeScript source, no build step.

Records live as JSON in `art/creatures/<key>/`: `creature.json` plus one file per record under `references/`, `parts/`, `holds/`, `defects/`, `builds/`, `notes/`. Every record has an `id` (kind letter plus a ULID), a short `alias` (kind letter plus four characters, for example `H-k3f9`), `rev`, timestamps and `createdBy`. Schemas are strict: unknown fields fail validation.

## CLI

Run with `npm run studio -- <command>`. Output is plain text; add `--json` for JSON. Errors print one line and exit 1. Aliases are accepted anywhere an id is.

```
init <key> --name N --template PATH --silhouette PATH [--builds 6 --minutes 180]
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
watch <key>         (prints REVIEW/DECISION lines for new notes by nick; run under a monitor)
```

Mutations need the creature lock (`.lock`, gitignored, stale after 12 hours). Pass `--session` (or set `STUDIO_SESSION`) so a command is refused if another session holds the lock. `--by` sets the actor (`orchestrator` default, `nick`, `builder:<alias>`, `import`). The root is found by walking up to `packages/studio`; override with `--root` or `STUDIO_ROOT`.

## Library

`openCreature(root, key)` gives `list`, `get`, `create`, `update` (atomic, rev-checked). `status`, `planBuild`, `submitReport`, `canPresent`, `applyReview` in `engine.ts` are pure functions over `store.load()`. `verifyAll(root)` backs `studio verify` and CI.

Tests: `npm test -w packages/studio`; types: `npm run typecheck -w packages/studio`.

`partView(data, part)` and `needsNick(data)` in `engine.ts` feed the review screen (`/studio` in apps/web, dev server only); `review.ts` has `recordReview`, `strikeHold` and `recordChoice`, the writes the screen makes as Nick without the creature lock.
