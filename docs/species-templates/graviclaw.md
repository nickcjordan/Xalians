# Graviclaw (dark, Grimedes) migration walkthrough

Sources read in full: the `Graviclaw` entry in `species.json` and the entire `Grimedes` entry in `planets.json` (all eleven history paragraphs plus the `data` block). No summary document, prior template, or design doc was consulted.

## Lore

The lore block holds three prose fields. `description` is Nick's teaser, already the `species.json` text and unchanged by this pass (its status was `source`). `body` and `habits` are authored below under the lore split of 2026-09-09; every claim in each is ledgered. The teaser already carries the crab body, the upright torso, the gravitational pull, the snapping claws and the rooting, so none of that is restated here.

### body (67 words)

A centaur-like crustacean with the black-shelled body of a crab and an upright torso rising from it, on many legs, with massive claws. Chitin shell throughout, with mineral grown into it. It stands near two meters and carries most of a quarter ton. It swims, burrows and grips well but is slow on its feet; it sees poorly and senses by means other than the ordinary five.

Record-only register (Nick, 2026-09-09, pattern approved on Chromocat, Dromeus and Imprit): every clause is the teaser, record anatomy, covering, composition and size, or record capability and sense bands. No clause is taken from the drawing; the art reading above keeps those observations.

### habits (119 words)

It hunts under a sky of permanent night, where the only light is infrared, and it registers mass and motion rather than looking for it. It does not chase. It lies under the wetland surface and opens a collapse point in the water above it, so the prey arrives at the pincers on its own; the pincers then shut with a weight the arm does not have, and what is caught is not let go. Faced with something too large to draw in, it fixes itself to the bottom and stops being movable. It makes no call, no cry, and no signal of any kind. The Grimedites watch the galaxy's edge for APEX's return; it keeps the wetlands below.

| Claim | Source |
|---|---|
| A sky of permanent night where the only light is infrared | Grimedes history paragraph 0, on a world cloaked in perpetual night around a dying brown dwarf emitting almost no visible light beyond the shortest infrared bands; Generator report terrain notes, illumination infrared only |
| Registers mass and motion rather than looking | Grimedes Generator report fauna, sensory apparatus registers mass and motion; output priorities, non-visual sensory systems; record `senses.sight` 20 to 45 against `senses.special: void-sense` |
| It does not chase | Grimedes Generator report fauna, extant fauna substitute gravitational manipulation for the majority of pursuit locomotion; record `capabilities.sprint` 15 to 35 |
| It lies under the wetland surface and opens a collapse point in the water above it | species.json: "lurks just beneath the foggy wetlands of Grimedes, using its bizarre control over the intensification of gravitational waves to generate miniature black holes in the water"; Grimedes Generator report fauna, wetland forms generate submerged collapse-points |
| So the prey arrives at the pincers on its own | species.json: "draw its helpless prey right into its clutches" |
| The pincers shut with a weight the arm does not have | species.json: "snap them shut with a force many times heavier than their implied mass" |
| What is caught is not let go | record `traits.pool.grappling`; species.json: "severing through even the hardest of materials with crushing pressure" |
| Faced with something too large to draw in, it fixes itself to the bottom and stops being movable | species.json: "When facing larger foes, the Graviclaw can use its powers to root itself to the ground, becoming an immovable wall of chitin."; record `traits.pool.anchored` |
| No call, no cry, no signal of any kind | record `physiology.communication: []`, which the enum defines as mute |
| The Grimedites watch the galaxy's edge for APEX's return | Grimedes history paragraph 9, on the newest generation of Grimedites standing at the edge of the galaxy to watch the endless black and guard against APEX's inevitable return |
| It keeps the wetlands below | record `lore.biomeNiche`; Generator report terrain features, fog-covered wetland systems |

No pack or solitary sentence is written: `solitary` was cut on 2026-09-07 and `pack-bonded` is absent from the pool. The test-subject and ECHELON black-site origin of the first pass was cut for room; it is a fact about how the species was made rather than how it lives now, and the walkthrough's judgment lines keep it.

