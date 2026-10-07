# Construction loop audit, 2026-10-07

Independent process audit of the Akinza construction loop, rounds 21 to 28 (v3.5 to v3.12), on branch `akinza/construction-loop` at `e2cb7d65`. Everything below is measured from the eight workflow transcripts (`wf_0b754935` r21, `wf_71306616` r22, `wf_d8b41e0d` r23, `wf_dcab7f77` r24, `wf_29af8b74` r25, `wf_075254d9` r26, `wf_7516187a` r27, `wf_52118f40` r28; 227 agents), the round records `akinza/loop/rounds/round-21.json` to `round-28.json`, the plan results and job logs under `akinza/loop/plans/`, the packets under `untracked/species-construction/akinza/loop/packets/`, and the code in `art/species-construction/loop/`. Tokens are counted once per message id, as `loop_costs.py` does. The contract (`LOOP-v3.md`) and the status notes were read for what they claim and then checked against that evidence. Both test suites pass (54 node tests, 62 python tests) and `build_workflow.mjs --check` reports the generated workflow current.

## Verdict

The mechanisms mostly do what their code says, and the judging side of the loop (three blind readers, a scoped critic, the judge) is cheap, consistent and no longer the problem: readers plus critic plus regrade plus record are about 7 percent of tokens and 10 to 15 minutes of each round. The waste is almost entirely on the build side and it is concentrated: of 420M tokens in rounds 21 to 28, 243M (58 percent) went to toolsmiths and 65M (15 percent) to code builders, and 81 percent of all tokens went to two regions, the face (R02, 177M) and the ear fan (R03 and R04, 164M), which kept nothing in eight rounds; the three regions that produced all five keeps (torso, forepaw, neck) cost 57M together, and the five kept paths cost 36M (9 percent). The weighted mean rose 5.478 to 6.031, but only 0.216 of that (the round 23 torso) came from the target region's own criteria; 0.312 came from the critic regrading untouched or held regions (tails in round 24, legs and whole form in round 25), which the later freezes now correctly block, so the "flat since round 25" is the honest state and the earlier rise was partly noise. The loop is not learning across rounds where it matters: the face has been ordered four rounds running with three blind readers preferring a bold eye outline every time and the critic failing it every time on a rubric line (R02.2, "thin lid line, not a thick raised black ring") that contradicts the ruling eye reference `r01`, which plainly has a thick black outline; instead of asking Nick, the loop wrote a spec addendum and then face guards that exclude the readers' preference, and built three successive face tools (152M) for a region that already scores 8.3, above the pass bar. The fan has had three methods and three tools since round 21 on a cycle of method review (1 to 3 minutes) to toolsmith (50 to 150M) to rejected plan to park to method review. The fixes since the last audit (lean agents, split builder, run-plan, reader packs) worked and cut the per-order cost to about 5M when the plan path runs clean; the incremental fixes since then (repair pass, runner-up critic, paired regrade, measured tie, pairNet, outside review, time budget) are each cheap but have changed no outcome, and several of the stop and budget rules cannot fire as built (the plateau stop needs a per-batch variable that resets every run; the round clock starts before the Prepare phase it was meant to bound). The one thing that would have saved the most is a two-minute human decision at the right point, and the loop has no such point.

## 1. Where the time and tokens went

### By round

