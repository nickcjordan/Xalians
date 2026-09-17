# Paper dungeon 01: The Discharge Trial

Current revised fixture: [The Dormant Powerworks](../paper-dungeon-02/README.md). This first version is retained as a historical experiment.

> **Design update, 2026-09-16:** The accepted game uses exclusively dedicated, noncollectible enemies. The collectible opponents and tournament framing below are superseded test placeholders, with no story exceptions planned. This guide and its generated transcripts preserve the earlier timing/arithmetic experiment; they have not yet been adapted or validated for the new enemy roster. Player creature rules do not automatically constrain dedicated enemy movesets or boss action budgets. Replace the enemy identities, cards, and framing before treating this as the next playable design.

Status: playable discussion fixture, 2026-09-15. No production implementation or new canon. Working title only. Designed for Nick's Dungeon Boss-inspired squad battler, not existing Duel or Reclamation.

## What this tests

Four Xalians enter three teaching encounters and a boss encounter. The player learns that restraint stops approach-dependent attacks, projection still works while restrained, a visible charge precedes a dangerous attack, and elemental matchups affect target choice. Health and knockouts persist; move uses refresh each encounter. A healer is not required.

Proposed fiction: a staged tournament trial on Valleron using visiting creatures, avoiding the claim that this mixed roster naturally inhabits one biome. No new faction, historical event, or permanent creature transformation is asserted. The same mechanical sequence can later receive another approved setting.

Expected session length is a hypothesis: about 15–25 minutes on paper once the cards are understood. Measure this with a person; the calculator does not establish pacing.

## Materials and boundaries

Use four player cards, enemy cards, HP counters, four move-use counters per creature, Snare/Ward/Charge markers, and a hidden enemy-order sheet. A facilitator manages enemies. The provided transcripts are facilitator answer keys, not player-visible previews.

The species, elemental identities, signature names and signature descriptions come from current `docs/species-templates/<species>.json`. All individual HP/speed/damage numbers, secondary labels, move selection, range categories and effects below are **hand-authored paper proxies**, not generated registered individuals. Canonical records are untouched. The forthcoming moveset/range model is expected to replace these proxies. In particular, this fixture uses THREE secondary moves plus a signature consistently; it does not select the final game-wide count.

The current primary-element effectiveness matrix is used without multiplying secondary affinities: `packages/content/json/typeEffectivenessMatrix.json`. Traits, progression bonuses, defense stats, perks, secondary affinities, critical hits, misses and damage variance are omitted to isolate the battle loop. These omissions are not permanent design decisions. No universal healing or buff is added.

## Rules sufficient to play

1. Randomly order each side's row once at encounter setup; retain those positions until the encounter ends. Position has no targeting, range, damage or initiative benefit.
2. Every secondary move starts with **three uses**; every signature with **one**. Each standing creature gets one action opportunity per round. Health carries forward; uses reset only between encounters, not during boss phases or reinforcements.
3. The facilitator secretly commits all enemy orders from the current state. The player chooses a move and target for each standing creature and can revise before committing. Do not reveal future enemy orders. HP, move rules, displayed speed, and already-applied statuses are inspectable for this exercise; first-time move-discovery UI remains a later question.
4. Resolve all actions in descending speed. For ties, sort participating creature IDs alphabetically and rotate that tie-priority list by one position each new round. This temporary side-neutral tie rule is unrelated to visual row order. No priority moves or mid-round speed effects are included.
5. An attack deals `floor(base damage × attacker's primary element matchup × ward factor)`. Ward factor is 0.5 while active, otherwise 1. No separate defense subtraction. Every secondary in these proxy cards uses its creature's primary element, including physical attacks.
6. Ordinary damage and offensive signatures can target any living enemy; no distance or frontline rules apply. Snare and Ward use their explicit effects instead of multiplying a damage value. Snare has no elemental application resistance in this isolated test.
7. If an intended offensive target was knocked out, redirect the SAME move to the next living legal enemy to its right in the fixed row, wrapping at the end. Resistance or zero damage does not invalidate a target. Use the move and spend its allowance even if retargeting makes it ineffective.
8. A creature knocked out before its opportunity cannot act. End combat immediately when one side has no standing creatures; remaining orders are not spent. When both sides are gone, treat it as a failed attempt; no mutual-KO effect exists in this fixture.
9. **Snare:** block melee actions through the target's next action opportunity. If already acted, affect its next round's opportunity. A legal ranged action still works and consumes the Snare opportunity. A blocked ordinary move spends no use. New Snare applications refresh to one opportunity, never add durations. Consecutive reapplication protection remains unmodeled and requires separate tests.
10. **Ward:** Scalatto protects itself; halve incoming damage from execution until the beginning of its next opportunity. Ward is self-only and can execute while snared. It does not guard allies or imply all Ward signatures behave identically.
11. **Voltish charge:** its signature is a two-opportunity attack for this fixture. Beginning the charge spends the signature use, occupies the first opportunity, and creates a visible Charge marker. The selected enemy target remains hidden and is retained. On its next opportunity the release must execute against that target, with normal retargeting if necessary. If Snare blocks the release, the charge dissipates; the previously spent use stays spent. If Snare prevents beginning the charge, no use is spent. No ordinary move can replace a pending release. This is a provisional cast/payment rule specific to this test, not an approved rule for all signatures.
12. An actor with no legal selected move waits. **Waiting is only a paper-fixture fallback**, not acceptance of the final all-moves-exhausted rule. After 20 rounds, stop and record an unresolved/stalled encounter as a failed fixture run; this cap is a diagnostic, not a player-facing timer.