## Description status

`descriptionStatus` is `source`. The legacy description is already in the full species register: it opens with a body appositive ("With the black-shelled body of a crab and an upright torso"), states the creature hunting purpose, and anchors to a named place on its home world ("the foggy wetlands of Grimedes"). It is one paragraph of 114 words, inside the 60 to 140 band, so it is carried verbatim and no clauses were added.

## Judgment lines (evidence)

### Anatomy

| Key | Evidence | Source |
|---|---|---|
| `pincers` | species: "Graviclaws can strengthen the gravitational pull of their massive claws in order to snap them shut". The registry ruling in this skill is that a crab claw that snaps shut is `pincers`, never `claws`, whatever word the description uses. The body is explicitly "the black-shelled body of a crab", so the snapping claws are pincers. | species |
| `shell` | species: "the black-shelled body of a crab". A rigid enclosing casing is the registry definition of `shell`. | species |
| `body` | species: "an immovable wall of chitin" is whole-body mass presented as an obstacle; `body` is the universal fallback and is carried so the rolled-ability layer has the general-purpose key. | species |

No other anatomy key has a source sentence. There are no jaws, spines, tail, or antennae in either source, so none are declared.

### Trait pool (pool shape, 2026-09-08)

Two required traits at 100 and four rolled entries sharing exactly 100, six in total, which is the maximum a pool may list. Expected count: 2 + 100/100 = 3.00. Reworked later the same day when `grappling` entered the registry: it takes the top rolled share and `perceptive`, the weakest-evidenced entry, drops into the cut table to keep the pool at six.

#### Required

| Trait | Evidence | Source |
|---|---|---|
| `armored` | The body fact. species: "the black-shelled body of a crab" and "an immovable wall of chitin". A shelled, chitin-covered body carries the key on every individual, which also satisfies the validator `traits.armored` check rather than overriding it. | species |
| `anchored` | The behavior the description is built around. species: "the Graviclaw can use its powers to root itself to the ground, becoming an immovable wall of chitin". The registry definition is a body that cannot be moved against its will, which is what the sentence states outright. | species |

#### Rolled (shares sum to 100)

| Trait | Share | Evidence | Source |
|---|---|---|---|
| `grappling` | 32 | Strongest of the rolled set: two species sentences about the creature's own claws, and the one thing its signature ability is built on. species: "Graviclaws can strengthen the gravitational pull of their massive claws in order to snap them shut with a force many times heavier than their implied mass", and species: it draws "its helpless prey right into its clutches". A pincer that closes with far more force than its mass implies, on a body whose whole hunting method ends with prey held in the claws, is the registry key exactly: stronger holding what it has caught. It is rolled rather than required because the two required entries are already the body facts the description leads with, and the pool shape allows two. |
| `stealthy` | 28 | A species sentence about its own behavior. species: "lurks just beneath the foggy wetlands of Grimedes". Lurking submerged until it strikes is the registry sense of moving unseen until it acts. | species |
| `telekinetic` | 22 | Also a species sentence: "using its bizarre control over the intensification of gravitational waves to generate miniature black holes in the water and draw its helpless prey right into its clutches" is moving things without touching them. Below `stealthy` because the description frames the pull as a hunting mechanism that terminates in the claws, not as a constant state. | species |
| `nocturnal` | 18 | A planet-wide adaptation. The Grimedes Generator environmental report gives low-light metabolism as one of its three output priorities. Rolled rather than required, because nothing in the species entry makes night adaptation the point of this creature; its own niche sentence is about fog and water, not darkness. | planet report |

#### Cut by the evidence bar (2026-09-07), by the pool shape (2026-09-08), and by the new keys (2026-09-08)

