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

#### After pass 4, on generation-0.7.0-3

The same survey rerun on `generation-0.7.0-3` after pass 4 (`surveyActions` in `devtools/powerworksSim.ts`, 20 seeds per species, 640 records, 2,560 actions, 2,710 effects). Every row of the table above now has a rule except ally targeting and traversal.

| reading | where it appears on 0.7.0-3 | what the seam does after pass 4 |
|---|---|---|
| stunned | Voltish: 16 effects (Electric Shot, Sweep, Swipe; Stunning Shot, Sweep, Swipe) | **shock** (decision 27): loses the next opportunity, breaks a charge, one stun per trance window, focus does not block it. |
| slowed | Hippochamp: 16 (Slowing Field, Slowing Sweep, Water Shot, Water Sweep) | **tempo** (decision 28): half speed for initiative. |
| sedated | none in 2,560 actions | **tempo** (decision 29): acts last, passives silent. Tested with a fitted move only. |
| blinded | Chromocat, Crystorn, Frackworm: 25 (Blinding Field, Blinding Shot, Blinding Touch, Light Shot, Sand Shot) | **senses** (decision 30): non-contact harm halved; statuses from a visual signal cannot reach it. |
| disoriented | Neph: 4 (Disorienting Field, Disorienting Sweep) | **senses** (decision 31): the next aimed execution goes to a drawn standing target, announced as a stumble. |
| focused | none on 0.7.0-3 (Figzy's and Hypnopet's focusing acts no longer roll on these seeds) | **guarding** (decision 32): on itself it blocks attention; aimed at a foe it is withheld. |
| concealed on itself (an action) | Akinza: Night Stalk, 20 | **supported** (decision 32). |
| area harm | sweeps 182 (small 87, medium 95) on 26 species; bursts, radial on self, 80 (small 34, medium 46) on 15 species; radial on the target 40 (Terragoyle Gravel Strafing, Codazzo Explosive Tail Barb) | **read with geometry** (decision 33): every recipient at `AREA_HARM_FACTOR` 0.6; a burst on self also reaches the performer's adjacent allies. |
| area status | fields, radial on a location: 28 (Bioflim, Frackworm, Hippochamp, Imprit, Neph, Venemist) | **per recipient** (decision 33): each recipient rolls; a lingering field applies once. |
| drain | Bioflim Chemical Touch; Tizzie Restorative Signal, Restorative Touch: 6 | **dependency read** (decision 34): the restore needs harm dealt. |
| guarding status aimed at a foe | Sonalloy Reinforcing Lash: 1 (status only on this release) | **withheld** (decision 35); a move carrying nothing else is not a legal order. |
| ally-aimed protect | Figzy Steadying Intervention; Shuntara Conductive Lattice, Protective Stream, Protective Touch: 43 | unsupported, named (ally targeting, issue #299). |
| ally-aimed restore | Sonalloy Living-Alloy Seam; Yetimoth Restorative Ram: 21 | unsupported, named (ally targeting, issue #299). |
| dispersed | Smokat Smoke Dispersal: 20 | unsupported, named (traversal, decision 16). |
| phased | none in 2,560 actions | unsupported (traversal). |
| charged ordinary act | 126 actions on all 32 species (bursts, crushes, streams, Chilling Punch, Metal Touch) | read by decision 3's player-side charge-up; Hippochamp's Crushing Kick is the squad's (decisions 36 and 37). |

Moves with nothing this game can resolve against a foe, so never a legal order: Figzy Steadying Intervention (20), Shuntara Conductive Lattice (20), Smokat Smoke Dispersal (20), Sonalloy Living-Alloy Seam (20), and four rarer rolls (Shuntara Protective Touch 2 and Protective Stream 1, Sonalloy Reinforcing Lash 1, Yetimoth Restorative Ram 1). Four species lose one of their four actions every seed; ally targeting is what returns them.

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
| 37 | **Every companion keeps an every-round harm.** After its signature is spent, each companion that has any harm act has at least one damaging action that is legal every round (recovery repeatable, not prolonged preparation) and is not a burst anchored on itself. **Amended 2026-09-23 (pass 6):** the harm counts only if it previews at least 1 against a standard machine target, that is, its move-card power (`basePower`, the harm curve before matchup and guard) is at least 1; a harm that previews 0 is not an every-round harm. Decision 36 stands, but any companion may carry the ordinary charged act, as long as it is not a burst on itself that reaches squadmates. Seeds are re-picked under the full set: keep a seed that passes, else the lowest that passes. | 90%, the coordinator's ruling on the evidence, 2026-09-23 | the 0.7.0-3 kits alone took the greedy win rate from 98% to 79% with the pass 3 resolver; Graviclaw 9 with the other first seeds read 93.5%; a charged burst on self (Hippochamp 5) read 70.0% and hit a squadmate 1,361 times; "Pass 4: what it measured" below; for the power-1 amendment, the pass 6 offer survey on 0.7.0-4: 180 of 3,200 offers carried an every-round harm at power 0 (Avilily 60 of her 115 offers, Ectoghoul 42 of 84) |

## Pass 4: what it measured, 2026-09-23

Measured on `generation-0.7.0-3` (the release moved from 0.7.0-2 to 0.7.0-3 while this pass was built; every number below is on 0.7.0-3). Save format version 4; version 3 saves are rejected.

### How the decisions were read

Where the contract left a choice open, the build took the reading below. Each is a lever or a one-line change.

- **Shock (27).** Duration uses the attention table (`SHOCK_OPPORTUNITIES` = 1 brief, 2 prolonged), "like entranced"; every derived stun is brief, so in practice one opportunity. The charge break is announced as a new `broken` event, not as `displace`, because the sim counts `displace` as a pull interruption and the caption for it says "pulled off its footing".
- **Tempo (28, 29).** Slowed speed is floored (`floor(speed * 0.5)`). Sedated sorts before speed: a sedated unit acts after every unsedated one, and two sedated units keep speed order between them. The turn-order panel and the inspector show the effective speed.
- **Senses (30, 31).** A blinded unit refuses every status carried by a visual signal, not only attention statuses. Disoriented stumbles only when the order executes (a release or an ordinary move), never when a charge begins; the draw is uniform over every standing selectable foe, the chosen target included, and replaces the fallen-target redirect for that order.
- **Areas (33).** The line is the standing units of the `team` or `enemies` array in order, so it closes up when a unit falls. "Small, one neighbor on the far side" reads as the next unit after the target in array order; a target at the end of its line has none. `large` (no derived sweep rolls it) reaches the whole opposing line. The target takes area harm at 0.6 like every other recipient. Concealment prevents selection, not being caught in an area. Area hits after the target carry `area: true` on their `hit` event.
- **Friendly harm provokes nothing.** A burst on self harms the performer's adjacent allies (the model's no-ally-filter rule); a reaction now fires only on a foe's move, so no squadmate answers another. This is new: before pass 4 nothing a unit did could reach its own side.
- **Drains (34).** A harm prerequisite succeeds on a recipient when it dealt more than zero and the recipient is not immune to that effect's scope; a displacement succeeds when the recipient is not immune to displacement; a status when it landed. A failed dependency emits `withheld` with reason `requires`.
- **Beneficial effects (35).** Withheld at the resolver, per recipient, whenever the recipient stands on the other side, with a `withheld` event (reason `foe`). The seam still names ally-aimed `protect` and `restore` as unsupported, as the seam table says, so the resolver rule reaches guarding and mending statuses in practice. A move whose every supported effect is beneficial and can only reach a foe is not a legal order (`usable` is false), so it can never be a dead turn: on 0.7.0-3 that is Sonalloy's Reinforcing Lash, which rolls status-only. A radial area anchored on self still delivers a beneficial effect to the performer's adjacent allies.
- **Focused (32)** is in the guarding group (`GUARDING_STATUSES`), so decision 35 withholds it from a foe and it guards its own user.

### Companion seeds and kits (decisions 36 and 37)

The first seed check kept all four seeds (Graviclaw 4, Avilily 6, Crystorn 1, Hippochamp 1): each met every requirement the "reads the four companions" block then encoded, and Graviclaw's Dark Signal met decision 36. That squad read 76% (the second sim column below), so decision 37 was added and the seeds re-picked under the full set: keep a seed that still passes, otherwise the lowest that passes. The requirement check is `dungeon.test.ts`, "keeps an every-round harm on every companion that has a harm act" and "carries a real ordinary charged act".

- **Graviclaw** 4 fails decision 37 (its only derived slot is the prolonged Dark Signal), and Graviclaw can never carry the charge and an every-round harm together, because three of its four actions are guaranteed: no seed from 1 to 200 does both. Seed 9 fails too (its Slashing Pinch is brief recovery, not repeatable). The lowest passing seed is **17**.
- **Avilily** 6 fails decision 37 (both pecks are brief recovery). The lowest passing seed is **1**.
- **Crystorn** 1 still passes (Blinding Shot is repeatable) and is kept.
- **Hippochamp** 1 fails decision 37. Its lowest passing seed is 2, but then no companion charges, so decision 36 moves to whichever companion that must change anyway can carry it at the lowest seed: Hippochamp **25** (Avilily's lowest with a charge is 38; Crystorn's is 22 but Crystorn 1 still passes and is kept).

`SAVE_VERSION` stays 4: version 4 had not shipped when the seeds moved.

- **Graviclaw** (`powerworks-graviclaw-17`, HP 73, speed 32, strength 86): *Gravity Pincer, stationary/contact, brief/brief, compression harm 85. Gravity Draw, stationary/medium, immediate/brief, displace 65. Ground Anchor, self, brief/brief, protected (immune to displacement). **Slashing Pinch**, closing/contact, brief/repeatable, cutting harm 73.
- **Avilily** (`powerworks-avilily-1`, HP 36, speed 72, strength 25): *Blossoming Ambuscade, stationary/contact, brief/brief, paralyzed (bind, consistent). Piercing Peck, stationary/contact, immediate/brief, piercing harm 19. Binding Rake, closing/contact, brief/repeatable, restrained (bind, occasional). **Slashing Peck**, closing/contact, immediate/repeatable, cutting harm 16.
- **Crystorn** (`powerworks-crystorn-1`, HP 68, speed 28, strength 68, willpower 73): *Gem Radiance, stationary/medium, brief/brief, light harm 68. Repelling Punch, stationary/contact, brief/brief, displace 46. **Blinding Shot**, stationary/short, brief/repeatable, light harm 73 plus blinded (occasional). Heavy Ram, closing/contact, brief/brief, impact harm 60.
- **Hippochamp** (`powerworks-hippochamp-25`, HP 63, speed 48, strength 56, willpower 64): *Emergency Water Cannon, stationary/medium, brief/brief, water impact harm 55 plus remove (cooling). Repelling Slam, closing/contact, brief/brief, displace 44. **Crushing Kick**, stationary/contact, prolonged/prolonged, compression harm 36 (the charged act). **Water Sweep**, stationary/contact, a small sweep, brief/repeatable, water harm 58 to everyone it reaches plus slowed (likely).

### Sim, 200 greedy runs

The second column is the pass 3 resolver (the committed code before this pass) run on the 0.7.0-3 kits with the first seeds, so the release's drift and pass 4's rules can be told apart.

| row | 0.7.0-1 (pass 3 rules) | 0.7.0-3, first seeds, pass 3 rules | 0.7.0-3, first seeds, pass 4 | **0.7.0-3, decision 37 seeds, pass 4 (applied)** |
|---|---|---|---|---|
| win rate | 98.0% (196 won, 4 lost) | 79.0% (158 won, 42 lost) | 76.0% (152 won, 48 lost) | **92.0% (184 won, 16 lost)** |
| rounds / encounter | 5.26 | 6.42 | 6.45 | 5.66 |
| Desperate strike | 0.0% of 16,298 | 2.3% of 18,663 | 2.2% of 18,628 (all Graviclaw's) | 0.0% of 16,996 |
| opportunities with no legal move | 4 | 0 | 0 | 17 (0.1%) |
| machine charges landing | 117 of 1,724 (6.8%) | 388 of 3,123 (companion charges in the denominator) | 415 of 2,138 (19.4%) | 223 of 1,805 (12.4%) |
| interruptions bind / displace | 183 / 1,215 | 563 / 1,109 | 516 / 1,111 | 461 / 895 |
| pre-emptive pulls (broke a charge) | 2,410 (1,215) | 3,311 (1,109) | 3,364 (1,111) | 1,590 (559) |
| binds landed / missed | 80.7% (1,731 of 2,145) | 79.0% (866 of 1,096) | 77.9% (848 of 1,089) | 69.9% (743 of 1,063) |
| conditions applied per group | binding 1,731, degrading 1,108 | binding 866, degrading 1,350 | binding 848, degrading 1,331, senses 1,040 | binding 743, degrading 1,112, **tempo 1,291, senses 764** |
| applications resisted or blocked | 1,516 | 1,881 | 3,374 | 3,247 |
| degrade share of companion damage taken | 7.3% (2,576 of 35,229) | 6.2% (3,004 of 48,749) | 5.9% (2,936 of 49,728) | 6.6% (2,671 of 40,719) |
| opportunities lost to entranced | 0 | 0 | 0 | 0 |
| companion opportunities under paralysis | 0.0% (5) | 0.1% (14) | 0.0% (8) | 0.1% (17) |
| companion remove: cleared / found nothing | 0 / 800 | 0 / 799 | 0 / 800 | 0 / 800 |
| targets skipped as concealed | 0 | 0 | 0 | 0 |
| reactions fired | contact 1,726 | contact 1,845 | contact 1,799 | contact 1,858 |
| reaction share of companion damage taken | 19.1% (6,715 of 35,229) | 13.2% (6,442 of 48,749) | 13.4% (6,657 of 49,728) | 16.5% (6,723 of 40,719) |
| strikes on the guardian, contact / ranged | 3,825 / 1,471 | 4,151 / 2,484 | 4,007 / 2,408 | 3,908 / 1,892 |

New rows (first seeds, then the applied decision 37 seeds):

| row | first seeds, pass 4 | **decision 37 seeds (applied)** |
|---|---|---|
| conditions per group, new groups | senses 1,040 | **tempo 1,291 (Water Sweep's slow), senses 764 (Blinding Shot)**, shock 0 |
| opportunities lost to stunned / charges broken by shock / stumbles | 0 / 0 / 0 | 0 / 0 / 0 |
| area hits per area move | none (Slowing Field never ordered) | **Water Sweep: 1,950 uses, 2,256 recipients (306 reached only by the sweep), 0 squadmates** |
| drains healed / withheld | 0 / 0 | 0 / 0 |
| beneficial effects withheld from a foe | 0 | 0 |
| companion charges begun / releases landed | 955 / 722 (Graviclaw's Dark Signal) | **0 / 0** (Crushing Kick never ordered) |

**Reading.** The drop to 76% was the release, not the rules: the pass 3 resolver on the same first seeds read 79%, and pass 4's further three points sit inside one standard error (about three points at 200 runs). The release had taken the squad's every-round damage away: Graviclaw's slot went from Crushing Ram (repeatable) to the charged Dark Signal and it spent 402 opportunities on Desperate strike, Avilily's pecks and Hippochamp's harms all went to brief recovery, and encounters stretched to 6.45 rounds, so more machine charges began and landed (19.4%) and every loss came in the final chamber. Decision 37 puts an every-round harm back on each companion and the win rate returns to 92%: Desperate strike is at zero again, encounters are 5.66 rounds, and machine releases land 12.4% of the time; all 16 losses are still in the final chamber. It is six points under 0.7.0-1's 98%, but within the 86.5% to 93.5% range the single-seed counterfactuals measured, and, as the pass 1 note says, the greedy bot is not a first-time player. Pass 4's rules are now live on the squad in two groups: Water Sweep is ordered 1,996 times and resolves 1,950 (second only to Blinding Shot's 2,923 orders), slows 1,291 machines and catches a second machine 306 times; Blinding Shot blinds 764. The sweep never reaches a squadmate, because a sweep only reaches foes; only a burst on self does. Binds land less often (69.9%) because Avilily 1's second bind is `occasional`, where Avilily 6's was `likely`. The 17 opportunities with no legal move are Avilily's: bound, with Piercing Peck cooling and her signature spent, her only other moves close to contact, and a bound unit gets no Desperate strike. Shock, stumbles, drains and withheld effects stay structural zeros: no companion carries a source. Decision 36 is met on paper and not in play: Hippochamp's Crushing Kick (compression 36, charged, two-round cooldown) previews under Water Sweep every round, so the greedy bot never orders it. No lever moved beyond the ruled seeds.

Counterfactuals from the first seed check, measured with the same sim and a temporary seed override: Graviclaw 9 with the other first seeds read 93.5% (fails decision 37); Graviclaw 17, 86.5%; Graviclaw 24, 59.5%; Graviclaw 9 with Hippochamp 5 (a charged Water Burst, a burst on self) read 70.0%, with the burst reaching a squadmate 1,361 times in 938 uses. That last row is why decision 37 bars a burst on self from being the charged act.

### Presentation

The planning preview names every squadmate an area would also hit ("also hits Avilily and Crystorn") beside the count of extra foes ("reaches 2 more"); the inspector adds "Right now it also hits ..." under a burst on self; and a burst's move card carries a "Hits squadmates" line in the recoil slot. No companion in the applied squad carries a burst, so these show only for the wider roster and fitted tests.

### Friction reported

- **The applied squad never charges.** Decision 36 is satisfied by Crushing Kick, but the greedy bot orders damage by preview and a 36-intensity charged kick never out-previews Water Sweep, so the player-side charge-up is exercised by the tests and a human, not by the sim. If the charge should be felt in the sim, the lever is the policy (value a release by its landed damage over two opportunities) rather than the seeds.
- **Avilily can be locked out.** 17 opportunities with no legal move, all while bound: Avilily 1's every-round harm and second bind both close to contact. Decision 37 checks that an every-round harm exists, not that one is legal while bound.
- **Status-only moves never get ordered by the greedy bot,** so any field or signal whose value is not damage is invisible to the sim. Water Sweep made the tempo group measurable only because it also harms.
- **Crystorn's signature is never ordered,** because the derived Blinding Shot (light harm 73, repeatable) out-previews Gem Radiance (light harm 68, brief). A derived ordinary act stronger than the signature is a creature-model friction: the signature should read as the creature's best act.
- **Four species lose an action every seed to ally targeting** (Figzy, Shuntara, Sonalloy, and Smokat to traversal); none is in the squad. Issue #299 is the next pass.

## Pass 5 contract: ally targeting, 2026-09-23

Nick, 2026-09-23: "proceed with your work", after ruling that Hypnopet may harm and heal. Ally targeting (issue #299) was the gap every earlier pass named: Figzy, Shuntara, Sonalloy and Smokat lose an action on every seed, and the roster now carries real healers. This pass lets a companion aim a helpful move at a squadmate, keeps self-defense, self-repair, ally protection, ally healing and revival distinct, and checks that a healer-free crew still wins. Every decision is a recommended, overridable lever.

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 38 | **Helpful and hostile effects.** Helpful: restore, protect, remove, and a guarding, mending or focused status. Hostile: harm, displace, and every other status. `remove` counts as helpful: this game only lets it clear conditions, and aimed at a foe it can strip the foe's guards, so it is also legal at a foe. | 80% | model doc, effect types; decision 17 |
| 39 | **Who a move may be aimed at.** An other-targeted move may be ordered at a standing squadmate when at least one of its target-recipient effects is helpful, and at a foe when at least one is hostile or is `remove`. A move with both may be aimed at either. Nobody aims a move at a fallen unit; revival stays the camp's action. | 85% | issue #299, "keep revival distinct" |
| 40 | **What lands.** Aimed at a squadmate, only the helpful effects resolve; aimed at a foe, only the hostile ones and `remove` (decision 35 already withholds helpful effects from foes). Self-recipient effects always resolve. Area effects keep decision 33's reach; a helpful area effect reaches squadmates in its geometry and is withheld from foes, and a hostile one keeps reaching whoever the geometry covers. | 75%, the model applies every inherent effect with no filter; this game filters by aim so a heal never wounds and a strike never heals | model doc, "Areas and persistence" |
| 41 | **Readings.** Restore on a squadmate heals `intensity` on the harm curve, capped at its max HP. Protect on a squadmate gives it the ward reading a self protect already gets (`WARD_FACTOR`) through its next opportunity. Statuses apply by their group rules. A redirect never switches sides: if an ally-aimed target falls, the order retargets to another standing squadmate in line order, or lapses if none stands. | 85% | pass 1 ward; decision 16's retargeting |
| 42 | **The enemy planner does not change.** Machines have no helpful moves. | 95% | cards.json |
| 43 | **The sim's greedy policy prices more than damage.** It keeps its current order (reactive bind on a charger, pre-emptive pull on a known charger) and then scores every legal (move, target) pair: harm by preview; a charged harm by its preview halved for the round it costs; a heal by the HP it would restore on a squadmate below half health; a remove by the conditions it would clear on a squadmate (binding and shock first); a protect or guard by the harm the target's most dangerous attacker previews against it, halved; a hostile status by a fixed value per group (`SIM_STATUS_VALUE`, a sim-only table). It takes the best. This is a measurement tool, not the game; it is how the charged, status and support rules stop being structural zeros in the tables. | 70% | pass 4: the sim never ordered Crushing Kick or Crystorn's signature |
| 44 | **Healer-free crews still win.** The sim runs the shipped squad and a squad with every helpful move removed from the companions' legal orders; support should make a run easier, never mandatory. Report both. | 90% | issue #299 |

## Pass 5: what it measured, 2026-09-23

Measured on `generation-0.7.0-4` (Hypnopet may heal; the four companions' kits are unchanged from pass 4). Save format version 5; version 4 saves are rejected, because a version 5 history can carry an order that names a squadmate.

### How the decisions were read

Where the contract left a choice open, the build took the reading below. Each is a lever or a one-line change.

- **Helpful and hostile (38).** `helpful` and `hostile` live in the seam (`reading.ts`). An unsupported effect is neither. Aimed `protect` and `restore` are now supported readings; the two pass 4 reasons ("protection only guards its user here", "restoration would mend a foe") are gone.
- **Who an order may name (39).** "Target-recipient effects" is read as every effect that reaches the selected target: `target` effects and `area` effects, because an area's recipients always include the target (decision 33). Without that reading a healing field could never name a squadmate. A squadmate means another standing unit on the performer's side, never the performer itself (v5 `targeting: other`). A move acting only on its user (Ground Anchor) keeps the nominal foe target it always carried. Concealment hides a unit from its foes only; its own side can still name it. `legalMoves(u, table)` drops a move with no legal target standing (a heal while the performer stands alone); without the table it answers as before, which is what the enemy planner reads.
- **What lands (40).** Aimed at a squadmate, only helpful effects (and effects on the performer) resolve; nothing strikes, no withheld event is written for the hostile effects the aim left out, and concealment does not break. Aimed at a foe, the move resolves as in pass 4, with decision 35's per-recipient withholding. `remove` is side-neutral: it clears whatever answers to it on every recipient it reaches. A helpful area aimed at a squadmate reads its geometry along the performer's own line, the performer left out; a burst on self still reaches every foe (withheld) and the performer's neighbors. A helpful status is not an affliction, so it never provokes a contact reaction.
- **Readings (41).** Restore uses `restorePreview` capped at the squadmate's missing HP. Protect on a squadmate sets the same `ward` flag a self protect sets, so it is spent at the start of the squadmate's next opportunity. "Through its next opportunity" and "until" differ only for a reaction answering the squadmate's own strike during that opportunity; the build takes the self-ward reading the decision names. A redirect walks the squadmate line in fixed order, the performer left out; when no squadmate stands the order lapses with a new `lapsed` event, no cooldown starts, no signature is spent, and a lapsing release disperses its charge. A disoriented unit's stumble stays on the side its order named.
- **Enemy planner (42).** Unchanged; a test reads every card and finds no move that may name a squadmate.
- **Sim policy (43).** `pairValue` in `devtools/powerworksSim.ts`. The harm term keeps the knockout bonus passes 1 to 4 priced a preview with, so only the new terms differ. A pair's value is the sum of the terms its aim lets resolve. A guard is priced through its declared scope (`guardedThreat` in the resolver, shared with the planning preview): a displacement immunity guards against no harm the machines carry, so Ground Anchor prices at zero. `SIM_STATUS_VALUE` is sim-only: shock 6, binding 5, attention 4, degrading 3, tempo 3, senses 3, concealment, guarding and mending 0; the same value prices clearing a condition of that group from a squadmate. The decision 20 tiebreak is superseded by the status value.
- **Healer-free crew (44).** Read as written: every move carrying any helpful effect is removed from the companions' legal orders, which takes Hippochamp's signature cannon and Graviclaw's Ground Anchor. A second variant keeps every move and only forbids naming a squadmate.

### Sim, 200 greedy runs

| row | pass 4 (applied) | **pass 5, shipped squad, pass 5 policy** | pass 5, healer-free (helpful moves removed) | pass 5, shipped squad, pass 4 policy |
|---|---|---|---|---|
| win rate | 92.0% (184 won, 16 lost) | **87.5% (175 won, 25 lost)** | 91.0% (182 won, 18 lost) | 92.0% (184 won, 16 lost) |
| rounds / encounter | 5.66 | 5.81 | 5.65 | 5.66 |
| Desperate strike | 0.0% of 16,996 | 0.0% of 17,180 | 0.0% of 17,098 | 0.0% of 16,996 |
| opportunities with no legal move | 17 | 15 | 2 | 17 |
| machine charges landing | 223 of 1,805 (12.4%) | 369 of 1,464 (25.2%) | 295 of 1,550 (19.0%) | 223 of 1,805 (12.4%) |
| companion charges begun / landed | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| interruptions bind / displace | 461 / 895 | 210 / 741 | 152 / 930 | 461 / 895 |
| binds landed / missed | 69.9% (743 of 1,063) | 54.8% (2,197 of 4,008) | 56.5% (2,123 of 3,757) | 69.9% (743 of 1,063) |
| conditions applied per group | binding 743, degrading 1,112, tempo 1,291, senses 764 | binding 2,197, degrading 987, tempo 1,422, senses 765 | binding 2,123, degrading 927, tempo 2,740, senses 774 | binding 743, degrading 1,112, tempo 1,291, senses 764 |
| orders naming a squadmate | (not possible) | 0 | 0 | 0 |
| heals on squadmates (HP restored) | (not possible) | 0 (0) | 0 (0) | 0 (0) |
| removes on squadmates: cleared / found nothing | (not possible) | 0 / 0 | 0 / 0 | 0 / 0 |
| protects on squadmates (harm prevented) | (not possible) | 0 (0) | 0 (0) | 0 (0) |

The second healer-free variant (every move kept, no order names a squadmate) reads identical to the shipped column on every row, because the shipped column never names a squadmate.

Orders per move (200 runs):

| companion | pass 5 policy | healer-free | pass 4 policy |
|---|---|---|---|
| Hippochamp | Water Sweep 1,926, Repelling Slam 1,400, Emergency Water Cannon 800 | Water Sweep 2,679, Repelling Slam 1,519 | Water Sweep 1,996, Repelling Slam 1,473, Emergency Water Cannon 800 |
| Crystorn | Blinding Shot 2,970, Repelling Punch 1,614 | Blinding Shot 2,839, Repelling Punch 1,668 | Blinding Shot 2,923, Repelling Punch 1,574 |
| Avilily | Binding Rake 3,047, Blossoming Ambuscade 800, Piercing Peck 338, Slashing Peck 2 | Binding Rake 2,805, Blossoming Ambuscade 800, Piercing Peck 442, Slashing Peck 5 | Piercing Peck 2,000, Slashing Peck 1,051, Binding Rake 482, Blossoming Ambuscade 426 |
| Graviclaw | Slashing Pinch 2,006, Gravity Draw 1,462, Gravity Pincer 800 | Slashing Pinch 1,955, Gravity Draw 1,585, Gravity Pincer 799 | Slashing Pinch 1,998, Gravity Draw 1,456, Gravity Pincer 800 |

Sensitivity of the one sim-only number that moved the result (shipped squad, pass 5 policy, only `SIM_STATUS_VALUE.binding` changed): binding 5, 175 won; binding 2, 176 won; binding 0, 184 won with every row equal to the pass 4 column.

**Reading.** Ally targeting changed nothing the squad does: the pass 4 policy under pass 5 rules reproduces the pass 4 column row for row, and the pass 5 policy never names a squadmate in 200 runs. The squad's only helpful other-aimed effect is the cooling rider on Hippochamp's signature, the signature is once per encounter and is always spent in the first round for its harm, and in the first round no squadmate is overheated yet. So heals, removes and protects on squadmates are structural zeros for this squad, as attention and concealment were in pass 2; they are exercised by the fitted tests and by the planning preview on a restored run (the paint check), not by the sim. Everything that moved came from the policy, not the rules: the flat binding value makes the bot spend Avilily's once-per-encounter consistent paralysis in round one on a machine that is not charging, and order her occasional Binding Rake over her pecks every round (3,047 orders). The consistent answer to a charge is then gone when the charge comes, so bind interruptions fall from 461 to 210, machine releases land twice as often (25.2% against 12.4%), and the win rate falls 4.5 points, all losses still in the final chamber. With binding priced at zero the policy returns exactly to pass 4. The healer-free crew wins 91.0%, inside one standard error (about 2 points at 200 runs) of the shipped 87.5% and above it, so support is not mandatory; removing the cannon moves Hippochamp's orders to Water Sweep, which slows twice as many machines. Decision 43's other two aims did not land either: the charged act (Crushing Kick) is still never ordered, because halving its preview only widens the gap to Water Sweep, and Crystorn's signature is still never ordered, because Blinding Shot carries a blind on top of a larger preview. No lever moved.

### Seam readings after pass 5, on generation-0.7.0-4

The same survey (`surveyActions`, 20 seeds per species, 640 records, 2,560 actions, 2,710 effects).

| reading | where it appears | what the seam does after pass 5 |
|---|---|---|
| dispersed | Smokat: Smoke Dispersal, 20 | **unsupported, named** (traversal, decision 16). The one move in 2,560 with nothing to resolve. |
| phased | none in 2,560 actions | unsupported (traversal). |
| ally-aimed protect | Figzy Steadying Intervention; Shuntara Conductive Lattice, Protective Stream, Protective Touch: 43 | **supported**: names squadmates only, ward on the squadmate (decision 41). |
| ally-aimed restore | Sonalloy Living-Alloy Seam; Yetimoth Restorative Ram: 21 | **supported**: names squadmates only, capped heal. |
| remove on a move that also harms or stands alone | Hippochamp Emergency Water Cannon; Hypnopet Empathic Steadying (stabilizing): 40 | **supported both ways**: a squadmate or a foe (decision 38). |
| focused aimed past its user | Hypnopet Focusing Signal: 1 | **supported**: names squadmates only (was withheld from a foe in pass 4). |
| guarding status on a move that harms | Sonalloy Reinforcing Lash: 1 (status only on this release) | **supported**: names squadmates only; aimed at a foe it would have nothing to deliver. |
| harm, displacement or a non-guarding status aimed at itself; protected without a scope; remove without methods | none in 2,560 actions | unsupported, named, as before (fitted tests only). |

Moves with nothing to resolve: Smoke Dispersal (20). Figzy, Shuntara and Sonalloy no longer lose an action on any seed. Hypnopet's heal does not appear in these 20 seeds; over 300 records of its own it rolls a restore on 26 (Restorative Signal 7, Restorative Touch 11, Restorative Response 8).

### Presentation

In planning, a move with a helpful effect makes every squadmate it may name a target on the stage ("Target Crystorn (squadmate)"), and the direction reads "Choose an enemy or a squadmate". The squadmate preview says what lands: "heals 12", "clears Overheated", "nothing to clear", "guards against about 8" (the largest harm a standing foe previews against it, through the guard's scope). It sits just above the squadmate's plaque, because allies stand low on the stage and a preview below their conditions left it. Captions name the helper ("Hippochamp heals Crystorn: 9 HP back", "Hippochamp clears it: Crystorn is no longer overheated"), a lapse has its own caption, and the combat record carries the resolver's text ("Hippochamp uses Emergency Water Cannon: Crystorn is no longer overheated."). The field guide gains "Helping a squadmate".

Issue #589 was fixed in the same pass. At 390x844 the page was 852px tall because the stage was a fixed 340px under a fixed stack; the page is now the viewport in play and the stage takes what the panels leave (332px), with a 300px floor. At 1280x720 the squad-panel inspect buttons sat under the select button's z-index 1 and now stack above it, and a 322px stage floor that pushed the commit footer 5px past 720 is now 300px. On the phone move tray the count cell was 40px wide in a 29px grid track; the track is now 40px, so "1 action" is whole.

### Friction reported

- **The shipped squad has no support to give.** Ally targeting is live and tested, but none of the four companions carries a heal, a protect or a guard aimed past itself; the only helpful other-aimed effect is a cooling rider on a signature that is always spent in round one. Hippochamp's derived Slowing Field or a Sonalloy or Shuntara on the roster would put support on the table; a squad-composition choice, not a rules one.
- **A flat status value misprices binding.** Binding here only answers a charge or stops a closing move, so a fixed value per group spends Avilily's consistent paralysis on a machine that is not charging. The lever is the sim's pricing (value binding by the target's charge state or its closing moves), not the game.
- **Decision 43 does not make the charge visible.** Halving a charged preview makes Crushing Kick less attractive, not more; the companion charge-up is still exercised only by tests.
- **The healer-free reading removes a signature.** Read as written, decision 44 takes the cannon's harm away with its removal, so that column also measures a lost damage move. The "no order names a squadmate" variant is the cleaner support-free reading; on this squad it equals the shipped column.
- **Hypnopet's heal is rare.** "Hypnopet heals" holds on about 9% of records (26 of 300) and on none of the 20 survey seeds, while its signature Empathic Steadying (stabilizing) appears on every record and would clear the guardian's paralysis from a squadmate.
- **The squadmate preview covers the lower art on a phone.** At 390px it is about 36px of a 63px figure, over the squad number. It is on the stage and readable; the alternative placements collided with the enemy preview above.

### Sim pricing correction, 2026-09-23

The first pass 5 policy read 87.5% because its flat binding value spent Avilily's once-per-encounter paralysis on an idle machine in round one, halving bind interruptions. A bind now earns its sim value only against a charging machine (the reactive rule already covers that case). Re-measured, 200 runs each:

| variant | win rate |
|---|---|
| shipped squad, pass 5 policy | 92.0% (184 won) |
| healer-free, every helpful move removed | 93.5% (187 won) |
| moves kept, no order names a squadmate | 92.0% (184 won) |

Support is not mandatory, which decision 44 requires, and on this squad it is also never used: none of the four companions carries a heal, protect or guard aimed past itself, and the cannon's cooling removal rides a signature the policy spends in round one. Ally targeting is in the game for the roster (Figzy, Shuntara, Sonalloy, Yetimoth, Hypnopet), not yet for the shipped four; a companion with real support is a squad-composition decision for a later pass. The charged act (Crushing Kick) and Crystorn's signature are still never ordered, because each previews below an every-round alternative.

## Pass 6 contract: the squad draft, 2026-09-23

Nick, 2026-09-23: "go ahead", on the recommendation that Powerworks stop testing the creature system through four fixed seeds. The derived roster offers 13 to 54 acts per species, and the fixed squad exercised almost none of the status, charge and support rules the last three passes built. A run now begins with a draft from real generated creatures. Every decision is a recommended, overridable lever.

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 45 | **The offer.** Before the first encounter the player sees `DRAFT_OFFER_SIZE` (8) creatures and picks `SQUAD_SIZE` (4). The offer is seeded from the run seed: species drawn without replacement from the canonical roster, each creature generated from seed `powerworks-draft-<runSeed>-<index>` on the canonical release. Same run seed, same offer. Since decision 53, each species is tried from its own seeds, `powerworks-draft-<runSeed>-<species>-<j>`. | 80% | Reclamation's draft; seeded replay contract |
| 46 | **Offer guarantees.** Every offered creature passes decision 37 (an every-round harm after its signature; since the 2026-09-23 amendment, one whose move-card power is at least 1, so no offered creature leans on a harm that previews 0). The offer as a whole holds at least one creature with a bind and one with a displace, so the intro's two answers to a charge are always draftable, and at least one with a helpful move it can aim at a squadmate. The offer is built constructively: draw candidates in seed order and fill each guarantee from the first qualifying candidate, then fill the rest in order; never reroll the whole offer. | 80% | decisions 36, 37, 39; the power-1 amendment: 180 of 3,200 offers on 0.7.0-4 had a power-0 every-round harm (Avilily 60 of 115), 0 of 3,200 after it |
| 47 | **The starter squad stays.** The briefing offers "Draft a squad" (the default action) and "Take the starter squad" (the current four seeds). The starter is the tutorial-safe path and the regression baseline. | 85% | the fixed four measured 92.0% |
| 48 | **Saves carry the picks.** A run starts from `{seed, squad}` where squad is either "starter" or the four offer indexes; the draft is the first command in the history. `SAVE_VERSION` 6; version 5 is rejected. Since decision 53, `SAVE_VERSION` 7; version 6 is rejected. | 90% | command-replay saves |
| 49 | **The draft screen is chrome, not the game.** It is setup, so it uses the site's design system (card, button and badge components, element hues only on element-tagged content, the accent only on the one forward action). Each offered creature shows its portrait, name, element, HP and speed as the game will read them, and its four actions as the game reads them, with any unsupported action marked plainly. Picks toggle; "Enter the facility" enables at four. One fixed screen at 1280x720 and 390x844, the list scrolling inside its own panel on a phone if it must. | 75% | DESIGN_SYSTEM.md tiers; games are one fixed screen |
| 50 | **Companion art.** The four painted companions keep their painted art; every other species uses the site's species portrait component inside the same frame. No new art is generated. | 90% | Reclamation figures |
| 51 | **Measurement.** The sim drafts two ways, 400 runs each: a random legal draft, and a greedy draft (pick by a simple score: every-round harm preview plus bind, displace and support presence). It reports win rate for each, the spread of win rates by species included (with counts), the most and least ordered acts, how often charged, status and support moves are ordered, and the starter squad's rate as the baseline. Win rates for the draft are expected to spread; the report says which species drag or carry, and nothing is retuned in this pass. | 80% | Reclamation's per-species simulator readout |
| 52 | **The stall rule.** When `ENCOUNTER_STALL_ROUNDS` (6) consecutive rounds of one encounter resolve in which no unit on either side loses HP and none falls, the squad is forced out: the run ends as a retreat (the existing `retreated` phase), earned practice XP is kept, and the record says the facility's defenses outlasted the squad after six rounds without progress. Healing is not progress; any lost HP resets the count; a result on the sixth round still counts. It replaced a first reading as a 20-round cap. | 80%, the coordinator's ruling on the evidence, 2026-09-23 | the first pass 6 sim on 0.7.0-4 had one random and one greedy run loop for 397 rounds with nothing dealing damage; on 0.7.0-5 a 20-round cap turned 26 random and 9 greedy wins into losses (36 and 14 runs forced out, 44 of them at the guardian), while no run loops once the power-1 filter is in; the no-progress trigger ends 1 run in 1,000 |
| 53 | **A fair offer.** One creature failing decision 37 does not make its species rare. For each species in shuffle order the offer tries up to `DRAFT_SEEDS_PER_SPECIES` (8) creatures, generated from `powerworks-draft-<runSeed>-<species>-<j>`, and takes the first that passes decision 37; the species is skipped on that pass only when none passes. The guarantees of decision 46 are still filled constructively from these candidates (one per species per pass, so they choose between species, never between creatures of one species), everything stays deterministic from the run seed, and offer indexes keep their meaning. The same seed now deals a different offer, so `SAVE_VERSION` is 7 and version 6 is rejected. | 85%, the coordinator's ruling on the evidence, 2026-09-24 | with one creature per species, 400 seeds on 0.7.0-5 offered Graviclaw 13 times and Hypnopet 11 against a median of 105 (range 11 to 160); with eight tries, 44 and 31 against a median of 105 (range 31 to 150), and no offer draws past the first pass |

## Pass 6: what it measured, 2026-09-23

Measured on `generation-0.7.0-5` (ordinary acts can no longer outclass a signature; 15 species had bands lowered), with the decision 37 power-1 amendment and the decision 52 stall rule in place. The first pass 6 run was on `generation-0.7.0-4` without either, and a second tried decision 52 as a 20-round cap; the headline numbers of both are kept as rows below and their full tables are in the branch history. Save format version 6; version 5 saves are rejected, because a version 6 history opens with the draft command. No game lever was retuned: the new levers are the draft's own (`DRAFT_OFFER_SIZE` 8, `SQUAD_SIZE` 4, `DRAFT_SEED_PREFIX`, `DRAFT_MAX_ROSTER_PASSES` 4) and decision 52's `ENCOUNTER_STALL_ROUNDS` 6.

### How the decisions were read

Where the contract left a choice open, the build took the reading below. Each is a lever or a one-line change.

- **The offer (45).** The roster (32 species of the canonical release) is shuffled by a stream seeded from `powerworks-draft-<runSeed>`, separate from the run's own rng, so drafting never moves a run's random draws. Candidate `k` is the species at position `k` of that order, generated from `powerworks-draft-<runSeed>-<k>`: the seed's index is the candidate's place in the draw, not its place in the offer, because a constructive offer skips candidates and so cannot know an offer index before it generates. The offer is listed in draw order and indexed 0 to 7; a draft command names those indexes. `draftOffer(seed)` is cached per seed.
- **The guarantees (46).** A candidate that fails decision 37 is skipped and never offered (`everyRoundHarms`, the same test the starter seeds were picked by, now requiring move-card power of at least 1). No species is offered twice. The three guarantees are filled in the order bind, displace, support, each from the first qualifying candidate in draw order unless an earlier pick already carries it; then the rest fill in draw order. "A helpful move it can aim at a squadmate" is decision 39's `aimsAtSquadmate`. If one pass over the roster runs out, the draw continues into a second pass with fresh seeds (`DRAFT_MAX_ROSTER_PASSES`); over 400 seeds the furthest candidate drawn was 101, so a second and third pass do happen when the support guarantee is late.
- **The power-1 amendment (37).** "Previews at least 1 against a standard machine target" is read as `basePower(u, m) >= 1`: the harm curve at the creature's attributes with a neutral matchup and no guard, the number the move card shows. On 0.7.0-5 it removes every power-0 every-round harm from the offer (0 of 3,200) and the starter still passes: Graviclaw's Slashing Pinch reads 9, Avilily's Slashing Peck 1, Crystorn's Blinding Shot 7, Hippochamp's Water Sweep 3.
- **The starter (47).** `createRun(seed)` still means the starter squad, so every earlier caller reads the same run; the starter draft is `toEqual` to `createRun(seed)`.
- **Saves (48).** `openRun(seed)` is a run in a new `draft` phase with no team; its only legal command is `{kind: "draft", squad}`, where `squad` is `"starter"` or exactly four distinct integer offer indexes, stored sorted so click order does not change the run. A draft on a run that already has a squad, anything but a draft on a run that has none, and a history that never drafts are all rejected.
- **The stall rule (52).** Checked after a round resolves with no result: the round made progress when some unit on either side has less HP than it had before the round (a fall is a loss of HP; healing is not progress). `Run.stalled` counts rounds in a row without progress and resets on any progress and at every encounter entry. At `ENCOUNTER_STALL_ROUNDS` the phase becomes `retreated`, the run carries `ended: "outlasted"`, XP is untouched, and a final `outlasted` event and record line say "The facility's defenses outlasted the squad: 6 rounds without progress. The squad is forced out with N practice XP." A clear or a wipe on that round wins over the rule. The playback caption, the outcome title ("Forced out") and its copy name the rule. The sim counts these runs as losses.
- **Unit ids.** Each squad member's id is the shortest prefix of its species that no other member shares, first letter capitalized (Terragoyle, Foromeer, Xylum, Sonalloy read T, F, X, S; Venemist beside Vespersyn read Ven and Ves). They depend only on which four stand together, are letters only so they never meet a machine's letter-and-digit id, and the starter still reads G, A, C, H. All 35,960 sets of four species are checked.
- **Signatures.** A drafted species may carry its signature as a passive (Imprit's contact burn), so the "exactly one signature" check counts actions and passives together.
- **The draft screen (49).** `apps/web/src/pages/games/powerworksDraft.tsx`, `data-tier="chrome"`, rendered in place of the immersive page (outside `.pw`, whose unlayered `.pw button` rule would override every system component). It uses the navbar, Masthead, Card, Badge (element chip; `warn` for an action with no effect here), Toggle for the picks and one default Button for "Enter the facility". Each card shows the art, name, element chip, HP and speed exactly as `readCompanion` reads them, and each action as a base name plus one reading line in the body face: its move-card power, what else it does (binds, pulls, heals or shields a squadmate or itself, a status), melee (contact reach) or ranged, "closes in" when its approach is closing (what binding blocks), area, and its tempo in short words (each round, every 2nd, every 3rd, charges). The reading may wrap rather than cut off; at 1280x720 none wraps or truncates over the seeds checked. The same split runs through the whole game: the move card, its description and the inspector say "Melee attack" for contact reach and "Ranged attack" otherwise, add "that closes in" for a closing approach, draw swords or a crosshair by reach, and every binding text says moves that close in are blocked (before this, `melee` meant a closing approach, so a stationary contact strike read "Ranged attack"). At four picks the other toggles stay pressable and say to unpick one first, rather than being disabled, so every pick keeps its hit area. The briefing offers "Draft a squad" (primary) and "Take the starter squad"; restarting returns to the briefing, where the same seed deals the same offer.
- **Art (50).** The painted set is the starter four and the five machines (`PAINTED_SPECIES`). Every other species is `XalianImage`'s token silhouette inside the same `.pw-portrait` frame, filled with its element hue. The game's element icons now cover all fourteen elements, and the eight elements the intro never used take their accent and tint from the site's element tokens.
- **The sim (51).** `options.draft` is `"starter"`, `"random"` (four distinct offer indexes from a seeded stream) or `"greedy"`. The greedy draft picks one creature at a time by its best every-round harm's move-card power plus `SIM_DRAFT_ANSWER_VALUE` (bind 5, displace 5, support 3) for an answer the squad does not carry yet; ties go to the earlier offer index. The ordering policy is pass 5's, unchanged. "Charged" counts orders that begin a charge; "status" counts orders of a move carrying a supported status or bind; "support" counts orders of a move that can aim at a squadmate, whoever it named.

### Sim, the starter at 200 runs, each draft at 400

| row | starter squad (200) | random draft (400) | greedy draft (400) |
|---|---|---|---|
| first run, 0.7.0-4, no amendment, no stall rule: win rate | 92.0% (184 won) | 58.5% (234 won; 1 run looped 397 rounds) | 79.8% (319 won; 1 run looped 397 rounds) |
| decision 52 as a 20-round cap, 0.7.0-5: win rate (runs forced out) | 91.5% (0) | 58.3% (36 forced out, 32 at the guardian) | 78.8% (14 forced out, 12 at the guardian) |
| **win rate** | **91.5% (183 won, 17 lost)** | **64.8% (259 won, 141 lost)** | **81.0% (324 won, 76 lost)** |
| after decision 53 (per-species seed retries), 0.7.0-5: win rate (runs forced out) | 91.5% (183 won, 17 lost; 0) | 62.8% (251 won, 149 lost; 2) | 79.3% (317 won, 83 lost; 0) |
| runs forced out by the stall rule (counted lost) | 0 | 1 | 0 |
| runs reaching the final chamber | 200 | 365 | 391 |
| rounds / encounter | 5.76 | 6.90 | 5.84 |
| longest run, rounds | 31 | 105 | 63 |
| runs stopped at the sim's 400-step guard | 0 | 0 | 0 |
| Desperate strike | 0.0% of 17,380 | 0.0% of 36,617 | 0.0% of 33,861 |
| opportunities with no legal move | 10 | 5 | 1 |
| machine charges landing | 225 of 1,823 (12.3%) | 712 of 3,786 (18.8%) | 593 of 3,898 (15.2%) |
| interruptions bind / displace | 457 / 918 | 323 / 2,363 | 148 / 2,776 |
| orders | 17,370 | 36,612 | 33,860 |
| orders beginning a charge | 252 (1.5%) | 319 (0.9%) | 117 (0.3%) |
| companion charges begun / released | 252 / 24 | 299 / 262 | 108 / 74 |
| orders of a status-carrying move | 5,687 (32.7%) | 8,459 (23.1%) | 7,485 (22.1%) |
| orders of a support move | 800 (4.6%) | 717 (2.0%) | 1,221 (3.6%) |
| orders naming a squadmate | 0 (0.0%) | 445 (1.2%) | 775 (2.3%) |
| heals on squadmates (HP) | 0 (0) | 128 (901) | 172 (1,263) |
| protects on squadmates (harm prevented) | 0 (0) | 312 (300) | 584 (576) |
| removes on squadmates that cleared something | 0 | 0 | 0 |
| conditions applied per group | binding 721, degrading 1,174, tempo 1,502, senses 807 | binding 1,417, degrading 3,669, guarding 660, attention 857, concealment 22, shock 477, tempo 448, senses 428 | binding 1,159, degrading 2,877, guarding 580, attention 547, concealment 9, shock 366, tempo 597, senses 469 |
| opportunities lost to stunned / entranced | 0 / 0 | 388 / 190 | 304 / 68 |
| reaction share of companion damage taken | 16.3% | 7.9% | 11.1% |
| degrade share of companion damage taken | 7.0% | 8.4% | 8.4% |

Win rate by species drafted (the squad's result counted once for each of its four members; small counts are noisy):

| species | random draft: win rate (won of drafted) | greedy draft |
|---|---|---|
| terragoyle | 97.0% (32 of 33) | 98.0% (50 of 51) |
| xylum | 92.9% (65 of 70) | 92.9% (118 of 127) |
| kosanos | 89.5% (68 of 76) | 93.5% (101 of 108) |
| frackworm | 83.3% (30 of 36) | 95.7% (44 of 46) |
| sonalloy | 82.2% (60 of 73) | 87.6% (113 of 129) |
| scalatto | 77.6% (52 of 67) | 93.1% (67 of 72) |
| foromeer | 77.0% (47 of 61) | 85.6% (89 of 104) |
| neph | 76.9% (10 of 13) | 100.0% (8 of 8) |
| thirstaserp | 76.0% (38 of 50) | 87.0% (20 of 23) |
| luceras | 73.4% (47 of 64) | 95.2% (20 of 21) |
| codazzo | 73.4% (58 of 79) | 79.3% (23 of 29) |
| hippochamp | 70.4% (57 of 81) | 85.1% (114 of 134) |
| drilltail | 67.2% (41 of 61) | 86.8% (33 of 38) |
| crystorn | 66.0% (35 of 53) | 76.8% (73 of 95) |
| ectoghoul | 63.6% (14 of 22) | not drafted |
| voltish | 60.0% (42 of 70) | 81.4% (57 of 70) |
| bioflim | 60.0% (24 of 40) | 84.8% (39 of 46) |
| smokat | 57.1% (44 of 77) | 73.8% (59 of 80) |
| chromocat | 57.1% (40 of 70) | 66.1% (39 of 59) |
| tizzie | 57.1% (8 of 14) | 76.9% (10 of 13) |
| imprit | 55.2% (32 of 58) | 46.7% (7 of 15) |
| figzy | 50.0% (9 of 18) | 90.0% (9 of 10) |
| vespersyn | 50.0% (20 of 40) | 77.8% (7 of 9) |
| hypnopet | 50.0% (3 of 6) | 100.0% (2 of 2) |
| yetimoth | 50.0% (18 of 36) | 73.7% (42 of 57) |
| graviclaw | 50.0% (3 of 6) | 76.9% (10 of 13) |
| venemist | 46.8% (22 of 47) | 53.3% (8 of 15) |
| dromeus | 46.7% (35 of 75) | 55.1% (27 of 49) |
| akinza | 42.9% (30 of 70) | 46.2% (12 of 26) |
| shuntara | 42.2% (27 of 64) | 64.4% (76 of 118) |
| newtapede | 39.5% (15 of 38) | 62.5% (15 of 24) |
| avilily | 31.3% (10 of 32) | 44.4% (4 of 9) |

Acts ordered most and least, per run the act was carried in (acts carried in at least 10 runs):

| draft | most ordered | least ordered |
|---|---|---|
| random | Crystorn Light Shot 19.5, Crystorn Blinding Shot 18.4, Voltish Electric Shot 17.8, Newtapede Repelling Squeeze 17.2, Codazzo Repelling Lash 16.7, Chromocat Light Shot 16.5 | Smokat Smoke Dispersal 0.0 (77), Imprit Fire Burst 0.0 (10), Avilily Heavy Sweep 0.0 (10), Crystorn Light Burst 0.1 (18), Akinza Night Stalk 0.3 (70), Neph Benthane Chill Jet 0.5 (13) |
| greedy | Voltish Electric Swipe 17.5, Crystorn Light Shot 16.6, Crystorn Blinding Shot 15.6, Voltish Stunning Swipe 15.5, Chromocat Light Shot 15.0, Yetimoth Ice Shot 14.7 | Smokat Smoke Dispersal 0.0 (80), Scalatto Heavy Sweep 0.0 (22), Smokat Heavy Sweep 0.0 (14), Graviclaw Ground Anchor 0.0 (13), Crystorn Crushing Gore 0.0 (12), Terragoyle Rock Burst 0.0 (12) |

The offer itself, over 400 seeds on 0.7.0-5: codazzo 160 offers, hippochamp 159, chromocat 153, sonalloy 150 at the top; neph 35, figzy 31, tizzie 27, graviclaw 13 and hypnopet 11 at the bottom. Between the two runs (the release and the power-1 amendment together) Avilily falls from 115 offers to 60 and Ectoghoul from 84 to 44; no offered creature now has a power-0 every-round harm (0 of 3,200, against 180 on 0.7.0-4).

**Reading.** The starter reads 91.5%, half a point under pass 5's 92.0%, and that movement is the release, not pass 6: on 0.7.0-5 the starter's charged act now gets ordered (252 charges begun, against none on 0.7.0-4), and the stall rule never ends a starter run. A random draft wins 64.8% and a greedy one 81.0%, so the draft decides a large share of the outcome, and the greedy score (every-round harm plus the two charge answers and a support) closes most of the gap to the hand-picked starter but stays ten points under it. The stall rule does what the 20-round cap did not: it ends one run in 1,000 (a random draft in sector 3, a run that also lost with no rule at all), where the cap forced out 36 random and 14 greedy runs and turned 26 and 9 of them from wins into losses. Long fights that keep landing damage now run to their end (the longest random run is 105 rounds, the longest greedy 63), and with the power-1 filter no run loops, so no run reaches the sim's 400-step guard. Drafted squads still lose earlier than the starter, which never does: 35 random and 9 greedy runs fall before the final chamber. The species that carry are bulky creatures with a strong every-round harm and one of the charge answers built in: Terragoyle (97% and 98%), Xylum (93% and 93%, a bind and a pull on one body), Kosanos (90% and 94%) and Frackworm (83% and 96%). The ones that drag are the light or narrow kits: Avilily (31% and 44%), Newtapede (40% and 63%), Shuntara (42% and 64%), Akinza (43% and 46%) and Dromeus (47% and 55%). Shuntara is still the clearest case: the greedy draft takes her 118 times for the support guarantee, while every protect on a squadmate across the 400 greedy runs prevented 576 damage, under two points per run. The rules the last three passes built are now reached by creatures: drafted companions begin 299 and 108 charges; stuns and trances cost the machines 388 and 190 opportunities in the random draft; a squadmate is named in 1.2% to 2.3% of orders, healing 901 and 1,263 HP and shielding 312 and 584 times. Charged moves stay under 1% of drafted orders and support moves 2% to 4%; no remove was ever aimed at a squadmate, because the policy only prices a remove that would clear something and a squadmate almost never carries a condition a drafted remove answers. The most ordered acts are repeatable ranged elemental shots (Light Shot, Electric Shot, Electric Swipe, Ice Shot, 15 to 20 orders per run carried), which never draw the guardian's contact reply; the least ordered are the unsupported Smoke Dispersal and the bursts on self (Fire, Light and Rock Burst), which the greedy policy never pays to hit its own squadmates with. Machine charges land more often in drafted runs (18.8% and 15.2% against 12.3%) because few drafted squads carry a consistent bind: bind interruptions fall from 457 to 323 and 148 while pulls carry the load. No game lever moved.

### Friction reported

- **A 20-round cap was the wrong shape for decision 52.** Measured first, it forced out 36 random and 14 greedy runs, 44 of them at the guardian, and 26 and 9 of those would have been wins; no run looped once the power-1 filter was in. Decision 52 is now the no-progress trigger, which ends one run in 1,000. The lever is `ENCOUNTER_STALL_ROUNDS`; a squad that heals itself while dealing nothing would still stall, which is the intent.
- **The support guarantee drafts a weak body.** Guaranteeing "a helpful move it can aim at a squadmate" pulls Sonalloy (150 offers) and Shuntara (140) into most offers, and the greedy score's support bonus picks Shuntara at a 64.4% win rate. On a four-slot squad a support body costs more damage than its shields prevent. The levers are `SIM_DRAFT_ANSWER_VALUE.support` for the sim, and the guarantee itself for the game.
- **Graviclaw and Hypnopet are almost never offered.** Three of Graviclaw's four actions are guaranteed, so it rarely rolls a repeatable harm: 13 offers in 400 seeds. Hypnopet (11), Tizzie (27), Figzy (31) and Neph (35) are nearly as rare. A player who liked the starter's Graviclaw will rarely see one to draft, and most drafted squads are drawn entirely as silhouettes. Decision 53 answers the offer side of this (below): Graviclaw now appears 44 times in 400 seeds, Hypnopet 31.
- **Avilily is the weakest body the offer carries.** After the amendment she qualifies only on a seed whose every-round peck reads power 1 or more; the starter's Avilily passes with Slashing Peck at exactly 1. She still binds, which is why the offer keeps her.
- **Unsupported acts ride along.** Smokat's Smoke Dispersal (traversal) is carried in 77 random and 80 greedy runs and never ordered; the card marks it "No effect here", as decision 49 asks.
- **The briefing scrolls.** At 1280x720 the briefing's starter roster sits below the fold (page height 836) and at 390x844 the page is 1,019 tall. The forward action is in view at both sizes; the layout is the pre-pass-6 briefing with a second key on the same row.

## Decision 53: a fair offer, 2026-09-24

The pass 6 offer generated one creature per species per run seed, and a species whose one creature failed decision 37 was skipped. A species whose kit is mostly guaranteed rarely rolls a repeatable harm on its free slots, so the skip landed on the same few species every time: over 400 seeds Graviclaw was offered 13 times and Hypnopet 11, against a median of 105. The offer should present species fairly; one creature failing a game filter should not make its whole species rare.

### How it was read

- `draftCandidate(seed, k)` is the species at `k` in the shuffled roster (unchanged, `draftOrder`), as the first of `DRAFT_SEEDS_PER_SPECIES` (8, a new lever) creatures, generated from `powerworks-draft-<runSeed>-<species>-<j>` (`draftSeed`), that passes decision 37. It is null, and the species skipped on that pass, only when none of the eight passes. The offer entry records the try that passed (`attempt`).
- `DRAFT_MAX_ROSTER_PASSES` keeps its meaning: pass `p` over the roster tries `j` from `8p` to `8p + 7`, so a later pass never repeats a creature. Over 400 seeds no offer draws past the first pass (the furthest candidate is 25, against 101 before).
- The guarantees of decision 46 are filled exactly as before, from the candidates in draw order. A species offers one candidate per pass, so a guarantee never reaches past a species' first passing creature to a later one that happens to carry a bind; the guarantees choose between species.
- Offer indexes keep their meaning (a draft command names four of the eight listed in draw order), but the same seed now deals a different offer, so `SAVE_VERSION` is 7 and a version 6 history is rejected the way earlier versions were.
- `surveyOffer` and `formatOfferSurvey` in `devtools/powerworksSim.ts` print the table below (the sim test file runs it at 400 seeds).

### The offer over 400 seeds

Before: min 11, median 105, max 160. After: min 31, median 105, max 150. Every offer holds eight creatures, so the total is 3,200 either way. The "before" pass column counts, for each species, the run seeds whose one first-pass creature passed; the "after" pass column counts the run seeds where one of its eight tries passed, whether or not the offer reached it.

| species | offers before | offers after | first-pass seeds whose one creature passed, before | first-pass seeds with a pass within 8 tries, after | skipped after (no try passed) | mean passing try |
|---|---|---|---|---|---|---|
| shuntara | 140 | 150 | 159 | 395 | 5 | 1.33 |
| sonalloy | 150 | 140 | 182 | 400 | 0 | 0.96 |
| hippochamp | 159 | 123 | 206 | 400 | 0 | 0.94 |
| bioflim | 94 | 117 | 162 | 399 | 1 | 1.23 |
| drilltail | 117 | 117 | 203 | 399 | 1 | 0.84 |
| codazzo | 160 | 114 | 259 | 400 | 0 | 0.53 |
| vespersyn | 86 | 114 | 134 | 379 | 21 | 1.72 |
| voltish | 139 | 113 | 245 | 400 | 0 | 0.65 |
| chromocat | 153 | 110 | 234 | 399 | 1 | 0.64 |
| dromeus | 141 | 110 | 249 | 400 | 0 | 0.66 |
| kosanos | 138 | 110 | 248 | 400 | 0 | 0.64 |
| thirstaserp | 95 | 109 | 159 | 393 | 7 | 1.38 |
| smokat | 140 | 108 | 244 | 400 | 0 | 0.66 |
| akinza | 136 | 106 | 250 | 398 | 2 | 0.73 |
| crystorn | 99 | 106 | 178 | 397 | 3 | 1.22 |
| scalatto | 140 | 105 | 224 | 398 | 2 | 0.79 |
| venemist | 101 | 105 | 187 | 399 | 1 | 0.93 |
| terragoyle | 73 | 102 | 153 | 393 | 7 | 1.40 |
| imprit | 109 | 101 | 187 | 396 | 4 | 0.94 |
| yetimoth | 64 | 99 | 125 | 374 | 26 | 1.88 |
| frackworm | 71 | 97 | 145 | 388 | 12 | 1.68 |
| foromeer | 135 | 96 | 244 | 400 | 0 | 0.63 |
| xylum | 141 | 96 | 257 | 400 | 0 | 0.67 |
| luceras | 116 | 95 | 205 | 398 | 2 | 0.91 |
| avilily | 60 | 93 | 103 | 359 | 41 | 1.86 |
| newtapede | 82 | 90 | 153 | 395 | 5 | 1.30 |
| neph | 35 | 85 | 72 | 313 | 87 | 2.53 |
| figzy | 31 | 73 | 44 | 206 | 194 | 2.96 |
| ectoghoul | 44 | 72 | 73 | 304 | 96 | 2.77 |
| tizzie | 27 | 69 | 43 | 234 | 166 | 2.90 |
| graviclaw | 13 | 44 | 21 | 163 | 237 | 3.09 |
| hypnopet | 11 | 31 | 13 | 95 | 305 | 2.97 |

### Species still rare, and why

- **Hypnopet (31, under a third of the median).** Its two authored acts are its signature, Empathic Steadying (a remove), and the guaranteed Chromatic Horn Trance (an entrance, no harm), so only two ordinary slots are rolled, and its mechanisms (stabilizing, focus, trance) carry no harm. About 45% of its creatures roll no ordinary harm at all, and a rolled harm is more often brief or prolonged recovery, or power 0, than repeatable. Roughly one creature in 18 to 30 passes, so eight tries pass on 95 of 400 seeds.
- **Graviclaw (44, above a third of the median, under half).** Three of its four actions are authored: the signature and the guaranteed Gravity Draw and Ground Anchor, both brief-recovery non-harms. Its one rolled slot has to be a repeatable harm of power 1 or more, which about one creature in 19 is; eight tries pass on 163 of 400 seeds.
- Tizzie (69), Ectoghoul (72) and Figzy (73) sit under the median for a milder version of the same reason: Tizzie's guaranteed Mind Strike and Ectoghoul's Ectoplasm Blast are brief-recovery harms, and Figzy's guaranteed Open-Handed Force is a brief non-harm, so their free slots have to supply the repeatable harm.
- No species was edited. The game lever is `DRAFT_SEEDS_PER_SPECIES`; the other answer is the species' own kit (a repeatable authored harm), which is a species ruling, not a game one.
- Shuntara (150) and Sonalloy (140) are the most offered, because the support guarantee pulls them in, as pass 6 reported.

### Sim, after decision 53

The row "after decision 53" in the pass 6 sim table. The starter is untouched (91.5%, the same 183 wins, since it never reads the offer). The random draft reads 62.8% (from 64.8%) and the greedy draft 79.3% (from 81.0%); both moves are inside one standard error at 400 runs (about 2.4 and 2.0 points), so the fair offer does not change how much the draft decides. Two random runs are forced out by the stall rule, none greedy; the longest runs are 144 random and 75 greedy rounds, and none reaches the 400-step guard. The species that were almost never seen now appear often enough to read: in the random draft Graviclaw is drafted 24 times (83.3%), Neph 43 (86.0%), Hypnopet 16 (56.3%), Tizzie 33 (54.5%), Figzy 33 (51.5%) and Ectoghoul 37 (45.9%), against 6, 13, 6, 14, 18 and 22 before. In the greedy draft Graviclaw is taken 44 times at 90.9% and Tizzie 33 at 84.8%. The strong species keep carrying (Terragoyle 98.1% and 100%, Kosanos 83.9% and 96.8%, Xylum 90.5% and 95.3%) but some are offered less, since they no longer inherit the slots the rare species gave up (Xylum 141 offers to 96), and the weak ones still drag (Avilily 36.6% and 37.5%, Shuntara 39.0% and 60.3%, Dromeus 44.4% and 63.4%). No game lever moved.

### Friction reported

- **A removal's words miss a status the offer now reaches.** Seed 7's offer now carries Neph `powerworks-draft-7-neph-5`, whose Disorienting Sweep applies disoriented removable by stabilizing, but `REMOVAL_WORDS.stabilizing.ends` in `apps/web/src/pages/games/powerworksVisuals.tsx` lists paralyzed, blinded, frightened and stunned only, so a Steadies card would not name Disoriented. `powerworksVisuals.test.tsx` ("names every removal in plain words") catches it. The fix is one word in that table.

## Pass 7: a look-ahead player, 2026-09-24

Nick, 2026-09-24: "go", on the recommendation to make the simulated player smarter so balance readings stop depending on its hand-set prices. The pass 5 policy prices every order with fixed values (`SIM_STATUS_VALUE`, the rest of `pairValue`) and picks the best one round at a time. When it loses with a species, that can mean the species is weak or that the prices are wrong, and nothing in its numbers can tell the two apart. Pass 7 adds two measuring sticks beside it. Nothing in the game changed.

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 54 | **A look-ahead player and a random floor, sim-only.** `policy: "lookahead"` starts from the pass 5 orders and improves them one companion at a time: each candidate order (every legal order when there are at most 12, otherwise the best 2 targets of each move by the pass 5 price) is played forward with the squadmates' orders held, on 4 fresh sets of dice shared by every candidate, for the round being planned and 2 more under the pass 5 policy, and the order whose positions average best is kept. A position is worth, per standing unit, a half for standing plus its HP fraction, the squad's side for and the facility's against, and -100 once the run has ended. It never reads or advances the run's own rng, so it cannot see the real dice. `policy: "random"` gives any legal order uniformly (desperate strike only when nothing else is legal) from its own stream. The settings are `LOOKAHEAD` in `powerworksSim.ts`, a measuring stick and not a game lever. | 80% | `game-validation-principles.md` (naive-policy regret); the 8-dice, 4-round setting reads the same as 4 by 3 (below) |

`powerworksCompare.ts` plays the same seeds and drafts under each policy on worker threads and prints the tables below (`node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/devtools/powerworksCompare.ts --runs=400 --draft=random`). About 3 minutes for 400 look-ahead runs on 20 workers. Every rate carries a 95% interval.

### Choices matter: the three players on the same seeds

| squad | random orders | pass 5 | look-ahead |
|---|---|---|---|
| starter, 200 runs | 8% ±4 | 92% ±4 | 100% (200 of 200) |
| random draft, 400 runs | 37% ±5 | 63% ±5 | 91% ±3 |
| greedy draft, 400 runs | | 79% ±4 | 97% ±2 |
| random draft, look-ahead at 8 dice by 4 rounds | | | 90% ±3 |

The spread from random orders to the look-ahead is 54 points on a random draft and 92 on the starter, so the orders a player gives decide far more than luck does, and the pass 5 player leaves 28 points on the table. The stronger setting (twice the dice, one more round) reads the same 90%, so this kind of search has levelled off and its remaining losses are the squads and the dice, not too little search. The look-ahead moves off the pass 5 order in 30% to 32% of orders. What it chooses instead (random draft): a different harm 45%, a bind 20%, the same move at another target 20%, a status 10%, help for a squadmate 2%, other 2%, beginning a charge 1%. Support stays at 2% of orders under all three players, but the look-ahead heals nearly three times as much HP with those orders (1,869 against 678).

### The balance reading changes

Win rate of random-draft runs whose squad included the species (400 runs), lowest under the look-ahead first; intervals are 8 to 15 points at these counts.

| species | drafted | random orders | pass 5 | look-ahead |
|---|---|---|---|---|
| avilily | 41 | 15% | 37% | 78% |
| imprit | 45 | 27% | 56% | 78% |
| dromeus | 63 | 29% | 44% | 79% |
| figzy | 33 | 18% | 52% | 79% |
| shuntara | 77 | 19% | 39% | 81% |
| bioflim | 62 | 31% | 65% | 82% |
| venemist | 49 | 22% | 45% | 82% |
| ... | | | | |
| xylum | 42 | 67% | 90% | 100% |
| thirstaserp | 57 | 40% | 60% | 100% |
| frackworm | 53 | 74% | 89% | 100% |
| terragoyle | 53 | 91% | 98% | 100% |

- **Avilily and Shuntara were mostly misplayed.** Under the pass 5 player they read 37% and 39%, the two worst; under the look-ahead 78% and 81%, still at the bottom but inside the intervals of the next ten species. The species range narrows from 37 to 98 points under pass 5 to 78 to 100. Nothing in their kits needs retuning on this evidence.
- **Pass 5 misprices binding.** Its rule values a bind only against a charging machine. The look-ahead orders Avilily's binding acts 9.6 to 10.1 times per run carried, against 0.9 to 3.2 under pass 5, and a bind is a fifth of all its overrides. Binding a machine that would act this round is worth a lot, and the pass 5 price said it was worth nothing. Pass 5 is kept as written, as the naive baseline, not repaired.
- **Bulk carries under careless play.** Terragoyle squads win 91% even with random orders, Frackworm 74% and Xylum 67%, where the field averages 37%. They are the bulkiest drafted species (Terragoyle averages 73 HP and a best move-card power of 9.3 against Avilily's 30 HP and 1.0), and the machines pick targets at random, so a large body takes its share of hits and survives them. Under the look-ahead the gap closes to within the intervals. It is a forgiveness effect, not a ceiling one.

### The finding that matters: a player who plans rarely loses

A player that looks two rounds ahead wins 100% with the starter squad, 97% with a sensibly drafted squad and 91% with four random picks. A human who plans is somewhere between the pass 5 player and the look-ahead, so a thoughtful player may find Powerworks easy once the rules are learned. Nothing was tuned: how hard the facility should be for a player who plans is a design call for Nick, best made after he plays a few drafted runs. If it plays easy, the smallest levers are the machines' numbers in the later chambers (each machine's HP in the `rooms` rows of `cards.json`, and its harm in `templates`), measured until the look-ahead on a random draft lands where he wants it, which I would put at about 75%, so that both the draft and the orders keep deciding runs. Pass 8 (below) makes that tuning for drafted squads only: the look-ahead on a random draft now wins 75%, and the starter keeps its numbers.

## Pass 8: difficulty for a player who plans, 2026-09-24

**Withdrawn, 2026-09-24.** Nick: "I don't think we should be adding raw health multipliers or damage multipliers based on which creatures the user selected." The game will be played with a person's own creatures, so a handicap keyed to squad choice is the wrong kind of lever; the question is what makes one creature more worth taking than another, and whether every creature has a reasonable path to value in some squad. He also ruled that squad selection is out of scope for this game for now ("anything you build now to allow the user to select a squad is going to be throwaway code"): the run takes the preset squad. So `DRAFTED_MACHINE_HP_FACTOR` and `machineHp` are removed, every run reads the chamber rows as written, `SAVE_VERSION` is 9, and the draft screen (`powerworksDraft.tsx`) and the briefing's draft entry are gone; the briefing's one action is "Enter the facility". The engine's offer and draft command stay, because the simulator uses varied squads to measure what each species contributes (pass 9). The record below is kept as measured.

Nick approved tuning the facility harder on pass 7's finding that a player who plans almost never loses, with the target pass 7 recommended: the look-ahead on a random draft at about 75% (72% to 80% accepted) over 400 runs. Only machine numbers were open to move: no machine, companion, status lever or draft changed. The reading, the coordinator's ruling on the first measurement: the starter is the tutorial and keeps its numbers; a drafted squad meets a harder facility.

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 55 | **A drafted squad meets a harder facility; the starter keeps its numbers.** A run whose squad is not `"starter"` enters every chamber from the second on (room index 1 and up) with each machine's row HP multiplied by `DRAFTED_MACHINE_HP_FACTOR` (1.5) and rounded, max HP the same number: crawlers M3, M4 and M5 22 to 33, drones D2 and D4 24 to 36, the shield S2 30 to 45, the discharge unit V3 48 to 72, the guardian B4 110 to 165. Chamber 1 (M1, M2 at 22), every starter run, the `rooms` rows in `cards.json` and every template (harm, speed) are unchanged. The look-ahead on a random draft wins 75% ±4 (from 91% ±3); the starter reads exactly as before (pass 5 92%, look-ahead 100%). A drafted save replays against the new HP, so `SAVE_VERSION` is 8 and version 7 is rejected. | 80%, the coordinator's ruling on the evidence, 2026-09-24: the target is met with one lever, the curve holds, and the tutorial path is untouched | the tables below; `powerworksCompare.ts`, seeds 1 to 400 (starter 1 to 200) |

### What moved and why

One lever, `DRAFTED_MACHINE_HP_FACTOR` in `levers.ts`, read by `machineHp` where `enter` in `index.ts` builds a chamber's machines. The story is "past the service entrance, a drafted squad finds the facility's machines take longer to bring down." The HP bars read the scaled number through the unit, since `readCard` sets `max` to the HP it is given.

The first measurement scaled the `rooms` rows themselves, for every run. It hit the draft target with the same numbers as below, but the starter under the pass 5 player fell from 92% to 6% (12 of 200), 187 of its 188 losses at the guardian, while the look-ahead still won 99% with it. The starter is the tutorial-safe path (decision 47), so the factor now reads the squad: the starter keeps the rows as written, and only a drafted squad meets the harder machines.

Chamber 1 still teaches: no look-ahead run loses there, before or after, and its two crawlers are untouched for every squad. The guardian stays the climax: 69 of the 101 look-ahead losses on a random draft are in chamber 4, and a squad that reaches it loses there 19% of the time, against 4% to 5% in chambers 2 and 3.

Machine harm was tried first and does almost nothing to a player who plans. Every machine move is a closing move except the drone's Security beam, and a bound unit cannot use a closing move, so the look-ahead binds the machine that would act and its harm never lands. On seeds 1 to 200 the look-ahead won 183 at the old numbers; raising the guardian's and the discharge unit's harm by a third to a half (Clamp strike and Contact strike 70 to 100, Core surge 180 to 240, Capacitor rush 160 to 220) left it at 178. Raising the drone's harm (70 to 120, the one move a bind cannot stop) did more, 175, but it is a lever on chambers 2 and 4 at once and light hits the starter's Graviclaw for double. More HP works on the look-ahead because every extra round is another round it has to spend a bind or take a hit, and a drafted squad without a bind or a displace takes them.

Levers measured on the way, each applied to every run (seeds 1 to 200, wins of 200; the pass 5 starter column is the same 200 seeds with the starter squad, and shows what the setting would have cost the tutorial had it not been limited to drafted runs):

| setting | look-ahead, random draft | pass 5, starter |
|---|---|---|
| pass 7 numbers | 183 | 183 |
| guardian 150 HP only | | 159 |
| drone harm 70 to 120 only | 175 | 144 |
| crawler harm 70 to 100 (all chambers, chamber 1 included) | 170 | 121 |
| chambers 2 and 3 only: M3 30, D2 40, S2 44, V3 80, discharge harm 100 and 220 | 171 | 112 |
| the sand machines only: M3, M4, M5 40, S2 50 | 164 | 90 |
| drone harm 120 and D2, D4 32, S2 40, V3 64, B4 150 | 154 | 20 |
| **every machine of chambers 2 to 4 at 1.5x HP (shipped, drafted runs only)** | **153** | **12 (not shipped: the starter keeps 183)** |

At 400 runs, rows at 1.25x HP read 83% for the look-ahead on a random draft and 48% for pass 5 on a random draft.

**Why the starter could not take the harder numbers.** Every setting measured cost the pass 5 starter about five runs for each run it cost the look-ahead on a random draft, whether it moved HP, harm, one chamber or three. The starter meets the guardian and the discharge unit with Hippochamp (electric hits water for double) and Graviclaw (electric hits dark for 1.5x, and the drone's light hits it for double), and the pass 5 player binds only a charging machine, so a longer guardian fight is exactly what that squad cannot survive without planning. That is a property of the starter's elements, not of the chambers, and it is why the factor reads the squad rather than the rows.

### Sim, before and after, three commands

Random draft, 400 runs (`--draft=random --policies=random,pass5,lookahead`):

| | random orders | pass 5 | look-ahead |
|---|---|---|---|
| runs won, before | 147 (37% ±5) | 251 (63% ±5) | 362 (91% ±3) |
| **runs won, after** | **56 (14% ±3)** | **140 (35% ±5)** | **299 (75% ±4)** |
| runs outlasted (stall rule), before / after | 1 / 0 | 2 / 2 | 0 / 2 |
| rounds per run, before / after | 27.3 / 26.9 | 26.5 / 30.6 | 27.3 / 38.3 |
| encounters reached per run, before / after | 3.38 / 2.96 | 3.84 / 3.60 | 3.96 / 3.88 |
| heals on squadmates (HP), before / after | 207 (1,143) / 197 (1,084) | 92 (678) / 114 (844) | 271 (1,869) / 275 (1,887) |
| look-ahead moved off the pass 5 order, before / after | | | 32% / 35% |

Starter squad, 200 runs (`--draft=starter --policies=random,pass5,lookahead`), unchanged by design:

| | random orders | pass 5 | look-ahead |
|---|---|---|---|
| runs won, before | 16 (8% ±4) | 183 (92% ±4) | 200 (100% ±0) |
| **runs won, after** | **16 (8% ±4)** | **183 (92% ±4)** | **200 (100% ±0)** |
| runs outlasted (stall rule), before / after | 0 / 0 | 0 / 0 | 0 / 0 |
| rounds per run, before / after | 25.6 / 25.6 | 23.1 / 23.1 | 20.3 / 20.3 |
| encounters reached per run, before / after | 3.92 / 3.92 | 4.00 / 4.00 | 4.00 / 4.00 |

Greedy draft, 400 runs (`--draft=greedy --policies=pass5,lookahead`):

| | pass 5 | look-ahead |
|---|---|---|
| runs won, before | 317 (79% ±4) | 386 (97% ±2) |
| **runs won, after** | **223 (56% ±5)** | **355 (89% ±3)** |
| runs outlasted (stall rule), before / after | 0 / 1 | 0 / 0 |
| rounds per run, before / after | 22.8 / 29.2 | 23.1 / 33.2 |
| encounters reached per run, before / after | 3.94 / 3.87 | 3.98 / 3.96 |

### Losses by chamber, drafted squads

Runs lost in each chamber (the chamber the run ended in; a run forced out by the stall rule counts where it was forced out). The starter's losses are unchanged: random orders 0 / 0 / 17 / 167, pass 5 0 / 0 / 0 / 17, look-ahead none.

| draft and player | before: 1 / 2 / 3 / 4 | after: 1 / 2 / 3 / 4 |
|---|---|---|
| random draft, random orders (400) | 4 / 92 / 54 / 103 | 4 / 163 / 78 / 99 |
| random draft, pass 5 (400) | 2 / 18 / 21 / 108 | 2 / 51 / 54 / 153 |
| **random draft, look-ahead (400)** | **0 / 6 / 3 / 29** | **0 / 14 / 18 / 69** |
| greedy draft, pass 5 (400) | 0 / 9 / 4 / 70 | 0 / 17 / 20 / 140 |
| greedy draft, look-ahead (400) | 0 / 3 / 1 / 10 | 0 / 6 / 5 / 34 |

For the look-ahead on a random draft, the loss rate of the squads that reach each chamber is, before and after: chamber 1 0% and 0%, chamber 2 1.5% and 3.5% (of 400), chamber 3 0.8% and 4.7% (of 394 and 386), chamber 4 7.4% and 18.8% (of 391 and 368).

### Reading

The look-ahead on a random draft lands at 75% ±4, inside the target, and the draft still decides: a greedy draft wins 89%. The starter reads exactly as it did in pass 7, run for run, so the tutorial path forgives a greedy player (92%) and a planner never loses with it. The stall rule stays rare: 2 look-ahead runs and 2 pass 5 runs of 400 are forced out on a random draft, 1 pass 5 run of 400 on a greedy draft and none on the starter; drafted runs are longer (38 rounds for the look-ahead, from 27), not stuck.

Under the look-ahead the species spread widens from 78% to 100% to 56% to 100%, and no species collapses: the lowest are Chromocat and Shuntara at 56% (±14 and ±11), Ectoghoul 57%, Voltish 58% and Venemist 59%. The largest drops are Chromocat (92% to 56%), Ectoghoul (86% to 57%), Smokat and Voltish (89% and 85% to 62% and 58%); the bulky species still carry (Terragoyle and Xylum 100%, Frackworm 98%, Neph 95%). Avilily, the weakest under pass 5 in pass 6 and pass 7, reads 61% here, mid-pack among the low group. With random orders, Avilily, Akinza and Yetimoth squads win 1 run in 50.

### Friction reported

- **The starter and a drafted squad now face different facilities.** A player who clears the starter's guardian at 110 HP meets 165 the first time they draft. The briefing does not say so; if play shows the step is a surprise, the smallest answer is one line on the draft screen, not a number.
- **Machine harm is not a difficulty lever against a player who plans.** Every machine move but the drone's beam is closing, so binding answers all of them; raising their harm moves the look-ahead a few runs in 200. Harm stays a lever for how much a careless player is punished, not for how hard the facility is.

## Pass 9: what makes a creature worth taking, 2026-09-26

Nick, 2026-09-24, withdrawing decision 55: "I feel like you're putting too much emphasis on handicaps for selecting the creatures rather than identifying the mechanics that make one creature more desirable to use than another ... The bigger concern there is ensuring that things are relatively balanced and that we're implementing things in a way where each creature has a reasonable path towards providing value to a certain squad build." The run takes the preset squad; the simulator still drafts random squads, because that is how each species' contribution can be measured.

### How a species' value is measured

`powerworksCompare.ts --species` plays random drafts and fits each species' value to a squad: a run scores the encounters it cleared (0 to 4) plus, when it won, the share of the squad's HP left, and the least-squares additive model `score = base + the sum of the four species' values` (ridge 2) gives each species a value in encounters, centred so 0 is the average pick. Beside it, per run the species was in, `credit` records what it did: harm dealt to machines (degrading ticks it applied included), harm taken, HP healed and guards given to squadmates, machine opportunities denied (a stun or trance it applied, a closing move its bind stopped, a charge it broke), and knockouts. Every reading below is the look-ahead player (pass 7) over 1,200 random drafts, seeds 1 to 1,200; at these counts each species value carries roughly ±0.07 of noise, so a spread whose standard deviation is near 0.07 is about as even as this measure can show.

### What the baseline showed

Species values ran from -0.38 (Venemist) to +0.38 (Xylum), standard deviation 0.23. The value correlated with the species' element matchup against this facility (0.60), its move-card power (0.53) and its HP (0.49), and against its speed (-0.59, because the fast species are the small ones). Denying machine opportunities barely registered (-0.16): Hypnopet denied 10.8 per run and still sat at -0.20. Two of those drivers are game rules, not creatures:

- **Every physical strike took its performer's element.** The move record marks an elemental move with its own element; a claw, a kick or a ram carries none. Pass 1 read "no element" as "the creature's element", so a chemical creature's bite was chemical and did nothing to the light drone. The facility's machines are sand (140 HP a run), electric (158) and light (48), so fire, ice, chemical, electric and light species lost most of their harm here, physical and elemental alike: their harm per point of move-card power was 8 to 12 against 16 to 30 for sand, rock, plant and air.
- **Attributes counted twice in harm.** `acts.ts` already bands every harm and restore intensity by the performer's strength or willpower, and the game multiplied by `(0.5 + attr / 100)` again, so a low-strength creature was punished twice: Avilily's best harm read 1 where its intensity alone reads 1.9, Graviclaw's 8.7 where it reads 7.0.

With both fixed (below) the element correlation fell to 0.22 and the spread to 0.19, and what remained was body size: the bottom eleven were all light creatures (HP 30 to 46), because the machines chose targets uniformly and a small body falls to the same number of blows whoever it is, while its speed only decided when it acted.

### Decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 56 | **Physical harm is neutral.** A harm with no element of its own is 1 against every element (`PHYSICAL_HARM_NEUTRAL`); only an elemental move has a matchup. This is what the record says (an elemental move carries its element) and what Duel already does (typeless moves are neutral). Machines' physical strikes are neutral too. The move card's harm mark now says "Physical, so it lands the same on every element." | 85% | the element correlation 0.60 to 0.14 on its own; the move record's `element` field is absent exactly on physical moves |
| 57 | **Harm reads the record's intensity.** `HARM_ATTRIBUTE_WEIGHT` 0: harm and restore are `intensity / 10`, and the performer's attribute no longer multiplies it again. The machines sit at attribute 50, where the old curve was 1, so their numbers do not move. | 85% | the double count, measured per species above; the creature system owns how hard a creature hits, through its bands |
| 58 | **Nimble creatures slip blows.** A creature takes 1% less harm per point of speed it has over the attacker, at most 30% (`NIMBLE_PER_SPEED` 0.01, `NIMBLE_MAX` 0.3), deterministic like all harm (decision 6), and shown in every preview. Machines do not slip blows (`NIMBLE_MACHINES` false): a first reading that did cost slow, heavy companions up to 30% of every blow against the quicker machines and took the naive player's starter from 92% to 0%. | 75% | with 56 and 57 (two-way reading): spread 0.19 to 0.17, the speed correlation -0.63 to -0.26; as shipped with 59, spread 0.12 and speed -0.46 |
| 59 | **Machines lock onto large bodies.** A machine picks its target among the companions it may select with weight equal to the companion's max HP (`TARGET_SIZE_WEIGHT` 1), where it used to pick uniformly. A large body draws fire for the small ones behind it, so bulk becomes a way to protect a squad rather than only a way to survive. Targets stay hidden until they resolve. | 75% | with 56 and 57: spread 0.19 to 0.17; with the two-way 58 as well, 0.14; as shipped, 0.12 |
| 60 | **One facility HP lever.** Every machine's HP is its row HP times `MACHINE_HP_FACTOR`, rounded, for every run and every squad. 56 to 59 took companion harm away on balance (mostly from the heavy strikers the old curve and matchups favored), so the facility is set at 0.62 to put the naive (pass 5) player's run with the preset squad back where pass 8 had it: 93% against 92%. How hard the facility should be for a player who plans is still Nick's call (pass 7); this only keeps the difficulty he played from moving under the balance change. `SAVE_VERSION` is 10. | 80% | the sweep below |

The guide gains one section, "Size, speed and element", saying all three in plain words.

### Species value, like for like

Each row is the look-ahead over the same 1,200 random drafts at the pass 8 facility (`MACHINE_HP_FACTOR` 1), so only the rule changes differ.

| setting | lowest | highest | standard deviation | look-ahead wins |
|---|---|---|---|---|
| pass 8 (baseline) | -0.38 Venemist | +0.38 Xylum | 0.23 | 90% |
| 56 only | -0.52 Ectoghoul | +0.36 | 0.20 | 90% |
| 57 only | -0.43 | +0.43 | 0.25 | 88% |
| 56 and 57 | -0.30 Avilily | +0.40 Xylum | 0.19 | 89% |
| 56, 57, 58 (two-way, first reading) | -0.30 | +0.36 | 0.17 | 88% |
| 56, 57, 59 | -0.30 | +0.36 | 0.17 | |
| 56 to 59 (two-way 58) | -0.27 Vespersyn | +0.33 Xylum | 0.14 | 90% |
| **56 to 59 as shipped (one-way 58)** | **-0.24 Venemist** | **+0.29 Xylum** | **0.12** | **94%** |

At the shipped facility (0.62) the look-ahead wins 1,197 of 1,200 random drafts, so its species values compress toward zero (-0.09 Hypnopet to +0.11 Xylum, 0.05): nearly any four creatures get through when the orders are good. The pass 5 player reads -0.40 to +0.36 (0.18) there; its values still carry its known mispricing of binds (pass 7).

### The shipped settings

| squad | random orders | pass 5 | look-ahead |
|---|---|---|---|
| preset squad, 200 runs (pass 8) | 8% | 92% | 100% |
| preset squad, 200 runs (pass 9) | 25% | 93% | 100% |
| random draft, 1,200 runs (pass 8) | 37% (400 runs) | 61% | 90% |
| random draft, 1,200 runs (pass 9) | 63% | 88% | 100% |

The facility HP sweep behind decision 60, pass 5 with 56 to 59 in place (preset squad of 200, random drafts of 800): factor 1, 10% and 51%; 0.8, 50% and 72%; 0.75, 66% and 79%; 0.7, 81% and 84%; 0.65, 90% and 87%; 0.62, 93% and 89%; 0.6, 97% and 91%. The random draft gets easier than it was because the draft's typical squad lost less harm to 56 and 57 than the preset did: the preset's Graviclaw and Crystorn were among the heaviest strikers under the old curve.

### What each species does for a squad now

Per run, under the look-ahead at the shipped settings: the heavy bodies (Terragoyle, Frackworm, Kosanos, Graviclaw) deal the most harm (73 to 95) and take a large share of the blows; the quick small strikers (Tizzie, Luceras, Dromeus, Chromocat) now take 8 to 23 harm a run where they used to fall, and deal 58 to 74; the controllers deny machine opportunities (Hypnopet 8.3, Neph 5.8, Avilily 5.3, Voltish 4.7, Newtapede 4.3, Thirstaserp 4.2); Sonalloy heals 20.5 HP a run, and Figzy and Shuntara guard squadmates about 3 times a run. No companion is knocked out more than once in ten runs.

### Friction reported

- **Almost no creature can heal or guard a squadmate.** Across the roster's generated creatures only Sonalloy carries a heal it aims at others, and only Figzy and Shuntara give guards; the look-ahead orders support in 3% of its orders because there is nothing else to order. A support build is a real path to value only if more species can take it. That is creature data (which derived acts include a mend or guard aimed at another), not a game rule, so nothing was changed here; the next step is to count, per species, the derived acts with an other-aimed restore, remove or protect, and see which species' anatomy justifies one that the tables do not yet produce.
- **Control is not yet worth its slot on the most fragile controllers.** Hypnopet denies the most opportunities and still reads lowest; its every-round harm is about 1.6. The game treats one denied machine opportunity as worth one of the controller's own, which is fair, but a denial only prevents what that machine would have done that opportunity. A lever to try next: stun and trance durations counted in the victim's opportunities (currently 1 for attention statuses).
- **This facility still favors some elements.** Venemist (chemical) and Vespersyn (dark) sit lowest at the pass 8 facility after every change: their elemental moves meet a facility that is mostly sand and electric. That is element counterplay working as intended, but with one facility it reads as a weak species. More facilities with other element mixes would let each element have a place where it is the right pick.

## Fix, 2026-09-23: a degrading status that cannot tick does not take hold

Nick saw Crystorn corroding on the live site with the rule "Takes 0 damage at the start of each of its own opportunities". The reading was faithful but useless: a degrading status's only effect in this game is its tick, the tick is multiplied by the effectiveness matrix, and chemical against light (and ice) is 0. The model allows elemental immunity to coexist with an application, but here the application would change nothing, so it is now refused with a `resisted` event: "Crystorn is unaffected: chemical has no effect on light, so corroding cannot take hold." A degrading status too weak to tick at all is refused the same way. Regression test: "does not let a degrading status take hold where it could never tick".
