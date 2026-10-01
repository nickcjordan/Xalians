# Recipe usage note

A creature is a recipe: `docs/design/species-construction/<species>/recipe.json`. It names pinned trunk roots, a DAG of build steps (each a Blender script plus its exact arguments) and one assembly. `recipe.py` builds it, caches every step, and rebuilds only what an edit touches. Contract: `docs/design/species-construction/LOOP-v3.md`, section M1. How the Akinza steps were reconstructed: `docs/design/species-construction/akinza/lineage-0458.md`.

Run everything from the repository root: `python art/species-construction/loop/recipe.py <command> ...`.

## Commands

| Command | What it does |
|---|---|
| `status R` | Roots checked against their sha256, then one row per step: key, cached directory or `-> build`. |
| `build R [--assembly NAME] [--from STEP] [--no-cache] [--dry-run]` | Builds every step without a cache hit, two Blender steps at once, then assembles. Prints `{"head": ..., "body": ..., "assembly": ...}`. `--from` forces that step and everything downstream; `--dry-run` prints the plan only. |
| `seed R [--write-expect] [--strict]` | Maps each step's `existing` directory to its key without building, and checks that the pinned script bytes equal the sha256 the output's `stage-start.json` recorded and that the recorded input hashes are the files the step is fed. `--write-expect` stores each output's vertex and face counts and bounds in the recipe. |
| `set R OUT STEP ARG VALUE [ARG VALUE ...]` | Writes a new recipe with one step edited. `ARG` is a `--flag` (its value tokens are replaced; `true` or `false` toggle a switch) or `spec:<dotted.path>` (a parameter inside the step's `--spec` JSON; the edited spec is written beside OUT as `<out stem>.<step>.spec.json`). Prints the plan. |
| `add R OUT --after STEP --step step.json [--rewire STEP:INPUT]` | Writes a new recipe with a step inserted. Consumers of STEP that read it through the same input name as the new step, and the assembly sink, are rewired to the new step. |
| `merge BASE A B OUT` | Combines two candidates that changed disjoint steps of one base. Refuses when both changed a step, or both added a step after the same one. |
| `verify R [--no-cache] [--no-packet]` | Replays every step and the assembly into fresh directories (the cache index is left alone), compares each step with its `expect` block, then runs `loop_tools.py check`, `packet` and `measured` on the replayed assembly and compares its `measured.json` with the original's. Writes `recipe-verify-NNNN.json` in the work folder. About 45 minutes of Blender plus the packet. |
| `contain R STEP [--out-dir NAME] [--zones FILE]` | Nearest-vertex displacement between the step's input and output, per foreign region, in figure heights (95th percentile and maximum). Zones come from `species.json`. Writes `containment.json` in the output directory; for a seeded (historical) directory it writes `<dir>.containment.json` beside it instead, because outputs are immutable. |

## How an order edits a recipe

An order never builds by hand. The builder copies the baseline recipe to its candidate path (`docs/design/species-construction/<species>/loop/recipes/r<round>-<region>.json`), edits only steps its region owns with `set` (or `add`s a step tagged with the region), runs `build`, then `contain` on each new component output, then `quick` and `fit`. A step's `regions` field says which orders may touch it. `set` and `add` drop the `expect` block of the changed step and everything downstream, because the recorded counts no longer describe them. `build` on a candidate rebuilds exactly the steps whose key changed and the assembly.

## Cache key

`recipe-cache.json` in the species work folder (`untracked/species-construction/<species>/`) maps a step key to its output directory name. The key is the sha256 of a JSON object holding:

1. The step's script bytes and the bytes of every local module it imports, found by `import` and `from` statements against `art/species-construction/` and followed recursively, all with line endings normalised to LF.
2. The step's `args` with `{repo}` replaced by `.` (so a key does not depend on where the repository is checked out). `{name}` input placeholders and `{out}` stay symbolic.
3. The keys of the step's inputs (a root's key is the hash of its declared file hashes).
4. Addition to the contract: the LF-normalised content hash of every argument that names an existing file under `{repo}/` (specs, tables), so editing a spec file in place invalidates the step. The contract's rule alone would not notice it.

The assembly key hashes the head and body step keys, the assembly args and the assembler script with its imports. Output directories keep the `head-NNNN`, `body-NNNN`, `assembled-NNNN` names from the shared counter; while a step runs, a `<name>.reserved` marker file keeps a concurrent agent off its number. Nothing ever deletes or rewrites an output directory.

## Pins and committed scripts

A step's `script` is pinned to the bytes that ran. Where the working copy of a script changed after a step ran, the run-time version is committed beside it under an `_rNN` name (`author_rear_lock_table_field_r11.py`, `rebuild_arms_field_r05.py`, ...), so imports still resolve. Specs that existed only in the data directory are committed under `art/species-construction/specs/`. `seed` prints, per step, whether the pinned script's sha256 (CRLF or LF form) is the one the output's `stage-start.json` recorded.

## Join (assembly) parameters

The recipe's `assembly.args` are the placement flags of `loop_tools.py assemble`. When they equal the defaults, `build` calls `assemble head body out` unchanged. Otherwise they are written to a join JSON (`{"head-scale": .5, ...}`) under `recipe-tmp/` and passed as `--join`.