| Trait | Former percent | Evidence class that failed |
|---|---|---|
| `solitary` | 45 | No ratified field and no sentence: the singular hunting frame is grammar, and Grimedes' report says nothing about group life. |
| `foresighted` | 100 (2026-09-08 only) | Removed by the pool shape of 2026-09-08: the Grimedes anticipatory-response line is evidence for `perceptive`, and neither source claims foresight for this species. |
| `menacing` | 30 | Class 2 fails: the raised open pincer in the art carries the gravitational vortex, so the feature depicts the gravity ability rather than a threat display, and the wall of chitin sentence states immobility, not a threat. |
| `perceptive` | 18 | pool full, weaker evidence: its only support was a record field, `physiology.senses.special` carries void-sense, plus the Grimedes output priority of non-visual sensory systems. Every kept entry rests on a species sentence or, in `nocturnal`'s case, on a planet-wide adaptation named as an output priority and a hazard together, so when `grappling` entered the pool this was the weakest of seven candidates for six slots. |

`pack-bonded` stays absent from the pool: it was excluded by `solitary`, and `solitary` is now cut as well, so neither is rolled.

`nocturnal` was cut on 2026-09-07, restored at 100 on 2026-09-08, and now sits in the rolled set at 22. The Grimedes Generator report's output priority of low-light metabolism is real evidence, but it is a fact of the world the Generator builds for rather than the point of this particular creature, and under the pool shape a planet-wide adaptation is rolled unless the species' own description makes it the point. Graviclaw's description is about fog, water, gravity and armor, so the entry rolls.

`grappling` is the case the new key was written for. Before 2026-09-08 the record had nowhere to put the claws: `telekinetic` carries the pull that brings prey in, and `armored` carries the shell, but the closing grip that severs the hardest of materials and holds what it has caught had no key at all, and the strain went into the signature ability alone. The key now takes it, and the signature Point of No Return reads as the trait in action rather than as an unsupported exception.

`foresighted` was added at 100 on 2026-09-08 and is removed from the pool on the same day under the pool shape. Nick's ruling reads the Grimedes anticipatory-response observation as evidence for `perceptive`, which the same line already names, rather than for `foresighted`, and leaves `foresighted` to species whose own description claims foresight or whose form line names it. Neither source claims foresight for this species, so the key is out. This is the fix the iteration-three friction note asked for, applied.

### Physiology

