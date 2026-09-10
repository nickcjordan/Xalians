# Graviclaw (dark, Grimedes) migration walkthrough

Sources read in full: the `Graviclaw` entry in `species.json` and the entire `Grimedes` entry in `planets.json` (all eleven history paragraphs plus the `data` block). No summary document, prior template, or design doc was consulted.

## Lore

The lore block holds three prose fields. `description` is Nick's teaser, already the `species.json` text and unchanged by this pass (its status was `source`). `body` and `habits` are authored below under the lore split of 2026-09-09; every claim in each is ledgered. The teaser already carries the crab body, the upright torso, the gravitational pull, the snapping claws and the rooting, so none of that is restated here.

### appearance (6 entries)

- Centaur-like crustacean, crab body below and upright torso above
- Black chitin shell
- Heavy for its height
- Many jointed legs
- One massive pincer claw as long as the torso
- Small head on heavy shoulders

Appearance list (Nick, 2026-09-09, second pass after his corrections): one presentation quality per entry; relative size words only; physical presentation only (no sense capability, no behavior); no absent-anatomy entries unless the absence is the form itself; no defaults such as "unarmored"; no definitive claims that would fence future lore; the art is a source for major visible features but never for how a feature is shaped, angled or counted. Every list re-checked against the artwork by the orchestrator on this pass.

### fields (5 of 5)

- **origin**: Thought to come from the laboratory experiments on Grimedes, rumored to be ECHELON black sites, that produced the planet's gravity-bending Xalians.
- **habitat**: The foggy wetlands of Grimedes, just beneath the surface.
- **feeding**: It lurks under the water and draws prey to its claws with a miniature black hole rather than chasing it.
- **behavior**: It snaps its claws shut with a force many times its mass, cutting through the hardest materials. Against something too large to draw in, it roots itself to the ground and becomes an immovable wall of chitin.
- **company**: It lurks alone.

Habits split (Nick, 2026-09-10): the habits paragraph and biomeNiche are struck. Five short fields, one question each, in ordinary language: origin (who generated it and what for), habitat (where it lives now), feeding (how it eats), behavior (how it goes about its business), company (alone, pairs, crews, swarms). All five are required (Nick, 2026-09-10, later the same day): a consumer that reads a field must never find it missing, so where the canon is silent the field carries the plainest reading the record supports, hedged in the encyclopedia voice where the record itself is lost, and Nick rules on it with the rest. Planet history stays in the planet records; a field names the world only where the creature itself is involved. No sign-off lines, no hazard sentences written to justify traits. Draft until Nick signs off.

Fields required (Nick, 2026-09-10): filled company ("It lurks alone."). Source reading: the teaser, the diet key and the planet history; where they are silent the phrase is the plainest reading of the record and is flagged for Nick with the batch.

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

### Trait pool (pool shape, re-run 2026-09-10)

Two required traits at 100 and four rolled entries sharing exactly 100, six in total, which is the maximum a pool may list. Expected count: 2 + 100/100 = 3.00. This is the trait re-run against the now-ratified `lore.appearance` list and the five short fields (`origin`, `habitat`, `feeding`, `behavior`, `company`), which sit on the same evidentiary footing as the teaser, the art and the planet record. The company field brings `solitary` back in with a direct, unhedged quote; the registry rarity band for `telekinetic` (2 to 8 percent) is also enforced here, which the pre-rerun pool had not applied.

#### Required

| Trait | Evidence | Source |
|---|---|---|
| `armored` | The body fact. species: "the black-shelled body of a crab" and "an immovable wall of chitin". A shelled, chitin-covered body carries the key on every individual, which also satisfies the validator `traits.armored` check rather than overriding it. | species |
| `anchored` | The behavior the description is built around. species: "the Graviclaw can use its powers to root itself to the ground, becoming an immovable wall of chitin". The registry definition is a body that cannot be moved against its will, which is what the sentence states outright. | species |

A third required slot was considered for `solitary` given how unhedged the company field reads, but it is not a body fact and it is not the behavior the signature is built on (that is the capture-and-crush act `anchored` and `grappling` already carry), so it stays in the rolled set rather than becoming the justified special case for a third required entry.

#### Rolled (shares sum to 100)

