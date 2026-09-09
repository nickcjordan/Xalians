# Venemist (chemical, Drainov) migration walkthrough

## Art reading

The artwork shows a single shaggy quadruped seated on its haunches in three-quarter profile, head thrown back and jaws gaped wide open. Two long curved fangs hang from the upper jaw and nothing else in the mouth reads as a tooth. A narrow tube-like organ projects forward out of the open mouth and a fanning shower of droplets bursts from its tip, spreading upward and outward in a wide cone. The head carries two long upright ears. The outline of the neck, shoulders and back is drawn as a row of ragged tufts, a shaggy pelt edge rather than a smooth silhouette; the flanks and legs are smooth. The forelimbs reach the ground and bear weight, the hindquarters are down in a seated pose, and a long tail curls out behind the rump. One body, no wings, no fins, no visible armor plate, no horns, no claws drawn as distinct hooking digits.

## Lore

Split applied 2026-09-09. `lore.description` is Nick's teaser from `species.json`, verbatim. `lore.body` and `lore.habits` are authored below and neither restates the teaser's own two facts (the mist dissolving prey, the two teeth).

### appearance (6 entries)

- Mid-sized four-legged hunter, heavier in front
- Shaggy along the neck and back, smooth on the flanks
- Long upright ears
- Wide gaping jaws with only two teeth, both long curved fangs
- A tube in the mouth that sprays toxic mist
- Long tail

Appearance list (Nick, 2026-09-09, second pass after his corrections): one presentation quality per entry; relative size words only; physical presentation only (no sense capability, no behavior); no absent-anatomy entries unless the absence is the form itself; no defaults such as "unarmored"; no definitive claims that would fence future lore; the art is a source for major visible features but never for how a feature is shaped, angled or counted. Every list re-checked against the artwork by the orchestrator on this pass.

### habits (114 words)

It hunts by scent rather than by sight, working a smog too thick to see through and coming to its prey on the smell of it alone. Its ground is the acid swamps and the derelict chemical plants of the factoryscape, where abandoned facilities still run themselves and still fail. The Generator that shaped it was built to fill a world of acid swamps and industrial waste with life capable of surviving there at all, and nothing on that world burns it: not the corrosive rain, not the swamps it wades, not the agent it carries. A body opened in a fight discharges through the breach, which is true of everything printed on Drainov.

| Claim | Source |
|---|---|
| hunts by scent rather than sight | `physiology.senses.smell` [60, 85] against `sight` [40, 60]; Drainov report mobility note on flight, airborne particulates degrade tissue and instrumentation |
| a smog too thick to see through | Drainov history paragraph 3, a desolated hellscape blanketed in a miasma of toxic smog; planet data Terrain, Gaseous Smog |
| comes to its prey | `physiology.diet` carnivore, settled by the teaser's own word prey. Written as prey and not as a carcass: nothing makes this species a scavenger |
| its ground is the acid swamps and the derelict chemical plants of the factoryscape | `lore.biomeNiche`; Drainov history paragraph 1, the world turned into a sprawling factoryscape, and paragraph 3, urban decay melting into acid swamps |
| abandoned facilities still run themselves and still fail | Drainov history paragraph 3, abandoned processing facilities and chemical plants continuing to chug along on automated systems with very few safety measures, and annual meltdowns, explosions and leaks; Drainov report terrain note, automated legacy facilities continue uncommanded operation with periodic containment failure |
| nothing on that world burns it: corrosive rain, swamps, its own agent | Drainov report fauna observation, full-spectrum toxin immunity universal; output priorities chemical immunity and containment-grade integument; history paragraph 5, the Xalians adapting to bubbling acid swamps, steaming corrosive rain, asphyxiating fumes and neurotoxic gases; `traits.pool.resistant` 55 |
| a body opened in a fight discharges through the breach, which is true of everything printed on Drainov | Drainov report fauna observation, reactive discharge on structural breach; `traits.pool.volatile` 25 |
| the Generator was built to fill a world of acid swamps and industrial waste with life capable of surviving there at all | Drainov history paragraph 5, the Generator bioengineering new forms of life capable of surviving within the planet's hostile wastelands |