- `corporeality` `corporeal`: species: "the black-shelled body of a crab and an upright torso" is a physical body.
- `composition` primary `flesh`, secondary `mineral`: species: "the black-shelled body of a crab" plus "an immovable wall of chitin". Chitin over living tissue reads as flesh with a hardened mineralized casing.
- `bodyPlan` `multiped`: species: "the centaur-like crustacean". A centaur-like build is a walking base carrying an upright torso, which is more than two legs.
- `covering` `chitin`: species: "an immovable wall of chitin", stated outright.
- `size` heightCm [165, 215], weightKg [180, 260]: the legacy height of 191 cm is a fair anchor and the band is centered on it, since the phrase "an upright torso" gives a real standing height. Mass was derived by the body method rather than copied: a broad, low-slung, many-legged crustacean of roughly two meters standing height with a heavy chitin casing over flesh sits well above a same-height mammal, and the source insists on both bulk ("massive claws") and immovability ("an immovable wall of chitin"). The band bottoms at 180 kg so no individual reads as light enough to be shoved.
- `lifespan` `long`: wear rubric. The body is heavy, armored and cold-running, it is not a high-metabolism sprinter (the `sprint` band is low), and its casing is mineralized, all of which are the rubric slow-wear signals. It is not `enduring` because Grimedes is a harsh field environment; planet: "Grimedes is a world on the verge of death."
- `genome.chirality` `rolled`: nothing in either source declares an achiral genome, so the default per-individual roll stands.
- `diet` `carnivore`: species: "draw its helpless prey right into its clutches".
- `communication` `[]`: neither source describes any call, cry, signal, display, scent, or telepathic behavior for this species. Per the enum rule the value is the empty array and the field is listed under Authored fields as authored-absent. No channel was invented from body plausibility.
- `breathes` [`gas`, `liquid`] and `ambientMedia` [`gas`, `liquid`]: species: it "lurks just beneath the foggy wetlands" and generates black holes "in the water", so it operates submerged, while the same sentence places it in a wetland whose fog is an atmosphere it also occupies. `breathes` is a subset of `ambientMedia` as required.
- `temperatureC` min -6, max 34: the planet `data` block gives a range of -6 to 93 degrees Celsius, and this band lies inside it. The upper bound is deliberately far below the planetary high because a submerged wetland lurker lives in standing water on a world whose star "has cooled so significantly it emits almost no visible light other than the shortest bands of infrared radiation"; the planetary high belongs to geologically hot ground, not to a shaded wetland. The low bound sits exactly at the planetary low, since standing water on such a world can approach freezing.
- `capabilities`: `flight` [0, 0] because neither source gives it flight and the body is a walking crustacean. `swim` [45, 70] from species: it hunts "in the water" and lurks "just beneath the foggy wetlands", so it is competent but not a pelagic swimmer. `burrow` [50, 75] from species: it "lurks just beneath the foggy wetlands", meaning it gets itself under the surface. `climb` [5, 20] and `leap` [5, 20] because a heavily shelled, ground-rooting body has no source support for either and its own anchoring is the opposite instinct. `sprint` [15, 35] because the entire hunting method is to bring prey to it rather than chase it, "draw its helpless prey right into its clutches". `manipulation` [45, 70] justified by grasping anatomy (`pincers`), which satisfies the above-40 rule; the upper bound is capped in the 70s because pincers are strong but coarse.
- `senses`: `sight` [20, 45] deliberately modest because the creature hunts submerged and in fog, "lurks just beneath the foggy wetlands", so vision is not its hunting sense. `hearing` [30, 55] and `smell` [35, 60] as an honest ordinary-predator baseline; neither has a source sentence and both are listed under Authored fields. `special` [`void-sense`]: species: "its bizarre control over the intensification of gravitational waves to generate miniature black holes" requires it to perceive gravitational structure it is itself shaping, and `void-sense` is the registry key for that perception. It does not grant the `mind` channel, since that predicate requires a `psychic` special sense specifically.

### Instruments

`pincers`, `shell`. Both are in anatomy. (`hide` was declared as a third instrument in the original run and removed by the orchestrator; see Orchestrator amendments.)

- `pincers`: species: "Graviclaws can strengthen the gravitational pull of their massive claws in order to snap them shut with a force many times heavier than their implied mass, severing through even the hardest of materials with crushing pressure." This is the part it fights with.
- `shell`: species: "the black-shelled body of a crab", the casing it presents when it stops moving.

No channel is declared. `mind` was considered and rejected: the element is not psychic, the special sense is `void-sense` rather than `psychic`, and `telekinetic` is a pool roll rather than guaranteed, so the predicate fails. `aura` was also rejected: the gravitational pull is a targeted effect that terminates in the claws, not an emanation acting on everything around the body, and control language alone never satisfies the aura predicate.

### Archetype weights

- `juggernaut` 5 (strength, resilience): species: "snap them shut with a force many times heavier than their implied mass, severing through even the hardest of materials with crushing pressure" plus "an immovable wall of chitin". Force and toughness together are the dominant read.
- `bulwark` 4 (vitality, resilience): species: "When facing larger foes, the Graviclaw can use its powers to root itself to the ground, becoming an immovable wall of chitin." Rooting in place to absorb a bigger opponent is the bulwark shape exactly.
- `predator` 3 (instinct, reflex): species: "draw its helpless prey right into its clutches", an ambush hunter timing.
- `vanguard` 2 (strength, vitality): the same force sentence read as a front-line body rather than a wall; weighted below `juggernaut` because the description stresses armor over aggression.
- `stalwart` 1 (resilience, willpower): a minority read of the rooting sentence as stubbornness rather than mass. Lowest weight because willpower is inferred, not stated.

`berserker`, `runner`, `skirmisher`, `prowler` and the charisma archetypes are absent: nothing in the description supports speed, mobility, or presence-based play.

