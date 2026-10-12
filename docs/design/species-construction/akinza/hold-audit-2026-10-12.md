# Akinza hold audit, whole creature (2026-10-12)

Nick, 2026-10-12: "identify any other changes along these lines where we iterated over and over with restrictive rules that were in place that should have been relooked at."

Audit only. No model, rubric, spec, invariant or reference was changed. Current model: assembled-3168 (recipe `recipe-furbase-nose-v3.json`, head-3167, body-2960). Pictures of every part as it stands now are in `untracked/species-construction/akinza/surface/hold-audit/` (file names below).

## In plain words

The eyes took eleven tries because of a rule nobody had asked for. I went through every part of Akinza, every rule the builders worked under, and every rule built into the loop itself, looking for the same pattern: the same flaw coming back again and again because the thing causing it was off limits.

I found it in five more places, and in the measuring system itself.

1. **The neck.** There is a sharp corner where the jaw meets the throat, and a band around the base of the neck. The neck is built from three separate pieces: the bottom of the head, a joining piece, and the top of the body. Each step that touched it had to keep the other two pieces as they were. The head step kept the old neck stump from an earlier head on purpose, and the corner sits exactly where that kept stump begins. Nobody ever had permission to shape the jaw, throat and neck as one thing. The note that this "cannot be fixed as the loop is set up" was written on 2026-10-01 and never acted on. **Fix: treat the neck as one part, the way the mouth was. One build.**
2. **The measuring system still judges the bare clay against the painted fur.** The reference sheet is a painting with fur. The loop measures the bare clay ears and head against the fur outline, so the clean rounded ears you chose fail those checks by design, and the loop is not allowed to keep any change that makes a check fail. The blind readers are told to prefer "rounded lock bodies with pointed tips", a rule from before your 2026-10-08 ruling that fur comes from the texture. You overruled the readers twice, on the ears (you picked 4) and the hind paws (you picked B). If the loop runs again as it is, it will push the ears back toward the old fan. **Fix: retire or re-target those checks and update the readers' instructions before any loop or reader is used again. No build needed.**
3. **The shoulders and upper back.** From behind there is a flat band across the upper back and the arms join at notched knobs; from the side the top of the upper arm is a flat, pale block. The shoulder is split between two body steps (one owns the upper back and the shoulder caps, the other owns the arm), and each had to leave the other alone. Your 2026-10-08 request to fix the flat cap on the upper arm was recorded but never run, because the loop stopped for textures. **Fix: treat the shoulder (upper back, cap and top of the arm) as one part.**
4. **The rings at the elbow and wrist.** You said to keep the forepaw as it is. I turned that into "every paw setting frozen", which keeps the place where the paw meets the wrist frozen too. A 2026-10-07 attempt to remove the wrist ring changed nothing the readers could see. **Fix: protect how the paw looks, not its settings, and blend the wrist into it.** Small.
5. **The hips and where the tails join.** The tail root is the lowest-scoring part of the whole creature (1.3 of 10): a lumpy join, a round bulge at the top of the tails, and an abrupt flare from waist to hip. It has never been worked on, because your 2026-09-30 note that "the tails are fine" was recorded against a part called "tail root and pelvis", so the hips were held along with the tails. **This one is your rule, so it is a question (below).**

Smaller ones: the tiny dark ticks on the lower eyelids come from how finely the model is re-meshed when the head and body are joined (my rule, can be lifted); the body widths were tuned to match the furred painting as bare clay, so once fur goes on, the body will be wider than the sheet, by roughly 10 to 15 percent on the slimmer parts; the fur settings and the "how much fur may stick out" limits were guesses set before your fur rulings; and the leg, foot and arm checks done in the hands-on-hips pose can never pass, because the sheet's own front and back drawings disagree about where the legs stand.

**Questions for you** (pictures are with each part below):

- When you said the tails are fine, did that include where they join the hips and the shape of the hips themselves? I would like to smooth the hip flare and the lumpy join without changing the tails. (Picture: `09-tails-and-root.png`.)
- When fur goes on the big ears, should it bring them back out toward the shaggy fan on the sheet, or keep them close to the clean Grogu shape with only short fur at the rim? (Pictures: `10-silhouette-fit.png`, `02-head-and-ears.png`.)
- The body reads a little athletic: square shoulders, a pinched waist, a defined chest. The sheet reads more slender and soft. Do you want the body moved toward the sheet, or is it fine under fur? (Pictures: `01-whole-model-vs-sheet.png`, `05-torso.png`.)

## How this was done