## Player cards

All three secondaries have three uses each. M = approach-dependent melee; R = ranged. Labels describe the proposed action rather than adding names to the canonical move catalog.

| ID / species | Element | HP | Speed | Secondary 1 | Secondary 2 | Secondary 3 | Signature, one use |
|---|---|---:|---:|---|---|---|---|
| G / Graviclaw | Dark | 64 | 40 | Pincer strike: 8 M | Claw compression: 10 M | Shell shove: 6 M | Point of No Return: Snare, R |
| A / Avilily | Plant | 38 | 80 | Beak strike: 6 M | Talon rake: 8 M | Saliva spray: 5 R | Blossoming Ambuscade: Snare, M |
| C / Crystorn | Light | 56 | 35 | Horn beam: 8 R | Fist strike: 7 M | Light spray: 6 R | Coronet of the Twin Suns: 16 R |
| H / Hippochamp | Water | 56 | 55 | Water stream: 8 R | Hoof strike: 7 M | Tail lash: 6 M | Hydrostatic Lance: 16 R |

Graviclaw's slow control is not interchangeable with Avilily's fast control. Avilily is fragile and its own snare requires approach, while Graviclaw's projection remains available when restrained. These range interpretations are paper assumptions to verify against the new schema. A shove is simplified to damage here; this does not settle the full action grammar.

## Enemy cards

Enemy Avilily and Crystorn use the same move/speed cards as above, with encounter HP shown below. Other cards:

| Species | Element | Speed | Secondary 1 | Secondary 2 | Secondary 3 | Signature |
|---|---|---:|---|---|---|---|
| Drilltail | Sand | 70 | Pincer cut: 7 M | Tail thrust: 6 M | Claw compression: 5 M | Wildcatter Auger: 12 M |
| Scalatto | Sand | 45 | Claw rake: 7 M | Tail lash: 6 M | Shell shove: 5 M | Duricrust Rolling Guard: self Ward |
| Voltish | Electric | 65 | Claw strike: 8 M | Jaw crush: 7 M | Tail lash: 6 M | Stormbank Discharge: charge, then 22 M |

The champion is a Voltish with a **scenario HP of 100**. Its underlying species/record is not edited, and it does not gain a second signature use. Its ordinary move damage and speed remain the same as the earlier Voltish.

Relevant matchups for these cards:

| Attacking element | Dark | Plant | Light | Water | Sand | Electric |
|---|---:|---:|---:|---:|---:|---:|
| Dark | 0.5 | 0 | 2 | 1 | 1 | 1 |
| Plant | 0.5 | 1 | 1.5 | 2 | 1.5 | 1 |
| Light | 2 | 1 | 0.5 | 1 | 0.5 | 1 |
| Water | 1 | 0.5 | 1 | 1 | 1.5 | 0.5 |
| Sand | 1 | 1 | 1 | 0.5 | 1 | 1.5 |
| Electric | 1.5 | 0.5 | 1 | 2 | 0 | 1 |

The checked source matrix wins if this copied reference disagrees. No secondary affinity or same-element attack bonus is added.

## Hidden enemy decisions

