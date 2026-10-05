# Recipe usage note

A creature is a recipe: `docs/design/species-construction/<species>/recipe.json`. It names pinned trunk roots, a DAG of build steps (each a Blender script plus its exact arguments) and one assembly. `recipe.py` builds it, caches every step, and rebuilds only what an edit touches. Contract: `docs/design/species-construction/LOOP-v3.md`, section M1. How the Akinza steps were reconstructed: `docs/design/species-construction/akinza/lineage-0458.md`.

Run everything from the repository root: `python art/species-construction/loop/recipe.py <command> ...`.

## Commands

| Command | What it does |
|---|---|
| `status R` | Roots checked against their sha256, then one row per step: key, cached directory or `-> build`, with the step's `CHANGED <path>` inputs, its unpinned inputs and (for a step that would rebuild) its estimated minutes. Exits 1 when a pinned input changed. |
| `build R [--assembly NAME] [--from STEP] [--no-cache] [--dry-run] [--allow-changed]` | Builds every step without a cache hit, two Blender steps at once, then assembles. Prints `{"head": ..., "body": ..., "assembly": ...}`. `--from` forces that step and everything downstream; `--dry-run` prints the plan and the estimated rebuild minutes only. Refuses (exit 2) while a pinned input is `CHANGED`; `--allow-changed` is recovery only. |
| `pin R [--write]` | Makes every file each step reads immutable (section Pins). Without `--write` it reports and exits 1 while anything is left to do; with `--write` it freezes, repoints, records `pins`, then re-seeds the repointed steps. |
| `minutes R [--write]` | Measures each existing output's build time (stage-start to the last file the build wrote) and stores it as the step's `minutes`; `build --dry-run`, `status` and `set` use it for the rebuild estimate. |
| `seed R [--write-expect] [--loose]` | Maps each step's `existing` directory to its key without building. Strict by default (section Honest cache): a step is mapped only when every file it reads is the bytes its output recorded, and exits 1 otherwise. `--loose` maps anyway (explicit recovery; the cache entry is marked `loose` and is never trusted as a hit). `--write-expect` stores each output's vertex and face counts and bounds in the recipe. |
| `set R OUT STEP ARG VALUE [ARG VALUE ...]` | Writes a new recipe with one step edited. `ARG` is a `--flag` (its value tokens are replaced; `true` or `false` toggle a switch), `spec:<dotted.path>` (a parameter inside the step's `--spec` JSON; the edited spec is written beside OUT as `<out stem>.<step>.spec.json`) or `script` (the step's script path, to point it at a new versioned copy). Pins carry forward for inputs that did not change and are recorded for new ones. Prints the plan and the estimated rebuild minutes. |
| `add R OUT --after STEP --step step.json [--rewire STEP:INPUT]` | Writes a new recipe with a step inserted (its `pins` recorded from today's bytes). Consumers of STEP that read it through the same input name as the new step, and the assembly sink, are rewired to the new step. |
| `rebase [OLD] NEW CAND OUT [--live]` | Re-cuts a candidate onto a newer base (section Rebase). Starts from NEW and takes the candidate's version of every step it added or changed, with fresh pins; the old base is optional when the candidate carries `derivedFrom`. |
| `merge BASE A B OUT` | Combines two candidates that changed disjoint steps of one base. Refuses when both changed a step, or both added a step after the same one. |
| `verify R [--no-cache] [--no-packet]` | Replays every step and the assembly into fresh directories (the cache index is left alone), compares each step with its `expect` block, then runs `loop_tools.py check`, `packet` and `measured` on the replayed assembly and compares its `measured.json` with the original's. Writes `recipe-verify-NNNN.json` in the work folder. About 45 minutes of Blender plus the packet. |
| `contain R STEP [--out-dir NAME] [--zones FILE] [--no-reference]` | Nearest-vertex displacement between the step's input and output, per foreign region, in figure heights (95th percentile and maximum), judged against the footprint of the step's own baseline version (section Containment). Zones come from `species.json`. Writes `containment.json` in the output directory; for a seeded (historical) directory, or when a report already exists, it writes `<dir>.containment[-N].json` beside it instead, because outputs are immutable. |
| `sweep R --step ID --grid ARG=v1,v2 [--grid ...] [--variants f.json] [--max 12] [--region Rxx] [--out NAME] [--top 6] [--contain-tol .004]` | Tries many values of one step's parameters in one call, builds only what changed, runs `quick`, scores and ranks the variants (section Sweeps). |
| `candidate R --baseline PACKET [--region Rxx] [--assembly-name auto] [--base RECIPE] [--dry-run]` | One call per candidate: build, check, packet, measured, diff, seams, contain, then one JSON summary (section Candidate). |
| `run-plan PLAN [--top K] [--dry-run]` | A planner's plan (variants, sweeps, optional start) in one blocking call: build, quick, score, then the top K through `candidate`; writes `plan-result.json` and `plan-result.png` (section Plans). |

## How an order edits a recipe

An order never builds by hand. The builder copies the baseline recipe to its candidate path (`docs/design/species-construction/<species>/loop/recipes/r<round>-<region>.json`), edits only steps its region owns with `set` (or `add`s a step tagged with the region), runs `candidate` (one call: build, check, packet, measured, diff, seams, contain; section Candidate), or `build`, `contain`, `quick` and `fit` by hand. A step's `regions` field says which orders may touch it. `set` and `add` drop the `expect` block of the changed step and everything downstream, because the recorded counts no longer describe them. `build` on a candidate rebuilds exactly the steps whose key changed and the assembly.

## Cache key

`recipe-cache.json` in the species work folder (`untracked/species-construction/<species>/`) maps a step key to its output directory name. The key is the sha256 of a JSON object holding:

1. The step's script bytes and the bytes of every local module it imports, found by `import` and `from` statements against `art/species-construction/` and followed recursively, all with line endings normalised to LF.
2. The step's `args` with `{repo}` replaced by `.` (so a key does not depend on where the repository is checked out). `{name}` input placeholders and `{out}` stay symbolic.
3. The keys of the step's inputs (a root's key is the hash of its declared file hashes).
4. Addition to the contract: the LF-normalised content hash of every argument that names an existing file under `{repo}/` (specs, tables), so editing a spec file in place invalidates the step. The contract's rule alone would not notice it.