Sources: `loop/status.json` (scores, every order with kept or reverted and the reason, issues, decisions, awaiting), `loop/methods.json`, `loop/rubric.json`, `loop/species.json`, `loop/invariants.json`, `loop/specs/*.md`, the round records `loop/rounds/round-00.json` to `round-35.json`, the builder, reader and critic briefs, `loop_core.js` and `loop_workflow.src.js`, `LOOP-v3.md`, `LESSONS.md`, `furbase-notes.md`, `surface-plan.md`, `loop/surface-rubric.json`, `art/species-construction/surface/akinza-surface.json` and `akinza-palettes.json`, the recipes, Nick's own messages in the session record, and the current packet `untracked/species-construction/akinza/loop/packets/assembled-3168` (m01 to m11, posed fit, measured.json, seams.json). One physical cause was measured directly (the neck, from the assembled mesh); the others are read from renders, the build notes and the step code, and are marked where unverified.

For each part: the history, every hold with its source (a dated Nick quote, or "inferred"/"system" with the reason), whether a hold blocks the cause of what is still wrong, and a recommendation: lift, keep, or ask Nick.

## Ranked findings

Ranked by expected visible improvement for the work it takes.

| Rank | Part | What is still wrong | Hold in the way | Source of the hold | Call | Smallest change | Work |
|---|---|---|---|---|---|---|---|
| 1 | Neck | Sharp corner where jaw meets throat; band at the neck base | Head step keeps the old neck stub below head z -.30; join only bridges; neck orders go to the body builder only; containment forbids moving the neighbor | inferred (v5 2026-10-09; loop split 2026-10-01) | Lift | One part: jaw underside, head stub, join column and top of the yoke, rebuilt as one authored surface | One directed build, like nose-mouth v1 |
| 2 | Loop judging | Clean ears and head fail by design; readers rewarded pointed locks; loop state still points at assembled-2999 | Measured checks against the sheet's fur outline; "no measured criterion may lose credit"; reader brief's lock language; stale baseline | system and inferred (rubric 2026-09-30, verdictKeep 2026-10-02, reader brief before 2026-10-08) | Lift | Retire or re-target R01.1, R01.2, R03.2, R04.1, R12.1, R12.2; rewrite the reader brief's coat sentence; rebase status to the nose-v3 recipe; close the stale R01 decision | Paperwork, about an hour; no build |
| 3 | Shoulders and upper back | Band across the upper back, notched shoulder knobs from behind, flat pale cap on the upper arm, nubs on the caps | Shoulder split between B-24Y (yoke, caps, "arm tube held native") and B-23 (arm, deltoid dome); each order may edit only its own step | inferred (methods R05 and R07, 2026-10-08) | Lift | One part: upper back, cap and arm root together; includes Nick's pending cap fix | One directed build |
| 4 | Arms | Ring bands at the elbow and wrist | "Every paw, digit and claw parameter stays at its baseline value", the implementation of Nick's "keep the paw as it is" | Nick 2026-10-08 (look); the frozen parameters are inferred | Lift the implementation, keep the look | Protect the paw's look (front, side, claws) and let the palm root and wrist blend; check the cause with a section first | Small build |
| 5 | Pelvis and tail root | Lumpy tail fusion, round bulge, abrupt waist-to-hip flare, pear-shaped hips | R11 "Tail root and pelvis" held with the tails; trunk loft faded out behind the trunk "so the tail root stays put"; held regions frozen in the judge | Nick 2026-09-30 and 2026-10-01 for the tails; the pelvis inside it is inferred | Ask Nick | Hips and tail join as one part, tails themselves held | One directed build after his answer |
| 6 | Body widths under fur | Clay widths match the furred painting, so the furred body will be about 10 to 15 percent wider than the sheet on slim parts | Every width check compares bare clay with the furred sheet; nothing compares the furred result with the sheet | system (rubric) | Lift | Measure the furred silhouette against the sheet once, then set clay targets as the sheet minus the measured fur margin per region | One measurement, then a decision |
| 7 | Fur stage | Readers flat at 4 of 10 over three passes; lumpy fur | Surface never edits the mesh (lifted by Nick 2026-10-09); fur lengths keyed to loop region boxes; S06 fur margin limits guessed; readers judge against a painted reference | inferred (surface plan 2026-10-08) | Lift before the fur restarts; ask Nick about ear fur | Lengths per anatomy from Nick's 2026-10-09 ruling; S06 limits set from the sheet's fur thickness; judge clay and fur at the same camera | Settings, then a fur pass |
| 8 | Eyelid ticks | One or two tiny dark ticks on each lower lid | The assembly re-meshes at .0028 world units | inferred (found in v5eye3) | Lift | Finer re-mesh in the face window, or keep the face skin out of the re-mesh | Small, mostly compute |
| 9 | Posed checks | Leg, foot, arm and trunk bands in the hands-on-hips pose fail every rescore | Bands depend on a heuristic rig pose and on a sheet whose front and back figures place the legs .03 apart | system (rubric 2026-09-30, thresholds lowered 2026-10-01) | Lift | Make R08.10, R08.11, R09.9 advisory, or refit the sheet pose's hip spread once | Paperwork |
| 10 | Ears | Soft vertical line at each ear root from behind; stair-step edge on the pale cup | none in the way now (the old-fan derivation was lifted 2026-10-09) | n/a | Keep | Fix in a later ear pass if Nick wants; the pale edge is per-polygon material on a re-meshed skin | Small |
| 11 | Coherence (R12) | Parked since round 1, never worked | "Reopen when parts reach 5"; criteria written for modeled fur locks | system | Lift | Replace R12.1 and R12.2 with a whole-figure read against Nick's look | Paperwork |
| 12 | Color pattern | Last version (T4) never got Nick's verdict | Pale underside mask (countershading) and per-part body coordinates | inferred | Ask Nick when texture resumes | Show T4 on the current head beside one without the underside mask | Render only |
| 13 | Hind paws, legs, tails | See the parts below | Nick's own holds | Nick | Keep | none | none |

