# Construction loop v3: design contract

Status 2026-10-01: the contract for the seven changes in [LOOP-v3-plan.md](LOOP-v3-plan.md). It names every module, its owner, its public interface, its file formats and the check that proves it works. Agents build against this document; only the integrator (the main session) edits `loop_workflow.src.js`, the briefs and this document. [LOOP.md](LOOP.md) stays the description of v2 until v3 is proven, then it is rewritten.

## Context

The v2 run took Akinza from 2.72 to 5.45 in 16 rounds for about 18M subagent tokens. Rounds 2 to 7 gave +2.4 and rounds 8 to 16 gave +0.35 for the same cost per round. The waste had four sources:
- Builders spent 61 percent of tokens. They hand-built numbered directories from a long history and could not see a neighbour break until a critic did.
- About a fifth of builds were discarded for side effects, three harness bugs caused wrong verdicts and four restarts, and nothing stopped the run when gains flattened.
- Parts the rubric needed (the neck) had no owner who could reach them.
- Geometry could not be rebuilt from git. [lineage-0458.md](akinza/lineage-0458.md) shows 57 steps, 20 of which exist only as commands inside untracked packet files, two on script versions that are not committed.

v3 keeps the v2 roles and keep rules, and changes what an order is, how damage is caught, and when the loop stops.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | The recipe starts from pinned trunk roots (head-0204, body-0195), not from the Hunyuan inputs. The 2026-09-30 replay already rebuilt the trunk, and it drifted in bytes on 23 of 28 steps. | 80%: replaying the trunk adds 30 minutes per rebuild and buys nothing the pinned hashes do not | `akinza/lineage-0458.md` sections 1 and 5 |
| 2 | Steps stay warps of the previous mesh. The recipe does not make parts geometrically independent; it makes every change a parameter edit that rebuilds downstream, and a containment check catches bleed. The plan's "parts cannot damage each other" overstated this. | 85%: only arms, hind paws and fan front author geometry from parameters | `lineage-0458.md` section 6 |
| 3 | The judge stays in JavaScript and is the single source. The workflow script is generated from `loop_core.js` plus `loop_workflow.src.js`, and node runs the same core for tests and the judge simulator. | 90%: workflow scripts cannot import files, and a Python port would drift | `loop_workflow.js:184-218` |
| 4 | The neck gets an owner: the assembly join is a recipe step owned by R05, worked as a `join` order. | 85%: R05 could not be fixed because its orders went to the body builder only | `LOOP-v3-plan.md` evidence |
| 5 | Visual criteria of a non-target region are carried unchanged when its images moved less than a calibrated threshold; above it, the same critic judges them. Measured criteria are always recomputed. | 75%: a subtle break below the threshold can be missed; the combined check and the gate review still see everything | `loop_tools.py:542-561` |
| 6 | A parked region gets one automatic method review per batch (Opus), which may unpark it once with a new method. A second park in the same batch waits for the orchestrator. | 70%: v2 parked R04, R10, R11 and R12 and no method change ever reached them inside a batch | `status.json` regions |
| 7 | The proof is offline checks plus a live v3 batch from the current baseline, compared with v2 rounds 8 to 16 on tokens per +0.1. A full rerun from round 0 is not done: it would cost about 18M tokens to re-earn gains v2 already has. | 70%: the plateau is where v2 was weakest, so it is the fair comparison; a second species is the real test of generality | round records, `agent_costs.py` |
| 8 | The species config moves every Akinza constant out of the tools, so a second creature needs files, not code. | 90%: Nick's ask is the system, not one creature | `loop_tools.py:35-47, 281-282, 537-540` |

## Modules and owners

| Module | Files (all under `art/species-construction/loop/` unless named) | Owner | Depends on |
|---|---|---|---|
| M1 Recipe | `recipe.py`, `recipe_steps.py`, `docs/design/species-construction/<species>/recipe.json`, committed legacy scripts and specs | agent A | M3's `assemble --join` option |
| M2 Core and state | `loop_core.js`, `build_workflow.mjs`, `test/loop_core.test.mjs`, `judge_sim.mjs`, `loop_state.py` | agent B | none |
| M3 Species tools | `species.py`, `docs/design/species-construction/<species>/loop/species.json`, changes to `loop_tools.py`, `shakedown.py`, `sheet_measure.py` | agent C | none |
| M4 Workflow and briefs | `loop_workflow.src.js`, generated `loop_workflow.js`, `<species>/loop/*-brief.md`, `method-brief.md`, `landmark-brief.md` | integrator | M1, M2, M3 |