| Round | Wall | Tokens | Kept | What the round actually did |
|---|---|---|---|---|
| 21 | 339 min (160 of it a dead gap, 20:18 to 22:58, after a runner failed) | 41.4M | nothing | audit refresh; two plans whose first runners failed (read-only session, run-plan timeout); every reader verdict stored as `same` (fixed in v3.5); 3 method reviews |
| 22 | 220 min | 168.0M | nothing | face tool 103.7M and fan tool 43.9M built before the orders (127 and 93 min); both rejected by readers 3-0 and fixed once; both orders reverted on checklist losses |
| 23 | 232 min | 25.3M | torso +0.216 | fan tool fix 6.7M (77 min); torso plan path kept on 3-0 readers, 5M; fan plan rejected, code builder 8M (46 min) reverted |
| 24 | 80 min | 9.5M | torso +0.165 | both plans clean; the gain is the held tails' rescore, not the torso |
| 25 | 230 min after an overnight restart (raw 1353) | 41.4M | forepaw +0.147 | R04 tool 18M rejected twice; forepaw code builder 12.6M (91 min) kept; the gain is legs and whole-form regrades; face reverted after a repair pass |
| 26 | 198 min | 14.2M | forepaw +0 | face plan 11 variants, run-plan died after 99 min with no result; refine and repair plans both reverted; forepaw kept 2-1 |
| 27 | 139 min | 35.2M | neck +0 | face tool 10.1M (56 min) passed 2-1; face plan died at 4.5 min, refine rejected; neck code builder 15.5M (69 min) kept 3-0; plateau fired once (two method reviews) |
| 28 | 342 min | 85.2M | nothing | face tool 33.5M (3 sessions, rejected 3-0 twice) for a region not ordered; fan tool 16.7M (171 min) passed `same`; fan plan: 2 of 3 top candidates died on a directory race, the one survivor rejected 2-1, code builder 25.7M (103 min) read 2-1 better front, 0-3 worse rear; forepaw plan 3-0 rejected, code builder 2.7M read `same`; no critic ran |

Total 420.2M tokens, about 29.7 hours of workflow wall time (counting round 25 from its restart). Five keeps, two of them with no criterion and no mean change.

### By role (rounds 21 to 28)

