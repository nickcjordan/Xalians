# Construction loop audit, 2026-10-02

Independent audit of the Akinza construction loop (v1 rounds 1 to 16 on assembled-0156 to 0205, v2 rounds 1 to 16 on 0205 to 0458, v3 rounds 17 to 20 on 0458 to 2278). Everything below is measured from the 16 workflow transcripts under `subagents/workflows/wf_*` (187 agents), the round records, the packet images and the code on `akinza/construction-loop` at `d8f984ad`. Four commits landed on the branch while this was written (`dabd04e1` to `83e7f1f9`: v3.3 paired orders for the fan, a fresh audit every three kept orders, and five more measured R06 criteria); the findings are stated against `d8f984ad` and note where v3.3 already moves in the recommended direction. The design documents were read for what they claim and then checked against that evidence. Scripts used for the counts are not committed; the method is stated beside each number so it can be reproduced.

## Summary

The loop has spent about 1.3 billion tokens (deduplicated) and roughly 35 hours of workflow wall time. It raised its own weighted checklist score from 2.72 to 5.50, and almost all of that came in v2 rounds 2 to 7. Rounds 10 to 20 (eleven rounds, about 570M tokens including the v3 preparation) moved the mean by 0.40, and rounds 14 to 20 (seven rounds, about 400M) moved it by 0.005 net. On the loop's own proof metric, tokens per +0.1 of weighted mean, v3 is about four times worse than the v2 plateau it was built to beat (370M against 94M), and v2's plateau was already five times worse than its productive rounds (17M).

The score itself is the deeper problem. It is dominated by silhouette and width metrics that have been satisfied since round 7, so the model's outline matches the sheet while its surfaces do not. The current model, assembled-2278, has the right silhouette and reads as a smooth vinyl toy wearing a crown of crumpled paper. The independent gap audit of 0458 said the same, and the v3 changes addressed the process around that finding (reopen rules, audit-led priority, tools) without changing what is measured or what decides a keep.

Where the tokens go is clear and fixable without touching the architecture: 36 percent of every token is a fixed 61K preamble (the project CLAUDE.md and tool catalog) re-read on every one of 7,576 turns; builders spend 61 percent of their wall time waiting on Blender and burn turns polling for it; the critic re-grades eleven of twelve regions on every candidate because the side-effect threshold exempts almost nothing; and spec writers cost as much as critics while half the builders never open a spec.

## 1. Where the cost goes

### Accounting

Transcripts write one API response as two or three lines (thinking, text, tool use), each carrying the same `usage` block. Summing lines double counts: 14,821 usage lines, 7,576 distinct `message.id`s, raw sum 2,487M, deduplicated (max usage per message id) 1,297M. The progress notes count the raw sum: "round 20 cost about 73M" is 39.5M deduplicated, "round 19 about 90M" is 51M. All figures below are deduplicated unless marked raw.

Of the 1,297M, cache reads are 95 percent. Uncached input, output and cache writes together are 59.5M; output tokens are 8.0M. The dominant cost driver is therefore turns times context size, not what the agents write.

### By run and role

| Run | Role | Agents | Tokens | Share of all | Per agent | Turns per agent | Minutes per agent |
|---|---|---|---|---|---|---|---|
| v1 | builder | 17 | 147M | 11% | 8.6M | 52 | 26 |
| v1 | critic | 19 | 34M | 3% | 1.8M | 17 | 4 |
| v2 | builder | 38 | 494M | 38% | 13.0M | 67 | 35 |
| v2 | critic | 42 | 157M | 12% | 3.7M | 29 | 6 |
| v2 | spec writer | 12 | 134M | 10% | 11.1M | 60 | 22 |
| v2 | combine, record | 26 | 9M | 1% | | | |
| v3 | builder | 9 | 142M | 11% | 15.8M | 81 | 56 |
| v3 | critic | 9 | 33M | 3% | 3.6M | 29 | 6 |
| v3 | spec writer | 6 | 108M | 8% | 18.0M | 85 | 32 |
| v3 | toolsmiths, audit, method plan and review, combine | 9 | 40M | 3% | | | |

