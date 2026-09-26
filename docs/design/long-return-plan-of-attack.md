# Long Return: plan of attack

September 25, 2026. The output of the discovery pass and five local experiments. Nick authorized continued experimentation without repeated check-ins. The priorities below are recommendations grounded in implementation and playthrough evidence, not a claim that Nick has accepted every proposed design detail.

## The problem we are solving

Long Return invites the player to explore a place with a distinctive crew, but much of its interaction asks the player to manage the cost of getting through it. Nick confirmed that the planning process interrupts the curiosity created by a scene.

The conflict exists at three levels:

1. **Presentation:** the situation becomes a table of costs, then a separate assignment process. The player has to translate an intention into a plan.
2. **Continuity:** delivered information and resolved encounters are followed by renewed preparation or acknowledgement. The story repeatedly yields to the workflow.
3. **Adventure structure:** most crossings succeed, with scores determining their price. Routes often grant fixed salvage and their assigned consequence regardless of execution quality. Later rooms offer different work but largely the same following events. The rules therefore give resource optimization more influence than the desired adventure experience calls for.

Converging destinations are not the problem. Losing meaningful differences in what happens before and after that convergence is the problem to address.

## What to preserve

- The shared schematic, honest crew positions, and preview-versus-commit distinction.
- Route-specific physical action accounts, with player-controlled reading and explicit continuation.
- The opening's quiet-entry and draining-bypass consequences, including their next-room acknowledgement.
- Creature-specific ways of perceiving, communicating, moving, and helping. Calling a medic versus returning for one is a particularly useful existing example.
- Internal numerical distinctions and optional detailed analysis. They remain useful for resolving effort without leading every decision.
- Multiple valid approaches to a common expedition goal, plus the option to leave with the objective rather than pursue every recovery.

## Experiment assessment

| Experiment | What was tested | What the evidence establishes | What it does not establish |
| --- | --- | --- | --- |
| Opening creature actions | Keep route, creature, and method in one scene, with in-place changes and one commitment | Same mechanics can work without a separate lead-selection page; preview, costs, command use, and next-room consequence survive | Which card layout Nick prefers, or whether every later scene should use identical controls |
| Encounter continuation | Continue an interrupted crossing after resolving the encounter | Renewed assignment is avoidable; movement can resume at the encounter location instead of replaying the approach | That every encounter needs fewer story beats |
| Intermittent service signal | Sample an optional discovery once per run, then carry its knowledge forward and through resume | A repeat can offer a different event with an actual information consequence; a random cost penalty is unnecessary | Rich replayability. One intermittent panel is still one small variation, and its extra button can itself become a chore |
| Story-centered encounter responses | Lead with what the crew does and why; show cost details on request; remove the recommendation badge | Existing choices support intention-first presentation without changing their rules; companion help remains explainable after the story payoff | A balanced dilemma. Aid is still often mechanically better; removing a badge does not change that |
| Delivered scout report handoff | Continue from the completed scouting account directly to decisions | A second report acknowledgement is unnecessary once the knowledge has actually arrived | That scouting should always be automatic. Out-of-contact return and unresolved encounters still have distinct consequences |

The experiments changed working code and were checked against the existing baseline, integration tests, and live browser play. Behavioral verification is separate from subjective enjoyment. No additional user response is needed to finish this discovery phase or prepare the implementation sequence.

## Priority 1: establish one continuous adventure flow

Use the opening and Xylum sequence as the reference, then carry the interaction principles across the mission. Do not simply copy the opening's labels onto every room.

The ordinary sequence should be: understand the place, optionally investigate, choose a creature action, experience it, see what changed, continue. A delivered scout account should connect to the decision it informs. An encounter should return the crew to the work it interrupted. A new decision is justified when the situation materially changes, not because a UI phase needs acknowledgement.

Handle three categories explicitly: choosing between physical paths, choosing how to operate one obstacle, and deciding whether to continue an optional recovery. The archive door's two interventions must not become two invented corridors. The Index's extraction decision must retain its own meaning.

Completion evidence: traverse the full mission with no accidental return to completed preparation; every committed action names its actor and intent; the map never resets the crew to an earlier position; relevant consequences and catastrophic warnings remain accessible on short phones. Keep the comparison flow available during this work.

## Priority 2: make creature differences understandable before arithmetic

The next design work should improve the explanations of what an approach means, including scouting. The opening's scout recommendation currently favors immediate reporting: Graviclaw can relay remotely but does not detect the authored brine through its configured senses; Hippochamp can detect it through electroreception but needs a return trip. The ranking rewards immediate revealed information and penalizes undelivered information. That can favor convenient reporting over useful discovery.

Do not replace this with a universal best-scout score. Explain senses, communication, and physical risk as different reasons to choose a creature. Do not disclose the presence of an undiscovered hazard to make a choice easier. The player can know what a creature is good at investigating without knowing what is actually there.