The assembly key hashes the head and body step keys, the assembly args and the assembler script with its imports. Output directories keep the `head-NNNN`, `body-NNNN`, `assembled-NNNN` names from the shared counter; while a step runs, a `<name>.reserved` marker file keeps a concurrent agent off its number. Nothing ever deletes or rewrites an output directory.

## Pins: every file a step reads is immutable

A step reads its script, every local module the cache key covers (`import` and `from` statements against `art/species-construction/`, followed recursively) and every `{repo}/...` file argument (specs, tables; an absolute path outside the repository counts too). `pin` makes each of them immutable:

```
python art/species-construction/loop/recipe.py pin <recipe> [--write]
```

For every step and the assembly it compares each file's current bytes with the bytes the step's output used, which is the sha256 its `stage-start.json` recorded (`sources` for the script and modules, `inputs` for file arguments; CRLF, LF or raw form, as `seed` checks). Then:

- **Bytes match.** The path stays and its LF-normalised sha256 goes into the step's `pins` map (`{path: sha256}`; the assembly has its own `pins` for the assembler and its modules).
- **Bytes differ.** `pin` searches git history (`git log --all` over the path and over every path that ever carried the recorded file name or the file's own name) for a blob whose raw, LF or CRLF form is the recorded hash, and writes a frozen copy beside the original: scripts as `<name>_p<sha8>.py` (so imports resolve), other files as `<stem>-p<sha8><ext>`. With `--write` it repoints the step at the copy, records the pins and re-seeds the repointed steps (their keys changed with the path). Without `--write` it reports "would freeze" and writes nothing.
- **Nothing to compare** (no output yet, the module is not in the output's record): the file is pinned from today's bytes and listed as `unverified`. Akinza has one: `head_r01_ops.py`, which `shape_head_silhouette_field.py` imports but the record does not list.
- **Cannot be repointed**: a module whose bytes differ (the script imports it by name, so a copy would need an edited script), the assembler, or bytes no commit ever held. `pin` prints `OPEN ...` and exits 1; fix by hand (commit the run-time bytes under a versioned name, then run `pin` again).
- A pin that no longer equals the file but the file equals what the output used is re-recorded; a changed file with no output record to settle which bytes ran is an open problem.

`pin` without `--write` exits 1 while anything is left to do, so `loop_preflight.py` can require "nothing to pin". The frozen copies and the recipe go in one commit.

Scripts that must change go to a new name (`recipe.py set R OUT STEP script art/species-construction/<new>.py`); the old name is never edited again once a step is pinned to it. Where a script was edited after a step ran, the run-time version is also committed beside it under an `_rNN` name (`author_rear_lock_table_field_r11.py`, ...), the pre-`pin` convention. Specs that existed only in the data directory are committed under `art/species-construction/specs/`.

## Honest cache

- **`status` and `build` compare `pins` with the bytes now.** A pinned input that changed prints `CHANGED <path>` (`MISSING` when it is gone), the step is not a cache hit and neither is anything downstream, `status` exits 1 and `build` refuses (exit 2) unless `--allow-changed` is given for recovery. A step with files not yet in its `pins` shows `N unpinned`.
- **Seeded mappings are checked when they are used.** A cache entry that came from `seed` is trusted only while the files the step reads are the bytes its output recorded; otherwise the plan says `DIFFERS <path>` and the step rebuilds. Entries mapped with `seed --loose` never hit. This closes the round 19 hole: an old loose seed had mapped the key of a step whose `--spec` was the live `R03.md` to an output that file never produced.
- **`seed` is strict by default.** It maps a key to an output only when every file the step reads equals the bytes the output recorded and every recorded input is a file the recipe feeds, and it refuses a step whose input step was refused (a key chains through its inputs). It exits 1 when it refused anything. `--loose` is for explicit recovery; `--strict` is accepted and ignored.
- **`set` and `add` carry pins.** Editing a step keeps the recorded sha of every input it still reads (so a file edited in place stays `CHANGED`) and records a pin for each new file (a new spec, a new script).
- Output directories are never rewritten: a second `contain` report goes beside the first as `<dir>.containment-N.json`.

## Rebuild cost

Each step stores `minutes` (`recipe.py minutes R --write`): stage-start to the last file the build wrote, counted from the step's existing output (files added to the directory long after the build, such as a copied spec or a containment report, are not build time). `build --dry-run`, `status` and `set` print per rebuilding step `~N min` and a total: the serial sum and the wall time of a greedy schedule on two Blender slots in dependency order, plus the assembly. A step without a recorded time uses the newest build in the cache; one with neither is named. For the Akinza recipe an edit to the first head step rebuilds the whole head chain, about 26 minutes of Blender (the head chain is H24 to H33; the body chain runs beside it), a body step late in the chain a minute or two, and the assembly about 5 minutes.

## Containment relative to the step's own footprint

A flat .002 reads as a side effect any displacement a step caused outside the regions it owns, but a step that rewrites a region whose zone overlaps a neighbour (the R03 fan front over the head, R01 and R04) moves that neighbour's volume by its own overlap. `contain` therefore measures the **baseline version of the same step** over the same zones and owned regions and judges the candidate against it:

- **Reference.** The step's `existing` output against the output of its input's `existing` (a root's directory for a root). A step added to the recipe has no `existing`; its reference is the nearest earlier step of the same component that owns one of its regions and has an `existing` output (H36, the R03 tool step, is judged against H33, the method it replaces). References are cached in `<work>/contain-ref/` (keyed by the step, output, input, owned regions and a hash of the zones, frame and join). No baseline version at all: the flat rule alone, and the report says so.
- **Rule.** Per foreign region and for outside-all-zones: `allowance = max(.002, 1.5 x reference maximum)`; `flagged` when the candidate's maximum exceeds it. The absolute numbers stay in the report (`p95`, `max`, `reference`, `allowance`, `excess`); `flaggedAbsolute` is the old flat reading and `verdict.absolute` / `verdict.relative` list the regions each rule flags. A region the baseline step never reached keeps the .002 allowance, so a step that newly reaches into a neighbour still flags.
- **Zones.** Zones are the stock `species.json` zones; a zone that is too shallow for a region's own volume makes that region's overlap read as foreign (R03's was widened to y +.07 for this reason). The relative rule removes the overlap from the verdict, it does not replace correct zones.

## Rebase: starting from an older candidate

The live `recipe.json` moves on every kept round, so a candidate cut from it earlier cannot be merged into the current one (the new base changed the assembly, pins and repointed scripts the candidate also touched). Every candidate that `set`, `add`, `merge` or `sweep` writes therefore records a `derivedFrom` block: the base file's sha256 and, per base step, a hash of each of `script`, `args`, `inputs`, `regions`, `runner`, `kind` and `component`, and of the assembly's `head`, `body` and `args`. A candidate of a candidate keeps the original block; the live `recipe.json` is always itself a base.

```
python art/species-construction/loop/recipe.py rebase <new base> <candidate> <out> [--live]
python art/species-construction/loop/recipe.py rebase <old base> <new base> <candidate> <out> [--live]     # candidates without derivedFrom
```

- A step is **changed by the candidate** field by field: a field whose hash differs from the recorded (or old-base) one. A step absent from the record is **added**. A step the candidate lacks is removed.
- The result is the new base with the candidate's changed fields laid over it (so a step the new base repointed to a frozen script and the candidate only re-argued keeps both), added steps carried after the nearest earlier candidate step, and `note` taken from the candidate. Refuses (naming each `step.field`) only when the new base and the candidate changed the same field of the same step to different values; the same change on both sides is fine.
- Changed and added steps lose `existing`, `expect` and `minutes`, everything downstream loses `expect`, and their `pins` are recorded fresh from the bytes they name. Script and spec bytes are taken **as they were at the candidate's commit**: when the live file has changed since (and the candidate file is committed and unmodified), the candidate-time blob is frozen as `<name>_p<sha8>` as `pin` does and the step is pointed at it. `--live` pins the files as they are now instead (use it when a tool script was improved after the candidate was written; `tool-R06-pinned.json` does, for `sweepScore`).
- The assembly is the new base's, with its args, pins and `existing`; the candidate's `head` or `body` is taken only when it changed that reference. `existing` and `expect` are dropped when a sink changed or sits downstream of a changed step. Candidate assembly args changes are reported and not carried.
- `OUT` gets a fresh `derivedFrom` (the new base) and `rebasedFrom`. The command prints the plan; the exit status is 1 when the result has a `CHANGED` or `DIFFERS` input, so an accepted rebase builds without refusal.

The round 17 and 18 candidates and the R03 and R06 starters have `*-pinned.json` rebases beside them in `loop/recipes/`.

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
| `containMax` | worst foreign-region maximum displacement of the edited step against its input (`contain`), figure heights; the full report is `contain-vNN.json`. Charged as `containExcess`: the worst region's displacement above `max(--contain-tol, its allowance)`, where the allowance is `max(.002, 1.5 x the displacement the baseline version of the step gave that region)` (section Containment) | lower |
| `toolScore` | only when the edited step's output holds a JSON record with a top-level numeric `sweepScore` (higher is better, optional `sweepTerms` dict). The score is read from the baseline step's own output; when that output predates the score, from the worst variant. A tool uses it for what the quick silhouette cannot see (below) | higher |
| `seam` | only if `seam_check.py` exists: `seam_check.check(variant render, baseline=baseline render)`; the worst ratio of any joint's rise in any metric to that metric's flag threshold (0 nothing new, 1 or more is a flagged new seam defect), with where it is. Without the module the term is skipped | lower |
| `silhouetteChange` | information only: fraction of the zone window's reference area whose model silhouette differs from the baseline's (front, left, back). Near zero means the parameter does nothing the quick silhouette can see | |

`total = 100*(fitIou - base) - 100*(stationDiff - base) - 100*containExcess + 100*(toolScore - base) - 5*seamRatio`. Containment is charged only above `--contain-tol` (default .004, twice the remesh noise floor). A parameter whose `silhouetteChange` is below about .002 moves the score by noise; judge those by `sweep.png` or by a posed or shaded check. A term that cannot be measured drops out of the total, and `sweep.json` lists the parts of each total under `parts`. The weights are a ranking aid, not a verdict: IoU and stations on a sparse region are noisy, so read the contact sheet before trusting a ranking whose top two totals are within about 0.3.

### Outputs

`<sweep folder>/sweep.json` (every term per variant, per-step and quick seconds, the baseline terms, the best variant), `sweep.png` (the top variants and the baseline: fit overlays of the three views cropped to the zone, grey both, blue model only, orange reference only, with parameters and scores), `vNN.json`, `contain-vNN.json`. The command prints a table and the path of the best candidate recipe. A builder then runs `recipe.py build <that recipe>` for the full cache-aware build, `contain` on the new output, and its single assembly.

### Caveats

- A baseline step with neither a cache entry nor an `existing` directory stops the sweep ("build the recipe first").
- A stale cache key (the step's script changed after it was seeded, as for `rebuild_hind_paws_field.py` after round 18) means the baseline value of a parameter is rebuilt like any other value rather than reused; that variant is then a useful control: its score against the baseline shows what the script drift alone does.
- Quick uses the placement defaults of `loop_tools.py`, not the recipe's `assembly.args`.

### Tool scores (`sweepScore`)

The quick silhouette cannot see everything a tool changes (at the waist the side edge is the hanging arm, so a sweep of the R06 trunk tool was blind to the waist). A step script can therefore record its own score: a top-level `sweepScore` (a number, higher is better) and an optional `sweepTerms` dict in any JSON record it writes to its output directory. `recipe_sweep.py` reads the first such record of the edited step's output for every variant and of the baseline step, and adds `100 x (variant - baseline)` to `total` (`parts.tool`; the table shows a `tool` column and the contact sheet a `tool` line). `author_trunk_sections_field.py` writes it into `trunk-sections.json`: the negative weighted RMS of achieved minus target over the station rows (front, back, depth, half width, in fit units), each row weighted by its loft weight so rows the loft does not touch drop out. It ranks changes to how the build realizes the table (loft weights, exponents, reach, voxel size). A sweep that moves the targets themselves moves the yardstick with them (achieved tracks target, the score stays flat); add `sweepReference` to the spec (`{"<y>": {"back": -.012, ...}}`) and the score measures achieved against that fixed table for the quantities it names, which is how a waist sweep ranks, e.g. `--variants` entries `{"spec:stations.9.back": -0.0048, "spec:sweepReference": {"0.44": {"back": -0.012}}}`.

## Candidate: one call per candidate

A builder makes one call per candidate instead of chaining build, check, packet, measured, diff, seams and contain by hand:

```
python art/species-construction/loop/recipe.py candidate <candidate recipe> --baseline <baseline packet dir> [--region R03] [--assembly-name auto] [--base <recipe>] [--dry-run]
```

It blocks until done and prints a few progress lines (`build: ...`, `done H36 -> head-NNNN in Ns`, `check`, `packet`, `diff`, `contain`), then **one compact JSON line, always the last line of output** (the same JSON, indented, is `candidate.json` in the packet). Never poll Blender yourself: the command holds the Blender slots, waits for a free one and retries a memory-killed field build once.

Stages, in order:

1. **build**: refuses (exit 2, `failure` names the file) while a pinned input is `CHANGED`; otherwise builds exactly the steps whose key changed, then assembles under the next number (`--assembly-name NAME` to choose one).
2. **check**: `loop_tools.py check`. A failing technical check stops the run (exit 3) with the reasons (components, non-manifold edges, height or ground spread); the build results are still written.
3. **packet** into `untracked/species-construction/<species>/loop/packets/<assembly>`. `packet` already computes `measured.json` and `seams.json`; the seam check is run against the baseline packet's render (`--baseline` is passed through), so `seams.json` holds changes, not absolute scores. A packet that already has `index.json` and `seams.json` is reused.
4. **diff** against the baseline packet (`diff.json`).
5. **contain** for every step the candidate changed or added relative to the base it was cut from: its `derivedFrom` block, else `--base`, else the species' live `recipe.json`. An output that already has a containment report reuses it (outputs are immutable); otherwise the report is written as `contain` does, judged by the relative rule.

Summary fields: `assembly`, `packet`, `componentDirs` (head, body and each changed step's output), `changedSteps`, `build.rebuilt` (step, directory, minutes), `check` (`pass`, `reasons`), `measuredChanged` (every criterion whose value or result differs from the baseline packet: `id`, `region`, `before`, `after`, `bound`, `result` as [before, after]), `measuredFailing`, `seamsNew` (`joint`, `view`, `kind`, `value`, `where`), `regionChange` (magnitude per region from `diff.json`), `regionShift` (per region zone, the largest nearest-vertex displacement of the assembled figure against the baseline assembly, figure heights; `--owned` names the target regions whose zones are excluded from the others, default `--region`; see `region_shift.py`), `containment` (per changed step: `flaggedRelative`, and `worst`, the three worst regions with `max`, `allowance`, `excess`, `flagged`), `warnings` (a changed step not tagged with `--region`), `wallMinutes` and `verdict`, a one-line hint that only counts what moved ("R03 measured: 2 changed (1 newly passing); no new seams flagged; containment within allowance"). It is not a visual judgment: open the packet images for that. On failure `ok` is false, `stage` and `failure` say where, and everything gathered so far is still written (to the packet, or to `packets/unbuilt-<recipe>-<time>/` when nothing was built).

`--dry-run` prints the plan, the steps that would be contained and the estimated minutes (build from the recorded step times, plus fixed allowances for check, packet and diff) and builds nothing. A foreground Bash call times out at 10 minutes: when the estimate is above about 9, start it with `run_in_background` and wait for the completion notice (it is one wait, not a poll).

## Preflight

`python art/species-construction/loop/loop_preflight.py <species> [--args-out FILE] [--skip-python-tests] [--stop]` runs the checks the orchestrator needs before every batch, in order, and prints a one-screen summary; it exits 1 when any check fails and a batch must not start then:

1. `node --test art/species-construction/loop/test/` (core, state and replay tests);
2. the Python tests under `art/species-construction/loop/test/` (`unittest discover`: slot lock, seam check, recipe pins);
3. `node build_workflow.mjs --check` (`loop_workflow.js` is current);
4. `recipe.py pin <recipe>` with nothing left to pin or freeze;
5. `recipe.py status <recipe>` with every step cached, the assembly built, no `CHANGED` input and nothing unpinned;
6. `loop_state.py args <species>`, with the arguments written to `--args-out` (default: the species loop folder's `args.json`).

## Plans: one command from a planner's plan to scored candidates

`recipe.py run-plan` is the runner's whole job: a planner agent writes a plan file, one blocking command builds, scores and packets it, and reviewers pick among the results. Schema for planners: `docs/design/species-construction/akinza/loop/plan-schema.md`.

```
python art/species-construction/loop/recipe.py run-plan <plan.json> [--top K] [--dry-run]
```

A plan is `{"order": {"round", "region", "with": [...]}, "base": "<baseline recipe>", "baselinePacket": "<packet dir>", "start": <optional>, "variants": [...], "sweeps": [...], "region": "R07", "top": 3}`. Up to 16 variants plus sweep points, 24 builds in all (more is an error before anything runs). `region` (else `order.region`) is the zone every variant is scored over; a step an edit touches that is tagged neither with it nor with `order.with` is reported as a warning.

- **variants**: `{"name", "why", "edits": [...]}`. An edit is `{"op": "set", "step", "arg", "value"}` (`arg` as in `set`: a `--flag`, `spec:<dotted.path>` or `script`; a value may be a JSON list), `{"op": "script", "step", "script"}` (point a step at a new versioned script) or `{"op": "add", "after", "step": {...full step...}, "rewire": ["STEP:INPUT"]}` (as `add`). Edits apply in order to the starting recipe; consecutive `set`s of one step write one spec file. An empty `edits` list is the starting recipe itself (a control, or the tool starter as it is).
- **sweeps**: `{"step", "grid": {"arg": [values]}, "why"}`; the product of the lists becomes variants named `sweep <step> arg=value`.
- **start**: a recipe path (a branch or tool starter cut from an older base) or `{"recipe": path, "attachAfter": "<step>", "live": false}`. It is rebased onto `base` as `rebase` does. With `attachAfter`, the case the R03 tool starter hit (the starter added H36 after the old head sink H33, the new base added H34 and H35 after the same step, so both sides changed the head sink): every step the start added that reads the start's old sink (a step of its original recipe that nothing of that recipe reads) is re-parented onto `attachAfter`, the start's tip becomes the assembly sink, and the added steps are placed after `attachAfter`. Without it such a clash is the usual `rebase` refusal. A script that changed since the start was committed is frozen under `_p<sha8>` as `rebase` does (`"live": true` pins today's bytes instead); commit the frozen copy with the plan.

What it does, in order, blocking until done (progress lines go to stdout, the compact JSON is the last line):

1. Each variant gets its own recipe `plan-NNNN/vNN.json` in the species work folder (`derivedFrom` is the base, as `set` records it). A variant that cannot be prepared (bad step, bad arg, pinned input changed) is reported and skipped.
2. Every step without a cache hit is built once per distinct key (two variants with one key share the build) through `run_step`: the Blender slot lock, a memory-error retry after 45 s, outputs under fresh numbers. Nothing is assembled yet.
3. `quick` renders the variant's component with the baseline's other one; the sweep scorer ranks it against the baseline quick: silhouette overlap and station diff over the region's zone, the worst containment excess of the steps the variant edited, the tool's own `sweepScore` when its output records one, seam change, and `surface_stats.plan_terms(variant=, baseline=, region=, zone=)` when that module exists and defines it (`{"score": float}`, added to the total). The weights are those of section Sweeps.
4. The top K by total (`--top`, else the plan's `top`, else 3) run the full `recipe.py candidate` path (assembly, check, packet, measured, diff, seams, contain) in parallel up to the slot limit, each under an assembly number reserved with `next-number --reserve`.
5. `plan-result.json` (every variant's score parts, built or error, rebuilt steps, contained steps; each top candidate's summary fields from its `candidate.json`) and `plan-result.png` (every variant's front, left and back fit overlay over the region's rows, baseline first, in columns, then the packet region image of the baseline and of each top candidate side by side) are written to the run folder and beside the plan (`plan.json` gives `plan-result.json`; any other name `<stem>-plan-result.json`, so two plans in one folder do not collide). One compact JSON line is printed last: per variant `built`, `rank`, `total` and score `parts`, per top candidate `assembly`, `packet`, `check`, `measuredChanged`, `seamsNew`, `containment` and `verdict`.

Fail soft: a failing variant or candidate is reported and the rest continue; the exit status is 0 when at least one top candidate has a packet. `--dry-run` writes the candidate recipes to a temporary folder (deleted afterwards), prints each variant's changed steps, the steps it would build with their minutes and the estimated wall time, and builds nothing; for a `start` it also prints the rebased recipe's plan.

A runner agent needs two tool calls: start the command with `run_in_background` (a plan takes 10 to 25 minutes), then read the notice and `plan-result.json`. A foreground call times out at 10 minutes.