Totals: v1 180M, v2 794M, v3 323M (178M in rounds, 145M in the prepare phase). Builders are 60 percent of everything, spec writers 19 percent, critics 17 percent.

Context per turn (cache read per turn): builders 160K, critics 115K, spec writers 160K to 200K. First-turn cache write is 61K for every role: the system prompt, the full Xalians project CLAUDE.md (lore, API, design system, none of it relevant to a Blender build), the user CLAUDE.md and the tool catalog. At 7,576 turns that preamble is about 460M tokens, 36 percent of the whole project, before any agent reads an order.

### Per round

| Rounds | Tokens | Mean gain | Tokens per +0.1 |
|---|---|---|---|
| v2 rounds 2 to 7 | 414M | +2.38 (2.72 to 5.10) | 17M |
| v2 rounds 8 to 16 | 332M | +0.35 (5.10 to 5.45) | 94M |
| v3 rounds 17 to 20 | 178M (+145M prepare) | +0.05 (5.45 to 5.50) | 370M (670M with prepare) |

v2 rounds cost 12M to 96M each (median 44M); v3 rounds 22M to 60M. Wall time per round is set by the slowest builder: 45 to 88 minutes in v2, 47 to 81 minutes in v3, with critics adding 6 to 18 minutes and the recorder, combine and combined critic another 10 to 20. A round is about an hour; a two-order round produces at most two candidates.

### What builder turns do

Classifying each builder turn by the tool it calls (raw lines, text-only thinking lines excluded, 64 builders):

- Looking at images (`Read` of a PNG): 26 percent of builder spend. 19 image reads per builder on average, each staying in context for every later turn.
- Running a Blender build or sweep: 15 percent. 10.7 Blender calls per builder; `recipe.py build` or `sweep` 0.6.
- Writing or running ad hoc Python (editing scripts, measuring, cropping): 22 percent.
- Waiting: `sleep` loops 6.6 percent, `Monitor` 3.8 percent, re-reading logs with `tail`, `cat`, `ls` 3.2 percent. That is 254 `sleep` commands, 168 `Monitor` calls and 170 log reads, about 11 turns per builder, each paying the full 160K context. Example from the round 20 R06 builder: `sleep 400; tail -5 <log>`, then four more poll turns before the sweep finished.
- Packet, fit, quick, containment, seams: 8 percent. Git: 2 percent.

Wall time: builders ran 2,253 minutes in total; 1,377 of those minutes (61 percent) are gaps longer than 90 seconds between turns, which is Blender time. By the command before the gap: explicit sleeps 426 minutes, packet and render 304, component builds 297, ad hoc scripts 125, recipe builds 89. Critics have no such gaps.

So a builder's hour is roughly 35 minutes of Blender, during which the agent either polls (and pays tokens) or is blocked (and pays nothing but can do nothing), and 25 minutes of reading images and editing scripts. Of its 13M to 16M tokens, roughly 5M is the fixed preamble, 2M is polling and log reading, 3M to 4M is looking at images, and the rest is building and authoring.

### Critics, spec writers, prepare

The critic reads 21 images and makes 29 turns per candidate. The critic brief says untouched regions keep their results and are not judged, but every candidate critique contains criteria for 11 of 12 regions (54 to 79 entries), each with written evidence. The reason is the side-effect threshold: `species.json` sets it at 0.0005 of changed pixels (the workflow caps it at 0.0015). Measured on the v3 candidates, 7 of 12 regions exceed it on a head order and 12 of 12 on a body order, so the "scoped critic" of the v3 contract exempts nothing in practice. The critic also carries the result text for untouched regions by rewriting it, which is how round 14's stale frozen R08.10 happened.

Spec writers average 11M (v2) to 18M (v3) each and 22 to 32 minutes, about the same as a builder, to produce one markdown file and one image. The v3 prepare phase rewrote six specs for 108M, every one for a region that already had a v2 spec (R03, R04, R05, R06, R07, R09). Across all runs, 36 of 64 builders ever opened a `specs/` file. The spec image for R03 (reproduced in `specs/R03.png`) is a good document; its content reaches the builder only if the builder chooses to read it.

