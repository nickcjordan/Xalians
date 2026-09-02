# Graviclaw (dark, Grimedes) migration walkthrough

Sources read in full: the `Graviclaw` entry in `species.json` and the entire `Grimedes` entry in `planets.json` (all eleven history paragraphs plus the `data` block). No summary document, prior template, or design doc was consulted.

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

### Guaranteed traits

- `armored` from species: "the black-shelled body of a crab" and "an immovable wall of chitin". A shelled and chitin-covered body demands it; this also answers the validator `traits.armored` check by satisfying it rather than overriding it.
- `anchored` from species: "the Graviclaw can use its powers to root itself to the ground, becoming an immovable wall of chitin". The registry definition of `anchored` is a body that cannot be moved against its will, which is exactly what the sentence states. This is a body-demanded fact, not a rolled option.

### Rolled pool weights

`rolledCount` is [0, 1] because two traits are already guaranteed and the per-creature ceiling is three.

| Trait | Weight | Evidence | Source |
|---|---|---|---|
| `stealthy` | 5 | species: "lurks just beneath the foggy wetlands of Grimedes". Lurking submerged until it strikes is the registry sense of moving unseen until it acts. Highest weight because it is the most directly stated behavior. | species |
| `perceptive` | 3 | species: it hunts prey it cannot see through fog and water, since it "lurks just beneath the foggy wetlands" and still manages to "draw its helpless prey right into its clutches". Detection of concealed prey is implied by the hunting method, not by the planet darkness. | species |
| `solitary` | 3 | species: the whole description is written in the singular hunting frame, "draw its helpless prey right into its clutches", with no companion, pack, or cooperative behavior anywhere in the entry. A moderate rather than high weight because absence of evidence is weaker than a positive statement. Excludes `pack-bonded`, which is therefore absent from both lists. | species |
| `menacing` | 2 | species: "an immovable wall of chitin" presented to "larger foes" is a presence meant to break an attacker resolve. Low weight because the sentence is about physical immobility first. | species |
| `nocturnal` | 2 | species: it "lurks just beneath the foggy wetlands", a low-light submerged niche. Deliberately weighted low, and NOT justified by the planet-wide perpetual-night sentence, since a planet-wide fact cannot carry a species trait weight. | species |
| `telekinetic` | 1 | species: "using its bizarre control over the intensification of gravitational waves to generate miniature black holes in the water and draw its helpless prey right into its clutches" is moving objects without touching them. Rare weight of 1 because the description frames the pull as a hunting mechanism terminating in the claws, not as constant levitation. | species |

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

```
WARN signature.description.elementkey signature description uses element key word(s) as plain words: water (allowed only as ordinary English, never as a type label)
WARN enc.definition.elementkey      encyclopedia definition uses element key word(s) as plain words: water (allowed only as ordinary English, never as a type label)

0 FAIL, 2 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

Verbose run confirms the checks the summary suppresses:

```
ok   temperature.planet             temperatureC [-6, 34] lies inside Grimedes range [-6, 93] C
ok   signature.collision            no catalog collision for 'Point of No Return'
ok   signature.reserved             signature name matches the reserved ledger entry at consolidated-dark.md:52
ok   md.quotes                      30 of 30 distinct quotations found verbatim in the sources
```

## Orchestrator amendments

- 2026-09-02: `hide` removed from anatomy and instruments under Nick's one-surface-key ruling: the shell is the armored aspect and `hide` states that the body has no armored aspect, so a chitin-shelled crustacean declares `shell` alone. The "immovable wall of chitin" sentence is already carried by `shell`, `body`, and the guaranteed `anchored` trait. Instruments are now `pincers`, `shell`.
