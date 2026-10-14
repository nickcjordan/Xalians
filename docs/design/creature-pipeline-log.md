# Creature pipeline: work log and active status

Read this first when resuming the creature pipeline. Design of record: [creature-pipeline-design.md](creature-pipeline-design.md); parts: [asset contract](creature-asset-contract.md), [roster layer](creature-roster-layer.md), [stage contracts](creature-stage-contracts.md). Branch `creature-pipeline`, worktree `C:\dev\src\xalians-creature-pipeline`. Nick, 2026-10-14: "make sure you are documenting your progress so we can audit our work to iteratively improve." This file is that record: the standing state at the top, then dated entries with decisions, builds, costs and lessons. Every check-in to Nick is also written here.

## Standing state (rewrite every session)

- **Intended outcome:** a production-quality system that takes each Xalians creature from its record and silhouette to a live 3D glTF asset (mobile browser), with sprites derived, run by AI agents with Nick as the only creative approver.
- **Ratified by Nick:** delivery target (3D first, sprites derived); he decides look, feel, product and output, I decide process; each product decision carries a production and a slice answer; Luceras is the validation creature; licensing is not a gate; the asset contract's product items (behavior set, action lengths, side plus three-quarter facings, token derived from the model); presentations are Artifact pages showing only what needs him.
- **Design program (six parts):** 1 asset contract (done, ratified items recorded), 2 measured budgets (done, from Nick's iPhone), 3 roster layer (drafted, proven by the walking skeleton), 4 stage contracts (drafted), 5 records and tooling (next), 6 the look (needs Luceras through stage 3 first).
- **Luceras:** stage 1 approved by Nick 2026-10-14 (N-neyp); stage 2 open: base illustration in two generations, sixteen option images across coat, horns, eyes, fur and plume, all keeping every must-have; recommendations C B B C A.
- **Built and verified:** `art/pipeline/images/codex_image.py` (Codex image runs recorded as builds, inputs copied as in-<n>-<name>); `art/pipeline/records/` records CLI, blob store, cost collector, review page generator (21 tests pass); Luceras initialized, stage 1 open with `reading.json` and `techspec.json`. `art/pipeline/` walking skeleton: quadruped class spec, rig modules, stand-in body, eleven parametric clips, glTF export with meshopt, contract schema and validator (65 checks pass), browser viewer; published live at https://claude.ai/artifact/CvQX6U4SHXUBzhhkj5Q9Bv.
- **Next unfinished action:** Nick's five picks on the Luceras vision board page (stage 2 gate); then stage 3 model sheet (turnaround in the quadruped rest pose plus shaved clay bare body) from the picks.
- **Open items:** seven archetypes borrow generic clips without their required events; KTX2, low tier, token, sprites, finish variants not built; act resolver test over every compiled species not wired (needs `packages/content` from a checkout with node_modules); toon versus lit taste question deferred to Luceras; Duel runs on old move data until its own v5 cutover.

## Costs to date

| Date | Work | Wall time | Tokens (approx.) | Notes |
|---|---|---|---|---|
| 2026-10-14 | Orientation, delivery-target question | 20 min | 215K | one session, no subagents |
| 2026-10-14 | Gap audit, cold challenge, design draft 2 | 55 min | 185K session + 111K reviewer | 12 findings, all accepted |
| 2026-10-14 | Part 1 asset contract, cold challenge, draft 2, two Artifact pages | 55 min | 120K session + 117K reviewer | 12 findings, all accepted; page rebuilt as needs-Nick after his ruling |
| 2026-10-14 | Part 2 budget scene, phone sweep | 40 min | 60K session | every preset held 60 fps on Nick's iPhone |
| 2026-10-14 | Parts 3 and 4 drafts; walking skeleton | 50 min | 70K session + 233K builder | chain green in 6.4 s; validator 65 checks |
| 2026-10-14 | Log, part 5 design and tooling, Luceras intake | 35 min | 45K session + 134K builder | 21 tests; stage 1 open |
| 2026-10-14 | Stage 1 approval, Codex runner, vision board (18 images), walking skeleton gaps (events, low tier, token, KTX2 wired), contact sheets | 1 h 10 min | 60K session + 164K gap builder + 85K sheet builder; Codex about 430K image tokens | all 16 options keep must-haves |
| **Total** | | **about 5 h 35 min** | **about 1.6M agent, plus Codex** | |

## Entries

### 2026-10-14, session 1

**Decisions (Nick):** see standing state. His exact words are in the design docs' ratification sections.

**Decisions (mine, process):** rig modules with parameters instead of six fixed skeletons; retopology by base-mesh wrap, not by-eye loops; parametric clips as code; runtime three.js; budgets per scene (12 creatures) with per-creature full tier 10K triangles, low 3K, one 1024 texture set, 60 joints, 4 influences; outline affordable (inverted hull measured at 60 fps on the floor device); checks in three kinds; records in git under `art/roster/`; Artifact pages instead of a site route; no mid-stage tools; Hunyuan3D-2 stays the reconstruction tool with its license noted per run.

**Builds:** budget scene (`art/pipeline/budget/`), walking skeleton (`art/pipeline/`, README has the numbers).

**Lessons:**
1. Ask Nick only product questions, with a default; the comprehensive contract page cost him time for nothing (memory `nick-decides-product-i-decide-process`).
2. Every presentation is an Artifact page with visuals (memory `present-design-as-artifact`).
3. Cold reviews pay: two reviews found 24 real problems in two drafts, including a wrong axis, a wrong species count, an act-key assumption the compiler contradicts, and a sprite format wrongly called compatible. Keep one cold review per design part.
4. Artifacts cannot serve `.glb`; inline the model as base64 in the page (292 KB became a 405 KB page) and parse it in the loader.
5. cdnjs has three.js core but not its addon modules; addons come from jsDelivr at the same pinned version.
6. The worktree has no `node_modules`; tools under `art/pipeline/` carry their own `package.json`.
7. Blender's exporter samples every joint in every clip; dropping channels that never leave rest cut the file by a third (`lean_clips.mjs`).

**Lessons, later in the session:**
8. Codex image runs: inputs must be copied under a name other than output.png or the generated image overwrites the input (first base edit did exactly that and still produced a usable image by luck); the subprocess must decode as UTF-8 with replacement or the token count is lost.
9. Five sequential streams were cautious; image runs are network-bound, so the next batch runs eight at once with a rate-limit retry (concurrency policy, design section 10).
10. Edit-from-one-base keeps option sets comparable: all sixteen options kept pose, framing and every must-have, so Nick judges only the element in question.

11. Selection UX (Nick 2026-10-14, "do them all 1-6"): picks as store writes on a standard Artifact selection screen, with full-size, flicker and two-up compare, background toggle, none-of-these and mix orders, and a composed preview before Confirm; generated from records by `select_page.py`, filed by `roster.py picks file`. Baked into records-and-tooling section 4 and the stage 2 and 3 contracts.

**Check-ins sent:** orientation and delivery question; design program question; part 1 page (twice); part 2 phone sweep; walking skeleton viewer. Nick: "i think it all looks great ... Proceed."
