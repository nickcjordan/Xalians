# Immutable generation releases

## Current prototype override, 2026-09-25

The release workflow below is historical, not the current creature-authoring process. Nick has deferred active generator and species versioning until real user creatures are ready to be issued. The current v5 generator compiles `docs/species-templates/v5/*.json` through the ordinary `canonicalSpeciesCatalog.json` content bundle. New prototype records do not carry generator/schema versions, release IDs, or species revisions. Adding or editing a species requires its creative audit, source validation, and `node scripts/bundleLore.js`, but no freeze, snapshot, or revision file. Current builds do not compare source to a frozen release. Historical archives and revisions stay available for records that already use them; the old release tooling is retained for historical replay and integrity only. Before public launch, explicitly design production provenance and how any retained prototype records are handled. Do not clear records now.

The sections below document the earlier archival system. Their instructions to freeze, revise, or check current source no longer govern prototype authoring.

## Contract

A creature stores its resolved record and provenance identifying the generating engine. Records made under schema 5.2 also carry `provenance.speciesRevision`, the hash of the exact species definition used. The engine archive stores implementation, shared schemas, registries, derived-act and naming rules, and runtime dependencies. Individual species definitions are archived separately by content hash.

`generatorVersion` identifies the algorithm revision; `schemaVersion` identifies the record format. Since `generation-0.9.0-1`, `releaseId` identifies the species-independent executable engine, while `speciesRevision` identifies the species content. Adding or revising a species within the existing contract changes only species data and its revision. It does not change generator or schema versions and does not require a new engine archive. Older release IDs still identify combined code-and-roster snapshots and retain their original replay behavior.

The first archived release is `generation-0.3.0-1` (schema 2). The signature/ability-pool revision is archived separately as `generation-0.4.0-1` (schema 3); replay keeps each release's original representation. Earlier records remain readable, but their exact historical dependencies have not been recovered or certified. Do not backfill their release IDs by guessing from a generator version.

## Storage and integrity

- `packages/rules/src/generator/currentRelease.json` remains a legacy public-generator pointer. The former v5 `currentCreatureRelease.json` pointer was removed when prototype versioning was disabled.
- `packages/rules/releases/<releaseId>/generator.mjs` is a self-contained ECMAScript 2022 module built by esbuild. Current creature-engine archives contain shared code and schemas but no species roster; earlier archives retain their original combined form.
- `docs/species-templates/v5/revisions/<key>/<sha256>.json` retains each exact species definition. `packages/content/json/canonicalSpeciesCatalog.json` is the generated current roster, not an engine input.
- The adjacent `manifest.json` records the artifact's SHA-256 fingerprint, source input fingerprints, generator/schema versions, and build tool/target information.
- Source fingerprints normalize CRLF to LF so Windows and Linux checkouts agree. Artifact fingerprints cover exact bytes.

The source dependency list comes from the bundler's actual input graph rather than a hand-maintained list. Build checks also rebundle and compare the artifact fingerprint, detecting changed module resolution or newly introduced dependencies. Display-only content and game grading are outside generation unless imported by the generator.

Fingerprints detect changes relative to a trusted manifest; they are not signatures establishing publisher identity. Archives and manifests are trusted application code in the repository. Preserve them with repository backups and retain them in any future artifact-storage migration.

## Generation and replay

The public generator stamps canonical species generation and batches with the current release ID. Templates and shared tables are frozen against accidental in-memory mutation. Custom template objects and direct low-level calls remain experimental: they have no release ID and cannot claim certified historical replay.

Replay requires species plus the recorded seed, release ID, generator/schema versions, origin, serial, timestamp, and profile. Schema 5.2 records additionally require `speciesRevision`. Missing profiles retain the historical `full` default. Invalid required inputs fail explicitly; replay does not invent a timestamp, substitute the current engine, or use the current species definition in place of an archived revision.

```powershell
npm run replay:creature -- path/to/stored-record.json
```

The Node loader verifies archive integrity and version agreement, loads the archived implementation, and prints the regenerated record. For schema 5.2 it also verifies and loads the exact content-addressed species definition. It does not execute the current generator or current schemas against historical content. The archive uses standard JavaScript only; the CLI requires Node 20+. Replay tests should be retained and exercised when upgrading the runtime.

This is a local/server tooling capability, not a new HTTP endpoint. Historical artifacts are not shipped in the browser bundle. Stored records continue to serve ordinary display without replay.

## Former authoring and engine-release procedure (inactive)

This procedure was used while the v5 generator was frozen. It is retained as historical context and must not be followed for current prototype authoring. The active process is stated above: validate, audit, and update the ordinary content bundle. Earlier content revisions remain available for historical replay.

The former shared-change release procedure was:

1. Make and validate the shared change. Use the low-level generator for experiments as needed.
2. Choose a new unique engine release ID in the appropriate current-release pointer. Bump algorithm and schema versions only when their respective contracts change.
3. Freeze the appropriate engine entry point. The command refuses to overwrite an existing archive.
4. Run `npm run check:releases`, `npm run test:releases`, and the relevant generation/content tests. Add enduring replay fixtures when behavior changes.
5. Review and commit the new pointer, manifest, and artifact together with the source change. Retain all previous archives.

Frontend and API builds now regenerate the current content bundle instead of requiring a frozen generator. CI still tests historical replay and rejects modifications or deletions to archived files relative to the base branch. `npm run check:releases -- --base origin/main` checks those historical artifacts only.

Do not modify an archived engine or species revision. Current shared and creature-only prototype changes need no new engine release or species revision.

## Deliberate boundaries

