# Reclamation: the base redesign

Status: written 2026-09-09 from three days of discussion with Nick after the validation pass (PR #105). Tentative until Nick strikes or ratifies each line; the engine work proceeds behind rules flags and the simulator measures everything before any of it reaches the shipped table. This document supersedes the round, the acts, and the outcome rules in `reclamation-design.md`; when it ships, that rulebook is rewritten to match and this document becomes the record of why.

## Context

The validation pass measured the game as it stood: deploy decisions are real (no naive policy comes near the proctor), the match arc is sound (the third round changes the leader in half of all matches), and the Orders phase is the weak part: it changes the leader at 16 percent of sites, support acts measure inert, mend lands once in 200 matches, and in simple mode the phase is already a single Go button. Nick's fresh read: the phase's intent is unclear, a creature naming a target only works if the target is already on the board, cross-world attacks strain the Proving fiction, and sixteen act names with three cut lines are more rules than the game has decisions. The redesign collapses the round to Deploy, Resolve, Judge; locks each creature's act at send; seals the worlds; reduces the acts to two blows and two presences; replaces the outcome thresholds with subtraction; and moves fairness into the interpretation layer where the simulator can tune it.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | The round is Deploy, Resolve, Judge. Orders is removed; a creature's act is fixed when it is sent | 90% (Nick, 2026-09-08; orders changed the leader at 16 percent of sites; simple mode already played this way) | `reclamation-validation-report.md` section 2; `reclamation-design.md` "First numbers" item 5 |
| 2 | The player never names a target. Conduct picks the target from the board as it stands at Resolve, exactly as today | 95% (Nick: naming a target requires it on the board and would make send order a constraint; conduct is already derived, never authored) | `reclamation-design.md` "Conduct" |
| 3 | Worlds are sealed: only creatures standing at a world touch it. No cross-world reach of any kind | 85% (Nick, tentative 2026-09-09; the Proving makes each world a separate environment model; the census shows one creature in 290 with only projection acts) | act census 2026-09-09, 290 records, seed 7 |
| 4 | Every creature is a hold and one role: strike, area, bolster, or shield. Role by archetype: survivor, bulwark, stalwart, sage are presences (bolster or shield by their abilities and element); everyone else is a blow (area if the creature carries an area ability, else strike) | 80% (Nick: a creature has a blow or a presence, not both, for fairness and readability; about a quarter of the pool favors support) | census: 77 of 290 favor a support act; `expeditionInterpretation.FAVORED_ACT_BY_ARCHETYPE` |
| 5 | Blows subtract. A strike removes its magnitude from one enemy's hold at the world; an area removes a reduced magnitude from every creature at the world, both sides; a creature at zero or below is routed. No shrug, stagger or rout thresholds | 90% (Nick, 2026-09-09: the near-miss dead zone was the objection; the Court reads a number, so every point should count) | `expeditionInterpretation.STAGGER_FRACTION` and kin, to be retired |
| 6 | "Staggered" remains as the word for a creature hit and still standing; "routed" means driven to zero | 90% (vocabulary only) | this document |
| 7 | Shield cancels the largest blow declared against its side at its world, once per round, itself included; against an area it cancels the area's effect on its own side; each shielder cancels one blow | 80% (Nick rejected redirect as weak; cancel is worth the full magnitude, largest is readable, first is not) | discussion 2026-09-09 |
| 8 | Bolster lifts allies at its world, itself included, one grade of strain (severe to strained, strained to comfortable) and gives an ally already comfortable one hold; bolsters do not stack past one grade | 80% (Nick: never worth nothing, never overpowered; pack-bond is the precedent for one hold per ally) | `PACK_BOND_HOLD_BONUS_PER_KIN` |
| 9 | A stealthy creature may be sent hidden; a hidden creature's blow lands before all others at its world. Ambush is no longer an act | 85% (always-hidden won 42 percent against the proctor: hiding was nearly free and needed teeth) | `reclamation-validation-report.md` section 1 |
| 10 | Cut from the base to the lever pool: shove, terrorize, snare, drain, ambush as an act, hold as an act, cross-world projection, and the anchored trait | 85% (each fails the test "creates a send decision nothing else creates and is readable from the plinth") | this document, "The lever pool" |
| 11 | Fairness lives in the interpretation layer, never in the creature records: the species hold spread is compressed toward two to one (today near four to one), and the four roles are measured on one bar | 85% (Nick, 2026-09-09; the generator is game-agnostic by ruling; the draft table shows eight species always kept and seven never) | `reclamation-validation-report.md` section 5; `docs/design/xalian-creature-system-redesign.md` |
| 12 | Magnitudes are rescaled so a typical strike removes about a third of a typical hold: a rout usually takes two blows or one strong matchup; area removes less per creature than a strike | 70% (first guess; the simulator sets it against the routs-per-match and resolution-mattered gauges) | this document, "Measurement" |
| 13 | Presences apply from the moment the creature stands at the world and never depend on initiative; that is their compensation for having no blow | 85% (a slow striker can be routed before it blows; a presence cannot be) | discussion 2026-09-09 |
| 14 | Everything is presented as movement on one bar per world: one glyph per creature, one sentence per rule, and the preview shows every rule's effect before the send | 90% (Nick's presentation rule; the "told twice" principle already on the table) | `reclamation-design.md` "Interface principles" |
| 15 | The engine change ships as the engine's one rule set, with sub-lever flags (hold compression, magnitude scale, area discount, bolster floor, hidden-first) so the simulator can tune each; the old thresholds and Orders paths are removed, not flagged | 75% (keeping both round structures doubles every code path and test; the redesign is a replacement, not a variant) | `expeditionRules.DEFAULT_RULES` pattern from PR #105 |
| 16 | The Reclamation match is an immersive experience under design system v4 and needs its own approved brief before its visual rebuild; this pass adapts the existing table to the new rules with the smallest changes (Orders panel removed, role glyph on the plinth, arithmetic previews, resolve told per world) and leaves the v4 brief as the next step | 80% (friction: `DESIGN_SYSTEM.md` section 11 step 3 requires the brief; section 10 forbids adding to `reclamation.css`, which the adaptation cannot fully avoid) | `docs/DESIGN_SYSTEM.md` sections 1, 10, 11 |