### Attribute bands

Legacy `statRatings` were used only as a relative gauge; they mark `standardAttackRating` and `standardDefenseRating` as high and leave every other field blank.

- `strength` [70, 95]: species: "a force many times heavier than their implied mass, severing through even the hardest of materials with crushing pressure". Top band on the sheet.
- `resilience` [70, 95]: species: "an immovable wall of chitin", equally top.
- `vitality` [55, 80]: a large-bodied creature, but the description credits survival to armor rather than bulk of life force, so it sits below resilience.
- `endurance` [50, 75]: species: it "lurks", which is patient sustained holding rather than burst output.
- `agility` [10, 30]: species: a shelled crustacean that can "root itself to the ground"; the lowest band on the sheet.
- `reflex` [25, 50]: an ambusher needs a trigger but not evasive quickness; "draw its helpless prey right into its clutches" is a closing action, not a dodge.
- `intelligence` [25, 50]: no source sentence credits problem-solving. Sits comfortably below the 85 ceiling.
- `willpower` [45, 70]: species: "When facing larger foes, the Graviclaw can use its powers to root itself to the ground" is a deliberate act of standing ground.
- `instinct` [55, 80]: species: hunting by lurking submerged in fog, "lurks just beneath the foggy wetlands", is instinct-led perception.
- `charisma` [15, 40]: nothing in either source describes presence, display, or social effect.

### Element

Primary `dark` from the species `type` field. Secondaries are whatever the graph allows for this element (`ghost`, `psychic`, `ice`); no secondary is picked here. `affinityOdds` is omitted, so the 75/25 baseline is inherited; nothing in the source justifies an override.

### Signature ability

The lore-defining act, quoted: "using its bizarre control over the intensification of gravitational waves to generate miniature black holes in the water and draw its helpless prey right into its clutches."

The species-name search across every `consolidated-*.md` and `neutral-pools.md` returned a ledger note in `consolidated-dark.md` recording `Point of No Return` as this species signature, with instrument, action and medium ratified as pincers / snare / dark on 2026-09-01. That is a prior ruling by Nick, and the source description does not contradict it, so the name and the three fields are taken from the ledger rather than coined fresh.

Independently, the same classification is what the description produces. Instrument is `pincers`, not `mind` and not `aura`: the pull is gravitational in origin but the effect terminates on the target inside the claws, since the prey is drawn "right into its clutches" and the claws then "snap them shut". Action is `snare`, since the act is capture and holding rather than a blow, and `snare` is inside the allowed set for `pincers`. Medium is `dark`, the primary element, so it has element cover under any roll. The intensity band [55, 85] is set high because this is the creature whole hunting method rather than an incidental power, with room below the ceiling for weaker individuals.

The catalog collision scan over every cell in all fourteen `consolidated-*.md` files and `neutral-pools.md` finds no cell entry of that name; the only occurrences are the ledger and disposition notes recording it as cut from the catalog precisely so it could serve as this signature. The validator confirms both the absence of a collision and the match to the reserved ledger entry.

## Authored fields

Values with no supporting source sentence, recorded here because the JSON carries no provenance:

- `physiology.communication` `[]` (authored-absent): no call, signal, display, scent, or telepathic behavior appears in either source.
- `physiology.senses.hearing` [30, 55] and `physiology.senses.smell` [35, 60]: ordinary-predator baselines; neither sense is mentioned anywhere.
- `physiology.genome.chirality` `rolled`: the default, since no achiral declaration exists.
- `physiology.capabilities.climb` [5, 20] and `physiology.capabilities.leap` [5, 20]: inferred from a heavy shelled body, not stated.
- `physiology.size.weightKg` [180, 260]: derived by the body method described above, not copied from the legacy weight.
- `anatomy` key `body`: the universal fallback, carried so the rolled-ability layer has a general key; the description names no separate part for it.
- `attributes.charisma` [15, 40]: absence-based.
- `archetypeWeights.stalwart` 1: an interpretive minority read of the rooting sentence.