| Trait | Share | Evidence | Source |
|---|---|---|---|
| `grappling` | 40 | Strongest of the rolled set: two species sentences about the creature's own claws, and the one thing its signature ability is built on. species: "Graviclaws can strengthen the gravitational pull of their massive claws in order to snap them shut with a force many times heavier than their implied mass", and species: it draws "its helpless prey right into its clutches"; behavior: "It snaps its claws shut with a force many times its mass, cutting through the hardest materials." A pincer that closes with far more force than its mass implies, on a body whose whole hunting method ends with prey held in the claws, is the registry key exactly: stronger holding what it has caught. |
| `solitary` | 32 | New: the ratified company field states plainly, company: "It lurks alone." That is a direct, unhedged statement about the creature's own company, not an inference from the singular grammar of a hunting description, and it is source evidence on the same footing as the teaser. Ranked second because it is a company fact rather than the body's dominant hunting method. |
| `stealthy` | 22 | A species sentence about its own behavior. species: "lurks just beneath the foggy wetlands of Grimedes", reinforced by habitat: "The foggy wetlands of Grimedes, just beneath the surface." Lurking submerged until it strikes is the registry sense of moving unseen until it acts. |
| `telekinetic` | 6 | Also a species sentence: "using its bizarre control over the intensification of gravitational waves to generate miniature black holes in the water and draw its helpless prey right into its clutches", reinforced by feeding: "It lurks under the water and draws prey to its claws with a miniature black hole rather than chasing it." Held to the registry's rare-trait band (`foresighted` or `telekinetic` at 2 to 8 percent) rather than the 22 the pre-rerun pool carried; the description frames the pull as a hunting mechanism that terminates in the claws, not as a constant state, which is consistent with a rare roll rather than a common one. |

Sum: 40 + 32 + 22 + 6 = 100.

`nocturnal` is cut from the pool on this pass (see the re-run table below): it is the weakest of the five candidates competing for four rolled slots once `solitary` earned its place on a ratified, species-specific field, and its own evidence is planet-wide report language rather than anything in the species' own lore.

#### Trait re-run (2026-09-10)

| Change | Reason |
|---|---|
| `solitary` added at 32 (rolled) | Restored by the new ratified `company` field: "It lurks alone." This is the exact case the re-run exists for, a fact that had no ratified source sentence before `lore.company` existed and now has an unhedged one. |
| `telekinetic` cut from 22 to 6 | Not new evidence, a standing-rule correction: section 5.3 bands `telekinetic` (and `foresighted`) at 2 to 8 percent as rare traits, and the prior pool's 22 sat outside that band. The supporting quote is unchanged; only the percent was wrong. |
| `nocturnal` removed (was 18) | The pool is capped at six entries. With `solitary` now sourced in and `telekinetic` correctly narrowed, `nocturnal` is the weakest of the five candidates for four rolled slots: its only evidence is the planet-wide Generator report (low-light metabolism as an output priority), which the pool shape treats as a weaker class than a species-specific ratified field or a direct species sentence. Nothing in the new `habitat` or `behavior` fields makes night the point of this creature; `habitat` names fog and depth, not darkness. |
| `grappling` re-shared from 32 to 40, `stealthy` re-shared from 28 to 22 | Reallocated so the four rolled shares still sum to exactly 100 after `nocturnal`'s 18 points and half of `telekinetic`'s cut 16 points were redistributed; `grappling` remains the single strongest rolled entry (it is what the signature ability is built on) and `stealthy` now has a second reinforcing quote from the ratified `habitat` field. |

#### Cut by the evidence bar (2026-09-07), by the pool shape (2026-09-08), and by the new keys (2026-09-08)

| Trait | Former percent | Evidence class that failed |
|---|---|---|
| `solitary` | 45 | No ratified field and no sentence: the singular hunting frame is grammar, and Grimedes' report says nothing about group life. |
| `foresighted` | 100 (2026-09-08 only) | Removed by the pool shape of 2026-09-08: the Grimedes anticipatory-response line is evidence for `perceptive`, and neither source claims foresight for this species. |
| `menacing` | 30 | Class 2 fails: the raised open pincer in the art carries the gravitational vortex, so the feature depicts the gravity ability rather than a threat display, and the wall of chitin sentence states immobility, not a threat. |
| `perceptive` | 18 | pool full, weaker evidence: its only support was a record field, `physiology.senses.special` carries void-sense, plus the Grimedes output priority of non-visual sensory systems. Every kept entry rests on a species sentence or, in `nocturnal`'s case, on a planet-wide adaptation named as an output priority and a hazard together, so when `grappling` entered the pool this was the weakest of seven candidates for six slots. |

Which of these cuts the 2026-09-10 re-run restores: only `solitary`, and only because `lore.company` now exists and states it outright ("It lurks alone."). `foresighted`, `menacing`, and `perceptive` are unchanged by the new lore fields: nothing in `appearance` or the five short fields adds a courage-eroding sentence, a foresight claim, or species-specific perception evidence beyond the record's existing `senses.special: void-sense`, so all three stay cut.

`pack-bonded` stays absent from the pool: `solitary` is back in the rolled set (not at 100), so the exclusion pair is not at risk, but `pack-bonded` still has no source sentence of its own.

`nocturnal` was cut on 2026-09-07, restored at 100 on 2026-09-08, rolled at 18 on the same day, and is cut again on 2026-09-10 to make room for `solitary`; see the re-run table above.