### Sentences dropped from the pre-split description

- 'and several will stand over the same one until it is thin enough to drink' from the 2026-09-08 stub-upgrade draft. Dropped on the orchestrator's instruction for this pass: no source states that this species feeds in company, Nick has not ruled on it, and `pack-bonded` was cut from the pool on 2026-09-07 for the same reason. Nothing else in the draft was lost; its remaining authored extensions (scent hunting, universal chemical immunity, discharge on breach) are all carried in habits above.
- The teaser's own two facts (the mist that dissolves prey, the two teeth that make it necessary) are not repeated in body or habits by design.

## Description status: upgraded

The source description is a two-sentence stub: "The toxic mist expelled from a tube in its mouth helps to dissolve its prey. With only 2 teeth, this tactic is necessary for the creature to survive." That is not the full species register, so it was upgraded and marked `upgraded`. Every added clause and its source:

- 'A shaggy four-legged hunter with a spray tube seated in its gaping jaws': body appositive. Source `art` (shaggy tufted outline, four limbs, tube in the open jaws) plus species: "a tube in its mouth".
- 'carries only two teeth and cannot bite down on anything it wants to eat': species: "With only 2 teeth, this tactic is necessary for the creature to survive."
- 'The toxic mist it expels from that tube dissolves prey where it stands': species: "The toxic mist expelled from a tube in its mouth helps to dissolve its prey."
- 'a solvent gut turned outward': restatement of the same sentence, not a new fact.
- 'the Generator that shaped it on Drainov was built to fill a world of acid swamps and industrial waste with life that could feed there at all': planet: "bioengineer new forms of life capable of surviving within the planet's hostile wastelands" and planet: "The Xalians on Drainov quickly adapted to not only the smog and industrial waste common to the world but also to its bubbling acid swamps". This is the engineered-purpose clause. It states only that the Generator was built to put life on that world, which the planet history states directly; it does not assign this species a job.
- 'Since the criminal syndicates took the abandoned factories, the Venemist has been driven through the refineries and processing plants of that grid': planet: "Soon, Xalians were manning the once-abandoned factories, refineries, and chemical plants that remained dormant across Drainov's surface". The planet history says the Drainov Xalian population as a whole was put to this work by force, so the present-day turn is a planet-level fact applied to a Drainov species, not an invented job for the Venemist.
- 'where the same spray strips corrosion and residue as readily as it strips flesh': the only inference in the paragraph, and it is a physical restatement of the dissolving mist the stub already gives, placed in the setting the planet history gives. It states no schedule, no task, and no employer intent.
- The closing sentence is a plain present-tense fact about what the spray does. No flourish, no staged scene.

Word count: 113, inside the 60 to 140 band.

## Physiology judgments

