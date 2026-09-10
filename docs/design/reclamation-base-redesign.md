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

## Pass 2: every attribute a job (2026-09-09, Nick's rulings after the first measurements)

Nick's rulings on the first measurements: the game will not safeguard a player who is swept, so the decided-after-round-1 gauge is dropped and the widening frame is not pursued; kinship is not wanted; light sends are held in reserve; the catch-up send is cut as a gift to the losing side ("a participation trophy"), with comeback avenues to be chosen risks instead; speed need not equal power, but the creature's other properties should balance out; the vocabulary below is adopted; the sequence of attacks stays.

**Why creatures read as weak.** The engine read five of the record's ten attributes (vitality, resilience, endurance for hold; agility, reflex for speed) and none of the seven capabilities. A creature built on the unread half was weak by construction. This pass gives every attribute one job:

| Attribute | Job | Rule |
|---|---|---|
| vitality, resilience, endurance | hold | unchanged |
| strength | attack power of contact attacks | the governing attribute for strike-class abilities |
| intelligence | attack power of projected and mind attacks | the governing attribute for beam, burst and the mind abilities |
| agility, reflex | speed: who hits first; swift creatures may move once | `swiftSpeed` threshold; replaces the vanguard fall-back |
| willpower | holds against the world: one grade less strain above `willfulThreshold` | applied before bolster; does not stack with it past comfortable |
| charisma | presence strength: bolster restores and shields cancel scaled by charisma | `presenceScale(charisma)` around 1.0 at 50 |
| instinct | targeting: above `keenInstinct` the creature picks the enemy it can down, else the one it hurts most; below `dullInstinct` it hits the enemy sent earliest; between, the archetype's line as today | refines conduct |

Also in this pass: **a hurt creature attacks for less**, in proportion to the hold it has left (assumption 18), so hitting first shapes every exchange; **bolster recovers damage**: at the ruling, allies at a bolster's world recover half of what attacks took (assumption 19); **the catch-up send is removed** (`trailingBonus` 0) and the Loki return stays; **the vanguard fall-back is replaced by swift creatures moving** (assumption 20).

**Vocabulary** (table-facing; engine identifiers follow where they reach the public state): initiative becomes speed; rout becomes downed; staggered becomes hurt; blow and magnitude become attack and power; the area role becomes sweep; conduct becomes instinct; Resolve becomes Clash; Judge becomes Ruling; the trailing bonus is gone.

**Comeback avenues to test after this pass** (chosen risks, never gifts): the stake, where either handler once per Proving may stake one world of the coming round so that it counts two toward the Charter for whoever holds it; a random draw is available if Nick wants chance back on the table, and it has been out by ruling so far.

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 17 | Every attribute gets one job, per the table above; capabilities stay unread for now | 75% (Nick, 2026-09-09: balance the properties rather than make speed equal power; first mapping to test) | `xalian-creature-system-redesign.md` assumption 10 (the ten attributes) |
| 18 | A hurt creature attacks for less, in proportion to the hold it has left | 70% (speed measured inert; sequencing kept by Nick's ruling; this is what gives it a point) | first measurements: initiative moved nothing by ablation |
| 19 | Bolster recovers half the damage its allies took, at the ruling, in addition to the strain grade | 75% (bolster measured inert; strain relief is only more hold, recovery is the one thing hold cannot do) | first measurements: bolster ablation and the floor sweep |
| 20 | The catch-up send is cut; the vanguard fall-back becomes "swift creatures may move once" | 85% (Nick: no gifts to the losing side; a rule the player could not see a reason for becomes a property of speed) | this pass |

### Pass 2 measurements (2026-09-09, 200 matches, validation seed 7, simulator seed 11)

Settings: `swiftSpeed` 65 (sweep 65/75/85: 4.7, 2.5 and 0.8 moves a match; 85 falls under one move a match; starter win rates all within one interval, so the pick is on frequency), `bolsterRecovery` 0.5 (sweep 0.5/0.75/1.0: every setting keeps bolster in band, but 0.75 drops the presence-first policy to seven points under the mirror and 1.0 to four and a half, so 0.5 is the largest value that clears the eight-point bar), `willfulThreshold` 65, `keenInstinct` 65, `dullInstinct` 35, presence scale 0.5 plus charisma over 100, `trailingBonus` 0, `hurtAttacksLess` on. Hurl is governed by intelligence with the other projected attacks (the pass brief had it under strength).

- **Decisions.** Proctor mirror 51.0; greedy 0, always-stack 0, never-contest 1, random 12.5, pass-early 16, presence-first 41. **Always-hidden 46.5, four and a half points under the mirror, fails the eight-point bar.** The first pass's ten-point gap was seed luck: on four seeds hiding sits within a few points of the mirror under both hurl settings. Hidden-first plus hurt-attacks-for-less is a strong pair (the hidden creature lands first and unhurt; every reply is already scaled down). Hiding needs a price: a hidden send costing more against the cap, or the hidden creature's first attack losing hidden-first when it is the only attacker. Next pass.
- **Shape.** Spread 5.7 near-best, dominant on 14 percent; downs per match 3.1; resolution changes the leader at 19.8 percent (band 25 to 40, still unmet); comeback 27 (band 30 to 40 unmet; the ablation row that restores the catch-up send reads 30.4 and decided-after-round-1 36 against 47, which is the evidence that a chosen-risk comeback avenue is needed soon); starter win rate 45.
- **Roles on one bar**, both readings: shield 48.3, strike 53.0, bolster 46.6, sweep 49.3 keeper win rate in the draft; 50.2 to 58.5 in the simulator. Keep rates: presences are kept 87 percent of the time, strikes 53, sweeps 65.
- **Species.** 17 of 29 outside the keep band (from 21 by hold alone); five dead (avilily, akinza, dromeus, imprit, chromocat); fire the one dead element; every species' keeper win rate inside 40 to 60 (crystorn 41.8 to chromocat 60.0). The draft band remains a draft-shape problem.
- **Lanes** (top quartile minus bottom quartile site win rate): strength +9.1, instinct +7.4, resilience +6.5, endurance +5.8, vitality +3.3 carry weight; agility, reflex and willpower do not resolve at 200 matches; intelligence (-5.2) and charisma (-7.4) read negative because they are high on the roles that win worlds less (sweeps and presences), so those two lanes measure the role, not the attribute. A per-role split of the lane reading is the next refinement.
- **Ablation.** Carrying weight: hidden sends, the Loki line, speed order (envoy moves), hidden-first, sweep, bolster (the role, now the second-heaviest rule: broker falls from 44 to 33.5 without it), shield, hurt-attacks-for-less (downs 3.65 without it), willful, the swift move (envoy 38 to 32, downs 3.6, the heaviest new rule). Not measurable at 200 matches: bolster recovery, presence scale, instinct lanes. Each of those three fixes a legibility problem the ablation cannot see (a bolster that does something at every contested world; presences that differ by creature; targeting that follows a stat the player can read), and recovery cannot be raised into measurability without breaking the presence-first gauge, so all three stay as they are, recorded as levers.

## Open items

- Whether menacing should merge into shield (a weaker cousin that draws rather than cancels).
- Whether a bolsterer's own hold should count the grade lift (assumed yes: "itself included").
- The v4 immersive brief for the match, after this pass.