The two v3 toolsmiths cost about 25M together and 50 minutes each. The R06 trunk tool was used in round 20. The R03 fan front tool has not been used by any order; the front fan still runs the round 16 lock system (recipe step H33).

## 2. Where quality is lost

### What is most wrong with assembled-2278

Judged against the reference sheet (`m01`) and the accepted crops, at equal figure height:

1. The coat idiom. The sheet is a soft, shaggy, matte animal; the whole ear fan is thick fur with long pointed locks and a pale fluffy inner cup. The model's fan is hard-edged, faceted leaves and shards with knife edges. From the front and three quarter it reads as crumpled paper or a pine cone; the inner cups are white, flat, blade-like plates. The rear (the round 20 change) is better: overlapping leaf locks flow down and out and the crumpled bowl is gone, but it is still a tiled shell, and its crown thorns now show above the front fan. In profile the head is a spiky column with no visible pale cup.
2. The face. The eyes are near-round discs with small centered pupils and an even dark ring; the sheet has tall almond ovals, a large iris glancing to one side, and a heavier upper lid. In profile the eye is a dark slit under a cheek ridge. The muzzle is a bland lump with a decal mouth; there are no cheek tufts. The head itself is a smooth egg; the sheet's is a fur mop with a round skull.
3. The neck and shoulders. A tight hourglass stalk with a pinch under the jaw, so the head sits like a lollipop; square shoulders with a yoke from behind. The sheet's neck is slim but flows into sloped shoulders.
4. The trunk and arms. A smooth tube with a pinched waist and a quick hip flare, no rib cage and no S curve in profile; sausage arms ending in closed fists with three claws. The sheet's arms are long and slender with four-toed paws and claws.
5. Legs and hind paws are the closest parts: thigh and calf read well; the hind paw is a slipper with four beads and pin claws; the stance is wider than the sheet's.

The silhouette overlay (`m11`) is nearly grey everywhere except the arms (pose) and tails (held). The loop has solved the outline. What is left is surface frequency, softness and the drawing of the face, which is what makes the sheet read as this creature.

### The rubric measures the outline, the audit measures the read

Of the 84 criteria the rounds were scored against, 30 are measured silhouette or station metrics and 21 of them pass on 2278; the measured ones carry R01 (4 of 8), R03 (2 of 7), R04 (3 of 7), R05 (3 of 6), R06 (6 of 10) and R08 (6 of 11). (While this audit was running, commit `83e7f1f9` added five more measured criteria to R06, so the rubric is now 89 lines with 35 measured; the trend is toward more of what is already saturated.) The head silhouette (R01, 8.1) and face (R02, 8.3) have sat above the pass bar since rounds 7 and 10 and were therefore not orderable until the v3.1 reopen rule, while the independent audit of 0458 scored them 6 and 5 and ranked the profile eye slit third of sixteen gaps. Two Opus readers looking at the same packet disagree because one reads a checklist line ("in true profile the brow and the nose tip both stand in front of the eye surface", passed on `m05 nose-profile`) and the other reads the figure.

The gestalt criteria added on 2026-09-30 were meant to fix this, and they do fail on the right things (R12.1, R12.2, R12.5, R06.9, R09.8 all fail). But R12 is parked ("reopen when parts reach 5"), so the criteria that describe the real gap are excluded from the orders, and each gestalt line is one credit against several passing outline lines in its region.

### The ratchet is deciding on noise

A region score moves in steps of 10 divided by twice its criterion count (0.6 to 1.25 points); the weighted mean moves 0.03 to 0.13 per step; the keep threshold is 0.025. In effect a keep requires at least one visual criterion to cross a boundary in the target and none to cross back anywhere else. Outcomes of the 36 orders:

- 20 kept. Seven of them moved no criterion at all and were kept on the critic's "better" verdict (rounds 11, 12, 15, 16, 16, 19, 20); on the simulator's own baseline the round 16 R07 keep scores -0.043.
- 16 reverted. Six were judged "better" for their target by the critic (rounds 8, 8, 9, 9, 17, 18) and reverted for a neighbor crossing a boundary or for no criterion moving.

The round 17 R04 rear fan (assembled-2075) is the clearest case. Its back view is plainly better than the baseline's crumpled bowl; it was reverted because R03.3 (front V tilt) went partial to fail and no R04 criterion crossed. Round 20 rebuilt the same branch on the new baseline (40M tokens, 47 minutes), with the same side effect on R03.3, and was kept because R04.3 and R04.7 crossed fail to partial this time. Three rounds and about 120M tokens separate a reverted improvement from its keep, and the verdict-debt rule that would have kept it in round 17 was simulated and left off because it would also have kept round 8's leg build.

Round 8's leg build (assembled-0342) was reverted for a "tail kink" that took R10 from 4.2 to 3.3. The tail panel (`m10`) differs from the baseline's in 0.33 percent of pixels; the tails are the region Nick has said are fine and are held. A 0.9-point loss on a held region, graded from a sub-percent pixel change, is what blocked the better keep rule. The simulator's rejection of that rule rests on this case.

Round 18's hind paw (assembled-2112) had claws from the toe tips and a domed instep, the two things the audit asks for; it was reverted for an ankle collar that cost R08 two criteria. That is a correct revert by the rules and the wrong use of the work: the next order for R09 should have started from it (the v3.1 branch rule), but R09 has not been ordered since because its audit rank (11) and lack of a tool put it behind the fan and trunk.

### Is the loop working on the most visible problems?

Partly. The audit-led priority (v3.2) did put the fan rear and trunk first in round 20, and those are ranks 1 and 5. But the priority adds +20 for an unused tool and +2 per audit rank, so tool-bearing regions dominate: R02 (rank 3, identity) scores about 22 against R04's 46 and will not be ordered while any tooled region remains. The coat problem (audit ranks 1, 2, 4, 6, and the cheeks at 14) is treated as three regions with two different generators (the old front lock system at H33, the new clump field at H34) and no owner for body coat masses. The face in profile, rank 3, has had no order since round 10. The forepaws, rank 7, got one order in v2 and none in v3.

### Critic verdicts against the images

Sampled critiques (2075, 2112, 2211, 2272, 2277, 2278, 0393) match what the images show at the level of "what changed and in which direction"; the critic's descriptions are accurate and its evidence is specific. Where it diverges from a designer's read is in the per-criterion grading, which follows the rubric text literally (R02.1 and R02.6 pass on a face the audit calls a squinting slit), and in grading untouched regions from tiny pixel changes. The critic's own "better, same, worse" verdicts are the most trustworthy signal the loop produces, and they are the signal the keep rule overrides.

## 3. Structural assessment

The current shape is: one Sonnet agent edits parameters of a 23-step chain of Blender mesh warps (4 to 6 minutes per step, 25 minutes for the head chain), an Opus critic grades an 80-line checklist from 20 images, and a ratchet keeps the candidate if the checklist score rises without any region losing a step. Each part of that shape is working against the goal.

**The substrate limits the search.** A builder can afford five or six component builds an hour, so every order is a handful of guesses by one agent, and the sweep tool (12 variants) is used in a third of v3 orders. The parts that improved fastest (arms, hind paws, trunk in round 20) are the ones generated from parameters by a dedicated script; the part that is weakest (the fan) is the one still sculpted as locks pushed into a level set. The LOOP-v3 plan itself named "hair curves for fur"; the method plan then chose "coat clump volume" meshes again. The fur idiom is a representation problem: a soft shaggy read will not come from smoothing leaf-shaped level-set clumps, however many rounds tune their taper.

**The judge measures the wrong thing at the wrong granularity.** Checklist credit is coarse, saturated on outlines, and literal; the critic's pairwise verdict is fine-grained and matches the images; the rule uses the former and treats the latter as a tie-break. The two Opus roles that read the whole figure (the gap audit, the cold review) produce the rankings that actually describe the gap, and they run once per phase.