- `corporeality: corporeal`: the art shows a solid seated body with weight on its limbs. Source `art`.
- `composition.primary: flesh`, no secondary: an animal body with fur, teeth, and a mouth. Registry: "living animal tissue, muscle and organ, whatever covers it". No second substance forms a structural part in either source. Source `art` plus `species` (2 teeth).
- `bodyPlan: quadruped`: the registry selection rule says the plan is the stance at rest and a rearing, crouching, or leaping pose does not override it, and the test is whether the forelimbs bear weight. In the art the forelimbs reach the ground as legs and end in paws, not held-up hands or claws, so the plan is `quadruped`. The description names no stance. Source `art`.
- `covering: fur`: the registry says the art shows a surface only when the outline is drawn as that surface, naming "tufted or shaggy edges for" fur. The neck and back outline is drawn as a row of ragged tufts. Source `art`.
- `anatomy: jaws`: species: "a tube in its mouth", and the art shows a full gaping biting mechanism. Source `species` plus `art`.
- `anatomy: fangs`: species: "With only 2 teeth", and the art draws exactly two long curved piercing teeth in the upper jaw. Two teeth on a carnivore that cannot chew are piercing teeth, which is the `fangs` key. Source `species` plus `art`.
- `anatomy: vents`: the registry defines vents as "pressurized discharge openings". The tube in the mouth is a discharge opening that expels a mist under pressure: species: "The toxic mist expelled from a tube in its mouth helps to dissolve its prey." The registry has no tube key and the tube is not a tongue, a lure, or a crest, so `vents` is the functional key. Recorded under Notes as a registry strain.
- `anatomy: tail`: the art shows a long tail curling out behind the rump. Source `art`.
- `anatomy: hide`: the surface key. The registry defines hide as "an UNARMORED body surface used defensively" and pairs it with an unarmored covering; the covering here is `fur` and nothing in either source shows plating, a shell, or a carapace, so `hide` is correct and `shell` is excluded. Source `art`.
- Anatomy keys considered and rejected: `claws` (the art draws paws, not distinct hooking digits, and the description gives the creature no grasping or raking act), `tongue` (the projecting organ sprays rather than lashes or sticks, and the species sentence calls it a tube), `spines` (the shaggy edge is pelt, not rigid projection), `antennae` (the long ears are sense organs, and the registry states sense organs are never anatomy).
- `size: heightCm [95, 120], weightKg [42, 62]`: the legacy gauge is 106 cm and 51 kg. The art shows a mid-sized four-legged animal, so the legacy figures read as a standing measure of a body between a large dog and a wolf, and they are kept as the band midpoint with realistic species variance around them. Source: legacy values as a relative gauge (operating rule 6) plus `art` proportions.
- `lifespan: standard`: rubric cut 1 does not apply (not spectral or energy), cut 2 does not apply (not mineral or metal), cut 3 puts a flesh body of 42 to 62 kg, midpoint 52 kg, in the 20 to 200 kg band, which is `standard`. The post-mass adjustment does not apply: no source calls it cold, slow, or long-lived, and the covering is `fur`, not armored. Cut 4 does not apply: nothing in either source says the environment shortens the life of this species. Source: legacy weight gauge plus the registry rubric.
- `genome.chirality: rolled`: the default; a flesh body has chiral chemistry, so achiral is not available.
- `diet: carnivore`: the registry selection rule says the word prey settles carnivore. Species: "helps to dissolve its prey". Source `species`.
- `communication: [vocal, chemical]`: vocal from the art, which shows the head thrown back with jaws wide open in a calling posture, the posture a canid body makes a cry with. Chemical from the species sentence: a body that expels a toxic substance to the outside signals by scent or secreted substance as a matter of course. Both are judgment calls on thin evidence and are listed under Authored fields.
- `breathes: [gas]`, `ambientMedia: [gas, liquid]`: gas because the planet is an atmosphere world, planet data Terrain: "Acid Swamps, Gaseous Smog, Toxic Atmosphere". Liquid in ambient media without breathing it because the terrain is acid swamps, which a land animal generated for that world must be able to move and act in, planet: "a desolated hellscape of urban decay melting into acid swamps and blanketed in a miasma of toxic smog." Source `planet`.
- `temperatureC { min: -10, max: 43 }`: the Drainov data block gives Temperature Low "-24 °C / -11.2 °F" and Temperature High "43 °C / 109.4 °F". A furred, active flesh body is placed toward the warm end of that range: the top is the planet maximum because the history describes a hot chemical environment, planet: "steaming corrosive rain", and the bottom is narrowed off the planetary minimum because nothing shows this species active in the deepest cold. Inside the planet range. Source `planet`.
- `capabilities.flight [0, 0]`: no wings in the art and the legacy canFly flag is false. Source `art`.
- `capabilities.swim [25, 45]`: a land animal that must cross acid swamps, planet: "the acidic swamps that mire the surface", but the body has no fins or webbing in the art. Source `planet` plus `art`.
- `capabilities.burrow [0, 10]`: nothing in either source shows it moving through ground. Authored minimum.
- `capabilities.climb [15, 35]`: a four-legged pawed body with no talons or hooks. Authored from the body.
- `capabilities.sprint [45, 70]`: a predator that must close on prey to bring the mist to bear, species: "dissolve its prey", but nothing in either source shows exceptional speed, so the band sits just above the middle on the strength of the legacy high stamina gauge.
- `capabilities.leap [35, 55]`: an ordinary four-legged bound; no source names a leap. Authored.
- `capabilities.manipulation [10, 25]`: no grasping anatomy is declared and the whole method of the creature is to avoid handling its food. Under 40, so no grasping requirement applies. Source `species`.
- `senses.sight [40, 60]`: ordinary; nothing in either source emphasizes vision, and the art gives the eye no special prominence. Authored.
- `senses.hearing [55, 80]`: the art draws two long upright ears held erect, which the registry routes to the senses bands rather than anatomy. Source `art`.
- `senses.smell [60, 85]`: a carnivore hunting through, planet: "a miasma of toxic smog", where sight is poor and scent is the workable sense, in a body that already signals chemically. Source `planet` plus inference; the upper bound above 60 rests on the art and the planet smog rather than a species sentence, so it is flagged as the weakest number in this template.
- `senses.special`: omitted. Neither source shows echolocation, tremorsense, electroreception, a psychic sense, heat sense, or void sense.