Only agent C edits `loop_tools.py`. Only agent B edits the core. Agents commit their own files by name on `akinza/construction-loop`, never `git add -A`, retry once on an index lock, and push after each commit (the repo is public; nothing secret goes in).

## M1 Recipe: a creature is a replayable recipe

### Format

`docs/design/species-construction/<species>/recipe.json`:

```json
{
  "schemaVersion": 1,
  "species": "akinza",
  "roots": {
    "head-root": {"dir": "head-0204", "files": {"head.blend": "<sha256>", "shape.glb": "<sha256>"}},
    "body-root": {"dir": "body-0195", "files": {"shape.glb": "<sha256>", "fairing.json": "<sha256>"}}
  },
  "steps": [
    {
      "id": "H24", "component": "head", "regions": ["R01"], "kind": "head",
      "script": "art/species-construction/shape_head_silhouette_field.py",
      "runner": "blender",
      "inputs": {"base": "head-root"},
      "args": ["--scene", "{base}/head.blend", "--spec", "{repo}/docs/design/species-construction/akinza/head-silhouette-0223.json", "--out", "{out}"],
      "expect": {"vertices": 0, "faces": 0},
      "note": "loop round 1"
    }
  ],
  "assembly": {
    "id": "J", "regions": ["R05"], "head": "H33", "body": "B23",
    "args": ["--head-scale", ".50", "--jaw-anchor-z", ".500", "--head-depth-offset", "-.020"]
  }
}
```