**The agent is in the loop while Blender runs.** Sixty percent of all tokens are builders, and most of a builder's turns are spent watching a process it cannot influence, with a 160K context that includes every image it has looked at.

**The loop cannot reach its own gate.** `gateMet` requires every region at 7 or more, and R10, R11 and R12 are parked at 4.2, 1.3 and 1.0 by Nick's direction and by design. The approval gate is unreachable while held regions count, so the loop runs until a hard stop by construction, and the plateau stop (section 5) has never fired.

What I would change in the architecture, not just the parameters:

1. **Author parts, not warps.** Make every region a generator from parameters (the arms, paws and trunk already are; the face tool is close) over a smooth base body, with the assembly a fixed join. Then a candidate is a parameter vector, a build is seconds to a couple of minutes, and the search can be a sweep of tens of variants scored automatically, with the agent choosing among contact sheets rather than babysitting builds.
2. **Represent fur as fur.** For the fan, cheeks, chest and tails, generate clumps as instanced curve or strand geometry (Blender hair curves, or a procedural clump scatter) over a smooth volume whose outline is already right. The silhouette stays under the existing fit metrics; the surface read changes idiom at once instead of over eleven fan orders. Renders of hair curves are geometry, so the "no image model" rule holds.
3. **Judge by read, guard by measurement.** Keep the measured criteria and invariants as hard constraints (no regression beyond a tolerance). Decide keeps by a pairwise whole-figure verdict from fresh readers at equal scale against the sheet (the owner's own rule: three Opus readers), with the gap audit's ranked list as the per-round order source. Drop per-criterion visual grading from the inner loop; run the full checklist only at the gate.
4. **Take the agent out of the build.** Split the builder into a short planning call (read the order, the baseline images and the last sweep; emit a sweep grid or a recipe edit), a non-LLM executor (sweep, build, packet, seams, containment), and a short selection call. The executor already exists as `recipe.py sweep` and `loop_tools.py packet`.
5. **One owner for the coat.** Treat fan front, fan rear, cheeks and body tufts as one region with one idiom and one tool, ordered as one job. The species config already has a `pairs` mechanism and v3.3 (`dabd04e1`) now pairs the fan front and back; extend the pair to the cheeks and body tufts, and give it the one idiom of point 2 rather than the two generators it has today.

## 4. Ranked recommendations

Expected effects are estimates from the measurements above; "per kept improvement" uses the v3 rate of one kept, criterion-moving order per two rounds.

### Quick wins (days, low risk)

| # | Change | Evidence | Expected effect | Effort | Risk |
|---|---|---|---|---|---|
| 1 | Cut the per-turn preamble: run loop agents with a loop-only CLAUDE.md (the brief) and a trimmed tool set, instead of the full project and user instructions. | 61K cache write on turn 1 of every agent; 36 percent of all tokens are that preamble re-read. | Up to a third of all tokens, every round, every creature. | Low if the harness takes a per-agent system context; otherwise run the loop from a worktree whose CLAUDE.md is the brief. | Agents lose project rules they do not need; keep the no-push and no-rm rules in the brief. |
| 2 | Stop polling. Give builders one blocking `wait` command (or a long tool timeout) for builds and sweeps, and forbid `sleep` and `Monitor` loops in the brief. | 254 sleeps, 168 Monitor calls, 170 log reads; about 11 turns per builder at 160K each. | About 15 percent of builder tokens (roughly 7M per round). No change to wall time. | Low. | None. |
| 3 | Make the critic actually scoped: raise the side-effect threshold to the shakedown's noise floor per region and cap the critic at the target plus the two largest-change regions; let a deterministic silhouette and station regression check guard the rest. | Threshold 0.0005 exempts 0 to 5 regions; critiques carry 54 to 79 criteria; the round 8 tail revert came from a 0.3 percent pixel change on a held region. | Critic cost down about half (around 4M per round); fewer reverts from noise in untouched regions. | Low to medium (threshold is a config value; the carry logic exists in `judge`). | A real side effect under the threshold slips past the critic; the combined check and gate review still see it. |
| 4 | Decide keeps on the pairwise verdict, with measured criteria and invariants as hard guards. Remove the "target checklist must rise" and "mean must rise by .025" conditions; keep "no measured regression beyond tolerance" and "no new invariant break". | 7 of 20 keeps moved no criterion; 6 of 16 reverts were "better"; rounds 17 to 20 spent about 120M to re-earn a reverted improvement. | More kept improvements per round at the same build cost; the simulator can confirm on the record (rerun with the round 8 tail loss excluded, since that region is held). | Low (rules live in `loop_core.js`; the simulator exists). | Drift of neighbors across rounds; mitigate with the measured guards and a periodic cold review. |
| 5 | Stop regenerating specs; cap spec writing at a structure table plus `spec_targets.py` output, and inline the structure table into the builder order. | 108M for six v3 specs; 36 of 64 builders opened a spec. | About 15M per spec saved; builders see the spec. | Low. | Shorter specs lose the failure-look prose; keep it as a linked file. |
| 6 | Fix the plateau stop and the gate (section 5), run four-round batches, and send Nick the honest report the v2 hard stop promised at round 16. | Plateau condition true at the start of every v3 batch; never fired. Gate unreachable with held regions. | Prevents another 300M on a flat line. | Low. | None. |
| 7 | Reprioritize by audit severity and identity weight, not tool availability; order R02 (profile eye) and the forepaws before the next fan retune. | Priority formula gives +20 for an unused tool; R02 at about 22 against R04 at 46. | Work lands on the identity gaps the audit ranks 3 and 7. | Trivial (two constants). | None. |

### Larger redesigns (weeks, needed for the next creature)

| # | Change | Evidence | Expected effect | Effort | Risk |
|---|---|---|---|---|---|
| 8 | Split the builder into plan, execute, select; run the executor as a script. | 61 percent of builder wall time is waiting; builder tokens are 60 percent of the project. | Builder tokens down 60 to 70 percent; sweeps of 20 to 50 variants per order become normal. | Medium (sweep, packet and seams exist; the planning prompt and a selection prompt are new). | The planner cannot react mid-build; a two-pass order (sweep, then refine) covers it. |
| 9 | Replace the fan's level-set clumps with instanced strand or curve fur over the fitted outline, and apply the same idiom to cheeks, chest and tails. | Thirteen fan orders across v2 and v3; the fan is audit ranks 1, 2, 6; the sheet reads as fur, the model as shards. | The largest single step toward the reference read; one tool for ranks 1, 2, 4, 6. | Medium to high (a new generator; hair curves render in Workbench and Cycles). | Hair geometry may not survive the union, fairing and GLB export; keep it as a separate object as the eyes and claws already are. |
| 10 | Make every region a parametric generator over a smooth base, with the recipe as a parameter file rather than a warp chain. | Parametric parts (arms, paws, trunk) improved on first or second orders; warped parts (fan, head) stalled. Head chain rebuild is 25 minutes. | Builds in seconds to minutes; the whole search becomes sweepable. | High; do it for the next creature rather than retrofitting Akinza's chain. | Loses the Hunyuan base detail in regions the generator does not cover; the base body remains the fallback. |
| 11 | Replace per-criterion visual grading with three blind pairwise readers at equal scale plus a cheap surface-statistics guard (edge density and curvature spectrum per region against the sheet's crop), and run the 80-line checklist only at the gate. | Checklist is saturated; the pairwise verdict and the gap audit are the signals that match the images. | Judging cost comparable to today's critic, decisions aligned to the read, and a measurable "softness" number for the coat. | Medium. | Readers disagree; take the majority and record the split as evidence, as the gap audit already does. |

## 5. Broken or misleading

1. **Token accounting double counts.** Progress notes, LOOP-v3.md's role shares and `agent_costs.py` sum transcript lines; one message is two or three lines. Real costs are about 52 percent of the reported ones. LOOP-v3.md also says the v2 run cost "about 18M subagent tokens"; the v2 transcripts sum to 794M deduplicated (35M uncached). Pick one definition (I suggest deduplicated total plus uncached) and state it in every note.
2. **The plateau stop never fires.** `means` is not in the round record's `state` snapshot or in `status.json` (dropped on merge); `loop_state.py args` rebuilds it from the round files, where it is 20 entries long with the last three flat, so `plateau()` is true at the start of every v3 batch. No v3 journal contains the plateau method reviews or the stop. The cause is either the prepare-phase replan resetting the window (`S.means = [mean]` on replan) or one-round batches never reaching the second trigger; both mean the rule is disabled in practice. The judge simulator shows the configured rule would have stopped v2 after round 9.
3. **The approval gate is unreachable.** `gateMet` requires every region at 7 or more; R10, R11 and R12 are parked at 4.2, 1.3 and 1.0 by direction and by design. Held regions must be excluded from the gate or the loop can only end at a hard stop.
4. **The side-effect threshold does not scope the critic.** 0.0005 in `species.json` exempts 0 to 5 regions; the v3 contract's cheaper critic was not realized, and the critic rewrites every carried result instead of the judge carrying it (the mechanism behind the round 14 stale copy).
5. **The R03 toolsmith output is unused.** `tools/R03.json` and a 20M (raw) build exist; the recipe's front fan step is still H33. `methods.json` says front and rear share one script.
6. **The record and the simulator disagree on four kept orders** (rounds 14, 16, 19, 20), all downstream of the round 14 manual correction; the recorded mean path falls at round 14 on a kept order. The record is honest about it, but `round-14.json` carries a kept order whose own reason text says the mean fell.
7. **The verdict-debt rejection rests on the round 8 tail case,** a 0.9-point loss graded from a 0.3 percent pixel change in a held region. Rerun the simulation with held regions excluded from losses before treating that rule as refuted.
8. **The effort trial is one sample** and is cited as a decision ("builders stay at high effort"). It is not evidence either way.
9. **Hard stop drift.** LOOP.md promises Nick an honest report at 16 rounds; `limits.hardStopRounds` is 32; the v2 run passed round 16 and v3 passed round 20 without that report. The only `hard-stop-report.html` in the loop folder is the v1 run's (2026-09-30, "5.12 to 6.05"), and it still names scores from a rubric that no longer exists.
10. **Housekeeping.** `args.json` committed in the loop folder is the round 16 file. A round 20 builder wrote images to `C:\untracked` outside the repository and could not remove them; a round 7 builder ran `rm -f /dev/null`. The critic for round 8 wrote its critique into `assembled-0342-u` rather than the candidate's packet because `diff.json` was missing and it recomputed one. The combined critic reads a third critique per round to confirm two pixel-identical halves; a pixel diff would do.

## Appendix: method

- Tokens: for each `agent-*.jsonl`, assistant lines with a `usage` block were grouped by `message.id` and the largest usage per id taken; totals are input plus output plus cache read plus cache creation. Roles come from the journal labels. Runs: v1 is the workflows whose packets are 0156 to 0205, v3 is `wf_f71ec65d`, `wf_b851c1b1` and `wf_0508a531`, v2 is the rest.
- Wall time: first to last timestamp per agent; waiting is the sum of gaps longer than 90 seconds between consecutive assistant turns, attributed to the tool call before the gap.
- Turn kinds: the Bash command text classified by pattern (`sleep`, `recipe.py build`, `loop_tools.py blender`, `quick`, `fit`, `packet`, log reads), `Read` split by `.png`.
- Score history, orders and keep reasons: `loop/rounds/round-NN.json` and `node judge_sim.mjs akinza`.
- Images: packets 0205, 0226, 0336, 0342, 0458, 2075, 2112, 2180, 2211, 2272, 2277 and 2278 (m01 to m11, posed fit, critique.json, diff.json), `specs/R03.png`, and the accepted crops.
- Tests: `node --test art/species-construction/loop/test/` passes (32 tests).