## The base

**The round.** Deploy: handlers alternate; on your turn send one creature to one of the three worlds, or pass; a stealthy creature may be sent hidden; the starter's vanguard may fall back once, as today; pass is permanent; the trailing seat's bonus send and the Loki return are unchanged. Resolve: at each world, in initiative order with hidden blows first and strained creatures last, each blow subtracts from its conduct-chosen target; shields cancel; bolsters have already applied to holds. Judge: the Court awards each world to the side with the greater total hold standing there; ties revert to the Court; won, tied and lost worlds are handled as today.

**The creature on the table.** Hold: the number, from the record's vitality, resilience and endurance, compressed across the pool (assumption 11), multiplied by home ground and divided by strain, plus or minus company (pack-bonded, solitary), read on the bulb meter. Role, one of four:

- **Strike.** Removes its magnitude from one enemy at its world. Target by conduct.
- **Area.** Removes a reduced magnitude from every creature at its world, both sides.
- **Bolster.** Allies here suffer one grade less strain; a comfortable ally gains one hold.
- **Shield.** Cancels the largest blow against its side here, once per round.

Hidden: a stealthy creature sent hidden is unseen until Resolve and its blow lands first. Initiative: from reflex and agility, orders the blows at a world. Traits that remain: stealthy, armored (blows against it are reduced by a fraction), menacing (draws blows aimed at its side's weakest ally to itself), pack-bonded, solitary.

**Outcomes.** A blow moves hold by a number. A creature hit and standing is staggered. A creature at zero is routed: off the world, out of the Proving. Nothing else.

**Magnitude.** From the record's ability intensity and governing attribute as today, scaled by element matchup against the target, halved or quartered by the striker's own strain, and rescaled globally (assumption 12).

## The interpretation layer

All of the following live in `expeditionInterpretation.js` and `creatureOnTable.js`, are constants or rules flags, and are the only places fairness is tuned.

| Lever | First setting | Gauge |
|---|---|---|
| Hold compression: species mean hold spread | target 2:1 (hold = floor + (raw - poolMin) * scale) | draft keep rate per species 30 to 90 percent |
| Magnitude scale | a typical strike takes about a third of a typical hold | routs per match 3 to 5; resolution changes the leader at 25 to 40 percent of worlds |
| Area discount per creature | 0.6 of the strike magnitude | area creatures' keeper win rate in band |
| Shield | cancels one blow, the largest | shield creatures' keeper win rate in band |
| Bolster | one grade, plus one hold to comfortable allies | bolster creatures' keeper win rate in band; bolsterers not the top keep rate |
| Hidden first | on | always-hidden policy under 35 percent against the proctor |
| Armored | blows reduced by a quarter | armored win rate in band |

Fairness bands (from `game-validation-principles.md`): every species kept between 30 and 90 percent of the times dealt; every species and every archetype wins its world between 40 and 60 percent of the time; no naive policy above 30 percent against the proctor; matches decided after round 1 under 35 percent; comeback rate 30 to 40 percent.

## The lever pool

Cut from the base, each with the condition that brings it back:

- **Drain** (a strike that feeds the striker by half the loss): if blows measure too uniform, as a third blow kind.
- **Snare** (the target's blow does not land): if shields alone leave strikers too safe.
- **Terrorize** (the target withdraws to its handler's bench): if a removal that returns the creature is ever wanted; overlaps rout and snare today.
- **Shove**: no condition; cross-world movement contradicts the Proving.
- **Cross-world projection**: if sealed worlds measure as three disconnected games (option spread and decided-after-round-1 worsen), one area act that reaches one other world.
- **Anchored**: only with shove or terrorize.
- **Ambush as an act**: none; it is the hidden send now.
- **Advanced-mode act flip** (choosing among a creature's acts at send): if one blow per creature measures as too little expression.
- **Stagger as a status** (half hold at a threshold): none; subtraction covers it.

## Measurement

Run in `devtools/expeditionValidation.js` and `expeditionSimulator.js`, 200 matches per configuration, seed 7, before the table changes:

1. Baseline of the new base with first settings: the five validation sections and the simulator's balance report.
2. Fairness sweep: hold compression at 4:1 (none), 3:1, 2:1, 1.5:1 against the species keep-rate band and species site win rate.
3. Magnitude scale sweep against routs per match and resolution-mattered.
4. Role ablation: each of area, bolster, shield, hidden-first switched off, against the rival ladder and match shape, so each role is shown to carry weight.
5. Naive policies including always-hidden and a new always-presence-first policy.

Results are recorded in `reclamation-play-enhancements.md` under a dated "Base redesign" section and the settings that pass are written here as the ratified first settings.

## Interface consequences

For the adaptation pass (assumption 16), not the v4 brief:

- The Orders panel, the Go button, the orders coach step and the threat-read marks tied to acts are removed; the threat read becomes a number ("loses 6 to Voltish") on the figure and the plan line.
- The plinth shows one role glyph beside the hold bulb; the send preview on a world shows the hold after strain and bolster, the likely target and the number it would lose, and for a shield the blow it would cancel.
- Resolve is told per world, three short sequences, with the balance bar moving by each number.
- The report's routs figure stays; "sends spent" stays; the champion line stays.
- Simple mode and advanced mode differ only in how much of the arithmetic is printed; the decisions are the same.

## First measurements (2026-09-09, 200 matches, validation seed 7, simulator seed 11)

Built on branch feat/reclamation-base per the plan above. Settings chosen by the sweeps: `magnitudeScale` 1.1 (routs per match 3.9, the only scale where routs sit in band and resolution-mattered is highest below it), `holdFloor` 2.8 and `holdCeiling` 17.6 (species mean spread 1.95:1), `areaDiscount` 0.6, `armoredReduction` 0.25, `hiddenFirst` on, `shieldCap` 'half', `bolsterFloor` 1.

- **Decisions are real.** No naive policy is within five points of the proctor's 52.5 mirror reference: greedy 0, always-stack 0, never-contest 0.5, random 10, pass-early 17, always-hidden 42, always-presence-first 43.
- **Shape.** Option spread 5.5 near-best per decision, dominant on 15 percent; decided after round 1 at 47 percent (up from 40 under the old base; bar 35 unmet); comeback 29 (band 30 to 40, just under); third round changes the leader in 39.5 percent; resolution changes the leader at 20.5 percent of contested worlds (band 25 to 40 unmet, and unreachable at any magnitude that keeps routs in band); starter win rate 50.5.
- **Roles on one bar.** Keeper win rates: strike 60.9, area 58.6, shield 59.0, bolster 47.6; every role inside the band in the draft's own per-role reading (shield 49.1, strike 52.3, bolster 47.2, area 48.7). Shield 'none' measured 67.7 and 'ownHold' 63.7; 'half' was the only pricing inside the band. Bolster's floor at 1, 1.5 and 2 moved its win rate by 0.1 points: the bot sends fewer bolsters as each restores more, so the rate self-corrects. Bolster now measures inert by ablation, which is recorded as an open item: what a bolster does may need to change.
- **Ablation.** The trailing bonus is the heaviest rule; hidden sends, the Loki line, hidden-first, area and shield all carry weight; initiative and bolster move nothing measurable at 200 matches.
- **The draft.** Compression cannot move a hold-ordered ranking (all four compression settings left 21 of 29 species outside the keep band). Rating by hold plus role value brought it to 18 of 29 and moved psychic out of dead content; a species cap of two and a one-of-each-role floor changed 16 keeps in 200 and moved nothing. A rating-ordered keep of twelve from eighteen always cuts the bottom third, and rating is species-determined, so the band is unreachable by this kind of draft. Recorded as an open item with three levers.
- **Friction recorded by the engine pass.** The species mean spread was 2.6:1 before compression, not 4:1. An area does not catch its own caster. A hidden bolsterer does not bolster until revealed. Resilient and anchored read nothing. The bot prices conduct targets by a compact reading of the conduct lines rather than the engine's full pick.

## Open items

- Whether menacing should merge into shield (a weaker cousin that draws rather than cancels).
- Whether a bolsterer's own hold should count the grade lift (assumed yes: "itself included").
- The v4 immersive brief for the match, after this pass.
