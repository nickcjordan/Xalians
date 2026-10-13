# Creature Studio: design

Status: revision 4, 2026-10-12. Revision 4 adds the vision board and model sheet stages (Nick, 2026-10-12) and defers part reuse to [creature-studio-reuse.md](creature-studio-reuse.md); process decisions are tracked as experiments in [creature-studio-experiments.md](creature-studio-experiments.md). Earlier: Revision 2 took in independent audits by Codex and Fable; revision 3 takes in Nick's answers on approvals, containment and backup cadence. Nick said "proceed" on 2026-10-12; building has started.

## Context

Nick will take dozens of creatures from concept (lore, element, home world, his silhouette drawing, a packet of reference images) to a finished, surfaced 3D model ready for rigging. The first creature, Akinza, went through this from 2026-09-29 to 2026-10-12 on branch `akinza/construction-loop`. That work produced a good recipe engine and many hard lessons. It also ran on chat messages, a hand-spliced review page in a temp folder, hand-typed costs, unstated constraints and a 177 GB data folder (`C:\dev\art-data`) with no backup. Creature Studio replaces that with a system: a fixed stage pipeline per creature, versioned records of every hold, decision, build, review and cost, an engine that checks builds and enforces the process rules, a builder contract, and a local review screen where Nick spends his time.

Phase 1 is concept to a finished surfaced model handed to rigging. Phase 2 (rig, animation, sprite sheets in the `xalians-frame-atlas-v1` format) is not built; only its stage names are reserved.

Nick's answers on 2026-10-12, which this design follows:

- Backup: "I think Amazon S3 is the right solution here. I just want to make sure we're not unnecessarily sending data back and forth to S3, especially if it is large files." Local cleanup is allowed once the keep set is stored off the machine.
- Review: "This will all be happening at my desk. I don't think you need to build anything for me to review from my phone. Claude code is where all my stuff happens."
- First test: Nick is working on Akinza's eyeballs in a separate session; the first slice uses another part.
- Approvals (revision 3): no logging of his messages across sessions and no codes; he approves with a button in the review screen.
- Rules (revision 3): "I just want to make sure we're not being too literal with rules like this", citing the eye-socket failure. Measurements report what moved; they do not forbid it.
- Backup cadence (revision 3): back up without slowing the process down; "I'm going to lean to you about when that smart move is".

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Records are JSON files in git, seven kinds, written through the `studio` library with atomic writes. Git is the history; there is no separate authoritative event log. | 85%: both audits showed a union-merged log cannot stay consistent; seven kinds cover every fact | audits (Codex 3, 6; Fable 3, 7) |
| 2 | Progress is tracked by defects (a named problem with an image region), not critic scores. One defect per build by default. | 85%: fresh critics plateau at 6 to 7 with plus or minus 1 noise; 81% of 420M loop tokens bought no keeps | `LOOP-audit-2026-10-07.md` section 1; memory "shape target before build" |
| 3 | Process rules are enforced where the work flows (CLI refusals, hooks, CI validation), described honestly as workflow enforcement with tested bypass limits, not as impossibility. | 85% | Codex 1 |
| 4 | Nick approves with a button on a specific build in the review screen; the approval binds to that build's evidence hashes. A ruling he gives in chat is recorded by the orchestrator with his words, date and session, and shown in the screen beside the build it refers to, where he can confirm or correct it. No message capture, no codes. | 85%: Nick's answer, revision 3; the screen is where he looks at the build, so approval there means the most | this doc, Context |
| 5 | The review screen is a dev-only `/studio` route inside `apps/web` (Vite dev server middleware reads and writes records), excluded from the production build by a test. No phone or Artifact surface. | 75%: reuses the design system without cross-app alias problems; risk is coupling to the site | Fable 10; Nick's answer 2 |
| 6 | Binaries live in a content-addressed store outside every worktree. The keep set is the full dependency closure of every approved and active recipe (roots, pinned scripts, snapshots, approved outputs) plus references and every image shown to Nick. It goes to S3 once per file, in the background, at two moments only: a one-time initial upload, and when Nick approves a build. Ordinary builds and previews never upload. Nothing is downloaded except to restore. | 85%: approved outputs alone cannot rebuild later work; uploading only at approval keeps S3 off the working path | Codex 8, 9; Nick, revision 3 |
| 7 | Nothing local is deleted until a restore drill rebuilds the approved model from S3 with local caches unavailable, and Nick confirms the delete list. | 95% | Codex 8; Nick's answer 1 |
| 8 | The recipe engine (`recipe.py` and its cache, pins and DAG) is the build backend, ported to main with every script the v5eye3 chain pins. The Workflow critic loop is retired. | 85% | tooling audit; Fable 8 |
| 9 | Containment is a report, not a prohibition. Each build shows what moved outside its part (measured per component before assembly, with the remesh tolerance after). A builder may change anything the goal needs; an outside change blocks presentation only when the builder did not declare and explain it. | 90%: the eye-socket failure came from treating a protective rule as untouchable; Nick, revision 3 | `REFINEMENT.md`; Fable 4, Codex 4 |
| 10 | A stalled defect's audit must end in one of four outcomes: lift an inferred hold, change the method, redefine the part's scope, or ask Nick. An audit that changes nothing unlocks nothing. | 90% | Fable 5, Codex 5; `REFINEMENT.md` rule 4 |
| 11 | The first milestone is one vertical slice through the real workflow on a new creature from intake (Nick's pick), not on Akinza, which another session owns. Later phases are re-estimated from its measured cost. | 85% | Codex 12, Fable 9; Nick 2026-10-12: "I dont want you to do anything with Akinza" |
| 12 | Blender runs as the Windows build from a pinned install path, not the Codex package cache the loop uses now; every build records the version. | 80% | tooling audit "Notable" 3 |
| 13 | The Akinza branch is not merged wholesale (325 commits apart from main). The studio ports what it uses; the branch's 64 MB of tracked evidence PNGs move to the blob store. | 80% | `git rev-list --left-right --count` |
| 14 | Color direction can start early as 2D swatches; color on the model waits for shape approval. | 70% | memory "creature coloring"; lesson 14 |

## How it fits together

```
 Nick ── /studio review screen (apps/web, dev only) ─┐
 Nick's messages ── capture hook ── nick-messages log │  studio library (packages/studio)
                                                      ├─ records in git (art/creatures/<key>/)
 Orchestrator (Opus) ── studio CLI ───────────────────┘
        │ briefs, reports                    blob store (C:\dev\art-data\studio) ── keep set ──> S3
        ▼
 Builders (subagents) ── art/studio (Blender runner, packet, checks) ── recipe engine
```

## 1. Stage pipeline

Every creature has the same stages. A stage opens when its entry holds, produces its outputs, and closes with Nick's approval bound to evidence hashes. Parts declare what they depend on (the neck join depends on the head), so a change reopens exactly the parts that depend on it; their old approvals show as stale, never deleted. Returning to shape during surfacing is allowed as a scoped part reopen.

| # | Stage | Required outputs | Gate |
|---|---|---|---|
| 1 | Intake | Lore summary, element and world, Nick's silhouette, anatomy list, proposed functional parts with order, dependencies, and why each includes what it includes | Nick approves the part list |
| 2 | Vision board | Option sets per signature element (color palette fit to the home world, fur and texture, pattern, anatomy studies, eyes and expression), generated through Codex on Nick's subscription; each pick stored as a reference with a role, what it governs, what it must not be used for, and precedence | Nick picks per element and approves the board |
| 3 | Model sheet | The official cartoon pack generated from the silhouette and vision picks: a turnaround (front, three-quarter, side, back, top) in a neutral modeling pose, close-ups of signature features, and bare-body views of the flesh under the fur, drawn as a hairless gray clay sculpture. The blockout models flesh, because the fur stage grows hair out of the model's surface and the rig deforms that surface: any shape made of hair (a cotton-ball tail, cheek puffs, a chest ruff, an ear fringe) is a short stub or slim form in the bare views and gets its volume from fur length in the surface stage, while muscle and bone (haunches, long feet) stay full size. The sheet carries two targets: the flesh (bare views) for the blockout, and the fur outline (furred views) for the surface stage, with the fur depth per region written in the consistency note. A mass that should move as a rigid part rather than like hair is flesh by Nick's explicit decision only. Cross-view proportions checked and contradictions listed before Nick sees it. The sheet governs look and features; the blockout settles exact consistency | Nick approves the sheet, scoped per aspect if needed |
| 4 | Blockout | A whole-form body from blocks at proportions measured against the model sheet's bare-body views | Nick approves proportions from every standard camera |
| 5 | Parts | Per part in order: previews, builds, reviews, an approved build | Each part approved |
| 6 | Coherence | Whole form from every angle, joins | Nick approves the whole form |
| 7 | Surface | Per species: fur by region where the species has fur, materials; bare clay and surface side by side at the same cameras | Nick approves |
| 8 | Color and pattern | Swatches, then palettes on the model under identical light; pattern in stored rest coordinates | Nick picks and approves |
| 9 | Readiness | Smoke test: the rig library's automatic biped or template rig, three fixed test poses, a check for collapsed or intersecting surface; renders at the sprite cameras; a handoff manifest. Not production rigging | Nick approves the handoff |
| 10 to 12 | Rig, Animate, Sprite atlas | Names reserved only | |

**Reading a creature at intake (Nick, 2026-10-12).** The species description is mandatory: every feature its lore, appearance list and anatomy list name must be present in the finished design (for Hypnopet: the single horn, golden fur, very large eyes, very long lop ears, large springing hind legs). The anatomy list names only the anatomy its abilities use (to attack, heal, protect), so features like ears may be absent from it; a thin list is expected. Nick's silhouette is a high-level reference: it supplies the masses and signature features to carry over (body plan, proportions, ear type, signature shapes), and everything finer that the description does not specify (coat pattern, hair length, eye, mouth and nose design, texture of fur, scales or feathers) is open to the vision board and model sheet to decide. Nick: "Everything in the image is just a reference, and it is up for debate as far as implementation. It does not need to be implemented perfectly. The things in the description do need to be 100% present." A silhouette detail is never a hold.

## 2. Records

Records live in `art/creatures/<key>/`. IDs are collision-resistant (time-ordered) with a short display alias Nick can say ("hold H-k3f9"). One orchestrating session writes a creature's records at a time, enforced by a lock file; other sessions' results come in as imports.

| Record | Holds |
|---|---|
| `creature.json` | key, template and silhouette refs, stage states, default budgets, provenance of anything imported |
| `references/<id>.json` | blob hash, role, governs, must not be used for, precedence, derived targets |
| `parts/<id>.json` | functional unit, includes and why, scope, depends on, order, status, approved build, budget |
| `holds/<id>.json` | statement, scope, source (`nick` with message reference, `inferred` with reason, or `imported` with file and line), status (active, struck, lifted) |
| `defects/<id>.json` | part, plain description, camera and 2D region, origin, status, attempts (counted by defect, across sessions) |
| `builds/<id>.json` | part, kind (preview or build), goal, targeted defect, brief hash, recipe and hash, commit, Blender version, outputs (blob hashes and file names), check results, builder report, cost, status |
| `notes/<id>.json` | one kind for everything said about the work: `review` (verdict, Nick's words, marks, holds struck, defects closed), `decision`, `question`, `audit` |

Status, spend and history are derived from these records and git, not stored twice. CI validates every record against its schema and every reference between records.

**Nick's words.** Approval is a button in the review screen on the build he is looking at. A ruling he gives in chat is written by the orchestrator as a decision with his exact words, the date and the session, and appears in the screen beside the build or hold it refers to, with a control to correct it. Imported Akinza rulings carry `imported` provenance (note file and line) and are labeled as such. Agents may screenshot the review screen to check it, but never click its controls.

**Binaries and S3.** Blob store `C:\dev\art-data\studio\blobs\<aa>\<sha256>`, shared by all worktrees, with a manifest giving each blob's original file name and bundle. Keep set (decision 6) goes to the private bucket `xalians-art-archive` (Terraform, encryption on, public access blocked, versioning on so nothing is lost to an overwrite or delete). `studio backup` uploads only hashes missing from the remote manifest and verifies each upload. After the initial upload it runs on its own in the background after each approval; an approval usually adds only the few step outputs that changed, since everything upstream is already stored. `studio gc` lists rebuildable files not used by any registered worktree, active build or recipe, and deletes only after Nick confirms. Size is measured by `backup --dry-run` before anything uploads; the expected scale is a few GB now and tens of GB over dozens of creatures, which is about one to two dollars a month.

## 3. Engine

**Refusals.**
- `build plan` refuses when the part's build count or wall-time budget is spent (tokens are reported, not refused, since they are known only afterward), when the targeted defect is stalled without a qualifying audit, or when the creature is locked by another session.
- `build report` refuses a report missing outputs, missing Blocked by, or carrying a score.
- `present` refuses unless every gate passed and the orchestrator recorded a look note per standard camera, each bound to that image's hash and shown to Nick.

Builders run with a wall-clock deadline; a dead or timed-out build fails loudly and notifies the orchestrator. Output numbering is serialized under the Blender slot lock (the old directory race).

**Checks.**

| Kind | Effect | Examples |
|---|---|---|
| Gate | Blocks presentation | outputs present and hashed; recipe pinned; skin one closed manifold component; every change outside the part declared and explained in the report; every hold respected or reported in Blocked by |
| Measure | Shown, never a pass mark | what moved outside the part (displacement and pixel difference) beside the builder's reason; fit to the bare target per view band; symmetry; part-declared measures |
| Advisory | Off by default; on request only | an Opus blind reader for a concrete question. Never blocks, never reported to Nick as a verdict |

**Progress.** `studio status` and `studio next` give, from records: current stage and part, open defects with attempts, budget left, holds in force with their strength, questions waiting on Nick, and one next action. A defect surviving two builds is stalled; the next build needs an audit naming the physical cause, each hold checked against it, and one of the four outcomes (decision 10).

**Cost.** Each builder's Agent description carries its build tag. `studio cost collect` scans every Xalians project's subagent transcripts for that tag, sums usage by category de-duplicated by message id, adds Blender minutes, and records the orchestrator's share as an approximate time-window figure with uncovered spend shown, never hidden. Codex sessions are out of scope. Manual entries are allowed and labeled. The collector is proven against real transcripts in the first slice.

## 4. Builder contract

Orchestrator: Opus. Builders: Sonnet for mechanical work, Opus for a new geometry method. Builders never grade their own work.

`studio brief <build>` generates the brief from records:

```
Build <alias> for part <part> (<preview | build>)
Goal, in Nick's words: <cited message>
Part: <functional unit>, includes <list>, because <why>
Defect targeted: <alias, description, region image>
Holds: | Hold | Source | Why | Strength |
May change: anything the goal needs that the holds do not name; declare and explain any change outside the part
Required outputs, deadline, budget left
Report: studio build report <id> --file report.json
```

Report: recipe diff, outputs, the defect's result (fixed, partly, not) with evidence, **Blocked by** (a hold alias or `nothing`, plus what lifting it would allow), new defects seen, a note. A preview is required before any new method or new part kind, whatever its expected time.

## 5. Review screen

A dev-only `/studio` route in `apps/web`, on the site's design system. Its first version is one screen:

- **Needs you** list at the side: builds to review, questions, budget raises.
- **Part review:** thumbnails of the standard cameras (front, three-quarter both sides, side both sides, back, top, below, part close crops); the selected view against the last approved version, side by side or swipe; draw a circle or box and type what is wrong to make a defect; "Held fixed this step" with a strike per hold; approve, reject or adjust with free text; this step's time and tokens; a stall banner.
- **Options:** when a build has preview variants, they show side by side under identical light with a pick button.

Later, in this order: displacement heat map (luminance-ordered ramp), onion and difference views (blue and amber tints, labeled), part history, references, costs, 3D back-projection of marks. `studio watch` prints each new review so the orchestrating session learns of a verdict through a monitor.

## 6. Reuse, port, retire

| Existing (akinza branch) | Decision |
|---|---|
| `recipe.py`, `recipe_steps`, `recipe_candidate`, and every script and spec the v5eye3 chain pins | Port to main; the studio wraps them |
| `recipe_plan.py`, `recipe_sweep.py` | Port when option grids need sweeps |
| `loop_tools.py` `blender`, slot lock, `render`, `check`, `fit` | Wrap as `art/studio/runner.py`; packet layout becomes data |
| `species.py`, `species.json` | Keep as per-creature config |
| `seam_check.py`, `region_shift.py`, `sheet_measure.py` | Keep as checks |
| `render_shape_study.py`, `render_details.py`, untracked `render_clay_views.py`, `heat.py`, `cmp.py` | Merge into one packet renderer |
| `surface/*` and Akinza surface and palette JSON | Keep for stages 6 and 7; species paths become config |
| `loop_costs.py` | Its method moves into `studio cost` |
| Workflow loop, judge, `loop_state.py`, `loop_report.py`, reader packs, planner digests | Retire |
| `pipeline.py` tracker; temp-folder review page | Retire |
| Dead and superseded scripts | Stay on the akinza branch |
| Rig library (`art/creature-motion-comparison/blender/xalians_rig`) | Used by the readiness smoke test |

## 7. Where this departs from how Akinza was done

1. Defects replace scores as the measure of progress, one per build.
2. Holds are records with a cited source; invented ones are labeled weak and are the first lifted.
3. Approval is a button on the build Nick is looking at, bound to its evidence hashes.
4. Parts declare dependencies, so a change reopens only what depends on it.
5. A stall audit must change something before another build runs.
6. Containment is reported, not enforced: a builder may change what the goal needs, and says so.
7. The review screen is generated from records, not hand-edited HTML.
8. Costs are collected from transcripts, with uncovered spend shown.
9. Previews are required for new methods, and only builds can be approved.
10. Binaries live in one shared store; the keep set is a full rebuild closure, backed up, and proven by a restore drill before cleanup.
11. Automated readers are off by default.
12. Blender runs from a pinned install.

## 8. Build plan

Each step is one or more small pull requests that auto-merge on green. Estimates cover agent work only; check-ins report actuals.

| Step | Content | Rough time | Rough tokens |
|---|---|---|---|
| S0 Backup first | Terraform bucket PR; dry-run size of the Akinza keep set (approved v5 head, v5m2, v5eye3 builds, recipe roots head-0204 and body-0195, the tail-free root, every pinned script, references, images shown to Nick); upload; verify | 2 to 3 h | 1 to 2M |
| S1 Vertical slice (milestone 1) | Seven record schemas and the CLI core; Akinza import at v5eye3 with the chain ported to main and rebuilt on main; runner with pinned Blender, standard cameras, pixel diff, the outside-the-part report; the `/studio` review screen; cost collector proven on real transcripts; then a new creature (Nick's pick) through intake, references, blockout and a first part: holds declared, previews, one build, Nick's review in the screen. Akinza was dropped from the slice on 2026-10-12; its chain port (#806) and S3 backup remain | 14 to 20 h, plus the creature's own build budget | 15 to 22M |
| Re-estimate | From S1's measured cost | | |
| S2 Enforcement and storage | Stall audits, budgets and deadlines complete; restore drill; `gc` with Nick's confirmed delete list | 5 to 8 h | 5 to 8M |
| S3 Review depth | Heat map, onion and difference, history, references, costs screens | 6 to 10 h | 6 to 10M |
| S4 Surface and color | Generalized surface tooling, swatch grids, palette options | 6 to 8 h | 6 to 8M |
| S5 Readiness | Smoke test, sprite camera renders, handoff manifest | 5 to 7 h | 5 to 8M |
| S6 Part library | Authored part kinds, one at a time as creatures need them; 3D back-projection of marks | ongoing | |

## 9. Risks

- Akinza is worked on in a separate session and stays out of the studio until Nick says otherwise.
- The blockout stage needs a part library that does not exist yet; the first creature's body plan decides which part kinds come first.
- A dev-only route inside the site could leak into production; a build test fails if any studio code is in the production bundle.