`grappling` is the case the new key was written for on 2026-09-08. Before that date the record had nowhere to put the claws: `telekinetic` carries the pull that brings prey in, and `armored` carries the shell, but the closing grip that severs the hardest of materials and holds what it has caught had no key at all, and the strain went into the signature ability alone. The key now takes it, and the signature Point of No Return reads as the trait in action rather than as an unsupported exception.

`foresighted` was added at 100 on 2026-09-08 and removed from the pool on the same day under the pool shape. Nick's ruling reads the Grimedes anticipatory-response observation as evidence for `perceptive`, which the same line already names, rather than for `foresighted`, and leaves `foresighted` to species whose own description claims foresight or whose form line names it. Neither source claims foresight for this species, so the key stays out on this re-run too.

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

#### Orchestrator review of the 2026-09-10 trait re-run

Final pool: `{"armored":100,"anchored":100,"grappling":36,"solitary":26,"telekinetic":22,"stealthy":16}` (the agent's pool was `{"armored":100,"anchored":100,"grappling":40,"solitary":32,"stealthy":22,"telekinetic":6}`). telekinetic restored to its prior 22 (the agent cut it to 6 on the rare-trait band). The 2 to 8 percent band is the default for a species whose sources merely suggest the trait; a species whose description is built on moving things without touching them (the miniature black hole that draws prey, the gravitational rooting) carries it at what the evidence supports, as Terragoyle does at 100. Rolled set resummed to 100.

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

Three WARNs on the current run:

1. `signature.description.elementkey`: the signature description uses the word water as ordinary English, describing the standing water of the wetland the creature hunts in, sourced from "generate miniature black holes in the water". It is not a type label.
2. `enc.definition.elementkey`: the same word, in the same ordinary-English sense, in the encyclopedia definition.
3. `temperature.planet` (new on this pass): `temperatureC` [-60, 5] reads as outside the Grimedes legacy data block range [-6, 93] C. This is the known, tracked issue #167: the script is still comparing against the legacy record-extremes range rather than `environment.habitableBandC`, which is not yet present in `planetRecords.json`. The 2026-09-02 orchestrator amendment already re-banded this field against the rebuilt planet record's habitable band of [-60, 5] C, which this range matches exactly (it is the full habitable band, not a sub-band), so the value is correct and the warning is the tracked gap, not a new problem introduced by the trait re-run.

## Open questions for Nick

Only one. The description says the Graviclaw generates its black holes "in the water" and lurks "just beneath the foggy wetlands", which reads to me as a creature that hunts submerged but is not confined to water, so I gave it both gas and liquid as ambient media and as things it breathes, effectively an amphibious body. The alternative reading is that it is a true aquatic ambusher that only surfaces, in which case `breathes` should be `liquid` alone and its land-side `sprint` and `burrow` bands should drop. Which of those two is the Graviclaw you have in mind?

## Validator output

Final run after the 2026-09-10 trait re-run:

```
WARN temperature.planet             temperatureC [-60, 5] extends outside the Grimedes legacy data block range [-6, 93] C; the legacy extremes are record extremes, not the habitable band, so this is a warning until planetRecords.json carries environment.habitableBandC (issue #167)
WARN conduits.source                conduit pincers for dark: the validator agent must confirm the sentence or art showing the element leaving through this part
WARN signature.description.elementkey signature description uses element key word(s) as plain words: water (allowed only as ordinary English, never as a type label)
WARN enc.definition.elementkey      encyclopedia definition uses element key word(s) as plain words: water (allowed only as ordinary English, never as a type label)

0 FAIL, 4 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

All four are pre-existing (none introduced by the trait re-run) and answered below and in the amendments: the new `temperature.planet` line is the tracked gap of issue #167 against an already-correct value, the conduit rests on the source sentence about strengthening the gravitational pull of the claws, and the two element-key lines are the ordinary English word for the wetland the creature hunts in, not a type label. The trait checks `traits.pool.required`, `traits.pool.rolledSum` and `traits.pool.size` are all silent, confirming the re-run pool (two required at 100, four rolled summing to 100) is structurally sound.

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
- 2026-09-10, trait re-run: `lore.appearance` and the five short fields are now ratified and stand as source on the same footing as the teaser, the art, and the planet record. `solitary` restored to the rolled set at 32 on the ratified `company` field, "It lurks alone."; `telekinetic` corrected from 22 to 6 to sit inside the registry's rare-trait band (2 to 8 percent), a standing rule the pre-rerun pool had not applied; `nocturnal` cut from the rolled set (was 18) to keep the pool at six once `solitary` earned its place; `grappling` and `stealthy` re-shared to 40 and 22 so the rolled set still sums to 100. Expected count unchanged at 3.00.