## Archetype weights

Row shape: one dominant nature with a short tail, not a ladder. The species sentence is entirely about how it takes prey, so `predator` (instinct, reflex) dominates at 46. `survivor` (vitality, endurance) at 24 carries the legacy high stamina gauge and the planet phrase "hostile wastelands". `prowler` (agility, instinct) at 18 for a four-legged hunter that must close on prey before its mist reaches. `berserker` (strength, endurance) at 12 for the heavier, more forward individuals of a body whose only weapon is a sustained emission. Sums to 100. No entry below 5.

## Attribute bands

The legacy statRatings give medium special attack and high stamina and leave the rest blank; used only as a relative gauge per operating rule 6.

- `endurance [62, 88]`: the legacy high stamina rating, in a creature whose attack is a sustained emission.
- `instinct [55, 80]`: highest of the mental attributes; a predator that hunts in smog. Source `species` (prey) plus `planet` (smog).
- `agility [45, 68]` and `reflex [45, 68]`: an ordinary quick four-legged hunter, unremarkable in the art.
- `vitality [40, 62]` and `resilience [40, 62]`: a mid-sized unarmored flesh body.
- `strength [30, 50]`: a body with two teeth that cannot bite down on its food is not built to overpower. Source `species`.
- `intelligence [25, 45]`: animal range, well under the 85 ceiling.
- `willpower [35, 58]`: nothing in either source speaks to its mind; ordinary.
- `charisma [20, 40]`: nothing in either source shows presence or display.

## Element

Primary `chemical`, fixed by the species entry type Chemical. On-graph secondaries for chemical are fire, metal, and water; the template declares none, since secondaries are rolled per individual. `affinityOdds` is omitted, so the 75/25 baseline applies. No lore reason to override it.

## Trait pool

Pool shape, 2026-09-08 ruling: one required trait and three rolled entries whose shares sum to 100. Iteration three had `toxic`, `resistant` and `volatile` all at 100; only `toxic` is what this species is in its own lore, so the other two drop into the rolled set.

**Required**

| Trait | Evidence |
|---|---|
| `toxic` | The species is a living chemical weapon, which the ruling names as the case where a chemical adaptation is the point of the creature. `species`: "The toxic mist expelled from a tube in its mouth helps to dissolve its prey." The tube is `vents` in `physiology.anatomy`, it is the instrument of the signature ability Dissolution Veil, and the same source sentence says the body cannot feed without it, `species`: "With only 2 teeth". Body-demanded: every individual carries the tube. |

**Rolled (shares sum to 100)**

| Trait | Share | Evidence |
|---|---|---|
| `resistant` | 55 | Strongest of the rolled set, on the heaviest planet evidence in the batch. The Drainov Generator Environmental Report records full-spectrum toxin immunity across the planet's fauna, lists chemical immunity and filtration organs among its output priorities, and names the atmosphere first among its hazards. `planet`: "The Xalians on Drainov quickly adapted to not only the smog and industrial waste common to the world but also to its bubbling acid swamps, steaming corrosive rain, asphyxiating fumes, slow-drifting clouds of neurotoxic gases, and virulent pathogens." It is a planet-wide adaptation and the species' own sentence is about dissolving prey rather than about surviving the swamp, so it is rolled rather than required. Demoted from 100. |
| `volatile` | 25 | The same report records reactive discharge on structural breach as a fauna observation, a planet-wide observation that covers this body's form: the one agent this species carries is a corrosive mist held under pressure in a tube seated in its jaws. A fauna observation ranks below the hazard-and-output load behind `resistant`. Demoted from 100. |
| `perceptive` | 20 | A record field, the weakest of the three classes here. `physiology.senses.smell` is graded [60, 85], whose top clears the bound of 80, and `hearing` is [55, 80]. `physiology.senses.special` is absent and no Drainov output priority names a sensory system, so nothing raises it. |