For crossing actions, preserve why swimming, towing, bracing, climbing, or working controls differ. Avoid replacing raw numbers with vague good/bad rankings that invite exactly the same optimization.

Completion evidence: a player can describe why a creature could try an approach without opening arithmetic. Every available approach corresponds to existing supported creature facts. No creature editing or platform integration is needed.

## Priority 3: author outcomes that change the adventure

This is the largest structural need. A numerical quality tier should not only change energy, stability, and the adjectives in a successful crossing. Build a representative sequence in which an approach changes a discovery, interaction, or later opportunity while still reaching the common destination.

Use authored, conditional events rather than a giant branching tree. For each event, record its physical situation, what the crew can know, which supported creature actions apply, what becomes different, and where that difference is acknowledged later. Track differences separately as knowledge, relationships, available actions, environment, and resources. A resource difference can support another difference but should not be the only reusable output.

Start with the existing first three rooms because the bypass, stranded Xylum, maintenance codes, and authentication rig already connect them. Establish a convincing short chain before producing a large catalog. Every newly authored event needs a concrete payoff; dozens of interchangeable cost events would inflate the count without meeting the goal.

Completion evidence: two contrasting runs reach the same archive door but have recognizably different accounts and at least one different later interaction or opportunity. Differences must be visible in play, not merely stored in flags or the journal. This is a proposed quality criterion, not an exact permanent reward rule.

## Priority 4: add variation to circumstances, then test its fairness

The service signal proves the plumbing for one sampled circumstance. Extend that principle only after the authored sequence in Priority 3 is strong enough to vary.

Sample which relevant circumstance is present and persist it with the expedition. Let creature choices affect how that circumstance is perceived or handled. Preserve causality: a surprise should make sense once encountered, and a known consequence must remain trustworthy. Reloading must not reroll an already established circumstance.

Do not make every repeated action randomly fail, and do not create variety solely by charging an unpredictable additional fee. Repetition can differ because a contact needs different help, machinery presents a different problem, or information reveals another opportunity, subject to authored lore and supported creature capabilities.

Completion evidence: identical initial action choices can encounter different authored circumstances across fresh runs, while a resumed run preserves its circumstances. Avoid presenting a combinatorial route count as a count of satisfying adventures.

## Priority 5: tune expedition pacing against the richer content

Keep numerical tuning after the content experiment. At present, low reserves and annex stability can force extraction, and field work converts salvage into recovery. Those pressures can make every interesting detour feel like a mistake, even when the interface invites curiosity.

Compare a curious route, a cautious route, and a familiar repeated route. Record where the player made an interesting choice, where the game merely charged upkeep, and where a resource warning meaningfully changed an intention. Inspect the Index payoff and optional deeper recovery separately. Do not invent permanent reward thresholds or remove resource tension wholesale.

Completion evidence: choosing to explore can produce an interesting, understandable expedition outcome; optional recovery still creates a reason to consider leaving; the conclusion recalls consequential experiences rather than only the haul total.

## Order and scope

Priorities 1 and 2 make the existing content easier to experience. Priorities 3 and 4 supply the adventure variety that presentation alone cannot create. Priority 5 tunes the complete experience. Finishing all five is broader game-development work, not a claim made by this discovery pass.

The discovery phase is complete when the worked comparisons, bounded experiments, assessed results, preservation list, and implementation order are recorded and technically verified. Nick subsequently clarified that the authorized work continues into implementation and verification of these priorities. Do not use discovery completion as a stopping condition. The current implementation evidence and completion criteria live in `long-return-active-work.md`.

## Implementation follow-through, September 25

The creature-action flow now covers the mission, with context-specific headings for the archive door and recovery objectives. Scout choices describe perception and communication in crew order. A second possible service signal supplies an authentication release instruction; collecting the underdeck code completes it and unlocks a different rescue at the archive rig. The signal variant and learned instruction persist through checkpoint resume. Encounter accounts are retained with crossings in the journal.

Further play-led work added creature portraits with separate technique selection, an archive-to-reservoir control circuit consequence, a saved alternate beacon encounter, physical invitations into the optional depths, and an ending that remembers actual expedition events. Two live expeditions covered successful deep recovery with the preserved circuit and a contrasting blackbox expedition forced out at the reservoir. The latter also visually exercised the beacon encounter and exposed a misleading fallback door-action label, which was corrected. Phone ending overflow was fixed after checking the complete report.

Pacing checks retain both successful deep recovery and a blind expedition forced out after securing the Index. No resource retuning was justified by this comparison. The implementation preserves exploration risk, optional extraction, hidden discoveries, and numerical detail on request. See the active work record for test and browser evidence and the remaining limits of this representative content set.

See `long-return-discovery-pass.md` for the detailed source trace, mission variation map, and verification history.