First obey a pending charged release. Otherwise list moves with uses remaining that are legal under the current visible state. Give each secondary weight 2 and an available signature weight 4 (Voltish signature weight 5). Draw one move using those weights, renormalizing over remaining choices. Select a target uniformly among standing enemies before player-plan disclosure. Ward targets self; no secret optimal targeting.

For a physical weighted draw, write each eligible secondary twice and the signature four/five times on slips and draw one, replacing slips before each new decision. Target slips contain each living target once. Use the supplied seeded transcript instead if repeatability is desired.

**Teaching exceptions:** enemy A2 and C2 select their signatures on the first round of encounter 2. V3 begins its charge on the first round of encounter 3. Targets remain random. Later choices and the boss remain weighted. These authored openings ensure the dungeon actually exposes its required lessons rather than hoping random rolls show them. They are behavior rules to discover, not an intent preview. A skilled alternative crew may kill a teaching enemy before it demonstrates its move; the boss must still be understandable from visible states and accessible move descriptions.

## The four encounters

| Encounter | Enemy roster / HP | Main lesson | Reward on victory |
|---|---|---|---|
| 1. Shell and claw | D1 Drilltail 22; S1 Scalatto 30 | Restraint can interrupt a fast melee threat if your source is faster; a shell protects only its owner; retargeting preserves the move | 10 paper XP per participating creature |
| 2. Restraint and projection | A2 Avilily 20; C2 Crystorn 54 | Snare is not stun: ranged attacks still execute. Dark offense is strong against Light, while Light endangers Graviclaw | 10 paper XP per participating creature |
| 3. Stored charge | V3 Voltish 48; D3 Drilltail 22 | Visible charge means danger on the next opportunity. Spending fast restraint on the lesser threat may leave no timely answer | 10 paper XP per participating creature |
| 4. The discharge champion | B4 Voltish 100; C4 Crystorn 30; S4 Scalatto 28 | Combine target priority, fast restraint timing, typing, self-ward and move-use management | 30 paper XP per participating creature; first-clear token marker for introductory reward discussion |

Paper XP and token markers are bookkeeping only: no live rewards, chosen economy, levels or perk unlocks. Award completed-encounter XP equally to the four starting participants, including knocked-out participants, for this fixture. No rewards from an unfinished encounter. A complete run is 60 paper XP each. Repeated paper attempts cannot issue actual tokens; the real first-win entitlement remains #298.

Between battles retain HP and knockouts. Once per dungeon, the player may revive one knocked-out creature at half maximum HP rounded up. Only between encounters; it cannot rescue a full-party loss. Before the boss, a single authored recovery station restores **10 HP to each standing creature**, capped at maximum. It neither revives nor creates a creature healing ability. The scripted run revives immediately after an encounter when available; a human may save it. These recovery amounts are temporary knobs, not approved canon or final tuning.

The player may retreat between encounters and keep completed-encounter paper XP, forfeiting unearned rewards. A fresh attempt restores the full crew and all allowances. The fixture does not grant a reward merely for changing its seed.

## One complete run: seed 1

Full orders and arithmetic: [sample-run.md](sample-run.md). Enemy orders printed there are facilitator-only. This is a scripted example, not an optimal-play claim.

1. Avilily restrains Drilltail before its attack, and Hippochamp defeats it. Graviclaw and Crystorn redirect their committed moves into Scalatto's self-ward. Crystorn's signature deals only **4** damage there: 16 × Light-versus-Sand 0.5 × Ward 0.5. The cost of overcommitting is visible without wasting a whole action.
2. Enemy Avilily restrains Crystorn, but Crystorn's ranged signature still executes. Enemy Crystorn survives long enough to hit Avilily. The player wins with Avilily at **15/38 HP**; victory does not reset that loss.
3. The player uses Avilily's only signature to stop Drilltail. Voltish spends its action charging. On the next round its release is faster than Graviclaw, and Avilily has no signature use left. Voltish hits Graviclaw for **33**; Graviclaw ends at **29/64 HP**. The player wins, but learns a resource/timing lesson to use at the boss.
4. After the recovery station, the player saves Avilily's signature. When the boss visibly charges, Avilily can restrain it before its next release. The other creatures remove the companions and damage the boss. By round 5, several favorite attacks are exhausted, forcing different secondary selections. The squad wins with **G 39, A 18, C 45, H 56 HP**.

