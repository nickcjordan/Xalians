# Creature Studio: alignment with the creature pipeline and the Akinza loop (experiment X33)

Status: adopted 2026-10-23 by the studio orchestrator. Nick, 2026-10-23: "Familiarize with some of the other efforts going on in the other claude sessions using their own animation pipelines systems and make updates to your pipeline to match the others and run your model through a full round of changes based on what the new adjustments to the pipeline recommend." Pipeline and process decisions are the orchestrator's (memory: Nick decides product, I decide process); this file records what changed and why.

## Context

Two other sessions built creature pipelines while the studio was at Hypnopet's blockout (2026-10-14 to 2026-10-23):

- **The creature pipeline** (branch `creature-pipeline`, Luceras): design of record [creature-pipeline-design.md], stage contracts [creature-stage-contracts.md] with a brief template, a reviewer template and a stall rule, and a work log with 47 numbered lessons [creature-pipeline-log.md]. Luceras went through sculpt, game mesh, surface (strand fur), rig, re-skin and clips.
- **The Akinza loop** (branch `akinza/construction-loop`): fur steps, the review gate [REVIEW-GATE.md], the crouch retrospective, the rig, sprite and clip plan, and lessons in `docs/design/species-construction/LESSONS.md`.

Their documents are read on those branches; nothing here depends on their code by branch, except the shared machine slot lock, which is the point of having one.

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Delivery is sprites first: Cycles renders with strand fur, the live glTF kept as a secondary output. The surface stage grows strand fur for the sprite route | 95%: Nick's ruling, 2026-10-16 | memory `creature-delivery-target-3d-first` |
| 2 | The reconstruction is the shape authority for soft volumes; the sculpt stage after it is a repair list (face and mouth, paws or hands, rigid parts, claws), never a re-sculpt of the reconstruction. Hypnopet continues on track R (the reconstructed body); track A is shelved, kept as the joint reference and the fallback | 85%: pipeline lesson 34 (every Nick correction moved toward the reconstruction), X31 and X32 (track R rigs better and needed 1 round against 7), Nick 2026-10-14: "the generated version does look good but the hand built needs work" | `creature-studio-side-by-side.md`; pipeline log 34 |
| 3 | Method by part type, chosen before the first build: large soft volumes from reconstruction; precise organic tubes (horn, tail, digits) as swept tubes with a measured radius profile; small multi-digit parts built from their skeleton outward as one field | 85%: pipeline lessons 30, 42 | pipeline log |
| 4 | Every part brief carries an anatomy spec (structure, section profiles with numbers, ratios to neighbors) and a real-animal reference step (2 to 4 photos of that exact part in that state, a mechanism note, references beside every review render; kept local and untracked) | 90%: Nick 2026-10-18 and 2026-10-21 | stage contracts section 2; memories `judge-every-view-build-anatomy`, `research-real-animal-reference` |
| 5 | Nothing is judged from one camera: every build and every review uses the view board (side, front, three-quarter, top, low rear three-quarter, the sheet beside each) in three looks: clay, grazing light and curvature | 90%: the Luceras paw saga; lesson 43 (a graft step passed every clay review) | `art/studio/board.py` |
| 6 | Review gate before anything reaches Nick: the orchestrator checks the setup first (joints over the rest mesh, placements measured); each of Nick's points gets a before and after crop at his framing; a blind critic (Opus, sees only the words, references and crops) judges each point; the orchestrator writes one line per point in its own words; a rejected fix triggers a no-build diagnosis before the next build | 90%: Nick 2026-10-21 | REVIEW-GATE.md on `akinza/construction-loop` |
| 7 | Reviewer reads start from a fixed checklist: count repeated parts per side (digits, claws, eyes, horn), scan for holes, pits, dark spots and floating pieces, read the builder's "remaining" list, then judge the change asked for | 90%: pipeline lesson 33 | pipeline log |
| 8 | Part joins get a curvature render and a radius profile across the seam at the whole-form check | 90%: pipeline lesson 43 | pipeline log |
| 9 | Deformation is audited by the orchestrator before Nick sees it: every review pose and the deepest clip frames, eight cameras, clay plus grazing plus curvature, at full size, with flags for crushed, stretched and self-intersecting faces; an independent critic writes its own defect list; fixes go by root cause at the layer where the cause lives (skeleton, then weights, then geometry, then small correctives) | 90%: Nick 2026-10-21, the Akinza crouch retrospective, pipeline lesson 45 | `crouch-retrospective.md` |
| 10 | Every deformation count gate is paired with plausibility limits from real-animal reference (joint ranges, limb abduction), checked first; real contact gets a contact deformer, not a moved limb | 90%: pipeline lesson 46 | pipeline log |
| 11 | For a furred creature, furred regions are gated in fur at the sprite camera and size; clay counts are diagnostics. Hypnopet has no fur yet (Nick 2026-10-14: no fur on a body that does not meet the standard), so this applies from the surface stage on | 85%: pipeline lesson 47 | pipeline log |
| 12 | Motion is judged in motion, by its in-between frames and at game size in pixels (secondary motion at least about 1.5 to 2 px at 192 px) | 90%: Akinza clips lesson 2026-10-23 | LESSONS.md |
| 13 | The studio runner takes the machine-wide slot lock (`art/pipeline/slot/slot.py`, blender class) before every Blender run, waiting up to 180 s; past that it runs at below-normal priority only with 4 GB free, and the log says so | 75%: the lock is the shared policy; a long GPU job can hold the machine for hours | `art/studio/runner.json` |
| 14 | Builders are Claude subagents again (Nick 2026-10-18), with Codex as the fallback when Claude quota runs low | 95% | memory `codex-builds-claude-critiques` |
| 15 | The X30 rule "heads come from a neutral-expression view" is replaced: the rest expression is the approved sheet's (Hypnopet's open, happy smile, which the face pick governs); the rig must be able to close the mouth without the lips passing through each other, checked in the deformation audit | 70%: the sheet and the face pick both show the open smile and Nick approved them; a new neutral sheet would reopen an approved stage | `hypnopet-sheet/pick-face.png`, `flesh-front.png` |
| 16 | Taste items get one build per attempt; after two misses on a look, ask Nick for a reference picture instead of building again | 85%: Akinza fur lessons, 2026-10-16 | LESSONS.md |
| 17 | Lessons are written the same turn they are learned, in this repo's studio record (experiment log and this file), and folded into the brief template | 90%: Nick 2026-10-15 | memory `capture-lessons-as-we-go` |