## Thin-combo findings

For each declared instrument crossed with its allowed actions, over the primary `dark` and each on-graph secondary (`ghost`, `psychic`, `ice`), counting the element cell plus the action neutral pool and respecting instrument tags:

- `pincers` (strike, crush, snare, shove, ward, hurl): the smallest element-cell contributions across all four media are dark hurl at 44 untagged names and ghost crush at 8 untagged plus 9 pincer-tagged. Every combination clears 6 comfortably once the neutral pools (54 to 100 names each) are added.
- `shell` (ward, shove, crush): the smallest is ghost crush again at 17 drawable, and dark ward at 98. All clear.
- Neutral pools consulted: strike 87, shove 83, crush 53, snare 43, ward 72, hurl 66.

No thin combos found. Nothing was padded.

## Answers to validator WARNs

Two WARNs, both the same class:

1. `signature.description.elementkey`: the signature description uses the word water as ordinary English, describing the standing water of the wetland the creature hunts in, sourced from "generate miniature black holes in the water". It is not a type label.
2. `enc.definition.elementkey`: the same word, in the same ordinary-English sense, in the encyclopedia definition.

## Open questions for Nick

Only one. The description says the Graviclaw generates its black holes "in the water" and lurks "just beneath the foggy wetlands", which reads to me as a creature that hunts submerged but is not confined to water, so I gave it both gas and liquid as ambient media and as things it breathes, effectively an amphibious body. The alternative reading is that it is a true aquatic ambusher that only surfaces, in which case `breathes` should be `liquid` alone and its land-side `sprint` and `burrow` bands should drop. Which of those two is the Graviclaw you have in mind?

## Validator output

Final run after the pool-shape pass of 2026-09-08:

```
WARN conduits.source                conduit pincers for dark: the validator agent must confirm the sentence or art showing the element leaving through this part
WARN signature.description.elementkey signature description uses element key word(s) as plain words: water (allowed only as ordinary English, never as a type label)
WARN enc.definition.elementkey      encyclopedia definition uses element key word(s) as plain words: water (allowed only as ordinary English, never as a type label)

0 FAIL, 3 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

All three are pre-existing and answered below and in the amendments: the conduit rests on the source sentence about strengthening the gravitational pull of the claws, and the two element-key lines are the ordinary English word for the wetland the creature hunts in, not a type label. The trait checks `traits.pool.required`, `traits.pool.rolledSum` and `traits.pool.size` are all silent.

## Script denials

1. 2026-09-07, trait evidence bar pass. No record value was denied. The first validator run of the pass raised two `md.quote` FAILs on the new cut table, because its cells quoted the walkthrough's own earlier wording and `md.quote` requires every double-quoted string in the file to appear verbatim in `species.json`, the planet history, or the registry. The cells were rewritten as plain prose with no quotation marks; the substance is unchanged and the original phrasing was not better, it was simply quoted where it should have been paraphrased. Worth recording as a rule friction: a walkthrough cannot cite its own prior reasoning in quotation marks, which is a reasonable rule for source quotes but surprising for a section whose job is to say why an earlier justification failed. Smallest fix if it recurs across the roster: exempt double-quoted text inside a `#### Cut by the evidence bar` table from `md.quote`.

## Orchestrator amendments

- 2026-09-02: `hide` removed from anatomy and instruments under Nick's one-surface-key ruling: the shell is the armored aspect and `hide` states that the body has no armored aspect, so a chitin-shelled crustacean declares `shell` alone. The "immovable wall of chitin" sentence is already carried by `shell`, `body`, and the guaranteed `anchored` trait. Instruments are now `pincers`, `shell`.

