# Creature pipeline: work log and active status

Read this first when resuming the creature pipeline. Design of record: [creature-pipeline-design.md](creature-pipeline-design.md); parts: [asset contract](creature-asset-contract.md), [roster layer](creature-roster-layer.md), [stage contracts](creature-stage-contracts.md). Branch `creature-pipeline`, worktree `C:\dev\src\xalians-creature-pipeline`. Nick, 2026-10-14: "make sure you are documenting your progress so we can audit our work to iteratively improve." This file is that record: the standing state at the top, then dated entries with decisions, builds, costs and lessons. Every check-in to Nick is also written here.

## Standing state (rewrite every session)

- **Intended outcome:** a production-quality system that takes each Xalians creature from its record and silhouette to a live 3D glTF asset (mobile browser), with sprites derived, run by AI agents with Nick as the only creative approver.
- **Ratified by Nick:** delivery target (3D first, sprites derived); he decides look, feel, product and output, I decide process; each product decision carries a production and a slice answer; Luceras is the validation creature; licensing is not a gate; the asset contract's product items (behavior set, action lengths, side plus three-quarter facings, token derived from the model); presentations are Artifact pages showing only what needs him.
- **Design program (six parts):** 1 asset contract (done, ratified items recorded), 2 measured budgets (done, from Nick's iPhone), 3 roster layer (drafted, proven by the walking skeleton), 4 stage contracts (drafted), 5 records and tooling (next), 6 the look (needs Luceras through stage 3 first).
- **Luceras:** stage 1 approved (N-neyp); stage 2 closed on Nick's confirm (N-c85m): coat C storm slate, horns B ridged dark, eyes B amber goat, fur C feathered hind legs, plume A base with pointed tips (second plume set after his none-of-these note); composite of all picks B-emw3. Stage 3 closed 2026-10-14 (N-gdyc, all four aspects approved on the page, confirmation received as a comment). Second pass views from the final head after the head rework. First pass: composite B-emw3, five turnaround views, three close-ups (head and hind leg regenerated once as crops), three clay bare views (regenerated once with the hind-leg rule after the first pass read like a greyhound); my check found one contradiction (furred side view understates the hind legs; clay is the shape authority) and labeled the top view a layout hint. Model sheet page: https://claude.ai/artifact/Sys1nD4xLJfTJYpyLuxS6v; vision board: https://claude.ai/artifact/LaWkn8rxp8KMKFdoSAGjJn
- **Built and verified:** `art/pipeline/images/codex_image.py` (Codex image runs recorded as builds, inputs copied as in-<n>-<name>); `art/pipeline/records/` records CLI, blob store, cost collector, review page generator (21 tests pass); Luceras initialized, stage 1 open with `reading.json` and `techspec.json`. `art/pipeline/` walking skeleton: quadruped class spec, rig modules, stand-in body, eleven parametric clips, glTF export with meshopt, contract schema and validator (65 checks pass), browser viewer; published live at https://claude.ai/artifact/CvQX6U4SHXUBzhhkj5Q9Bv.
- **Next unfinished action:** Nick's head approval on the stage 5 head page (Claude pass 4, B-rv4f); Codex head pass 3 resuming through the slot lock, to be added to the page; then part 2 (torso) in both streams. Earlier: head pass 3 in both streams under the hold audit (reconstruction of the clay head crops, grafted, authored horns, eyes and ears kept); then Nick's head approval on a comparison page. Earlier: stage 5 part 1 (head) built in both streams from one shared brief (C:/dev/art-data/pipeline/codex-stream/luceras-head/BRIEF.md): same base (blockout B-t479), same method constraint (Blender steering only, no reconstruction), 90-minute cap each; then Nick's head approval on a comparison page. Later parts: torso, hind legs and feet, forelegs and paws, tail.
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
| 2026-10-14 | Stage 2 to close: selection screen (3 builds), notify loop, head rework (4 horn sets), record amendment, stage 3 two passes (23 images), approve mode | 4 h 30 min | about 400K session + about 1.1M builders; Codex about 1.6M image tokens for 56 images | stage 2 closed on seven picks; stage 3 presented |
| 2026-10-14 | Stage 4 (two streams) and stage 5 head (four Claude passes, two Codex passes), slot lock, comparison pages | 3 h 50 min | about 300K session + about 1.5M builders; Codex modeling runs on subscription (tokens not exposed) | blockout approved; head at the gate |
| **Total** | | **about 14 h** | **about 4.9M agent, plus about 2.0M Codex image tokens** | |

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

12. The selection screen's store does not notify the orchestrator; Nick had to say "I clicked confirm". Until a watch exists, the page must say "tell the orchestrator you confirmed", and the orchestrator reads the store at every check-in.
13. The selection screen's "latest build per letter" rule lets a regenerated set replace the old one by simply generating; the spec carries the new recommendation and note.

14. Selection-screen notification works both ways (2026-10-14 evening): the page posts a comment to this session on Confirm and on requests through the comments capability (requires Nick's "AI-powered artifacts" setting); the session replies and resolves in the thread. First live use: the horn tip request.
15. Head rework after stage 3 had started: Nick ruled the horns the focal point with small ears (record amended, two appearance lines, validated through the main checkout's schema and compiler, bundle regenerated). Four refinement sets on the horns (bulk, curl, between, tips turned in) each from a sketch-level note; the stall rule's "ask Nick" outcome is satisfied by such a note. Stage 3 regenerates in full from the final head.
16. Scripting slip: bash heredoc variable expansion inside a Python raw string produced a bad blob path; two attempts failed before any Codex spend. Write generated scripts with the Write tool, not heredocs with `$` inside.

17. Two-stream comparison (Nick 2026-10-14: "have Codex (Astra) do the modeling ... to compare"): stage 4 built twice from one brief. Claude Opus: reconstruction from the clay (three runs; mirrored-per-row front view fixed fused legs), side ratios within a percent of the clay, 50 min, about 368K tokens, GPU peak about 5 GB. Codex gpt-6-astra: parametric masses, validators all pass, 13.4 min, no GPU, but legs far too short and head, horns and feet symbolic; its default sandbox cannot reach WSL (Blender), so it ran unsandboxed on the second attempt. Comparison stays open for more stages before any ruling on which stream to keep.
18. Blender 5.2 ignores `--python-exit-code` when it follows `--python`; the walking skeleton's wrapper had that ordering and could fail silently. Fixed in `blender_stage.sh`; every Blender call puts the exit-code flag before `--python`.

19. Stage 4 approved by Nick ("yes it looks good, proceed", N-5emb). His gate map question answered: shape at stages 4 and 5, quality at 7, motion at 9; Akinza was reconstruction plus authored parts and stopped before the game-mesh half. Stage 5 comparison is method-matched (both streams steer Blender from the same blockout) so it measures the agents, not the methods.

20. Stage 5 head, both streams, pure Blender steering: Claude pass 1 (B-j4kr, rodent profile), pass 2 (B-h5p3, measured fixes landed, still a balloon face); Codex pass 2 (B-9t5e, worse: wiry horns, bug eyes, long snout). Two builds on one defect triggered the hold audit; the limiting assumption was the method rule "no reconstruction for this part" that I set for comparison fairness. Outcome: method change to reconstruction of the clay head crops, both streams. This repeats the Hypnopet trial's finding (X28, X29) exactly: agents cannot place face masses by eye; reconstruction can. The roster layer should record "faces come from reconstruction" as a rule, not a fallback.
21. Costs so far on the head: Claude about 335K tokens, 82 minutes wall, 1,700 Blender seconds over two passes; Codex pass 2 about 80 minutes wall, 1,435 Blender seconds, 860 s of it waiting on the shared machine. A Blender slot lock is now worth building before the next part.

22. Head pass 3 (Claude, B-stfp): reconstruction of the clay head crops grafted onto the body, authored horns, eyes and ears re-seated; the face reads as the sheet's for the first time (brow, cheekbone, nose bridge, muzzle). 43 min, about 110K tokens, one GPU run (319 s). Pass 4 cleanup running on four named leftovers. Codex pass 3 ran its reconstruction (single-view full model) but stopped at the 20-minute Blender wait I mandated, because the Claude stream held Blender; to be resumed once Blender is free, through the slot lock. Lesson: a shared-machine wait rule without a queue penalizes whichever stream starts second; the slot lock replaces it.

**Check-ins sent:** orientation and delivery question; design program question; part 1 page (twice); part 2 phone sweep; walking skeleton viewer. Nick: "i think it all looks great ... Proceed."
