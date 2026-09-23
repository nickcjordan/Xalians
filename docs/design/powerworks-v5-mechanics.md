# Powerworks on creature schema v5: battle mechanics

Status: contract, written 2026-09-21. Pass 1 in progress. Successor to the frozen paper cards described in [powerworks-prototype.md](powerworks-prototype.md); the accepted workshop rules (whole-squad planning, hidden enemy orders, speed interleave, same-move retargeting in fixed row order, persistent health and knockouts, one revival, command-replay saves) are unchanged. Tracks issues #299 and #300.

## Context

Powerworks shipped on frozen cards (`packages/rules/src/dungeon/cards.json`) with five move kinds (hit, snare, ward, charge, fallback), a melee/ranged flag, three uses per secondary and one signature per encounter. None of it read a creature record. Schema v5 (`generation-0.6.0-1`, 32 species, four distinct actions each) now carries the fields the workshop was waiting for: an explicit approach flag, preparation and recovery timing, effect likelihood, statuses, displacement, protection, restoration, removal and passives.

Measured over 2,560 v5 actions (20 seeds per species): approach closing 592 / stationary 1,968; preparation immediate 1,121 / brief 1,420 / prolonged 19; recovery repeatable 621 / brief 1,734 / prolonged 205; likelihood consistent 2,400 / likely 200 / occasional 95; fourteen statuses present.

## Assumptions & Decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | `timing.recovery` is read as a cooldown in rounds (repeatable 0, brief 1, prolonged 2); per-move use counters are removed. Nick reopened the uniform-allowance and no-cooldown rulings on 2026-09-21 because the creature now stores this information. | 90%, Nick's words: "cooldown I guess is more direct to recovery" | `docs/design/creature-model-current.md` ability fields; this conversation |
| 2 | The signature stays once per encounter as a game lever on top of its cooldown. | 70%, boss timing and the intro lesson were tuned on it; revisit after the first v5 sim | `powerworks-prototype.md` |
| 3 | `timing.preparation === 'prolonged'` is a player-side charge-up using the enemy cycle (charge, release, one recovery opportunity). Immediate preparation adds a small initiative bonus so it beats a brief move at equal speed. | 75% | 19 of 2,560 actions are prolonged, so this is rare by construction |
| 4 | Binding statuses (restrained, paralyzed, frozen, pinned, buried) all map to the accepted Snare rule: block `approach: closing` moves through the target's next opportunity, dispel a charge. Stationary contact stays legal. | 85%, Nick accepted the approach-dependent reading on 2026-09-15 and asked for the explicit field | workshop, "Snare accepted; explicit move range forthcoming" |
| 5 | `displace` breaks a charge (the charging machine is pulled off its footing) and otherwise deals impact harm at 60% of its force intensity. This replaces Graviclaw's lost restraint as the intro lesson's second answer. | 65%, a game reading, not canon; Graviclaw's v5 audit deliberately has no restraint | `docs/species-templates/v5/graviclaw.ability-audit.md` |
| 6 | `likelihood` is the application roll for status effects only (consistent 100%, likely 75%, occasional 40%), drawn from the run's seeded rng. Harm stays deterministic. | 80%, matches the 2026-09-15 deterministic-outcomes baseline and issue #295's scope | workshop |
| 7 | Enemies remain dedicated and noncollectible but are authored in the same effect grammar, so the engine has one resolver. Their numbers stay at parity with the shipped cards. | 85% | `creature-adventure-design-workshop.md`, "Dedicated dungeon enemies accepted" |
| 8 | HP, speed and damage derive from attributes with formulas held in one levers file; every constant is a lever pinned by this doc, not a ruling. | 90% | Reclamation precedent `expedition/creatureOnTable.ts` |
| 9 | Unsupported effects are explicitly unavailable and named, never misread. A move is usable if any of its effects is supported; the rest show as "no effect here". | 95%, Nick's standing ruling | `reclamation-v5-migration.md` |

## The reading seam

`packages/rules/src/dungeon/reading.ts` is the only file that reads a creature record. It produces table units:

```text
Unit
  id, species, name, element, enemy
  hp, max          from mean(vitality, endurance, resilience)
  speed            from mean(agility, reflex)
  attrs            { strength, willpower }  scale harm
  moves: Move[]    four actions; signature flagged
  cooldowns[]      rounds remaining per move
  signatureSpent   once per encounter
  bound, ward, charge, recovery   encounter state (unchanged semantics)

Move
  key, name, signature
  approach         closing | stationary | self
  range            contact | short | medium | long | none
  preparation      immediate | brief | prolonged
  recovery         repeatable | brief | prolonged
  element?         classification, drives matchup when present, else the creature's element
  effects[]        the v5 effects, with a per-effect `support` reading:
                     harm      -> damage = intensity/10 * (0.5 + attr/100) * matchup * ward
                     displace  -> breaks charge; impact harm at 0.6 * intensity
                     protect   -> ward (self) until the owner's next opportunity
                     status    -> binding group applies bound; other statuses pass 2
                     restore   -> heal intensity/10 * (0.5 + willpower/100) on target
                     remove    -> pass 2 (nothing to remove yet)
```