## What changed in the studio

**Stages** (`creature-studio.md` section 1 is amended to match):

| # | Stage | Change |
|---|---|---|
| 4 | Blockout and proxy rig | Proportions at sheet scale, then a proxy rig (the readiness rig test, `art/studio/readiness/rig_test.py`) right after the blockout: joints placed on this body and checked by the orchestrator over the rest mesh, automatic weights, the fixed poses; failing it reopens the blockout |
| 5 | Sculpt (was Parts) | A repair list on the reconstruction, part by part in dependency order, each part to an anatomy spec, judged on the view board in three looks; a sculpt-versus-reconstruction comparison per region before the look stage |
| 6 | Coherence | Adds the curvature render and radius profiles across every part join |
| 7 | Surface | Strand fur for the sprite route, judged in fur at the sprite camera and size; texture fur for the secondary glTF later |
| 8 | Color and pattern | Unchanged |
| 9 | Readiness, then rig | The rig test becomes a deformation audit: eight cameras, three looks, flags, plausibility limits, an independent critic; then clips judged in motion |

**Builder brief** (`creature-studio.md` section 4) gains these lines, after the creature pipeline's template:

```
Anatomy spec: the part as a structure (for a paw: foot body, digits, knuckle domes above a low flat foot top, toes curling to the ground), section profiles with numbers, ratios to its neighbors; for a part with bones, the bones the skin covers
Reference: the real-animal photos for this part and state (paths), and the mechanism note
Views: judged on the view board (every board camera, clay, grazing, curvature), never one camera
Nick's points, verbatim and numbered (for a fix): a before and after crop per point at his framing
Report: ...as before, plus "Still off:" in plain words after looking at your own renders at full size
```

**Reviewer** (new, replacing "automated readers off by default" in section 3): a blind critic (Opus) receives Nick's words verbatim, the references and the after crops or the view board, never the builder's report, and returns per point "fixed, not fixed or worse" with the region it looked at, plus new defects from the fixed checklist (decision 7). Anything not fixed goes back to the builder, not to Nick.

**Tools added:**

- `art/studio/board.py`: the view board (cached renders per blend, look, camera; before, after and sheet columns).
- `art/studio/packet_render.py --look clay|grazing|curvature`: the grazing light and the relief curvature view.
- Runner: the shared slot lock (decision 13).
- The rig test grows into the deformation audit (decision 9), with limits in the skeleton file (decision 10).

## Not adopted, and why

- The creature pipeline's records layout (`art/roster/<key>/stages/...`) and its CLI: the studio keeps its own records (`art/creatures/<key>/`), which carry the same facts (builds, defects, holds, decisions, costs). Converging the two record systems is a separate decision for when one pipeline is chosen for the roster.
- Codex as the builder: Nick switched building back to Claude agents on 2026-10-18.
- Game mesh and glTF export stages: sprites come first; the studio adds them when the secondary output is built.

## Lessons this alignment brings in, by number in their sources

Creature pipeline log: 30 (method by part type), 33 (critic checklist first), 34 (reconstruction is the shape authority), 37 (one Blender slot for the machine), 38 (strand fur cost), 39 (compare against the reconstruction before the look stage), 40 (anatomy and every view), 41 (re-derive targets when the cause changes), 42 (skeleton outward), 43 (curvature at joins), 44 (motion in fur), 45 (deformation audit before Nick), 46 (plausibility beside counts), 47 (gate in the product). Akinza: REVIEW-GATE.md steps 1 to 6, the crouch retrospective (fix at the layer of the cause), reference research per anatomy, judge clips by their in-betweens at game size, test whether a detail can read at viewing size before grooming it.