| Role | Agents | Tokens | Share | Minutes | Notes |
|---|---|---|---|---|---|
| toolsmith | 15 | 242.8M | 58% | 1,268 | 6 tools built or rebuilt; 1 used by a kept order (none since round 20) |
| code builder | 5 | 64.6M | 15% | 339 | 2 kept (r25 forepaw, r27 neck, both via the planner's `needsCode`); 0 of 2 kept via `rejectToCode` |
| planner | 26 | 42.0M | 10% | 123 | 22M of it in round 21 before the digest existed; 1.5 to 4M since |
| runner | 40 | 17.2M | 4% | 1,212 | wall time is Blender; tokens are low since plan_job |
| method review | 10 | 16.5M | 4% | 37 | every review unparked its region with a new method |
| critic | 13 | 15.2M | 4% | 71 | 1 to 2.6M per candidate, 2 to 7 min |
| reader | 123 | 14.4M | 3% | 54 | 0.1 to 0.3M and under a minute each |
| audit | 2 | 6.3M | 2% | 12 | |
| record, regrade | 10 | 1.3M | 0% | | |

### By region

| Region | Tokens | Orders | Kept | Tokens per keep |
|---|---|---|---|---|
| R02 face (tools 152.0M, orders 24.7M) | 176.7M | 4 (r22, r25, r26, r27) + 2 repair plans | 0 | none |
| R03 and R04 fan (tools 90.8M, orders 73.0M) | 163.8M | 4 (r21, r23, r24, r28) | 0 | none |
| R07 forepaw | 22.8M | 4 | 2 | 11M |
| R06 torso | 18.1M | 3 | 2 | 9M |
| R05 neck | 16.4M | 1 | 1 | 16M |
| shared (audits, record, reviews) | 22.3M | | | |

The face already scores 8.3 (above the 8.0 pass bar) and is orderable only through the audit reopen rule and Nick's pin; it has consumed 42 percent of everything.

### What the mean actually measured

| Round | Mean change | Where it came from |
|---|---|---|
| 22 | +0.025 | three R06 criteria retired, no geometry change |
| 23 | +0.216 | R06 4.6 to 7.1, three measured criteria newly passing: real |
| 24 | +0.165 | R10 tails (held) 4.2 to 5.8; R06 visual results unchanged |
| 25 | +0.147 | R08 legs 6.8 to 7.7 and R12 whole form 1 to 2, regraded on a forepaw order; R07 moved nothing |
| 26, 27, 28 | 0 | |

So the mean is not a progress signal: 56 percent of the rise since round 21 was regrade of regions the order did not touch, and the freezes added afterward (`freezeHeld`, `geometryCarry`) would have prevented it. The loop's own best evidence of progress is the reader verdict on kept changes, and that evidence says: torso twice, forepaw twice, neck once.

## 2. Mechanisms, one by one

Format: works (does the code do what the contract says, and did it fire), valuable (did it change an outcome in rounds 21 to 28, and what did it cost), issues.

### Split builder: planner, runner, plan_job, readers, critic, judge

- Works: yes. Planner 1.5 to 4M since the digest (22M in round 21 without it), runner 0.3 to 1.5M for 45 to 135 minutes of Blender, readers 0.1 to 0.3M each, critic 1 to 2.6M. `plan_job.py` runs detached, waits in bounded calls, and `report` now reads every candidate row from `candidate.json` (round 26's dropped `regionShift` rows are fixed; verified on the round 28 packets, every row present including zeros).
- Valuable: this is the only path that produced keeps cheaply (torso r23 and r24 at about 5M and 3.5M of agent tokens for the path).
- Issues: (1) run-plan died silently three times (r26 face after 99 minutes, 11 variants built; r27 face at 4.5 minutes; r21 timeout); the supervisor with faulthandler was added after r27 and has not yet caught one. (2) Round 28's fan plan lost 2 of its 3 top candidates to a directory race: both candidates were assigned `assembled-2834` and the second died with `FileExistsError` (`untracked/.../assembled-2834.log`), so the readers saw 1 of 13 variants built in 44 minutes, and that one candidate's 2-1 rejection then triggered the code builder. `loop_tools.py next-number` is not safe under the parallel candidate stage. (3) Plans still build every variant when any quick criterion exists for the region (r28 fan: 13 variants, 44 min; r26 forepaw: 11 variants, 134 min, for 3 reader candidates), because `cap_blind` only applies when no criterion is quick-computable. The quick ranking's progress term was zero for every fan and forepaw variant in those plans, so the ranking was noise and the extra builds bought nothing. (4) The reader rankings (`out.readers`) are not written into the round record; they exist only in the journal.

### Reader verdict counting and key handling

- Works: yes, verified on disk. `reader_pack.py` flips the side by a deterministic coin, `key.json` holds `aIsCandidate`, `plan_job.py report` reads it, and `readerVerdicts` matches packs by assembly name and reads regions by id. I rechecked every round 28 vote against the keys (face tool: candidate on A, readers B, B, B twice; fan tool: candidate on B, readers B, same, A; fan code builder: candidate on A, readers A, B, A front and B, B, B rear). All counted correctly.
- Valuable: readers are unanimous on roughly 70 percent of packs and cost under a minute; they are the loop's best signal per token.
- Issues: the status note for round 28 and the round 28 commit message say the face subdivision tool was "reader-passed 3-0". It was rejected 3-0 twice (candidate on A, readers chose B; `tools/R02.json` records `readerCheck: worse` and `rejectedForMethod`). The orchestrator's summary to Nick inverted the result. Notes should be generated from the record, not written by hand.

### Quick criteria and candidate choice (`cap_blind`, control slot)

- Works: yes as coded. The control slot kept the tool-as-built variant in the reader set in r24, r25, r26 and r28.
- Valuable: marginal. In every plan since round 23 where the readers picked a candidate, it was a planner idea, not the control; the control read `same` or worse each time.
- Issues: see split builder (3): `cap_blind` is too narrow and the quick ranking rarely separates variants of the face or fan.

### Geometry carry (`regionShift`)

- Works: now yes. Fired once, in round 27 (neck: R01 to R04 and R06 carried). In round 26 it could not fire because the runner dropped the rows; in round 28 no critic ran.
- Valuable: in principle it removes the drift that produced the round 25 "gain"; in practice it has decided nothing yet.
- Issues: round 28's post-assembly fan candidate (`assembled-2848`) shows `regionShift` 0.024 on R01, R02, R03 and R04 alike, which means the post-assembly step re-meshes the whole head and the carry will never apply to head regions on a post step. The face measure also returned `None` for one eye on that candidate and `faceGuards` stayed empty: a failed measure passes the guard silently.

### Paired re-grade

- Works: fired twice (r26 face: restored R02.1, held R02.2 and R02.6; r26 repair: held R02.1). The alternating side by assembly number is sound.
- Valuable: 0.4M total; changed no decision.

### Repair pass

- Works: fired twice (r25, r26, both face), about 40 minutes of Blender and 2 to 3M each.
- Valuable: no. Both repairs restarted from the reader-picked candidate and lost on the same criterion again, because the loss was the rubric line itself (see section 3), not a fixable defect.

### Runner-up critic

- Works as coded; never fired (added after r26; r27 and r28 had no picked candidate).
- Valuable: unknown. Cheap when it fires.

### Face guards

- Works: `face_measure.py` writes `faceMeasures` and `faceGuards` into every candidate.json; `guarded()` filters before the readers. No candidate has been dropped by a guard yet (round 28 ordered no face plan).
- Valuable: this is the mechanism that encodes the agent's ruling on the eye outline against the readers' preference; see section 3 before relying on it.
- Issues: a `None` measure passes; the guard was calibrated on three rounds of the same disputed candidates.

### Measured-tie keep

- Works as coded; never fired in rounds 21 to 28 (no `tie` entry in any record).
- Valuable: no evidence either way; costs nothing.

### Freeze of held regions, verdict keep

- Works: both are in the judge and are exercised by the tests. Verdict keep produced the r26 forepaw and r27 neck keeps with no criterion moving; freezeHeld would have removed the r24 "gain".
- Valuable: verdict keep is the only reason two of the five keeps exist.
- Issues: none in code. The side effect is on the plateau rule (below).

### Plateau and method review, outside review, keptLog

- Works: partially. The plateau fired once, after round 27 (the record shows means with three flat rounds), ran two method reviews and reset `means` to one entry, which is why `status.json` now holds `[6.031, 6.031]`. The second trigger, the stop, cannot fire: `escalated` is a `let` inside the workflow script, and every round since 21 has been its own workflow run (`args.rounds` is 1, each journal holds one round), so it resets to false every batch. `plateauCountsKeeps` then makes it worse: any verdict keep with zero gain in the window (r26, r27) blocks the first trigger too. The plateau stop is disabled in practice, as the last audit also found for a different reason.
- The outside review fired in round 28 for the fan (R03 is audit rank 1 and 2 with three reverted orders): `method review r28: R03`, medium effort, 6 tool calls, 3 image reads, 0.9 minutes, 0.4M. That one-minute review chose the "parametric pinna shell" method that the next round will spend a toolsmith on.
- Valuable: every method review in rounds 21 to 28 (10 of them) unparked its region with a new method; none of those methods has produced a keep. The reviews are cheap; what they trigger is not.

### Toolsmith flow (sessions, reader check, fix pass, stalled, blocked, toolsForOrdersOnly)

- Works: sessions and notes work (r28 R03 two sessions, R02 two sessions plus fix); the reader check and fix pass run as coded; `rejectedForMethod` is set on R02 and R04; `blocked` fired once (r26 face). `toolsForOrdersOnly` is new and untested live; its unit test passes.
- Valuable: no kept order has used a tool built since round 20. Reader checks have rejected 5 of 8 tool checks (R02 r22 twice, R04 r25 twice, R02 r28 twice; passed: R03 r23 after a fix, R02 r27 2-1, R03 r28 as `same`). The check itself is cheap (about 0.5M) and correct; the problem is building the tool before anyone has asked whether the method is wanted.
- Issues: (1) A tool cycle is method review (1 to 3 min) to toolsmith (50 to 150M, 1 to 3 hours) to order (rejected) to park to method review. Nothing in the loop asks a human before the expensive step. (2) The round 28 face tool was built, checked, fixed and rechecked (33.5M, 2 hours) for a region the round did not order and that scores 8.3; `toolsForOrdersOnly` now prevents that specific case. (3) Toolsmith sessions are capped at 80 tool calls, but a session with 100 tool calls and 24M tokens ran in round 28 (`tool: R02`, 100 tool uses, 88 minutes): the cap is advisory.

### Post-assembly recipe steps

- Works: both round 28 tools are post steps (`A-fan`, `A-face-subd`); they build (5 to 11 minutes) and packet.
- Issues: a post step moves every head vertex by the re-mesh (regionShift 0.024 across the head on `assembled-2848`), so the geometry carry and containment lose their meaning for anything downstream of it; the critic will grade the whole head on every post-step candidate.

### Code builder and `builderSessions`

- Works: five code builders; sessions are new (untested live).
- Valuable: the two via the planner's `needsCode` were the two biggest real changes kept since round 23 (forepaw digits 12.6M, neck column 15.5M). The two via `rejectToCode` (r23 fan 8M, r28 fan 25.7M and forepaw 2.7M) kept nothing.
- Issues: `rejectedAll` is defined as every candidate worse by majority with no reader preferring it, but it fires on a single-candidate plan with a 2-1 vote (r28 fan: one surviving candidate, readers B, B, same). That is not a unanimous rejection of a plan, it is one comparison. The round 28 fan code builder read 42 images and ran 118 tool calls for 103 minutes.

### Round time budget (`roundSeconds`, agent-reported clock)

- Works as coded; not yet exercised (added after r28; r28's args carry no `startedAt`).
- Issues: `loop_state.py args --start-clock` stamps the time when args are written, before the Prepare phase, so toolsmith time counts against the 3-hour round budget. Round 28's toolsmiths alone took 3 hours 2 minutes; under this rule every optional stage of the round would have been skipped before the first plan ran. A separate Prepare budget is needed. Also `--start-clock` makes args differ on every run, which defeats the byte-identical args and the resume cache the test guarantees.

### pairNet

- Works as coded; it would not have changed round 28 (net -2), the case it was written for. No other paired vote since round 24 would flip.

### Audit refresh, cooldown and order picking, pin

- Audit refresh fired once (r26, 2.5M) after three keeps; the ranking barely moved (R03 1 and 2, R02 3 both times). Valuable as a check; it did not change the orders.
- Order picking: the priority formula (`priority` in `loop_core.js`) is dominated by audit rank (+24 for rank 1, +20 for rank 3) plus the identity bonus, so the head slot always picks R03 or R02 and the body slot R07 then R05; `lastOrders` for rounds 21 to 28 show exactly that alternation. R09 (hind paws, audit rank 10) has not been ordered since round 18 and R01 since round 19. Cooldown works (R03 skipped r25 to r27 after r23 and r24).
- Pin: used for R02 in rounds 26 and 27. The record does not say what Nick was shown when he approved it.

## 3. Is the decision system sound

Readers against the critic. Every candidate the readers preferred that the judge reverted in rounds 22 to 26 lost on a checklist line of the target region, never on a neighbour: r22 face R02 8.3 to 5.8, r22 forepaw R07 5.8 to 5.0, r24 fan R03 5.7 to 5.0, r25 face 8.3 to 6.7, r26 face 8.3 to 6.7 (plus I01). The critic's own pairwise verdict is overwritten by the readers' in the judge (`out.critique.pairwise = rv`), so the critic's only live role is the per-criterion grade, and that grade is what reverts the readers.

The face case is the systematic disagreement. Readers in r22, r23 (tool check), r25 and r26 chose, 3-0 each time, the candidate with "a bold dark rim all the way around" because it "matches the thick black eye outline in the Reference". The critic failed R02.2 ("The eye outline is a thin lid line, not a thick raised black ring") and R02.6 each time. I looked at the reader pack for `assembled-2783` (round 26): the reference panel is the first sheet beside `r01`, and `r01`, which the critic brief says eyes and expression follow, has a heavy black outline around a large dark iris; the candidate on side B reads closer to it than the baseline on side A. The rubric line dates from the v2 rubric (`1d7cabf8`) and contradicts the brief's own precedence rule. The loop's response was a spec addendum ("darkness, not relief") and then `face_measure.py` guards calibrated so that "every ring the critic failed reads 1.5 to 2.3", which removes the readers' preference from the reader set before they see it. Whether Nick wants a thin lid line or a bold outline is a one-line question he was never asked; the answer decides whether four rounds and 177M tokens were a wrong turn or whether the rubric line is right and the readers are misreading a painting.

Grade drift: confirmed in the record (r24 tails, r25 legs and whole form). The freezes now stop it. The critic's grades on the target are coarse (one criterion is 0.8 to 1.7 points of a region), and "when in doubt take the lower one" in the critic brief guarantees that a candidate that changes an eye will lose a criterion somewhere in R02 even when the readers see an improvement.

Does the loop learn? Within a region, no. The face ran the same bold-outline idea four times; the fan has had clump volumes, lock sweeps v3 and v4, rear sweeps v5, a post-assembly finish and now a pinna shell. Each new method came from a 1 to 6 minute review and cost 50 to 150M to build. The `planRejected` and `rejectedForMethod` records do carry forward, but the only thing that stops the cycle is the stall park, which the method review undoes in the same round.

Right regions? No. The priority formula sends effort to the audit's top ranks regardless of yield. Yield per order in rounds 21 to 28: R06 2 of 3, R07 2 of 4, R05 1 of 1, R02 0 of 4, R03/R04 0 of 4. The regions that pay are the ones built from parameters (trunk loft, arm field, neck table); the ones that do not are the two where the idiom (fur as geometry, the eye drawing) is undecided.

## 4. Structural problems the incremental fixes missed

1. No human decision point. The loop escalates to Nick only through status notes, one of which misreported a rejection as a pass. The two most expensive disputes (eye outline, fan idiom) are matters of taste the readers and critic cannot settle, and a wrong assumption has been encoded into guards and specs.
2. Tools are built on speculation. A method review is one to six minutes; the tool it names is one to three hours and 10 to 100M. There is no cheap validation between them (a sketch build, a ten-minute smoke candidate, a reader check on a crop) and no approval.
3. The progress metric rewards the wrong thing. The weighted mean moved mostly on regrades, so "flat" is misread as stalled and "rising" as progress; the keep rule (readers plus guards) is sound but its results are not what the notes report.
4. Rounds are the wrong unit of cost control. A round costs 9.5M when both plans run clean and 85M when a toolsmith and a code builder run; the budget needs to be per agent kind, not per round, and the Prepare phase needs its own.
5. Harness failures are still eating rounds: four silent run-plan deaths and one directory race since round 21, each costing an hour of Blender and in round 28 cascading into a 103-minute code builder. None raised an alarm; the loop went on as if the plan had been judged.
6. Blender time is the wall-clock floor: 45 to 135 minutes per plan, 20 to 57 minutes per full candidate. Building 11 to 13 variants when the quick ranking cannot distinguish them doubles the floor for nothing.

## 5. Ranked recommendations

Expected effects are against the rounds 21 to 28 average of 52M tokens and 3.7 hours per round.

### Remove or simplify

| # | Change | Evidence | Expected saving | Risk | Effort |
|---|---|---|---|---|---|
| 1 | Take toolsmiths out of the automatic loop. A method review may propose a tool; building it needs Nick's one-line go (or, failing that, a 20-minute smoke build plus reader check on a crop before any full session). Cap a toolsmith at one 80-call session until that check passes. | 243M (58%) in toolsmiths, zero kept orders on any tool built since round 20; the round 28 face tool was built, fixed and rechecked for a region not ordered. | 20 to 30M per round on average; up to 150M on a bad round. | A region waits a day for an answer. | Low: a flag in the Prepare phase and a note in the kickoff. |
| 2 | Remove `rejectToCode`. Keep the code builder only when the planner asks for it (`needsCode`). | 0 of 2 kept via rejection (34M, 149 min); 2 of 2 kept via `needsCode`. `rejectedAll` fires on one candidate at 2-1. | about 15M and an hour on each round it would have fired. | A genuinely broken tool is caught one round later by the stall park. | Trivial: `limits.rejectToCode: false`. |
| 3 | Park R02 and the fan pair (R03, R04) until Nick rules on the eye outline and the fur idiom, and remove the identity bonus and the audit reopen for regions at or above the pass bar unless pinned. Redirect the head slot to R01 (audit rank 8) and the body slot through R07, R05, R09. | 81% of tokens on two regions with no keeps; the productive regions cost 9 to 16M per keep. | Turns the average round into the round 24 shape (10M, 80 min). | The two biggest visible gaps wait; they are waiting anyway. | Trivial: `hold` on the regions in status.json, two constants in `priority`. |
| 4 | Drop the repair pass and the measured-tie keep. | Repair: 2 firings, 2 reverts on the same rubric line, 80 min of Blender. Measured tie: never fired. | 2 to 3M and 40 min on each face round. | None observed. | Trivial. |
| 5 | Stop building every variant. Apply `cap_blind` whenever the region's quick progress term is zero for every variant after the quick stage (not only when no criterion exists), with `top` 2. | r28 fan 13 built for 1 judged; r26 forepaw 11 built in 134 min for 3 judged; every face and fan variant scored zero progress. | 30 to 90 Blender minutes per plan. | A later variant the planner ranked low never gets built; the planner's order is already what decides when progress is zero. | Low: `recipe_plan.py execute`, after the quick scoring. |

### Bugs to fix

| # | Bug | Where | Effect |
|---|---|---|---|
| 6 | Parallel candidates collide on the assembly number (`FileExistsError`, two candidates both assigned `assembled-2834`). | `loop_tools.py next-number` as called from the candidate stage of `recipe_plan.py` | Lost 2 of 3 fan candidates in r28 and cascaded into a 103-minute code builder. Serialize the number under the existing slot lock, retry once on collision, and fail the plan loudly when a top candidate dies of a harness error. |
| 7 | The plateau stop cannot fire: `escalated` is a script-local variable and every batch is one workflow run; `plateauCountsKeeps` also lets zero-gain verdict keeps reset the window. | `loop_workflow.src.js` lines 705 and 954 to 965; `plateau` in `loop_core.js` | The loop has no working stop. Persist `escalated` in the state (merged by `loop_state.py`), and count a kept round in the window only when the keep moved a target criterion. |
| 8 | The round clock starts before the Prepare phase. | `loop_state.py args --start-clock`; `overTime()` in the workflow | Toolsmith time consumes the round budget (r28 would have skipped every optional stage before its first plan). Stamp a second clock at the Rounds phase from the first runner's `now`, give Prepare its own budget, and keep `startedAt` out of the hashed args. |
| 9 | `rejectedAll` on a single candidate. | `loop_workflow.src.js` `rejectedAll` | Require at least two judged candidates and `worse` with `better === 0` on every one (if the mechanism is kept at all; see 2). |
| 10 | A `None` face measure passes the guard, and `faceGuards` stays empty. | `face_measure.py`, `recipe_candidate.py` | A candidate with an unmeasurable eye reaches the readers unflagged. Report `measureFailed` and treat it as a guard break or at least as a logged warning. |
| 11 | Status notes misreport results (round 28: "face subdivision tool reader-passed 3-0"; it was rejected 3-0 twice). | orchestrator notes in `status.json`, the round 28 commit message | Generate the tool line of every note from `toolChecks` and the order lines from the round record; never hand-write a verdict. |
| 12 | The toolsmith session cap is advisory: a session ran 100 tool calls and 24M. | `toolPrompt`, no enforcement | Enforce with a turn limit in the agent options if the harness has one; otherwise count tool uses in the transcript at the session boundary and refuse a third session over budget. |
| 13 | Reader rankings are not persisted. | `recordEntry` | Add `out.readers` to the order entry so the record shows what the readers saw and chose. |
| 14 | A post-assembly step shifts every head vertex, so `regionShift` reports the whole head moved. | `region_shift.py` on post steps | Measure the shift against the baseline's own post-step output (or against the pre-post assembly) so the carry can apply to head regions on post-step candidates. |

### New enhancements

| # | Change | Evidence | Expected effect | Risk | Effort |
|---|---|---|---|---|---|
| 15 | A decision queue for Nick, written by the workflow, with one pack image per item: fired when (a) a method review proposes a tool, (b) three readers and the critic disagree twice on the same criterion, (c) a region's last three orders are reverted. The round continues without the region until answered. | The eye outline (4 rounds, 177M) and the fan idiom (3 methods, 164M) are both taste questions; the pin mechanism shows Nick does answer when asked. | Replaces the largest waste with a two-minute human step. | Nick's time. | Low: a `decisions.json` the kickoff and notes already have a slot for (`decisionsForNick`). |
| 16 | Decide keeps on readers plus measured and invariant guards; run the per-criterion critic only cold, every three rounds, for the score. | Every reader-preferred revert was a checklist loss on the target; the critic's pairwise is already overridden; critic cost is small but its grade is the blocker. The last audit's recommendation 4 was adopted only halfway. | More keeps per round from the same builds; the score becomes a periodic report, not the ratchet. | Drift across rounds; mitigated by the cold rescore and the measured guards. | Low in `judge`: a `limits.readerKeep` that skips the visual checklist comparison for the target. |
| 17 | Report progress as kept reader-preferred changes and target criteria newly passing, not the weighted mean. | 56% of the mean rise was regrade. | Nick sees what happened. | None. | Trivial in the recorder. |
| 18 | A tool smoke stage: before any full toolsmith session, a 15-minute build of the method on a crop or one component, a reader pack against the baseline, three readers. Only a `better` or `same` unlocks the full session. | 5 of 8 tool checks rejected after 50 to 130 minutes of building. | Catches a wrong idiom at 2M instead of 50M. | Some methods cannot be sketched small. | Medium: a `smoke` plan kind in `recipe_plan.py`. |
| 19 | Retry a dead plan once from its result file before declaring it failed, and alarm (stop the round, note to Nick) when a plan dies twice. | Four silent deaths, each an hour of Blender; r26 built 11 variants and lost them. | Saves the hour and the cascade. | None. | Low: `plan_job.py wait` on a failed exit. |
| 20 | Per-agent-kind budgets in `limits` (`toolsmithTokens`, `builderTokens`) enforced from the transcript at session boundaries, instead of a round clock. | Round cost ranges 9.5M to 168M on the same rules; the clock cannot see tokens. | Caps the worst rounds at about 25M. | Needs the harness to expose usage, or a post-session count from the journal. | Medium. |

## 6. What I could not verify

- Whether Nick saw the reader-versus-critic split on the face before pinning R02 in rounds 26 and 27; the record holds only the pin.
- The geometry evidence behind the round 25 drift claim (the forepaw candidate's `regionShift` was not recorded then); I accept it from the v3.9 note and the image diff described in the round 25 critique.
- Why the round 26 and 27 face plans died (no exit code was logged before the supervisor; the job json has no `exitCode`).
- The three agent minutes per round attributed to the recorder and the method reviews' reading of images; counts come from tool-use lines, which do not show what was read inside a Bash call.
- The reader packs I looked at are three (`assembled-2821`, `assembled-2783` and its reference panel); the rest of the reader reasoning is taken from the journal text.
- Whether the Blender numbering race is reproducible; it is inferred from the identical directory name in two candidates' failure messages and the `FileExistsError` in the log.

## Appendix: method

- Tokens: per `agent-*.jsonl`, assistant messages grouped by `message.id`, the largest usage per id, summed over input, output, cache read and cache write. Roles from the journal labels. Totals match `loop_costs.py` for each round.
- Wall time: first to last timestamp per agent; per round, first agent start to last agent end.
- Reader counting: the runner's `keys` and the pack `key.json` against each reader's `packs[].choice`, recomputed by hand for round 28 and spot-checked for rounds 22 to 27.
- Mechanism firing: journal labels (`regrade`, `repair`, `runner-up`, `tool check`, `method review`, `audit`), the round records' `regrade`, `repairRegrade`, `runnerUp`, `geoCarried`, `tie` and `skippedForTime` fields, and `status.json` `means`, `keptLog`, `tools`, `toolBlocked`.
- Plan builds: `plans/*-plan-result.json` (`variants[].built`, `top[].ok`, `wallMinutes`) and `*.job.log`.
- Scripts used for the counts live in the session scratchpad and are not committed; every number states its source so it can be reproduced.
