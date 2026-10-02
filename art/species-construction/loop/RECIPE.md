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
| `sweep R --step ID --grid ARG=v1,v2 [--grid ...] [--variants f.json] [--max 12] [--region Rxx] [--out NAME] [--top 6] [--contain-tol .004]` | Tries many values of one step's parameters in one call, builds only what changed, runs `quick`, scores and ranks the variants (section Sweeps). |

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

## Sweeps

`recipe.py sweep` lets a builder try many values of a parameter in one tool call instead of one turn per value. It does not assemble or packet anything: the builder picks the best variant and runs one `build` of its candidate recipe, then its own assembly.

```
python art/species-construction/loop/recipe.py sweep <recipe> --step B-23 --grid spec:lobeWidthRadius=0.0115,0.0135,0.0155 [--grid ...] [--max 12] [--region R07] [--out NAME]
python art/species-construction/loop/recipe.py sweep <recipe> --step B-21 --variants variants.json
```

- `--grid ARG=v1,v2,...` takes the ARG forms of `set` (a `--flag` or `spec:<dotted.path>`; list indices are path parts, as in `spec:clawEach.length.0`). Values are split on commas outside brackets, so a value may be a JSON list (`spec:upperRod=[[0,.04,.044],[1,.04,.044]],[[0,.038,.043],[1,.04,.044]]`). Several `--grid` options form a product. `--variants file.json` is an explicit list of `{arg: value}` dicts and is added to the grid's variants. More than `--max` variants (default 12) is an error before anything runs.
- `--region` picks the zone from `species.json` that fit and station rows are read over (default: the first region of the step). `--out` names the sweep folder; by default it is `sweep-NNNN` from the shared counter (`next-number --reserve`). `--top` is how many variants the contact sheet shows (default 6).
- Each variant's candidate recipe is `<sweep folder>/vNN.json`. A spec edit is written once to `sweep_specs/<step>-<hash>.json` (content addressed, so two variants with the same spec share one file and one step key). A spec edit that changes nothing keeps the baseline's spec path, so that variant's key is the baseline's.
- Build scope: the edited step and its descendants in the same component. Upstream steps and the other component are the baseline's: the cache entry under today's key, else the step's `existing` directory. A step with a cache entry costs nothing; two variants with the same key are built once. Builds go through `run_step` (a field build that dies of a memory error because another agent's Blender holds the RAM is retried once after 45 s), so each Blender job takes the shared slot lock; the sweep runs at most `BLENDER_SLOTS` jobs at once and waits for a slot when another agent holds them. A variant whose build fails is reported with its error and does not stop the others.
- Each variant is then rendered with `loop_tools.py quick` (baseline head plus the variant body, or the reverse for a head step) into `sweep_quick/quick_<head>__<body>/` (keyed by the two directory names, so a repeat is free; the baseline quick lives there too). Nothing is written into an existing output directory.

### Score

All terms are measured on the quick render (front, left, back) against the baseline's own quick render, so the numbers are deltas of one tool against itself:

| Term | Meaning | Better |
|---|---|---|
| `fitIou` | mean over the three views of the silhouette IoU (model against reference, `loop_tools.canonical` frame) over the region's zone rows (in the front and back views also only the columns of the zone's x extent, so a change in a small region is not diluted by the rest of the figure; an asymmetric zone uses all columns). `fitBandIou` is the same from `fit.json` for the fit band (head, trunk, legs) holding most of the zone, for reference only | higher |
| `stationDiff` | model station table (`sheet_measure.stations`, step .02, the sheet's own) against `loop/sheet.json` over the zone rows: mean of `abs(width diff) + abs(centre diff)` per left, right and central pick and view, in figure heights; a pick present in only one table costs .1 | lower |
| `containMax` | worst foreign-region maximum displacement of the edited step against its input (`contain`), figure heights; the full report is `contain-vNN.json` | lower |
| `seam` | only if `seam_check.py` exists: `seam_check.check(variant render, baseline=baseline render)`; the worst ratio of any joint's rise in any metric to that metric's flag threshold (0 nothing new, 1 or more is a flagged new seam defect), with where it is. Without the module the term is skipped | lower |
| `silhouetteChange` | information only: fraction of the zone window's reference area whose model silhouette differs from the baseline's (front, left, back). Near zero means the parameter does nothing the quick silhouette can see | |

`total = 100*(fitIou - base) - 100*(stationDiff - base) - 100*max(0, containMax - containTol) - 5*seamRatio`. Containment is charged only above `--contain-tol` (default .004, twice the remesh noise floor). A parameter whose `silhouetteChange` is below about .002 moves the score by noise; judge those by `sweep.png` or by a posed or shaded check. A term that cannot be measured drops out of the total, and `sweep.json` lists the parts of each total under `parts`. The weights are a ranking aid, not a verdict: IoU and stations on a sparse region are noisy, so read the contact sheet before trusting a ranking whose top two totals are within about 0.3.

### Outputs

`<sweep folder>/sweep.json` (every term per variant, per-step and quick seconds, the baseline terms, the best variant), `sweep.png` (the top variants and the baseline: fit overlays of the three views cropped to the zone, grey both, blue model only, orange reference only, with parameters and scores), `vNN.json`, `contain-vNN.json`. The command prints a table and the path of the best candidate recipe. A builder then runs `recipe.py build <that recipe>` for the full cache-aware build, `contain` on the new output, and its single assembly.

### Caveats

- A baseline step with neither a cache entry nor an `existing` directory stops the sweep ("build the recipe first").
- A stale cache key (the step's script changed after it was seeded, as for `rebuild_hind_paws_field.py` after round 18) means the baseline value of a parameter is rebuilt like any other value rather than reused; that variant is then a useful control: its score against the baseline shows what the script drift alone does.
- Quick uses the placement defaults of `loop_tools.py`, not the recipe's `assembly.args`.