- `inputs` maps a name to a root or an earlier step id; `{name}` in `args` is that step's output directory, `{out}` the new one, `{repo}` the repository root. A step may read several inputs (H30 reads a base and a donor; H32 reads a scene and a material source), so the recipe is a DAG with one head sink and one body sink.
- `kind` is the output prefix (`head`, `body`). `runner` is `blender` (Windows, through `loop_tools.py blender`), `blender-wsl` or `python`.
- `expect` holds the recorded statistics the replay must match (vertex and face counts, bounds, and whatever the step's own record JSON reports).
- Every script and spec a step names must be committed. Script versions that exist only in a `source-snapshot/` are committed under a versioned name beside the original, such as `author_rear_lock_table_field_r11.py`, so their imports still resolve.

### Cache

`untracked/species-construction/<species>/recipe-cache.json` maps a step key to its output directory name. The key is the sha256 of: the step's script bytes and the bytes of every local module it imports (found by scanning `import` and `from` lines against `art/species-construction/`, recursively), all with line endings normalised to LF; the args after substitution of `{repo}` only; and the keys of its inputs. Output directories keep the `head-NNNN` and `body-NNNN` names from `loop_tools.py next-number`, so every existing tool still works.

### Interface

```
python art/species-construction/loop/recipe.py build <recipe.json> [--assembly <name>] [--from <step id>] [--no-cache]
python art/species-construction/loop/recipe.py status <recipe.json>          # per step: cached dir, key, stale or fresh
python art/species-construction/loop/recipe.py seed <recipe.json>            # map existing outputs to keys without building
python art/species-construction/loop/recipe.py set <recipe.json> <out.json> <step id> <arg> <value> ...
python art/species-construction/loop/recipe.py add <recipe.json> <out.json> --after <step id> --step <step.json>
python art/species-construction/loop/recipe.py merge <base.json> <a.json> <b.json> <out.json>
python art/species-construction/loop/recipe.py verify <recipe.json> --no-cache   # replay into fresh dirs, compare expect
python art/species-construction/loop/recipe.py contain <recipe.json> <step id> # containment report for one step
```

- `build` runs every step whose key is not cached, in dependency order, two Blender steps at once at most (the existing slot lock), then assembles (through `loop_tools.py assemble ... --join <json>`) and prints `{"head": dir, "body": dir, "assembly": name}`.
- `set` and `add` never edit the input file; they write a new recipe. A candidate recipe lives at `docs/design/species-construction/<species>/loop/recipes/r<round>-<region>.json`.
- `merge` combines two candidates that changed disjoint steps of one base; it refuses an overlap.
- `contain` measures, for one step, how far its output moved vertices outside the zones of the regions it owns (zones come from `species.json`; method as in `mesh_delta.py`). It writes `containment.json` beside the step output: per foreign region the 95th percentile and maximum displacement in figure-height units. Builders run it after every component build.

### Bootstrap and acceptance

1. Commit the data-dir-only specs (re-extracted from the records, see lineage section 5 item 3) and the two snapshot scripts.
2. Write `akinza/recipe.json`: roots head-0204 and body-0195, head steps H24 to H33 (including the scratch donor x-e as a step), body steps B-14 to B-23, and the assembly of head-0455 with body-0448. `seed` maps every existing output to its key.
3. `status` reports every step cached. `build` builds nothing and names assembled-0458's inputs.
4. `verify --no-cache` replays all 20 loop-era steps and the assembly into fresh directories (about 45 minutes of Blender) and reports, per step, whether counts and bounds match `expect`. The pass bar is every count equal and bounds within 1e-4 figure heights, or a recorded reason per step. Then `loop_tools.py packet` and `measured` on the replayed assembly must give the same measured results as assembled-0458.
5. A deliberate edit (`set` one R07 arm parameter) rebuilds only B-23 and the assembly.

## M2 Core, state and the judge simulator

### Core

`loop_core.js` holds every pure function the workflow uses: `credit`, `scoreFrom`, `meanOf`, `priority`, `pickOrders`, `judge`, `adopt`, `updateStall`, `plateau`, `gateMet`, `sideEffectRegions`. Each takes the state, rubric and limits as parameters (no globals). It is written so that node can import it (`export` statements) and so that `build_workflow.mjs` can inline it: the build strips the `export` keywords, inserts the file at the `//@core` marker in `loop_workflow.src.js`, and writes `loop_workflow.js` with a header naming the sources. `node build_workflow.mjs --check` fails when the generated file is stale.

New rules in the core:
- `plateau(state, limits)`: true when the last `plateauRounds` (3) round means gained less than `plateauGain` (.15) together. The workflow then stops with milestone `plateau`.
- `pickOrders` takes pools from the species config (`head`, `body`, `join`, `both`) instead of hard-coded lists. A `join` order runs alone in its slot with the body order (it edits only the assembly step).
- `sideEffectRegions(diff, target, threshold)`: the regions whose image change magnitude (see M3) exceeds the threshold, excluding the target.
- `judge` is unchanged in its keep rules except that non-target regions not in `sideEffectRegions` keep their visual results.

### Tests

`node --test art/species-construction/loop/test/` covers: scoring and rounding against the recorded round scores; the keep rules with the cases the code comments name (round 2 debt, round 11 verdict keep, round 13 freeze); `plateau`; pool selection with a `join` pool; and the build check.

### State

`loop_state.py` replaces the hand-written `replay_rNN.py` scripts:

```
python art/species-construction/loop/loop_state.py args <species> [--rounds N] [--cold]   # writes loop/args.json
python art/species-construction/loop/loop_state.py merge <species> <workflow result.json>
python art/species-construction/loop/loop_state.py replay <species> <journal.jsonl>         # rebuild status and round files from a stopped run
```

- `args` writes a slim, deterministic argument file: species config, limits, baseline (now including the recipe path), round, lastOrders, means, spec paths, method lines, invariants, and per region name, weight, component, score, results, top three issues, attempts, anchorScore, parked, lastWorked and the last four history entries trimmed to 300 characters. Notes, v1, older history and the rubric texts stay in files. The target is under 20 KB (v2 sent about 45 to 50 KB). The same status always yields byte-identical args, so a resume hits the cache.
- The rubric goes in as ids and kinds only; prompts tell agents to read the texts from `rubric.json`.
- `merge` writes the workflow's returned status back into `status.json` without losing the fields `args` left out, and promotes the adopted candidate recipe to `recipe.json`.
- `replay` re-derives state from a journal with the core's own `judge` (it shells out to node), so a stopped run never needs a hand-written replay again.

### Judge simulator

`node judge_sim.mjs <species> [--rules <rules.json>]` re-decides every recorded round from round 2 on. Inputs: the round records, each candidate packet's `critique.json`, `measured.json` and `diff.json`, and the start-of-round results it reconstructs by applying its own decisions in order from the round 1 rescore. Output: a table per round of recorded decision, simulated decision and the score path.

Acceptance: with the v2 rules it reproduces the recorded keep or revert of every order, or names the manual correction that explains the difference (rounds 13 and 14, the stale frozen R08.10). Then it reports the proposed v3 rules (side-effect carry, plateau) on the same history.

## M3 Species config, side effects, shakedown and the sheet

### Species config

`docs/design/species-construction/<species>/loop/species.json` holds what is now hard-coded: species key and paths, `placement`, the floor z and fixed figure height, reference panels and figure views, camera sets, region images (`REGION_IMAGES`), components and their pools, region zones for containment (boxes or height bands in figure units per region), the side-effect threshold, and the sheet path. `species.py` loads it. `loop_tools.py` takes `--species` (default `akinza`) and reads every constant from it. With the Akinza config every command must produce the same outputs as today: the M3 acceptance test re-runs `measured` and `diff` on the assembled-0458 packet and compares.

### Assembly join

`loop_tools.py assemble <head> <body> <out> [--join <json>]`, where the JSON holds the placement and bridge parameters (`head-scale`, `jaw-anchor-z`, `head-depth-offset`, `body-trim`, bridge ring count, fusion smoothing iterations and factor). Without it the defaults are today's. Any option the assembler does not yet expose is added to `assemble_reconstructed_creature.py` with a default that keeps today's output.

### Side-effect magnitude

`diff` adds `regionChange`: per region, the largest changed-pixel fraction over its images, and the silhouette XOR fraction inside the region's crop where a crop exists. The critic prompt names only regions above the threshold.

### Shakedown

`python shakedown.py <species> <baseline assembly>` builds and measures deliberate variants and checks that each criterion moves only when it should:
1. Unchanged: re-assemble the same head and body. Every measured criterion equal, every region change under the threshold. This sets the noise floor; the threshold is written to `species.json` as three times the largest unchanged change.
2. Head swap: the baseline body with an older head. No body measured criterion may move.
3. Body swap: the baseline head with an older body. No head measured criterion may move.
4. Broken part: one retargeted forearm at 0.8. The arm criteria must fail or drop, and the others hold.

It writes `shakedown.json` with a pass or fail per check and the criteria that moved wrongly. It runs before round 1 of every species and after any change to a measuring tool.

### Shared sheet measurement

`python sheet_measure.py <species>` writes `<species>/loop/sheet.json` once per reference sheet: for each figure view, the outline in the canonical frame (the same frame as `fit`), the band extents, and a station table of left, right and central widths every 0.02 of figure height (the `row_measures.py` runs). Landmarks (eye, nose tip, ear fan extents, shoulder, elbow, wrist, hip, knee, ankle, heel, tail roots) come from `sheet-landmarks.json`, which a landmark agent (Opus, `landmark-brief.md`) marks on the sheet once, with an overlay image to check them. `loop_tools.py stations <assembly>` writes the model's station table in the same format into the packet, so builders and spec writers compare against one measurement instead of re-tracing the sheet.

## M4 Workflow v3

`loop_workflow.src.js` is the v2 workflow with these changes:

1. **Prepare phase**, skipped for parts already present: a method planner (Opus) writes `methods.json` and `methods.md` (per region: the method, the tool or recipe steps it owns, failure looks, and what to try when it stalls); then one spec writer per region without a spec, all in parallel, each reading `sheet.json`; then a gap audit if none exists. The workflow logs the ranked gap list. That is the kickoff check: the orchestrator sends it to Nick as a progress note and the rounds start without waiting.
2. **Orders are recipe edits.** The builder copies the baseline recipe to its candidate path, changes only steps its region owns (or adds a step tagged with its region), runs `recipe.py build`, `contain` after each component build, and `quick` and `fit` as before. It returns the candidate recipe path with the assembly and packet.
3. **Join orders** for R05 edit the assembly step only.
4. **Critic scope**: the target region plus `sideEffectRegions`. Other visual results carry.
5. **Combine** uses `recipe.py merge`, so it is a rebuild of one assembly, not an agent improvising paths.
6. **Method review**: when a region parks, a method-review agent (Opus, medium effort) reads its history and `methods.json`, writes a new method entry, and the region unparks once with attempts reset.
7. **Plateau stop** ends the batch with an escalation note in the result.
8. **Recorder** stays (Haiku, one file per round); the orchestrator can always rebuild from the journal with `loop_state.py replay`.

## Additions after round 17 (v3.1, 2026-10-01)

Round 17 and half of round 18 ran live, kept nothing, and showed where the time and the reverts came from. These went in before round 19:

- **Promising branches.** A reverted candidate the critic judged better is the next order's starting recipe for that region (history entries carry `verdict`, `recipe` and `base`).
- **Audit reopen.** A region at or above the pass bar with a structural gap in the audit's top ten is ordered again, at one point below the bar, and the builder and the critic see the audit's rows; the critic may not pass a criterion those rows show failing (the face scored 8.3 while the audit ranked its slit profile eye third).
- **Toolsmiths.** A method that needs a new generator (`methods.json` steps `new: <script>`) gets it built and smoke-tested in Prepare by a Sonnet toolsmith (`toolsmith-brief.md`), recorded in `loop/tools/<region>.json` with a starter recipe; orders then tune it.
- **Sweeps.** `recipe.py sweep` builds up to 12 variants of one step and ranks them on region overlap, station difference, containment and seams, with a contact sheet. Quick silhouettes cannot rank changes under about 1 percent of figure height.
- **Seam check.** `seam_check.py` flags new outline kinks, collars, steps and needles at nine joints against the baseline, in `quick --baseline` and in the packet's `seams.json`. It caught 6 of 11 recorded defects with no false flag on clean candidates; it is a pointer, not a verdict.
- **Generated spec targets.** `spec_targets.py <species> <region>` writes the measurement half of a spec in under a second; spec writers take numbers from it.
- **Third Blender slot** when at least 14 GB is free.
- **State in every round record** (`entry.state`), so `loop_state.py merge <round file>` resumes a stopped batch without a journal replay.
- **Effort trial result.** One sample: a medium-effort builder used about 30 percent fewer tokens and was judged worse; builders stay at high effort.

## Additions after round 19 (v3.2, 2026-10-02)

Round 19 kept the first neck join and showed four more faults, all fixed before round 20:

- **Order priority is audit-led** (`limits.priorityV3`): the base priority plus 2 per audit rank step (rank 1 adds 24, rank 12 adds 2), plus 20 for a region whose toolsmith tool no order has used yet, plus idle rounds only as a tie-break (0.05 each). The v2 coverage bonus (+100 after six idle rounds) had sent the head and neck (audit ranks 8 and 10) ahead of the fan and torso (ranks 1, 2 and 5) whose tools had just been built.
- **A kept order resets the stall count** (`limits.keptResetsStall`): the neck was kept on a better verdict and parked in the same round.
- **Verdict debt, simulated and left off.** A rule letting a better verdict carry one small neighbour loss as a debt was run on all 34 recorded orders: it would have kept round 8's leg build that kinked the tails, and the simulated mean fell to 5.333. Better-but-reverted work is carried forward by the branch rule instead. The code stays behind `limits.verdictDebt`.
- **Recipe inputs are pinned** (`recipe.py pin`, strict `seed`): a step may only read files whose bytes match what its output used; changed files are frozen as versioned copies and the step repointed. Containment compares a step with its own baseline footprint, so overlapping parts stop reading as side effects. Sweeps add a tool's own `sweepScore`. Dry runs print rebuild minutes, and builders are told to edit late in the chain.
- **Preflight** (`loop_preflight.py`): tests, the workflow build check, pins, recipe status and args, run before every batch.
- **Rebase** (`recipe.py rebase <new base> <candidate> <out>`): branches and toolsmith starters move onto a moved baseline by the `derivedFrom` fingerprints that `set`, `add`, `merge` and `sweep` now record.
- **Prompt sanity test**: no control characters, and every brief a prompt names exists.

## Additions after the independent audit (v3.4, 2026-10-02)

An independent Fable audit (`LOOP-audit-2026-10-02.md`) found the loop four times more expensive per gain in v3 than in v2's late rounds and identified where. Applied:

- **Lean agents.** Judging and mechanical roles (critic, readers, planner, runner, recorder) run on a lean agent type without the project instructions; the default type re-read about 61K tokens of instructions on every turn, about a third of all tokens.
- **Split builder.** A planner writes a plan of variants (`plan-schema.md`); a Haiku runner executes it with one blocking `recipe.py run-plan` and builds blind reader packs; three blind Opus readers (`reader-brief.md`) pick the candidate that reads most like the reference; the scoped critic grades only that one. A plan that needs a script change goes to the code builder. One refine pass.
- **Verdict keep with measured guards** (`limits.verdictKeep`): the readers' majority decides; no measured criterion in a workable region may lose credit, no target may lose, one neighbour may lose visual credit within regressionDrop as a debt, and held regions never block. Simulated on 36 orders: four more keeps, final checklist mean about the same.
- **Critic scope** is the target plus at most the two regions that moved most.
- **No polling.** Long commands run in the background and agents wait for the completion notice; `recipe.py candidate` replaces the seven-command chain.
- **Specs** are short: measurements come from `spec_targets.py`; the spec returns its structure table, which goes inline into the order; specs are rewritten only when the structure changes.
- **Gate and plateau.** Held regions do not block the gate; `means` persists across merges so the plateau rule can fire; four-round batches.
- **Priority** keeps the audit rank first, with a smaller tool bonus (5) and an identity bonus (5) for the face, head and fan front.
- **Modeling scope.** Construction owns the outline and the coat masses (clump shapes, tips, overlaps, rounded sections); strands, fur texture, color and fine creases belong to the surface phase (`akinza/surface-backlog.md`). Readers and critics never judge strand detail.
- **Cost accounting.** `loop_costs.py` counts usage once per message id; earlier figures in this document and in the progress notes summed duplicated transcript lines and are about 1.8 times too high.
- **Independent audits.** A fresh auditor on a different model reviews the loop after every two batches, from the raw records and without the orchestrator's conclusions.

## Additions after round 21 (v3.5, 2026-10-02)

Round 21 kept nothing and showed four ways the loop spent its time on the wrong thing. Applied (Nick: implement them as long as quality is not traded for speed):

- **Plan ranking counts the order's criteria.** `quick_criteria.py` measures the order's fit, row, edge, trunk, waist and ear-span criteria on every quick render (trunk and waist from the body sink's mesh sections, equal to the assembly's to 1e-5); a progress term rewards criteria that start passing and distance closed to their bounds; near copies of the baseline rank last; a step's tool score is referenced to the baseline's own output. Before this, a near copy of the torso ranked first.
- **Reader verdicts match packs by assembly name.** Readers name a pack by its assembly and the runner recorded the folder; every round 21 verdict was stored as same with no reason, and the refine planners never saw the readers' reasons.
- **A unanimous rejection goes to the code builder** (`limits.rejectToCode`). When every candidate of a plan reads worse with no reader preferring it, the refine plan is skipped and the code builder gets the readers' reasons to fix the tool. Its candidate faces the same three readers.
- **Tools pass a reader check before they count as ready** (`limits.toolReaderCheck`). The toolsmith writes a one-variant check plan; three readers compare its candidate with the baseline; a rejected tool gets one fix pass. A tool record for another script than the method names no longer counts as ready.
- **Measured tie-break** (`limits.measuredTieKeep`). When the readers call a clean candidate (no new seam) the same and the order's own measured criteria gain on net, the candidate goes to the critic, and the judge may keep it on the measured gain under every verdict-keep guard. Simulated on the five earlier orders with a same verdict: none had a target measured gain, so the rule changes no past decision.
- **Criteria that measured the wrong thing are retired** (R06.2, R06.6 and R06.7, per specs/R06.md H1 and H2: they read the hanging arm or arm-covered sheet rows, and R06.2 could not pass together with R06.12). R06.12 and R06.13 measure the same depths from mesh sections. R06.3, R06.5 and R06.9 also read the hands-on-hips posed renders (H4). R06 recomputed from 4.3 to 4.6 with no geometry change.
- **Honest plan estimates.** The dry run schedules on the slots a plan really gets while the other component's plan runs, and prices a candidate by the median of past candidates (about 22 minutes, not 7). The plan budget is about 60 minutes and holds for refine plans.
- **Planner digest.** `planner_digest.py` writes one page per order from the loop's own files (the region's steps, scripts, args and rebuild minutes, the tool's parameters, the measured criteria now, what earlier orders and plans tried); planners read it before exploring.

## Fixes after round 22 (v3.5.1, 2026-10-03)

- **Plan jobs rerun when their recipes change.** A toolsmith's fix pass rewrote its starter recipe but not its check plan, so both rechecks read the first check's saved result and the fixes were never shown to the readers; `plan_job.py` now compares the result with the plan and the recipes it names, and sets a stale result aside.
- **Tool checks persist.** Each reader check is written into `tools/<region>.json`; a tool with a check plan is ready only after a same or better check, and a built but unverified tool is checked without a rebuild (or starts with its fix pass when the readers rejected it).
- **Reader regions are read by id**, so "R02 face: eyes, nose" counts as R02.

## Cost bounds after round 22 (v3.6, 2026-10-03)

Round 22 spent 168M tokens, 156M of them in four toolsmith runs (one ran 406 turns with its context grown to 674K tokens, every turn re-reading all of it).

- **Worker agent type** (`limits.workerAgentType`, `~/.claude/agents/loop-worker.md`): planner, runner, builder, toolsmith, combine and recorder run on a slim type with six tools, whose preamble is about 36K tokens against the default type's 69K. Readers and critics stay on the read-only lean type.
- **Toolsmith sessions** (`limits.toolSessions`, `toolSessionCalls`): a toolsmith works in sessions of about 80 tool calls; one that is not done writes `tools/<region>-notes.md` and returns `continue`, and a fresh session continues from the notes, so context stops growing without losing the work. Output hygiene: logs through tail, no printing of files it wrote.
- **Slot test barrier**: the Blender slot test's waiters start contending only after all of them have imported, which removes its flake under load.

## Candidate choice after round 23 (v3.7, 2026-10-03)

Round 23 kept the torso (5.503 to 5.719) at 25M tokens, but reverted the fan because the reader-verified "tool as built" variant ranked sixth of thirteen and never reached the readers; every fan variant scored zero progress, so the ranking was noise.

- **The start's control variant keeps a reader slot** when a plan starts from a tool starter (`recipe_plan.choose_candidates`).
- **One variant per sweep** among the reader candidates, so the readers compare different ideas.
- **Blind rankings use the planner's order**: when no variant moves a measured criterion of the order, the picks follow the plan's variant order, one per idea.
- **Quick criteria run in parallel** with one lock per body instead of one lock for all (the torso plan's scoring took 79 minutes), and the dry run counts the section dumps.
- **Failed steps report their cause** (round 23's "Blender quit" were two geometry check failures: three components and 550 non-manifold edges in swept-back wings).
- **Merge reads the baseline head and body from the assembly record.**

## Proof

1. M1 verify replays assembled-0458 from git within the pass bar.
2. M2 tests pass, and the judge simulator reproduces the v2 history.
3. M3 shakedown passes on assembled-0458.
4. Builder effort experiment: re-run the round 16 R07 order on its recorded baseline at medium effort and compare tokens, minutes and verdict with the recorded high-effort build.
5. A live v3 batch from assembled-0458 on the remaining gaps (neck by the join, torso profile, fan read), compared with v2 rounds 8 to 16 on tokens per +0.1 of weighted mean and on the share of discarded builds.

## Standing practice

- Push the loop branch at every round note and every module commit (the repository is public).
- Copy the current best parts to `C:\Users\njord\OneDrive\xalians-art-backup\<species>` after every kept round. With M1 in place the recipe in git can rebuild them, so the copy becomes a speed convenience, not the only safety.