| Checkpoint | G | A | C | H |
|---|---:|---:|---:|---:|
| Start | 64 | 38 | 56 | 56 |
| After encounter 1 | 64 | 31 | 56 | 56 |
| After encounter 2 | 62 | 15 | 56 | 56 |
| After encounter 3 | 29 | 15 | 56 | 56 |
| After pre-boss recovery | 39 | 25 | 56 | 56 |
| After boss | 39 | 18 | 45 | 56 |

## A less fortunate run

[adverse-run.md](adverse-run.md), seed 140, uses the same player policy with different enemy moves/targets and rows. Hippochamp reaches encounter 3 at 40 HP. The charged Electric attack hits it for 44, knocking it out. The run spends its one between-battle revival, returning Hippochamp at 28 HP; the station then raises it to 38. Hippochamp is knocked out again during the boss fight. The remaining crew still finishes. This demonstrates a recoverable setback in one case, not protection against every possible unlucky sequence.

## Arithmetic and preliminary validation

Run `node docs/design/paper-dungeon-01/simulate.mjs` from the repository root. It regenerates both transcripts and [results.json](results.json), checks signature names against current templates, uses the committed type matrix, checks uniform card counts and selected Snare legality, and asserts that allowances never go negative. No dependencies, production state, or network calls are required.

Final fixture, seeds 1–200:

| Policy | Completed runs | Runs with a player knockout | Unfinished at diagnostic 20-round limit |
|---|---:|---:|---:|
| Simple visible-state planner | 200/200 | 58/200 | 0 |
| First-available-secondary / first-living-target policy | 168/200 | 168/200 | 17 |

The second policy changes targeting AND ability use and ignores signatures. It is deliberately weak; this comparison does not isolate the contribution of move caps or prove strategic depth. Random streams may diverge after policies change game state, so equal initial seeds are not identical enemy histories. These are descriptive results from one roster and two policies, not population success estimates, human playtests, or proof of fun. Passing reference runs are intentionally approachable for a first teaching dungeon. A 100% scripted success rate cannot establish the ideal difficulty.

## Findings to carry into the next iteration

- **A real timing decision appeared:** fast restraint can answer visible charge; slow restraint cannot always do so. Spending Avilily's signature in encounter 3 mattered.
- **A real retarget cost appeared:** the same signature can lose most of its value after redirecting into the wrong type and a ward.
- **Move limits caused variety in the five-round boss:** several secondaries exhausted before victory. Short fights did not artificially force rotation.
- **Teaching requires authored safeguards:** the first iteration let randomness or low HP hide essential demonstrations. This version uses authored teaching openings and raises C2's HP. That is evidence for the dungeon grammar, not a universal ban on random behavior.
- **The boss loses its main threat after the interrupted signature.** Its remaining rounds may feel like cleanup. A second tactically distinct phase using existing legal actions is a candidate to evaluate with Nick; do not silently grant more signature uses.
- **Graviclaw's signature goes unused by the simple planner.** It has value only with anticipation or a different situation in this fixture. Add a test that rewards slow restraint without penalizing a crew that lacks it; do not conclude the species or signature is weak globally.
- **Some ordinary moves differ mainly in damage.** Charge caps alone create forced rotation, but meaningful secondary differences depend on the coming schema/game mapping. This is not yet a finished moveset design.
- **All-moves exhaustion is unresolved.** The weak policy reaches stalled states. The calculator's wait and round-limit rules are diagnostic placeholders, not satisfactory shipping behavior.
- **Healing/revival balance, alternate rosters, perks and growth remain untested.** No rare healer is required by this sample; that does not validate every starter squad.

Tracked follow-up: #299 for schema integration; #300 for timing, exhausted moves, recovery, control chains and balance; #301 for content grammar/teaching and alternative roster validation; #298 for rewards. Do not mark those issues complete on the basis of this fixture.

## First facilitated session

Give the player only the rules, their cards, matchup reference and encounter 1's visible opponents. Keep future encounters and hidden orders behind the facilitator screen. Let the player choose the entire first round, then resolve it using their choices (the transcript is an example, not a railroad). Record which decisions were confusing, which move they expected to work, when they first understood restraint versus projection, and whether the boss felt tense after its signature was interrupted. Pause between encounters to inspect the crew and choose whether to use the revival. Do not change numbers mid-run; note a revision for the next attempt.