- Historical versioned records replay against their archives. Current prototype records are not certified for immutable replay and should not be represented as production creatures. The content-bundle check rejects stale current content.
- Replay reconstructs generation facts, not later ownership, battle state, or game-specific derived grades.
- A hash without the archived artifact is insufficient for replay. An unavailable archive produces an explicit error.
- This does not recover pre-archive releases or change species lore, support roles, or ability-pool policy.

## Schema 4 release

The first schema-4 release, `generation-0.5.0-1`, uses generator 0.5.0 and schema 4.0.0. It separates actions/passives and adds structured spatial, timing, status, and removal facts. Both earlier archives remain replayable unchanged. The selected game release is `generation-0.5.0-4` in `packages/rules/src/generator/currentRelease.json`; the standalone schema-5 archive is `generation-0.6.0-1`.

Integration release generation-0.5.0-2 includes ratified Shuntara from main. Generator/schema versions remain 0.5.0/4.0.0; the release ID pins the changed content. The earlier 31-species archive remains immutable.

Release generation-0.5.0-3 tightens authoring validation: effect subject restrictions inherit capability compatibility; compatibility cannot add targeting subjects; self-only targeting must admit a creature and cannot transfer resources to itself. Existing templates and generated capability facts are unchanged. All prior archives remain intact.

Release generation-0.5.0-4 completes status applicability/boundary metadata and shared removal-method definitions. It introduces no new powers or game behavior. See ability-redesign-completion.md for the completion audit and deferred game work.


## Schema 5 integration checkpoint

The redesigned release adapter is `packages/rules/src/generator/creatureRelease.ts` (generator 0.6.0, schema 5.0.0). `createCreatureRelease(releaseId, sources)` compiles a nonempty, uniquely keyed species roster once and exposes the existing archive interface: `GENERATION_RELEASE_ID`, `getSpeciesTemplates`, and `generateXalian`. The release entry point also exports the two version constants. Caller-supplied species objects cannot be substituted at generation time.

Generation requires a species key, nonempty string seed, origin, serial, timestamp, and profile. It validates these caller inputs, not the completed creature. The species key, seed and algorithm version form the random namespace; labelled streams separate biology, abilities, appearance and ID. The appearance odds retain the existing policy (eclipse 1/4000, prismatic 1/400, gleam 1/40, otherwise standard). Showroom forces standard appearance without changing generated biology. The result contains resolved data plus compact provenance; it does not duplicate registries or authoring definitions.

`freeze({entryPoint, releaseId, archives})` supports an explicit entry point and destination for integration tests. Its default CLI behavior is unchanged. It verifies the bundled export contract and release identity before creating an archive. The dependency graph automatically fingerprints the v5 catalog, benchmarks, schemas, compiler, naming, species JSON and PRNG, together with their runtime dependencies.

The release tests freeze the hypothetical support species into a temporary archive and separately freeze the complete canonical roster into a temporary archive. They validate complete v5 records, replay every canonical species in both profiles, and exercise fresh-process replay for the adapter fixture. Those temporary archives are deleted after the tests.

Compilation, four-action generation, freezing and replay establish structural validity and reproducibility, not creative completeness. New or edited species still require the logically exhaustive, evidence-backed [ability audit](../species-templates/ABILITY-AUDIT.md) over derived acts, exclusions and supported extensions. Four selected actions per individual are not a target size or cap for the species act space.

### Frozen canonical v5 archive

The 32 source-audited definitions under `docs/species-templates/v5/` are bound by `packages/rules/src/generator/canonicalCreatureRelease.ts`. Release `generation-0.6.0-1` freezes that entry point, the complete roster, schema, catalog, compiler, naming and PRNG inputs. Integrity and full-roster replay checks pass. The rating pass is recorded in [creature-v5-calibration.md](creature-v5-calibration.md); the seeded construction test samples 24 seeds per species and checks guaranteed identity and four distinct actions.

At this initial checkpoint, the legacy game pointer remained `generation-0.5.0-4`; game adoption of v5 was separately scoped. The [roster audit](creature-roster-audit.md) resolved paralysis and records explicit lore-only deferrals for unignited fuel and physical route barriers.

Current state, 2026-09-23: `canonicalCreatureRelease.ts` selects frozen v5 `generation-0.8.0-1` with generator 0.8.0 and schema 5.1.0. Schema 5.1 replaces `weightKg` with `massKg`, requires at least one overall linear dimension, and supports optional height, length and width bands. One size percentile resolves all declared measurements, and Frackworm's established 900 to 1500 cm band is represented as length instead of height. The 32-species roster retains its other facts and abilities. Powerworks and Reclamation consume the new v5 release; Reclamation displays the applicable dimensions and mass. The legacy public generator still selects v4 `generation-0.5.0-4`, and all earlier v5 archives remain replayable. Fathomaw is not yet in the frozen roster. A new species or another substantive change needs another release ID.

Current state, 2026-09-24: `generation-0.8.0-2` adds ratified Fathomaw as the 33rd canonical v5 species without changing generator 0.8.0 or schema 5.1.0. The v5 roster now differs from the legacy v4 `RATIFIED.json` manifest, which still controls the public v4 bundle and remains unchanged. The new archive freezes Fathomaw's template, shared tables, and existing 32 species while prior archives remain replayable. Powerworks and Reclamation already consume the v5 release interface, but Fathomaw-specific presentation and mechanic support in each game need separate review. The preserved portrait is a design reference, not a compact game token.

Current state, 2026-09-25: `generation-0.9.0-1` is the one-time transition to a species-independent engine, generator 0.9.0 and record schema 5.2.0. The authoring template schema remains 5.1.0 because no species field changed. The current catalog contains 33 independently versioned templates. The engine archive imports no species definition or current catalog. New records carry the engine release ID and a species revision hash; old records continue replaying through their original combined archives. The migration preserves all established generated facts for the existing species apart from the new provenance shape. Future compatible species additions do not require another engine snapshot.