## Systemic holds (they apply to every part)

| # | Hold | Where it lives | Source | Effect seen | Call |
|---|---|---|---|---|---|
| S1 | Bare clay is measured against the painted, furred sheet outline | rubric R01.1, R01.2, R03.1, R03.2, R04.1, R04.6, every width row in R05 to R09; `loop/sheet.json` | system (rubric 2026-09-30) | Ears and head fail by design (R01.1 .785, R03.2 .160, R04.1 .835 against the .90 and .06 bars); the body passes at furred widths, so the furred body will run wide. The v5 head mass was fitted to the sheet's outline "fur included" while the ears were made smaller than it, so the two rules disagree | Lift: re-target to Nick's silhouette and rulings where they differ from the sheet; for bodies, sheet minus measured fur margin |
| S2 | Readers judge untextured clay against a painted, furred reference, and the brief tells them the coat should read as "rounded lock bodies with pointed tips, overlapping like shingles" | `loop/reader-brief.md` | inferred (written before Nick's 2026-10-08 fur ruling, never updated) | Readers preferred the spiky ears every time ("because the reference draws pointed locks", round 31); Nick overruled the readers twice (ears 4, hind paw B) | Lift: rewrite the coat sentence to Nick's rulings; for any part Nick has approved, readers compare against his approved version, not the sheet |
| S3 | The creature is split into head, body and join; an order touches one component and the others are frozen | `loop/species.json` components, `loop_core.js` judge (frozen pools), builder brief "Change only your component" | system | The neck could not be fixed (note 2026-10-01); the shoulder cap is built by two steps owned by two regions | Lift for refinement: a part is a functional unit (REFINEMENT.md rule 4), and may span components |
| S4 | Containment: moving vertices more than .002 figure heights inside another region's zone is a side effect to remove | builder brief step 4, `recipe.py contain` | inferred (v3, 2026-10-01) | Forbids fixing a defect whose cause sits in the neighbor's zone (shoulder cap in R05's yoke, hip flare against R11) | Keep as a report, lift as a rule: the part defines its own mask, and the report shows what moved outside it |
| S5 | Edit only steps tagged with your region, as late in the chain as possible, keep everything outside the mask exactly | builder brief steps 1 and 3; every furbase step | inferred | Patches stacked on patches keep old skin between masks. This is how the "leftover eye sockets" happened (H39 kept H37 skin, which kept older skin). The body chain is 12 stacked steps (B-14 to B-24Y), the head 19 (H24 to H55) | Lift where a defect sits on a mask boundary: rebuild the part at the step that owns its shape, as v5 did for the skull |
| S6 | No measured criterion in a workable region may lose credit (the keep guard) | `loop_core.js` judge, `limits.verdictKeep` | system (2026-10-02) | With S1, any change toward Nick's shapes is reverted | Lift together with S1 |
| S7 | Rubric, specs and invariants are off limits to builders and planners | builder brief Hard limits | inferred | Contradictory specs persisted for rounds: R06 H1/H2 named 2026-10-01, landed after round 21; R09's thin claw cones pushed every claw the wrong way; R02.2 thin lid held four rounds until Nick ruled | Keep the rule, add a "Blocked by: spec X" report that opens a decision the same round |
| S8 | Figure height fixed within 1 percent (I09), fixed render frame, head scale .50 and join placement fixed | invariants.json I09; species.json frame and join | inferred ("so every measurement stays comparable") | Neck length, head size and leg length were never levers; ear tips are held below the frame top | Keep for now; lift only if Nick wants a proportion change, and measure in units of the actual height |
| S9 | Held regions are frozen in the judge (freezeHeld) | `loop_core.js` | system (after round 24) | Damage at the tail root never counts, and the pelvis inside R11 is never ordered | Keep for the tails, lift for the pelvis (ask Nick, finding 5) |
| S10 | Parking and decision rules: a region with an open item gets no order; R12 parked "until parts reach 5" | `loop_workflow.src.js`, status.json `awaiting` | system | R01 has waited on an answer since round 33 although the head was rebuilt outside the loop; R12 was never worked | Lift: close the stale R01 item; retire R12's park condition |
| S11 | Visible-change floor: a candidate whose target images move less than .005 is dropped before the readers | `limits.visibleChange` | system (2026-10-08) | Small fixes such as the cap and wrist ring Nick asked for are the kind it filters | Keep for broad orders; skip it for a Nick-approved small fix judged on close crops |
| S12 | The assembly voxel re-mesh at .0028 world units sets the finest detail the skin can hold | assembly step J | inferred | Lid ticks; the v5eye3 lid roll had to stay at .006 or wider | Lift locally (finding 8) |
| S13 | Loop state is stale: status.json baseline is assembled-2999 and `recipe.json`; scores and issues describe the pre-furbase head | status.json | n/a | Resuming the loop as it stands would start from the old head and undo Nick's approved eyes, nose, mouth and ears | Lift: rebase to `recipe-furbase-nose-v3.json` with a cold rescore before any loop run |
| S14 | Arms-down construction stance (I07) | invariants.json I07 | inferred (LESSONS 2026-09-28: agent chose a neutral inspection pose after Nick declined pose coaching) | The hanging arm hid the waist in the side view (R06 rounds 15, 20, 21 read "same"); the posed checks then relied on a heuristic rig | Keep for rigging; judge the trunk and limbs in the posed views |

## Per part

### Head silhouette (R01)

![head](../../../../untracked/species-construction/akinza/surface/hold-audit/02-head-and-ears.png)

History: loop rounds 1, 2 kept (rounded skull, crown lift); rounds 19, 29, 33 reverted ("same" or "worse"; round 29 "the only change is a slightly smoother crown"). Then outside the loop: H38 head caps (A to E, 2026-10-09), v5 authored skull (approved direction: "the last one looks much better ... still not what I want"), v6, v6b, v6c rejected ("the skull shape and uncanny lumps", 2026-10-10). The skull has been held at v5 since.

| Hold | Source | Why |
|---|---|---|
| Skull as v5 | Nick 2026-10-10: "the skull should not have been adjusted much" | approved look |
| Measured against the sheet's furred head band (R01.1, R01.2) | system | rubric |
| Figure height within 1 percent (I09) | inferred | comparable measurements |
| Neck stub below head z -.30 kept from H37 | inferred (v5) | the join meets the same neck |
| Decision R01 "three reverts in a row" open since round 33 | system | stall rule |

Stall cause: the loop orders stalled because the skull could only be nudged by ellipsoids under the old fan; the redesign fixed it once the old ears were gone. Nothing blocks the skull now except S1 (it fails the furred head band by design) and the stale decision. Recommendation: keep the skull; retire R01.1 and R01.2 as pass marks (keep them as reported numbers), close the R01 decision.

### Face (R02): eyes, nose, mouth

![face](../../../../untracked/species-construction/akinza/surface/hold-audit/03-face.png)

History: loop rounds 4 and 10 kept; 22, 25, 26, 27 reverted (eye ring idiom, convergent gaze I01, readers 1-2). Outside the loop: mouth v5m, v5m2 (approved 2026-10-11), eye surround v5e, v5t, v5t2, v5t3 plus previews and v6 to v6c, eleven builds held by "keep the eye globes fixed" (inferred); lifted by Nick 2026-10-12 ("you can adjust the eyeballs, I don't care"), then v5eye2 to v5eye5 (approved: "the eyes look great"); nose-mouth v1, v2 and nose v3 after the same audit (approved 2026-10-12).

| Hold | Source | Why |
|---|---|---|
| Eyes, mouth, nose as now | Nick 2026-10-11 "mouth looks good"; 2026-10-12 "the eyes look great"; nose "looks good enough to proceed with" | approved look |
| Lid sharpness limited by the assembly re-mesh | inferred | S12 |
| Face guards (eye aspect, iris offset, band ratio) | system (limits.faceGuards) | protect the approved eye in the loop |
| Forward gaze (I01) | accepted face study 0010 | identity |

Remaining: the tiny lid ticks (S12, finding 8); the nose leather reads as a dark band seen edge-on in profile, and the mouth line ends in a small hook at the corner in profile (both visible in `03-face.png`, both approved as a look). Recommendation: keep; lift S12 locally if the ticks matter to Nick.

### Ears, front and back (R03, R04)

![ears](../../../../untracked/species-construction/akinza/surface/hold-audit/02-head-and-ears.png)

History: loop rounds 5 to 35, 15 front orders (6 kept) and about 14 rear orders counting paired rounds (4 kept), through lock tables, clump volumes, layered sweeps, post-assembly locks and three tools (164M tokens on rounds 21 to 28 alone, per the round 28 decision). Recurring reasons: locks read as scales, thorns, slabs or "ribbed slats"; readers preferred the baseline's pointed locks; the front and back pair rule meant a front gain lost on the back. Outside the loop: fur base v1 ("a weird poorly molded piece of play-doh", 2026-10-09), v2, smooth face, analytic ears A to E, F (v5). Approved direction: "closer to the shape of Grogu's ears", "between A and E".

| Hold | Source | Why | Effect |
|---|---|---|---|
| Ears derived from the old sculpted fan (traced outline, profile fitted to the old sweep) | inferred | keep the approved front outline | Inherited the fan's lumps through v1 and v2; lifted 2026-10-09 by H38, which fixed it at once |
| "No new geometry, no spikes": outline pass inside H33's parameters | inferred reading of Nick 2026-10-08 ("rely more on the fur texture we add later instead of trying to create shapes to make fur") | Nick asked for no fur shapes, not for no new ear | Rounds 34 and 35 and v1 iterated inside it; lifted with H38 |
| Sheet fan outline as the measured target (R03.2, R04.1, R01.1) | system | S1 | Fails by design for the shape Nick chose |
| Readers told to prefer pointed overlapping locks | inferred | S2 | Readers preferred spiky ears; Nick overruled (ears 4, 2026-10-08) |
| Front and back must both not lose (pair rule) | system (2026-10-02) | one tool built both | Round 28: front better 2-1, back worse 0-3, reverted |
| Exact mirror ears | Nick 2026-10-09: "symmetrical" | approved | The sheet's ears are not mirror images, so mirror ears cannot reach the .90 overlap (furbase notes, H38) |

Remaining: a soft vertical shading line at the back of each ear root; the pale cup edge steps along the remeshed faces (seen in three-quarter); the ear is a thin .03 shell, so from above it reads as a blade (by design). Recommendation: keep the ears; lift S1 and S2 for them; ask Nick how much fur the ears should carry (question 2), because the clay ears are now well inside the sheet's fur outline and the S06 fur limit (.05 p95 for ears) was set before that.

### Neck and shoulders (R05)

![neck](../../../../untracked/species-construction/akinza/surface/hold-audit/04-neck.png)

History: loop rounds 7, 19, 27, 32 kept (shoulder plane, join cut, authored neck column, yoke), 13 and 30 reverted. The note of 2026-10-01: "the stalk neck lives at the head-body join, but R05 orders go to the body builder only, so it cannot be fixed as the loop is set up." Open issues since: "a notch under the jaw and a stem-like pinch", "a horizontal tonal band or ledge crosses the upper back", "small nubs on the shoulder caps".

Physical cause, measured on the assembled-3168 mesh (horizontal sections, |x| under .2): the neck is narrowest at world z .46 to .47 (half width .051), and the front of the skin jumps from y -.065 at z .47 to -.085 at .48 and -.132 at .49. The chin underside is close to horizontal over .02 of height, so the jaw meets the throat at a near right angle. World z .48 is head-local z -.31: the line below which v5 (H39) keeps the H37 neck stub "so the join meets the same neck", and it lies inside the join's fusion window (head cut at .462, fusion top .497). Three steps meet there and each is told to keep the others.

| Hold | Source | Why | Blocks the cause? |
|---|---|---|---|
| Head step keeps the H37 neck stub below head z -.30 | inferred (v5, 2026-10-09) | the join meets the same neck | yes |
| Neck orders go to the body builder, the join only bridges | system (components, 2026-10-01) | component split | yes |
| "Any change above z .45 is J's and R01's" | inferred (methods R05) | containment | yes |
| No ruff or fur collar on the neck | spec R05 | idiom | no (fur now comes from texture) |
| Neck width matches the sheet (R05.1 1.042, passes) | system | rubric | no |

Recommendation: lift. One part, "neck": the jaw underside, the head's neck stub, the join column and the top rows of the yoke, rebuilt as one authored surface with a soft jaw-to-throat curve, everything else held and checked by displacement. Same method as nose-mouth v1. Highest payoff in this audit: the corner shows in the front, side, back and three-quarter views.

### Shoulders and upper back (R05 yoke and R07 arm root)

![torso](../../../../untracked/species-construction/akinza/surface/hold-audit/05-torso.png)

What is wrong: from behind, a horizontal band crosses the upper back just under the neck and each arm meets the trunk at a notched knob; from the side the top of the upper arm is a pale, flat-topped block (`04-neck.png`, neck profile); small nubs sit on the caps.

| Hold | Source | Why | Blocks the cause? |
|---|---|---|---|
| B-24Y yoke builds the shoulder caps with "the arm tube held native" and masked off the arm below the cap | inferred (methods R05, round 32) | containment | yes |
| B-23 owns the deltoid dome (a masked sphere cut, round 25) and may change only "deltoid cap and wrist taper" | inferred (methods R07, 2026-10-08) | from Nick's paw ruling | yes |
| A band where the yoke rows meet the join table (z about .424) was listed as a failure to avoid, never fixed | methods R05 | split construction | likely the band; unverified by section |
| Nick's fix list: "fix only the flat upper-arm cap and the wrist ring; keep the paw as it is" | Nick 2026-10-08 (recorded answer) | approved scope | no; the fix was never run (the loop stopped for textures) |

Recommendation: lift the split. One part, "shoulder": upper back, cap and arm root together. This also delivers Nick's 2026-10-08 cap request.

### Torso and pelvis (R06)

History: 10 orders, 5 kept (rounds 4, 10, 20, 23, 24). Reverts: side waist thinned (9), "same" (15, 21: the hanging arm hid the waist and two rubric rows measured the arm), "worse" (33: the readers preferred the narrower waist). Open: abrupt waist-to-hip flare (front central width .162 at .42 to .301 at .44), chest reads as a tube, lower trunk pear-shaped; R06.10 posed band .839.

| Hold | Source | Why | Blocks the cause? |
|---|---|---|---|
| Trunk loft faded out behind the trunk "so the tail root stays put"; thighs below the hip frozen; arms masked | inferred (methods R06) | protect R10, R11, R08 | yes, for the hip flare and the pear shape |
| R11 "Tail root and pelvis" held | Nick 2026-09-30/10-01 for the tails; pelvis inferred | region definition | yes (finding 5) |
| R06.1 front waist at most 1.10 of the sheet (now 1.09) | system | rubric | softening the hourglass would fail it |
| Widths compared with the furred sheet | system | S1 | finding 6 |
| Arms-down stance | inferred | I07 | hid the waist until the posed views were added |

Recommendation: the hip flare and pear shape belong to the pelvis, so they wait on question 1. The athletic read (square shoulders, pinched waist, defined chest) is question 3.

### Arms and forepaws (R07)

![arms](../../../../untracked/species-construction/akinza/surface/hold-audit/06-arms.png)

History: 9 orders, 4 kept (rounds 5, 16, 25, 26: rebuilt arm, claw fan, digit-chain paw, re-posed digits). Reverts: 11, 22, 28, 29 ("the same wrist ring"), 31 (outline paw, readers 0-3). Nick 2026-10-08 preferred paw A and asked "what is wrong with it?".

| Hold | Source | Why | Blocks the cause? |
|---|---|---|---|
| Paw look as now | Nick 2026-10-08 | approved | no |
| "Every paw, digit and claw parameter stays at its baseline value" | inferred implementation of that ruling | keep the paw exact | likely: the ring sits where the frozen paw root meets the forearm taper; round 29's cuff-free wrist with the paw frozen read "the same wrist ring". Unverified by section |
| Shoulder cap owned by B-24Y | inferred | split | yes, for the cap (see Shoulders) |
| Posed arm band R07.6 (.849) | system | rig pose | no shape fix closes it |

Recommendation: lift the frozen parameters and keep the look: check the wrist and elbow with a section first, then blend the paw root into a continuous wrist, with front, side and claw crops of the paw before and after as the check.

### Legs (R08)

![legs](../../../../untracked/species-construction/akinza/surface/hold-audit/07-legs.png)

History: 3 orders, 2 kept (rounds 2 and 14); round 8 reverted for a tail kink. Not ordered since round 14 (score 7.7, near the bar). Open: a band at the knee instead of a soft kneecap, posed thigh and shin bands (.832, .662).

| Hold | Source | Why |
|---|---|---|
| Hind legs stay fuller (I06) | Nick 2026-09-28 (rabbit-like strength, not rabbit legs; recorded in LESSONS.md) | approved direction |
| Depth pass masked behind the leg (yMask) | inferred (round 14) | protect the tails |
| No fur locks or tufts on the leg | spec R08 | idiom; moot now that fur comes from texture |
| Posed bands R08.10 and R08.11 | system; thresholds lowered 2026-10-01 because "the sheet places the leg about .03 apart between its front and back figures" | a criterion the sheet itself caps |

No hold blocks the knee. The posed bands fail on stance width (`11-posed-fit.png`: the orange sheet-only band runs outside the model's leg in front, blue inside), which is the pose, not the leg. Recommendation: keep the legs; make R08.10 and R08.11 advisory.

### Hind paws (R09)

![hindpaws](../../../../untracked/species-construction/akinza/surface/hold-audit/08-hindpaws.png)

History: 5 orders, 2 kept (rounds 6, 12); 17, 18, 30 reverted; Nick picked round 30's candidate B ("B looks fine", 2026-10-08) over the readers' 1-2.

| Hold | Source | Why |
|---|---|---|
| Paw as B | Nick 2026-10-08 | approved |
| Claws as thin cones sheathed in the toe (spec mass K) | spec R09 | the method review said the spec pushed the claws the wrong way; respec flagged, never written |
| Posed foot band R09.9 (.641) | system | "bound by the shared pose and not closed by any paw method" (methods R09) |

Remaining: four near-equal toes in a straight row, straight upright claw pins from the front, a vertical heel face. Recommendation: keep (Nick's pick); make R09.9 advisory; if Nick later wants hooked claws, the respec comes first.

### Tails (R10) and tail root (R11)

![tails](../../../../untracked/species-construction/akinza/surface/hold-audit/09-tails-and-root.png)

History: R10 one order (round 1, kept); R11 never ordered. Held since 2026-09-30. R11 scores 1.3, the lowest of every region; R10 5.8 with I05 (tips curl up and out) marked open.

| Hold | Source | Why |
|---|---|---|
| Tails held | Nick 2026-09-30: "the tails are fine"; 2026-10-01: "the tail is fine; spend the work on the legs, body, arms, face and head" | approved |
| Tail root and pelvis held with them | inferred (the region is named "Tail root and pelvis") | region definition |
| Tips curl up and out, from back study 0018 | inferred from Nick's acceptance of study 0018 ("tail and positioning"), reported as overridable | reference precedence |
| Held regions frozen in the judge | system | S9 |

What shows now: the three tails fuse over the rump in a lumpy join with grooves, a round bulge sits at the top of the stack in the oblique view, and the tails are flat blades with crisp edges (under fur these edges will soften). Recommendation: keep the tails; ask Nick whether the hold covers the join and the hips (question 1).

### Whole-form coherence (R12)

![whole](../../../../untracked/species-construction/akinza/surface/hold-audit/01-whole-model-vs-sheet.png)

Parked since round 1 ("coherence follows the part fixes; reopen when parts reach 5"); never worked. Its criteria R12.1 and R12.2 ask for one modeled coat-lock idiom across the body, which Nick's 2026-10-08 fur ruling made obsolete. Today the head is smooth and cartoon-clean and the body is smooth but reads athletic against the slender sheet. Recommendation: lift the park condition; replace R12.1 and R12.2 with a whole-figure read against Nick's approved look; ask question 3.

### Fur and surface stage

![fur](../../../../untracked/species-construction/akinza/surface/hold-audit/12-fur-and-pattern.png)

History: fur passes 1 to 13 on 2026-10-08 and 10-09; three blind-reader runs at 4 of 10 (passes 10, 12, 13, flat); Nick 2026-10-09: "hide the texture for a bit and focus on the model again", "I do not like the feather look", "shorter on the face and the neck and the head, and longer on the tips of the ears", "a ... half grown beard".

| Hold | Source | Why | Effect |
|---|---|---|---|
| The surface step never edits the construction mesh; geometry problems go back as a single loop order | inferred (surface plan 2026-10-08) | keep phases apart | Passes 9 to 13 tuned locks to hide model lumps; lifted when Nick asked to fix the model (2026-10-09) |
| Fur length, density and comb keyed to the loop's region boxes | inferred (surface plan decision 4) | zones existed | Coarse: the face box is |x| under .18, so cheek and jaw fur ran long ("beard") |
| Fur may add at most .03 (body) and .05 (ears, tails) p95 to the clay outline (S06) | inferred: "the first limit ... was a guess set before measuring" | keep proportions | Caps the ear fur that would restore any of the sheet's fan |
| Judged by readers against the grayscale painting | inferred (decision 5) | references | Flat at 4; readers named the model's lumps, not the fur |
| No check of the furred silhouette against the sheet | system | none written | Finding 6 |

Recommendation: before fur restarts, set lengths per anatomy from Nick's 2026-10-09 ruling (not region boxes), set S06 from the sheet's own fur thickness per region, judge every fur pass beside the bare clay at the same camera, and ask question 2.

### Color pattern

History: color passes 1 to 8 (2026-10-08 evening): flat palettes A to D, then P1 to P3, P2b and P2c, then tiger stripes T1 to T4. Nick: "white and light, light blue alternating stripes or patches or dots" (2026-10-09, 00:36 UTC); "why only on the back?"; "closer to tiger stripes where they come to points ... alternate almost like a brick pattern"; "you left a white stripe going down the middle ... it should be more intentional"; "still ... marble floors"; "the inner ear section should be the same color as the stripe". T4 was rendered after the last of these (21:32 CDT) and has no verdict.

| Hold | Source | Why |
|---|---|---|
| Pale underside mask (countershading, belly and face front excluded) | inferred | ecology reading of Nick's ice-world brief |
| Stripes laid per part on stored rest coordinates (trunk angle, limb axes, tail axis) | inferred | the pattern follows the body when posed |
| Eye color deep ice-teal #16789A | Nick 2026-10-09 ("between B and C") | approved |

No stall here: the work paused with the texture. The underside mask is the likely source of the "accidental gap" Nick named and is inferred. Recommendation: when texture resumes, show T4 on the current head with and without the underside mask, and ask.

### The loop's own judging

| Mechanism | Source | What it did to this creature | Call |
|---|---|---|---|
| Critic checklist scores | system | A cold rescore with no geometry change moved regions 1 to 2 points (round 33, face 8.3 to 5.8) | Keep as a report only |
| Blind readers decide keeps (readerKeep) | Nick approved 2026-10-07 (audit recommendation 5) | Sound for a broad read, but tied to S1 and S2 | Keep, with S2 fixed |
| Three reverts in a row open a decision and block the region | Nick approved 2026-10-07 | Worked for R09 and R03 (Nick answered in minutes); R01's item went stale | Keep; close stale items when a part is rebuilt outside the loop |
| Method review after a plateau | system | Found real causes (R06 H1/H2, R09 claw representation), but the fix needed a spec change builders could not make | Keep, with S7's decision report |
| Side-effect and geometry carry | system | Correct: unmoved regions kept their grades | Keep |

## Questions for Nick (each self-contained)

1. When you said the tails are fine, did that also cover where the tails join the hips and the shape of the hips? The join is lumpy, there is a round bulge at the top of the tails, and the waist flares into the hips abruptly. I would smooth those without touching the tails. Picture: `untracked/species-construction/akinza/surface/hold-audit/09-tails-and-root.png`.
2. When fur goes on the big ears, should it bring them back out toward the shaggy fan on the sheet, or should the ears stay close to the clean Grogu shape with only short fur along the rim? Pictures: `10-silhouette-fit.png` (the orange fringe is the sheet's painted fur the clay is measured against) and `02-head-and-ears.png`.
3. The body reads a little athletic (square shoulder caps, a pinched waist, a defined chest), while the sheet reads more slender and soft. Should I move the body toward the sheet, or is it fine once fur is on? Pictures: `01-whole-model-vs-sheet.png`, `05-torso.png`.

## Not verified

- The wrist and elbow ring cause (the frozen paw root) is read from the step parameters and round 29's result, not from a section.
- The upper-back band at the yoke and join seam (z about .424) is the methods file's predicted failure, not measured.
- The 10 to 15 percent furred-width estimate uses the body fur margin measured on assembled-2999 (front p95 .023 world units per side) against the slim rows; it needs the one furred-silhouette measurement in finding 6.
- I did not re-render a packet; assembled-3168's packet was current.