Legality per opportunity: not on cooldown; not (bound and closing); not (charging or recovering and a different charge); signature not spent. Desperate strike survives unchanged as the only move when nothing damaging is legal; with repeatable moves it should almost never appear, and the sim reports how often it does.

The four companions are generated from fixed seeds of the frozen `generation-0.6.0-1` release so a run is replayable. Cards for the five machines carry the same Move shape by hand.

## Passes

1. **Seam and real records.** This document's contract. Save format version 2. The existing seeded-run test and a bot-vs-bot check report: win rate, rounds per encounter, Desperate strike frequency, cooldown lockouts (opportunities with no legal move), charge interruptions by binding versus by displace.
2. **Status layer.** Degrading statuses (corroding, poisoned, burning, chilled) tick harm at the victim's opportunity; guarding statuses (shielded, protected, reinforced) generalize ward; attention statuses (entranced, frightened) redirect the victim's next order under a disclosed rule; concealed changes fallback targeting; `remove` and protection descriptors get something to act on.
3. **Passives and triggers.** `contact` and `harmed` triggers as retaliation, ongoing restore as regeneration.

## Pass 1: what it measured, 2026-09-21

The four companions are `powerworks-graviclaw-1`, `powerworks-avilily-6`, `powerworks-crystorn-1` and `powerworks-hippochamp-1`. Avilily's first seed read four paralysis variants and no harm, and speed 64 against the two chargers at 65, so no companion could react to a charge; seed 6 reads speed 82 with a repeatable piercing touch. A test now fails if any companion lacks a damaging move or if no companion outspeeds a charger.

The 200-run greedy sim (`packages/rules/src/dungeon/devtools/powerworksSim.ts`, reactive bind on a charging enemy, blind pull on any known charger, else highest preview damage) read three ways as the levers moved:

| lever state | win rate | rounds / encounter | Desperate strike | charges landing | interruptions bind / displace |
|---|---|---|---|---|---|
| first seeds, no pre-emptive tactic | 94.5% | 4.47 | 17.2% of opportunities | not counted | 93 / 0 |
| seed 6, pre-emptive pull, equal pause after release and interruption | 100% | 4.84 | 0% | 0 of 1,200 | 5 / 1,195 |
| **`INTERRUPTED_CHARGE_RECOVERY_OPPORTUNITIES` = 0** (a broken charge may restart at the very next opportunity; a release still earns the one-opportunity pause) | 100% | 4.92 | 0% | **141 of 1,572 (9%)** | 644 / 474 |

The second row is a lock: Gravity Draw's one-round cooldown matched the charger's two-opportunity cycle exactly, so a blind pull every other round meant no release ever landed. The lever in the third row is a deliberate move away from the paper rule "the next charge may start only after one ordinary opportunity following release **or interruption**", with this table as the evidence. Nine percent of charges landing under a perfect-information bot is a forgiving intro, which the prototype doc says it should be; the greedy bot is not a first-time player.

Opportunities with no legal move: 0 in every run, so cooldowns never lock a companion out. Bind application under `likelihood`: 87% landed (682 of 783).

## Pass 2 contract: the status layer, 2026-09-21

Nick's ruling for Reclamation on 2026-09-21 ("if a creature obtains a status as the result of an enemy attacking them, that's something I would like to support") applies here. The layer is additive over pass 1 and is measured against pass 1's table.

### Decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 10 | Fourteen statuses become five table groups, not fourteen rules. A status not in a group is unsupported and named. | 85% | roster survey: entranced, corroding, restrained, paralyzed, frozen, shielded, frightened, chilled, poisoned, reinforced, concealed, protected, dispersed, focused |
| 11 | A condition lives on the unit as `{status, group, intensity, element?, remaining, source, removable[], protection?}`. Reapplying the same status refreshes its duration and keeps the higher intensity; nothing stacks additively. | 85%, the workshop's anti-chain baseline | workshop, "Snare accepted" |
| 12 | Duration counts the victim's opportunities, like bind: lingering brief 2, lingering prolonged 4, sustained until the source unit falls. Binding keeps `BIND_OPPORTUNITIES` (1 brief, 2 prolonged) because that value was ruled. Attention statuses are the exception at 1 brief, 2 prolonged. | 75% | `creature-model-current.md`, "Areas and persistence" |
| 13 | Degrading statuses (corroding chemical, poisoned chemical, burning fire, chilled ice, overheated fire) tick harm at the start of the victim's opportunity: `floor(intensity / 10 * DEGRADE_FACTOR)` times the element matchup, never reduced by ward. | 70%, the model says poison damage is optional; this game models it | catalog: burning and corroding carry elemental harm |
| 14 | Guarding statuses: shielded halves incoming harm; reinforced takes a quarter off; protected applies exactly its declared descriptor (immune or resistant to a mechanism, an element, a status or displacement). The strongest degree for one scope applies; ward and shielded do not multiply, the better one wins. | 85% | model doc, "Statuses, intensity and protections" |
| 15 | Attention statuses: entranced makes the victim lose its next opportunity (its committed order is not executed and not charged; a charge in progress is not broken); frightened halves the victim's harm output through its next opportunity. Entranced cannot be reapplied to a unit that was entranced within its last two opportunities. Focused makes a unit immune to attention statuses. | 65%, a game reading of "attention is captured" and "fear interferes with behavior" | catalog definitions |
| 16 | Concealed: the unit cannot be selected as a target while another legal target stands, and retargeting skips it; it ends when the unit executes a harm or displace. Dispersed and phased are traversal and stay unsupported here. | 70% | catalog, `dispersed` and `phased` are traversal grants |
| 17 | `remove` ends every condition on the target whose `removable[]` intersects the effect's methods; nothing else. Mending ticks restoration at the victim's opportunity on the harm curve. | 90%, straight from the model | model doc, "Removal matches explicit method intersections" |
| 18 | `physiology.protections[]` are read at the seam as permanent conditions of the guarding group. | 85% | model doc |
| 19 | Three authored machine effects so the layer is visible to the shipped squad: the crawler's Tool strike leaks corroding (occasional, lingering brief, cleansing), the discharge unit's Contact strike scorches overheated (occasional, lingering brief, cooling, which Hippochamp's cannon answers), and the guardian's Clamp strike shocks paralyzed (likely, lingering brief, stabilizing). Nothing else on the cards changes. The first build had shock on both electric machines; the sim then read the degrading group and `remove` as structural zeros, so the crawler and the discharge unit were re-authored. | 70%, dungeon authoring is issue #301; these are the smallest lore-plausible cases for a maintenance machine, a capacitor and the guardian | `paper-dungeon-02/README.md`, `powerworks-composition-pass.md` art table |
| 20 | The enemy planner is unchanged: it does not read conditions. The greedy sim policy prefers a bind against a charger, otherwise a harm with a status over a plain harm at equal preview. | 80% | keeps enemy behaviour learnable |

### Events and presentation

New event kinds: `status` (applied, with status and remaining), `resisted` (a roll failed or a protection blocked it; distinct from `missed` which stays for binds), `tick` (degrade harm or mending restore, with amount), `expired`, `removed`, `lost` (an entranced unit loses its opportunity), `hidden` (a target was skipped because concealed). Every condition on a unit is visible in planning with its name, group icon and remaining opportunities; the inspector lists each with its plain-language rule. Previews stay conditional on current conditions.

### Measurement

The sim reports, beside pass 1's rows: conditions applied per group, degrade damage as a share of all damage taken by companions, opportunities lost to entranced, companion opportunities under paralysis, and how often the companions' `remove` cleared something. Pass 1's rows are re-read and any movement is recorded next to the pass 1 table.

## Pass 2: what it measured, 2026-09-21

The layer is additive: the same 200-run greedy sim, with the status-preferring tiebreak of decision 20, reads pass 1's rows unchanged inside noise.

| row | pass 1 (lever row 3) | pass 2 |
|---|---|---|
| win rate | 100% | 100% |
| rounds / encounter | 4.92 | 4.94 |
| Desperate strike | 0% | 0% of 15,530 opportunities |
| opportunities with no legal move | 0 | 0 |
| charges landing | 141 of 1,572 (9%) | 146 of 1,568 (9.3%) |
| interruptions bind / displace | 644 / 474 | 656 / 467 |
| binds landed / missed | 87% (682 of 783) | 89.3% (781 of 875) |

New rows, same run, after the decision 19 re-authoring:

| row | value |
|---|---|
| conditions applied per group | binding 781, degrading 1,019 |
| applications resisted or blocked | 1,480 (almost all the crawler's occasional leak failing its 40% roll) |
| degrade share of companion damage taken | 7.8% (2,267 of 29,219) |
| opportunities lost to entranced | 0 |
| companion opportunities under paralysis | 0.1% (8) |
| companion remove: cleared / found nothing | 0 / 800 |
| targets skipped as concealed | 0 |

The first build shocked on both electric machines and read the degrading group at zero; the crawler's leak and the capacitor's scorch put a degrading source in every sector, and corrosion is now 7.8% of what the squad takes. Attention, concealment and mending remain structurally zero: **no creature in the shipped squad and no machine card carries one**. The seam, the resolver and the presentation cover all six groups and are tested against each; those three wait on dungeon authoring (issue #301) or on a squad drawn from the wider roster.

`remove` is the honest zero that exposes a real gap. Hippochamp's cannon carries `cooling` on its **target**, and this game only aims at foes, so it can only cool a machine, and no companion overheats one. v5 `targeting: other` admits allies; this game has no ally targeting at all, so every restore, remove and protect aimed at another creature is enemy-only here. That is issue #299's "define support targets" item and it is the first thing a squad drawn from the wider roster (Sonalloy's repair, Hypnopet's stabilizing) would hit. It is not in pass 2 or 3.

Companion opportunities under paralysis is 7 because the greedy bot clears each encounter in 4.94 rounds and a brief binding is spent at the victim's own opportunity. A related reading worth recording: a binding applied by a unit **faster** than its victim is spent inside the same round, so it never reaches a planning screen; only a slower applier leaves a badge the player sees before ordering. That is pass 1's `bound` semantics unchanged, but the badge makes it visible, and it means the machines' shock is felt mostly by Avilily (speed 82, faster than every machine).

## Pass 3 contract: passives and triggers, 2026-09-21

v5 passives are automatic processes with the same effect vocabulary as actions. The roster survey found 25 ongoing and 6 triggered passives in 640 records: ongoing restore (Bioflim, Sonalloy, Xylum), ongoing concealed (Vespersyn), contact-triggered burning (Imprit). None of the four shipped companions carries one, so the layer is exercised by one authored machine passive and by seam tests against real roster records.

### Decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 21 | An ongoing passive (no trigger, no timing) becomes a permanent condition of its status group on the owner at encounter entry, `remaining` infinite, source self: ongoing restore is `mending`, ongoing concealed is sustained concealment, ongoing protect is `shielded`. An ongoing passive whose effects have no group is unsupported and named. | 80% | model doc: "Ongoing passives target self"; pass 2 groups |
| 22 | A discrete passive fires on its trigger with the model's target: `contact` when a contact-delivery move lands on the owner (target is the attacker), `harmed` when the owner loses HP to a unit's move (target is the attacker; ticks never trigger), `ally-harmed` when a same-side unit loses HP to a move (target is that ally). It resolves after the triggering move finishes, in the owner's name, with the owner's attributes, through the same `apply` path as an action. | 80% | model doc: "Triggers supply target" |
| 23 | A passive's `timing.recovery` is its cooldown in rounds through `COOLDOWN_ROUNDS`; it fires at most once per triggering move, never while the owner is knocked out, and a reaction never triggers another reaction (depth one). Likelihood rolls apply. | 85% | model doc: "Games schedule events and prevent reaction loops" |
| 24 | The guardian gains one contact-triggered passive, Core discharge: elemental electric harm at intensity 30 to whoever strikes it in contact, consistent, repeatable. A contact attacker takes about 3 damage per touch; ranged attackers do not. This is the pass's one piece of authored content, so the layer is visible to the shipped squad; nothing else on the cards changes. | 65%, dungeon authoring is issue #301; a live turbine core that shocks on touch is the composition doc's own description of the guardian | `powerworks-composition-pass.md` art table |
| 25 | Reactions emit a `react` event (owner, target, passive name) before their outcome events. The inspector lists each passive under "Reacts" or "Always" with its plain-language rule; the machines' ability notes show a passive without revealing orders. | 80% | pass 2 presentation |
| 26 | Ally targeting stays out of scope. Every other-aimed restore, remove and protect remains enemy-only; `ally-harmed` reactions are the one place an effect reaches an ally, because the trigger supplies the ally as target. | 90%, issue #299 item | pass 2 measurement |

### Measurement

The sim adds: reactions fired per trigger, reaction damage as a share of companion damage taken, contact versus ranged strikes on the guardian by the greedy bot, and (from a seam-only test over the wider roster) how many of 640 records carry a passive the seam reads as supported versus unsupported and why.

## Friction reported

- The pre-emptive pull is close to a free answer: a five-damage move that also removes an eighteen-damage release. `DISPLACE_HARM_FACTOR`, the pull's own cooldown and the interrupted-recovery lever are the three places to move it if human play agrees.
- Base names collide in the tray: Crystorn shows two cards titled "Impact Touch", differing only in cooldown pips; the qualifier lives in the tooltip and the inspector.

- Graviclaw's v5 signature is compression, not restraint; the intro dungeon's lesson now rests on Avilily's paralysis and on decision 5.
- Compositional names such as "Impact Touch (Brief Preparation)" read flat in a move tray. Left as generated; a naming lever, not a game lever.

Pass 2:

- **The status layer has almost no sources on the shipped table.** Four of the six groups are unreachable in the intro dungeon (above). Decision 19 gave the machines one shock; a second card carrying a degrading application would make the tick, the ward exemption and `remove` all visible in the same run, and is one authored effect.
- **Pass 2 made every companion effect supported, so "no effect here" is now unreachable from the squad.** Graviclaw's Ground Anchor reads as a guarding condition and Hippochamp's cannon as a real removal; nothing the four carry is unsupported any more. The contract-decision-9 path is still tested, but at the seam against `dispersed` / `phased` / `marked` rather than through a real card. Worth knowing before anyone reads "the squad shows an unsupported effect" as a live case.
- **A brief binding applied by a faster unit never reaches a planning screen.** It is applied and spent inside the same round, so the badge only appears when the applier is slower. Inherited from pass 1's `bound` counter, but pass 2's badge is where a player would notice the asymmetry. If binding should be felt regardless of initiative, the lever is `BIND_OPPORTUNITIES` at 2, which the sim can price.
- **`protected` resistance had to be given a reading.** Decision 14 says protected applies "exactly its declared descriptor", and immune is unambiguous, but resistant has no number in the model. This build takes the reinforced quarter off the covered effect (`REINFORCED_FACTOR`), so a declared scope is felt without inventing a second dial. No creature in the roster carries a resistant `protected` status yet; three species carry innate resistances (bioflim impact, imprit fire, scalatto cutting), which this reading now honours through decision 18.

## Pass 3: what it measured, 2026-09-21

The same 200-run greedy sim, read twice as the one pass 3 lever moved. Core discharge was
first authored at `recovery: "repeatable"` (decision 24's own wording, "consistent,
repeatable"); it is now authored at `recovery: "brief"`, one answer per round. Both
readings are kept so the lever's effect is visible.

| lever state | win rate | rounds / encounter | reactions fired | reaction share of companion damage taken |
|---|---|---|---|---|
| Core discharge `repeatable` (as decision 24 first wrote it) | 98.5% (197 won, 3 lost) | 4.98 | contact 3,711 | **29.4%** (12,568 of 42,718) |
| **Core discharge `brief`** (applied) | **99.5%** (199 won, 1 lost) | 4.96 | contact 1,467 | **10.2%** (3,424 of 33,529) |

`brief` was applied on that evidence: at `repeatable` the reaction answered every contact
strike in the round, became the single largest source of damage in the run ahead of Clamp
strike, and cost the squad the first losses the sim had ever recorded. At `brief` it is a
tenth of what the companions take, which reads as a hazard to plan around rather than a
tax on attacking. **Overridable**: the three levers are the card's `recovery` (`repeatable`
returns the first row exactly), the card's `intensity` (30), and the bot's own willingness
to touch a live turbine core.

The rest of the table, against pass 2, at the applied `brief` setting:

| row | pass 2 | pass 3 |
|---|---|---|
| win rate | 100% | 99.5% (199 won, 1 lost) |
| rounds / encounter | 4.94 | 4.96 |
| Desperate strike | 0% | 0% of 15,405 opportunities |
| opportunities with no legal move | 0 | 0 |
| charges landing | 146 of 1,568 (9.3%) | 174 of 1,567 (11.1%) |
| interruptions bind / displace | 656 / 467 | 622 / 480 |
| binds landed / missed | 89.3% (781 of 875) | 89.8% (762 of 849) |
| conditions applied per group | binding 781, degrading 1,019 | binding 762, degrading 1,017 |
| applications resisted or blocked | 1,480 | 1,480 |
| degrade share of companion damage taken | 7.8% (2,267 of 29,219) | 6.7% (2,253 of 33,529) |
| opportunities lost to entranced | 0 | 0 |
| companion opportunities under paralysis | 0.1% (8) | 0.0% (7) |
| companion remove: cleared / found nothing | 0 / 800 | 0 / 800 |
| targets skipped as concealed | 0 | 0 |

New rows, same run:

| row | value |
|---|---|
| reactions fired per trigger | contact 1,467 (harmed 0, ally-harmed 0) |
| reaction share of companion damage taken | 10.2% (3,424 of 33,529) |
| strikes ordered on the guardian, contact / ranged | 3,918 / 1,079 |

Seam-only survey over the wider roster (20 seeds per species, 640 records):

| row | value |
|---|---|
| records carrying a passive | 100 of 640 (15.6%) |
| ongoing / triggered | 80 / 20 |
| triggered by trigger | contact 20 (no `harmed`, no `ally-harmed` in the roster) |
| supported / unsupported | 100 / 0 |
| species carrying one | bioflim 20, imprit 20, sonalloy 20, vespersyn 20, xylum 20 |

### Friction reported

- **A passive's cooldown counts rounds at the round boundary, not at the owner's
  opportunity.** Decision 23 says "`timing.recovery` is its cooldown in rounds through
  `COOLDOWN_ROUNDS`". Decrementing it at the owner's own opportunity, as a move's cooldown
  is decremented, refunds the reaction mid-round to every attacker who strikes after the
  owner has acted: at `brief` the guardian answered twice in a round whose initiative put
  two companions on either side of it. The build decrements every passive cooldown once at
  the top of the round instead, so `brief` means exactly one answer per round whatever the
  initiative order. This is an implementation reading of decision 23, not a new lever, and
  it is what makes the `brief` setting above mean what it says.
- **At `brief`, the one answer goes to the fastest toucher, which is always Avilily.**
  Every action Avilily carries is contact and she is the fastest companion, so she absorbs
  the guardian's single reply every round and no slower companion ever feels it. The
  resolver tests that aim a reaction at a named companion have to sideline her to say
  anything at all. This is the pass 2 "a faster applier is never seen" asymmetry appearing
  again from the other side, and it means the reaction teaches its lesson to one squad
  member rather than to the squad. If the hazard should be felt by whoever touches it, the
  lever is the budget (`REACTIONS_PER_TRIGGERING_MOVE` is already per triggering move, so
  `repeatable` is the setting that does this) rather than anything new.
- **`harmed` and `ally-harmed` have no source anywhere.** All 20 triggered passives in 640
  roster records are `contact`, and the one authored machine passive is `contact`. Both
  other triggers are implemented and tested (against card passives fitted onto a test
  unit), but nothing in the shipped table or the wider roster exercises them; they are the
  pass 3 equivalent of pass 2's attention and concealment zeros, and they wait on dungeon
  authoring (issue #301).
- **An ongoing passive's status targets itself, which pass 2's seam refused.** v5 requires
  `targeting: ["self"]` on an ongoing passive, so Vespersyn's Hidden Core arrives as
  `concealed` on `recipient: "self"`, and pass 2's rule "a status on itself is not read
  here unless it is guarding or mending" made the whole passive unsupported. The seam now
  takes an `ongoing` flag that relaxes exactly that one check (decision 21 already says an
  ongoing status becomes a condition on its owner); nothing else about the reading changed.
  Worth knowing because it means the pass 2 rule was never about self-targeting as such,
  only about actions aimed at themselves.
- **Every companion but Hippochamp reaches the guardian at contact range,** because the
  generator's ordinary Impact Touch actions are `range: contact` with `approach: stationary`.
  So "stay out of contact" is not a real choice for three of the four: Crystorn has one
  ranged option, Graviclaw two, Avilily none at all. The lesson decision 24 wants to teach
  is only teachable to the squad that has an answer, which is a squad-composition point,
  not a rules one.
- **Compositional move names overflowed the squad panel.** Pass 1 introduced `baseName` for
  the move tray but the squad panel's committed-order label still printed the whole
  generated name, so Hippochamp's "Impact Touch (Contact Range; Targeted; Brief
  Preparation; Repeatable Recovery; Discrete; Contact; Closing; Hooves; ...)" ran past its
  cell at 390px and pushed the panel open. The label is now the base name, clamped to two
  lines, with the full name on the span's `title` and in the select button's title and
  accessible description. Same fix as the tray, one pass late; the naming lever itself is
  still open.

## Release generation-0.7.0-1 (derived acts), 2026-09-22

The canonical release moved from `generation-0.6.0-1` to `generation-0.7.0-1` ([creature-derived-acts.md](creature-derived-acts.md)): ordinary actions now derive from anatomy, so the same seed rolls different ordinary actions, while guaranteed actions, signatures and passives are unchanged. Nothing in `levers.ts` moved except `COMPANION_SEEDS`.

### Companion seeds

| companion | 0.6.0-1 seed | 0.7.0-1 seed | why |
|---|---|---|---|
| Graviclaw | `powerworks-graviclaw-1` | **`powerworks-graviclaw-4`** | Seed 1's only derived ordinary action is Frightening Signal, so once Gravity Pincer (the signature) is spent its one damaging ordinary move is the brief Gravity Draw, and every other round it has nothing damaging legal: Desperate strike on 1,510 of its 4,530 opportunities in the 200-run sim, every Desperate strike in the run. Seed 3 is the lowest that keeps a damaging move legal every round, but its fourth action is a second displacement, which this game resolves exactly like Gravity Draw; seed 4 is the lowest that does both. |
| Avilily | `powerworks-avilily-6` | `powerworks-avilily-6` (kept) | Speed 81, still faster than both chargers (65); paralysis and a second bind present; two brief harms alternate, so no Desperate strike. |
| Crystorn | `powerworks-crystorn-1` | `powerworks-crystorn-1` (kept) | Four damaging actions, two repeatable. |
| Hippochamp | `powerworks-hippochamp-1` | `powerworks-hippochamp-1` (kept) | Cannon unchanged; gains a contact pull and a bind. |

The four actions each, as the seam reads them (`*` signature; approach/range, preparation/recovery, effects):

- **Graviclaw** (seed 4, HP 77, speed 27, strength 91): *Gravity Pincer, stationary/contact, brief/brief, compression harm 85. Gravity Draw, stationary/medium, immediate/brief, displace 65. Ground Anchor, self, brief/brief, protected (immune to displacement). Crushing Ram, stationary/contact, brief/repeatable, compression harm 73.
- **Avilily** (seed 6, HP 32, speed 81, strength 12): *Blossoming Ambuscade, stationary/contact, brief/brief, paralyzed (bind, consistent). Piercing Peck, stationary/contact, brief/brief, piercing harm 14. Binding Lash, closing/contact, brief/brief, restrained (bind, likely). Heavy Peck, closing/contact, immediate/brief, impact harm 9.
- **Crystorn** (seed 1, HP 68, speed 28, strength 68, willpower 73): *Gem Radiance, stationary/medium, brief/brief, light elemental harm 68. Crushing Gore, closing/contact, brief/brief, compression harm 55. Heavy Ram, stationary/contact, brief/repeatable, impact harm 52. Heavy Gore, closing/contact, immediate/repeatable, impact harm 63.
- **Hippochamp** (seed 1, HP 70, speed 57): *Emergency Water Cannon, stationary/medium, brief/brief, water impact harm 55 plus remove (cooling). Piercing Shot, stationary/medium, brief/repeatable, piercing harm 39. Binding Slam, closing/contact, immediate/repeatable, water restrained (bind, occasional). Repelling Ram, stationary/contact, immediate/brief, displace 36.

No two actions on one companion share a tray name, and every effect the squad carries is supported. A test ("carries the intro's two answers to a charge and four distinct actions each") now pins Avilily's paralysis, Graviclaw's pull, distinct names and full support.

**Not satisfiable:** a companion with a prolonged-preparation move. The release derives none: 0 of 2,560 roster actions (20 seeds per species) and 0 of 4,800 companion actions (300 seeds per companion) are prolonged. The old squad had none either, so the intro never taught it from a real record; decision 3's player-side charge-up is now reachable only from a fitted test move.

### Sim, 200 greedy runs

| row | pass 3 (0.6.0-1, applied) | 0.7.0-1, Graviclaw seed 1 kept | **0.7.0-1, Graviclaw seed 4 (applied)** |
|---|---|---|---|
| win rate | 99.5% (199 won, 1 lost) | 91.0% (182 won, 18 lost) | **98.0% (196 won, 4 lost)** |
| rounds / encounter | 4.96 | 5.86 | 5.26 |
| Desperate strike | 0% of 15,405 | 8.5% of 17,848 | 0.0% of 16,298 |
| opportunities with no legal move | 0 | 3 | 4 |
| charges landing | 174 of 1,567 (11.1%) | 160 of 1,862 (8.6%) | 117 of 1,724 (6.8%) |
| interruptions bind / displace | 622 / 480 | 178 / 1,450 | 183 / 1,215 |
| pre-emptive pulls (broke a charge) | not recorded | 3,300 (1,450) | 2,410 (1,215) |
| binds landed / missed | 89.8% (762 of 849) | 80.6% (1,789 of 2,219) | 80.7% (1,731 of 2,145) |
| conditions applied per group | binding 762, degrading 1,017 | binding 1,789, degrading 1,243 | binding 1,731, degrading 1,108 |
| applications resisted or blocked | 1,480 | 1,743 | 1,516 |
| degrade share of companion damage taken | 6.7% (2,253 of 33,529) | 7.3% (2,888 of 39,658) | 7.3% (2,576 of 35,229) |
| opportunities lost to entranced | 0 | 0 | 0 |
| companion opportunities under paralysis | 0.0% (7) | 0.0% (3) | 0.0% (5) |
| companion remove: cleared / found nothing | 0 / 800 | 0 / 800 | 0 / 800 |
| targets skipped as concealed | 0 | 0 | 0 |
| reactions fired | contact 1,467 | contact 2,025 | contact 1,726 |
| reaction share of companion damage taken | 10.2% (3,424 of 33,529) | 20.5% (8,137 of 39,658) | 19.1% (6,715 of 35,229) |
| strikes on the guardian, contact / ranged | 3,918 / 1,079 | 4,390 / 1,503 | 3,825 / 1,471 |

The seam-only passive survey is unchanged (100 of 640 records carry a passive, 80 ongoing / 20 contact-triggered, 100 supported), as it should be: passives did not change.

**Reading.** Keeping Graviclaw seed 1 cost the squad nine points of win rate, and the whole loss traces to one kit: after its signature, Graviclaw had a single brief damaging move, so it spent a third of its opportunities on Desperate strike and its recoil. With seed 4's repeatable Crushing Ram, Desperate strike is back to zero and the win rate to 98%, a point and a half under pass 3. The rest of the drift comes from the derived kits themselves. Hippochamp now carries a contact pull (Repelling Ram) beside Graviclaw's Gravity Draw, so the greedy bot pulls chargers far more often (1,215 displace interruptions against 480) and fewer charges land (6.8% against 11.1%), but binds land less often (80.7% against 89.8%) because the new binds are `likely` and `occasional` where the old squad's were consistent. Encounters run longer (5.26 rounds against 4.96) because Avilily's derived pecks carry harm 14 and 9 at strength 12 and preview 0 or 1 damage (she dealt 1,537 of the squad's 74,362 damage in the run), so a quarter of the squad now only binds. That same fact doubles the Core discharge share: a peck that does 0 damage and lands no status does not trigger a contact reaction, so the guardian's one reply per round no longer lands on Avilily (plant, resistant to electric) but on Hippochamp's contact pull (water, weak to electric): 806 of 1,726 replies and 4,836 of 6,715 reaction damage were hers. The contract states no numeric win-rate band; 98% under a perfect-information greedy bot still reads as the forgiving intro the prototype doc asks for, so no lever moved.

### Seam readings on the new roster

The derived tables bring statuses and shapes the seam has no rule for. Surveyed over 20 seeds per species (2,560 actions); none of it reaches the shipped squad. Nothing was widened: the existing groups already cover burning, shielded, reinforced, frightened, buried, pinned and frozen by name, and the rest need a rule.

| reading | where it appears | what the seam does |
|---|---|---|
| stunned | Voltish: Electric Shot, Electric Swipe, Stunning Sweep, Electric Sweep, Stunning Shot | unsupported, named. Paralyzed is this game's binding (blocks closing moves), not a skipped opportunity, and the electric row deliberately separates stunned from its paralyzed bind, so neither binding nor entranced covers it without a new rule. |
| slowed | Hippochamp: Water Shot, Slowing Field, Water Sweep, Slowing Sweep | unsupported, named; needs a speed or approach rule. |
| blinded | Chromocat: Blinding Shot; Frackworm: Blinding Shot, Blinding Field, Blinding Touch, Sand Shot | unsupported, named. |
| disoriented | Neph: Disorienting Sweep, Disorienting Field | unsupported, named. |
| sedated | none in 2,560 actions (plant medium row) | would be unsupported, named. |
| focused | Figzy: Focusing Response; Hypnopet: Focusing Response, Focusing Signal | unsupported, named. Decision 15 already gives focused a rule and the engine honors it by name, but `statusGroup` has no group for it. Mapping it to guarding would read the two self-aimed Responses correctly and make Hypnopet's Focusing Signal focus a foe (see the Sonalloy row), so it waits on a ruling. |
| phased | none in 2,560 actions (ghost ward) | unsupported by decision 16. |
| concealed on itself (an action) | Akinza: Night Stalk | unsupported by the pass 2 self rule; the concealment group exists, so reading it is a one-line relaxation, not a new rule. |
| area harm (lash sweeps, pulse bursts) | 30 of 32 species; Heavy Sweep on most, a Burst on 14 conduit species | read as harm on the one selected target. The seam does not read `spatial.area`, so a sweep or burst hits one machine. |
| area status (fields, sweeps) | Bioflim and Venemist Corrosive Field, Imprit Burning Field and sweeps, and the four rows above | applied to the one selected target; a lingering field does not persist on a location. |
| drain (harm plus `requires` restore on self) | Bioflim: Chemical Touch; Tizzie: Psychic Signal, Restorative Signal | read as harm plus an independent self restore on the willpower curve; the `requires` dependency is not read, so the heal happens even when the harm is blocked or zero. |
| guarding status aimed at another | Sonalloy: Reinforcing Lash (reinforced on target) | **supported, and misread**: it reinforces the foe it hits. The pass 2 seam refuses `protect` aimed at another ("protection only guards its user here") but not a guarding status, and it cannot refuse one outright because decision 26's ally-harmed reactions aim a status at an ally through the same path. |
| ally-aimed protect and restore | Figzy, Shuntara, Vespersyn protect; Sonalloy Living-Alloy Seam | unsupported, named (ally targeting, issue #299, unchanged). |

## Pass 4 contract: the derived roster's effects, 2026-09-23

Nick, 2026-09-23: "Proceed with your updates as you recommend them." Pass 4 reads every effect shape the derived-acts roster produces that the seam named as unsupported or misread in the section above. Ally targeting (issue #299) stays out of scope and is the next pass. Every decision is a lever, recommended and overridable.

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 27 | **Stunned** is a new *shock* group: the victim loses its next opportunity (like entranced) and a charge in progress breaks (unlike entranced; an acute shock disrupts what the body was doing). It cannot be reapplied within `ENTRANCE_IMMUNITY_OPPORTUNITIES` of the last one. Focused does not block it: it is physical, not attention. | 70% | catalog: "An acute shock disrupts responses" vs entranced "attention is captured" |
| 28 | **Slowed** is a new *tempo* group: the victim's speed is multiplied by `SLOWED_SPEED_FACTOR` (0.5) for initiative through its duration. | 80% | catalog: "Movement remains possible but is impaired" |
| 29 | **Sedated** joins tempo: the victim acts after every unsedated unit and its passives do not react while it lasts. | 65% | catalog: "Alertness and responsiveness are reduced" |
| 30 | **Blinded** is a new *senses* group: the victim's non-contact harm is multiplied by `BLINDED_RANGED_FACTOR` (0.5), and it is immune to statuses from signals with visual reception while blinded. Contact harm is unaffected. | 70% | catalog: "Vision is impaired or unavailable"; the model's `reception: visual` requirement |
| 31 | **Disoriented** joins senses: the victim's aimed order goes to a uniformly drawn standing legal target (seeded rng), announced as a stumble. | 70% | catalog: "Orientation or coordination is disrupted" |
| 32 | **Focused** is read by its decision-15 rule and **concealed on itself** is legal as an action (the one-line relaxation). | 90% | decision 15, decision 16 |
| 33 | **Area harm and area status.** An effect whose recipient is `area` reaches: a sweep (line, cone, sweep shapes) the target and, by extent, its neighbors in the opposing line order (small one neighbor on the far side, medium both); a radial area anchored on self every standing opposing unit and the performer's own adjacent allies (the model's no-ally-filter rule); a radial area anchored on the target or a location the target and both its neighbors. Each recipient takes harm times `AREA_HARM_FACTOR` (0.6) and rolls statuses independently. A lingering area applies once at resolution; this game has no locations to persist on. | 65%, the first geometric reading this game makes | model doc, "Areas and persistence"; 30 of 32 species carry an area act |
| 34 | **Drain dependency.** An effect with `requires` resolves only when its prerequisite succeeded on at least one recipient; a drain's restore needs harm actually dealt (above zero after protection). | 95% | model doc, "`requires` names one other independent effect's success" |
| 35 | **Beneficial effects aimed at a foe are not applied.** A guarding, mending or focused status, a restore or a protect whose recipient is `target` or `area` does not reach an opposing unit; the move's other effects still resolve, and the record says what was withheld. Reactions from `ally-harmed` keep reaching the ally (decision 26). This retires the Sonalloy misread until ally targeting lands. Phased and dispersed stay unsupported (traversal). | 85% | seam readings table, Sonalloy Reinforcing Lash |
| 36 | **Charge-up from the roster.** Creature pass two lets crush, beam and burst roll prolonged preparation, so companions can charge. The companion seeds are re-checked so at least one companion carries a real charged act, keeping decision 3's rule exercised by a creature, not only by machines. | 85% | creature-derived-acts.md, pass two |