#### Cut by the evidence bar (2026-09-07)

| Trait | Former percent | Evidence class that failed |
|---|---|---|
| `stealthy` | 40 | class 4 fails: the burrow band is 0 to 10 and no hiding or ambush sentence exists to pair with it; still body-type plausibility |
| `solitary` | 30 | still argued from absence; no sentence and no ratified field states it |
| `pack-bonded` | 20 | still argued from the same silence; the exclusion partner has no sentence or field either, so both stay out |

- Expected trait count after the pool shape: (100 + 55 + 25 + 20) / 100 = 2.00, down from the 3.35 of iteration three. The chance an individual lands none of the three rolled traits is 0.45 times 0.75 times 0.80, which is 27.0 percent. Pool size is four entries, inside the cap of six, and no exclusion pair is present, since neither `solitary` nor `pack-bonded` survived the 2026-09-07 bar.
- `resistant` re-checked under the narrowed 2026-09-08 definition and kept in the pool: its support is the toxin, acid, corrosive-rain and pathogen load of Drainov, which is contamination and chemically hostile air, the exact scope the definition retains. No part of it rests on thin atmosphere, dust, static discharge or temperature. What changed is only its standing: a planet-wide adaptation is required when the species' own description makes it the point of the creature, and this description is about dissolving prey, so it is rolled.
- `volatile` and `perceptive` both fall well below `resistant` in the share split, in the order the evidence classes rank: a planet fauna observation covering this form, then a record field.
- No `hardened`, `insulated`, `dormant` or `territorial`: the Drainov hazards are atmosphere, hydrosphere, precipitation, substrate and a subset of the fauna, all chemical rather than thermal, barometric or electrical, and the report names no metabolic suspension and no guard or territorial pattern.

## Instruments and conduits

- `vents`: the tube. Species: "The toxic mist expelled from a tube in its mouth helps to dissolve its prey." In anatomy. This is the defining working part of the species.
- `jaws`: the art shows a full gaping biting mechanism. In anatomy.
- `fangs`: species: "With only 2 teeth", drawn in the art as two long curved piercing teeth. In anatomy.
- `conduits: { vents: chemical }`: the predicate is that the sources show the power of the element leaving the body through the part. Species: "The toxic mist expelled from a tube in its mouth helps to dissolve its prey." A corrosive mist leaving through the tube is chemical power leaving through that part, shown in both the sentence and the spray cone in the art. Chemical is the primary, so cover holds.

## Signature ability

The lore-defining act, quoted: "The toxic mist expelled from a tube in its mouth helps to dissolve its prey."

- Instrument `vents`: the effect terminates on the target as mist leaving the tube, and the tube is where it leaves the body. Not `breath`, because the source names a discrete tube organ rather than the breathing apparatus, and not `jaws`, because nothing bites.
- Action `spray`: the registry defines spray as "a projected stream or shower of matter over an area or line". The art draws a fanning cone of droplets. Spray is in the physical row for vents, so no conduit exception is needed for the signature.
- Medium `chemical`: the primary element; a dissolving mist is the register of that element.
- Intensity `[30, 75]`: a broad band. The legacy special-attack gauge is medium, so the band centers below the top of the scale, and it is wide because the species has no other offense and the roll is what separates individuals.
- Name `Dissolution Veil`: grander register, two words but exempt from the two-word rule, American English, no possessive, no hyphen, no franchise name, no real-world weapon, no Earth fauna, no nuclear-age register. Ledger search: a case-insensitive grep for the species name across all fourteen consolidated element files and the neutral pools returned nothing, so no reserved signature exists for this species. Collision scan: the catalog collision check in the validator, run across every cell in all fourteen files and the neutral pools, reports no collision.
- The description is one line in canon voice, states what it does, and names no mechanic.