- 2026-09-02, trait model change (Nick): traits are now independent per-trait percents with no count. Converted by the orchestrator from {"guaranteed":["armored","anchored"],"rolledCount":[0,1],"pool":{"stealthy":5,"perceptive":3,"solitary":3,"menacing":2,"nocturnal":2,"telekinetic":1}} to {"armored":100,"anchored":100,"stealthy":60,"solitary":45,"perceptive":30,"menacing":30,"telekinetic":6}. armored and anchored are body-demanded; stealthy carries the lurking sentence; solitary is argued from absence; perceptive and menacing were the weakest calls and sit low; telekinetic is the rare pull-at-a-distance reading. Expected count 2.71.
- 2026-09-02, exhaustive pool (Nick): every trait key is now listed; keys absent from the earlier pool are 0 (the species never carries them). The earlier percents are unchanged.
- 2026-09-02, absence means 0 (Nick): the zero entries are removed again; the pool lists only traits the species can carry.
- 2026-09-02, conduits (Nick): `conduits` {"pincers":"dark"}. pincers conduct dark: "Graviclaws can strengthen the gravitational pull of their massive claws".
- 2026-09-02, archetype scale (Nick): `archetypeWeights` converted from relative 1 to 5 weights to percents summing to 100 by largest remainder, order preserved: juggernaut 33, bulwark 27, predator 20, vanguard 13, stalwart 7 (was juggernaut 5, bulwark 4, predator 3, vanguard 2, stalwart 1).
- 2026-09-02, archetype rethink (Nick): the converted row kept the old 5-4-3-2-1 ladder shape shared by every record, so the distribution was re-authored on this species alone: juggernaut 45, bulwark 25, predator 20, stalwart 10 (was juggernaut 33, bulwark 27, predator 20, vanguard 13, stalwart 7). Reasoning: one dominant identity, the immovable armored crusher (armored and anchored at 100, strength and resilience bands at the top), with the ambush hunter as the real second reading (stealthy 60, the snare from the dark); vanguard dropped as a filler that repeated juggernaut and bulwark.
- 2026-09-02, planet rebuild: `temperatureC` re-banded from [-6, 34] to [-60, 5] (full habitable band (the old sub-band barely overlapped it)) against the rebuilt planet record's habitable band [-60, 5] C; the old band was validated against the legacy planetary extremes, which are not survivable. Any gravity figure cited in this walkthrough predates the rebuild; the current value is `physical.derived.gravityEarth` = 0.44.
- 2026-09-07, hardening pass: the trait section was rewritten under the percent model (no more 'guaranteed'/'rolled pool weights' split); the table now lists the exact percents in `graviclaw.json` and states which trait was cut, rather than appending a note beside stale reasoning.
- 2026-09-07, trait evidence bar (Nick): cut `solitary`, `perceptive`, `menacing`; pool expected count 3.71 to 2.66.
- 2026-09-07, trait evidence bar iteration two (Nick): restored `perceptive` (30, class 4); cut nothing, since the pool carries no `resistant`; expected count 2.66 to 2.96.
- 2026-09-08, trait evidence bar iteration three (Nick): added `nocturnal` (100, Grimedes low-light metabolism output priority) and `foresighted` (100, the report's unqualified anticipatory-response observation); raised `perceptive` (30 to 100, void-sense special sense); cut nothing, since the pool carries no `resistant`; expected count 2.96 to 5.66.
- 2026-09-08, pool shape (Nick): required `armored`, `anchored`; rolled `stealthy` 35, `telekinetic` 25, `nocturnal` 22, `perceptive` 18; expected count 5.66 to 3.00.
- 2026-09-08, new keys (Nick): `grappling` added to the registry as a body stronger holding what it has caught, and it enters the rolled set at the top share on the claws that snap shut with a force many times heavier than their implied mass and draw prey into its clutches; `perceptive` (18) cut to the table above with the reason pool full, weaker evidence; the rolled set re-shared as `grappling` 32, `stealthy` 28, `telekinetic` 22, `nocturnal` 18; required unchanged at `armored` and `anchored`; pool holds at six, the cap; expected count 3.00 unchanged.
- 2026-09-09, lore split (Nick): description reverted to species.json; body and habits authored; descriptionStatus removed.
- 2026-09-09, lore overlap lever: habits (and body where changed) rewritten so the defining act is present from its own angle.
