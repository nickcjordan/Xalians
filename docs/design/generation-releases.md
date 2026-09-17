# Immutable generation releases

## Contract

A creature stores its resolved record and a small `provenance.releaseId` reference. The shared release archive stores the generator implementation, constants, registries, species templates, ability patterns, naming catalogs, and runtime dependencies used to produce it. These inputs are not duplicated in every creature.

`generatorVersion` identifies the algorithm revision; `schemaVersion` identifies the record format. A release ID identifies the complete executable snapshot. A content-only change requires a new release ID even if the algorithm and schema versions stay unchanged.

The first archived release is `generation-0.3.0-1` (schema 2). The signature/ability-pool revision is archived separately as `generation-0.4.0-1` (schema 3); replay keeps each release's original representation. Earlier records remain readable, but their exact historical dependencies have not been recovered or certified. Do not backfill their release IDs by guessing from a generator version.

## Storage and integrity

- `packages/rules/src/generator/currentRelease.json` selects the current release.
- `packages/rules/releases/<releaseId>/generator.mjs` is a self-contained ECMAScript 2022 module built by esbuild. It includes code, data, and schema runtime dependencies, with no external imports.
- The adjacent `manifest.json` records the artifact's SHA-256 fingerprint, source input fingerprints, generator/schema versions, and build tool/target information.
- Source fingerprints normalize CRLF to LF so Windows and Linux checkouts agree. Artifact fingerprints cover exact bytes.

The source dependency list comes from the bundler's actual input graph rather than a hand-maintained list. Build checks also rebundle and compare the artifact fingerprint, detecting changed module resolution or newly introduced dependencies. Display-only content and game grading are outside generation unless imported by the generator.

Fingerprints detect changes relative to a trusted manifest; they are not signatures establishing publisher identity. Archives and manifests are trusted application code in the repository. Preserve them with repository backups and retain them in any future artifact-storage migration.

## Generation and replay

The public generator stamps canonical species generation and batches with the current release ID. Templates and shared tables are frozen against accidental in-memory mutation. Custom template objects and direct low-level calls remain experimental: they have no release ID and cannot claim certified historical replay.

Replay requires species plus the recorded seed, release ID, generator/schema versions, origin, serial, timestamp, and profile. Missing profiles retain the historical `full` default. Invalid required inputs fail explicitly; replay does not invent a timestamp or substitute the current release.

```powershell
npm run replay:creature -- path/to/stored-record.json
```

The Node loader verifies archive integrity and version agreement, loads the archived implementation, and prints the regenerated record. It does not execute the current generator or current schemas against historical content. The archive uses standard JavaScript only; the CLI requires Node 20+. Replay tests should be retained and exercised when upgrading the runtime.

This is a local/server tooling capability, not a new HTTP endpoint. Historical artifacts are not shipped in the browser bundle. Stored records continue to serve ordinary display without replay.

## Authoring and freezing a new release

1. Make and validate generator/content changes. Use the low-level generator for experiments as needed.
2. Choose a new unique release ID in `currentRelease.json`. Bump the algorithm/schema versions separately when appropriate.
3. Run `npm run release:freeze`. The command refuses to overwrite an existing archive.
4. Run `npm run check:releases`, `npm run test:releases`, and the relevant generation/content tests. Add enduring replay fixtures when behavior changes.
5. Review and commit the new pointer, manifest, and artifact together with the source change. Retain all previous archives.

Frontend and API production builds run integrity checks before building. CI checks current input/artifact agreement, tests historical replay, and rejects modifications or deletions to previously archived files relative to the base branch. Local equivalent: `npm run check:releases -- --base origin/main`.

Do not modify an already frozen release to accommodate a later edit. Make a new release. During fluid development, finish a coherent content batch before freezing to avoid unnecessary archives.

## Deliberate boundaries

- Development calls against edited, unfrozen source are not certified releases; the production build gate blocks publishing them under an existing release ID. Do not persist such experimental records as canonical production creatures.
- Replay reconstructs generation facts, not later ownership, battle state, or game-specific derived grades.
- A hash without the archived artifact is insufficient for replay. An unavailable archive produces an explicit error.
- This does not recover pre-archive releases or change species lore, support roles, or ability-pool policy.

## Schema 4 release

Current release generation-0.5.0-1 uses generator 0.5.0 and schema 4.0.0. It separates actions/passives and adds structured spatial, timing, status, and removal facts. Both earlier archives remain replayable unchanged.

Integration release generation-0.5.0-2 includes ratified Shuntara from main. Generator/schema versions remain 0.5.0/4.0.0; the release ID pins the changed content. The earlier 31-species archive remains immutable.