## Catalog check through the species lens

Instruments and their allowed actions, against the primary chemical and each on-graph secondary (fire, metal, water), plus the neutral pool for each action. Element cell counts read from the cell headers; neutral pool counts from the per-action count lines.

| Action | chemical | fire | metal | water | neutral |
|---|---|---|---|---|---|
| spray (vents, plus chemical conduit) | 178 | 154 | 22 | 54 | 85 |
| cloud (vents, plus chemical conduit) | 130 | 97 | 23 | 50 | 65 |
| burst (vents, plus chemical conduit) | 103 | 115 | 29 | 72 | 62 |
| ward (vents) | see note | see note | see note | see note | 72 |
| strike (jaws, fangs) | 110 | 133 | 113 | 78 | 87 |
| crush (jaws) | 74 | 37 | 103 | 39 | 53 |
| rake (jaws) | 96 | 71 | 79 | 116 | 66 |
| drain (jaws, fangs, plus chemical conduit) | 137 | 45 | 32 | 52 | 100 |
| snare (jaws, plus chemical conduit) | 96 | 38 | 46 | 94 | 43 |
| ambush (fangs) | 109 | 56 | 63 | 48 | 83 |

Note on ward: the neutral pool alone carries 72 names, well over the threshold, so no combination of instrument, action, and medium available to this species falls under 6 drawable names.

**Thin-combo findings: none.** The smallest element cell any combination of this species can reach is metal spray at 22, and every combination also has a neutral pool of 43 or more behind it.

## Authored fields

Values with no supporting source sentence, listed so the guesses are on the record.

- `communication: [vocal, chemical]`. The raised-head open-jawed posture in the art is the only support for vocal, and chemical is inferred from a body that already expels a substance. Neither is stated in either source. If either is wrong, vocal is the more likely of the two to be a misread of a spraying posture.
- `capabilities.burrow [0, 10]`, `climb [15, 35]`, `leap [35, 55]`: authored from the body plan; no source names any of them.
- `senses.sight [40, 60]`: authored; nothing in either source speaks to its vision.
- The upper bound of 85 on `senses.smell`: the floor of the band follows from the smog and the carnivore reading, but the top is authored.
- `traits: solitary 30` and `pack-bonded 20`: neither source says which the Venemist is; both are in the pool at partial chances so individuals differ, and the split between them is authored.
- `traits: volatile 12`: authored, a minority restatement of the toxic load.
- `attributes: willpower` and `charisma` bands: authored; neither source speaks to its mind or its presence.
- `size` bands: the legacy 106 cm and 51 kg are a relative gauge, not a source, so the absolute bands around them are authored.
- `intensity [30, 75]`: the width is authored; only the legacy medium gauge informs the center.
- `lore.biomeNiche`: composed from the acid swamps and factoryscape of the planet history, not a quoted phrase.

## WARN answers

- `conduits.source` for vents and chemical: answered above under Instruments and conduits. The sentence is species: "The toxic mist expelled from a tube in its mouth helps to dissolve its prey." The art shows the mist leaving the tube as a spreading cone.
- Any other WARN the final run raises is answered in the section that owns the field; see the pasted output below.

## Script denials

Every FAIL the script raised on any run of this key, with the value proposed and what was done.

- Run 1, code md.quote. I wrote the swim-capability evidence as a quotation reading 'acid swamps that mire the surface'. The script found no verbatim match, correctly: the planet history reads 'the acidic swamps that mire the surface', with acidic rather than acid and a leading article. I had shortened it while transcribing. Fixed by quoting the sentence exactly. The denial was legitimate and my original was simply a transcription error, not a better idea. No other FAIL was raised on any run.

## Notes

Registry strain, recorded under operating rule 7. The defining organ of this species is a tube in the mouth that sprays a dissolving mist. The 34-key anatomy registry has no key for a projecting oral spray organ. `tongue` is wrong (it lashes, snares, sticks, or drains, and the source calls the part a tube, not a tongue), `breath` is a channel tied to the breathing apparatus rather than a discrete organ, and `trunk` is a muscular flexible snout the art does not show. `vents`, defined as "pressurized discharge openings", is the closest functional fit and is what the template uses, but the word reads as a body-surface exhaust port rather than an oral organ, and the mismatch shows in the anatomy list, which now says the creature has vents and jaws without saying the vent is seated in the jaws. Comply and record. Smallest fix: either widen the vents definition to say a pressurized discharge opening anywhere on the body, including one seated in the mouth, or add a nozzle key for a projecting oral or facial emission organ. The first is the smaller change and would cover this species and any other emitter on this planet.

Second, smaller strain: the species sentence turns entirely on a tooth count, species: "With only 2 teeth", which the template can express only indirectly, as fangs in anatomy plus a low strength band and a low manipulation band. Nothing in the schema records that a body has an unusually poor bite. No fix proposed; this is probably correct, since the schema is deliberately not a body-part inventory.

## Open questions for Nick

The whole identity of the Venemist is a spray organ seated in its mouth, and the anatomy registry has no key for that part. I filed it as vents, which the registry defines as a pressurized discharge opening, and the definition does fit what the organ does even though the word suggests a port on the flank rather than a tube in the jaws. Would you rather I keep using vents for oral emitters across the remaining Drainov species and anywhere else this shape appears, or should the registry gain a dedicated key for a projecting emission organ before the rest of the chemical roster is migrated?

## Validator output

Final run (run 2):

```
WARN conduits.source                conduit vents for chemical: the validator agent must confirm the sentence or art showing the element leaving through this part

0 FAIL, 1 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docsspecies-templatesalidation-logenemist.jsonl
```

## Orchestrator amendments

- 2026-09-02, after the independent validation and the orchestrator's own look at the art: 'a solvent gut turned outward' (metaphor), the syndicate labor sentence (a planet-wide sentence with the Venemist as its subject) and the corrosion-stripping close (invented use and flourish) cut; the description ends on the sourced Generator clause. `communication` reduced to `vocal` (authored): the mist is an aimed ability, not a chemical signal. `vents` kept for the mouth tube; the registry definition is widened below so the key covers an oral discharge organ. Art matched the run's reading (two fangs, tube with spray, shag on the dorsal edge only, forelimbs bearing weight). Description now 70 words.
- 2026-09-02, planet rebuild: `temperatureC` re-banded from [-10, 43] to [0, 43] (intersection) against the rebuilt planet record's habitable band [0, 60] C; the old band was validated against the legacy planetary extremes, which are not survivable. Any gravity figure cited in this walkthrough predates the rebuild; the current value is `physical.derived.gravityEarth` = 0.82.
- 2026-09-07, trait evidence bar (Nick): cut stealthy, perceptive, solitary, pack-bonded, volatile; pool expected count 3.32 to 1.95.
- 2026-09-07, trait evidence bar iteration two (Nick): restored perceptive (35, class 4, graded sense bands), volatile (12, class 3, Generator report fauna observation of reactive discharge on breach); cut none; expected count 1.95 to 2.42.
- 2026-09-08, trait evidence bar iteration three (Nick): added none; raised resistant 95 to 100 and volatile 12 to 100 (both demanded species-wide by the Drainov Generator Environmental Report, universal toxin immunity plus chemical-immunity and filtration output priorities plus the atmosphere hazard for the first, unquantified reactive discharge on structural breach for the second); cut none; expected count 2.42 to 3.35.
- 2026-09-08, pool shape (Nick): required toxic; rolled resistant 55, volatile 25, perceptive 20; expected count 3.35 to 2.00.
- 2026-09-09, lore split (Nick): description reverted to species.json; body and habits authored; descriptionStatus removed.
- 2026-09-09, lore fact-check gate (independent checker, no files changed by it): one CONTRADICTED claim and one UNSUPPORTED claim, both fixed. `carcass` implied a scavenger and contradicted the teaser and `diet: carnivore`; it is now prey. The discharge-on-breach sentence is now written as the planet-wide fauna observation it rests on rather than as a fact about this species alone. The tail is no longer given a shape in the prose: the render is cropped close at the hindquarters and `physiology.anatomy` tail is what carries it.
